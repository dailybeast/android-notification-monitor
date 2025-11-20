const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');

class LogcatMonitor extends EventEmitter {
  constructor(deviceId) {
    super();
    this.deviceId = deviceId;
    this.process = null;
    this.buffer = '';
  }

  start() {
    if (this.process) {
      logger.warn('Logcat process already running');
      return;
    }

    logger.info('Starting logcat monitor...');

    this.process = spawn('adb', [
      '-s',
      this.deviceId,
      'logcat',
      '-v',
      'brief',
      'FirebaseMessaging:V',
      'NotificationService:V',
      '*:S',
    ]);

    this.process.stdout.on('data', (data) => {
      this.buffer += data.toString();
      const lines = this.buffer.split('\n');

      // Keep the last incomplete line in the buffer
      this.buffer = lines.pop();

      lines.forEach(line => {
        if (line.trim()) {
          this.emit('line', line);
        }
      });
    });

    this.process.stderr.on('data', (data) => {
      logger.error(`Logcat stderr: ${data.toString()}`);
    });

    this.process.on('error', (error) => {
      logger.error(`Logcat process error: ${error.message}`);
      this.emit('error', error);
    });

    this.process.on('close', (code) => {
      logger.warn(`Logcat process exited with code ${code}`);
      this.process = null;
      this.buffer = '';
      this.emit('close', code);
    });

    logger.info('Logcat monitor started successfully');
  }

  stop() {
    if (this.process) {
      logger.info('Stopping logcat monitor...');
      this.process.kill('SIGTERM');
      this.process = null;
      this.buffer = '';
    }
  }

  isRunning() {
    return this.process !== null;
  }
}

module.exports = LogcatMonitor;
