class AppConfig {
  constructor() {
    if (AppConfig.instance) return AppConfig.instance;
    this.port = process.env.PORT || 3000;
    AppConfig.instance = this;
  }
}

module.exports = new AppConfig();