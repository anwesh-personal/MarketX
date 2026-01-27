# 🚀 WORKER DEPLOYMENT PLAN

> **Goal:** Deploy Axiom workers on infrastructure YOU control  
> **Budget:** $10-20/month  
> **Timeline:** 2-3 hours to fully operational  
> **Date:** 2026-01-26

---

## 📊 OPTIONS COMPARISON

| Platform | Workers | Redis | Monthly Cost | Setup Time | Verdict |
|----------|---------|-------|--------------|------------|---------|
| **Railway** | ✅ Yes | ✅ Built-in | $5-15 | 15 min | **⭐ RECOMMENDED** |
| **Render** | ✅ Yes | ✅ $7 addon | $7-14 | 20 min | Good alternative |
| **Fly.io** | ✅ Yes | ❌ Need Upstash | $5-10 | 30 min | More complex |
| **Upstash + Vercel** | Via cron | ✅ Serverless | $0-10 | 20 min | Limited, but works |
| **DigitalOcean Apps** | ✅ Yes | ✅ $15 addon | $12-27 | 25 min | Overkill |
| **New VPS (Hetzner)** | ✅ Yes | ✅ Self-hosted | €4-5 (~$5) | 45 min | Cheapest, full control |

---

## ⭐ RECOMMENDATION: Railway

**Why Railway:**
1. **Dead simple** - Push code, it runs
2. **Redis built-in** - Create Redis service in 30 seconds
3. **No DevOps** - No SSH, no PM2, no nginx
4. **Cheap** - $5 hobby plan covers your needs
5. **Independent** - YOUR account, YOUR control

**Estimated Cost:**
- Hobby Plan: $5/month (includes $5 credit)
- Redis addon: Included in compute
- **Total: $5-10/month**

---

## 🛠️ RAILWAY DEPLOYMENT PLAN

### Phase 1: Setup (15 min)

#### Step 1: Create Railway Account
```
1. Go to https://railway.app
2. Sign up with GitHub (recommended) or email
3. Add credit card for Hobby plan ($5/month)
```

#### Step 2: Create Project
```
1. Dashboard → "New Project"
2. Name it: "axiom-workers"
```

#### Step 3: Add Redis Service
```
1. In your project → "New"
2. Select "Redis"
3. Wait 30 seconds for provisioning
4. Copy the connection string:
   REDIS_URL=redis://default:password@host:port
```

---

### Phase 2: Deploy Workers (20 min)

#### Step 4: Prepare Worker Dockerfile

Create `apps/workers/Dockerfile`:
```dockerfile
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
```

#### Step 5: Create railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/workers/Dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### Step 6: Deploy to Railway
```bash
# In Railway dashboard:
1. "New" → "GitHub Repo"
2. Select your Axiom repository
3. Railway will detect Dockerfile and deploy

# Or use Railway CLI:
npm install -g @railway/cli
railway login
railway link
railway up
```

#### Step 7: Set Environment Variables
```
In Railway dashboard → Variables:

DATABASE_URL=postgresql://... (from Supabase)
REDIS_URL=${{Redis.REDIS_URL}}  (auto-linked)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

---

### Phase 3: Verify & Wire Up (15 min)

#### Step 8: Check Worker Logs
```
Railway dashboard → Deployments → View Logs

Should see:
═══════════════════════════════════════════════════════════
               AXIOM WORKER SYSTEM                          
═══════════════════════════════════════════════════════════

📦 Core Workers:
   - KB Processor (5 concurrent)
   - Conversation Summarizer (3 concurrent)
   - Analytics Aggregator (2 concurrent)

🧠 Brain Workers:
   - Dream State (2 concurrent)
   - Fine-Tuning (1 concurrent)
   - Learning Loop (1 concurrent)

✅ All workers started. Waiting for jobs...
```

#### Step 9: Update Frontend Redis Config
```
In Vercel (or local .env):

