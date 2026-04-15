FROM node:18-alpine

WORKDIR /app

# Copy package files first (layer caching — only reinstalls if package.json changes)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY src ./src

EXPOSE 3001

# Healthcheck so Docker knows when gateway is ready
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "src/index.js"]