// Servidor de métricas Prometheus y endpoint de agregación 
const http = require('http');
const os = require('os');
const client = require('prom-client');
const { URL } = require('url');
const https = require('https');
const httpLib = require('http');
const { metricsObserver } = require('../observers/imageObserver');

const PORT = parseInt(process.env.METRICS_PORT || '9091', 10);
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const g_totalUploads = new client.Gauge({ name: 'app_total_uploads', help: 'Total uploads' });
const g_totalProcessed = new client.Gauge({ name: 'app_total_processed', help: 'Total processed' });
const g_totalErrors = new client.Gauge({ name: 'app_total_errors', help: 'Total errors' });
const g_avgProcessingMs = new client.Gauge({ name: 'app_avg_processing_ms', help: 'Avg processing ms' });
const g_avgUploadLatencyMs = new client.Gauge({ name: 'app_avg_upload_latency_ms', help: 'Avg upload latency ms' });

register.registerMetric(g_totalUploads);
register.registerMetric(g_totalProcessed);
register.registerMetric(g_totalErrors);
register.registerMetric(g_avgProcessingMs);
register.registerMetric(g_avgUploadLatencyMs);

function syncObserver() {
  try {
    const m = metricsObserver.getMetrics();
    const parseMs = (v) => {
      if (!v) return 0;
      const s = String(v).replace(/\s*ms$/i, '');
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? n : 0;
    };
    g_totalUploads.set(Number(m.totalUploads || 0));
    g_totalProcessed.set(Number(m.totalProcessed || 0));
    g_totalErrors.set(Number(m.totalErrors || 0));
    g_avgProcessingMs.set(parseMs(m.avgProcessingTime));
    g_avgUploadLatencyMs.set(parseMs(m.avgUploadLatency));
    register.getSingleMetric('nodejs_eventloop_lag_seconds')?.get();
  } catch (e) {
    console.error('[metricsServer] error syncing observer:', e && e.message ? e.message : e);
  }
}

function fetchJson(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? https : httpLib;
      const req = lib.get(u, (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (c) => raw += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch (err) { resolve({ status: res.statusCode, body: raw }); }
        });
      });
      req.on('error', reject);
      req.setTimeout(timeout, () => req.destroy(new Error('timeout')));
    } catch (err) { reject(err); }
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/metrics') {
      syncObserver();
      const metricsText = await register.metrics();
      res.writeHead(200, { 'Content-Type': register.contentType || 'text/plain; version=0.0.4' });
      return res.end(metricsText);
    }

    if (url.pathname === '/aggregate') {
      const apis = [
        'https://api.agify.io?name=michael',
        'https://api.genderize.io?name=michael',
        'https://jsonplaceholder.typicode.com/todos/1'
      ];
      const results = await Promise.all(apis.map(a => fetchJson(a).catch(e => ({ error: e.message }))));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok', aggregated: results }, null, 2));
    }

    if (url.pathname === '/' || url.pathname === '/healthz') {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: 'metrics-listener', port: PORT, uptime: process.uptime() }, null, 2));
    }

    // not found
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: 'not found' }));
  } catch (err) {
    console.error('[metricsServer] request error', err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(err.message || err) }));
  }
});

server.listen(PORT, () => {
  console.log(`[metricsServer] listening on http://0.0.0.0:${PORT}`);
});
