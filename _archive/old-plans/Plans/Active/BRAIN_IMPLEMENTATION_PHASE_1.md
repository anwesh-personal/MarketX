# AXIOM BRAIN - Complete Implementation Plan
## Hybrid Architecture: Config-Driven, Embedded Execution

> **Status:** Active Development Plan  
> **Architecture:** Hybrid (Superadmin Configuration + In-App Execution)  
> **Timeline:** 16 Weeks  
> **Team Size:** 2-3 Full-Stack Engineers  
> **Complexity:** Enterprise-Grade

---

## 🎯 Overview

This plan implements a **hybrid brain architecture** where:
- Superadmin creates and manages brain templates
- Brains execute embedded in user app (low latency)
- Heavy processing offloaded to workers
- Multi-tenant, multi-brain support
- Real-time configuration updates

---

## 📊 Phase Structure

Each phase includes:
1. **Database Migrations** - Complete SQL
2. **Backend Services** - Full TypeScript implementation
3. **API Routes** - Complete endpoints with validation
4. **Frontend Components** - Production-ready UI
5. **Worker Jobs** - Background processing
6. **Tests** - Unit + Integration + E2E
7. **Success Metrics** - Measurable outcomes

---

## Phase 1: Foundation - Brain Configuration System
**Duration:** Week 1-2  
**Goal:** Database schema + brain template management

### 1.1 Database Migrations

