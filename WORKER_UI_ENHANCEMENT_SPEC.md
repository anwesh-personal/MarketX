# Worker Management UI - Enhancement Guide
**Date:** 2026-01-16 02:30 IST  
**File:** `apps/frontend/src/app/superadmin/workers/page.tsx`

---

## ✅ COMPLETED

### **API Routes Created:**
1. `/api/superadmin/workers/templates` - CRUD for templates
2. `/api/superadmin/workers/deployments` - CRUD for deployments

---

## 🎨 UI ENHANCEMENT SPECIFICATION

### **Current State:**
- Basic worker monitoring (heartbeat, stats, job counts)
- Single view showing active workers

### **Enhancement Needed:**

Add **3 tabs** to existing page:

#### **Tab 1: Deployments** (keep existing + enhance)
- Keep current worker grid
- Add deployment controls:
  - Start/Stop buttons (functional)
  - Edit deployment config  
  - Delete deployment (with confirmation)
- Add "Deploy New Worker" button → Opens modal

#### **Tab 2: Templates** (NEW)
```tsx
// Template grid view
- Card for each template
- Shows: name, type, description
- Badge for template type (brain/queue/api/custom)
- Buttons: Edit Code, Deploy, Delete
- "+ Create Template" button → Opens editor modal
```

#### **Tab 3: Logs** (keep existing + enhance)
- Keep current logs view
- Add deployment filter dropdown
- Add log level filter (info, warn, error)
- Add real-time streaming toggle

---

## 🔧 MODALS TO ADD

### **1. Template Editor Modal**
```tsx
<TemplateEditorModal>
  - Code editor (Monaco/CodeMirror)
  - Syntax highlighting for TypeScript
  - Config schema editor (JSON)
  - Env vars editor (key-value pairs)
  - Dependencies editor (package.json format)
  - Save/Cancel buttons
</TemplateEditorModal>
```

### **2. Deployment Wizard Modal**
```tsx
<DeploymentWizardModal>
  Step 1: Select Template (dropdown)
  Step 2: Server Details
    - Name
    - Server IP
    - Port
    - SSH User (optional)
    - SSH Key (optional, encrypted)
  Step 3: Configuration
    - Environment variables (from template schema)
    - Worker config (concurrency, memory limit)
  Step 4: Review & Deploy
    - Show summary
    - "Deploy" button
</DeploymentWizardModal>
```

### **3. Deployment Edit Modal**
```tsx
<DeploymentEditModal>
  - Edit env config
  - Edit worker config (concurrency, memory)
  - Toggle auto-restart
  - Save changes
</DeploymentEditModal>
```

---

## 📋 CODE CHANGES NEEDED

### **1. Add State**
```typescript
const [selectedTab, setSelectedTab] = useState<'deployments' | 'templates' | 'logs'>('deployments')
const [templates, setTemplates] = useState<WorkerTemplate[]>([])
const [deployments, setDeployments] = useState<WorkerDeployment[]>([])
const [showTemplateEditor, setShowTemplateEditor] = useState(false)
const [showDeploymentWizard, setShowDeploymentWizard] = useState(false)
const [editingTemplate, setEditingTemplate] = useState<WorkerTemplate | null>(null)
```

### **2. Add Data Loading**
```typescript
async function loadTemplates() {
  const res = await fetch('/api/superadmin/workers/templates')
  const data = await res.json()
  setTemplates(data.templates || [])
}

async function loadDeployments() {
  const res = await fetch('/api/superadmin/workers/deployments')
  const data = await res.json()
  setDeployments(data.deployments || [])
}
```

### **3. Add Tab Navigation**
```tsx
<div className="border-b border-border">
  <div className="flex gap-1">
    {['deployments', 'templates', 'logs'].map(tab => (
      <button
        key={tab}
        onClick={() => setSelectedTab(tab)}
        className={tab === selectedTab ? 'active' : ''}
      >
        {tab}
      </button>
    ))}
  </div>
</div>
```

### **4. Add Templates Grid (in Tab 2)**
```tsx
{selectedTab === 'templates' && (
  <div className="grid grid-cols-2 gap-4">
    {templates.map(template => (
      <TemplateCard
        key={template.id}
        template={template}
        onEdit={() => {
          setEditingTemplate(template)
          setShowTemplateEditor(true)
        }}
        onDeploy={() => {
          setSelectedTemplate(template)
          setShowDeploymentWizard(true)
        }}
        onDelete={() => handleDeleteTemplate(template.id)}
      />
    ))}
  </div>
)}
```

---

## 🎯 IMPLEMENTATION PRIORITY

**Phase 1** (30 min):
- [x] Create API routes ✅
- [ ] Add tabs to existing page
- [ ] Load templates/deployments data
- [ ] Display in grid

**Phase 2** (1 hour):
- [ ] Template editor modal
- [ ] Basic code editing
- [ ] Save functionality

**Phase 3** (1 hour):
- [ ] Deployment wizard
- [ ] Multi-step form
- [ ] Validation & deploy

**Phase 4** (30 min):
- [ ] Deployment controls (start/stop)
- [ ] Edit deployment modal
- [ ] Delete confirmations

---

## 💡 QUICK WIN

**Minimal Enhancement** (15 min):
1. Add templates tab
2. Fetch & display templates
3. Show template cards
4. "Deploy" button → alert("Coming soon")

This gives visual feedback that template system exists, even if deployment isn't automated yet.

---

## 📝 CURRENT STATUS

**API:** ✅ Complete  
**UI Tabs:** ❌ Need to add  
**Modals:** ❌ Need to create  
**Deploy Logic:** ❌ Manual for now

**Files Ready:**
- `api/superadmin/workers/templates/route.ts` ✅
- `api/superadmin/workers/deployments/route.ts` ✅  
- Migration 007 ready to run ✅

**Next:** Add tabs & template grid to UI (30 min implementation)

---

**Ready for final push?**
