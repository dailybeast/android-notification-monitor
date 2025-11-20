const logger = require('./utils/logger');
const config = require('./utils/config');
const AdbConnection = require('./adb/connection');
const LogcatMonitor = require('./adb/logcat');
const NotificationParser = require('./parsers/notification');
const AppFilter = require('./filters/app-filter');
const SlackNotifier = require('./notifiers/slack');

class NotificationMonitor {
  constructor() {
    this.adbConnection = new AdbConnection();
    this.logcatMonitor = null;
    this.notificationParser = new NotificationParser();
    this.appFilter = new AppFilter();
    this.slackNotifier = new SlackNotifier();
    this.isShuttingDown = false;
    this.heartbeatInterval = null;
  }

  async start() {
    logger.info('Starting Android Notification Monitor...');

    try {
      // Connect to ADB
      await this.adbConnection.connect();

      // Start logcat monitoring
      this.logcatMonitor = new LogcatMonitor(this.adbConnection.getDeviceId());
      this.setupLogcatListeners();
      this.logcatMonitor.start();

      // Start heartbeat
      this.startHeartbeat();

      logger.info('Android Notification Monitor is now running');
    } catch (error) {
      logger.error(`Failed to start monitor: ${error.message}`);
      await this.handleConnectionError();
    }
  }

  setupLogcatListeners() {
    this.logcatMonitor.on('line', (line) => {
      this.handleLogLine(line);
    });

    this.logcatMonitor.on('error', async (error) => {
      logger.error(`Logcat error: ${error.message}`);
      if (!this.isShuttingDown) {
        await this.handleConnectionError();
      }
    });

    this.logcatMonitor.on('close', async (code) => {
      logger.warn(`Logcat closed with code ${code}`);
      if (!this.isShuttingDown) {
        await this.handleConnectionError();
      }
    });
  }

  async handleLogLine(line) {
    try {
      const notification = this.notificationParser.parse(line);

      if (!notification) {
        return;
      }

      logger.debug(`Parsed notification: ${JSON.stringify(notification)}`);

      if (!this.appFilter.shouldForward(notification)) {
        return;
      }

      await this.slackNotifier.send(notification);
    } catch (error) {
      logger.error(`Error handling log line: ${error.message}`);
    }
  }

  async handleConnectionError() {
    if (this.isShuttingDown) {
      return;
    }

    logger.warn('Attempting to reconnect...');

    if (this.logcatMonitor) {
      this.logcatMonitor.stop();
    }

    try {
      await this.adbConnection.reconnect();

      // Restart logcat
      this.logcatMonitor = new LogcatMonitor(this.adbConnection.getDeviceId());
      this.setupLogcatListeners();
      this.logcatMonitor.start();

      logger.info('Successfully recovered from connection error');
    } catch (error) {
      logger.error(`Failed to recover: ${error.message}`);
      process.exit(1);
    }
  }

  startHeartbeat() {
    const heartbeatIntervalMs = 5 * 60 * 1000; // 5 minutes

    this.heartbeatInterval = setInterval(() => {
      const status = {
        adbConnected: this.adbConnection.isConnected(),
        logcatRunning: this.logcatMonitor?.isRunning() || false,
        deviceId: this.adbConnection.getDeviceId(),
        monitoredApps: config.monitoredApps.length > 0 ? config.monitoredApps.join(', ') : 'all',
      };

      logger.info('Heartbeat', status);
    }, heartbeatIntervalMs);
  }

  async shutdown() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Shutting down gracefully...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.logcatMonitor) {
      this.logcatMonitor.stop();
    }

    logger.info('Shutdown complete');
    process.exit(0);
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', { error: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection:', { reason, promise });
});

// Graceful shutdown handlers
const monitor = new NotificationMonitor();

process.on('SIGINT', () => {
  logger.info('Received SIGINT signal');
  monitor.shutdown();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal');
  monitor.shutdown();
});

// Start the monitor
monitor.start().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
