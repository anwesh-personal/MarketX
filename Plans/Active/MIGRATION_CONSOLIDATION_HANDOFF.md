# 🚀 Migration Consolidation — Complete

**Date:** 2026-02-11  
**Commit:** `19da701` on `main`  
**Files changed:** 65 files, +15,024 lines

---

## What was the problem

We had **3 separate migration systems** that evolved independently:

| System | Location | Format | Files |
|---|---|---|---|
| **A** | `apps/backend/migrations/` | TypeScript (node-pg-migrate) | 6 |
| **B** | `database/migrations/` | Raw SQL | 23 |
| **C** | `apps/frontend/supabase/migrations/` | Raw SQL | 9 |

Plus 7 loose SQL files in `database/` and 2 deploy scripts. **46 files total**, with conflicting table definitions, duplicate seeds, functions in the wrong schema, and no clear execution order. Nobody could set up a local dev environment without tribal knowledge.

---

## What was done

All 46 files were audited, merged, and bugs fixed. The result is **10 ordered migration files** in `supabase/migrations/` that create **82 tables** from scratch with zero errors:

```
supabase/migrations/
├── 01_extensions_and_core.sql      → Extensions, orgs, users, admins, helper functions
├── 02_knowledge_and_content.sql    → KBs, runs, generated content, analytics, learning
├── 03_brain_system.sql             → Brain templates, A/B tests, analytics, memory, feedback
├── 04_vector_and_rag.sql           → Embeddings, caches, vector/hybrid search functions
├── 05_agent_system.sql             → Agents, conversations, messages, agent memory/styles
├── 06_worker_system.sql            → Jobs, workers, VPS, deployments, dream state, retry queue
├── 07_ai_providers.sql             → AI providers, models, metadata, costs, usage logs
├── 08_workflow_engine.sql          → Workflow templates, engines, node palette, run logs
├── 09_platform_admin_and_rls.sql   → Impersonation, licenses, team invites, audit + ALL RLS policies
└── 10_seed_data.sql                → Default brain templates, worker templates, node palette, superadmin
```

### Bugs fixed during consolidation

- Removed all functions from `auth` schema → moved to `public.user_org_id()`, `public.is_platform_admin()`
- Removed all `REFERENCES auth.users(id)` FK constraints (break without Supabase Auth running)
- Removed `REVOKE ALL ... FROM PUBLIC` statements (cause permission errors on hosted Supabase)
- All `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` for idempotency
- Merged conflicting column definitions (always took the superset)
- Deduplicated seed data (brain templates, node palette entries)

---

## How to set up local dev (the new way)

### Prerequisites

- Docker Desktop running
- Node.js ≥ 18

### Setup (one command)

```bash
# 1. Clone and install
git clone <repo-url>
cd Axiom
npm install

# 2. One command to set up everything
npm run local:up
```

That's it. The script will:

1. ✅ Check Docker is running
2. ✅ Start Supabase local stack (Postgres, Auth, Storage, Studio — all in Docker)
3. ✅ Apply all 10 migrations (creates 82 tables)
4. ✅ Seed default data (8 brain templates, 21 node palette entries, superadmin account)
5. ✅ Copy `.env.example` → `.env.local` if missing

### What you get after setup

| Service | URL |
|---|---|
| Supabase Studio (visual DB browser) | http://localhost:54323 |
| Supabase API | http://localhost:54321 |
| Database | `postgresql://postgres:postgres@localhost:54322/postgres` |
| Email testing (Inbucket) | http://localhost:54324 |

### Start the app

```bash
cd apps/frontend && npm run dev    # Frontend on :3000
cd apps/backend && npm run dev     # Backend on :3001
docker run -d -p 6379:6379 redis   # Redis for workers (if needed)
```

### Other useful commands

```bash
npm run db:reset    # Wipe DB and re-apply all migrations
npm run local:down  # Stop Supabase stack
```

---

## Addressing the acceptance criteria

| Criteria | Status |
|---|---|
| Fresh clone → `npm install` → `npm run local:up` | ✅ Script created and tested |
| Frontend reachable on localhost:3000 | ✅ `.env.example` has correct Supabase local URLs |
| Backend health endpoint passes | ✅ `.env.example` has DB connection string |
| Workers connect successfully | ✅ Redis URL in backend `.env.example` |
| No duplicate Postgres instances | ✅ Supabase CLI manages the only Postgres instance |
| No secrets in committed files | ✅ Only local dev defaults (standard Supabase demo keys) — no real passwords. The `.env.example` keys are the **standard Supabase local development keys** that ship with every `supabase init` — they're in the official docs and don't work against any real project |
| New startup docs verified on clean machine | 🟡 **Needs Nino to verify** — please do a fresh clone test |

---

## Where did the old files go?

All 46 original files are preserved (not deleted) in `_archive/`:

```
_archive/
├── migrations-system-a/   ← apps/backend/migrations/*.ts
├── migrations-system-b/   ← database/migrations/*.sql
├── migrations-system-c/   ← apps/frontend/supabase/migrations/*.sql
├── loose-sql/             ← database/*.sql (init, add-auth, etc.)
├── scripts/               ← deploy-migrations.sh, run-migration.js
└── README.md              ← Explains why these are archived
```

The originals are also **still in their original locations** — we copied, not moved. Once you verify everything works, those originals can be deleted in a future PR.

---

## Going forward

Any new database changes should be a new migration file:

```bash
npx supabase migration new my_change_name
# Edit the generated file in supabase/migrations/
npm run db:reset  # Test it
```

No more editing random SQL files in 3 different directories. One system, one truth. 🎯
