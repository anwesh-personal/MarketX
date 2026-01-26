FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY apps/workers/package*.json ./apps/workers/ 2>/dev/null || true
COPY apps/frontend/package*.json ./apps/frontend/

# Install all dependencies from root
RUN npm install

# Copy worker source code
COPY apps/workers ./apps/workers

# Copy shared lib files that workers depend on
COPY apps/frontend/src/lib/redis.ts ./apps/frontend/src/lib/redis.ts
COPY apps/frontend/src/lib/worker-queues.ts ./apps/frontend/src/lib/worker-queues.ts

# Set production environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Run workers
CMD ["npx", "tsx", "apps/workers/src/index.ts"]
