const postImageController = require("../controllers/postimagen.js");
const {getMetrics} = require("../controllers/metricController.js");

function router(req, res) {
  const url = req.url;
  const method = req.method;

  if (method === "POST" && url === "/upload") return postImageController(req, res);
  if (method === "GET" && url === "/metrics") return getMetrics(req, res);

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Ruta no encontrada" }));
}

module.exports = router;
