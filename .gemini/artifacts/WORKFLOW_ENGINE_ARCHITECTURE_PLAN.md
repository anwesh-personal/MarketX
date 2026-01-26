# 🏗️ AXIOM WORKFLOW → ENGINE → CLONE ARCHITECTURE

## Complete Implementation Plan

---

## 📊 SYSTEM OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPERADMIN LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │  WORKFLOW        │    │  ENGINE          │    │  CLONE           │       │
│  │  TEMPLATES       │───▶│  INSTANCES       │───▶│  DISTRIBUTION    │       │
│  │  (Build/Design)  │    │  (Deploy/Config) │    │  (Assign/Scale)  │       │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘       │
│           │                      │                        │                  │
│           ▼                      ▼                        ▼                  │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │  workflow_       │    │  engine_         │    │  engine_         │       │
│  │  templates       │    │  instances       │    │  instances       │       │
│  │  (DB Table)      │    │  (DB Table)      │    │  (Cloned Rows)   │       │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORGANIZATION LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │  ORG A           │    │  ORG B           │    │  ORG C           │       │
│  │  Engine Clone 1  │    │  Engine Clone 2  │    │  Engine Clone 3  │       │
│  │  + Constitution  │    │  + Constitution  │    │  + Constitution  │       │
│  │  + KB Mapping    │    │  + KB Mapping    │    │  + KB Mapping    │       │
│  │  + API Keys      │    │  + API Keys      │    │  + API Keys      │       │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 PHASE 1: WORKFLOW TEMPLATES (BUILD)

### 1.1 Database Schema (Already Done ✅)
```sql
-- workflow_templates table
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) CHECK (status IN ('draft', 'active', 'disabled')),
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    node_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES platform_admins(id),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### 1.2 Node Structure (TO BE IMPLEMENTED)

Each node in `nodes` JSONB should have:

```typescript
interface WorkflowNode {
  id: string;                    // Unique node ID
  type: string;                  // From node_palette: 'email-trigger', 'generate-llm', etc.
  position: { x: number; y: number };
  
  data: {
    // BASIC INFO
    label: string;               // Display name
    description: string;         // What this node does
    nodeType: string;            // Same as type
    category: string;            // trigger|input|process|condition|preview|output
    
    // AI INTEGRATION (for process nodes)
    aiEnabled: boolean;
    selectedModels: AIModelConfig[];  // Array of model configs
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    userPrompt: string;
    negativePrompt: string;      // What to avoid
    
    // VARIABLES
    inputVariables: VariableConfig[];   // Required inputs
    outputVariables: VariableConfig[];  // What this node produces
    
    // CONDITION CONFIG (for condition nodes)
    conditionType: string;
    threshold: number;
    operator: string;
    trueAction: string;
    falseAction: string;
    
    // PREVIEW CONFIG (for preview nodes)
    maxReviewRounds: number;
    autoApprovalThreshold: number;
    reviewStakeholders: string[];
    rejectionRouting: string;
    
    // OUTPUT CONFIG (for output nodes)
    outputFormat: string;
    deliveryMethod: string;
    webhookUrl: string;
    
    // ADVANCED
    timeout: number;
    retryCount: number;
    priority: 'high' | 'normal' | 'low';
    fallbackModelId: string;     // Fallback if primary fails
  }
}

interface AIModelConfig {
  providerId: string;           // UUID from ai_providers table
  providerName: string;         // e.g., 'openai', 'anthropic'
  modelId: string;              // e.g., 'gpt-4o', 'claude-3.5-sonnet'
  modelName: string;            // Display name
  weight: number;               // For ensemble/priority
  isPrimary: boolean;           // Primary model
  isFallback: boolean;          // Fallback if primary fails
  temperature?: number;         // Override
  maxTokens?: number;           // Override
}

