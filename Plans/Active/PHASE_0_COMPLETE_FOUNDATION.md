# AXIOM - Phase 0: Complete Production Foundation
**Priority:** 🔴 CRITICAL - Everything depends on this  
**Duration:** 10-14 days  
**Goal:** Production-grade infrastructure from day one

---

## 🎯 **Philosophy: Build Once, Build Right**

**NOT Building:**
- MVP that gets rewritten
- "Good enough for V1"
- Tommy-specific solution

**Building:**
- Complete production platform
- Scalable SaaS architecture
- Tommy gets subset on launch
- Future clients use same platform

---

## 📋 **Complete Deliverables**

### **1. Design System (Day 1-2)**
- [x] Theme system (theme.ts)
- [x] Global CSS (globals.css)
- [x] Tailwind config
- [ ] Complete component library (15+ components)
- [ ] Design system documentation
- [ ] Storybook setup (component playground)

### **2. AI Provider Management (Day 3-4)**
- [ ] Complete Lekhika port
- [ ] Multi-key failover system
- [ ] Validation before save
- [ ] Model discovery for all 6 providers
- [ ] Usage/failure tracking
- [ ] Auto-disable on failures
- [ ] Cost tracking integration
- [ ] ZERO hardcoded API keys

### **3. Docker Infrastructure (Day 5-6)** ⭐ **NEW**
- [ ] Multi-stage Dockerfile (frontend)
- [ ] Worker Dockerfile
- [ ] docker-compose.yml (local dev)
- [ ] docker-compose.prod.yml (production)
- [ ] .dockerignore optimization
- [ ] Health checks
- [ ] Volume management
- [ ] Network isolation
- [ ] Environment templating

### **4. Worker Infrastructure (Day 7-8)**
- [ ] PM2 ecosystem config
- [ ] Deployment scripts (VPS + Docker)
- [ ] Health monitoring
- [ ] Queue dashboard
- [ ] Log aggregation
- [ ] Error alerting (Sentry)
- [ ] Graceful shutdown
- [ ] Auto-restart policies

### **5. Database & Migrations (Day 9-10)**
- [ ] Complete schema (all 30+ tables)
- [ ] Migration system (up/down)
- [ ] Seed data (brain templates, sample KB)
- [ ] Backup automation
- [ ] Connection pooling
- [ ] Query optimization
- [ ] RLS policies (security)
- [ ] Audit logging

### **6. CI/CD Pipeline (Day 11-12)** ⭐ **NEW**
- [ ] GitHub Actions workflows
- [ ] Automated testing
- [ ] Build optimization
- [ ] Docker image publishing
- [ ] Staging deployment
- [ ] Production deployment (approval required)
- [ ] Rollback strategy
- [ ] Environment management

### **7. Monitoring & Observability (Day 13-14)** ⭐ **NEW**
- [ ] Application monitoring (Sentry)
- [ ] Performance monitoring (Vercel Analytics)
- [ ] Log aggregation (Winston + CloudWatch)
- [ ] Uptime monitoring (Better Uptime)
- [ ] Cost tracking dashboard
- [ ] Alert rules (Slack/email)
- [ ] Error budgets
- [ ] SLA tracking

---

## 🐳 **Docker Setup (Critical)**

### **Why Docker:**
1. **Consistency:** Same environment dev → staging → prod
2. **Scalability:** Horizontal scaling with orchestration
3. **Isolation:** Services don't conflict
4. **Portability:** Deploy anywhere (VPS, AWS, GCP)
5. **CI/CD:** Automated builds and deployments

### **Architecture:**
```
axiom/
├── docker/
│   ├── frontend/
│   │   ├── Dockerfile (multi-stage)
│   │   └── nginx.conf
│   ├── workers/
│   │   ├── Dockerfile
│   │   └── pm2.config.js
│   └── nginx/
│       ├── Dockerfile
│       └── default.conf
├── docker-compose.yml (dev)
├── docker-compose.prod.yml (production)
└── .dockerignore
```

### **Services:**
1. **frontend** (Next.js)
2. **workers** (BullMQ + PM2)
3. **nginx** (reverse proxy, SSL)
4. **postgres** (Supabase local)
5. **redis** (cache + queues)

### **Dockerfile (Frontend - Multi-Stage)**
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### **docker-compose.yml (Development)**
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./apps/frontend
      dockerfile: ../../docker/frontend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
    depends_on:
      - redis
    volumes:
      - ./apps/frontend:/app
      - /app/node_modules
    networks:
      - axiom-network

  workers:
    build:
      context: ./apps/workers
      dockerfile: ../../docker/workers/Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    volumes:
      - ./apps/workers:/app
      - /app/node_modules
    networks:
      - axiom-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - axiom-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    build:
      context: ./docker/nginx
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    networks:
      - axiom-network

