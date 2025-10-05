class ImageEventObserver {
  constructor() {
    this.observers = [];
  }
  
  subscribe(observer) {
    this.observers.push(observer);
  }
  
  notify(event, data) {
    this.observers.forEach(observer => {
      try { observer.update(event, data); } 
      catch (err) { console.error(`[Observer] Error en ${observer.constructor.name}:`, err); }
    });
  }
}

class LoggerObserver {
  update(event, data) {
    const timestamp = new Date().toISOString();
    console.log(`[LOG ${timestamp}] ${event}:`, JSON.stringify(data));
  }
}

class MetricsObserver {
  constructor() {
    this.metrics = {
      totalUploads: 0,
      totalProcessed: 0,
      totalErrors: 0,
      uploadTimes: [],
      processingTimes: []
    };
    //  para medir duration por archivo concurrente
    this.startTimes = {};
  }
  
  update(event, data = {}) {
    const name = data.filename || data.filePath || data.jobId || 'unknown';
    switch(event) {
      case 'image.uploaded':
        this.metrics.totalUploads++;
        if (data.timestamp) this.metrics.uploadTimes.push(Date.now() - data.timestamp);
        break;
      case 'image.processing.start':
        this.startTimes[name] = Date.now();
        break;
      case 'image.processing.end':
        if (this.startTimes[name]) {
          const duration = Date.now() - this.startTimes[name];
          this.metrics.processingTimes.push(duration);
          delete this.startTimes[name];
        }
        this.metrics.totalProcessed++;
        break;
      case 'image.error':
        this.metrics.totalErrors++;
        if (this.startTimes[name]) delete this.startTimes[name];
        break;
    }
  }
  
  getMetrics() {
    const p = this.metrics;
    const avgProcessingTime = p.processingTimes.length > 0
      ? Math.round(p.processingTimes.reduce((a,b)=>a+b,0) / p.processingTimes.length)
      : 0;
    const avgUploadLatency = p.uploadTimes.length > 0
      ? Math.round(p.uploadTimes.reduce((a,b)=>a+b,0) / p.uploadTimes.length)
      : 0;
    
    return {
      totalUploads: p.totalUploads,
      totalProcessed: p.totalProcessed,
      totalErrors: p.totalErrors,
      successRate: p.totalUploads > 0 ? ((p.totalProcessed / p.totalUploads) * 100).toFixed(2) + '%' : '0%',
      avgProcessingTime: `${avgProcessingTime}ms`,
      avgUploadLatency: `${avgUploadLatency}ms`,
      processingSamples: p.processingTimes.length
    };
  }
}

const imageEvents = new ImageEventObserver();
const loggerObserver = new LoggerObserver();
const metricsObserver = new MetricsObserver();

imageEvents.subscribe(loggerObserver);
imageEvents.subscribe(metricsObserver);

module.exports = { imageEvents, metricsObserver };
