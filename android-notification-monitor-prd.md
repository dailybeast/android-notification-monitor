# PRD: Android Notification Monitor for Slack

## Overview

A Node.js application that monitors push notifications from a physical Android device and forwards them to Slack. Runs in Docker on a Mac server with the Android device connected via USB.

---

## Goals

1. Monitor push notifications from configured Android apps in real-time
2. Filter by app package name (configurable allowlist)
3. Post notification content to Slack with app name and message text
4. Run reliably 24/7 with automatic reconnection if ADB drops

---

## Technical Architecture

### Components

1. **ADB Bridge**: Interfaces with Android via `adb logcat`
2. **Notification Parser**: Extracts app name, title, and body from logcat
3. **Filter Engine**: Checks if notification is from monitored app
4. **Slack Notifier**: Posts to Slack using `@slack/webhook`

### Technology Stack

- Node.js 24 LTS
- Docker (Alpine-based)
- Android Debug Bridge (ADB)
- `@slack/webhook` for Slack integration

---

## Functional Requirements

### FR-1: ADB Connection Management

- Connect to USB-attached Android device on startup
- Verify device with `adb devices`
- Reconnect automatically if connection drops
- Log connection status and errors

### FR-2: Notification Capture

- Monitor logcat output for FCM/Firebase messages
- Extract: app package name, title, body, timestamp
- Handle malformed notifications gracefully

**Log Patterns to Match**:
```
FirebaseMessaging: Received message from FCM
NotificationService: enqueueNotificationInternal
```

### FR-3: App Filtering

- Configuration via `MONITORED_APPS` environment variable (comma-separated)
- Match against app package name (e.g., `com.thedailybeast.app`)
- If filter list is empty, forward all notifications

**Configuration Format**:
```bash
MONITORED_APPS=com.thedailybeast.app,com.cbsnews.android,com.nytimes.android
```

**App Name Mapping** (`config/apps.json`):
```json
{
  "com.thedailybeast.app": "Daily Beast",
  "com.cbsnews.android": "CBS News",
  "com.nytimes.android": "NY Times"
}
```

### FR-4: Slack Integration

- Post to Slack using incoming webhook
- Format: app name, title, body, timestamp
- Retry failed posts 3x with exponential backoff

**Message Format**:
```json
{
  "text": "📱 *Daily Beast*\n*Breaking News*\nTrump announces major policy change",
  "username": "Push Notifications"
}
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SLACK_WEBHOOK_URL` | Yes | - | Slack incoming webhook URL |
| `MONITORED_APPS` | No | All | Comma-separated package names |
| `LOG_LEVEL` | No | `info` | Logging level (debug, info, warn, error) |

---

## Docker Setup

### Dockerfile

```dockerfile
FROM node:24-alpine

RUN apk add --no-cache android-tools

RUN addgroup -g 1000 notifier && \
    adduser -D -u 1000 -G notifier notifier

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

USER notifier

CMD ["node", "src/index.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  notification-monitor:
    build: .
    container_name: android-notifications
    restart: unless-stopped
    privileged: true
    volumes:
      - /dev/bus/usb:/dev/bus/usb
      - ./config:/app/config:ro
    environment:
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
      - MONITORED_APPS=${MONITORED_APPS}
      - LOG_LEVEL=info
```

---

## Project Structure

```
android-notification-monitor/
├── src/
│   ├── index.js              # Entry point
│   ├── adb/
│   │   ├── connection.js     # ADB connection management
│   │   └── logcat.js         # Logcat monitoring
│   ├── parsers/
│   │   └── notification.js   # Parse notification from logcat
│   ├── filters/
│   │   └── app-filter.js     # Filter by app package
│   ├── notifiers/
│   │   └── slack.js          # Slack webhook client
│   └── utils/
│       ├── logger.js         # Logging
│       └── config.js         # Config loader
├── config/
│   └── apps.json             # App name mappings
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env.example
└── README.md
```

---

## Dependencies

- `@slack/webhook` - Slack webhook client
- `winston` - Structured logging
- `dotenv` - Environment variables

---

## Deployment

1. Clone repository
2. Copy `.env.example` to `.env` and configure
3. Build: `docker-compose build`
4. Start: `docker-compose up -d`
5. Verify: `docker logs -f android-notifications`

---

## Acceptance Criteria

- [ ] Connects to USB Android device
- [ ] Captures FCM notifications from configured apps
- [ ] Filters based on MONITORED_APPS config
- [ ] Posts to Slack with app name, title, and body
- [ ] Auto-recovers from ADB connection drops
- [ ] README with setup instructions
