FROM node:24-alpine

# Install Android Debug Bridge tools
RUN apk add --no-cache android-tools

# Create non-root user (node group already uses GID 1000, so use different GID)
RUN addgroup -g 1001 notifier && \
    adduser -D -u 1001 -G notifier notifier

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application source
COPY src/ ./src/

# Copy default config (can be overridden with volume mount)
COPY config/ ./config/

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R notifier:notifier logs

# Note: You can override config/apps.json by mounting a volume at runtime
# docker run -v /path/to/custom/apps.json:/app/config/apps.json:ro ...

USER notifier

CMD ["node", "src/index.js"]
