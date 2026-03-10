# Axiom Engine System - Developer Documentation

> **Complete Technical Reference for the Workflow Engine Deployment & Execution System**
> 
> Version: 1.0.0
> Last Updated: 2026-01-24
> Author: Ghazal (AI Assistant)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Directory Structure](#2-directory-structure)
3. [Database Schema](#3-database-schema)
4. [Backend Services](#4-backend-services)
5. [API Reference](#5-api-reference)
6. [Frontend Components](#6-frontend-components)
7. [Authentication & Security](#7-authentication--security)
8. [Integration Guide](#8-integration-guide)
9. [Code Examples](#9-code-examples)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Architecture Overview

### System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AXIOM ENGINE SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐ │
│  │  WORKFLOW       │ Deploy  │  ENGINE          │ Assign  │  USER/ORG    │ │
│  │  TEMPLATES      │ ──────► │  INSTANCES       │ ──────► │  API KEYS    │ │
│  │                 │         │                  │         │              │ │
│  │  • Nodes        │         │  • flow_config   │         │  • AXIOM-xxx │ │
│  │  • Edges        │         │  • status        │         │  • perms     │ │
│  │  • LLM configs  │         │  • org_id        │         │  • usage     │ │
│  └─────────────────┘         └────────┬─────────┘         └──────┬───────┘ │
│                                       │                          │         │
│                                       ▼                          │         │
│                              ┌──────────────────┐                │         │
│                              │  EXECUTION       │ ◄──────────────┘         │
│                              │  SERVICE         │                          │
│                              │                  │                          │
│                              │  • Sync/Async    │                          │
│                              │  • Queue jobs    │                          │
│                              │  • Progress      │                          │
│                              └────────┬─────────┘                          │
│                                       │                                    │
│                                       ▼                                    │
│  ┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐ │
│  │  AI SERVICE     │ ◄────── │  WORKFLOW        │ ──────► │  RUN LOGS    │ │
│  │                 │         │  EXECUTION       │         │              │ │
│  │  • OpenAI       │         │  SERVICE         │         │  • outputs   │ │
│  │  • Claude       │         │                  │         │  • tokens    │ │
│  │  • Gemini       │         │  • Node handlers │         │  • cost      │ │
│  │  • Perplexity   │         │  • Topo sort     │         │  • duration  │ │
│  └─────────────────┘         └──────────────────┘         └──────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Workflow Template** | Visual workflow with nodes & edges (stored in `workflow_templates`) |
| **Engine Instance** | Deployed workflow with config, assigned to org (stored in `engine_instances`) |
| **API Key** | User-specific key for engine access (stored in `user_api_keys`) |
| **Execution** | Single run of an engine with input → output |

---

## 2. Directory Structure

```
apps/
├── backend/src/
│   ├── services/
│   │   ├── ai/
│   │   │   └── aiService.ts           # Multi-provider AI (OpenAI, Claude, Gemini)
│   │   ├── apiKey/
│   │   │   └── apiKeyService.ts       # API key management
│   │   ├── engine/
│   │   │   ├── engineDeploymentService.ts  # Engine CRUD
│   │   │   └── executionService.ts         # Execution orchestrator
│   │   ├── queue/
│   │   │   └── queueService.ts        # In-memory job queue
│   │   ├── workflow/
│   │   │   └── workflowExecutionService.ts # Core workflow processor
│   │   └── index.ts                   # Service exports
│   │
│   ├── routes/
│   │   ├── engines.ts                 # /api/engines/* routes
│   │   └── apiKeys.ts                 # /api/keys/* routes
│   │
│   ├── middleware/
│   │   └── apiKeyAuth.ts              # API key authentication
│   │
│   └── index.ts                       # Express app entry
│
├── frontend/
│   └── src/app/superadmin/
│       ├── workflows/page.tsx         # Workflow builder + deploy
│       └── engines/page.tsx           # Engine management + execution
│
└── supabase/migrations/
    ├── 20260124000001_create_workflow_engine_tables.sql
    └── 20260124000002_create_api_key_system.sql
```

---

## 3. Database Schema

### Tables Overview

```sql
-- Core Tables
workflow_templates     -- Visual workflow definitions
engine_instances       -- Deployed engines
engine_run_logs        -- Execution history
user_api_keys          -- API keys for access
ai_providers           -- AI provider configurations
token_usage_logs       -- Token consumption tracking
```

### engine_instances

```sql
CREATE TABLE engine_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    template_id uuid REFERENCES workflow_templates(id),
    org_id uuid REFERENCES organizations(id),
    kb_id uuid,                    -- Knowledge base
    constitution_id uuid,          -- Brand constitution
    
    status text DEFAULT 'disabled' 
        CHECK (status IN ('active', 'standby', 'disabled', 'error')),
    
    flow_config jsonb NOT NULL,    -- { nodes: [], edges: [] }
    execution_mode text DEFAULT 'sync',
    tier text DEFAULT 'hobby',
    config jsonb DEFAULT '{}',
    
    -- Stats
    runs_today integer DEFAULT 0,
    runs_total integer DEFAULT 0,
    last_run_at timestamptz,
    error_message text,
    
    -- API Key
    api_key text UNIQUE,
    api_key_created_at timestamptz,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

### user_api_keys

```sql
CREATE TABLE user_api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    engine_id uuid REFERENCES engine_instances(id),
    org_id uuid REFERENCES organizations(id),
    
    api_key text UNIQUE NOT NULL,  -- AXIOM-xxx-xxx-xxx-xxx
    key_type text DEFAULT 'engine_access',
    permissions text[] DEFAULT ARRAY['execute', 'read'],
    
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    last_used_at timestamptz,
    
    rate_limit_per_minute integer DEFAULT 60,
    rate_limit_per_day integer DEFAULT 10000,
    expires_at timestamptz,
    
    name text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);
```

### engine_run_logs

```sql
CREATE TABLE engine_run_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    engine_id uuid REFERENCES engine_instances(id),
    user_id uuid,
    org_id uuid,
    
    execution_id text UNIQUE NOT NULL,
    status text DEFAULT 'running',
    
    input jsonb,
    output jsonb,
    
    -- Metrics
    tokens_used integer DEFAULT 0,
    cost_usd decimal(10,6) DEFAULT 0,
    duration_ms integer,
    
    -- Progress
    current_node text,
    progress integer DEFAULT 0,
    node_outputs jsonb DEFAULT '[]',
    
    error_message text,
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz
);
```

---

## 4. Backend Services

### 4.1 Engine Deployment Service

**File:** `services/engine/engineDeploymentService.ts`

```typescript
// Initialize
import { initializeEngineService, engineDeploymentService } from './services';
initializeEngineService(dbPool);

// Deploy a new engine
const engine = await engineDeploymentService.deployEngine({
    name: 'Customer Support Bot',
    description: 'Handles customer inquiries',
    templateId: 'template-uuid',
    orgId: 'org-uuid',
    flowConfig: { nodes: [...], edges: [...] },
    executionMode: 'sync',
    tier: 'pro'
});

// Get engine
const engine = await engineDeploymentService.getEngine(engineId);

// Update engine
await engineDeploymentService.updateEngine(engineId, { status: 'active' });

// Delete engine
await engineDeploymentService.deleteEngine(engineId);

// Duplicate engine
const clone = await engineDeploymentService.duplicateEngine(engineId, 'New Name');
```

### 4.2 Execution Service

**File:** `services/engine/executionService.ts`

```typescript
import { executionService } from './services';
await executionService.initialize(dbPool);

// Execute engine (sync)
const result = await executionService.executeEngine({
    engineId: 'engine-uuid',
    userId: 'user-uuid',
    orgId: 'org-uuid',
    input: { message: 'Hello!' },
    options: { executionMode: 'sync' }
});

// Result structure
{
    executionId: 'exec-uuid',
    status: 'completed' | 'failed' | 'queued',
    result: {
        lastNodeOutput: { type: 'output', content: '...' },
        tokenUsage: { totalTokens: 1234, totalCost: 0.0023 },
        durationMs: 2340
    }
}

// Get execution status
const status = await executionService.getExecutionStatus(executionId);

// Stop execution
executionService.stopExecution(executionId);

// Get active executions
const active = executionService.getActiveExecutions();
```

### 4.3 AI Service

**File:** `services/ai/aiService.ts`

```typescript
import { aiService } from './services';

// Call AI
const result = await aiService.callAI({
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello!' }
    ],
    temperature: 0.7,
    maxTokens: 1000
});

// Result structure
{
    content: 'AI response text',
    tokenUsage: {
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150,
        cost: 0.0015
    },
    model: 'gpt-4-turbo-preview',
    provider: 'openai'
}
```

### 4.4 API Key Service

**File:** `services/apiKey/apiKeyService.ts`

```typescript
import { apiKeyService } from './services';
apiKeyService.initialize(dbPool);

// Create API key
const keyRecord = await apiKeyService.createAPIKey({
    userId: 'user-uuid',
    engineId: 'engine-uuid',
    orgId: 'org-uuid',
    permissions: ['execute', 'read'],
    name: 'Production Key'
});
// Returns: { api_key: 'AXIOM-xxx-xxx-xxx-xxx', ... }

// Validate API key
const validation = await apiKeyService.validateAPIKey('AXIOM-xxx...');
// Returns: { valid: true, user_id, engine_id, permissions, ... }

// Assign engine to user (creates key automatically)
const { apiKey, keyRecord } = await apiKeyService.assignEngineToUser(
    engineId, 
    userId,
    { orgId, permissions: ['execute'] }
);

// Revoke key
await apiKeyService.revokeAPIKey('AXIOM-xxx...');

// Regenerate key
const newKey = await apiKeyService.regenerateAPIKey('AXIOM-xxx...');
```

---

## 5. API Reference

### 5.1 Engine Endpoints

#### Deploy Engine
```http
POST /api/engines/deploy
Content-Type: application/json

{
    "name": "My Engine",
    "description": "Engine description",
    "templateId": "template-uuid",
    "orgId": "org-uuid",
    "flowConfig": {
        "nodes": [...],
        "edges": [...]
    },
    "executionMode": "sync",
    "tier": "pro"
}

Response 201:
{
    "success": true,
    "engine": { ... }
}
```

#### Execute Engine
```http
POST /api/engines/{engineId}/execute
Content-Type: application/json
X-API-Key: AXIOM-xxx-xxx-xxx-xxx  (optional if userId provided)

{
    "input": {
        "message": "Hello, I need help"
    },
    "userId": "user-uuid",  (optional if using API key)
    "options": {
        "executionMode": "sync"
    }
}

Response 200 (sync):
{
    "success": true,
    "executionId": "exec-uuid",
    "output": "AI response content",
    "tokenUsage": {
        "totalTokens": 1500,
        "totalCost": 0.0025
    },
    "durationMs": 2340
}

Response 202 (async):
{
    "success": true,
    "message": "Execution queued",
    "executionId": "exec-uuid",
    "jobId": "job-123"
}
```

#### Get Execution Status
```http
GET /api/engines/executions/{executionId}

Response 200:
{
    "id": "exec-uuid",
    "status": "completed",
    "progress": 100,
    "output": {...},
    "tokenUsage": {...}
}
```

### 5.2 API Key Endpoints

#### Validate API Key
```http
POST /api/keys/validate
Content-Type: application/json

{
    "apiKey": "AXIOM-xxx-xxx-xxx-xxx"
}

Response 200:
{
    "valid": true,
    "user_id": "user-uuid",
    "engine_id": "engine-uuid",
    "org_id": "org-uuid",
    "engine_name": "My Engine",
    "permissions": ["execute", "read"]
}
```

#### Assign Engine to User
```http
POST /api/keys/assign
Content-Type: application/json

{
    "engineId": "engine-uuid",
    "userId": "user-uuid",
    "orgId": "org-uuid",
    "permissions": ["execute", "read"],
    "keyName": "Production Key"
}

Response 201:
{
    "success": true,
    "apiKey": "AXIOM-xxx-xxx-xxx-xxx",
    "keyRecord": { ... }
}
```

#### Revoke API Key
```http
POST /api/keys/{apiKey}/revoke

Response 200:
{
    "success": true,
    "message": "API key revoked"
}
```

#### Regenerate API Key
```http
POST /api/keys/{apiKey}/regenerate

Response 200:
{
    "success": true,
    "apiKey": "AXIOM-new-xxx-xxx-xxx"
}
```

---

## 6. Frontend Components

### 6.1 Workflows Page

**File:** `apps/frontend/src/app/superadmin/workflows/page.tsx`

Features:
- Card-based workflow template listing
- Visual workflow builder (ReactFlow)
- Deploy as Engine button (🚀)
- Duplicate, Delete, Edit workflows

### 6.2 Engines Page

**File:** `apps/frontend/src/app/superadmin/engines/page.tsx`

Features:
- Engine cards with status badges
- API key display (show/hide, copy)
- Test Run button for active engines
- Execution modal with progress
- Assign to Organization
- Clone, Configure, Toggle status

### Key Components

```tsx
// Engine Card with API Key
<EngineCard
    engine={engine}
    onExecute={handleExecute}
    onAssign={handleAssign}
    onViewApiKey={handleViewApiKey}
    onClone={handleClone}
    onConfigure={handleConfigure}
    onDelete={handleDelete}
    onToggleStatus={handleToggleStatus}
/>

// Execution Modal
<ExecutionModal
    isOpen={isOpen}
    engine={selectedEngine}
    executionState={executionState}
    onExecute={handleExecute}
    onStop={handleStop}
    testInput={testInput}
    setTestInput={setTestInput}
/>
```

---

## 7. Authentication & Security

### API Key Format

```
AXIOM-{user_id_slice}-{engine_id_slice}-{timestamp}-{random}

Example: AXIOM-a1b2c3d4-e5f6g7h8-lz3k92m-abc123def456ghi7

Parts:
- Prefix: AXIOM-
- User slice: First 8 chars of user_id
- Engine slice: First 8 chars of engine_id
- Timestamp: Base36 epoch timestamp
- Random: 16 hex characters
```

### Authentication Middleware

**File:** `middleware/apiKeyAuth.ts`

```typescript
// Required auth (fails if no valid key)
import { apiKeyAuthMiddleware } from './middleware/apiKeyAuth';
router.post('/execute', apiKeyAuthMiddleware, handler);

// Optional auth (passes through, attaches user if valid)
import { optionalApiKeyMiddleware } from './middleware/apiKeyAuth';
router.post('/execute', optionalApiKeyMiddleware, handler);
```

### Using API Key in Requests

```bash
# Via X-API-Key header
curl -X POST http://localhost:8080/api/engines/{id}/execute \
  -H "X-API-Key: AXIOM-xxx-xxx-xxx-xxx" \
  -H "Content-Type: application/json" \
  -d '{"input": {"message": "Hello"}}'

# Via Authorization header
curl -X POST http://localhost:8080/api/engines/{id}/execute \
  -H "Authorization: Bearer AXIOM-xxx-xxx-xxx-xxx" \
  -H "Content-Type: application/json" \
  -d '{"input": {"message": "Hello"}}'
```

### Permissions

| Permission | Description |
|------------|-------------|
| `execute` | Can run the engine |
| `read` | Can view engine config and logs |
| `configure` | Can modify engine settings |
| `admin` | Full access to engine |

---

## 8. Integration Guide

### Step 1: Deploy an Engine

```javascript
// From your workflow builder
const response = await fetch('http://localhost:8080/api/engines/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        name: 'Customer Support Bot',
        templateId: workflowId,
        flowConfig: { nodes, edges },
        tier: 'pro'
    })
});

const { engine } = await response.json();
console.log('Deployed:', engine.id);
```

### Step 2: Activate Engine

```javascript
await fetch(`http://localhost:8080/api/engines/${engine.id}/activate`, {
    method: 'POST'
});
```

### Step 3: Assign to User/Org & Get API Key

```javascript
const response = await fetch('http://localhost:8080/api/keys/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        engineId: engine.id,
        userId: 'user-uuid',
        orgId: 'org-uuid'
    })
});

