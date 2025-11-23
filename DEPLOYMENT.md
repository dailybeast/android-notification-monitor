# Deployment Guide

## Repository and Container Registry

- **GitHub Repository**: https://github.com/dailybeast/android-notification-monitor
- **Container Registry**: `ghcr.io/dailybeast/android-notification-monitor`

## Available Images

The container is automatically built and pushed to GitHub Container Registry on every push to main:

- `ghcr.io/dailybeast/android-notification-monitor:latest` - Latest main branch
- `ghcr.io/dailybeast/android-notification-monitor:main` - Main branch
- `ghcr.io/dailybeast/android-notification-monitor:v*` - Versioned releases (when tagged)

## Deploying to Your Server

### 1. Authenticate with GitHub Container Registry

```bash
# Create a GitHub Personal Access Token with 'read:packages' scope
# Then login:
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### 2. Pull the Image

```bash
docker pull ghcr.io/dailybeast/android-notification-monitor:latest
```

### 3. Run the Container

```bash
docker run -d \
  --name android-notifications \
  --restart unless-stopped \
  --privileged \
  -v /dev/bus/usb:/dev/bus/usb \
  -v /path/to/logs:/app/logs \
  -e SLACK_WEBHOOK_URL='https://hooks.slack.com/services/YOUR/WEBHOOK/URL' \
  -e MONITORED_APPS='com.thedailybeast.app,com.cbsnews.android' \
  -e LOG_LEVEL='info' \
  ghcr.io/dailybeast/android-notification-monitor:latest
```

### 4. Verify Running

```bash
# Check container status
docker ps | grep android-notifications

# View logs
docker logs -f android-notifications

# Check for heartbeat (appears every 5 minutes)
docker logs android-notifications | grep Heartbeat
```

## Updating the Deployment

### Update to Latest Version

```bash
# Pull latest image
docker pull ghcr.io/dailybeast/android-notification-monitor:latest

# Stop and remove old container
docker stop android-notifications
docker rm android-notifications

# Start new container with same configuration
docker run -d \
  --name android-notifications \
  --restart unless-stopped \
  --privileged \
  -v /dev/bus/usb:/dev/bus/usb \
  -v /path/to/logs:/app/logs \
  -e SLACK_WEBHOOK_URL='https://hooks.slack.com/services/YOUR/WEBHOOK/URL' \
  -e MONITORED_APPS='com.thedailybeast.app,com.cbsnews.android' \
  -e LOG_LEVEL='info' \
  ghcr.io/dailybeast/android-notification-monitor:latest
```

### Update App Mappings (Without Rebuilding)

If you want custom app name mappings:

1. Create a custom `apps.json` file on your server:
```json
{
  "com.thedailybeast.app": "Daily Beast",
  "com.cbsnews.android": "CBS News",
  "com.example.app": "Example App"
}
```

2. Mount it when running the container:
```bash
docker run -d \
  --name android-notifications \
  --restart unless-stopped \
  --privileged \
  -v /dev/bus/usb:/dev/bus/usb \
  -v /path/to/logs:/app/logs \
  -v /path/to/custom/apps.json:/app/config/apps.json:ro \
  -e SLACK_WEBHOOK_URL='...' \
  ghcr.io/dailybeast/android-notification-monitor:latest
```

## Docker Compose Alternative

Create a `docker-compose.yml` on your server:

```yaml
version: '3.8'

services:
  notification-monitor:
    image: ghcr.io/dailybeast/android-notification-monitor:latest
    container_name: android-notifications
    restart: unless-stopped
    privileged: true
    volumes:
      - /dev/bus/usb:/dev/bus/usb
      - ./logs:/app/logs
      # Optional: custom app mappings
      # - ./apps.json:/app/config/apps.json:ro
    environment:
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
      - MONITORED_APPS=${MONITORED_APPS:-}
      - LOG_LEVEL=${LOG_LEVEL:-info}
```

Then deploy:

```bash
# Start
docker-compose up -d

# Update to latest
docker-compose pull
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SLACK_WEBHOOK_URL` | Yes | - | Slack incoming webhook URL |
| `MONITORED_APPS` | No | All apps | Comma-separated package names |
| `LOG_LEVEL` | No | `info` | debug, info, warn, error |

## Creating New Releases

To create a versioned release:

```bash
# Tag the release
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will automatically build and push:
# - ghcr.io/dailybeast/android-notification-monitor:v1.0.0
# - ghcr.io/dailybeast/android-notification-monitor:1.0
# - ghcr.io/dailybeast/android-notification-monitor:1
```

## Monitoring

### Health Checks

The app logs a heartbeat every 5 minutes showing:
- ADB connection status
- Logcat process status
- Connected device ID
- Monitored apps list

### Common Issues

1. **"No Android devices found"**
   - Ensure USB debugging is enabled on the device
   - Check USB cable connection
   - Run `docker exec android-notifications adb devices` to verify

2. **Container exits immediately**
   - Check logs: `docker logs android-notifications`
   - Verify `SLACK_WEBHOOK_URL` is set correctly
   - Ensure container has `--privileged` flag

3. **No notifications being forwarded**
   - Verify device is receiving notifications
   - Check `MONITORED_APPS` filter
   - Increase log level: `-e LOG_LEVEL=debug`

## Security Notes

- The container requires `--privileged` mode to access USB devices
- Keep your `SLACK_WEBHOOK_URL` secret
- Use environment variables or Docker secrets for sensitive data
- The GitHub Container Registry image is public by default

## Support

- GitHub Issues: https://github.com/dailybeast/android-notification-monitor/issues
- Full Documentation: See README.md in the repository