interface VariableConfig {
  variable: string;             // Variable key
  name: string;                 // Display name
  type: 'text' | 'select' | 'number' | 'textarea' | 'checkbox';
  required: boolean;
  description: string;
  options?: string[];           // For select type
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  defaultValue?: any;
  testValue?: any;              // For testing
}
```

### 1.3 Node Configuration Modal (TO BE REWRITTEN)

**Tabs:**
1. **Basic Info** - Name, description, icon
2. **Instructions** - Built-in + custom instructions
3. **AI Integration** - Multi-model selection FROM DATABASE
4. **Variables** - Input/output variable configuration
5. **Advanced** - Timeout, retry, priority, fallback
6. **Test** - Test input values

---

## 🚀 PHASE 2: ENGINE DEPLOYMENT (DEPLOY)

### 2.1 Converting Template → Engine

When SuperAdmin clicks "Deploy as Engine":

```typescript
// API: POST /api/superadmin/engines
async function deployWorkflowAsEngine(templateId: string, config: DeployConfig) {
  // 1. Fetch the workflow template
  const template = await db.workflow_templates.findById(templateId);
  
  // 2. Validate all nodes are properly configured
  await validateWorkflowForDeployment(template);
  
  // 3. Create engine instance
  const engine = await db.engine_instances.create({
    name: config.name || `${template.name} Engine`,
    template_id: templateId,
    org_id: null,                    // Not assigned yet
    kb_id: null,                     // Not connected yet
    constitution_id: null,           // No guardrails yet
    status: 'disabled',              // Start disabled
    config: {
      ...template.nodes,             // Copy node configs
      deploymentTimestamp: new Date(),
      deployedBy: currentAdmin.id,
    },
    runs_today: 0,
    runs_total: 0,
  });
  
  return engine;
}
```

### 2.2 Engine Configuration

After deployment, Engine can be configured with:

- **Knowledge Base** - Which KB to use for RAG
- **Constitution** - Which guardrails to apply
- **API Key Mappings** - Which org's API keys to use
- **Daily Run Limits** - Rate limiting per org
- **Custom Prompts** - Org-specific prompt overrides

---

## 📦 PHASE 3: CLONE DISTRIBUTION (ASSIGN)

### 3.1 Cloning Engine for Organization

When assigning engine to an org:

```typescript
// API: POST /api/superadmin/engines/clone
async function cloneEngineForOrg(engineId: string, orgId: string) {
  // 1. Fetch source engine
  const sourceEngine = await db.engine_instances.findById(engineId);
  
  // 2. Create clone for org
  const clonedEngine = await db.engine_instances.create({
    name: `${sourceEngine.name} (${org.name})`,
    template_id: sourceEngine.template_id,
    org_id: orgId,                   // Assign to org
    kb_id: org.default_kb_id,        // Use org's KB
    constitution_id: org.default_constitution_id,
    status: 'standby',
    config: {
      ...sourceEngine.config,
      clonedFrom: engineId,
      clonedAt: new Date(),
    },
  });
  
  // 3. Map org's API keys to this engine
  await mapOrgApiKeysToEngine(clonedEngine.id, orgId);
  
  return clonedEngine;
}
```

### 3.2 API Key Mapping

```sql
-- engine_api_key_mappings table
CREATE TABLE engine_api_key_mappings (
    id UUID PRIMARY KEY,
    engine_id UUID REFERENCES engine_instances(id),
    provider_id UUID REFERENCES ai_providers(id),
    is_primary BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0
);
```

When engine runs:
1. Check org's `ai_providers` for active keys
2. Use `engine_api_key_mappings` to select which key
3. Fallback to next priority if primary fails

---

## 🔧 PHASE 4: IMPLEMENTATION TASKS

### Task 1: Fix Hardcoded Models in NodeConfigurationModal

**Current Problem:**
```tsx
// HARDCODED - BAD!
<option value="gpt-4o">GPT-4o</option>
<option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
```

**Fix:**
```tsx
// DYNAMIC - GOOD!
const [providers, setProviders] = useState([]);
const [models, setModels] = useState({});

useEffect(() => {
  // Fetch from ai_providers table
  fetchWithAuth('/api/superadmin/ai/providers')
    .then(res => res.json())
    .then(data => setProviders(data.data));
}, []);

