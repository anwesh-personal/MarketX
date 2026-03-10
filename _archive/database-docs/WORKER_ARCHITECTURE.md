# ⚡ WORKER-BASED ARCHITECTURE

## Overview

Axiom Engine uses a **frontend-first + worker-based** architecture:

- **Frontend (Next.js)**: Direct Supabase queries for CRUD operations
- **Workers (VPS)**: Async processing for AI/LLM operations
- **Queue**: Job management for scalable execution

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                  FRONTEND (Next.js + Vercel)             │
│  ├─ Direct Supabase client (RLS protected)              │
│  ├─ Real-time updates                                    │
│  ├─ File uploads                                         │
│  └─ Creates jobs via createJob() function                │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│                  SUPABASE (Postgres + Auth)              │
│  ├─ PostgreSQL with RLS                                  │
│  ├─ Auth (Email, OAuth)                                  │
│  ├─ Storage (for KB files, exports)                      │
│  ├─ Jobs table (queue)                                   │
│  └─ Realtime subscriptions                               │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│                  WORKERS (VPS/Cloud)                     │
│  ┌─────────────────┬─────────────────┬─────────────────┐ │
│  │  Writer Worker  │ Learning Worker │Analytics Worker │ │
│  │  (LLM calls)    │ (Daily 6 AM)    │ (Aggregation)   │ │
│  └─────────────────┴─────────────────┴─────────────────┘ │
│                            ↓                              │
│  ┌──────────────────────────────────────────────────┐    │
│  │  LLM APIs (OpenAI, Anthropic, etc.)              │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

---

## Worker Types

### **1. Writer Worker**
**Purpose:** Generate content (website, email flows, replies, social)

**Triggered by:**
- User clicks "Manual Run" button
- Scheduled daily run (6 AM)

**Process:**
1. Poll for `job_type = 'writer_run'`
2. Fetch active KB for org
3. Call LLM APIs with prompts
4. Validate output against Zod schemas
5. Store in `generated_content` table
6. Update job status to `completed`

**Resources:**
- High CPU (for prompt processing)
- High memory (handling large KBs)
- LLM API quota

**Deployment:** 1-3 instances (based on load)

---

### **2. Learning Worker**
**Purpose:** Analyze analytics and update KB preferences

**Triggered by:**
- Daily cron (6 AM Eastern)
- Manual trigger by admin

**Process:**
1. Poll for `job_type = 'learning_loop'`
2. Fetch analytics for previous day (org-scoped)
3. Calculate metrics (booked_call_rate, etc.)
4. Apply winner/loser policies
5. Update KB JSONB (add preferences, pause patterns)
6. Log mutations to `learning_history`
7. Update job status to `completed`

**Resources:**
- Medium CPU (for aggregations)
- Medium memory
- Database-heavy

**Deployment:** 1 instance (daily batch job)

---

### **3. Analytics Worker**
**Purpose:** Pre-aggregate metrics for dashboards

**Triggered by:**
- Every hour (cron)
- On-demand when viewing analytics

**Process:**
1. Poll for `job_type = 'analytics_aggregation'`
2. Fetch raw events from `analytics_events`
3. Group by variant_id, context
4. Calculate rates
5. Insert into `aggregated_metrics`
6. Update job status to `completed`

**Resources:**
- Low CPU
- Medium memory
- Database-heavy

**Deployment:** 1 instance

---

## Job Queue System

### **Creating Jobs (Frontend)**

```typescript
// From Next.js frontend
import { supabase } from '@/lib/supabase';

// Trigger a manual run
async function triggerRun(icpId: string, offerId: string) {
  const { data, error } = await supabase.rpc('create_job', {
    p_job_type: 'writer_run',
    p_org_id: user.org_id, // Automatically from auth.uid()
    p_payload: {
      input: {
        icp: { icp_id: icpId },
        offer: { offer_id: offerId },
        buyer_stage: 'CONSIDERATION',
        generation_requests: {
          website: {
            page_types: ['LANDING', 'PRICING_PHILOSOPHY'],
            routing_required: true,
          }
        }
      }
    },
    p_priority: 10 // Higher priority for manual runs
  });

  if (error) throw error;
  
  // Return job ID to track progress
  return data;
}
```

---

### **Processing Jobs (Worker)**

