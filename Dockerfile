# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S congraph && \
    adduser -S -D -H -u 1001 -s /sbin/nologin -G congraph -g congraph congraph

WORKDIR /app

# Copy built files
COPY --from=builder --chown=congraph:congraph /app/node_modules ./node_modules
COPY --from=builder --chown=congraph:congraph /app/dist ./dist
COPY --from=builder --chown=congraph:congraph /app/package.json ./

# Copy public files for GUI
COPY public ./public
COPY --chown=congraph:congraph .env.example ./.env.example

# Create directories
RUN mkdir -p /app/data /app/logs /app/backups && \
    chown -R congraph:congraph /app/data /app/logs /app/backups /app/public

USER congraph

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/bin/server.js"]
