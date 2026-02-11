# 🔧 Plan: Migration Consolidation + Local Dev Setup

**Created:** 2026-02-11
**Tickets:** #62, #59, #60, #61, Local Dev Setup
**Goal:** One migration system. One command to run locally. `git clone → npm install → npm run local:up`

---

## The Problem

We have **THREE separate migration systems** that overlap, conflict, and confuse:

| # | Location | Files | Format |
|---|----------|-------|--------|
| A | `apps/backend/migrations/` | 6 `.ts` files | node-pg-migrate |
| B | `database/migrations/` | 23 `.sql` files | Raw SQL |
| C | `apps/frontend/supabase/migrations/` | 9 `.sql` files | Raw SQL |

Plus loose SQL files in `database/*.sql`, a hardcoded `run-migration.js`, and a `deploy-migrations.sh` with credentials baked in.

**Nobody knows what to run, in what order, or which files are current.**

---

## The Solution

**ONE source of truth: `supabase/migrations/`** at the project root.

Why Supabase CLI:
- Nino's ticket explicitly says "Supabase CLI is the canonical local database"
- `supabase db reset` replays all migrations on a fresh local DB
- Built-in migration tracking
- Handles the `auth` schema properly (it owns it)
- Gives us Studio UI for free at localhost:54323
- Standard Supabase convention that any dev can follow

---

## Phase 0: Audit (DONE ✅)

### Complete Table Inventory Across All 3 Systems

**System A — `apps/backend/migrations/` (node-pg-migrate)**
- 001: knowledge_bases, runs, generated_content, analytics_events, aggregated_metrics, learning_history, ops_config, system_logs
- 002: organizations, users + org_id columns on all above + RLS + `auth.user_org_id()` ← BREAKS
- 003: platform_admins, jobs, workers, platform_usage_stats + `auth.is_platform_admin()` ← BREAKS
- 004: users.theme_preference, users.theme_updated_at
- 005: impersonation_logs, license_transactions, team_invitations, superadmin_audit_log + helper functions
- 006: organizations.client_id (IMT integration — we just added this)

