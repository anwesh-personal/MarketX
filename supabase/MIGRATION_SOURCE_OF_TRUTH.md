# Migration Governance (LOCKED)

## Source Model (Max 2, No Conflict)

### Source A — Active (Execution Source)
- `supabase/migrations`
- This is the only folder allowed for `supabase db push` / production rollout.

### Source B — Frozen Legacy Reference
- `database/migrations`
- `apps/frontend/supabase/migrations`
- This is a single logical source category: historical reference only, never executable.

There is only **one executable source** (Source A). Source B exists only for recovery/traceability.

## Non-Negotiable Rules

1. Never run migrations from Source B.
2. Every new schema change must be authored in Source A.
3. If Source B has useful SQL, re-author it into Source A with a new canonical migration file.
4. No duplicate topic ownership across executable sources (there is only one executable source by design).
5. If any contradiction exists, Source A always wins.

## Conflict Resolution Map (2026-03-10)

These topic overlaps were detected and resolved in favor of Source A:

| Topic | Canonical Owner | Legacy Duplicate | Resolution |
|---|---|---|---|
| `brain_system` | `supabase/migrations/00000000000003_brain_system.sql` | `database/migrations/001_brain_system.sql` | Canonical owner locked to Source A |
| `agent_system` | `supabase/migrations/00000000000005_agent_system.sql` | `database/migrations/004_agent_system.sql` | Canonical owner locked to Source A |
| `worker_system` | `supabase/migrations/00000000000006_worker_system.sql` | `database/migrations/005_worker_system.sql` | Canonical owner locked to Source A |
| `brain_missing_tables` | Source A future patch only | `database/migrations/011_brain_missing_tables.sql`, `apps/frontend/supabase/migrations/20260124000003_brain_missing_tables.sql` | Do not execute legacy; port intentionally if needed |
| `agent_specific_memory` | Source A future patch only | `database/migrations/012_agent_specific_memory.sql`, `apps/frontend/supabase/migrations/20260124000004_agent_specific_memory.sql` | Do not execute legacy; port intentionally if needed |

## Execution Checklist (Before Any Push)

1. Confirm CLI is linked to intended project (`supabase link`).
2. Backup remote DB (`supabase db dump --linked`).
3. Confirm pending files are only in `supabase/migrations`.
4. Apply with `supabase db push --linked`.
5. Record applied versions and post-check results in session log.
