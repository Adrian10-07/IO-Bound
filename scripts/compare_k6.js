const fs = require('fs');
const path = require('path');

function die(msg) {
  console.error(msg);
  process.exit(1);
}

if (process.argv.length < 4) {
  die('Uso: node scripts/compare_k6.js <summary_cluster.json> <summary_single.json>');
}

const singlePath = process.argv[2];
const clusterPath = process.argv[3];

function loadJson(p) {
  try {
    const s = fs.readFileSync(p, 'utf8');
    return JSON.parse(s);
  } catch (err) {
    die(`No se pudo leer/parsear ${p}: ${err.message}`);
  }
}

const single = loadJson(singlePath);
const cluster = loadJson(clusterPath);

function pickMetric(data, metricName, candidates = []) {
  if (!data || !data.metrics) return null;
  const m = data.metrics[metricName];
  if (!m) return null;

  for (const c of candidates) {
    if (Object.prototype.hasOwnProperty.call(m, c) && m[c] !== undefined && m[c] !== null) {
      return m[c];
    }
  }

  if (m.value !== undefined && m.value !== null) return m.value;

  if (m.values && typeof m.values === 'object') {
    for (const c of candidates) {
      if (Object.prototype.hasOwnProperty.call(m.values, c) && m.values[c] !== undefined && m.values[c] !== null) {
        return m.values[c];
      }
    }
    if (m.values.value !== undefined) return m.values.value;
  }

  return null;
}

function toNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatNum(v, digits = 2) {
  if (v === null || v === undefined) return 'n/a';
  if (typeof v === 'number') {
    if (Math.abs(v) >= 1000) return Math.round(v).toString();
    return Number.isInteger(v) ? v.toString() : v.toFixed(digits);
  }
  return String(v);
}

function deltaAndPct(singleVal, clusterVal) {
  if (singleVal === null || clusterVal === null) return { delta: 'n/a', pct: 'n/a' };
  if (typeof singleVal !== 'number' || typeof clusterVal !== 'number') return { delta: 'n/a', pct: 'n/a' };
  const d = clusterVal - singleVal;
  let pct;
  if (singleVal === 0) pct = clusterVal === 0 ? '0%' : 'inf';
  else pct = `${(((d) / Math.abs(singleVal)) * 100).toFixed(2)}%`;
  return { delta: d, pct };
}

const metricsSpec = [
  { key: 'http_reqs', label: 'Requests (count)', picks: ['count'] },
  { key: 'http_reqs', label: 'Reqs/sec (rate)', picks: ['rate', 'count'] },
  { key: 'http_req_duration', label: 'Latency p50 (ms)', picks: ['p(50)', 'med', 'avg'] },
  { key: 'http_req_duration', label: 'Latency p95 (ms)', picks: ['p(95)', 'p(90)', 'avg'] },
  { key: 'http_req_duration', label: 'Latency p99 (ms)', picks: ['p(99)', 'max', 'p(95)'] },
  { key: 'http_req_failed', label: 'Req failed (%)', picks: ['value', 'rate', 'count'], ratio: true },
  { key: 'checks', label: 'Checks pass (%)', picks: ['value', 'rate', 'passes'], ratio: true }
];

function extract(data, spec) {
  const raw = pickMetric(data, spec.key, spec.picks);
  if (raw === null || raw === undefined) return null;
  let val = toNumber(raw);
  if (val === null) return null;
  if (spec.ratio) {
    if (val <= 1) val = val * 100;
  }
  return val;
}

const rows = metricsSpec.map((spec) => {
  const s = extract(single, spec);
  const c = extract(cluster, spec);
  const comp = deltaAndPct(s, c);
  return {
    Metric: spec.label,
    Single: formatNum(s),
    Cluster: formatNum(c),
    Delta: typeof comp.delta === 'number' ? (Math.abs(comp.delta) >= 1000 ? Math.round(comp.delta).toString() : comp.delta.toFixed(2)) : comp.delta,
    'Delta %': comp.pct
  };
});

console.log(`\nComparativa k6: ${path.basename(singlePath)} vs ${path.basename(clusterPath)}\n`);
console.table(rows);

console.log('\nResumen raw (numérico):');
metricsSpec.forEach(spec => {
  const s = extract(single, spec);
  const c = extract(cluster, spec);
  console.log(`- ${spec.label}: single=${s === null ? 'n/a' : formatNum(s)} | cluster=${c === null ? 'n/a' : formatNum(c)}`);
});

console.log('');