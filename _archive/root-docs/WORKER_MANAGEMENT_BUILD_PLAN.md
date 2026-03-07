# AXIOM WORKER MANAGEMENT - COMPLETE BUILD PLAN
**Lekhika-Quality Implementation - NO SHORTCUTS**

---

## 🎯 WHAT NEEDS TO BE BUILT

Based on Lekhika's working system, here's what Axiom needs:

### **1. Database Layer (COMPLETED ✅)**
- ✅ Migration 007: Worker tables
- ✅ Migration 009: VPS servers 
- ✅ Migration 010: Worker templates seed

### **2. Backend APIs (PARTIAL - NEEDS COMPLETION)**

#### **Already Created:**
- ✅ `/api/superadmin/vps/workers` - List/control workers
- ✅ `/api/superadmin/vps/workers/logs` - Get logs
- ✅ `/api/superadmin/vps/system` - System info
- ✅ `/api/superadmin/vps/deploy` - Git deploy
- ✅ `/api/superadmin/vps/servers` - VPS CRUD

#### **Still Needed:**
- ❌ Worker template CRUD API
- ❌ Worker deployment creation API  
- ❌ PM2 ecosystem.config.js generator
- ❌ Real-time worker status API
- ❌ Worker duplication API

### **3. Frontend Components (NOT STARTED)**

#### **Main Dashboard:**
- ❌ WorkerControlDashboard.tsx (2000+ lines in Lekhika)
  - Grid view of all workers
  - Real-time status monitoring
  - Control panel (start/stop/restart)
  - Logs viewer
  - Queue statistics

#### **Sub-Components:**
- ❌ WorkerGrid.tsx - Visual grid of workers
- ❌ WorkerCard.tsx - Individual worker card
- ❌ WorkerTemplateManager.tsx - Template CRUD
- ❌ WorkerDeploymentCreator.tsx - Create new deployments
- ❌ VPSTerminal.tsx - SSH terminal emulator
- ❌ LogsViewer.tsx - Real-time log streaming

### **4. Worker Code Generation (NOT STARTED)**
- ❌ Template renderer (Handlebars/EJS)
- ❌ ecosystem.config.js generator
- ❌ File uploader to VPS via SSH
- ❌ PM2 reload trigger

---

## 📋 DETAILED BUILD TASKS

### **PHASE 1: Complete Backend APIs (4-6 hours)**

#### **Task 1.1: Worker Templates API**
```typescript
// /api/superadmin/worker-templates/route.ts
GET    - List all templates
POST   - Create template
PATCH  - Update template
DELETE - Delete template
```

#### **Task 1.2: Worker Deployments API**
```typescript
// /api/superadmin/worker-deployments/route.ts
GET    - List deployments  
POST   - Create deployment (generates code, uploads to VPS, starts PM2)
PATCH  - Update deployment
DELETE - Delete deployment
```

#### **Task 1.3: PM2 Control API** 
```typescript
// /api/superadmin/vps/pm2/route.ts
GET    /list - List all PM2 processes
POST   /start - Start process
POST   /stop - Stop process  
POST   /restart - Restart process
POST   /delete - Delete process
GET    /logs/:name - Get process logs
```

#### **Task 1.4: Real-time Status API**
```typescript
// /api/superadmin/vps/status/route.ts
GET - Get real-time status of all workers
      (health, CPU, memory, uptime, active jobs)
```

---

### **PHASE 2: Frontend Dashboard (8-10 hours)**

#### **Task 2.1: Main Dashboard Layout**
```typescript
// /superadmin/workers/page.tsx (REDESIGN)
- Tab navigation (Grid | Monitoring | Control | Logs)
- Server selector dropdown  
- Auto-refresh toggle
- Emergency controls
```

#### **Task 2.2: Worker Grid View**
```typescript
// components/WorkerGrid.tsx
- Visual grid of all PM2 processes
- Color-coded status (green=healthy, yellow=warn, red=error)
- Quick actions (start/stop/restart)
- Real-time metrics (CPU, RAM, uptime)
```

#### **Task 2.3: Template Manager**
```typescript
// components/WorkerTemplateManager.tsx
- List all templates in cards
- Create new template form
- Duplicate existing template
- Edit template code
- Delete template
- Preview generated code
```

#### **Task 2.4: Deployment Creator** 
```typescript
// components/WorkerDeploymentCreator.tsx
- Select template
- Configure environment variables
- Set PM2 options (memory limit, instances, etc)
- Choose VPS server
- Preview ecosystem.config.js
- Deploy button → Creates files on VPS via SSH
```

#### **Task 2.5: Logs Viewer**
```typescript
// components/LogsViewer.tsx
- Real-time log streaming (EventSource SSE)
- Filter by level (error/warn/info)
- Search logs
- Download logs
- Clear logs
```

#### **Task 2.6: VPS Terminal**
```typescript
// components/VPSTerminal.tsx
- xterm.js based terminal
- SSH connection to VPS
- Execute PM2 commands
- Interactive shell
```

---

### **PHASE 3: Worker Code Management (4-6 hours)**

#### **Task 3.1: Template Renderer**
```typescript
// lib/workers/templateRenderer.ts
- Load template from database
- Inject environment variables
- Generate complete code files
- Validate syntax
```

#### **Task 3.2: Ecosystem Config Generator**
```typescript
// lib/workers/ecosystemGenerator.ts
function generateEcosystemConfig(deployment) {
  return {
    apps: [{
      name: deployment.name,
      script: deployment.entry_file,
      cwd: deployment.path_on_vps,
      env: deployment.environment_vars,
      ...deployment.pm2_config
    }]
  }
}
```

