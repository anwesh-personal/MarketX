# WORKER + AI INTEGRATION ARCHITECTURE
**How Background Workers Process AI Tasks**

---

## 🏗️ COMPLETE FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INITIATES TASK                              │
│  Examples: Process KB, Generate Content, Analyze Data, etc.             │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    AXIOM FRONTEND (Next.js)                              │
│  - User clicks "Process Knowledge Base"                                  │
│  - Frontend calls: POST /api/jobs/create                                │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      JOB CREATION API                                    │
│  /api/jobs/create:                                                       │
│    1. Validate request                                                   │
│    2. Get brain config                                                   │
│    3. Get AI provider                                                    │
│    4. Insert into `worker_jobs` table:                                  │
│       - job_type: 'kb_processing'                                       │
│       - status: 'pending'                                               │
│       - payload: {kb_id, files, brain_id, provider_id}                  │
│    5. Return job_id                                                      │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   DATABASE: worker_jobs TABLE                            │
│  ┌───────────────────────────────────────────────────────────┐          │
│  │ id: uuid                                                   │          │
│  │ job_type: 'kb_processing'                                 │          │
│  │ status: 'pending'                                          │          │
│  │ payload: {                                                 │          │
│  │   kb_id: 'uuid',                                          │          │
│  │   files: ['doc1.pdf', 'doc2.txt'],                       │          │
│  │   brain_id: 'uuid',                                       │          │
│  │   provider_id: 'uuid'                                     │          │
│  │ }                                                          │          │
│  │ attempts: 0                                                │          │
│  │ created_at: now()                                          │          │
│  └───────────────────────────────────────────────────────────┘          │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  VPS WORKER (PM2 Process)                                │
│  Running on: 103.190.93.28:/home/lekhika.online/vps-worker             │
│                                                                           │
│  WORKER LOOP (every 5 seconds):                                         │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ 1. Poll database for pending jobs:                      │            │
│  │    SELECT * FROM worker_jobs                             │            │
│  │    WHERE status = 'pending'                              │            │
│  │    AND worker_type = 'kb_processing'                    │            │
│  │    ORDER BY priority, created_at                         │            │
│  │    LIMIT 1                                               │            │
│  │                                                          │            │
│  │ 2. If job found:                                        │            │
│  │    - Update status to 'running'                         │            │
│  │    - Update started_at timestamp                        │            │
│  │    - Process job (see below)                            │            │
│  └─────────────────────────────────────────────────────────┘            │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      JOB PROCESSING LOGIC                                │
│  Worker executes based on job_type:                                     │
│                                                                           │
│  IF job_type === 'kb_processing':                                       │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ 1. Load files from payload.files                        │            │
│  │ 2. Chunk documents (500-1000 chars)                    │            │
│  │ 3. For each chunk:                                      │            │
│  │    ┌──────────────────────────────────────────┐        │            │
│  │    │ a. Get AI provider from payload          │        │            │
│  │    │ b. Call embedding API:                   │        │            │
│  │    │    - OpenAI: text-embedding-3-small      │        │            │
│  │    │    - Anthropic: (not available)          │        │            │
│  │    │ c. Get embedding vector (1536 dims)      │        │            │
│  │    │ d. Insert into `embeddings` table:       │        │            │
│  │    │    - content: chunk text                 │        │            │
│  │    │    - embedding: vector                   │        │            │
│  │    │    - kb_id: from payload                 │        │            │
│  │    │    - metadata: {file, page, etc}        │        │            │
│  │    └──────────────────────────────────────────┘        │            │
│  │ 4. Update kb_processing_status table                   │            │
│  │ 5. Mark job as 'completed'                             │            │
│  └─────────────────────────────────────────────────────────┘            │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    AI PROVIDER CALL (OpenAI)                             │
│  Worker makes HTTP request:                                             │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ POST https://api.openai.com/v1/embeddings               │            │
│  │ Headers:                                                 │            │
│  │   Authorization: Bearer sk-...                          │            │
│  │ Body:                                                    │            │
│  │   {                                                      │            │
│  │     model: "text-embedding-3-small",                   │            │
│  │     input: "Document chunk text here..."               │            │
│  │   }                                                      │            │
│  │                                                          │            │
│  │ Response:                                                │            │
│  │   {                                                      │            │
│  │     data: [{                                            │            │
│  │       embedding: [0.023, -0.015, 0.042, ...]          │            │
│  │     }]                                                   │            │
│  │   }                                                      │            │
│  └─────────────────────────────────────────────────────────┘            │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  DATABASE: embeddings TABLE                              │
│  Vector storage with pgvector extension                                 │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ id: uuid                                                 │            │
│  │ kb_id: uuid                                             │            │
│  │ content: "Chunk of text from document..."              │            │
│  │ embedding: vector(1536)  <- pgvector type              │            │
│  │ metadata: {file: 'doc.pdf', page: 3, ...}             │            │
│  │ created_at: now()                                       │            │
│  └─────────────────────────────────────────────────────────┘            │
│                                                                           │
│  Now can search with:                                                   │
│  SELECT * FROM embeddings                                                │
│  ORDER BY embedding <=> '[query_vector]'  -- cosine similarity         │
│  LIMIT 5;                                                                │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       JOB COMPLETION                                     │
│  Worker updates database:                                               │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ UPDATE worker_jobs SET                                   │            │
│  │   status = 'completed',                                 │            │
│  │   completed_at = NOW(),                                 │            │
│  │   result = {                                            │            │
│  │     chunks_processed: 150,                              │            │
│  │     embeddings_created: 150,                           │            │
│  │     cost: 0.023                                        │            │
│  │   }                                                      │            │
│  │ WHERE id = 'job_uuid';                                  │            │
│  │                                                          │            │
│  │ INSERT INTO ai_usage_log (...)                          │            │
│  │   -- Log cost & usage                                   │            │
│  └─────────────────────────────────────────────────────────┘            │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    USER SEES RESULT                                      │
│  Frontend polls /api/jobs/{job_id} every 2 seconds                     │
│  Shows progress, then displays "✓ Knowledge Base Processed!"           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 WORKER TYPES & AI INTEGRATION

