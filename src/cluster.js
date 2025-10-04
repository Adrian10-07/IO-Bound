const cluster = require("cluster");
const os = require("os");
const http = require("http");
const app = require("./app");

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  console.log(`[Master] PID: ${process.pid}, CPUs: ${numCPUs}`);

  for (let i = 0; i < numCPUs; i++) cluster.fork();

  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} murió, creando otro xd`);
    cluster.fork();
  });
} else {
  http.createServer(app).listen(3000, () => {
    console.log(`Worker ${process.pid} escuchando en puerto 3000`);
  });
}
