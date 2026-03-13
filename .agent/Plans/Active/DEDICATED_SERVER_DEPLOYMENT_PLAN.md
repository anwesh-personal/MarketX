# Dedicated Server Deployment Plan
**Axiom — Workers + Redis on Dedicated Server**

---

## Architecture (Final)

```
┌──────────────────────────────────────────────────┐
│              DEDICATED SERVER                    │
│                                                  │
│  Redis (localhost:6379)                          │
│  ↕ (all in-process, zero network hop)            │
│  All 9 Workers (PM2 cluster)                     │
│    - engine-execution  (concurrency 2)           │
│    - workflow-execution (concurrency 10)         │
│    - scheduled-task    (concurrency 5)           │
│    - kb-processing     (concurrency 5)           │
│    - conversation      (concurrency 3)           │
│    - analytics         (concurrency 2)           │
│    - dream-state       (concurrency 2)           │
│    - learning-loop     (concurrency 1)           │
│    - fine-tuning       (concurrency 1)           │
│                                                  │
│  Worker API: port 3100                           │
└──────────────────────────────────────────────────┘
         ↑ Supabase DB calls
         ↑ AI API calls (OpenAI, Anthropic, etc.)

┌──────────────────────────────────────────────────┐
│           RAILWAY / VERCEL                       │
│   Next.js Frontend only                          │
│   WORKER_API_URL = http://<server-ip>:3100       │
│   REDIS_URL = redis://<server-ip>:6379           │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│           VPS (existing)                         │
│   Hot standby OR decommission                    │
└──────────────────────────────────────────────────┘
```

---

## Step 1: Server Prep (Ubuntu 22.04 / Debian 12)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify Redis
redis-cli ping  # → PONG

# Install pnpm (same as project)
npm install -g pnpm

# Open ports (adjust for your firewall)
sudo ufw allow 3100/tcp   # Worker API
sudo ufw allow 6379/tcp   # Redis (restrict to Railway IP only - see Step 4)
```

---

## Step 2: Clone & Build

```bash
cd /opt
git clone https://github.com/YOUR_ORG/axiom.git
cd axiom

# Install all deps
pnpm install

# Build workers
cd apps/workers
pnpm build   # or: npx tsc
```

---

## Step 3: Environment File

Create `/opt/axiom/apps/workers/.env`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis — local on this server
REDIS_URL=redis://localhost:6379
# (no password needed if Redis is local-only; add one if exposed externally)

# Database (for workers that use pg Pool directly)
DATABASE_URL=postgresql://...

# AI Providers — at least one required
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
# XAI_API_KEY=
# MISTRAL_API_KEY=

# Worker API
API_PORT=3100
WORKER_API_SECRET=your-strong-secret-here

# Superadmin (optional — only needed if workers do superadmin actions)
SUPERADMIN_JWT_SECRET=your-jwt-secret
```

---

## Step 4: Secure Redis

Redis should NOT be open to the world. Two options:

### Option A: Bind to localhost only (simplest — Railway queues via REDIS_URL)
In `/etc/redis/redis.conf`:
```
bind 127.0.0.1 ::1
```
Then `sudo systemctl restart redis-server`

**For Railway/frontend to push jobs:** Frontend also needs `REDIS_URL`. Either:
- Use a Redis tunnel (SSH or Cloudflare Tunnel)
- Or use Railway's managed Redis for queue ONLY, and worker connects to Railway Redis too

### Option B: Expose Redis with password (recommended if Railway needs direct access)
```
bind 0.0.0.0
requirepass your-strong-redis-password
```
Then in `.env`: `REDIS_URL=redis://:your-password@<server-ip>:6379`
And in Railway frontend env: same `REDIS_URL`

**Firewall:** Allow 6379 only from Railway's outbound IPs.

---

## Step 5: PM2 Config

Create `/opt/axiom/apps/workers/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'axiom-workers',
    script: './dist/index.js',     // after build
    // OR for ts-node: script: 'ts-node', args: 'src/index.ts',
    cwd: '/opt/axiom/apps/workers',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    },
    env_file: '.env',
    error_file: '/var/log/axiom/workers-error.log',
    out_file:   '/var/log/axiom/workers-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }]
}
```

```bash
# Create log dir
sudo mkdir -p /var/log/axiom

# Start
cd /opt/axiom/apps/workers
pm2 start ecosystem.config.js

# Save PM2 config for auto-restart on reboot
pm2 save
pm2 startup   # follow instructions printed
```

---

## Step 6: Update Railway / Frontend Env

In Railway (or Vercel) dashboard, update these env vars:

```env
# Point to dedicated server
REDIS_URL=redis://:password@<server-ip>:6379
WORKER_API_URL=http://<server-ip>:3100
WORKER_API_SECRET=your-strong-secret-here
```

---

## Step 7: Health Check

```bash
# From server
redis-cli ping                          # PONG
curl http://localhost:3100/api/health   # { status: "ok", queues: {...} }
curl http://localhost:3100/api/stats    # job counts per queue
```

From Railway/Vercel side:
```bash
curl http://<server-ip>:3100/api/health
```

---

## Step 8: Deploy Workflow (Git → Server)

```bash
# One-liner update script — save as /opt/axiom/deploy-workers.sh
#!/bin/bash
set -e
cd /opt/axiom
git pull origin main
cd apps/workers
pnpm install --frozen-lockfile
pnpm build
pm2 restart axiom-workers
echo "✅ Workers redeployed"
```

```bash
chmod +x /opt/axiom/deploy-workers.sh
```

---

## Worker Summary

| Worker | Queue | Concurrency | Status |
|---|---|---|---|
| engine-execution | engine-execution | 2 | ✅ Production-ready |
| workflow-execution | workflow-execution | 10 | ✅ Production-ready |
| scheduled-task | scheduled-task | 5 | ✅ NEW — Added |
| kb-processing | kb-processing | 5 | ✅ Production-ready |
| conversation | conversation-summary | 3 | ✅ Production-ready |
| analytics | analytics | 2 | ✅ Production-ready |
| dream-state | dream-state | 2 | ✅ Production-ready |
| learning-loop | learning-loop | 1 | ✅ Production-ready |
| fine-tuning | fine-tuning | 1 | ⚠️ Simulated (OpenAI fine-tune API not wired) |

---

## Known Stubs (Non-blocking for launch)

| Item | Impact | Fix Later |
|---|---|---|
| `fine-tuning-worker` submit/monitor | Fine-tune jobs queue but don't call provider API | Wire OpenAI fine-tune API |
| VPS logs endpoints in superadmin | Returns empty logs | Wire to PM2 log files |
| Dream state `conversation_summary` | Uses stub text | Wire to AI summarizer |

---

## Execution Chain (Complete — Verified)

```
User → POST /api/writer/execute OR /api/engines/[id]/execute
  → Auth check (Supabase session)
  → engine_run_logs INSERT (status: started)
  → BullMQ push to engine-execution queue (Redis)
  → engine-execution-worker picks up
  → workflowExecutionService.executeWorkflow()
      → Topological sort of nodes
      → Node execution (AI, KB, condition, transform, output...)
      → KB nodes: FTS on embeddings + kb_documents fallback ← FIXED
      → Progress published to Redis pub/sub
  → engine_run_logs UPDATE (status: completed/failed)
  → Frontend polls GET /api/engines/executions/[id]
  → User sees result ✅
```

---

*Last updated: 2026-03-13*
*Author: Zara (Axiom AI)*
