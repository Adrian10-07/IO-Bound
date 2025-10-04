const { parentPort, workerData } = require("worker_threads");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

async function processImageWithWatermark() {
  console.log(`[Worker ${process.pid}] Procesando imagen...`);
  const { filePath } = workerData;
  
  console.log("WORKER INICIADO");
  
  // Verificar que el archivo existe
  if (!fs.existsSync(filePath)) {
    throw new Error(`El archivo no existe: ${filePath}`);
  }
  
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  
  // Define los tamaños que quieres generar
  const sizes = {
    large: { width: 1200, height: 1200 }
    /*thumbnail: { width: 150, height: 150 },
    medium: { width: 500, height: 500 },*/
  };
  
  const results = {
    original: filePath,
    processed: {}
  };
  
  // Generar cada tamaño con marca de agua adaptada
  for (const [sizeName, dimensions] of Object.entries(sizes)) {
    const outputPath = path.join(dir, `${name}-${sizeName}.jpg`);
    
    console.log(`Generando ${sizeName}:`, outputPath);
    
    try {
      // Calcular tamaño de marca de agua proporcional
      const watermarkWidth = Math.floor(dimensions.width * 0.2);
      const watermarkHeight = Math.floor(watermarkWidth * 0.16);
      const fontSize = Math.floor(watermarkWidth * 0.08);
      
      // Marca de agua con tamaño dinámico
      const watermarkSVG = `
        <svg width="${watermarkWidth}" height="${watermarkHeight}">
          <text 
            x="5" 
            y="${watermarkHeight - 5}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold"
            fill="white" 
            opacity="0.6"
            stroke="red"
            stroke-width="0.5"
          >
            © Hola mundo
          </text>
        </svg>
      `;
      
      const watermarkBuffer = Buffer.from(watermarkSVG);
      
      await sharp(filePath)
        .resize(dimensions.width, dimensions.height, { 
          fit: 'cover',
          position: 'center'
        })
        .composite([{
          input: watermarkBuffer,
          gravity: 'southeast'
        }])
        .jpeg({ quality: 85 })
        .toFile(outputPath);
      
      results.processed[sizeName] = outputPath;
      console.log(` ${sizeName} completado`);
    } catch (err) {
      console.error(`Error generando ${sizeName}:`, err.message);
      throw err;
    }
  }
  
  console.log("PROCESAMIENTO COMPLETADO");
  console.log(`[Worker ${process.pid}]  Completado`);
  return results;
}

// Ejecutar el procesamiento
(async () => {
  try {
    const result = await processImageWithWatermark();
    
    parentPort.postMessage({ 
      success: true,
      message: "Imágenes procesadas con marca de agua",
      ...result
    });
  } catch (error) {
    console.error(" Error en el worker:", error);
    parentPort.postMessage({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
})();