### **1. KB Processing Worker**
```typescript
// Job Type: kb_processing
// AI Usage: Embeddings (OpenAI, Google)

async function processKBJob(job) {
    const { files, kb_id, provider_id } = job.payload;
    
    // Get AI provider
    const provider = await getProvider(provider_id);
    
    for (const file of files) {
        // Chunk document
        const chunks = chunkDocument(file, 500);
        
        for (const chunk of chunks) {
            // Call embedding API
            const embedding = await callEmbeddingAPI(
                provider,
                chunk.text
            );
            
            // Store in database
            await insertEmbedding({
                kb_id,
                content: chunk.text,
                embedding,
                metadata: chunk.metadata
            });
        }
    }
    
    return { chunks_processed: chunks.length };
}
```

### **2. Content Generation Worker**
```typescript
// Job Type: content_generation
// AI Usage: Chat Completion (OpenAI, Anthropic, Google)

async function generateContentJob(job) {
    const { prompt, brain_id, provider_id } = job.payload;
    
    // Get brain config
    const brain = await getBrain(brain_id);
    
    // Get AI provider
    const provider = await getProvider(provider_id);
    
    // Call chat API
    const content = await callChatAPI(provider, {
        model: brain.preferred_model,
        systemPrompt: brain.system_prompt,
        userPrompt: prompt,
        temperature: brain.temperature
    });
    
    // Log usage & cost
    await logUsage({
        provider_id,
        tokens_used: content.tokens,
        cost: calculateCost(content.tokens, provider.pricing)
    });
    
    return { content: content.text };
}
```

### **3. Data Analysis Worker**
```typescript
// Job Type: data_analysis
// AI Usage: Function Calling + Chat

async function analyzeDataJob(job) {
    const { data_source, analysis_type } = job.payload;
    
    // Load data
    const data = await loadData(data_source);
    
    // Prepare for AI
    const context = prepareDataContext(data);
    
    // Call AI with function calling
    const analysis = await callAIWithTools({
        tools: ['chart_generator', 'statistics_calculator'],
        context,
        task: analysis_type
    });
    
    return { 
        insights: analysis.insights,
        visualizations: analysis.charts 
    };
}
```

---

## 🎯 KEY INTEGRATION POINTS

### **How Worker Knows Which AI Provider:**

```sql
-- Job payload includes provider_id
{
  "provider_id": "uuid-of-openai-provider",
  "brain_id": "uuid-of-brain",
  "model": "gpt-4o-mini"
}

-- Worker fetches:
SELECT api_key, provider 
FROM ai_providers 
WHERE id = 'uuid';

-- Then calls appropriate API
```

### **Failover Mechanism:**

```typescript
async function executeWithFailover(job) {
    // Get all providers for this org, ordered by priority
    const providers = await getProvidersForOrg(
        job.organization_id,
        { order: 'priority' }
    );
    
    for (const provider of providers) {
        try {
            const result = await callAI(provider, job.payload);
            return result;
        } catch (error) {
            // Mark failure, try next
            await incrementProviderFailure(provider.id);
            continue;
        }
    }
    
    throw new Error('All providers failed');
}
```

---

## 📊 COST TRACKING FLOW

```
Worker Process → AI API Call → Count Tokens → Calculate Cost → Log to DB
                                                                    ↓
                                            Analytics Dashboard ← Query aggregations
```

---

## 🚀 DEPLOYMENT FLOW

```bash
# On VPS (103.190.93.28)

# 1. Worker runs as PM2 process
pm2 start ecosystem.config.js

# 2. Worker code:
while (true) {
    job = await fetchPendingJob();
    if (job) {
        await processJob(job);
    }
    await sleep(5000); // Poll every 5s
}

# 3. Controlled from Axiom UI:
POST /api/superadmin/vps/workers
{
  "action": "restart",
  "worker": "lekhika-worker"
}
```

---

## 💡 WHY THIS ARCHITECTURE?

✅ **Scalability** - Add more workers horizontally  
✅ **Reliability** - Jobs survive crashes  
✅ **Monitoring** - Track progress in DB  
✅ **Cost Control** - Log every AI call  
✅ **Failover** - Switch providers automatically  
✅ **Debugging** - Full job history  

---

**Deploy workers on any VPS, control from UI, track everything! 🎯**