**File:** `database/migrations/001_brain_system.sql`
```sql
-- ============================================================
-- BRAIN TEMPLATE SYSTEM
-- ============================================================

-- Brain templates created by superadmin
CREATE TABLE brain_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  pricing_tier VARCHAR(50) CHECK (pricing_tier IN ('free', 'starter', 'pro', 'enterprise')),
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES platform_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, version)
);

CREATE INDEX brain_templates_active_idx ON brain_templates(is_active, pricing_tier);
CREATE INDEX brain_templates_name_idx ON brain_templates(name);

-- Org-specific brain assignments
CREATE TABLE org_brain_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brain_template_id UUID NOT NULL REFERENCES brain_templates(id),
  custom_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES platform_admins(id),
  UNIQUE(org_id, brain_template_id)
);

CREATE INDEX org_brain_org_idx ON org_brain_assignments(org_id, is_active);

-- Brain version history for rollbacks
CREATE TABLE brain_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_template_id UUID REFERENCES brain_templates(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID REFERENCES platform_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX brain_history_template_idx ON brain_version_history(brain_template_id, created_at DESC);

-- A/B testing configurations
CREATE TABLE brain_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  control_brain_id UUID REFERENCES brain_templates(id),
  variant_brain_id UUID REFERENCES brain_templates(id),
  traffic_split FLOAT DEFAULT 0.5 CHECK (traffic_split >= 0 AND traffic_split <= 1),
  org_ids UUID[] DEFAULT '{}',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX brain_ab_active_idx ON brain_ab_tests(is_active, start_date);

-- Track which brain served which request (for A/B analysis)
CREATE TABLE brain_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  brain_template_id UUID REFERENCES brain_templates(id),
  ab_test_id UUID REFERENCES brain_ab_tests(id),
  request_type VARCHAR(50),
  response_time_ms INTEGER,
  tokens_used INTEGER,
  feedback_rating INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX brain_logs_org_idx ON brain_request_logs(org_id, created_at DESC);
CREATE INDEX brain_logs_ab_idx ON brain_request_logs(ab_test_id, created_at DESC);

-- Materialized view for brain performance metrics
CREATE MATERIALIZED VIEW brain_performance_stats AS
SELECT 
  brain_template_id,
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  AVG(response_time_ms) as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
  SUM(tokens_used) as total_tokens,
  AVG(feedback_rating) as avg_rating,
  COUNT(CASE WHEN feedback_rating >= 4 THEN 1 END)::FLOAT / NULLIF(COUNT(feedback_rating), 0) as satisfaction_rate
FROM brain_request_logs
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY brain_template_id, DATE(created_at);

CREATE INDEX brain_perf_brain_date_idx ON brain_performance_stats(brain_template_id, date DESC);

-- Refresh schedule
CREATE OR REPLACE FUNCTION refresh_brain_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY brain_performance_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DEFAULT BRAIN TEMPLATES
-- ============================================================

-- Insert default brain templates
INSERT INTO brain_templates (name, version, description, config, is_default, pricing_tier) VALUES
(
  'Standard Chat Brain',
  '1.0.0',
  'General-purpose conversational AI with knowledge base access',
  '{
    "models": {
      "chat": "gpt-4-turbo-preview",
      "embeddings": "text-embedding-3-large",
      "completion": "gpt-3.5-turbo"
    },
    "agents": {
      "chat": {
        "systemPrompt": "You are a helpful AI assistant. Use the knowledge base to provide accurate, contextual answers.",
        "temperature": 0.7,
        "maxTokens": 2000,
        "tools": ["kb_search", "memory_recall"]
      }
    },
    "rag": {
      "enabled": true,
      "topK": 5,
      "minSimilarity": 0.7,
      "rerankingEnabled": false,
      "hybridSearch": true,
      "weights": {
        "vector": 0.7,
        "fts": 0.3
      }
    },
    "memory": {
      "maxContextTokens": 8000,
      "maxMemoryTokens": 1500,
      "conversationWindowSize": 10,
      "enableSummarization": true
    },
    "limits": {
      "maxRequestsPerMinute": 10,
      "maxTokensPerDay": 50000
    }
  }',
  true,
  'free'
),
(
  'Pro Writer Brain',
  '1.0.0',
  'Advanced content generation with multi-agent orchestration',
  '{
    "models": {
      "chat": "gpt-4-turbo-preview",
      "embeddings": "text-embedding-3-large",
      "completion": "gpt-4-turbo-preview"
    },
    "agents": {
      "writer": {
        "systemPrompt": "You are an expert content writer. Create engaging, well-structured content based on the knowledge base and user instructions.",
        "temperature": 0.8,
        "maxTokens": 4000,
        "tools": ["kb_search", "web_search", "style_analyzer"]
      },
      "editor": {
        "systemPrompt": "Review and refine content for clarity, grammar, and style.",
        "temperature": 0.3,
        "maxTokens": 4000,
        "tools": ["grammar_check", "style_guide"]
      }
    },
    "rag": {
      "enabled": true,
      "topK": 10,
      "minSimilarity": 0.65,
      "rerankingEnabled": true,
      "hybridSearch": true,
      "weights": {
        "vector": 0.6,
        "fts": 0.4
      }
    },
    "memory": {
      "maxContextTokens": 16000,
      "maxMemoryTokens": 3000,
      "conversationWindowSize": 20,
      "enableSummarization": true
    },
    "limits": {
      "maxRequestsPerMinute": 50,
      "maxTokensPerDay": 500000
    },
    "features": {
      "multiAgent": true,
      "streamingEnabled": true,
      "contentAnalysis": true
    }
  }',
  false,
  'pro'
),
(
  'Enterprise Custom Brain',
  '1.0.0',
  'Fully customizable brain with all features enabled',
  '{
    "models": {
      "chat": "gpt-4-turbo-preview",
      "embeddings": "text-embedding-3-large",
      "completion": "gpt-4-turbo-preview",
      "vision": "gpt-4-vision-preview"
    },
    "agents": {
      "writer": {
        "systemPrompt": "Expert content writer with access to all tools.",
        "temperature": 0.8,
        "maxTokens": 8000,
        "tools": ["kb_search", "web_search", "image_analysis", "data_viz"]
      },
      "analyst": {
        "systemPrompt": "Data analyst capable of complex analysis and insights.",
        "temperature": 0.2,
        "maxTokens": 4000,
        "tools": ["sql_query", "data_analysis", "chart_generation"]
      },
      "coach": {
        "systemPrompt": "Productivity coach with deep user understanding.",
        "temperature": 0.7,
        "maxTokens": 2000,
        "tools": ["memory_recall", "goal_tracking", "habit_analysis"]
      }
    },
    "rag": {
      "enabled": true,
      "topK": 15,
      "minSimilarity": 0.6,
      "rerankingEnabled": true,
      "hybridSearch": true,
      "weights": {
        "vector": 0.5,
        "fts": 0.5
      },
      "graphMemory": true
    },
    "memory": {
      "maxContextTokens": 32000,
      "maxMemoryTokens": 8000,
      "conversationWindowSize": 50,
      "enableSummarization": true,
      "temporalMemory": true,
      "causalReasoning": true
    },
    "limits": {
      "maxRequestsPerMinute": 200,
      "maxTokensPerDay": 10000000
    },
    "features": {
      "multiAgent": true,
      "streamingEnabled": true,
      "contentAnalysis": true,
      "multiModal": true,
      "rlhf": true,
      "abTesting": true,
      "customTools": true
    }
  }',
  false,
  'enterprise'
);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_brain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brain_templates_updated_at 
BEFORE UPDATE ON brain_templates
FOR EACH ROW EXECUTE FUNCTION update_brain_updated_at();

-- Save version history on config change
CREATE OR REPLACE FUNCTION save_brain_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.config IS DISTINCT FROM NEW.config THEN
    INSERT INTO brain_version_history (brain_template_id, version, config, created_by)
    VALUES (NEW.id, NEW.version, OLD.config, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brain_version_history_trigger
BEFORE UPDATE ON brain_templates
FOR EACH ROW EXECUTE FUNCTION save_brain_version();
```