#### **Task 3.3: VPS File Manager**
```typescript
// lib/vps/fileManager.ts
- Upload files via SFTP
- Create directories
- Set permissions
- Write files
```

#### **Task 3.4: Deployment Orchestrator**
```typescript
// lib/workers/deploymentOrchestrator.ts
async function deployWorker(deployment, vpsServer) {
  // 1. Generate code from template
  // 2. Create directory on VPS
  // 3. Upload files via SFTP
  // 4. Generate ecosystem.config.js
  // 5. npm install dependencies
  // 6. pm2 start ecosystem.config.js
  // 7. Update database deployment status
}
```

---

## 🏗️ ARCHITECTURE (Lekhika-Quality)

```
┌─────────────────────────────────────────────────────────────┐
│                    AXIOM FRONTEND                            │
│  ┌────────────────────────────────────────────────────┐     │
│  │ WorkerControlDashboard                             │     │
│  │ ┌──────────┬──────────┬──────────┬──────────┐     │     │
│  │ │  Grid    │ Monitor  │ Control  │  Logs    │     │     │
│  │ └──────────┴──────────┴──────────┴──────────┘     │     │
│  │                                                      │     │
│  │ ┌────────────────────────────────────────────┐     │     │
│  │ │ VPS Server: [Dropdown Selector]           │     │     │
│  │ └────────────────────────────────────────────┘     │     │
│  │                                                      │     │
│  │ [Worker Grid - Real-time Status Cards]             │     │
│  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                  │     │
│  │ │ ✅ W1│ │ ✅ W2│ │ ⚠️ W3│ │ ❌ W4│                │     │
│  │ └─────┘ └─────┘ └─────┘ └─────┘                  │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────┬──────────────────────────────────────┘
                       │ API Calls
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   NEXT.JS API ROUTES                         │
│  /api/superadmin/vps/workers                                │
│  /api/superadmin/vps/pm2                                    │
│  /api/superadmin/worker-templates                           │
│  /api/superadmin/worker-deployments                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ SSH/SFTP
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          VPS SERVER (103.190.93.28)                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │ PM2 Daemon                                          │     │
│  │ ┌──────────────────────────────────────────────┐   │     │
│  │ │ bootstrap-server (Always Running)            │   │     │
│  │ │ Port: 3000 | Health: ✅ | Uptime: 45 days   │   │     │
│  │ └──────────────────────────────────────────────┘   │     │
│  │                                                      │     │
│  │ ┌──────────────────────────────────────────────┐   │     │
│  │ │ standard-worker-1                            │   │     │
│  │ │ Port: 3001 | Health: ✅ | Jobs: 3/10        │   │     │
│  │ └──────────────────────────────────────────────┘   │     │
│  │                                                      │     │
│  │ ┌──────────────────────────────────────────────┐   │     │
│  │ │ lean-worker-1                                │   │     │
│  │ │ Port: 3002 | Health: ✅ | Jobs: 1/3         │   │     │
│  │ └──────────────────────────────────────────────┘   │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  /home/worker/vps-worker/                                   │
│  ├── ecosystem.config.js  (Generated dynamically)          │
│  ├── server.js                                               │
│  ├── leanServer.js                                          │
│  ├── bootstrap-server.js                                   │
│  └── node_modules/                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ WORKFLOW EXAMPLES

### **Create New Worker from Template:**

1. **User clicks "New Worker" in UI**
2. **Select template** - "Standard Worker"
3. **Configure:**
   - Name: `my-custom-worker`
   - Port: `3005`
   - Memory: `2G`
   - Env vars: `{API_KEY: "xyz"}`
4. **Preview generated code**
5. **Click "Deploy"**
6. **Backend orchestrates:**
   ```
   1. Render template with config
   2. SSH to VPS
   3. Create /home/worker/my-custom-worker/
   4. Upload server.js
   5. Generate ecosystem.config.js
   6. npm install
   7. pm2 start ecosystem.config.js
   8. Insert into worker_deployments table
   9. Return success
   ```
7. **UI updates** - New worker appears in grid

### **Duplicate Existing Worker:**

1. **Click "Duplicate" on existing worker card**
2. **Pre-filled form** with current config
3. **Change name** - `standard-worker-2`
4. **Change port** - `3006`
5. **Deploy** - Same orchestration as above

---

## 🚀 ESTIMATED TIMELINE

**Total: 16-22 hours (2-3 days full-time)**

- Phase 1 (APIs): 4-6 hours
- Phase 2 (UI): 8-10 hours
- Phase 3 (Code Gen): 4-6 hours

---

## ✅ QUALITY CHECKLIST

### **Lekhika Standards:**
- ✅ All errors handled gracefully
- ✅ Loading states everywhere
- ✅ Optimistic UI updates
- ✅ Real-time monitoring (no polling spam)
- ✅ Responsive design
- ✅ Theme-aware styling
- ✅ TypeScript strict mode
- ✅ No hardcoded values
- ✅ Database-driven config
- ✅ SSH/SFTP secure
- ✅ Validation on all inputs
- ✅ Confirmations for destructive actions
- ✅ Audit logging
- ✅ Rollback capability

---

## 📝 NEXT IMMEDIATE ACTIONS

**Priority Order:**

1. **Complete Worker Templates API** (2h)
2. **Complete Worker Deployments API** (3h)
3. **Build WorkerGrid Component** (3h)
4. **Build Template Manager** (2h)
5. **Build Deployment Creator** (3h)
6. **Test end-to-end** (2h)
7. **Polish & Deploy** (1h)

---

**This is the complete blueprint. Should I start building Phase 1 APIs first? 🎯**
