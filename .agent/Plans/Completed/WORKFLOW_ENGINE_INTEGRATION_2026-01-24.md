# 🔧 WORKFLOW ENGINE INTEGRATION PLAN (FINAL)
## Date: 2026-01-24
## Status: PENDING APPROVAL

---

## 📋 DECISIONS CONFIRMED

| Question | Answer |
|----------|--------|
| Design Language | **Axiom Premium** - existing theme system |
| Authentication | **Supabase Auth** - already in place |
| API Keys | **Supabase storage** - `ai_providers` table pattern |
| Models | **Dynamic fetch** - active/inactive flag, show all |

---

## 🎯 APPROACH: PORT FIRST, CUSTOMIZE AFTER

### Step 1: Port Lekhika's Framework As-Is
1. Port `AlchemistNodes.jsx` node component structure
2. Port `AlchemistSubNodes.jsx` specialized nodes
3. Port `alchemistNodePaletteService.js` for Supabase
4. Port ReactFlow canvas setup with @xyflow/react

### Step 2: Customize for Axiom
1. Replace Tailwind color classes with Axiom CSS variables
2. Rename "Alchemist" → "Axiom" throughout
3. Add Axiom-specific node types (from 10 templates)
4. Apply Axiom's premium design language

---

## FILES TO PORT FROM LEKHIKA

### Core Components (To Port):
```
lekhika/src/components/SuperAdmin/AlchemistNodes.jsx
  → axiom/apps/frontend/src/components/WorkflowBuilder/AxiomNodes.tsx

lekhika/src/components/SuperAdmin/AlchemistSubNodes.jsx
  → axiom/apps/frontend/src/components/WorkflowBuilder/AxiomSubNodes.tsx

lekhika/src/services/alchemistNodePaletteService.js
  → axiom/apps/frontend/src/services/nodePaletteService.ts

lekhika/src/services/alchemistNodeStyleService.js
  → axiom/apps/frontend/src/services/nodeStyleService.ts
```

### Key ReactFlow Config (To Port):
- Handle positions (4-sided: Top, Right, Bottom, Left)
- Node factory pattern (`createUltimatePerfectNode`)
- Category-based color schemes
- Feature tags and action buttons
- Processing state management

---

## PHASE 1: DATABASE MIGRATION

### 1.1 Create Tables
**File:** `database/migrations/workflow-engine-tables.sql`

```sql
-- Workflow Templates table
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'disabled')),
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    node_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES platform_admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Engine Instances table (clones of templates per org)
CREATE TABLE engine_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    template_id UUID NOT NULL REFERENCES workflow_templates(id),
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    kb_id UUID REFERENCES knowledge_bases(id) ON DELETE SET NULL,
    constitution_id UUID REFERENCES constitutions(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'disabled' CHECK (status IN ('active', 'standby', 'disabled', 'error')),
    config JSONB DEFAULT '{}',
    runs_today INTEGER DEFAULT 0,
    runs_total INTEGER DEFAULT 0,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constitutions table (guardrails per org)
CREATE TABLE constitutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rules JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Node Palette table (dynamic node types)
CREATE TABLE node_palette (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('trigger', 'input', 'process', 'condition', 'preview', 'output')),
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    features JSONB DEFAULT '[]',
    capabilities JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Engine API Keys mapping
CREATE TABLE engine_api_key_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engine_id UUID NOT NULL REFERENCES engine_instances(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflow_templates_status ON workflow_templates(status);
CREATE INDEX idx_engine_instances_template_id ON engine_instances(template_id);
CREATE INDEX idx_engine_instances_org_id ON engine_instances(org_id);
CREATE INDEX idx_engine_instances_status ON engine_instances(status);
CREATE INDEX idx_constitutions_org_id ON constitutions(org_id);
CREATE INDEX idx_node_palette_category ON node_palette(category);
CREATE INDEX idx_node_palette_is_active ON node_palette(is_active);
CREATE INDEX idx_engine_api_key_mappings_engine_id ON engine_api_key_mappings(engine_id);

-- RLS
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_palette ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_api_key_mappings ENABLE ROW LEVEL SECURITY;
```

### 1.2 Seed 10 Workflow Templates
(See existing seed data in plan - Email Writers, Blog+Social, Sales Copy, Landing Pages, Ebook generators)