const { apiKey } = await response.json();
// Save this key - it's shown only once!
console.log('API Key:', apiKey);
```

### Step 4: Execute Engine (External System)

```javascript
// Your external system calls Axiom
const response = await fetch(`http://axiom-api.com/api/engines/${engineId}/execute`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'AXIOM-xxx-xxx-xxx-xxx'
    },
    body: JSON.stringify({
        input: {
            message: customerMessage,
            context: conversationHistory
        }
    })
});

const { output, tokenUsage, durationMs } = await response.json();
```

---

## 9. Code Examples

### Complete Integration Example

```typescript
// integration.ts - External system integration

import axios from 'axios';

const AXIOM_API = 'http://localhost:8080/api';
const API_KEY = process.env.AXIOM_API_KEY;
const ENGINE_ID = process.env.AXIOM_ENGINE_ID;

interface AxiomResponse {
    success: boolean;
    output: string;
    tokenUsage: {
        totalTokens: number;
        totalCost: number;
    };
    durationMs: number;
}

export async function callAxiomEngine(
    message: string,
    context?: Record<string, any>
): Promise<AxiomResponse> {
    const response = await axios.post(
        `${AXIOM_API}/engines/${ENGINE_ID}/execute`,
        {
            input: {
                message,
                ...context
            }
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            }
        }
    );

    return response.data;
}

