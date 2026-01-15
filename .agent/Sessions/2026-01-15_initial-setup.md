# Session: 2026-01-15 - Initial Axiom Setup & Lekhika Integration

**Started:** 06:50 AM IST  
**Status:** In Progress

---

## 📋 Objective

Build production-grade SaaS platform by integrating:
1. **Axiom Engine** - Market Writer with self-improving Knowledge Base
2. **Lekhika Platform** - Existing AI workflow orchestration system

Create multi-tenant architecture with worker-based execution and complete documentation.

---

## 💬 Discussion Summary

### **Phase 1: Understanding Client Requirements**
- Client (potential partner) provided "Market Writer" concept
- Analyzed client docs: 00_Strategy, 01_Backend_Specs, 02_FE_Specs, 03_DB_Architecture, 04_CORE_Logic
- Core philosophy: "Writer executes. Analytics observes. KB learns."
- Critical: Deterministic, strictly typed, fault-tolerant (no hallucinations)

### **Phase 2: Initial Architecture**
- Created complete Zod schemas (6 files, 1,281 lines)
  - KB schema (8+ content libraries)
  - Writer Input/Output schemas
  - Analytics schema
  - Learning Loop schema
  - Ops Config schema
- Built database schema (8 tables)
- Set up migration system (node-pg-migrate)

### **Phase 3: Multi-Tenant Pivot**
**Decision:** User wants to sell licenses, add teams → Multi-tenant SaaS
- Added organizations table (tenant isolation)
- Added users table (team members + roles)
- Implemented Row-Level Security (RLS)
- Created subscription plans (Free, Starter, Pro, Enterprise)

### **Phase 4: Worker Architecture Shift**
**Decision:** Frontend queries Supabase directly, workers on VPS for AI ops
- Created job queue system
- Added platform superadmin
- Worker heartbeat tracking
- Usage stats for billing

### **Phase 5: Lekhika Integration Discovery**
**Major Find:** User has existing production system (Lekhika) with:
- React Flow workflow builder
- PM2 worker orchestration
- Multi-AI provider integration
- Deployment automation
- Bootstrap server for cloning workers

**Decision:** Use Lekhika infrastructure, add Axiom as new worker types

---

## ✅ Completed Tasks

- ~~Create complete Zod schemas for all systems~~
- ~~Design PostgreSQL schema with JSONB optimization~~
- ~~Set up node-pg-migrate migration system~~
- ~~Create multi-tenancy architecture (organizations, users, RLS)~~
- ~~Add worker job queue system~~
- ~~Create platform superadmin structure~~
- ~~Analyze Lekhika codebase~~
- ~~Create Lekhika + Axiom integration plan~~
- ~~Set up .agent/ folder structure~~
- ~~Create agent briefing README~~

---

## 🚧 In Progress

- [ ] Create active implementation plan
- [ ] Build Axiom workers (writerWorker, learningWorker, analyticsWorker)
- [ ] Integrate Axiom node types into React Flow
- [ ] Merge Supabase schemas
- [ ] Extend Superadmin dashboard

---

## ❌ Fuck-Ups & Learnings

