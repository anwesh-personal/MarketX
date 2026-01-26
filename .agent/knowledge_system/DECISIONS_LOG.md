# Decisions Log

> Key architectural and design decisions with rationale.

---

## 2026-01-26: Callback Pattern for Node Communication

**Decision**: Replace CustomEvent pattern with callback through props.
**Rationale**: 
- CustomEvent is global, can have collisions
- Harder to test
- Callback through data props is React-idiomatic
**Impact**: V2WorkflowNode.tsx now receives `onConfigure` via data; WorkflowManager passes callback when creating nodes.

---

## 2026-01-26: Shared Types File for WorkflowManager

**Decision**: Create centralized `types.ts` for all WorkflowManager types.
**Rationale**:
- V2NodeData was duplicated in 2 files
- `any` types everywhere hurt maintainability
- Single source of truth prevents drift
**Impact**: Created types.ts (217 lines), all components import from there.

---

## 2026-01-26: Separate Config Component Per Category

**Decision**: One config component per node category (not one per node type).
**Rationale**:
- 36 individual config files would be unmaintainable
- Categories share common patterns (e.g., all generators need AI config)
- Switch statement inside handles node-specific fields
**Impact**: 8 config components handle all 36 node types.

---

## 2026-01-26: No Tailwind in WorkflowManager CSS

**Decision**: Use pure CSS variables, no Tailwind.
**Rationale**:
- Theme system uses CSS variables
- Tailwind utility classes harder to theme-switch
- More control over complex component styling
**Impact**: workflow-manager.css is 5,600+ lines of hand-crafted CSS.

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

*Add new decisions at the top*