// Usage
async function handleCustomerMessage(msg: string) {
    try {
        const result = await callAxiomEngine(msg, {
            customerTier: 'premium',
            language: 'en'
        });

        console.log('Response:', result.output);
        console.log('Tokens used:', result.tokenUsage.totalTokens);
        console.log('Cost:', result.tokenUsage.totalCost);

    } catch (error) {
        if (error.response?.status === 401) {
            console.error('Invalid API key');
        } else if (error.response?.status === 403) {
            console.error('API key not authorized for this engine');
        }
    }
}
```

### Webhook Integration Example

```typescript
// webhook-handler.ts - Receive webhooks from external sources

import express from 'express';
import { apiKeyService } from './services';

const app = express();

// Webhook endpoint that validates and executes
app.post('/webhook/execute/:engineId', async (req, res) => {
    const { engineId } = req.params;
    const apiKey = req.headers['x-api-key'] as string;

    // Validate the API key
    const validation = await apiKeyService.validateAPIKey(apiKey);

    if (!validation.valid) {
        return res.status(401).json({ error: validation.error });
    }

    // Verify key is for this engine
    if (validation.engine_id !== engineId) {
        return res.status(403).json({ error: 'Key not authorized for this engine' });
    }

    // Execute
    const result = await executionService.executeEngine({
        engineId,
        userId: validation.user_id,
        orgId: validation.org_id,
        input: req.body
    });

    res.json(result);
});
```

---

## 10. Troubleshooting

### Common Issues

#### "Engine not active"
```bash
# Activate the engine first
curl -X POST http://localhost:8080/api/engines/{id}/activate
```

#### "Invalid API key format"
The key must start with `AXIOM-` and follow the format:
`AXIOM-{8chars}-{8chars}-{timestamp}-{16hexchars}`

#### "API key not authorized for this engine"
The API key is for a different engine. Each key is bound to a specific engine.

#### "userId is required"
Either provide `userId` in the request body OR use API key authentication:
```bash
curl -H "X-API-Key: AXIOM-xxx" ...
```

### Logs Location

```bash
# Backend logs
tail -f apps/backend/logs/engine.log

