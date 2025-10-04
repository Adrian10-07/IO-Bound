const { IncomingForm } = require("formidable");
const path = require("path");
const imageService = require("../services/imageservice.js");

async function postImageController(req, res) {
  const form = new IncomingForm({
    multiples: false,
    keepExtensions: true,
    uploadDir: path.join(process.cwd(), "images")
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

    try {
      const result = await imageService.saveUploadedImage(file);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

module.exports = postImageController;
