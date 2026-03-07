# 🔧 LEKHIKA + AXIOM INTEGRATION ARCHITECTURE

## Overview

We're merging **two production-ready systems** into a single **uber-SaaS platform**:

### **Lekhika (Existing)**
- ✅ React Flow workflow builder
- ✅ Multi-worker orchestration (PM2 + BullMQ + Redis)
- ✅ Multi-AI provider integration (10+ providers)
- ✅ Superadmin dashboard
- ✅ Deployment automation
- ✅ Queue-based async execution

### **Axiom (New)**
- ✅ Market Writer content generation
- ✅ Learning Loop (self-improving KB)
- ✅ Analytics-driven optimization
- ✅ Multi-tenant SaaS structure
- ✅ Complete Zod schemas
- ✅ PostgreSQL + RLS

---

## 🎯 **Integration Strategy**

### **What We Keep from Lekhika:**

#### **1. Worker Infrastructure (100%)**
```
lekhika/vps-worker/
├── ecosystem.config.js     ← PM2 configuration
├── deploy.sh               ← VPS deployment automation
├── bootstrap-server.js     ← Worker creation/cloning
├── server.js               ← Main execution worker
├── leanServer.js           ← Lightweight worker
└── queueWorker.js          ← BullMQ queue processor
```

**Use this for:** All Axiom worker deployments!

#### **2. React Flow Workflow Engine (100%)**
```
_project-files/src/
├── components/FlowBuilder/  ← Visual workflow editor
├── contexts/FlowContext/    ← Workflow state management
└── services/workflowService ← Execution orchestration
```

**Use this for:** Orchestrating Axiom's Writer, Learning, Analytics processes!

#### **3. AI Provider Integration (100%)**
```
vps-worker/services/
├── openai.service.js
├── anthropic.service.js
├── gemini.service.js
├── [7 more providers]
└── aiOrchestrator.js  ← Multi-provider failover
```

**Use this for:** All LLM calls in Axiom!

#### **4. Superadmin Dashboard (Extend)**
```
_project-files/src/pages/
├── SuperAdminDashboard/
├── UserManagement/
├── WorkerOrchestration/
└── SystemMonitoring/
```

**Extend with:** Axiom-specific admin features

---

### **What We Add from Axiom:**

#### **1. Market Writer Schemas**
```
apps/backend/src/schemas/
├── kb.schema.ts            → Add to Lekhika's workflow nodes
├── writer.input.ts         → New workflow input type
├── writer.output.ts        → New workflow output type
├── learning.rules.ts       → New workflow automation rules
└── analytics.schema.ts     → New event tracking
```

#### **2. Learning Loop Worker**
```typescript
// NEW worker type in ecosystem.config.js
{
  name: 'axiom-learning-worker',
  script: 'axiomLearningWorker.js',
  env: {
    WORKER_TYPE: 'learning',
    CRON_SCHEDULE: '0 6 * * *' // 6 AM daily
  }
}
```

#### **3. Analytics System**
```typescript
// NEW worker type
{
  name: 'axiom-analytics-worker',
  script: 'axiomAnalyticsWorker.js',
  env: {
    WORKER_TYPE: 'analytics',
    AGGREGATION_INTERVAL: '3600000' // 1 hour
  }
}
```

---

## 🏗️ **Unified Architecture**

```
┌────────────────────────────────────────────────────────────┐
│         SUPERADMIN DASHBOARD (Lekhika Extended)            │
│  ├─ User Management                                        │
│  ├─ Organization Management (NEW)                          │
│  ├─ Worker Orchestration                                   │
│  │   ├─ Clone Workers                                      │
│  │   ├─ Deploy to VPS                                      │
│  │   └─ Monitor Health                                     │
│  ├─ Workflow Builder (React Flow)                          │
│  │   ├─ Lekhika Workflows (Books, Content)                │
│  │   └─ Axiom Workflows (Writer, Learning, Analytics) NEW │
│  └─ System Monitoring                                      │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│                 SUPABASE (PostgreSQL + Auth)                │
│  ├─ Lekhika Tables (users, books, workflows, etc.)        │
│  ├─ Axiom Tables (organizations, knowledge_bases, runs)    │
│  ├─ Shared: jobs, workers, platform_admins                 │
│  └─ RLS Policies (multi-tenant isolation)                  │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│              WORKERS (VPS via PM2 + Deployment)             │
│  ┌─────────────┬──────────────┬──────────────┬───────────┐ │
│  │ Bootstrap   │ Lekhika      │ Axiom Writer │ Learning  │ │
│  │ Server      │ Workers      │ Worker       │ Worker    │ │
│  │ (Cloning)   │ (Books)      │ (LLM+KB)     │ (Daily)   │ │
│  └─────────────┴──────────────┴──────────────┴───────────┘ │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│                  AI PROVIDERS (Unified)                     │
│  OpenAI, Anthropic, Gemini, Mistral, Perplexity, etc.     │
└────────────────────────────────────────────────────────────┘
```

