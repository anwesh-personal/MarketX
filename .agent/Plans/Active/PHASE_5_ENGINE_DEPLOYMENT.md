# Phase 5: Engine Deployment

> **Status**: 🟢 COMPLETE
> **Duration**: 2-3 days
> **Dependencies**: Phase 4 (Workflow Templates)

---

## Objective

Complete the Template → Engine → Tenant deployment flow. Ensure engines can be deployed, assigned to organizations, linked to KBs/Constitutions, and executed with proper isolation.

---

## Current State

**`engineDeploymentService.ts` exists** with:
- ✅ `deployEngine()` - Creates engine from template
- ✅ `getEngines()` - List engines with filters
- ✅ `updateEngine()` - Modify engine config
- ✅ `duplicateEngine()` - Clone engine
- ✅ `startEngineRun()` / `completeEngineRun()` - Execution logging

**Missing:**
- Connection to workflow execution
- KB/Constitution linking verification
- API key isolation enforcement
- Multi-tenant execution context

---

## Deployment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. TEMPLATE CREATION (SuperAdmin)                              │
│     - Create workflow in builder                                │
│     - Save as template (status: draft → active)                 │
│     - Template stored in workflow_templates table               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. ENGINE DEPLOYMENT (SuperAdmin)                              │
│     - Select template                                           │
│     - Configure engine name & settings                          │
│     - Assign to Organization (org_id)                           │
│     - Link to Knowledge Base (kb_id)                            │
│     - Link to Constitution (constitution_id)                    │
│     - Set status: disabled → standby → active                   │
│     - Engine stored in engine_instances table                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. API KEY MAPPING (SuperAdmin)                                │
│     - Map engine to org's AI provider keys                      │
│     - Set primary/fallback providers                            │
│     - Isolation: Engine uses only mapped keys                   │
│     - Stored in engine_api_key_mappings table                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. ENGINE EXECUTION (Runtime)                                  │
│     - Trigger received (webhook, schedule, manual)              │
│     - Load engine config                                        │
│     - Load linked KB & Constitution                             │
│     - Execute workflow with proper context                      │
│     - Use mapped API keys only                                  │
│     - Log run to engine_run_logs                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tasks

### Task 5.1: Complete Engine Deployment UI

**File to modify:**
```
apps/frontend/src/app/superadmin/engines/page.tsx
```

**Current state:** 55KB file exists

**Required features:**
1. **Template Selection** - Dropdown of active templates
2. **Engine Configuration**
   - Name
   - Description
   - Tier (hobby/pro/enterprise)
   - Execution mode (sync/async/queue)
3. **Organization Assignment** - Dropdown of orgs (or "Global")
4. **KB Linking** - Dropdown of KBs (filtered by org)
5. **Constitution Linking** - Dropdown of constitutions (filtered by org)
6. **Status Toggle** - disabled → standby → active
7. **API Key Mapping** - Select which provider keys to use

### Task 5.2: Create Engine Execution Endpoint

**File to create/modify:**
```
apps/backend/src/routes/engines.ts
```

**Endpoints:**
```typescript
// Execute engine
POST /api/engines/:engineId/execute
Body: { input: any, async?: boolean }
Response: { runId: string, output?: any }

// Get engine run status
GET /api/engines/:engineId/runs/:runId
Response: { status, output, logs, cost, duration }

// Webhook trigger for engine
POST /api/engines/:engineId/webhook
Body: Raw webhook payload
Response: { runId: string }
```

### Task 5.3: Wire Engine Execution to Workflow Service

**File to modify:**
```
apps/backend/src/services/workflow/workflowExecutionService.ts
```

**New method:**
```typescript
async executeEngine(
    engineId: string,
    input: any,
    options?: { async?: boolean }
): Promise<ExecutionResult> {
    // 1. Load engine
    const engine = await engineDeploymentService.getEngine(engineId);
    if (!engine) throw new Error('Engine not found');
    if (engine.status !== 'active') throw new Error('Engine not active');
    
    // 2. Load template
    const template = await this.getTemplate(engine.templateId);
    
    // 3. Load KB
    const kb = await kbService.getKB(engine.kbId);
    
    // 4. Load Constitution
    const constitution = await constitutionService.get(engine.constitutionId);
    
    // 5. Build execution context
    const context: ExecutionContext = {
        engineId,
        orgId: engine.orgId,
        kb,
        constitution,
        apiKeyMappings: await this.getApiKeyMappings(engineId),
    };
    
    // 6. Start run log
    const runId = await engineDeploymentService.startEngineRun(
        engineId, engine.orgId, input
    );
    
    // 7. Execute workflow with context
    try {
        const result = await this.executeWorkflow(template.nodes, template.edges, input, context);
        
        // 8. Complete run log
        await engineDeploymentService.completeEngineRun(
            runId, 'completed', result.output, result.tokens, result.cost, result.duration
        );
        
        return { runId, output: result.output };
    } catch (error) {
        await engineDeploymentService.completeEngineRun(
            runId, 'failed', null, 0, 0, 0, error.message
        );
        throw error;
    }
}
```

