# Axiom (MarketX) — Deep Audit: Part 4
## Go-Live Readiness Verdict (CORRECTED)

---

## Overall Assessment

### Code Quality: 🟢 Solid (8/10)

The codebase is mature and well-architected:
- Only **6 TODOs** across the entire platform (mostly admin-tier cosmetic)
- **Zero hardcoded API keys** — all provider keys configured dynamically via Superadmin UI and stored in DB per organization
- Clean adapter patterns for email providers (MailWizz, Mailgun, SES, SendGrid)
- Production-grade error handling with fallbacks
- Proper RLS policies (40 migrations of schema work)
- Multi-org architecture from the start
- Worker system well-architected with retry/backoff/monitoring

### Infrastructure Readiness: 🟡 Mostly Ready (7/10)

- **Frontend:** Deployed on Vercel (free tier) ✅
- **Workers:** Deployed on Railway ✅
- **Redis:** Running on Railway ✅
- **Supabase:** Cloud-hosted, configured ✅
- **AI Providers:** Configured via Superadmin UI per org (DB-backed, not env) ✅

---

## Current Deployment Architecture

```
Vercel (Free Tier)
├── Next.js 14 Frontend (SSR)
├── 31 API route groups (the backend)
└── Connects to: Supabase, Redis (Railway)

Railway
├── 10 BullMQ Workers (consumers)
├── Redis (BullMQ broker)
├── Management API on port 3100
└── Connects to: Supabase, Redis

Supabase (Cloud)
├── Auth (user + superadmin)
├── Postgres DB (40 migrations)
└── RLS policies

AI Providers (DB-configured via Superadmin)
├── OpenAI (configured per org)
├── Anthropic (optional)
└── Google AI (optional)
```

---

## Actual Blockers

### 🔴 BLOCKER 1: JWT_SECRET is Placeholder
- **Current value:** `axiom-jwt-secret-change-in-production`
- **Impact:** Superadmin auth tokens signed with a secret that's in the source code. Anyone who reads the repo can forge admin tokens.
- **Fix:** `openssl rand -base64 32` → set in Vercel env vars
- **Time:** 1 minute

### 🔴 BLOCKER 2: Domain Not Pointed
- **Domain:** `marketwriter.app` (owned)
- **Status:** DNS not pointed to Vercel
- **Fix:** Add domain in Vercel dashboard → point DNS CNAME to `cname.vercel-dns.com`
- **Time:** 5 minutes + propagation

---

## High Priority (Should Fix Before Go-Live)

### 🟡 No Password Reset Flow
- Login page has no "Forgot Password?" link
- Supabase supports `resetPasswordForEmail()` but it's not wired up
- Users locked out if they forget password
- **Time:** 30 minutes to implement

### 🟡 Refinery Nexus Bridge Not Connected
- Webhook events from MailWizz/SES/etc. don't forward to ClickHouse
- Code is complete but `REFINERY_NEXUS_URL` + `REFINERY_NEXUS_API_KEY` not set in Vercel
- **Time:** 5 minutes (assuming Refinery webhook endpoint exists)

### 🟡 VPS_HOST Points to Wrong Server
- `.env.local` has `VPS_HOST=103.190.93.28` (Lekhika VPS)
- Infrastructure panel will show wrong server status
- **Time:** 1 minute

---

## Optional: Worker Migration to VPS

This was discussed earlier in the conversation. Not a blocker — Railway works. But moving to VPS would:
- Save Railway costs
- Co-locate workers with Refinery on same box
- Simplify ops (one `pm2 status` to see everything)

**Time estimate:** 30-40 minutes when ready

---

## Low Priority / Post-Launch

| Item | Notes |
|------|-------|
| Superadmin PM2 logs endpoint | Placeholder — returns empty |
| Welcome email on org creation | TODO in code |
| Admin ID in org audit trail | `admin_id: null // TODO` |
| Writer output preview | `output_preview: null // TODO` |
| Confidence engine reply model | Deterministic fallback in place |

---

## Go-Live Checklist

| # | Task | Time | Priority |
|---|------|------|----------|
| 1 | Generate real `JWT_SECRET`, set in Vercel env | 1 min | 🔴 |
| 2 | Point `marketwriter.app` DNS to Vercel | 5 min | 🔴 |
| 3 | Add password reset flow | 30 min | 🟡 |
| 4 | Set `REFINERY_NEXUS_URL` + API key in Vercel | 5 min | 🟡 |
| 5 | Update `VPS_HOST` to RackNerd IP in Vercel env | 1 min | 🟡 |
| 6 | Configure MailWizz provider in Superadmin UI | 5 min | 🟡 |
| 7 | (Optional) Migrate workers from Railway to VPS | 40 min | ⚪ |

**Total for blockers: ~6 minutes.**
**Total including high priority: ~47 minutes.**

---

## Bottom Line

> **MarketX is closer to live than it feels.**
>
> The code is production-grade. AI providers are dynamically configured 
> in the Superadmin UI per organization — not hardcoded in env files.
> Workers and Redis are already running on Railway.
>
> The only hard blocker is a placeholder JWT secret and DNS pointing.
> Everything else is polish.
