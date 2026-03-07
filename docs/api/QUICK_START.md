# Axiom Engine Integration Quick Start
## Get Your AI Workflows Running in 5 Minutes

---

## 🚀 Quick Start

### 1. Get Your API Key

Contact your Axiom administrator or visit the Superadmin panel to generate an API key.

### 2. Test the Connection

```bash
curl -X GET https://your-axiom-domain.com/api/engines \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 3. Execute an Engine

```bash
curl -X POST https://your-axiom-domain.com/api/engines/eng_YOUR_ENGINE_ID/execute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "integration_user",
    "input": {
      "message": "Hello, I need help with my account"
    }
  }'
```

---

## 📦 Integration Options

### Option 1: Direct REST API

Use HTTP requests from any language or platform.

**Base URL:** `https://your-domain.com/api`  
**Auth:** `Authorization: Bearer YOUR_API_KEY`

### Option 2: n8n Workflow

1. Add **HTTP Request** node
2. Configure:
   - Method: `POST`
   - URL: `https://your-domain.com/api/engines/{engineId}/execute`
   - Headers: `Authorization: Bearer YOUR_API_KEY`
   - Body: Map your data to the `input` field

### Option 3: Zapier

1. Use **Webhooks by Zapier** → POST
2. URL: `https://your-domain.com/api/engines/{engineId}/execute`
3. Map trigger data to request body

### Option 4: Make (Integromat)

1. Add **HTTP** module
2. Configure with the execute endpoint
3. Parse JSON response

---

## 🔧 Common Operations

### List Available Engines
```http
GET /api/engines?activeOnly=true
```

### Execute Engine (Synchronous)
```http
POST /api/engines/{id}/execute
Content-Type: application/json

{
  "userId": "your_user_id",
  "input": { ... },
  "options": { "executionMode": "sync" }
}
```

### Execute Engine (Asynchronous)
```http
POST /api/engines/{id}/execute
Content-Type: application/json

{
  "userId": "your_user_id",
  "input": { ... },
  "options": { "executionMode": "async" }
}
```

### Check Execution Status
```http
GET /api/engines/executions/{executionId}
```

### Get Analytics
```http
GET /api/engines/stats?days=30
```

---

## 📊 Response Handling

### Successful Sync Execution
```json
{
  "success": true,
  "executionId": "exec_abc123",
  "output": "Generated content here...",
  "tokenUsage": {
    "totalTokens": 500,
    "totalCost": 0.0075
  },
  "durationMs": 3500
}
```

### Async Execution (Queued)
```json
{
  "success": true,
  "message": "Execution queued",
  "executionId": "exec_abc123",
  "jobId": "job_xyz789"
}
```

### Execution Status
```json
{
  "id": "exec_abc123",
  "status": "completed",
  "progress": 100,
  "tokensUsed": 500,
  "cost": 0.0075,
  "durationMs": 3500
}
```

---

## 🛡️ Error Handling

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 400 | Bad Request | Check input format |
| 401 | Unauthorized | Verify API key |
| 404 | Not Found | Check engine/execution ID |
| 429 | Rate Limited | Wait and retry |
| 500 | Server Error | Contact support |
| 503 | At Capacity | Use async mode or retry |

---

## 📚 Full Documentation

- **API Reference:** [engines-api.md](./engines-api.md)
- **OpenAPI Spec:** [openapi.yaml](./openapi.yaml) (import into Swagger/Postman)
- **Architecture:** [engine-deployment-architecture.md](../../.agent/Plans/Active/engine-deployment-architecture.md)

---

## 💡 Tips

1. **Use Async for Long Workflows** - If your engine has many nodes, use `executionMode: async` to avoid timeouts
2. **Poll for Status** - For async executions, poll the status endpoint every 2-5 seconds
3. **Handle Rate Limits** - Implement exponential backoff on 429 responses
4. **Track Costs** - Monitor `tokenUsage.totalCost` to manage expenses
5. **Test in Dev First** - Use `http://localhost:8080/api` for development

---

## 🆘 Support

- **Email:** support@your-domain.com
- **Slack:** #axiom-integrations
- **Docs:** https://docs.your-domain.com
