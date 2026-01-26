# WORKFLOW MANAGER - ACTION ITEMS

> Prioritized list of improvements needed for production readiness

---

## 🔴 CRITICAL (Block Production)

### 1. Wire Execute to Backend Service
**Effort**: 4-6 hours  
**Files**: 
- `apps/frontend/src/app/api/superadmin/workflows/[id]/execute/route.ts`
- `apps/backend/src/services/workflow/workflowExecutionService.ts`

**Task**:
```
1. Create internal API endpoint on backend that exposes workflowExecutionService
2. Call backend API from frontend execute route
3. Return real execution results with node outputs
4. Handle progress streaming (SSE or polling)
```

### 2. Remove Console.log Statements
**Effort**: 30 minutes  
**Files**:
- `apps/frontend/src/components/WorkflowBuilder/AxiomNodes.tsx` (lines 236, 247)
- `apps/frontend/src/components/WorkflowBuilder/WorkflowBuilder.tsx` (lines 186, 262, 263, 267, 285)

**Task**: Delete all console.log statements, replace with proper logging if needed.

### 3. Add Input Validation
**Effort**: 2-3 hours  
**Files**:
- `apps/frontend/src/app/api/superadmin/workflows/route.ts`
- `apps/frontend/src/app/api/superadmin/workflows/[id]/execute/route.ts`

**Task**:
```typescript
import { z } from 'zod';

const WorkflowSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    status: z.enum(['draft', 'active', 'disabled']),
    nodes: z.array(z.object({
        id: z.string(),
        type: z.string(),
        position: z.object({ x: z.number(), y: z.number() }),
        data: z.record(z.any()),
    })),
    edges: z.array(z.object({
        id: z.string(),
        source: z.string(),
        target: z.string(),
    })),
});
```

### 4. Add Error Boundaries
**Effort**: 1-2 hours  
**Files**: `apps/frontend/src/components/WorkflowManager/WorkflowManager.tsx`

**Task**:
```tsx
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary 
    FallbackComponent={WorkflowErrorFallback}
    onReset={() => window.location.reload()}
>
    <ReactFlow ... />
</ErrorBoundary>
```

---

## 🟡 HIGH (Before MVP)

### 5. Add Execution Logs Viewer
**Effort**: 6-8 hours  
**New Files**:
- `apps/frontend/src/components/WorkflowManager/ExecutionLogsPanel.tsx`
- `apps/frontend/src/app/api/superadmin/workflows/[id]/executions/route.ts`

**Task**:
- Panel showing past executions
- Click to view execution details
- Show node outputs, token usage, timing
- Filter by status, date

### 6. Improve Node Configuration Modal
**Effort**: 8-12 hours  
**Files**: `apps/frontend/src/components/WorkflowManager/NodeConfigModal.tsx` (new)

**Task**:
- Extract from WorkflowManager.tsx
- Create form schema per node type
- Add AI model selector (port from V1 AIProviderSelector)
- Add variable picker
- Add validation

### 7. Replace alert() with Toast
**Effort**: 30 minutes  
**Files**: `apps/frontend/src/components/WorkflowManager/WorkflowManager.tsx`

**Task**:
```tsx
import toast from 'react-hot-toast';

// Replace:
alert('Workflow execution started!');
// With:
toast.success('Workflow execution started!');
```

### 8. Add Workflow Validation
**Effort**: 2-3 hours  
**Files**: `apps/frontend/src/components/WorkflowManager/workflowValidator.ts` (new)

**Task**:
```typescript
function validateWorkflow(nodes: Node[], edges: Edge[]): {
    valid: boolean;
    errors: string[];
} {
    // - Has at least one trigger
    // - All nodes connected
    // - No orphan edges
    // - All required configs filled
}
```

---

## 🟢 MEDIUM (Post-MVP)

### 9. Add Caching with SWR
**Effort**: 2-3 hours  
**Files**: `apps/frontend/src/components/WorkflowManager/WorkflowManager.tsx`

**Task**:
```tsx
import useSWR from 'swr';

const { data: workflows, mutate } = useSWR(
    '/api/superadmin/workflows',
    (url) => superadminFetch(url).then(r => r.json())
);
```

### 10. Split CSS File
**Effort**: 1-2 hours  
**Files**: `apps/frontend/src/components/WorkflowManager/workflow-manager.css`

**Task**: Split 1549 lines into:
- `workflow-manager-base.css` (layout, toolbar)
- `workflow-manager-nodes.css` (V2 nodes)
- `workflow-manager-modals.css` (add node, config)
- `workflow-manager-panels.css` (flows panel)

### 11. Add Undo/Redo
**Effort**: 4-6 hours  
**Files**: `apps/frontend/src/components/WorkflowManager/useUndoRedo.ts` (new)

**Task**:
- Track state history
- Limit to 50 states
- Ctrl+Z/Ctrl+Y keybindings

### 12. Deprecate V1 WorkflowBuilder
**Effort**: 2-4 hours  
**Files**: `apps/frontend/src/components/WorkflowBuilder/`

**Task**:
- Add deprecation notice
- Migrate unique features to V2:
  - NodeConfigurationModal (921 lines) - forms per node type
  - AIProviderSelector - model selection
- Eventually delete V1

---

## 🔵 LOW (Nice to Have)

### 13. Copy/Paste Nodes
### 14. Keyboard Shortcuts Help Modal
### 15. Search in Canvas
### 16. Comments/Annotations
### 17. Template Versioning
### 18. Import/Export JSON
### 19. Mobile Responsive
### 20. Accessibility (ARIA)
### 21. Unit Tests 
### 22. Integration Tests

---

## QUICK WINS (< 1 hour each)

| # | Task | Time |
|---|------|------|
| 1 | Remove console.logs | 30 min |
| 2 | Replace alert with toast | 30 min |
| 3 | Add loading spinner to delete | 20 min |
| 4 | Fix any TypeScript 'any' types | 45 min |
| 5 | Add aria-labels to buttons | 30 min |

---

## COMPLETION TRACKING

**Updated: 2026-01-26**

```
[x] Critical #1 - Wire Execute (DONE - backend endpoint + frontend proxy)
[x] Critical #2 - Remove console.logs (DONE - V1 deleted entirely)
[x] Critical #3 - Input validation (DONE - Zod schemas for POST/PATCH)
[x] Critical #4 - Error boundaries (DONE - react-error-boundary wrapper)
[ ] High #5 - Execution logs viewer
[ ] High #6 - Node config forms
[x] High #7 - Toast notifications (DONE - replaced all alerts)
[ ] High #8 - Workflow validation
[ ] Medium #9 - SWR caching
[ ] Medium #10 - Split CSS
[ ] Medium #11 - Undo/redo
[x] Medium #12 - Deprecate V1 (DONE - V1 deleted, 5937 lines removed)
```

**Progress: 6/12 completed (ALL CRITICAL ITEMS DONE)**

---

**Owner**: Engineering Team  
**Target**: Complete Critical + High before production release
