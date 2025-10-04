const { IncomingForm } = require("formidable");
const path = require("path");
const imageService = require("../services/imageservice.js");
const fs = require("fs");

function isAllowedExtension(filename) {
  const ext = path.extname(filename || "").toLowerCase();
  return [".jpg", ".jpeg", ".png"].includes(ext);
}

async function postImageController(req, res) {
  const form = new IncomingForm({
    multiples: false,
    keepExtensions: true,
    uploadDir: path.join(process.cwd(), "images"),
    maxFileSize: 10 * 1024 * 1024 // 10 MB
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err.message }));
    }

    const file = files.image;

    if (!file) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "No se recibió ningún archivo" }));
    }

    const fileObj = Array.isArray(file) ? file[0] : file;

    // validación básica de extensión
    const filename = fileObj.originalFilename || fileObj.newFilename || fileObj.name || '';
    if (!isAllowedExtension(filename)) {
      // borrar temp si existe
      try { fs.unlinkSync(fileObj.filepath || fileObj.path); } catch(e){}
      res.writeHead(415, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Tipo de archivo no permitido. Use JPG o PNG." }));
    }

    try {
      const result = await imageService.saveUploadedImage(fileObj);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

module.exports = postImageController;
