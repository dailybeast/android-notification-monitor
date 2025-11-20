const { execSync } = require('child_process');
const logger = require('../utils/logger');

class AdbConnection {
  constructor() {
    this.connected = false;
    this.deviceId = null;
  }

  async connect() {
    try {
      logger.info('Checking for connected Android devices...');

      const output = execSync('adb devices', { encoding: 'utf-8' });
      const lines = output.split('\n').filter(line => line.trim() && !line.startsWith('List of devices'));

      if (lines.length === 0) {
        throw new Error('No Android devices found. Please connect a device via USB.');
      }

      const deviceLine = lines[0].trim();
      const [deviceId, status] = deviceLine.split(/\s+/);

      if (status !== 'device') {
        throw new Error(`Device ${deviceId} is in ${status} state. Expected 'device' state.`);
      }

      this.deviceId = deviceId;
      this.connected = true;

      logger.info(`Successfully connected to device: ${this.deviceId}`);
      return true;
    } catch (error) {
      this.connected = false;
      this.deviceId = null;
      logger.error(`Failed to connect to ADB: ${error.message}`);
      throw error;
    }
  }

  async reconnect(attempt = 1) {
    const maxAttempts = 10;
    const baseDelay = 5000; // 5 seconds

    if (attempt > maxAttempts) {
      logger.error('Max reconnection attempts reached. Giving up.');
      throw new Error('Failed to reconnect to ADB after multiple attempts');
    }

    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 300000); // Max 5 minutes

    logger.info(`Reconnection attempt ${attempt}/${maxAttempts} in ${delay / 1000} seconds...`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.connect();
      logger.info('Reconnection successful!');
      return true;
    } catch (error) {
      logger.warn(`Reconnection attempt ${attempt} failed: ${error.message}`);
      return this.reconnect(attempt + 1);
    }
  }

  isConnected() {
    return this.connected;
  }

  getDeviceId() {
    return this.deviceId;
  }
}

module.exports = AdbConnection;
