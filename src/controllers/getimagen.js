const path = require("path");
const fs = require("fs");
const { pipeline } = require('stream/promises');
const imageservice = require("../services/imageservice");
const workerFactory = require("../services/workerfactory");


function mimeTypeFromName(name) {
  const ext = path.extname(name).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    default: return "application/octet-stream";
  }
}


async function getAllImagesController(req, res) {
  try {
    const files = await imageservice.getAllImages();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      count: files.length,
      files
    }, null, 2));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}


async function getImageByIdController(req, res) {
  try {
    // Obtener pathname y query de forma segura
    const base = `http://${req.headers.host || "localhost"}`;
    const url = new URL(req.url, base);
    const pathname = url.pathname;
    const parts = pathname.split("/").filter(Boolean); 
    const name = parts.length >= 2 ? parts.slice(1).join("/") : parts[1] || parts[0];

    if (!name) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Falta el identificador/nombre de la imagen en la ruta" }));
    }

    const processed = url.searchParams.get("processed");

    const imagesDir = path.join(process.cwd(), "images");

    // Protección contra path traversal: resolved debe empezar con imagesDir
    const resolved = path.resolve(imagesDir, name);
    if (!(resolved === imagesDir || resolved.startsWith(imagesDir + path.sep))) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Nombre de archivo inválido" }));
    }
    const filePath = resolved;

    if (processed === "true") {
        // Procesar imagen en worker
      try {
        const workerResult = await require("../services/imageProcesador").processImage(filePath);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({
          status: "ok",
          processed: true,
          original: filePath,
          workerResult
        }, null, 2));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Error procesando la imagen", details: err.message }));
      }
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Archivo no encontrado" }));
    }

    const stat = fs.statSync(filePath);
    const total = stat.size;
    const range = req.headers.range;

    const mime = mimeTypeFromName(name);

    if (range) {
      const partsRange = /bytes=(\d+)-(\d*)/.exec(range);
      if (!partsRange) {
        res.writeHead(416, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Range mal formado" }));
      }

      const start = parseInt(partsRange[1], 10);
      const end = partsRange[2] ? parseInt(partsRange[2], 10) : total - 1;
      if (start >= total || end >= total) {
        res.writeHead(416, {
          "Content-Range": `bytes */${total}`,
          "Content-Type": "application/json"
        });
        return res.end(JSON.stringify({ error: "Requested Range Not Satisfiable" }));
      }

      const chunkSize = (end - start) + 1;
      const stream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": mime
      });

      // pipeline promisificado para manejar backpressure y errores
      try {
        await pipeline(stream, res);
      } catch (err) {
        console.error("Stream pipeline error:", err);
        if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
        try { res.end(JSON.stringify({ error: "Error leyendo el archivo" })); } catch (e) {}
      }
    } else {
      res.writeHead(200, {
        "Content-Type": mime,
        "Content-Length": String(total),
        "Accept-Ranges": "bytes"
      });
      const stream = fs.createReadStream(filePath);
      try {
        await pipeline(stream, res);
      } catch (err) {
        console.error("Stream pipeline error:", err);
        if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
        try { res.end(JSON.stringify({ error: "Error leyendo el archivo" })); } catch (e) {}
      }
    }

  } catch (err) {
    console.error("getImageByIdController error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
}

module.exports = { getAllImagesController, getImageByIdController };
