const { IncomingWebhook } = require('@slack/webhook');
const config = require('../utils/config');
const logger = require('../utils/logger');

class SlackNotifier {
  constructor() {
    this.webhook = new IncomingWebhook(config.slackWebhookUrl);
    this.maxRetries = 3;
  }

  async send(notification) {
    const message = this.formatMessage(notification);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.webhook.send(message);
        logger.info(`Notification sent to Slack: ${notification.appName} - ${notification.title}`);
        return true;
      } catch (error) {
        logger.error(`Failed to send to Slack (attempt ${attempt}/${this.maxRetries}): ${error.message}`);

        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          logger.info(`Retrying in ${delay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.error('Max retries reached, giving up on this notification');
          return false;
        }
      }
    }

    return false;
  }

  formatMessage(notification) {
    const timestamp = notification.timestamp.toLocaleString();

    let text = `📱 *${notification.appName}*\n`;

    if (notification.title) {
      text += `*${notification.title}*\n`;
    }

    if (notification.body) {
      text += `${notification.body}\n`;
    }

    text += `_${timestamp}_`;

    return {
      text,
      username: 'Push Notifications',
    };
  }
}

module.exports = SlackNotifier;
