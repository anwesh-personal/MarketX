# WORKFLOW BUILDER OVERHAUL - MASTER PLAN

> **Status**: 🟡 ACTIVE
> **Created**: 2026-01-26
> **Priority**: 🔴 CRITICAL
> **Estimated Duration**: 4-5 weeks (sequential) / 2-3 weeks (parallel)

---

## Overview

Complete overhaul of the Workflow Builder to align with V1 client requirements.

### The Problem
Current workflow builder has generic placeholder nodes that don't match the actual content generation requirements (Websites, Email Flows, Email Replies, Social Posts).

### The Solution
Redesign node palette, integrate KB resolution logic, and connect generators to the `writer.engine.ts` intelligence layer.

---

## Phase Summary

| Phase | Name | Duration | Dependencies |
|-------|------|----------|--------------|
| 1 | Node Redesign | 3-4 days | None |
| 2 | KB Integration | 4-5 days | Phase 1 |
| 3 | Generator Nodes | 5-7 days | Phase 2 |
| 4 | Workflow Templates | 2-3 days | Phase 3 |
| 5 | Engine Deployment | 2-3 days | Phase 4 |

---

## Individual Phase Plans

See separate files:
- `PHASE_1_NODE_REDESIGN.md`
- `PHASE_2_KB_INTEGRATION.md`
- `PHASE_3_GENERATOR_NODES.md`
- `PHASE_4_WORKFLOW_TEMPLATES.md`
- `PHASE_5_ENGINE_DEPLOYMENT.md`

---

## Success Criteria

### V1 Must Work:
1. ✅ Create workflow template with proper nodes
2. ✅ Deploy as engine to organization
3. ✅ Execute with real input data
4. ✅ Generate Website Bundle with proper KB-driven content
5. ✅ Generate Email Flow Bundle with sequences
6. ✅ Generate Email Reply with scenario matching
7. ✅ Generate Social Posts by platform
8. ✅ Validate against Constitution
9. ✅ Log execution for analytics
10. ✅ Return output via webhook or store in DB

### Quality Gates:
- All node types have defined input/output schemas
- All generators use `writer.engine.ts` logic (not generic LLM calls)
- All outputs match client's expected schemas (from `03-writer-output.docx`)
- All KB queries use proper resolution functions
- All executions are logged to `engine_run_logs`

---

## Dependencies & Blockers

### External Dependencies:
- None (all code changes)

### Internal Dependencies:
| Phase | Depends On |
|-------|------------|
| Phase 2 | Phase 1 (node schemas) |
| Phase 3 | Phase 2 (KB resolution working) |
| Phase 4 | Phase 3 (generators working) |
| Phase 5 | Phase 4 (templates working) |

### Potential Blockers:
1. **KB Schema Completeness** - Need Angles, CTAs, Blueprints in DB
2. **Database Migrations** - May need new tables/columns
3. **Frontend Node Rendering** - New node types need UI components

---

## Notes

- Do NOT change code without explicit permission
- All phases require approval before execution
- Each phase has its own detailed plan with specific file changes