```typescript
// Worker polling loop
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function processJobs() {
  while (true) {
    // Claim next job
    const { data: job } = await supabase.rpc('claim_next_job', {
      p_worker_id: 'writer-worker-1',
      p_job_type: 'writer_run'
    });

    if (!job) {
      await sleep(5000); // Wait 5s if no jobs
      continue;
    }

    try {
      // Process job
      const result = await executeWriterRun(job.payload.input);

      // Mark complete
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result
        })
        .eq('id', job.job_id);

    } catch (error) {
      // Mark failed
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error: { message: error.message, stack: error.stack }
        })
        .eq('id', job.job_id);
    }
  }
}
```

---

## Worker Deployment

### **Option 1: Single VPS (Cost-Effective)**

```bash
# DigitalOcean/Hetzner VPS ($20/month)
# Run all workers on one server

docker-compose.yml:
services:
  writer-worker:
    build: ./workers/writer
    environment:
      - SUPABASE_URL
      - SUPABASE_SERVICE_KEY
      - OPENAI_API_KEY
    restart: always

  learning-worker:
    build: ./workers/learning
    environment:
      - SUPABASE_URL
      - SUPABASE_SERVICE_KEY
    restart: always

  analytics-worker:
    build: ./workers/analytics
    environment:
      - SUPABASE_URL
      - SUPABASE_SERVICE_KEY
    restart: always
```

**Cost:** ~$20-40/month
**Handles:** 100-500 runs/month

---

### **Option 2: Serverless Workers (Auto-Scaling)**

```typescript
// Vercel serverless function (runs on-demand)
// api/workers/writer.ts

export default async function handler(req, res) {
  const { job_id } = req.body;

  // Fetch job
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', job_id)
    .single();

  // Process
  const result = await executeWriterRun(job.payload.input);

  // Update
  await supabase
    .from('jobs')
    .update({ status: 'completed', result })
    .eq('id', job_id);

  res.json({ success: true });
}
```

**Cost:** Pay per execution
**Handles:** Unlimited (auto-scales)

---

### **Option 3: Kubernetes (Enterprise)**

For high-volume:
- Auto-scaling based on queue depth
- Separate LLM rate limiting per worker
- Redis for distributed locking
- Prometheus monitoring

---

## Superadmin Dashboard

### **Platform-Level Features**

```
/admin (Superadmin Only)
├── Organizations
│   ├── View all orgs
│   ├── Suspend/activate accounts
│   ├── Override quotas
│   └── View org usage
├── Users
│   ├── View all platform users
│   ├── Deactivate users
│   └── Grant/revoke permissions
├── Billing
│   ├── MRR/ARR stats
│   ├── Churn analysis
│   ├── Failed payments
│   └── Manual subscription adjustments
├── System Health
│   ├── Worker status (live heartbeats)
│   ├── Job queue depth
│   ├── LLM API usage/costs
│   └── Database performance
└── Usage Stats
    ├── Total runs today/month
    ├── Tokens consumed
    ├── Revenue analytics
    └── User engagement
```

### **Access Control**

```typescript
// Middleware for superadmin routes
export async function middleware(req: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.redirect('/login');
  }

  // Check if platform admin
  const { data: admin } = await supabase
    .from('platform_admins')
    .select('*')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  if (!admin) {
    return NextResponse.redirect('/dashboard'); // Regular user dashboard
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
```

---

## Benefits of This Architecture

### **1. Scalability**
- Frontend scales infinitely (Vercel CDN)
- Workers scale based on load
- Database handles via Supabase

### **2. Cost Efficiency**
- No backend server for CRUD (Supabase RLS)
- Workers only run when needed
- LLM costs are per-job (pay for what you use)

### **3. Reliability**
- Job queue ensures no lost runs
- Retry logic on failures
- Worker heartbeats detect crashes

### **4. Multi-Tenancy**
- RLS enforces data isolation
- Each worker job is org-scoped
- Superadmin can monitor all

### **5. Real-Time**
- Frontend subscribes to job status changes
- Live updates on run progress
- No polling needed

---

## Frontend Implementation

### **Job Status Tracking**

```typescript
// Real-time job status subscription
useEffect(() => {
  const subscription = supabase
    .channel('job-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `org_id=eq.${user.org_id}`
      },
      (payload) => {
        const job = payload.new;
        
        if (job.status === 'completed') {
          toast.success('Run completed!');
          refetchRuns();
        } else if (job.status === 'failed') {
          toast.error('Run failed');
        }
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, [user.org_id]);
```

---

## Next Steps

1. ✅ Run migrations (adds jobs, workers, platform_admins tables)
2. ✅ Build worker Docker containers
3. ✅ Deploy workers to VPS
4. ✅ Create superadmin dashboard in frontend
5. ✅ Test job creation from frontend
6. ✅ Monitor worker health

**Ready for production SaaS!** 🚀
