# v3 - With Management API 2026-01-27
FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ curl

# Copy root package files (workers use root dependencies)
COPY package*.json ./

# Copy frontend lib files that workers depend on
COPY apps/frontend/src/lib/redis.ts ./apps/frontend/src/lib/redis.ts
COPY apps/frontend/src/lib/worker-queues.ts ./apps/frontend/src/lib/worker-queues.ts

# Copy frontend package.json for potential shared deps
COPY apps/frontend/package*.json ./apps/frontend/

# Copy worker source code
COPY apps/workers ./apps/workers

# Install all dependencies from root
RUN npm install --legacy-peer-deps

# Set production environment
ENV NODE_ENV=production
ENV API_PORT=3100

# Expose management API port
EXPOSE 3100

# Health check using the API endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3100/api/health || exit 1

# Run workers
CMD ["npx", "tsx", "apps/workers/src/index.ts"]
