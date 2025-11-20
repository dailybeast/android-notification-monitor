# Android Notification Monitor for Slack

Monitor push notifications from a physical Android device connected via USB and forward them to Slack. Runs 24/7 in Docker with automatic recovery and reconnection.

## Features

- Monitor FCM/Firebase push notifications from Android device
- Filter by app package name (configurable allowlist)
- Forward notifications to Slack with app name, title, and body
- Automatic ADB reconnection with exponential backoff
- Auto-restart on crashes or server reboots
- 24/7 operation with heartbeat monitoring
- Easy configuration without rebuilding image

## Prerequisites

- Docker and Docker Compose
- Android device with USB debugging enabled
- USB cable connected to server
- Slack workspace with incoming webhook

## Quick Start

### 1. Enable USB Debugging on Android Device

1. Go to **Settings** > **About phone**
2. Tap **Build number** 7 times to enable Developer mode
3. Go to **Settings** > **Developer options**
4. Enable **USB debugging**
5. Connect device via USB and authorize the computer

### 2. Create Slack Webhook

1. Go to https://api.slack.com/apps
2. Create a new app or select existing one
3. Navigate to **Incoming Webhooks**
4. Create a webhook for your desired channel
5. Copy the webhook URL

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

Set your Slack webhook URL and optionally configure monitored apps:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
MONITORED_APPS=com.thedailybeast.app,com.cbsnews.android
LOG_LEVEL=info
```

### 4. Run with Docker Compose

```bash
# Build and start
docker-compose up -d

# View logs
docker logs -f android-notifications

# Stop
docker-compose down
```

## Deployment to Server (Docker Image)

### Build and Push Image

```bash
# Build image
docker build -t android-notification-monitor .

# Tag for registry
docker tag android-notification-monitor your-registry/android-notification-monitor:latest

# Push to registry
docker push your-registry/android-notification-monitor:latest
```

### Deploy on Server

```bash
# Pull image on server
docker pull your-registry/android-notification-monitor:latest

# Run container
docker run -d \
  --name android-notifications \
  --restart unless-stopped \
  --privileged \
  -v /dev/bus/usb:/dev/bus/usb \
  -v /path/to/logs:/app/logs \
  -e SLACK_WEBHOOK_URL='https://hooks.slack.com/services/YOUR/WEBHOOK/URL' \
  -e MONITORED_APPS='com.app1,com.app2' \
  -e LOG_LEVEL='info' \
  your-registry/android-notification-monitor:latest
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SLACK_WEBHOOK_URL` | Yes | - | Slack incoming webhook URL |
| `MONITORED_APPS` | No | All apps | Comma-separated package names to monitor |
| `LOG_LEVEL` | No | `info` | Logging level: debug, info, warn, error |

### App Name Mappings

Edit `config/apps.json` to map package names to friendly display names:

```json
{
  "com.thedailybeast.app": "Daily Beast",
  "com.cbsnews.android": "CBS News",
  "com.nytimes.android": "NY Times"
}
```

**To update app mappings without rebuilding:**

```bash
# Option 1: Edit config/apps.json on host and restart container
docker restart android-notifications

# Option 2: Mount custom config file
docker run -v /path/to/custom/apps.json:/app/config/apps.json:ro ...
```

## Monitoring

### View Logs

```bash
# Follow logs in real-time
docker logs -f android-notifications

# View last 100 lines
docker logs --tail 100 android-notifications
```

### Heartbeat

The application logs a heartbeat every 5 minutes showing:
- ADB connection status
- Logcat process status
- Connected device ID
- List of monitored apps

### Check Container Status

```bash
# Check if container is running
docker ps | grep android-notifications

# Check resource usage
docker stats android-notifications
```

## Troubleshooting

### No device found

```bash
# Check if device is connected
adb devices

# If device shows "unauthorized", check phone for authorization prompt
# If device shows "offline", try:
adb kill-server
adb devices
```

### Logcat not capturing notifications

- Ensure notifications are actually being received on the device
- Try removing logcat filters: check logs for `logcat -v brief`
- Some apps may use different notification mechanisms

### Slack webhook errors

- Verify webhook URL is correct and starts with `https://hooks.slack.com/`
- Check Slack app configuration and permissions
- Test webhook manually:
  ```bash
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"Test message"}' \
    YOUR_WEBHOOK_URL
  ```

### Container crashes on start

```bash
# Check detailed logs
docker logs android-notifications

# Verify USB devices are accessible
ls -la /dev/bus/usb

# Ensure container has privileged access
docker inspect android-notifications | grep Privileged
```

## 24/7 Operation Features

- **Auto-reconnect**: If ADB connection drops, automatic reconnection with exponential backoff
- **Process recovery**: If logcat crashes, automatically restarts
- **Docker restart policy**: Container auto-restarts on crash or server reboot
- **Memory leak prevention**: Proper cleanup of streams and event listeners
- **Global error handlers**: Catches uncaught exceptions to prevent crashes

## Finding App Package Names

To find package names for apps you want to monitor:

```bash
# List all installed packages
adb shell pm list packages

# Search for specific app
adb shell pm list packages | grep -i "keyword"

# Get package name from currently running app
adb shell dumpsys window | grep mCurrentFocus
```

## Message Format

Slack messages appear as:

```
📱 Daily Beast
Breaking News Alert
Trump announces major policy change
2025-11-20 14:30:45
```

## Development

```bash
# Install dependencies
npm install

# Run locally (requires ADB on host)
npm start

# Run with custom env file
node src/index.js
```

## License

MIT
