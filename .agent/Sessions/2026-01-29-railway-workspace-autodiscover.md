# Railway Workspace Auto-Discover Feature

**Date**: 2026-01-29 04:03 IST  
**Status**: ✅ COMPLETE

---

## Problem Solved

**User Complaint**: "Where the fuck do I find workspace ID? Why can't entering the API token fetch the workspace too?"

**Answer**: You're right. It can and it should.

---

## Solution: Auto-Discovery Flow

### New User Flow

```
Step 1: Enter Railway API Token
    ↓
Step 2: Click "Fetch Workspaces from Railway"
    → Automatically discovers all workspaces (Personal + Teams)
    → Auto-selects if only 1 workspace found
    ↓
Step 3: Select Workspace (if multiple)
    → Dropdown with friendly names like:
      - "Personal (your@email.com)"
      - "Team: Company Name"
    ↓
Step 4: Click "Fetch Services from Workspace"
    → Discovers all services in selected workspace
    ↓
Step 5: Select Worker Service
    → Dropdown shows project/service/environment/domain
```

### What Changed

**Before** (Manual Entry):
1. Enter token
2. Manually find and enter workspace ID from Railway dashboard (Cmd/K)
3. Fetch services
4. Select service

**After** (Auto-Discovery):
1. Enter token
2. Click "Fetch Workspaces" → **Automatic**
3. Select workspace from dropdown (or auto-selected)
4. Click "Fetch Services"
5. Select service

---

## Implementation

### 1. New API Endpoint
**File**: `apps/frontend/src/app/api/superadmin/workers/railway-workspaces/route.ts`

**Purpose**: Fetches user's workspaces using their Personal API Token

**GraphQL Query**:
```graphql
query {
  me {
    id
    email
    name
    teams {
      id
      name
    }
  }
}
```

**Response**:
```typescript
{
  success: true,
  workspaces: [
    { id: "user-id", name: "Personal (user@example.com)" },
    { id: "team-1-id", name: "Team: Acme Corp" },
    { id: "team-2-id", name: "Team: Side Project" }
  ],
  workspaceCount: 3
}
```

---

### 2. UI Updates

**Added**:
- `railwayWorkspaces` state - stores fetched workspaces
- `fetchingWorkspaces` state - loading indicator
- `fetchRailwayWorkspaces()` function - calls new API endpoint
- Workspace dropdown (Step 3) - shows when workspaces exist
- Auto-select logic - if only 1 workspace, select it automatically

**Changed**:
- Step numbers updated (2→3, 3→4, 4→5)
- Workspace input changed from manual text input to auto-fetched dropdown
- Services fetch now conditional on workspace selection

**Smart Features**:
- If user has only 1 workspace → auto-select it and show success toast
- If user has multiple → show dropdown to pick one
- Changing workspace clears services list (prevents stale data)
- All steps are progressive disclosure (only show next step when previous is complete)

---

## Files Modified

### New Files
- ✅ `apps/frontend/src/app/api/superadmin/workers/railway-workspaces/route.ts` (NEW)

### Updated Files
- ✅ `apps/frontend/src/components/workers/DeploymentConfig.tsx`

---

## Testing Checklist

### Single Workspace User
1. [ ] Enter Railway API Token
2. [ ] Click "Fetch Workspaces from Railway"
<truncated 1259 bytes>
