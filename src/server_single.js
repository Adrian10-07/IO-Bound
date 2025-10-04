const http = require('http');
const app = require('./app');
const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Single-thread PID ${process.pid} escuchando en puerto ${PORT}`);
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido en single thread, cerrando server...');             
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido en single thread, cerrando server...');
  server.close(() => process.exit(0));
});
