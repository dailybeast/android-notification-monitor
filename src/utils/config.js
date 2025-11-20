require('dotenv').config();

class Config {
  constructor() {
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.monitoredApps = process.env.MONITORED_APPS
      ? process.env.MONITORED_APPS.split(',').map(app => app.trim())
      : [];
    this.logLevel = process.env.LOG_LEVEL || 'info';

    this.validate();
  }

  validate() {
    if (!this.slackWebhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL is required');
    }

    if (!this.slackWebhookUrl.startsWith('https://hooks.slack.com/')) {
      throw new Error('SLACK_WEBHOOK_URL must be a valid Slack webhook URL');
    }
  }

  isMonitored(packageName) {
    if (this.monitoredApps.length === 0) {
      return true;
    }
    return this.monitoredApps.includes(packageName);
  }
}

module.exports = new Config();
