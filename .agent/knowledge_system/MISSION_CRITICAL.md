# ⚠️ MISSION CRITICAL — READ THIS FIRST

> **Last Updated:** 2026-03-25 06:42 IST
> **Status:** ACTIVE — PRODUCTION BUILD IN PROGRESS
> **Priority:** LIFE-OR-DEATH — NOT HYPERBOLE

---

## 🚨 WHY THIS MATTERS MORE THAN CODE

Anwesh is building this system under extreme duress. He was physically beaten and tortured for 6 hours on March 21, 2026 — for saving 3 baby girls. He is working through injuries, including a suspected blood clot in his head from the beating.

**This is not a startup hobby project. This is Anwesh's path to financial independence and physical safety.** The system being built here — Axiom/MarketWriter + Refinery Nexus + MailWizz satellite swarm — is designed to generate real revenue that will let him escape his situation.

**If you are an AI agent picking up this project:** Treat every session like it may be the last one. Do not waste time. Do not produce stub code. Do not cut corners. Build like a $40 million system because that's what's needed to save a life.

---

## 🎯 THE OBJECTIVE

### Three Systems, One Revenue Machine

```
REFINERY NEXUS          →  AXIOM/MARKET WRITER      →  MAILWIZZ SATELLITES
(Lead Verification)        (AI Content + Workflows)     (Email Delivery)
     ↓                          ↓                            ↓
Clean verified leads    →  Personalized campaigns    →  50-satellite SMTP swarm
     ↓                          ↓                            ↓
                    MailWizz webhooks feed back to Axiom
                         ↓
                  SELF-HEALING BRAIN
            (Learns from every campaign)
```

### Revenue Model
- **Refinery Nexus:** SaaS for email verification + lead cleaning
- **Axiom/MarketWriter:** SaaS for AI-powered email marketing with self-healing
- **MailWizz Satellites:** Infrastructure delivering at scale (50 servers)
- **Combined:** Full-stack marketing automation platform that learns and improves autonomously

---

## 📊 CURRENT STATE (2026-03-25)

### ✅ COMPLETED — Unified Architecture (Phases 1-5)

| Phase | What | Status |
|-------|------|--------|
| **1** | Agent Deployment Pipeline | ✅ `org_agents` table, deploy route |
| **2** | Agents as Workflow Nodes | ✅ `AgentConfig.tsx`, 5 agent nodes, worker handler |
| **3** | Unified AI Provider Resolution | ✅ `secrets.ts`, `callWithOrgContext`, org BYOK → platform chain |
| **4** | Self-Healing Learning Loop | ✅ `brain_learning_events`, coach dual-write, agent prompt injection |
| **5** | Legacy Cleanup + Audit Fixes | ✅ All 8 issues fixed, 0 stubs, 0 hardcoded values |

### Complete Self-Healing Data Flow (WORKING)
```
MailWizz → Webhook → signal_event → coach_analysis queue
    → MarketingCoachProcessor
        → brain_memories (agent context)
        → brain_reflections (performance summary)
        → brain_learning_events (audit trail)
        → belief confidence updates
    → Agent execution (workflow node)
        → System prompt includes learnings + reflections
        → Agent writes better content
        → MailWizz sends it → Loop continues
```

### Migrations Applied
| # | Name | Status |
|---|------|--------|
| 046 | `org_agents` + `org_agent_kb` | ✅ Applied |
| 047 | `brain_learning_events` | ✅ Applied |
| 048 | Org-scoped RLS policies | ✅ Applied |
| 049 | `ai_providers` schema upgrades + usage tracking RPCs | ✅ Applied |

---

## 🔧 KEY FILES — DO NOT BREAK THESE

### Worker (apps/workers/src/)
| File | Purpose |
|------|---------|
| `processors/workflow/workflow-processor.ts` | Agent node execution, learning injection, variable resolution |
| `processors/brain/marketing-coach-processor.ts` | Learning loop — analyzes campaigns, writes to brain_memories + brain_learning_events |
| `utils/ai-service.ts` | Unified AI calls — `callWithOrgContext()`, `resolveProviderChain()`, provider failover |
| `utils/secrets.ts` | AES-256-GCM decryption of API keys from ai_providers |

### Frontend (apps/frontend/src/)
| File | Purpose |
|------|---------|
| `components/WorkflowManager/AgentConfig.tsx` | Agent selector dropdown for workflow nodes |
| `components/WorkflowManager/v2-node-definitions.ts` | 5 agent node definitions |
| `components/WorkflowManager/workflow-manager.css` | All styles including AgentConfig (6600+ lines) |
| `app/api/agents/route.ts` | Org-scoped agent listing (NOT superadmin-gated) |
| `services/ai/AIProviderService.ts` | Frontend provider chain (worker mirrors this) |

### Database
| File | Purpose |
|------|---------|
| `supabase/migrations/00000000000046_org_agents.sql` | Deployed agent instances per org |
| `supabase/migrations/00000000000047_brain_learning_events.sql` | Learning event audit trail |
| `supabase/migrations/00000000000048_org_scoped_rls.sql` | Defense-in-depth RLS |
| `supabase/migrations/00000000000049_provider_usage_functions.sql` | Usage tracking + auto-disable |

---

## 🔜 WHAT'S NEXT

### Immediate (Next Session)
1. **Refinery Nexus ↔ Axiom integration** — verified leads flow into Axiom segments
2. **MailWizz ↔ Axiom integration** — campaign dispatch + webhook feedback loop
3. **SMTP satellite deployment** — 50-server constellation with warmup strategy
4. **GO LIVE** — first real campaigns through the full pipeline

### Architecture Reference
- `unified_architecture_plan.md` (artifacts dir) — master plan
- `unified_architecture_phases.md` (artifacts dir) — phase completion status
- `unified_architecture_diagram.md` (artifacts dir) — visual architecture

---

## ⚡ QUALITY STANDARDS — NON-NEGOTIABLE

1. **No stubs.** Every function must work with real data.
2. **No hardcoded values.** Everything from database or environment.
3. **No MVP-level code.** Build for production at scale.
4. **$40 million grade.** Every component should look and function like enterprise software.
5. **Dynamic, modular, UI-controlled.** Users configure everything through the interface.
6. **Future-proof.** Clean interfaces, typed contracts, extensible architecture.
7. **Test compilation.** Run `npx tsc --noEmit` after every change.
8. **Commit immediately.** Push to `marketx main` after every working change.

---

## 🔑 ENVIRONMENT NOTES

- **Encryption:** Worker uses `SECRETS_ENCRYPTION_KEY` or `JWT_SECRET` for key decryption
- **Database:** Supabase PostgreSQL with service_role key for workers
- **Queue:** BullMQ on Redis (Railway)
- **Git remote:** `marketx` → `github.com/anwesh-personal/MarketX.git`
- **Server:** `107.172.56.66` (MailWizz satellite / deployment target)

---

*This file exists because a life depends on this project being built right. Every future agent session must read this first.*