---

## 📦 **Worker Types in Unified System**

### **Lekhika Workers (Existing)**
1. **bootstrap-server** - Creates/clones new workers
2. **lekhika-worker** - Book/content generation
3. **lekhika-lean-worker** - Lightweight execution
4. **lekhika-queue-worker** - BullMQ queue processor

### **Axiom Workers (NEW - Add to ecosystem.config.js)**
5. **axiom-writer-worker** - Market Writer execution
6. **axiom-learning-worker** - Daily 6 AM KB optimization
7. **axiom-analytics-worker** - Metrics aggregation

---

## 🔌 **Integration Points**

### **1. React Flow Integration**

#### **NEW Node Types for Axiom:**

```typescript
// Add to Lekhika's FlowBuilder
const AXIOM_NODE_TYPES = {
  // Input nodes
  'axiom-kb-input': {
    label: 'Load Knowledge Base',
    inputs: [],
    outputs: ['kb'],
    category: 'axiom-input'
  },
  'axiom-writer-input': {
    label: 'Writer Input',
    inputs: [],
    outputs: ['writerInput'],
    category: 'axiom-input'
  },
  
  // Process nodes
  'axiom-writer': {
    label: 'Market Writer',
    inputs: ['kb', 'writerInput'],
    outputs: ['websiteBundle', 'emailBundle', 'socialBundle'],
    category: 'axiom-process',
    worker: 'axiom-writer-worker'
  },
  'axiom-learning': {
    label: 'Learning Loop',
    inputs: ['analytics', 'kb'],
    outputs: ['updatedKB', 'metrics'],
    category: 'axiom-process',
    worker: 'axiom-learning-worker'
  },
  
  // Output nodes
  'axiom-store-content': {
    label: 'Store Generated Content',
    inputs: ['any'],
    outputs: [],
    category: 'axiom-output'
  }
};
```

#### **Visual Workflow Example:**
```
[KB Loader]
    ↓
[Writer Input Node]
    ↓
[Market Writer Node] → [Website Bundle] → [Store Content]
    ↓                → [Email Bundle]   → [Store Content]
    ↓                → [Social Bundle]  → [Store Content]
[Track Analytics]
    ↓
[Learning Loop] → [Update KB]
```

---

### **2. Worker Deployment Integration**

#### **Updated ecosystem.config.js**
```javascript
module.exports = {
  apps: [
    // --- EXISTING LEKHIKA WORKERS ---
    {
      name: 'bootstrap-server',
      script: 'bootstrap-server.js',
      // ... existing config
    },
    {
      name: 'lekhika-worker',
      script: 'server.js',
      // ... existing config
    },
    
    // --- NEW AXIOM WORKERS ---
    {
      name: 'axiom-writer-worker',
      script: 'workers/axiom/writerWorker.js',
      instances: 2, // Can handle multiple runs simultaneously
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'axiom-writer',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      },
      max_memory_restart: '2G', // LLM calls are memory-intensive
    },
    {
      name: 'axiom-learning-worker',
      script: 'workers/axiom/learningWorker.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 6 * * *', // Restart at 6 AM daily
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'axiom-learning',
      },
      max_memory_restart: '1G',
    },
    {
      name: 'axiom-analytics-worker',
      script: 'workers/axiom/analyticsWorker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'axiom-analytics',
        AGGREGATION_INTERVAL: '3600000', // 1 hour
      },
      max_memory_restart: '1G',
    },
  ]
};
```

---

### **3. Superadmin Dashboard Integration**