REDIS_HOST=your-railway-redis-host
REDIS_PORT=your-railway-redis-port
REDIS_PASSWORD=your-railway-redis-password
```

---

## 📝 CODE CHANGES REQUIRED

### 1. Create Dockerfile (New File)
Location: `apps/workers/Dockerfile`

### 2. Create railway.json (New File)
Location: `railway.json` (root)

### 3. Create Missing Database Table
The workers reference `dream_jobs` table that needs to exist:

```sql
-- Add to migrations/013_worker_jobs.sql

CREATE TABLE IF NOT EXISTS dream_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    org_id UUID REFERENCES organizations(id),
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX dream_jobs_org_idx ON dream_jobs(org_id, created_at DESC);
CREATE INDEX dream_jobs_status_idx ON dream_jobs(status);
```

### 4. Fix Worker Imports (Minor)
Workers import from `pg` but need connection string from env.

---

## 🔌 WIRING: How Jobs Get Queued

### From Workflow Execution:
```typescript
// In workflowExecutionService.ts

import { queues } from '@/lib/worker-queues'

// When a workflow triggers a heavy job:
await queues.kbProcessing.add('process-document', {
    documentId,
    orgId,
    content
})
```

### From API Routes (Scheduled):
```typescript
// api/cron/learning-loop/route.ts

import { queues } from '@/lib/worker-queues'

export async function GET() {
    await queues.learningLoop.add('daily-run', {
        triggeredAt: new Date().toISOString(),
        type: 'scheduled'
    })
    return Response.json({ queued: true })
}
```

### From External Triggers (MailWiz):
```typescript
// api/webhooks/mailwiz/route.ts

import { queues } from '@/lib/worker-queues'

export async function POST(req: Request) {
    const payload = await req.json()
    
    await queues.dreamState.add('process-email', {
        emailId: payload.email_id,
        orgId: payload.org_id,
        content: payload.body
    })
    
    return Response.json({ received: true })
}
```

---

## 📅 TIMELINE

| Step | Time | What |
|------|------|------|
| 1 | 5 min | Create Railway account |
| 2 | 2 min | Create project + Redis |
| 3 | 10 min | Create Dockerfile and railway.json |
| 4 | 5 min | Run database migration |
| 5 | 5 min | Deploy to Railway |
| 6 | 5 min | Set environment variables |
| 7 | 10 min | Test and verify |
| **TOTAL** | **~45 min** | **Workers fully deployed** |

---

## 💰 ONGOING COSTS

| Service | Cost | Notes |
|---------|------|-------|
| Railway Hobby | $5/month | Includes compute + Redis |
| Overage (if any) | ~$0-5/month | Based on usage |
| **Total** | **$5-10/month** | Well under $20 budget |

---

## 🔒 SECURITY NOTES

1. **Never commit secrets** - Use Railway's environment variables
2. **Use service role key** - Workers need Supabase service key for admin operations
3. **Redis password** - Railway provides this automatically
4. **Your account** - Only YOU have access to this Railway project

---

## ✅ CHECKLIST

- [ ] Create Railway account
- [ ] Add Hobby plan ($5/month)
- [ ] Create project "axiom-workers"
- [ ] Add Redis service
- [x] Create `apps/workers/Dockerfile`
- [x] Create `railway.json`
- [x] Run migration for `dream_jobs` table
- [ ] Deploy to Railway
- [ ] Set environment variables
- [ ] Verify worker logs
- [ ] Update frontend Redis config
- [ ] Test job queuing

---

## 🚨 ALTERNATIVE: If Railway Doesn't Work

### Fallback: Render.com
```
1. Create account at render.com
2. New → Background Worker
3. Connect GitHub repo
4. Build command: npm install
5. Start command: npx tsx apps/workers/src/index.ts
6. Add Redis as addon ($7/month)
```

### Fallback: New VPS (Hetzner)
```
1. Create Hetzner account
2. Create CX11 server (€4.15/month, ~$5)
3. SSH in and setup manually
4. This is YOUR server, no one else's
```

---

*Plan created: 2026-01-26 19:53 IST*
*Ready to execute when you give the go-ahead*
