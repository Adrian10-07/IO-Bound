const workerFactory = require("./workerfactory");
async function processImage(filePath) {
  return workerFactory.runWorker(filePath);
}
module.exports = { processImage };