### 1.3 Seed Node Palette
```sql
-- TRIGGER NODES
INSERT INTO node_palette (node_id, name, description, category, icon, color, features, capabilities) VALUES
('email-trigger', 'Email Received', 'Triggered when n8n webhook sends email data', 'trigger', 'Mail', 'primary', '["Webhook", "n8n Integration"]', '["Parse email headers", "Extract body/subject", "Detect attachments"]'),
('manual-trigger', 'Manual Trigger', 'Start workflow manually', 'trigger', 'Play', 'info', '["On-demand", "Testing"]', '["Manual execution", "Debug mode"]'),
('schedule-trigger', 'Scheduled', 'Run on a schedule', 'trigger', 'RefreshCw', 'warning', '["Cron", "Daily/Hourly"]', '["Time-based execution", "Recurring runs"]');

-- INPUT NODES
INSERT INTO node_palette (node_id, name, description, category, icon, color, features) VALUES
('input-config', 'Input Config', 'Configure workflow inputs', 'input', 'Settings', 'info', '["Form Builder", "Validation"]');

-- PROCESS NODES
INSERT INTO node_palette (node_id, name, description, category, icon, color, features) VALUES
('analyze-intent', 'Analyze Intent', 'Detect intent and scenario', 'process', 'Search', 'accent', '["AI Detection", "Scenario Matching"]'),
('retrieve-kb', 'Retrieve from KB', 'Fetch context from Knowledge Base', 'process', 'Database', 'success', '["Vector Search", "Context Window"]'),
('generate-llm', 'Generate (LLM)', 'Call AI model to generate content', 'process', 'Brain', 'primary', '["Multi-Model", "Constitutional"]'),
('validate-constitution', 'Constitution Check', 'Validate against org guardrails', 'process', 'Shield', 'error', '["Rules Engine", "Blocking"]'),
('web-search', 'Web Search', 'Research online sources', 'process', 'Globe', 'info', '["Perplexity", "Tavily"]'),
('content-locker', 'Content Locker', 'Add gated content hooks', 'process', 'Lock', 'warning', '["Email Gates", "Progressive Unlock"]');

-- OUTPUT NODES
INSERT INTO node_palette (node_id, name, description, category, icon, color, features) VALUES
('output-n8n', 'Return to n8n', 'Send result back via API', 'output', 'Send', 'success', '["API Response", "Webhook"]'),
('output-store', 'Store Content', 'Save generated content to database', 'output', 'FileText', 'info', '["Supabase", "Versioning"]');
```

---

## PHASE 2: PORT REACTFLOW FRAMEWORK

### 2.1 Port Node Components
**From:** `lekhika/src/components/SuperAdmin/AlchemistNodes.jsx`
**To:** `axiom/apps/frontend/src/components/WorkflowBuilder/AxiomNodes.tsx`

Key elements to port:
- `createUltimatePerfectNode()` factory function
- 4-sided Handle placement (Top, Right, Bottom, Left)
- Category-based color schemes → Convert to CSS variables
- Feature tags array
- Action buttons (Configure, Test, Copy)
- Hover/selected states

### 2.2 Port Sub-Nodes
**From:** `lekhika/src/components/SuperAdmin/AlchemistSubNodes.jsx`
**To:** `axiom/apps/frontend/src/components/WorkflowBuilder/AxiomSubNodes.tsx`

### 2.3 Port Node Palette Service
**From:** `lekhika/src/services/alchemistNodePaletteService.js`
**To:** `axiom/apps/frontend/src/services/nodePaletteService.ts`

### 2.4 Update Existing Files
Delete mock-data files I created:
- ❌ Delete `/apps/frontend/src/app/api/superadmin/workflows/route.ts` (has mock)
- ❌ Delete `/apps/frontend/src/app/api/superadmin/engines/route.ts` (has mock)
- ❌ Delete `/apps/frontend/src/components/EngineConfigModal/EngineConfigModal.tsx` (has mock)

Keep and update:
- ✅ `/apps/frontend/src/components/WorkflowBuilder/WorkflowBuilder.tsx` (already has ReactFlow)
- ✅ `/apps/frontend/src/app/superadmin/workflows/page.tsx` (update to use real API)
- ✅ `/apps/frontend/src/app/superadmin/engines/page.tsx` (update to use real API)

---

## PHASE 3: CUSTOMIZE FOR AXIOM

### 3.1 Color Scheme Conversion
```
// Lekhika Tailwind → Axiom CSS Variables
from-blue-500 → var(--color-primary)
from-purple-500 → var(--color-accent)
from-emerald-500 → var(--color-success)
from-amber-500 → var(--color-warning)
from-rose-500 → var(--color-error)
text-gray-900 → var(--color-textPrimary)
bg-gray-800 → var(--color-surface)
```

### 3.2 Rename Components
- AlchemistNodes → AxiomNodes
- AlchemistSubNodes → AxiomSubNodes
- alchemistNodePaletteService → nodePaletteService

### 3.3 Add Premium Design Elements
- Glow effects from Axiom theme
- Glass morphism from existing SuperAdmin
- Shadow variables from design system

---

## ✅ APPROVAL CHECKLIST

Before I proceed:
- [ ] Port Lekhika first, customize after - APPROVED?
- [ ] Database migration SQL looks correct?
- [ ] Node palette seed data is complete?
- [ ] Delete mock-data files before proceeding?

---

**Awaiting your approval on this approach.**
