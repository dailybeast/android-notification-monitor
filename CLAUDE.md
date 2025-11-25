# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Android Notification Monitor for Slack - monitors push notifications from a physical Android device via USB/ADB and forwards them to Slack. Designed for 24/7 operation in Docker with automatic recovery and reconnection.

## Development Commands

```bash
# Install dependencies
npm install

# Run locally (requires ADB on host and connected Android device)
npm start

# Build Docker image
docker build -t android-notification-monitor .

# Run with Docker Compose
docker-compose up -d

# View logs
docker logs -f android-notifications
```

## Architecture

### Core Flow
1. **AdbConnection** (`src/adb/connection.js`) - Establishes and maintains connection to Android device via `adb devices` command. Implements exponential backoff reconnection strategy (max 10 attempts).
2. **LogcatMonitor** (`src/adb/logcat.js`) - Spawns `adb logcat` process with filters for `FirebaseMessaging:V` and `NotificationService:V`. Emits line-by-line events via EventEmitter.
3. **NotificationParser** (`src/parsers/notification.js`) - Parses logcat output using regex patterns to extract package name, title, and body from FCM notification logs. Gets friendly names from config.
4. **AppFilter** (`src/filters/app-filter.js`) - Filters notifications based on `MONITORED_APPS` JSON object keys. Empty object = monitor all apps.
5. **SlackNotifier** (`src/notifiers/slack.js`) - Sends formatted messages to Slack webhook with retry logic (3 attempts with exponential backoff).
6. **Config** (`src/utils/config.js`) - Centralizes configuration including parsing `MONITORED_APPS` JSON and providing app name lookups.

### Main Orchestrator
`NotificationMonitor` class in `src/index.js` coordinates all components, handles reconnection on errors, and provides heartbeat monitoring (every 5 minutes).

### Recovery & Resilience
- **Auto-reconnect**: If ADB drops, reconnects with exponential backoff (5s to 5min max delay)
- **Process recovery**: Logcat crashes trigger full reconnection flow
- **Global error handlers**: Uncaught exceptions/rejections are logged but don't crash the process
- **Graceful shutdown**: SIGINT/SIGTERM handlers for clean exit

## Configuration

### Environment Variables
- `SLACK_WEBHOOK_URL` (required) - Must start with `https://hooks.slack.com/`
- `MONITORED_APPS` (optional) - JSON object mapping package names to display names (e.g., `{"com.app1":"App 1","com.app2":"App 2"}`). Empty = monitor all apps. This consolidates both filtering and display name mapping.
- `LOG_LEVEL` (optional) - debug, info, warn, error (default: info)

See `.env.example` for reference.

## Docker Deployment

The application runs as non-root user `notifier` (UID/GID 1001). Requires:
- `--privileged` flag
- Volume mount: `/dev/bus/usb:/dev/bus/usb` (USB device access)

GitHub Actions workflow (`.github/workflows/docker-publish.yml`) automatically builds and publishes multi-arch images (amd64/arm64) to GitHub Container Registry on push to main or version tags.

## Important Patterns

### Logcat Filtering
The logcat monitor only captures Firebase/notification-related logs to reduce noise. Adjust filters in `src/adb/logcat.js:21-29` if monitoring different notification systems.

### Notification Parsing
Regex patterns in `NotificationParser.extractNotificationData()` look for common FCM patterns:
- Package: `from: <package>`
- Title: `title=` or `notification_title=`
- Body: `body=`, `notification_body=`, or `text=`

Update patterns if notification format changes.

### State Management
The monitor maintains connection state via `isShuttingDown` flag to prevent reconnection loops during graceful shutdown. Always check this flag before initiating recovery.
