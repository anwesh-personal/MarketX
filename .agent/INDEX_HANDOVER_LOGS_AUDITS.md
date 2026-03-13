# Where everything is — Handover, session logs, audits

**Use this file to find handovers, session logs, and audits.**

---

## Handover (current)

| File | What |
|------|------|
| **`.agent/HANDOVER_2026-03-10.md`** | **Main handover** — plan, current state, migrations, what’s done, what’s left, file map, env, troubleshooting. Start here. |

Older handovers (archived):
- `.agent/_archive/old-sessions/HANDOVER-2026-01-26.md`
- `.agent/_archive/old-sessions/HANDOVER-2026-01-15.md`
- `.agent/_archive/HANDOVER_2026-01-15_FINAL.md`
- `_archive/HANDOVER_2026-01-15.md`

---

## Session logs

| File | What |
|------|------|
| **`.agent/knowledge_system/SESSION_LOG_2026-03-10.md`** | Recent session log (knowledge system / context). |

Older session logs:
- `_archive/session-logs/session_logs/SESSION_LOG_2026-01-24_WORKER_RESTORATION.md`
- `_archive/SESSION_LOG_DAY_3_AI_PROVIDERS.md`, `SESSION_LOG_DAY_2_REFACTORING.md`
- `_archive/SESSION_LOG_2026-01-16.md`, `SESSION_COMPLETE_2026-01-16.md`, etc.
- `.agent/_archive/old-sessions/` — 2026-01-24 to 2026-01-29 session notes

---

## Audits

| File | What |
|------|------|
| **`.agent/audit/launch_audit.md`** | Launch audit (API/auth, warnings). |
| **`.agent/Plans/Master/02_CURRENT_STATE_AUDIT.md`** | **Canonical current-state audit** — what exists, what’s plan-only, what’s broken. |
| **`.agent/Plans/Active/ORAYA_BRAIN_AUDIT.md`** | Oraya vs MarketX Brain — what Oraya has that our Brain doesn’t (agentic loop, tools, memory, etc.). |

Other audits:
- `.agent/_archive/old-audit/` — workflow-manager-audit, node-production-audit, worker-management-system-audit, etc.
- `.agent/_archive/AXIOM_BRAIN_AUDIT_2026-01-15.md`
- `.agent/knowledge_system/NODE_EXECUTION_AUDIT.md`
- `_archive/old-plans/Plans/Active/BRAIN_AUDIT_COMPREHENSIVE_REPORT.md`

---

## Other useful .agent files

| File | What |
|------|------|
| `.agent/WHERE_BELIEF_AND_MAIL_LIVE.md` | Where belief/RS:OS and mail (MailWizz, SES) live; nav fix done. |
| `.agent/FLOWS_SUPERADMIN_AND_USER.md` | Superadmin vs user flow, auth, APIs. |
| `.agent/Plans/Master/00_INDEX.md` | Master plan index — vision, build sequence, execution backlog. |
| `.agent/Plans/Master/13_EXECUTION_BACKLOG.md` | Live execution tracker. |

---

## What do we do next? (Brain + feature clarity)

1. **Feature checklist vs codebase**  
   - Pull “what you wanted” from: `01_VISION_AND_ARCHITECTURE.md`, `05_MARKET_WRITER_ENGINE.md`, `06_MARKET_BUILDER_ENGINE.md`, `07_MARKET_SURFACE_ENGINE.md`, `09_BRAIN_ARCHITECTURE.md`.  
   - Cross-check with **`02_CURRENT_STATE_AUDIT.md`** (what exists / plan-only / broken).  
   - I can turn that into a **one-page “wanted vs have” checklist** so you know exactly what’s in and what’s not.

2. **Brain “doesn’t work properly”**  
   - **`ORAYA_BRAIN_AUDIT.md`** already lists gaps: one-shot (no real agentic loop), hardcoded tools/OpenAI, no knowledge-gap/self-reflection/dream-state, no resonance, etc.  
   - Next step: decide priority (e.g. agentic loop first, or tool registry from DB, or RAG fix). Then we tackle one slice at a time (e.g. “Brain: agentic loop + tool calls” as first milestone).

3. **Single “where we are” doc**  
   - I can add to **HANDOVER_2026-03-10.md** (or a short **STATUS.md**) a section: “Feature wanted vs implemented” + “Brain gaps (from Oraya audit)” + “Next 3 things to fix.” So you have one place to look.

If you want, next I’ll: (a) create the one-page “wanted vs have” checklist, and (b) add the “Brain gaps + next 3 things” section to the handover.
