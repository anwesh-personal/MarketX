# AXIOM PROJECT STATE
**Last Updated:** 2026-03-25 06:42 IST

> ⚠️ READ `MISSION_CRITICAL.md` FIRST — it explains why this project matters.

---

## 🚀 DEPLOYMENT STATUS

| Service | Platform | URL/Host | Status |
|---------|----------|----------|--------|
| **Frontend** | Vercel | `axiom-steel.vercel.app` | ✅ LIVE |
| **Workers** | Railway | `axiom-production-straight.up.railway.app` | ✅ LIVE |
| **Redis** | Railway | Internal | ✅ LIVE |
| **Database** | Supabase | `uvrpucqzlqhsuttbczbo.supabase.co` | ✅ LIVE |
| **MailWizz** | Dedicated | `107.172.56.66` | 🔄 Setup |
| **Refinery Nexus** | Linode | TBD | 🔄 Setup |

---

## ✅ COMPLETE

| Component | Status | Key Files |
|-----------|--------|-----------|
| Theme System | ✅ | CSS variables, 3 themes |
| Superadmin Panel | ✅ | All routes |
| Workflow Builder | ✅ | 36+ node types, drag-drop |
| **Agent Nodes (NEW)** | ✅ | 5 agent nodes, AgentConfig.tsx |
| Node Configuration | ✅ | 9,400+ lines forms |
| AI Provider Management | ✅ | Multi-provider, BYOK, failover |
| **Unified Provider Chain (NEW)** | ✅ | Org BYOK → platform keys, auto-disable |
| KB Manager | ✅ | 12-section schema |
| Redis Management | ✅ | Queue stats |
| Workers (7 total) | ✅ | All BullMQ workers |
| Auth System | ✅ | Supabase + superadmin JWT |
| **Self-Healing Loop (NEW)** | ✅ | MailWizz → coach → brain_memories → agent prompts |
| **Agent Deployment (NEW)** | ✅ | org_agents, deploy from bundles |
| **Usage Tracking (NEW)** | ✅ | RPC functions, auto-disable after 10 failures |
| **Org-Scoped RLS (NEW)** | ✅ | Defense-in-depth on all new tables |
| Email Verification Engine | ✅ | Standalone pipeline in Refinery |

---

## 🔄 IN PROGRESS

| Component | Progress | What's Left |
|-----------|----------|-------------|
| **Refinery ↔ Axiom Integration** | 20% | API bridge for verified leads → segments |
| **MailWizz ↔ Axiom Integration** | 40% | Webhook loop works, need campaign dispatch |
| **SMTP Satellite Constellation** | 10% | 1 server up, need 50 total |
| **Production Warmup Plan** | 0% | IP warmup, domain rotation |

---

## Database Migrations (Current: 049)

| # | Name | Status |
|---|------|--------|
| 001-030 | Core tables | ✅ |
| 031 | agent_templates | ✅ |
| 032-044 | Various features | ✅ |
| 045 | agent_templates_rls | ✅ |
| 046 | org_agents + org_agent_kb | ✅ |
| 047 | brain_learning_events | ✅ |
| 048 | org_scoped_rls | ✅ |
| 049 | provider_usage_functions + schema upgrades | ✅ |

---

## 🔑 GIT

| Item | Value |
|------|-------|
| Repository | `github.com/anwesh-personal/MarketX` |
| Remote | `marketx` |
| Branch | `main` |

---

*Updated 2026-03-25 by Antigravity*