volumes:
  redis-data:

networks:
  axiom-network:
    driver: bridge
```

### **docker-compose.prod.yml (Production)**
```yaml
version: '3.8'

services:
  frontend:
    image: ghcr.io/yourusername/axiom-frontend:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    networks:
      - axiom-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  workers:
    image: ghcr.io/yourusername/axiom-workers:latest
    restart: always
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    networks:
      - axiom-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis-data:/data
    networks:
      - axiom-network
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 3s
      retries: 3

  nginx:
    image: ghcr.io/yourusername/axiom-nginx:latest
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
    networks:
      - axiom-network

volumes:
  redis-data:
    driver: local

networks:
  axiom-network:
    driver: bridge
```

---

## 🚀 **CI/CD Pipeline (GitHub Actions)**

### **.github/workflows/deploy.yml**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Run linting
        run: npm run lint

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      
    steps:
      - uses: actions/checkout@v3
      
      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Build and push Frontend
        uses: docker/build-push-action@v4
        with:
          context: ./apps/frontend
          file: ./docker/frontend/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ github.sha }}
            
      - name: Build and push Workers
        uses: docker/build-push-action@v4
        with:
          context: ./apps/workers
          file: ./docker/workers/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-workers:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-workers:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/axiom
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d
            docker system prune -f
```

---

## 📊 **Monitoring Stack**

### **1. Application Monitoring (Sentry)**
```typescript
// apps/frontend/src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Filter out sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization']
    }
    return event
  },
})
```

### **2. Performance Monitoring**
```typescript
// Track key metrics
import { performance } from 'perf_hooks'

export async function trackPerformance(
  operation: string,
  fn: () => Promise<any>
) {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start
    
    // Send to monitoring service
    await logMetric({
      operation,
      duration,
      success: true,
      timestamp: new Date()
    })
    
    return result
  } catch (error) {
    const duration = performance.now() - start
    await logMetric({
      operation,
      duration,
      success: false,
      error: error.message,
      timestamp: new Date()
    })
    throw error
  }
}
```

### **3. Cost Tracking**
```typescript
// Track AI API costs
export async function trackAIUsage(
  provider: string,
  model: string,
  tokens: number,
  cost: number
) {
  await supabase.from('ai_usage_log').insert({
    provider,
    model,
    tokens_used: tokens,
    cost_usd: cost,
    timestamp: new Date()
  })
}
```

---

## ✅ **Success Criteria**

### **Infrastructure:**
- [ ] Docker builds successfully
- [ ] docker-compose up works locally
- [ ] All services communicate
- [ ] Health checks pass
- [ ] Production deployment works
- [ ] Rollback tested
- [ ] SSL configured
- [ ] Backups automated

### **Code Quality:**
- [ ] Zero hardcoded colors
- [ ] Zero hardcoded API keys
- [ ] Zero TODOs in production code
- [ ] TypeScript strict mode passes
- [ ] All tests passing
- [ ] Linting clean
- [ ] Bundle size optimized

### **Monitoring:**
- [ ] Sentry capturing errors
- [ ] Performance metrics tracked
- [ ] Costs being logged
- [ ] Alerts configured
- [ ] Dashboard accessible
- [ ] Uptime SLA defined

### **Documentation:**
- [ ] README with setup instructions
- [ ] Docker guide
- [ ] Deployment guide
- [ ] Architecture diagrams
- [ ] API documentation
- [ ] Component library docs

---

## 🎯 **Timeline: 10-14 Days**

### **Week 1:**
- Day 1-2: Design system + components
- Day 3-4: AI Provider Management
- Day 5-6: Docker setup
- Day 7: Worker infrastructure

### **Week 2:**
- Day 8-9: Database & migrations
- Day 10-11: CI/CD pipeline
- Day 12-13: Monitoring setup
- Day 14: Testing, documentation, validation

---

## 🚨 **CRITICAL RULES**

1. **NO shortcuts** - Build it right the first time
2. **Everything containerized** - Docker from day one
3. **Production-grade** - Not "good enough for now"
4. **Automated** - CI/CD, backups, monitoring
5. **Documented** - Everything has docs
6. **Tested** - No untested code in production
7. **Monitored** - Can't fix what you can't see
8. **Scalable** - Architecture supports 10K+ users

---

**This is FOUNDATION for $500K+ platform, not $40K project.**

**Build once. Build right. Own the IP.** 💪

---

**Status:** Ready to start  
**Next:** Begin Day 1 - Complete component library  
**Owner:** You (The Boss)
