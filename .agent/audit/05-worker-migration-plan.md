# MarketX Workers → VPS Migration Plan
## Step-by-Step (requires approval at each phase)

---

## Current State

| Item | Status |
|------|--------|
| VPS | RackNerd `107.172.56.66` — 31GB RAM, 1.8TB disk (94% free) |
| IPs bound | `.66` (Refinery), `.67` (MailWizz) |
| IP `.68` | NOT bound yet (exists in subnet, not in netplan) |
| Redis | ✅ Installed, running on `127.0.0.1:6379`, no password |
| Node.js | ✅ v20.20.1 |
| PM2 | ✅ Installed, running `refinery-api` |
| Workers currently | Railway (separate service + Redis add-on) |

---

## Phase 1: Bind IP .68 to the Server

**What:** Add `107.172.56.68` to the netplan config so the server responds on that IP.

**Why:** Workers will listen on `.68` to keep them isolated from Refinery (`.66`) and MailWizz (`.67`).

**Commands:**
```bash
# Edit netplan to add .68
# In /etc/netplan/*.yaml, add "107.172.56.68/28" to addresses list
# Then: netplan apply
```

**Risk:** LOW — only adds, doesn't change existing IPs. Refinery and MailWizz unaffected.

**Verification:** `ping 107.172.56.68` from local machine should respond.

---

## Phase 2: Configure Redis for Worker Access

**What:** Redis currently binds to `127.0.0.1` only. Workers on the same box connect via localhost — no change needed. But Vercel's API routes also need to enqueue jobs, so we need Redis accessible from outside (on `.68` only, with a password).

**Option A (Simpler):** Workers are on same box → keep Redis on localhost. Vercel connects to `107.172.56.68:6379` via a password-protected binding.

**Commands:**
```bash
# Edit /etc/redis/redis.conf:
#   bind 127.0.0.1 107.172.56.68
#   requirepass <strong-password>
# Restart: systemctl restart redis-server
# Firewall: allow port 6379 only from Vercel egress IPs (or use password + rate limit)
```

**Risk:** MEDIUM — opening Redis to the network requires a strong password. We'll set one.

**Verification:** `redis-cli -h 107.172.56.68 -a <password> ping` → PONG

---

## Phase 3: Clone Axiom Repo + Install Worker Dependencies

**What:** Clone the Axiom repo on the VPS. Install only `apps/workers` dependencies.

**Commands:**
```bash
# Create dedicated directory
mkdir -p /home/marketx/workers
cd /home/marketx/workers

# Clone repo (or scp the apps/workers directory)
git clone <repo-url> . 
# OR: rsync from local machine

# Install dependencies
cd apps/workers
npm install --production
```

**Risk:** LOW — just installing files. Nothing runs yet.

**Verification:** `ls /home/marketx/workers/apps/workers/node_modules` exists.

---

## Phase 4: Create Worker Environment File

**What:** Create `.env` for workers with all required credentials.

**Vars needed:**
```env
# Redis (local)
REDIS_URL=redis://:<password>@127.0.0.1:6379

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://uvrpucqzlqhsuttbczbo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from current Railway env>

# Direct Postgres (for Dream State worker)
DATABASE_URL=<supabase connection string>

# AI (workers that do AI calls need this)
OPENAI_API_KEY=<if workers call AI directly, otherwise DB-managed>

# Node env
NODE_ENV=production
```

**Risk:** LOW — just a file. Need to pull the correct values from Railway's current config.

**Verification:** `cat /home/marketx/workers/apps/workers/.env` — all vars present.

---

## Phase 5: PM2 Ecosystem Config + Start Workers

**What:** Create a PM2 ecosystem file and start the workers.

**Config:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'axiom-workers',
    script: 'dist/index.js',  // or tsx/ts-node
    cwd: '/home/marketx/workers/apps/workers',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '2G',
    restart_delay: 5000,
  }]
}
```

**Commands:**
```bash
cd /home/marketx/workers/apps/workers
npm run build   # compile TypeScript
pm2 start ecosystem.config.js
pm2 save
```

**Risk:** LOW — new process, doesn't affect refinery-api.

**Verification:** 
- `pm2 status` shows `axiom-workers` as `online`
- `pm2 logs axiom-workers --lines 20` shows "All workers started. Waiting for jobs..."
- Workers connect to Redis successfully

---

## Phase 6: Update Vercel Environment

**What:** Point Vercel's `REDIS_URL` to the VPS Redis instead of Railway Redis.

**Where:** Vercel Dashboard → Axiom project → Settings → Environment Variables

**Change:**
```
REDIS_URL = redis://:<password>@107.172.56.68:6379
```

**Risk:** MEDIUM — this is the cutover. Jobs will start going to VPS workers instead of Railway.

**Verification:**
- Trigger a test job from the UI (e.g., a KB processing or writer run)
- Check `pm2 logs axiom-workers` — job should appear
- Check Vercel function logs — no Redis connection errors

---

## Phase 7: Decommission Railway Workers

**What:** Once VPS workers are confirmed working, stop/delete the Railway worker service.

**NOT doing:** Do NOT delete Railway Redis until we've confirmed all jobs drained.

**Risk:** LOW — only after verification.

---

## Total Timeline

| Phase | Time | Needs Approval |
|-------|------|----------------|
| 1. Bind IP .68 | 2 min | ✅ YES |
| 2. Redis config | 5 min | ✅ YES |
| 3. Clone + install | 10 min | ✅ YES |
| 4. Create .env | 5 min | ✅ YES |
| 5. PM2 start | 5 min | ✅ YES |
| 6. Vercel cutover | 5 min | ✅ YES (you do this in Vercel UI) |
| 7. Decommission Railway | 2 min | ✅ YES |
| **Total** | **~34 min** | |

---

## What I Will NOT Touch

- ❌ IP `.66` (Refinery) — no changes
- ❌ IP `.67` (MailWizz) — no changes
- ❌ Nginx configs for existing sites — no changes
- ❌ PM2 `refinery-api` process — no changes
- ❌ CloudPanel settings — no changes
- ❌ Any database schema — no changes
