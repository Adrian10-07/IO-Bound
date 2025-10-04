const workerFactory = require("./workerfactory");
const os = require("os");

const MAX_CONCURRENT = parseInt(process.env.WORKER_POOL_SIZE || Math.max(1, Math.floor(os.cpus().length / 2)), 10);

let active = 0;
const queue = [];

function _dequeueAndRun() {
  if (queue.length === 0) return;
  if (active >= MAX_CONCURRENT) return;
  const item = queue.shift();
  if (!item) return;
  active++;
  workerFactory.runWorker(item.filePath)
    .then((msg) => {
      active--;
      // validar mensaje del worker: si trae success:false, rechazar
      if (msg && msg.success === false) item.reject(new Error(msg.error || 'Worker returned failure'));
      else item.resolve(msg);
      _dequeueAndRun();
    })
    .catch((err) => {
      active--;
      item.reject(err);
      _dequeueAndRun();
    });
}

function processImage(filePath) {
  return new Promise((resolve, reject) => {
    queue.push({ filePath, resolve, reject });
    _dequeueAndRun();
  });
}

function getStatus() {
  return { max: MAX_CONCURRENT, active, queued: queue.length };
}

module.exports = { processImage, getStatus };