const loadModelsForProvider = async (providerId: string) => {
  const res = await fetchWithAuth(`/api/superadmin/ai/providers/${providerId}/models`);
  const data = await res.json();
  setModels(prev => ({ ...prev, [providerId]: data.data }));
};
```

### Task 2: Create Complete Node Configuration Modal

**New Tabs Structure:**

```typescript
const tabs = [
  { id: 'basic', label: 'Basic Info', icon: Settings },
  { id: 'instructions', label: 'Instructions', icon: FileText },
  { id: 'ai', label: 'AI Integration', icon: Brain },
  { id: 'variables', label: 'Variables', icon: Target },
  { id: 'advanced', label: 'Advanced', icon: Zap },
  { id: 'test', label: 'Test', icon: Play },
];
```

### Task 3: Create Variables System

**File:** `src/data/axiomVariables.ts`

Port from Lekhika's `alchemistVariables.js`:
- Input variables (topic, audience, tone, etc.)
- Process variables (content type, quality level)
- Condition variables (threshold, comparisons)
- Output variables (format, delivery method)

### Task 4: Engine Deployment Flow

**UI Flow:**
1. Workflow Template page → "Deploy" button
2. Opens DeployEngineModal:
   - Name the engine
   - Select initial config
   - Validate all nodes
3. Creates engine_instance
4. Redirects to Engines page

### Task 5: Clone Assignment Flow

**UI Flow:**
1. Engines page → Select engine → "Assign to Org"
2. Opens AssignEngineModal:
   - Select organization
   - Select KB for this org
   - Select Constitution for this org
   - Map API keys
3. Creates cloned engine_instance with org_id

---

## 📁 FILES TO CREATE/MODIFY

### New Files:
```
apps/frontend/src/
├── data/
│   └── axiomVariables.ts           # Variable definitions
├── components/WorkflowBuilder/
│   ├── NodeConfigModal/
│   │   ├── index.tsx               # Main modal with tabs
│   │   ├── BasicInfoTab.tsx        # Name, description
│   │   ├── InstructionsTab.tsx     # Built-in + custom
│   │   ├── AIIntegrationTab.tsx    # Multi-model from DB
│   │   ├── VariablesTab.tsx        # Drag-drop variables
│   │   ├── AdvancedTab.tsx         # Timeout, retry, fallback
│   │   └── TestTab.tsx             # Test input values
│   └── AIProviderSelector.tsx      # Reusable provider/model picker
├── app/api/superadmin/
│   ├── engines/
│   │   ├── route.ts                # CRUD engines
│   │   ├── [id]/
│   │   │   ├── route.ts            # Single engine ops
│   │   │   ├── clone/route.ts      # Clone to org
│   │   │   └── deploy/route.ts     # Deploy from template
│   └── ai/
│       └── providers/
│           ├── route.ts            # List providers
│           └── [id]/
│               └── models/route.ts # List models for provider
```

### Modify:
```
apps/frontend/src/
├── components/WorkflowBuilder/
│   ├── AxiomNodes.tsx              # Use full node data
│   └── WorkflowBuilder.tsx         # Pass all node config
├── app/superadmin/
│   ├── workflows/page.tsx          # Add Deploy button
│   └── engines/page.tsx            # Add Clone/Assign
```

---

## 🎯 EXECUTION ORDER

### Week 1: Foundation
1. ✅ Create `axiomVariables.ts` with all variable definitions
2. ✅ Create API endpoint to fetch AI providers + models
3. ✅ Create `AIProviderSelector` component

### Week 2: Node Modal
4. Rewrite `NodeConfigurationModal` with 6 tabs
5. Implement `AIIntegrationTab` with dynamic providers
6. Implement `VariablesTab` with drag-drop

### Week 3: Engine Deployment
7. Add "Deploy" button to workflow templates
8. Create `DeployEngineModal`
9. Implement engine creation from template

### Week 4: Clone Distribution
10. Add "Assign to Org" button to engines
11. Create `AssignEngineModal`
12. Implement clone with org-specific config

---

## ⚠️ CRITICAL FIXES NEEDED NOW

1. **Remove ALL hardcoded models** - Must come from `ai_providers` + `ai_model_metadata`
2. **Fill ALL node fields** - Every node must have complete configuration
3. **Proper save structure** - Nodes must save complete data, not just label
4. **Database relations** - Ensure `engine_instances.template_id` properly references

---

## 📋 CHECKLIST

- [ ] `axiomVariables.ts` created
- [ ] API: GET `/api/superadmin/ai/providers` - returns active providers
- [ ] API: GET `/api/superadmin/ai/providers/:id/models` - returns models for provider
- [ ] `AIProviderSelector.tsx` component
- [ ] `NodeConfigurationModal` with 6 tabs
- [ ] All hardcoded models removed
- [ ] Deploy workflow → engine flow
- [ ] Clone engine → org flow
- [ ] API key mapping for cloned engines
- [ ] Constitution assignment per clone
- [ ] KB assignment per clone

