FROM node:20-alpine

WORKDIR /app

# Copy root package files for monorepo workspace resolution
COPY package.json package-lock.json ./

# Copy the entire apps directory structure
# Workers need frontend lib files (redis.ts, worker-queues.ts)
COPY apps/workers ./apps/workers
COPY apps/frontend/src/lib ./apps/frontend/src/lib

# Install all dependencies from root
RUN npm ci

# Set environment
ENV NODE_ENV=production
ENV API_PORT=3100

# Expose the Worker Management API port
EXPOSE 3100

# Run workers using tsx from root node_modules
CMD ["npx", "tsx", "apps/workers/src/index.ts"]