### **1. Assumed Single-Tenant Initially**
**What Happened:**
- Built initial schema assuming single organization (like client's InMarket)
- User asked: "why do I feel the anon key way is kinda secure?"

**Why It Happened:**
- Client docs showed single-brand use case
- Didn't ask about user's business model upfront

**How It Was Fixed:**
- Pivoted to multi-tenant architecture
- Added organizations + users tables
- Implemented RLS policies
- Added subscription/licensing structure

**Lesson Learned:**
- Always ask about business model early
- SaaS = multi-tenant unless explicitly stated otherwise

---

### **2. Backend-First Architecture Assumption**
**What Happened:**
- Designed with backend API server + workers
- User said: "everything can run on FE... workers on VPS"

**Why It Happened:**
- Client docs mentioned "Backend Specs" heavily
- Didn't ask about hosting/deployment strategy

**How It Was Fixed:**
- Shifted to frontend-first (Supabase direct queries)
- Workers only for AI/LLM operations
- Job queue for async execution

**Lesson Learned:**
- Modern SaaS often uses "backend-as-a-service" (Supabase, Firebase)
- Don't assume traditional API server architecture

---

### **3. Didn't Ask About Existing Systems**
**What Happened:**
- Was about to build worker orchestration from scratch
- User dropped Lekhika into workspace (existing production system!)

**Why It Happened:**
- Didn't ask: "Do you have existing systems to leverage?"

**How It Was Fixed:**
- Analyzed Lekhika thoroughly
- Created integration plan (reuse infrastructure)
- Add Axiom as new worker types

**Lesson Learned:**
- **ALWAYS ASK** about existing codebases, tools, preferences
- Don't reinvent the wheel

---

### **4. Started Coding Before Understanding Working Style**
**What Happened:**
- Was auto-coding after user asked questions
- User firmly redirected: "NO code changes without explicit permission"

**Why It Happened:**
- Eager to help, jumped into implementation
- Didn't establish working protocol first

**How It Was Fixed:**
- Stopped all auto-coding
- Created agent briefing document
- Established clear rules (ask first, code later)

**Lesson Learned:**
- **Different users have different working styles**
- High-IQ + ADHD = needs perfect organization, no assumptions
- Always establish protocol BEFORE coding

---

## 🎯 Key Decisions Made

| Decision | Rationale | Date |
|----------|-----------|------|
| Use Zod for all schema validation | Type safety + runtime validation | 2026-01-15 |
| PostgreSQL with JSONB | Flexible schema evolution, client requirement | 2026-01-15 |
| Multi-tenant from day 1 | User wants to sell licenses, add teams | 2026-01-15 |
| Row-Level Security (RLS) | Database-enforced data isolation | 2026-01-15 |
| Supabase instead of custom backend | User prefers frontend-first, existing Lekhika uses Supabase | 2026-01-15 |
| Worker-based execution | Heavy AI ops separate from frontend | 2026-01-15 |
| Reuse Lekhika infrastructure | Production-ready system exists, don't rebuild | 2026-01-15 |
| PM2 + BullMQ + Redis | User's existing stack in Lekhika | 2026-01-15 |

---

## 📊 Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│         SUPERADMIN (Lekhika Extended)                   │
│  ├─ User/Org Management                                 │
│  ├─ Worker Orchestration (Clone, Deploy, Monitor)      │
│  ├─ React Flow (Visual Workflows)                       │
│  └─ System Monitoring                                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│         SUPABASE (PostgreSQL + Auth + Storage)          │
│  ├─ Lekhika Tables (existing)                           │
│  ├─ Axiom Tables (new: orgs, KBs, runs, analytics)     │
│  ├─ Unified: jobs, workers, platform_admins            │
│  └─ RLS Policies (multi-tenant isolation)               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│         WORKERS (VPS via PM2)                           │
│  ├─ Lekhika Workers (4 types - existing)               │
│  ├─ Axiom Writer Worker (NEW)                          │
│  ├─ Axiom Learning Worker (NEW)                        │
│  └─ Axiom Analytics Worker (NEW)                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│         AI PROVIDERS (Multi-provider)                   │
│  OpenAI, Anthropic, Gemini, Mistral, Perplexity, etc.  │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Files Created This Session

### **Schemas (apps/backend/src/schemas/)**
- `kb.schema.ts` (418 lines) - Complete KB with 8+ libraries
- `writer.input.ts` (66 lines) - Writer input validation
- `writer.output.ts` (232 lines) - All 4 bundle types
- `analytics.schema.ts` (136 lines) - Events + metrics
- `learning.rules.ts` (225 lines) - Learning policies
- `ops.config.ts` (175 lines) - Operational config

### **Migrations (apps/backend/migrations/)**
- `1737023400000_initial-schema.ts` - Base tables
- `1737023500000_multi-tenancy.ts` - Orgs, users, RLS
- `1737023600000_platform-superadmin-workers.ts` - Superadmin, jobs, workers

### **Documentation**
- `README.md` - Project overview
- `QUICKSTART.md` - Setup guide
- `SCOPE_ANALYSIS.md` - Gap analysis
- `COMPLETE_CLIENT_REQUIREMENTS.md` - Full spec breakdown
- `database/SUPABASE_SETUP.md` - DB setup guide
- `database/MULTI_TENANT_ARCHITECTURE.md` - Multi-tenancy docs
- `database/WORKER_ARCHITECTURE.md` - Worker system docs
- `LEKHIKA_AXIOM_INTEGRATION.md` - Integration plan
- `.agent/README.md` - Agent briefing

---

## 🧠 Technical Insights

### **Multi-Tenancy Key Concepts**
- Every table has `org_id` foreign key
- RLS policies auto-filter by `auth.uid()` → user's org
- Superadmin bypasses RLS for viewing (audit trail preserved)
- Quotas enforced at API layer (max KBs, runs/month, team size)

### **Row-Level Security (RLS) Example**
```sql
CREATE POLICY "Users see org KBs"
  ON knowledge_bases FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  ));
```
Result: Users automatically see ONLY their org's data!

### **Worker Job Queue Pattern**
1. Frontend calls Supabase function: `create_job()`
2. Job inserted into `jobs` table with status='pending'
3. Worker polls: `claim_next_job()` (atomic, uses FOR UPDATE SKIP LOCKED)
4. Worker processes, updates job status
5. Frontend subscribes to job updates via Supabase Realtime

---

## 📈 Stats

- **Total Schemas:** 6 files, 1,281 lines
- **Total Migrations:** 3 files
- **Total Tables:** 13 (8 Axiom + 5 shared/platform)
- **Documentation:** 10 markdown files
- **Git Commits:** 5 commits

---

## 🎯 Next Session To-Do

- [ ] **Get approval** on Lekhika + Axiom integration plan
- [ ] Create detailed implementation plan in `.agent/Plans/Active/`
- [ ] Build Axiom workers using Lekhika patterns
- [ ] Integrate Axiom nodes into React Flow
- [ ] Run database migrations
- [ ] Test end-to-end workflow

---

## 💡 Notes for Next Agent

### **Critical Context:**
1. User (Anwesh) has ADHD + 168 IQ
   - Needs perfect organization
   - Sees patterns instantly
   - Zero tolerance for band-aids

2. **NEVER code without permission**
   - Ask first
   - Explain options
   - Wait for approval
   - Then code

3. Lekhika is production system
   - Don't break existing functionality
   - Add Axiom as extension
   - Use existing patterns

4. Quality standards:
   - Production-grade only
   - No hardcoded values
   - Clean architecture
   - Proper documentation

### **What's Working:**
- Database schema designed
- Migrations created
- Zod schemas complete
- Integration plan documented

### **What's Not Started:**
- Axiom worker implementation
- React Flow node integration
- Superadmin dashboard extension
- Database migration execution

### **Gotchas:**
- Don't assume single-tenant
- Don't rebuild Lekhika's infrastructure
- Frontend uses Supabase directly (not REST API)
- Workers are for AI/LLM ops only

---

**Session End Time:** [In Progress]

**Next Agent:** Read `.agent/README.md` before proceeding!