**System B — `database/migrations/` (raw SQL)**
- 000: platform_admins (different schema than System A!), brain_templates, org_brain_assignments, brain_version_history, brain_request_logs, embeddings, embedding_cache, embedding_stats, rag_query_cache, query_expansions, rag_metrics, conversations, messages, agents, agent_sessions, tools, intent_patterns
- 001-004: Same as 000 but split into individual files (brain, vector, RAG, agent)
- 005: worker system tables
- 006: ai_providers, ai_models, ai_costs, brain_ai_assignments
- 007: workers, worker_templates, worker_deployments, worker_health_logs, worker_execution_logs
- 008: Default brain template seed data
- 009: vps_servers, vps_server_metrics
- 010: Worker template seed data
- 011: brain_thinking_configs, brain_tool_configs, custom_tools, training_conversations, training_exchanges
- 012: agent_memory, agent_facts, agent_preferences, agent_context_history
- 013: worker_jobs (different from System A's jobs table!)
- 014: workflow engine tables (massive — workflow_templates, workflow_instances, workflow_steps, etc.)
- 015: workflow v2 template seed data
- 016: worker_deployment_configs, worker_deploy_events
- 017: ai_model_metadata
- 020: node palette redesign  
- 021: engine_access_keys
- 022: railway_domains
- 023: railway_workspaces

**System C — `apps/frontend/supabase/migrations/` (raw SQL)**
- Workflow engine tables (DUPLICATE of B/014)
- API key system
- Brain missing tables (DUPLICATE of B/011)
- Agent specific memory (DUPLICATE of B/012)
- Conversation brain association
- Node palette v2 (DUPLICATE-ish of B/020)
- Knowledge bases table (DUPLICATE of A/001!)
- Utility nodes v2
- Dream jobs table

### Known Bugs (#59, #60, #61, #62)
1. `auth.user_org_id()` — creates function in restricted `auth` schema
2. `auth.is_platform_admin()` — same problem
3. `users.id` FK to `auth.users(id)` — only works with Supabase Auth running
4. `platform_admins.id` FK to `auth.users(id)` — same
5. Duplicate table definitions across systems with different columns
6. `REVOKE ALL ... FROM PUBLIC` in some files — breaks on Supabase hosted

---

## Phase 1: Create Consolidated Migration (DONE ✅)

**Goal:** Single file that creates the COMPLETE schema from scratch.

**Result:** 10 migration files created in `supabase/migrations/` (~97KB total):
- `01_extensions_and_core.sql` — Extensions, organizations, platform_admins, users, helper functions
- `02_knowledge_and_content.sql` — KBs, runs, generated_content, analytics, learning, ops_config
- `03_brain_system.sql` — Brain templates, assignments, A/B tests, analytics, constitution rules, user memory, feedback
- `04_vector_and_rag.sql` — Embeddings, caches, RAG metrics, vector/hybrid search functions
- `05_agent_system.sql` — Agents, conversations, messages, sessions, tools, intents, agent memory/resonance/styles
- `06_worker_system.sql` — Jobs, workers, templates, VPS, deployments, dream state, retry queue, error patterns
- `07_ai_providers.sql` — AI providers, models, model metadata, costs, brain-AI assignments, usage logs
- `08_workflow_engine.sql` — Workflow templates, constitutions, engine instances, node palette, run logs, user API keys
- `09_platform_admin_and_rls.sql` — Impersonation logs, license transactions, team invitations, audit logs, RLS policies
- `10_seed_data.sql` — Default brain/worker templates, node palette entries, ops config, superadmin account

### Step 1.1: Create `supabase/` project config
- Run `supabase init` at project root
- Configure `supabase/config.toml` for local dev

### Step 1.2: Build ONE consolidated migration
Create `supabase/migrations/00000000000000_complete_schema.sql` containing ALL tables in correct dependency order:

```
Section 1: Extensions
  - uuid-ossp
  - vector
  - pg_trgm

Section 2: Core Tables (no FKs to each other yet)
  - organizations (with client_id)
  - platform_admins (NO FK to auth.users — just UUID PK)
  - users (NO FK to auth.users — just UUID PK)

Section 3: Knowledge & Content
  - knowledge_bases
  - runs
  - generated_content
  - ops_config
  - system_logs

Section 4: Brain System
  - brain_templates
  - org_brain_assignments
  - brain_version_history
  - brain_ab_tests
  - brain_request_logs
  - brain_thinking_configs
  - brain_tool_configs
  - custom_tools

Section 5: Vector & RAG
  - embeddings
  - embedding_cache
  - embedding_stats
  - rag_query_cache
  - query_expansions
  - rag_metrics

Section 6: Agent System
  - agents
  - conversations
  - messages
  - agent_sessions
  - tools
  - intent_patterns
  - agent_memory
  - agent_facts
  - agent_preferences
  - agent_context_history

Section 7: Analytics & Learning
  - analytics_events
  - aggregated_metrics
  - learning_history

Section 8: Worker System
  - jobs (unified version)
  - workers
  - worker_templates
  - worker_deployments
  - worker_health_logs
  - worker_execution_logs
  - worker_deployment_configs
  - worker_deploy_events
  - worker_jobs
  - dream_jobs

Section 9: Workflow Engine
  - workflow_templates
  - workflow_instances
  - workflow_steps
  - (all other workflow tables)
  - node palette data

Section 10: Platform & Admin
  - platform_usage_stats
  - impersonation_logs
  - license_transactions
  - team_invitations
  - superadmin_audit_log
  - vps_servers
  - vps_server_metrics

Section 11: AI Provider Management
  - ai_providers
  - ai_models / ai_model_metadata
  - ai_costs
  - brain_ai_assignments

Section 12: Infrastructure
  - engine_access_keys
  - railway_domains
  - railway_workspaces
  - system_configs

Section 13: Training Data
  - training_conversations
  - training_exchanges

Section 14: Theme System
  - ALTER TABLE users ADD theme_preference, theme_updated_at

Section 15: Indexes (all in one place)

Section 16: Functions (moved OUT of auth schema)
  - public.user_org_id()
  - public.is_platform_admin()
  - All helper functions (hybrid_search, vector_search, etc.)

Section 17: Triggers

Section 18: RLS Policies (using public.* functions, not auth.*)

Section 19: Seed Data
  - Default brain templates
  - Default agents & tools
  - Default intent patterns
  - Default worker templates
  - Default ops config
  - Default superadmin (anweshrath@gmail.com)
```

### Step 1.3: Fix all known bugs during consolidation
- `auth.user_org_id()` → `public.user_org_id()`
- `auth.is_platform_admin()` → `public.is_platform_admin()`
- Remove FK constraints to `auth.users(id)` — keep UUID PKs, no hard FK
- All `CREATE TABLE` use `IF NOT EXISTS`
- All `CREATE INDEX` use `IF NOT EXISTS`
- All `CREATE POLICY` use `DROP POLICY IF EXISTS` before create
- Remove `REVOKE ALL ... FROM PUBLIC` statements
- Reconcile conflicting column definitions between systems

---

## Phase 2: Local Dev Setup (DONE ✅)

**Completed:**
- `supabase/config.toml` configured for `axiom-engine` project
- `apps/frontend/.env.example` created with Supabase local defaults
- `apps/backend/.env.example` updated with local Supabase DB connection
- `scripts/local-setup.sh` created as the single-command setup script
- `npm run local:up`, `local:down`, `db:reset` added to root `package.json`
- `.gitignore` already covers `.env` and `.env.local`

### Step 2.1: Configure Supabase CLI
- `supabase/config.toml` with local ports
- Seed data in `supabase/seed.sql`

### Step 2.2: Update docker-compose.yml
- Remove raw Postgres (Supabase CLI handles DB)
- Add: redis (for BullMQ workers)
- Add: backend (Express API)
- Add: frontend (Next.js)
- All pointing to Supabase local stack DB

### Step 2.3: Create `.env.example` files
- Frontend: Supabase local URL, anon key, service role key
- Backend: DATABASE_URL (local Supabase), REDIS_URL, JWT_SECRET
- All with safe local defaults (no real secrets)

### Step 2.4: Root-level `npm run local:up`
Script that does:
1. `supabase start`
2. Copy `.env.example` → `.env.local` if not exists
3. `npm install` in all workspaces
4. Start services (backend, frontend, workers)

### Step 2.5: Clean up secrets
- Remove Supabase project URL from `deploy-migrations.sh`
- Audit all `.env` files
- Update `.gitignore`

---

## Phase 3: Archive Old Systems

### Step 3.1: Move old migrations to `_archive/`
```
_archive/
  migrations-system-a/   ← apps/backend/migrations/*.ts
  migrations-system-b/   ← database/migrations/*.sql
  migrations-system-c/   ← apps/frontend/supabase/migrations/*.sql
  loose-sql/             ← database/*.sql (add-auth, create-my-admin, etc.)
  scripts/               ← deploy-migrations.sh, run-migration.js
```

### Step 3.2: Update README and docs
- New `MIGRATIONS.md` explaining the single system
- Update `QUICKSTART.md` for local dev
- Remove `MIGRATIONS_READY.md`

---

## Phase 4: Verify

### Acceptance Criteria
- [ ] `supabase db reset` creates ALL tables with zero errors
- [ ] Fresh clone → `npm install` → `npm run local:up` → everything works
- [ ] Frontend reachable on localhost:3000
- [ ] Backend health endpoint passes
- [ ] Workers connect to Redis
- [ ] No duplicate Postgres instances
- [ ] No real secrets in committed files
- [ ] Supabase Studio accessible at localhost:54323 with all tables visible

---

## Execution Order

```
Phase 1.1  →  supabase init (5 min)
Phase 1.2  →  Build consolidated migration (2-3 hrs — the big one)
Phase 1.3  →  Test with supabase db reset (30 min)
Phase 2    →  Docker + env + scripts (1-2 hrs)
Phase 3    →  Archive old files (30 min)
Phase 4    →  Fresh clone test (30 min)
```

**Total estimate: ~5-6 hours**

---

## Risks

1. **Might miss a table.** Mitigation: grep the codebase for all `supabase.from('table_name')` calls to verify every table the app uses actually exists in the consolidated migration.
2. **Column mismatches.** Some tables exist in multiple systems with different columns. Need to pick the "right" version (usually the most recent one that the frontend actually uses).
3. **Supabase extensions.** `pgvector` needs to be enabled — works on local Supabase CLI but may need manual enable on hosted Supabase.
4. **Seed data conflicts.** Multiple files seed the same brain templates with slightly different configs.
