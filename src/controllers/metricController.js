const { metricsObserver } = require("../observers/imageObserver");

function getMetrics(req, res) {
  const metrics = metricsObserver.getMetrics();
  
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "ok",
    timestamp: new Date().toISOString(),
    metrics: metrics
  }, null, 2));
}

module.exports = { getMetrics };