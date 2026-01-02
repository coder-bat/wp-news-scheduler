FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist

# Copy static assets for admin UI
COPY src/admin/public ./dist/admin/public

# Create data directory
RUN mkdir -p /data /config

# Environment
ENV NODE_ENV=production
ENV CONFIG_PATH=/config/config.yaml
ENV STATE_PATH=/data/state.json

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

# Default to publisher mode
CMD ["node", "dist/publisher/index.js"]
