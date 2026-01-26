# Knowledge System

This directory contains persistent context that the AI agent reads at the start of each session.

---

## Files

| File | Purpose | Priority |
|------|---------|----------|
| `CONTEXT.md` | **PRIME DIRECTIVE** - User identity, rules, stakes, working style | 🔴 Read FIRST |
| `PROJECT_CONTEXT.md` | Architecture, vision, stakeholders, requirements | 🔴 Read SECOND |
| `PROJECT_STATE.md` | Current status, what's done, what's pending | 🟡 Reference |
| `TECH_STACK.md` | Technologies, directories, commands, patterns | 🟡 Reference |
| `DECISIONS_LOG.md` | Key decisions with rationale | 🟢 As needed |

---

## How It Works

1. **Agent reads `CONTEXT.md` FIRST** at session start (contains critical rules and stakes)
2. **Agent reads `PROJECT_CONTEXT.md`** to understand the architecture
3. **Agent checks `PROJECT_STATE.md`** to know what's done and what's pending
4. Other files referenced as needed during work

---

## Rules for the Agent

### NON-NEGOTIABLE

1. **`CONTEXT.md` is law** - The rules there are non-negotiable
2. **NO code changes without explicit permission** - This is the most critical rule
3. **NO assumptions** - Ask if unclear, don't guess
4. **NO band-aids** - Production-grade only, no quick fixes
5. **Update docs** - Keep these files current when milestones are hit

### Documentation Updates

- **DECISIONS_LOG.md** - Add entry for major architectural decisions
- **PROJECT_STATE.md** - Update when features complete or status changes
- **CONTEXT.md** - Update "Current Focus" section when priorities shift

---

## Quick Reference

### The Three Pillars (Core Philosophy)
```
Writer → Executes (generates content from KB rules)
Analytics → Observes (records performance data)
KB → Learns (ONLY place where learning happens)
```

### Current Status Summary
- ✅ Workflow Manager V2 - 36 nodes, complete
- ✅ Backend Services - Engine, AI, Workflow
- ✅ Database - 16 migrations
- 🟡 Workers - Built, need Redis
- 🟡 Learning Loop - Skeleton only
- ❌ Production Deployment - Not started

### Key Paths
```
apps/frontend/src/components/WorkflowManager/  # Workflow builder
apps/backend/src/services/                     # Backend services
apps/workers/src/workers/                      # Worker definitions
database/migrations/                           # SQL migrations
.agent/Plans/Active/                           # Current work items
.agent/Sessions/                               # Handovers
lekhika_4_8lwy03/                              # Reference architecture
```

---

## Updating These Files

- User can edit directly or ask agent to update
- Agent should propose updates at session end if significant changes were made
- Keep files concise but complete
- Use tables and diagrams for clarity
- Include "Last Updated" timestamps

---

*Last Updated: 2026-01-26 19:30 IST*
