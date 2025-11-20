const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class NotificationParser {
  constructor() {
    // Load app name mappings
    const mappingsPath = path.join(__dirname, '../../config/apps.json');
    try {
      this.appMappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf-8'));
    } catch (error) {
      logger.warn('Could not load app mappings, using package names as display names');
      this.appMappings = {};
    }
  }

  parse(logLine) {
    try {
      // Look for Firebase messaging patterns
      if (logLine.includes('FirebaseMessaging') || logLine.includes('NotificationService')) {
        // Try to extract notification data from the log line
        const notification = this.extractNotificationData(logLine);
        if (notification) {
          return notification;
        }
      }
      return null;
    } catch (error) {
      logger.debug(`Error parsing log line: ${error.message}`);
      return null;
    }
  }

  extractNotificationData(logLine) {
    // Common patterns in FCM notifications:
    // - Package name: often in format "from: <package>"
    // - Title/Body: JSON-like structure or key-value pairs

    let packageName = null;
    let title = null;
    let body = null;

    // Extract package name
    const packageMatch = logLine.match(/from:\s*([a-zA-Z0-9_.]+)/);
    if (packageMatch) {
      packageName = packageMatch[1];
    }

    // Try to extract title
    const titleMatch = logLine.match(/title[=:]\s*["']?([^"',}]+)["']?/i) ||
                      logLine.match(/notification_title[=:]\s*["']?([^"',}]+)["']?/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Try to extract body
    const bodyMatch = logLine.match(/body[=:]\s*["']?([^"',}]+)["']?/i) ||
                     logLine.match(/notification_body[=:]\s*["']?([^"',}]+)["']?/i) ||
                     logLine.match(/text[=:]\s*["']?([^"',}]+)["']?/i);
    if (bodyMatch) {
      body = bodyMatch[1].trim();
    }

    // If we have at least a package name or meaningful content, return notification
    if (packageName || (title && body)) {
      // Try to infer package from context if not directly found
      if (!packageName) {
        const contextMatch = logLine.match(/([a-zA-Z0-9_.]+\.[a-zA-Z0-9_.]+)/);
        if (contextMatch) {
          packageName = contextMatch[1];
        }
      }

      return {
        packageName: packageName || 'unknown',
        appName: this.getAppName(packageName),
        title: title || 'Notification',
        body: body || '',
        timestamp: new Date(),
      };
    }

    return null;
  }

  getAppName(packageName) {
    if (!packageName) return 'Unknown App';
    return this.appMappings[packageName] || packageName;
  }
}

module.exports = NotificationParser;