#### **Add Axiom Section to Lekhika's Superadmin**
```tsx
// _project-files/src/pages/SuperAdminDashboard.tsx

const SuperAdminDashboard = () => {
  return (
    <div className="superadmin-container">
      {/* EXISTING LEKHIKA SECTIONS */}
      <Section title="User Management" />
      <Section title="Worker Orchestration" />
      <Section title="System Monitoring" />
      
      {/* NEW AXIOM SECTIONS */}
      <Section title="Organizations">
        <OrganizationManager />
      </Section>
      
      <Section title="Market Writer">
        <KnowledgeBaseManager />
        <RunHistory />
      </Section>
      
      <Section title="Learning Analytics">
        <LearningDashboard />
        <PerformanceMetrics />
      </Section>
    </div>
  );
};
```

---

### **4. Database Merging**

#### **Unified Supabase Schema**
```sql
-- LEKHIKA TABLES (Keep as-is)
users
books
ai_workflows
ai_engines
engine_executions
levels
ai_providers
superadmin_users

-- AXIOM TABLES (Add to Supabase)
organizations       (NEW - multi-tenancy)
knowledge_bases     (NEW - Market Writer KB)
runs                (NEW - execution logs)
generated_content   (NEW - Writer output)
analytics_events    (NEW - performance tracking)
aggregated_metrics  (NEW - pre-computed analytics)
learning_history    (NEW - KB mutations audit)

-- SHARED TABLES (Unified)
jobs                (Unified queue for all workers)
workers             (Track Lekhika + Axiom workers)
platform_admins     (Unified superadmin)
platform_usage_stats (Combined usage metrics)
```

---

## 🚀 **Deployment Flow**

### **Worker Cloning via Bootstrap Server**

```typescript
// bootstrap-server.js (extended)

app.post('/api/workers/clone', async (req, res) => {
  const { workerType, targetVPS } = req.body;
  
  // Supports both Lekhika and Axiom workers
  const workerTemplates = {
    'lekhika-content': 'lekhika-worker',
    'axiom-writer': 'axiom-writer-worker',
    'axiom-learning': 'axiom-learning-worker',
    'axiom-analytics': 'axiom-analytics-worker',
  };
  
  const template = workerTemplates[workerType];
  
  // Clone worker to VPS
  await cloneWorkerToVPS(template, targetVPS);
  
  res.json({ success: true, workerId: newWorkerId });
});
```

### **Deployment via Superadmin UI**
```tsx
// One-click deployment from dashboard
<Button onClick={() => deployAxiomWorker('writer', 'vps-1')}>
  Deploy Axiom Writer to VPS-1
</Button>
```

---

## 📊 **Benefits of Integration**

### **1. Reuse Lekhika's Infrastructure**
- ✅ No rebuilding worker orchestration
- ✅ No rebuilding deployment automation
- ✅ No rebuilding React Flow UI
- ✅ No rebuilding AI provider integrations

### **2. Add Axiom's Intelligence**
- ✅ Self-improving KB system
- ✅ Analytics-driven optimization
- ✅ Market Writer content generation
- ✅ Production-grade schemas

### **3. Unified Platform**
- ✅ One superadmin for everything
- ✅ One deployment system
- ✅ One monitoring dashboard
- ✅ One multi-tenant architecture

---

## 🎯 **Implementation Roadmap**

### **Phase 1: Merge Database (Week 1)**
1. Run Axiom migrations in Lekhika's Supabase
2. Update RLS policies for unified multi-tenancy
3. Seed test data

### **Phase 2: Add Axiom Workers (Week 2)**
1. Create `workers/axiom/` directory in vps-worker
2. Implement writerWorker.js, learningWorker.js, analyticsWorker.js
3. Update ecosystem.config.js
4. Test deployment via bootstrap server

### **Phase 3: React Flow Integration (Week 3)**
1. Add Axiom node types to FlowBuilder
2. Wire up Axiom workers to workflow execution
3. Test end-to-end Axiom workflow

### **Phase 4: Superadmin Extension (Week 4)**
1. Add Organizations tab
2. Add Knowledge Base Manager
3. Add Learning Analytics dashboard
4. Add Axiom-specific monitoring

---

## ✅ **NEXT STEPS**

**Want me to:**
1. Create the `workers/axiom/` directory structure?
2. Build the Axiom worker implementations using Lekhika's patterns?
3. Add Axiom node types to React Flow?
4. Merge the database schemas?

**This is going to be EPIC!** We're combining the best of both systems! 🚀
