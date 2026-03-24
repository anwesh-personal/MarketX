# MarketX / Axiom — Credentials

> ⚠️ This file contains sensitive credentials. Do NOT commit to git.

---

## VPS (RackNerd)

| Item | Value |
|------|-------|
| Server | RackNerd VPS |
| Root IP | `107.172.56.66` |
| Root User | `root` |
| Root Password | `AuVkRFXqz5GY8qn5` |

### IP Assignments

| IP | Purpose |
|----|---------|
| `107.172.56.66` | Refinery Nexus |
| `107.172.56.67` | MailWizz |
| `107.172.56.68` | MarketX Workers |

---

## CloudPanel SSH (workers.marketwriter.app)

| Item | Value |
|------|-------|
| Domain | `workers.marketwriter.app` |
| IP | `107.172.56.68` |
| Username | `marketwriter-workers` |
| Password | `3edcCDE#M@rketX` |

---

## Redis (VPS - MarketX Workers)

| Item | Value |
|------|-------|
| Host | `107.172.56.68` |
| Port | `6379` |
| Password | `a3eaf52313a8c5fd9b0675684ef6cb9ef1b193c0973b7ff4` |
| URL | `redis://:a3eaf52313a8c5fd9b0675684ef6cb9ef1b193c0973b7ff4@107.172.56.68:6379` |

---

## Vercel Env Vars (MarketX Frontend)

| Var | Value |
|-----|-------|
| `REDIS_URL` | `redis://:a3eaf52313a8c5fd9b0675684ef6cb9ef1b193c0973b7ff4@107.172.56.68:6379` |
| `WORKER_API_URL` | `https://workers.marketwriter.app` |
| `JWT_SECRET` | `UhchIFlGksGXJFc91RyVGtCOPEw1jRKn2CSfJZ+PSYE=` |

---

## Supabase

| Item | Value |
|------|-------|
| URL | `https://uvrpucqzlqhsuttbczbo.supabase.co` |
| Database URL | `postgresql://postgres.uvrpucqzlqhsuttbczbo:3edcCDE%23Amite%24h123%21%21%21@aws-0-ap-south-1.pooler.supabase.com:6543/postgres` |