### 1.2 Backend Services

**File:** `apps/frontend/src/services/brain/BrainConfigService.ts`
```typescript
import { createClient } from '@/lib/supabase/server'

export interface BrainConfig {
  models: {
    chat: string
    embeddings: string
    completion?: string
    vision?: string
  }
  agents: Record<string, AgentConfig>
  rag: RAGConfig
  memory: MemoryConfig
  limits: LimitsConfig
  features?: FeaturesConfig
}

export interface AgentConfig {
  systemPrompt: string
  temperature: number
  maxTokens: number
  tools: string[]
}

export interface RAGConfig {
  enabled: boolean
  topK: number
  minSimilarity: number
  rerankingEnabled: boolean
  hybridSearch: boolean
  weights: {
    vector: number
    fts: number
  }
  graphMemory?: boolean
}

export interface MemoryConfig {
  maxContextTokens: number
  maxMemoryTokens: number
  conversationWindowSize: number
  enableSummarization: boolean
  temporalMemory?: boolean
  causalReasoning?: boolean
}

export interface LimitsConfig {
  maxRequestsPerMinute: number
  maxTokensPerDay: number
}

export interface FeaturesConfig {
  multiAgent?: boolean
  streamingEnabled?: boolean
  contentAnalysis?: boolean
  multiModal?: boolean
  rlhf?: boolean
  abTesting?: boolean
  customTools?: boolean
}

export interface BrainTemplate {
  id: string
  name: string
  version: string
  description: string
  config: BrainConfig
  isActive: boolean
  isDefault: boolean
  pricingTier: 'free' | 'starter' | 'pro' | 'enterprise'
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

export class BrainConfigService {
  private supabase = createClient()
  
  /**
   * Get all active brain templates
   */
  async listTemplates(tier?: string): Promise<BrainTemplate[]> {
    let query = this.supabase
      .from('brain_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (tier) {
      query = query.eq('pricing_tier', tier)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data || []
  }
  
  /**
   * Get brain template by ID
   */
  async getTemplate(id: string): Promise<BrainTemplate | null> {
    const { data, error } = await this.supabase
      .from('brain_templates')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * Create new brain template (Superadmin only)
   */
  async createTemplate(
    template: Omit<BrainTemplate, 'id' | 'createdAt' | 'updatedAt'>,
    adminId: string
  ): Promise<BrainTemplate> {
    const { data, error } = await this.supabase
      .from('brain_templates')
      .insert({
        ...template,
        created_by: adminId
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * Update brain template
   */
  async updateTemplate(
    id: string,
    updates: Partial<BrainTemplate>,
    adminId: string
  ): Promise<BrainTemplate> {
    const { data, error } = await this.supabase
      .from('brain_templates')
      .update({
        ...updates,
        created_by: adminId // Track who made the change
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  /**
   * Get org's assigned brain
   */
  async getOrgBrain(orgId: string): Promise<BrainTemplate & { customConfig?: any }> {
    const { data, error } = await this.supabase
      .from('org_brain_assignments')
      .select(`
        custom_config,
        brain_template:brain_templates(*)
      `)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .single()
    
    if (error) {
      // No assignment - return default brain
      const { data: defaultBrain } = await this.supabase
        .from('brain_templates')
        .select('*')
        .eq('is_default', true)
        .single()
      
      return defaultBrain
    }
    
    // Merge template config with custom overrides
    const template = (data as any).brain_template
    const customConfig = data.custom_config || {}
    
    return {
      ...template,
      config: this.mergeConfigs(template.config, customConfig),
      customConfig
    }
  }
  
  /**
   * Assign brain to org
   */
  async assignBrainToOrg(
    orgId: string,
    brainTemplateId: string,
    customConfig?: any,
    adminId?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('org_brain_assignments')
      .upsert({
        org_id: orgId,
        brain_template_id: brainTemplateId,
        custom_config: customConfig || {},
        assigned_by: adminId
      })
    
    if (error) throw error
  }
  
  /**
   * Get brain version history
   */
  async getVersionHistory(brainTemplateId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('brain_version_history')
      .select('*')
      .eq('brain_template_id', brainTemplateId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) throw error
    return data || []
  }
  
  /**
   * Rollback to previous version
   */
  async rollbackToVersion(
    brainTemplateId: string,
    versionId: string,
    adminId: string
  ): Promise<BrainTemplate> {
    // Get version config
    const { data: version, error: versionError } = await this.supabase
      .from('brain_version_history')
      .select('config, version')
      .eq('id', versionId)
      .single()
    
    if (versionError) throw versionError
    
    // Update template
    return this.updateTemplate(
      brainTemplateId,
      {
        config: version.config,
        version: `${version.version}-rollback-${Date.now()}`
      },
      adminId
    )
  }
  
  /**
   * Deep merge configs (custom overrides template)
   */
  private mergeConfigs(template: any, custom: any): any {
    if (!custom || Object.keys(custom).length === 0) return template
    
    const merged = { ...template }
    
    for (const key in custom) {
      if (typeof custom[key] === 'object' && !Array.isArray(custom[key])) {
        merged[key] = this.mergeConfigs(template[key] || {}, custom[key])
      } else {
        merged[key] = custom[key]
      }
    }
    
    return merged
  }
  
  /**
   * Log brain request for analytics
   */
  async logRequest(log: {
    orgId: string
    userId?: string
    brainTemplateId: string
    abTestId?: string
    requestType: string
    responseTimeMs: number
    tokensUsed: number
    feedbackRating?: number
    metadata?: any
  }): Promise<void> {
    const { error } = await this.supabase
      .from('brain_request_logs')
      .insert({
        org_id: log.orgId,
        user_id: log.userId,
        brain_template_id: log.brainTemplateId,
        ab_test_id: log.abTestId,
        request_type: log.requestType,
        response_time_ms: log.responseTimeMs,
        tokens_used: log.tokensUsed,
        feedback_rating: log.feedbackRating,
        metadata: log.metadata || {}
      })
    
    if (error) console.error('Failed to log brain request:', error)
  }
  
  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(
    brainTemplateId: string,
    days: number = 30
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('brain_performance_stats')
      .select('*')
      .eq('brain_template_id', brainTemplateId)
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: false })
    
    if (error) throw error
    return data || []
  }
}

// Singleton instance
export const brainConfigService = new BrainConfigService()
```

