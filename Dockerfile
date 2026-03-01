# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-slim AS deps

# Install Chromium for whatsapp-web.js (puppeteer)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-noto-color-emoji \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

# Copy Chromium and libs from deps stage
COPY --from=deps /usr/bin/chromium /usr/bin/chromium
COPY --from=deps /usr/lib /usr/lib
COPY --from=deps /usr/share/fonts /usr/share/fonts

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY package.json ./

# Create necessary directories with proper permissions
RUN mkdir -p sessions uploads logs && chown -R appuser:appuser /app

# Tell puppeteer/whatsapp-web.js where Chromium is
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', r => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

CMD ["node", "src/server.js"]
