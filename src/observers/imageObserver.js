class ImageEventObserver {
  constructor() {
    this.observers = [];
  }
  
  // Suscribir un observador
  subscribe(observer) {
    this.observers.push(observer);
    console.log(`[Observer] Nuevo observador suscrito: ${observer.constructor.name}`);
  }
  
  // Notificar a todos los observadores
  notify(event, data) {
    this.observers.forEach(observer => {
      observer.update(event, data);
    });
  }
}

// Observador concreto: Logger
class LoggerObserver {
  update(event, data) {
    const timestamp = new Date().toISOString();
    console.log(`[LOG ${timestamp}] ${event}:`, JSON.stringify(data));
  }
}

// Observador concreto: Métricas
class MetricsObserver {
  constructor() {
    this.metrics = {
      totalUploads: 0,
      totalProcessed: 0,
      totalErrors: 0,
      uploadTimes: [],
      processingTimes: []
    };
  }
  
  update(event, data) {
    switch(event) {
      case 'image.uploaded':
        this.metrics.totalUploads++;
        break;
      case 'image.processing.start':
        this.metrics.startTime = Date.now();
        break;
      case 'image.processing.end':
        const duration = Date.now() - this.metrics.startTime;
        this.metrics.processingTimes.push(duration);
        this.metrics.totalProcessed++;
        break;
      case 'image.error':
        this.metrics.totalErrors++;
        break;
    }
  }
  
  getMetrics() {
    const avgProcessingTime = this.metrics.processingTimes.length > 0
      ? this.metrics.processingTimes.reduce((a, b) => a + b, 0) / this.metrics.processingTimes.length
      : 0;
    
    return {
      totalUploads: this.metrics.totalUploads,
      totalProcessed: this.metrics.totalProcessed,
      totalErrors: this.metrics.totalErrors,
      successRate: this.metrics.totalUploads > 0 
        ? ((this.metrics.totalProcessed / this.metrics.totalUploads) * 100).toFixed(2) + '%'
        : '0%',
      avgProcessingTime: Math.round(avgProcessingTime) + 'ms'
    };
  }
}

// Singleton del sistema de eventos
const imageEvents = new ImageEventObserver();
const loggerObserver = new LoggerObserver();
const metricsObserver = new MetricsObserver();

// Suscribir observadores
imageEvents.subscribe(loggerObserver);
imageEvents.subscribe(metricsObserver);

module.exports = { imageEvents, metricsObserver };