# Execution logs in database
SELECT * FROM engine_run_logs 
WHERE engine_id = 'xxx' 
ORDER BY started_at DESC;
```

### Health Check

```bash
curl http://localhost:8080/health

{
    "status": "ok",
    "timestamp": "2026-01-24T12:00:00Z",
    "activeExecutions": 3
}
```

---

## Quick Reference Card

```
╔══════════════════════════════════════════════════════════════════╗
║                    AXIOM ENGINE QUICK REFERENCE                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  DEPLOY ENGINE:                                                  ║
║  POST /api/engines/deploy                                        ║
║  Body: { name, templateId, flowConfig: { nodes, edges } }        ║
║                                                                  ║
║  ACTIVATE:                                                       ║
║  POST /api/engines/{id}/activate                                 ║
║                                                                  ║
║  ASSIGN + GET KEY:                                               ║
║  POST /api/keys/assign                                           ║
║  Body: { engineId, userId, orgId }                               ║
║  Returns: { apiKey: "AXIOM-xxx..." }                             ║
║                                                                  ║
║  EXECUTE:                                                        ║
║  POST /api/engines/{id}/execute                                  ║
║  Headers: X-API-Key: AXIOM-xxx...                                ║
║  Body: { input: { message: "..." } }                             ║
║                                                                  ║
║  VALIDATE KEY:                                                   ║
║  POST /api/keys/validate                                         ║
║  Body: { apiKey: "AXIOM-xxx..." }                                ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Files Created in This Session

| File | Purpose |
|------|---------|
| `services/engine/engineDeploymentService.ts` | Engine CRUD operations |
| `services/engine/executionService.ts` | Execution orchestrator |
| `services/workflow/workflowExecutionService.ts` | Core workflow processor |
| `services/ai/aiService.ts` | Multi-provider AI calls |
| `services/queue/queueService.ts` | In-memory job queue |
| `services/apiKey/apiKeyService.ts` | API key management |
| `routes/engines.ts` | Engine REST endpoints |
| `routes/apiKeys.ts` | API key REST endpoints |
| `middleware/apiKeyAuth.ts` | API key authentication |
| `migrations/20260124000002_create_api_key_system.sql` | Database schema |
| `docs/api/engines-api.md` | API documentation |
| `docs/api/openapi.yaml` | OpenAPI specification |
| `docs/api/QUICK_START.md` | Quick start guide |

---

**Questions? Contact the development team.**
