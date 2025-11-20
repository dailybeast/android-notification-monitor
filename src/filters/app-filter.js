const config = require('../utils/config');
const logger = require('../utils/logger');

class AppFilter {
  shouldForward(notification) {
    if (!notification || !notification.packageName) {
      logger.debug('Notification missing package name, skipping');
      return false;
    }

    const isMonitored = config.isMonitored(notification.packageName);

    if (!isMonitored) {
      logger.debug(`Notification from ${notification.packageName} not in monitored apps, skipping`);
    }

    return isMonitored;
  }
}

module.exports = AppFilter;