### Task 5.4: Implement API Key Isolation

**File to modify:**
```
apps/backend/src/services/ai/aiService.ts
```

**Changes:**
```typescript
// Current: Uses global keys
async call(prompt: string, options: AICallOptions) {
    const provider = this.getProvider(options.provider);
    // ... uses provider's configured API key
}

// New: Respects engine context
async call(prompt: string, options: AICallOptions & { engineContext?: EngineContext }) {
    if (options.engineContext) {
        // Use engine's mapped API key instead of global
        const mappedKey = options.engineContext.apiKeyMappings
            .find(m => m.providerId === options.provider && m.isPrimary);
        if (mappedKey) {
            // Override provider's key for this call
            provider.setApiKey(mappedKey.apiKey);
        }
    }
    // ... continue with call
}
```

### Task 5.5: Add Execution Context to Workflow

**File to modify:**
```
apps/backend/src/services/workflow/workflowExecutionService.ts
```

**Changes to `PipelineData`:**
```typescript
interface PipelineData {
    // Existing
    userInput: any;
    nodeOutputs: Map<string, NodeOutput>;
    lastNodeOutput: NodeOutput | null;
    tokenUsage: TokenUsage;
    executionUser: ExecutionUser;
    
    // New: Engine context
    engineContext?: {
        engineId: string;
        orgId: string;
        kb: KnowledgeBase;
        constitution: Constitution;
        apiKeyMappings: ApiKeyMapping[];
    };
}
```

### Task 5.6: Constitution Validation Integration

**In execute flow:**
```typescript
case 'validate-constitution':
    const constitution = pipelineData.engineContext?.constitution;
    if (!constitution) {
        // Fallback to config-based validation
        return await this.validateWithConfig(content, config);
    }
    return await this.validateWithConstitution(content, constitution);
```

### Task 5.7: Engine Dashboard Metrics

**File to modify:**
```
apps/frontend/src/app/superadmin/engines/page.tsx
```

**Add dashboard showing:**
- Total runs today / total
- Success rate
- Average cost per run
- Average duration
- Last run timestamp
- Error rate

**API endpoint:**
```
GET /api/engines/:engineId/stats
Response: { runsToday, runsTotal, successRate, avgCost, avgDuration, lastRun }
```

---

## Validation Checklist

- [ ] Engine can be deployed from template via UI
- [ ] Engine can be assigned to organization
- [ ] Engine can be linked to KB
- [ ] Engine can be linked to Constitution
- [ ] API keys are properly isolated per engine
- [ ] Engine executes with correct KB context
- [ ] Constitution validation uses linked constitution
- [ ] Run logs capture all execution data
- [ ] Dashboard shows accurate metrics
- [ ] Webhook trigger works for external systems

---

## Test Scenarios

```typescript
// Test 1: Deploy engine
const engine = await engineDeploymentService.deployEngine({
    name: 'Test Engine',
    templateId: emailReplyTemplateId,
    orgId: testOrgId,
    kbId: testKbId,
    constitutionId: testConstitutionId,
});
expect(engine.status).toBe('disabled');

// Test 2: Activate and execute
await engineDeploymentService.updateEngine(engine.id, { status: 'active' });
const result = await workflowExecutionService.executeEngine(engine.id, {
    email: { subject: 'Question', body: 'What is your pricing?' }
});
expect(result.output.type).toBe('email_reply_bundle');

// Test 3: Check run log
const log = await db.query('SELECT * FROM engine_run_logs WHERE id = $1', [result.runId]);
expect(log.rows[0].status).toBe('completed');

// Test 4: API key isolation
// Engine mapped to OrgA keys should NOT use OrgB keys
const mockAiCall = jest.spyOn(aiService, 'call');
await workflowExecutionService.executeEngine(engineA.id, input);
expect(mockAiCall).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ engineContext: expect.objectContaining({ orgId: 'OrgA' }) })
);
```

---

## Multi-Tenancy Matrix

| Resource | Isolation Level | Implementation |
|----------|-----------------|----------------|
| Templates | Global (SuperAdmin) | RLS: Superadmin only |
| Engines | Per-Organization | RLS: org_id filter |
| KB | Per-Organization | RLS: org_id filter |
| Constitution | Per-Organization | RLS: org_id filter |
| API Keys | Per-Organization | engine_api_key_mappings |
| Run Logs | Per-Organization | RLS: org_id filter |

---

## Notes

- Engine status flow: disabled → standby → active
- Standby = configured but not accepting live requests
- Active = fully operational
- API key isolation is CRITICAL for client security
- Run logs enable the learning loop (Phase 6: Brain Integration)
