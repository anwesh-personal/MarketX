FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace packages
COPY apps/workers ./apps/workers
COPY apps/frontend/src/lib/redis.ts ./apps/frontend/src/lib/redis.ts
COPY apps/frontend/src/lib/worker-queues.ts ./apps/frontend/src/lib/worker-queues.ts

# Install dependencies
RUN npm ci --only=production

# Set environment
ENV NODE_ENV=production

# Run workers
CMD ["npx", "tsx", "apps/workers/src/index.ts"]
