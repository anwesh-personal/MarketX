# Decisions Log

> Key architectural and design decisions with rationale.

---

## 2026-01-25: Input Variable Consolidation
**Decision**: All user-facing inputs moved to Input Node only.
**Rationale**: End users only interact with Input forms. Process nodes should be invisible.
**Impact**: axiomVariables.ts rewritten, workflowExecutionService updated.

---

## 2026-01-25: Dynamic Writer Personas
**Decision**: Writer style selected at runtime via dropdown, not hardcoded in Process nodes.
**Rationale**: Flexibility for sales team + ability to A/B test styles.
**Impact**: 10 personas added to backend, systemPrompt dynamically selected.

---

## 2026-01-XX: [Template]
**Decision**: 
**Rationale**: 
**Impact**: 

---

*Add new decisions at the top*
