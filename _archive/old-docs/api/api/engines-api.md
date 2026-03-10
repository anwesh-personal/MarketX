# Axiom Engine API Documentation
## Integration Guide for External Systems

**Version:** 1.0.0  
**Base URL:** `https://your-domain.com/api`  
**Documentation Date:** 2026-01-24

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Engines API](#engines-api)
4. [Execution API](#execution-api)
5. [Data Structures](#data-structures)
6. [Webhooks & Callbacks](#webhooks--callbacks)
7. [Error Handling](#error-handling)
8. [Rate Limits](#rate-limits)
9. [Integration Examples](#integration-examples)

---

## Overview

The Axiom Engine API enables external systems to:
- **Deploy** AI-powered workflow engines
- **Execute** engines with custom inputs
- **Monitor** execution progress in real-time
- **Retrieve** results and analytics

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Workflow Template** | A reusable blueprint defining nodes and connections |
| **Engine** | A deployed, runnable instance of a workflow template |
| **Execution** | A single run of an engine with specific inputs |
| **Node** | An individual step in the workflow (trigger, AI, condition, output) |

---

## Authentication

### API Key Authentication
```http
Authorization: Bearer YOUR_API_KEY
```

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
X-Org-Id: your-organization-id (optional)
```

---

## Engines API

### List Engines

Retrieve all engines, optionally filtered by organization or status.

```http
GET /api/engines
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `orgId` | string | Filter by organization ID |
| `status` | string | Filter by status: `active`, `disabled`, `draft` |
| `activeOnly` | boolean | Only return active engines |

**Response:**
```json
{
  "engines": [
    {
      "id": "eng_abc123",
      "name": "Email Reply Engine",
      "description": "Generates professional email replies",
      "templateId": "tmpl_xyz789",
      "orgId": "org_456",
      "status": "active",
      "tier": "pro",
      "runCount": 142,
      "totalTokens": 45000,
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-24T12:30:00Z"
    }
  ]
}
```

---

### Get Engine

Retrieve a specific engine by ID.

```http
GET /api/engines/:id
```

**Response:**
```json
{
  "id": "eng_abc123",
  "name": "Email Reply Engine",
  "description": "Generates professional email replies",
  "templateId": "tmpl_xyz789",
  "orgId": "org_456",
  "status": "active",
  "tier": "pro",
  "config": {
    "flowConfig": {
      "nodes": [...],
      "edges": [...]
    },
    "constitutionId": "const_001",
    "kbId": "kb_002"
  },
  "runCount": 142,
  "createdAt": "2026-01-15T10:00:00Z"
}
```

---

### Deploy Engine

Create a new engine from a workflow configuration.

```http
POST /api/engines/deploy
```

**Request Body:**
```json
{
  "name": "Customer Support Engine",
  "description": "AI-powered customer support response generator",
  "templateId": "tmpl_xyz789",
  "orgId": "org_456",
  "flowConfig": {
    "nodes": [
      {
        "id": "node_1",
        "type": "email-trigger",
        "position": { "x": 100, "y": 100 },
        "data": {
          "label": "Email Received",
          "nodeType": "email-trigger"
        }
      },
      {
        "id": "node_2",
        "type": "generate-llm",
        "position": { "x": 300, "y": 100 },
        "data": {
          "label": "Generate Reply",
          "nodeType": "generate-llm",
          "config": {
            "provider": "openai",
            "model": "gpt-4o",
            "systemPrompt": "You are a helpful customer support agent."
          }
        }
      },
      {
        "id": "node_3",
        "type": "output-n8n",
        "position": { "x": 500, "y": 100 },
        "data": {
          "label": "Send Response",
          "nodeType": "output-n8n"
        }
      }
    ],
    "edges": [
      { "id": "e1", "source": "node_1", "target": "node_2" },
      { "id": "e2", "source": "node_2", "target": "node_3" }
    ]
  },
  "tier": "pro",
  "executionMode": "sync"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Engine deployed successfully",
  "engine": {
    "id": "eng_new123",
    "name": "Customer Support Engine",
    "status": "disabled",
    "createdAt": "2026-01-24T15:00:00Z"
  }
}
```

---

### Update Engine

Update an existing engine's configuration.

```http
PATCH /api/engines/:id
```

**Request Body:**
```json
{
  "name": "Updated Engine Name",
  "description": "New description",
  "status": "active",
  "config": {
    "tier": "enterprise"
  }
}
```

**Response:**
```json
{
  "success": true,
  "engine": {
    "id": "eng_abc123",
    "name": "Updated Engine Name",
    "status": "active"
  }
}
```

---

### Delete Engine

Delete an engine.

```http
DELETE /api/engines/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Engine deleted"
}
```

---

### Duplicate Engine

Create a copy of an existing engine.

```http
POST /api/engines/:id/duplicate
```

**Request Body:**
```json
{
  "name": "Email Reply Engine (Copy)"
}
```

**Response:**
```json
{
  "success": true,
  "engine": {
    "id": "eng_copy456",
    "name": "Email Reply Engine (Copy)",
    "status": "disabled"
  }
}
```

---

### Activate/Deactivate Engine

```http
POST /api/engines/:id/activate
POST /api/engines/:id/deactivate
```

**Response:**
```json
{
  "success": true,
  "message": "Engine activated",
  "engine": {
    "id": "eng_abc123",
    "status": "active"
  }
}
```

---

### Get Engine Statistics

Retrieve analytics for all engines.

```http
GET /api/engines/stats
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `days` | number | Number of days to include (default: 30) |

**Response:**
```json
{
  "totalEngines": 15,
  "activeEngines": 12,
  "totalRuns": 1452,
  "successfulRuns": 1398,
  "failedRuns": 54,
  "successRate": 96.3,
  "totalTokens": 2450000,
  "totalCost": 24.50,
  "averageRunTime": 12500
}
```

---

## Execution API

### Execute Engine

Run an engine with the provided input.

```http
POST /api/engines/:id/execute
```

**Request Body:**
```json
{
  "userId": "user_123",
  "orgId": "org_456",
  "input": {
    "emailBody": "Hi, I need help with my order #12345. It hasn't arrived yet.",
    "senderName": "John Smith",
    "senderEmail": "john@example.com",
    "orderNumber": "12345"
  },
  "options": {
    "executionMode": "sync",
    "tier": "pro",
    "timeout": 60000
  }
}
```

**Execution Modes:**
| Mode | Description |
|------|-------------|
| `sync` | Wait for completion, return result directly |
| `async` | Queue for background processing, return job ID |

**Synchronous Response:**
```json
{
  "success": true,
  "executionId": "exec_789xyz",
  "output": "Dear John Smith,\n\nThank you for contacting us about your order #12345...",
  "tokenUsage": {
    "totalTokens": 850,
    "totalCost": 0.0127
  },
  "durationMs": 4500
}
```

**Asynchronous Response:**
```json
{
  "success": true,
  "message": "Execution queued",
  "executionId": "exec_789xyz",
  "jobId": "job_abc123"
}
```

---

### Get Execution Status

Check the status of an execution.

```http
GET /api/engines/executions/:executionId
```

**Response:**
```json
{
  "id": "exec_789xyz",
  "engineId": "eng_abc123",
  "status": "running",
  "progress": 65,
  "currentNode": "generate-llm",
  "tokensUsed": 500,
  "cost": 0.0075,
  "durationMs": 3000,
  "startedAt": "2026-01-24T15:30:00Z",
  "completedAt": null,
  "error": null
}
```

**Status Values:**
| Status | Description |
|--------|-------------|
| `pending` | Execution created, not yet started |
| `running` | Currently executing nodes |
| `completed` | Finished successfully |
| `failed` | Stopped due to error |
| `stopped` | Manually stopped by user |

---

### Stop Execution

Stop a running execution.

```http
POST /api/engines/executions/:executionId/stop
```

**Response:**
```json
{
  "success": true,
  "message": "Stop signal sent"
}
```

---

### Get Active Executions

List all currently running executions.

```http
GET /api/engines/active
```

**Response:**
```json
{
  "count": 3,
  "executions": [
    "exec_789xyz",
    "exec_abc123",
    "exec_def456"
  ]
}
```

---

## Data Structures

### Engine Config

```typescript
interface EngineConfig {
  name: string;
  description?: string;
  templateId: string;
  orgId?: string;
  flowConfig: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  status: 'draft' | 'disabled' | 'active';
  tier: 'hobby' | 'pro' | 'enterprise';
  executionMode: 'sync' | 'async';
  constitutionId?: string;
  kbId?: string;
}
```

### Workflow Node

```typescript
interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: string;
    description?: string;
    config?: {
      provider?: 'openai' | 'anthropic' | 'google' | 'perplexity';
      model?: string;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      promptTemplate?: string;
      [key: string]: any;
    };
  };
}
```

### Node Types

| Category | Node Types |
|----------|------------|
| **Triggers** | `email-trigger`, `manual-trigger`, `schedule-trigger` |
| **Inputs** | `input-config`, `text-input`, `file-upload` |
| **Processing** | `analyze-intent`, `generate-llm`, `validate-constitution`, `web-search`, `seo-optimizer`, `content-locker` |
| **Knowledge** | `retrieve-kb` |
| **Logic** | `logic-gate`, `validation-check` |
| **Preview** | `live-preview`, `email-preview` |
| **Outputs** | `output-n8n`, `output-store`, `output-export`, `output-schedule` |

### Workflow Edge

```typescript
interface WorkflowEdge {
  id: string;
  source: string;  // Source node ID
  target: string;  // Target node ID
  animated?: boolean;
}
```

### Execution Result

```typescript
interface ExecutionResult {
  success: boolean;
  executionId: string;
  nodeOutputs: Record<string, NodeOutput>;
  lastNodeOutput: NodeOutput | null;
  tokenUsage: {
    totalTokens: number;
    totalCost: number;
    totalWords: number;
  };
  tokenLedger: TokenLedgerEntry[];
  durationMs: number;
  error?: string;
}
```

### Node Output

```typescript
interface NodeOutput {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  type: 'trigger' | 'input' | 'ai_generation' | 'kb_retrieval' | 'condition' | 'preview' | 'output';
  content: any;
  aiMetadata?: {
    tokens: number;
    cost: number;
    provider: string;
    model: string;
    durationMs: number;
  };
  sequenceNumber?: number;
  executedAt?: string;
}
```

---

## Webhooks & Callbacks

### Progress Webhook (Coming Soon)

Configure a webhook URL to receive real-time execution updates.

```json
{
  "webhookUrl": "https://your-system.com/axiom-callback",
  "events": ["execution.started", "node.completed", "execution.completed", "execution.failed"]
}
```

**Webhook Payload:**
```json
{
  "event": "node.completed",
  "executionId": "exec_789xyz",
  "engineId": "eng_abc123",
  "timestamp": "2026-01-24T15:30:05Z",
  "data": {
    "nodeId": "node_2",
    "nodeName": "Generate Reply",
    "nodeType": "generate-llm",
    "progress": 66,
    "tokens": 350,
    "cost": 0.0053
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ENGINE_NOT_FOUND` | 404 | Engine with specified ID does not exist |
| `ENGINE_NOT_ACTIVE` | 400 | Engine is not in active status |
| `EXECUTION_NOT_FOUND` | 404 | Execution with specified ID does not exist |
| `INVALID_INPUT` | 400 | Request body validation failed |
| `CAPACITY_EXCEEDED` | 503 | Server at maximum concurrent executions |
| `PROVIDER_ERROR` | 502 | AI provider API error |
| `TIMEOUT` | 504 | Execution exceeded timeout limit |
| `INSUFFICIENT_TOKENS` | 402 | User has insufficient token balance |

---

## Rate Limits

| Tier | Requests/min | Concurrent Executions | Max Tokens/day |
|------|--------------|----------------------|----------------|
| Hobby | 60 | 2 | 100,000 |
| Pro | 300 | 5 | 1,000,000 |
| Enterprise | 1000 | 20 | Unlimited |

Rate limit headers:
```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 298
X-RateLimit-Reset: 1706793600
```

---

## Integration Examples

### n8n Integration

Use the HTTP Request node to call the Axiom Engine API:

```json
{
  "method": "POST",
  "url": "https://axiom.example.com/api/engines/eng_abc123/execute",
  "headers": {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  "body": {
    "userId": "{{ $json.userId }}",
    "input": {
      "emailBody": "{{ $json.email.body }}",
      "senderEmail": "{{ $json.email.from }}"
    },
    "options": {
      "executionMode": "sync"
    }
  }
}
```

### Zapier Integration

Create a Zap with a webhook action:

1. **Trigger:** Your chosen trigger (Gmail, Slack, etc.)
2. **Action:** Webhooks by Zapier → POST
3. **URL:** `https://axiom.example.com/api/engines/{engine_id}/execute`
4. **Headers:** `Authorization: Bearer YOUR_API_KEY`
5. **Body:** Map your trigger data to the input fields

### cURL Example

```bash
# Deploy an engine
curl -X POST https://axiom.example.com/api/engines/deploy \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Engine",
    "templateId": "tmpl_xyz",
    "flowConfig": { "nodes": [...], "edges": [...] }
  }'

# Execute an engine
curl -X POST https://axiom.example.com/api/engines/eng_abc123/execute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "input": {
      "query": "What is your return policy?"
    }
  }'

# Check execution status
curl https://axiom.example.com/api/engines/executions/exec_789xyz \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Python SDK Example

```python
import requests

class AxiomClient:
    def __init__(self, api_key: str, base_url: str = "https://axiom.example.com/api"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def list_engines(self, org_id: str = None) -> list:
        params = {"orgId": org_id} if org_id else {}
        response = requests.get(f"{self.base_url}/engines", headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()["engines"]
    
    def execute_engine(self, engine_id: str, user_id: str, input_data: dict) -> dict:
        payload = {
            "userId": user_id,
            "input": input_data,
            "options": {"executionMode": "sync"}
        }
        response = requests.post(
            f"{self.base_url}/engines/{engine_id}/execute",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
    
    def get_execution_status(self, execution_id: str) -> dict:
        response = requests.get(
            f"{self.base_url}/engines/executions/{execution_id}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage
client = AxiomClient("your_api_key")

# List engines
engines = client.list_engines()

# Execute an engine
result = client.execute_engine(
    engine_id="eng_abc123",
    user_id="user_456",
    input_data={"query": "How do I reset my password?"}
)

print(f"Output: {result['output']}")
print(f"Tokens used: {result['tokenUsage']['totalTokens']}")
```

### JavaScript/Node.js Example

```javascript
class AxiomClient {
  constructor(apiKey, baseUrl = 'https://axiom.example.com/api') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async request(method, path, body = null) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API Error');
    }

    return response.json();
  }

  listEngines(orgId = null) {
    const query = orgId ? `?orgId=${orgId}` : '';
    return this.request('GET', `/engines${query}`);
  }

  executeEngine(engineId, userId, input, options = {}) {
    return this.request('POST', `/engines/${engineId}/execute`, {
      userId,
      input,
      options: { executionMode: 'sync', ...options },
    });
  }

  getExecutionStatus(executionId) {
    return this.request('GET', `/engines/executions/${executionId}`);
  }
}

// Usage
const client = new AxiomClient('your_api_key');

const result = await client.executeEngine(
  'eng_abc123',
  'user_456',
  { query: 'What is your refund policy?' }
);

console.log('Output:', result.output);
console.log('Tokens:', result.tokenUsage.totalTokens);
```

---

## Support

For API support and integration assistance:
- **Email:** api@axiom.example.com
- **Documentation:** https://docs.axiom.example.com
- **Status Page:** https://status.axiom.example.com

---

*This documentation is auto-generated and reflects the current API state as of 2026-01-24.*
