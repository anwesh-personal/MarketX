# Phase 2: Engine Section UI

> **Status**: ✅ COMPLETED
> **Focus**: Engine Management & Observability
> **Date**: 2026-01-28

---

## Objective
Create a comprehensive UI for managing Workflow Engines, including detailed views, execution history, and API key management. Move away from a single monolithic `page.tsx`.

---

## Current State
- `apps/frontend/src/app/superadmin/engines/page.tsx` is Refactored and lean.
- Components extracted to `src/components/engines/`.
- Dedicated Engine Details page created at `/superadmin/engines/[id]`.
- Execution History and API Key Management implemented.

---

## Target State

### 1. Refactored Component Architecture
```
src/components/engines/
├── EngineCard.tsx          # Card view for listing
├── CloneEngineModal.tsx    # Create/Clone logic
├── ExecutionModal.tsx      # Real-time execution runner
├── ExecutionHistory.tsx    # List of past runs
└── ApiKeyManager.tsx       # Manage engine keys
```

### 2. New Routes
- `/superadmin/engines` - List view (leaner)
- `/superadmin/engines/[id]` - Details view
  - Tabs: Overview, Execution History, Access Keys, Configuration

---

## Tasks

### Task 2.1: Component Extraction
- [x] Create `src/components/engines` directory
- [x] Extract `EngineCard`
- [x] Extract `CloneModal` (rename `CloneEngineModal`)
- [x] Extract `ExecutionModal`

### Task 2.2: Engine Details Page
- [x] Create `app/superadmin/engines/[id]/page.tsx`
- [x] Implement header with status/actions
- [x] Implement tabs layout

### Task 2.3: Execution History
- [x] Create `ExecutionHistory` component
- [x] Create API route `/api/superadmin/engines/[id]/runs`
- [x] Show list of runs with status/duration/cost
- [x] Click run to view details (inputs/outputs)

### Task 2.4: API Key Management
- [x] Create `ApiKeyManager` component
- [x] Create Migration `021_engine_access_keys.sql`
- [x] Create API route `/api/superadmin/engines/[id]/keys`
- [x] List keys, Create key, Revoke key

---

## Notes
- **Migration Required**: Run `supabase migration up` or execute `database/migrations/021_engine_access_keys.sql` to enable API Key features.
- **Dependency Added**: Added `sonner` for toast notifications.
- **Types**: Shared types located in `src/types/engine.ts`.
