# Honest Status & Build Plan — 10 March 2026

## What ACTUALLY works end-to-end

| Feature | Status |
|---------|--------|
| User Dashboard | WORKS (real data from Supabase) |
| KB Manager | WORKS (CRUD) |
| Brain Chat | WORKS but brain selector empty (templates API key mismatch) |
| Superadmin Deploy Agent | WORKS (creates brain_agents per org) |
| Superadmin Brains CRUD | WORKS |
| Mastery Agents | WORKS (CRUD + test) |

## What's BROKEN or STUB

| Feature | Problem |
|---------|---------|
| Brain Chat templates | API returns `templates`, UI expects `brains` → selector empty |
| Brain Control | ALL hardcoded/stub stats; embeddings API `partner_id` vs `org_id`; agent API wrong table |
| Writer | Runs created but never processed (no worker picks up) |
| Chat page | Calls superadmin API → users get 401 |
| Portal | Depends on RS:OS tables not in current schema |
| Settings | Profile works, notifications UI-only |
| Analytics | success_rate_trend hardcoded |

## What's MISSING (zero UI)

| Feature | DB tables exist? | UI? |
|---------|-------------------|-----|
| Brain Memories | brain_memories ✅ | NO UI |
| Brain Reflections | brain_reflections ✅ | NO UI |
| Knowledge Gaps | knowledge_gaps ✅ | NO UI |
| Dream Logs | brain_dream_logs ✅ | NO UI |
| Learning Loop page | — | 404 (nav link, no page) |
| Push-to-Brain API | — | 404 |

## Build Plan (priority order)

| # | Task | Impact |
|---|------|--------|
| 1 | Fix brain-chat templates API key (`templates` → `brains`) | Brain selector works |
| 2 | Fix brain-control: embeddings partner_id→org_id, agents→brain_agents | Brain control page usable |
| 3 | Build /learning page (memories, reflections, gaps, dream logs) | Client sees brain intelligence |
| 4 | Fix brain-control overview (real stats from DB) | No more placeholder |
| 5 | Fix chat page (use brain-chat API, not superadmin) | Remove 401 for users |
| 6 | Add push-to-brain API route | Brain chat push feature works |
