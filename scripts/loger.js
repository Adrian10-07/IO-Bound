const stats = {
  requests: 0,
  responses: 0,
  errors: 0,
  totalDuration: 0,
  startTime: Date.now(),
  lastReportTime: Date.now()
};

let requestCounter = 0;

function statsLogger(req, res, next) {
  const startTime = Date.now();
  const requestId = ++requestCounter;
  stats.requests++;
  
  const method = req.method;
  const url = req.url;
  const workerId = process.pid;
  
  // Log simplificado (solo cada 100 peticiones para no saturar)
  if (requestId % 100 === 0 || requestId <= 10) {
    console.log(`[Worker ${workerId}] #${requestId} → ${method} ${url}`);
  }
  
  // Interceptar respuesta
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    stats.responses++;
    stats.totalDuration += duration;
    
    if (statusCode >= 400) {
      stats.errors++;
    }
    
    // Log simplificado
    if (requestId % 100 === 0 || requestId <= 10) {
      let emoji = 'si jalo';
      if (statusCode >= 500) emoji = '❌';
      else if (statusCode >= 400) emoji = '⚠️';
      
      console.log(
        `[Worker ${workerId}] #${requestId} ← ${emoji} ${statusCode} (${duration}ms)`
      );
    }
    
    originalEnd.apply(res, args);
  };
  
  next();
}
module.exports = statsLogger;