### 1.3 API Routes

**File:** `apps/frontend/src/app/api/superadmin/brains/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { brainConfigService } from '@/services/brain/BrainConfigService'
import { requireSuperadmin } from '@/lib/auth'

const createBrainSchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().optional(),
  config: z.object({
    models: z.object({
      chat: z.string(),
      embeddings: z.string(),
      completion: z.string().optional(),
      vision: z.string().optional()
    }),
    agents: z.record(z.object({
      systemPrompt: z.string(),
      temperature: z.number().min(0).max(2),
      maxTokens: z.number().positive(),
      tools: z.array(z.string())
    })),
    rag: z.object({
      enabled: z.boolean(),
      topK: z.number().positive(),
      minSimilarity: z.number().min(0).max(1),
      rerankingEnabled: z.boolean(),
      hybridSearch: z.boolean(),
      weights: z.object({
        vector: z.number().min(0).max(1),
        fts: z.number().min(0).max(1)
      })
    }),
    memory: z.object({
      maxContextTokens: z.number().positive(),
      maxMemoryTokens: z.number().positive(),
      conversationWindowSize: z.number().positive(),
      enableSummarization: z.boolean()
    }),
    limits: z.object({
      maxRequestsPerMinute: z.number().positive(),
      maxTokensPerDay: z.number().positive()
    })
  }),
  pricingTier: z.enum(['free', 'starter', 'pro', 'enterprise']),
  isDefault: z.boolean().optional()
})

// GET /api/superadmin/brains - List all brain templates
export async function GET(req: NextRequest) {
  try {
    const admin = await requireSuperadmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(req.url)
    const tier = searchParams.get('tier')
    
    const templates = await brainConfigService.listTemplates(tier || undefined)
    
    return NextResponse.json({ templates })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/superadmin/brains - Create new brain template
export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperadmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await req.json()
    const validated = createBrainSchema.parse(body)
    
    const template = await brainConfigService.createTemplate(
      {
        ...validated,
        isActive: true,
        metadata: {}
      },
      admin.id
    )
    
    return NextResponse.json({ template }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

**File:** `apps/frontend/src/app/api/superadmin/brains/[id]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { brainConfigService } from '@/services/brain/BrainConfigService'
import { requireSuperadmin } from '@/lib/auth'

// GET /api/superadmin/brains/:id - Get specific brain template
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireSuperadmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const template = await brainConfigService.getTemplate(params.id)
    
    if (!template) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    
    return NextResponse.json({ template })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// PATCH /api/superadmin/brains/:id - Update brain template
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireSuperadmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const updates = await req.json()
    
    const template = await brainConfigService.updateTemplate(
      params.id,
      updates,
      admin.id
    )
    
    return NextResponse.json({ template })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/superadmin/brains/:id - Deactivate brain template
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireSuperadmin(req)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    await brainConfigService.updateTemplate(
      params.id,
      { isActive: false },
      admin.id
    )
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

**Continued in next file...**
