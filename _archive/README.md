# ⚠️ ARCHIVED MIGRATION SYSTEMS

**These files are archived and NO LONGER ACTIVE.**

The canonical migration system is now: `supabase/migrations/`

## What's here

| Directory | Source | Format |
|---|---|---|
| `migrations-system-a/` | `apps/backend/migrations/*.ts` | TypeScript (node-pg-migrate) |
| `migrations-system-b/` | `database/migrations/*.sql` | Raw SQL |
| `migrations-system-c/` | `apps/frontend/supabase/migrations/*.sql` | Raw SQL |
| `loose-sql/` | `database/*.sql` (init.sql, add-auth.sql, etc.) | Raw SQL |
| `scripts/` | `deploy-migrations.sh`, `run-migration.js` | Bash/JS |

## Why archived

These 3 systems evolved independently and had:
- Conflicting table definitions
- Functions in the restricted `auth` schema
- FK constraints to `auth.users` that break without Supabase Auth
- Duplicate seed data
- No clear execution order

All content has been consolidated into 10 ordered migration files in `supabase/migrations/`.

## Date archived

2026-02-11
