# Knowledge System

This directory contains persistent context that the AI agent reads at the start of each session.

## Files

| File | Purpose | Priority |
|------|---------|----------|
| `CONTEXT.md` | **PRIME DIRECTIVE** - User identity, preferences, rules, stakes | 🔴 Read FIRST |
| `PROJECT_CONTEXT.md` | Stakeholders, client requirements, source documents | 🔴 Read SECOND |
| `PROJECT_STATE.md` | Current project status, what's done, what's pending | 🟡 Reference |
| `DECISIONS_LOG.md` | Key decisions with rationale for reference | 🟡 Reference |
| `TECH_STACK.md` | Technologies used, key file locations | 🟢 As needed |

## How It Works

1. Agent reads `CONTEXT.md` FIRST at session start (contains critical rules)
2. Agent reads `PROJECT_CONTEXT.md` to understand the project
3. Other files referenced as needed during work

## Rules for the Agent

1. **CONTEXT.md is law** - The rules there are non-negotiable
2. **No code changes without explicit permission** - This is repeated because it's critical
3. **Update DECISIONS_LOG.md** for major decisions
4. **Update PROJECT_STATE.md** when milestones are hit

## Updating These Files

- User can edit directly or ask agent to update
- Agent should propose updates at session end if significant changes were made
- Keep files concise and scannable (agent has token limits)
