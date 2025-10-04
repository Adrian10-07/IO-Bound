const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const imageProcessor = require("./imageProcesador");
const {imageEvents} = require("../observers/imageObserver");

const imagesDir = path.join(process.cwd(), "images");
if (!fsSync.existsSync(imagesDir)) fsSync.mkdirSync(imagesDir);

async function saveUploadedImage(file) {
  try {
    if (!file) throw new Error("Archivo no recibido");

    const fileObj = Array.isArray(file) ? file[0] : file;
    
    if (!fileObj) throw new Error("Archivo no encontrado en el array");

    // accedemos a sus propiedades
    const filePath = fileObj.filepath;
    
    if (!filePath) {
      throw new Error("No se pudo obtener la ruta del archivo");
    }

    imageEvents.notify('image.uploaded', { filename: fileObj.originalFilename, path: filePath });
    imageEvents.notify('image.processing.start', { filename: fileObj.originalFilename });
    await imageProcessor.processImage(filePath);
    imageEvents.notify('image.processing.end', { filename: fileObj.originalFilename });

    // Procesamiento con worker
    await imageProcessor.processImage(filePath);
    return { 
      message: "Imagen guardada y procesada correctamente", 
      filePath,
      filename: fileObj.originalFilename || fileObj.newFilename
    };
  } catch (err) {
    imageEvents.notify('image.error', { error: err.message });
    throw new Error(`Error guardando la imagen: ${err.message}`);
  }
}

async function readImage(name) {
  const filePath = path.join(imagesDir, name);
  try { return await fs.readFile(filePath); }
  catch { return null; }
}

async function getAllImages() {
  try { return await fs.readdir(imagesDir); }
  catch (err) { throw new Error(`Error listando imágenes: ${err.message}`); }
}

module.exports = { saveUploadedImage, readImage, getAllImages };