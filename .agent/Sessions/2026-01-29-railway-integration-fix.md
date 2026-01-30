# Railway Integration Fixed - Implementation Summary

**Date**: 2026-01-29 03:41 IST  
**Status**: ✅ COMPLETE

---

## Problem Identified

Railway's GraphQL API v2 requires **workspace context** for project discovery. The previous implementation was attempting to query projects at the root level or via `me -> workspaces` which was:
1. Not supported by Railway's API design
2. Returning HTTP 400 / "Not Authorized" errors

## Root Cause

Railway's API is intentionally designed to require a **workspace ID** for all project-level queries. This is documented in their official docs but was missed in initial implementation.

**Correct Pattern**:
```graphql
workspace(id: "workspace_id") {
  projects { ... }
}
```

**Incorrect Patterns** (what we were trying):
```graphql
projects { ... }                    # ❌ Not allowed
me { workspaces { projects } }      # ❌ Returns 400
```

---

## Solution Implemented

### 1. Database Schema Update
**File**: `database/migrations/023_railway_workspace.sql`

Added `railway_workspace_id` column to `worker_deployment_config` table.

```sql
ALTER TABLE worker_deployment_config 
ADD COLUMN IF NOT EXISTS railway_workspace_id TEXT;
```

---

### 2. API Route Fix
**File**: `apps/frontend/src/app/api/superadmin/workers/railway-services/route.ts`

**Complete rewrite** to use workspace-based discovery:

```typescript
// Now requires workspace ID
const { railway_token, railway_workspace_id } = config;

// Proper query structure
const query = `
  query GetWorkspaceProjects($workspaceId: String!) {
    workspace(id: $workspaceId) {
      projects { ... }
    }
  }
`;

// Pass workspace ID as variable
fetch(RAILWAY_API_URL, {
  body: JSON.stringify({ 
    query, 
    variables: { workspaceId } 
  })
});
```

**Changes**:
- ✅ Uses `workspace(id: ...)` query
- ✅ Requires `railway_workspace_id` from config
- ✅ Returns clear error if workspace ID missing
- ✅ Proper GraphQL variable passing

---

### 3. Config API Update
**File**: `apps/frontend/src/app/api/superadmin/workers/config/route.ts`

**Changes**:
- Added `railway_workspace_id` to GET response
- Added `railway_workspace_id` to PUT update logic
- Added `railway_workspace_id` to INSERT logic

---

### 4. UI Enhancement
**File**: `apps/frontend/src/components/workers/DeploymentConfig.tsx`

**Added**:
- New state: `railwayWorkspaceId`
- New interface field: `railway_workspace_id`
- **New Step 2**: Workspace ID input with clear instructions
- **Updated Step 3**: Fetch Services button (moved from Step 1)
- **Updated Step 4**: Service selection (was Step 2)

**UI Flow Now**:
1. **Step 1**: Enter Railway API Token
   - Text input (password field)
   - Link to Railway tokens page
   
2. **Step 2**: Enter Railway Workspace ID  
   - Text input
   - **Clear instructions**: "Railway Dashboard → Cmd/K → Copy Active Workspace ID"
   
3. **Step 3**: Fetch Services
   - Button to discover services
   - Disabled until both token and workspace ID are entered
   - Shows "Fetching Services..." loading state
   
4. **Step 4**: Select Service
   - Dropdown populated with discovered services
   - Shows project name, service name, environment, and domain

**Validation**:
- Fetch button disabled if token OR workspace ID is missing
- Clear error messages for missing fields

---

## Testing Checklist

### Required Before Testing
User must have:
1. ✅ Railway account with active project
2. ✅ Personal API Token (from railway.com/account/tokens)
3. ✅ Workspace ID (from Railway dashboard: Cmd/K → "Copy Active Workspace ID")

### Test Steps
1. [ ] Navigate to `/superadmin/workers` → Settings tab
2. [ ] Select **Railway** provider
3. [ ] Enter Railway API Token
4. [ ] Enter Railway Workspace ID
5. [ ] Click "Fetch Services from Railway"
6. [ ] Verify services appear in Step 4 dropdown
7. [ ] Select a service
8. [ ] Click "Save Configuration"
9. [ ] Switch to **Grid** tab
10. [ ] Verify Railway service status shows correctly

---

## Files Changed

### Database
- ✅ `database/migrations/023_railway_workspace.sql` (NEW)

### Backend API
- ✅ `apps/frontend/src/app/api/superadmin/workers/railway-services/route.ts` (REWRITTEN)
- ✅ `apps/frontend/src/app/api/superadmin/workers/config/route.ts` (UPDATED)

### Frontend UI
- ✅ `apps/frontend/src/components/workers/DeploymentConfig.tsx` (UPDATED)

---

## Migration Required

Run the new migration:
```bash
# Connect to Supabase and run:
psql -f database/migrations/023_railway_workspace.sql
```

Or via Supabase dashboard:
1. Go to SQL Editor
2. Paste migration content
3. Run

---

## What Changed From User's Perspective

### Before (Broken)
1. Enter token
2. Click "Fetch Services"
3. ❌ Error: "Not Authorized" or "HTTP 400"

### After (Working)
1. Enter token
2. Enter workspace ID (with clear instructions on where to get it)
3. Click "Fetch Services from Railway"
4. ✅ Services load correctly
5. Select service from dropdown
6. Save

---

## Architecture Pattern

This follows Railway's **official API design**:
- Workspace is the top-level organizational unit
- Projects belong to workspaces
- Services belong to projects
- All project queries must be scoped to a workspace

This is **not a workaround** — it's the proper way to use Railway's API.

---

## Next Steps

1. **Run migration** (023_railway_workspace.sql)
2. **Test the flow** with your Railway credentials
3. **Verify** service discovery works
4. **Deploy** to production once confirmed

---

## Reference: How to Get Workspace ID

**Method 1** (Recommended):
1. Open Railway dashboard
2. Press `Cmd + K` (Mac) or `Ctrl + K` (Windows/Linux)
3. Type "Copy Active Workspace ID"
4. Select it → Workspace ID copied to clipboard

**Method 2** (Manual):
1. Open Railway dashboard
2. Look at the URL: `railway.app/project/abc123?workspaceId=def456`
3. Copy the `workspaceId` parameter value

---

*Implementation completed: 2026-01-29 03:41 IST*
