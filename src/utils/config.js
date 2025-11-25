require('dotenv').config();

class Config {
  constructor() {
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.logLevel = process.env.LOG_LEVEL || 'info';

    // Parse MONITORED_APPS as JSON object: {"com.app1": "App 1", "com.app2": "App 2"}
    // Empty or missing = monitor all apps
    this.monitoredApps = {};
    if (process.env.MONITORED_APPS) {
      try {
        this.monitoredApps = JSON.parse(process.env.MONITORED_APPS);
      } catch (error) {
        throw new Error(`MONITORED_APPS must be valid JSON: ${error.message}`);
      }
    }

    this.validate();
  }

  validate() {
    if (!this.slackWebhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL is required');
    }

    if (!this.slackWebhookUrl.startsWith('https://hooks.slack.com/')) {
      throw new Error('SLACK_WEBHOOK_URL must be a valid Slack webhook URL');
    }

    if (this.monitoredApps && typeof this.monitoredApps !== 'object') {
      throw new Error('MONITORED_APPS must be a JSON object');
    }
  }

  isMonitored(packageName) {
    if (Object.keys(this.monitoredApps).length === 0) {
      return true;
    }
    return packageName in this.monitoredApps;
  }

  getAppName(packageName) {
    if (!packageName) return 'Unknown App';
    if (Object.keys(this.monitoredApps).length === 0) {
      return packageName;
    }
    return this.monitoredApps[packageName] || packageName;
  }

  getMonitoredAppsList() {
    if (Object.keys(this.monitoredApps).length === 0) {
      return 'all';
    }
    return Object.values(this.monitoredApps).join(', ');
  }
}

module.exports = new Config();
