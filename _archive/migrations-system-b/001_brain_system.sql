-- ============================================================
-- AXIOM BRAIN - MIGRATION 001: Brain Configuration System
-- Created: 2026-01-15
-- Description: Core brain template management, org assignments, 
--              version control, A/B testing, and performance tracking
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BRAIN TEMPLATES
-- ============================================================

-- Brain templates created and managed by superadmin
CREATE TABLE brain_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  pricing_tier VARCHAR(50) NOT NULL CHECK (pricing_tier IN ('echii', 'pulz', 'quanta')),
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES platform_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, version)
);

-- Indexes for efficient querying
CREATE INDEX brain_templates_active_idx ON brain_templates(is_active, pricing_tier);
CREATE INDEX brain_templates_name_idx ON brain_templates(name);
CREATE INDEX brain_templates_tier_idx ON brain_templates(pricing_tier);
CREATE INDEX brain_templates_created_idx ON brain_templates(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE brain_templates IS 'AI brain configurations created by superadmin';
COMMENT ON COLUMN brain_templates.pricing_tier IS 'Echii (basic), Pulz (mid), Quanta (enterprise)';
COMMENT ON COLUMN brain_templates.config IS 'Complete brain configuration including models, agents, RAG settings';

-- ============================================================
-- ORG BRAIN ASSIGNMENTS
-- ============================================================

-- Track which brain template is assigned to each organization
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

-- Indexes
CREATE INDEX org_brain_org_idx ON org_brain_assignments(org_id, is_active);
CREATE INDEX org_brain_template_idx ON org_brain_assignments(brain_template_id);
CREATE INDEX org_brain_assigned_idx ON org_brain_assignments(assigned_at DESC);

-- Comments
COMMENT ON TABLE org_brain_assignments IS 'Maps organizations to their assigned brain templates';
COMMENT ON COLUMN org_brain_assignments.custom_config IS 'Org-specific config overrides merged with template config';

-- ============================================================
-- BRAIN VERSION HISTORY
-- ============================================================

-- Track all changes to brain templates for rollback capability
CREATE TABLE brain_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_template_id UUID REFERENCES brain_templates(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID REFERENCES platform_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX brain_history_template_idx ON brain_version_history(brain_template_id, created_at DESC);
CREATE INDEX brain_history_created_idx ON brain_version_history(created_at DESC);

-- Comments
COMMENT ON TABLE brain_version_history IS 'Complete version history of brain template configurations for audit and rollback';

-- ============================================================
-- A/B TESTING FRAMEWORK
-- ============================================================

-- A/B tests for comparing brain configurations
CREATE TABLE brain_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  control_brain_id UUID REFERENCES brain_templates(id),
  variant_brain_id UUID REFERENCES brain_templates(id),
  traffic_split FLOAT DEFAULT 0.5 CHECK (traffic_split >= 0 AND traffic_split <= 1),
  org_ids UUID[] DEFAULT '{}',
  user_ids UUID[] DEFAULT '{}',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metrics JSONB DEFAULT '{}',
  winner VARCHAR(20) CHECK (winner IN ('control', 'variant', 'inconclusive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX brain_ab_active_idx ON brain_ab_tests(is_active, start_date);
CREATE INDEX brain_ab_control_idx ON brain_ab_tests(control_brain_id);
CREATE INDEX brain_ab_variant_idx ON brain_ab_tests(variant_brain_id);
CREATE INDEX brain_ab_dates_idx ON brain_ab_tests(start_date, end_date);

-- Comments
COMMENT ON TABLE brain_ab_tests IS 'A/B test configurations for comparing brain performance';
COMMENT ON COLUMN brain_ab_tests.traffic_split IS 'Percentage of traffic sent to variant (0.5 = 50/50 split)';

-- ============================================================
-- BRAIN REQUEST LOGS
-- ============================================================

-- Track every brain request for analytics and A/B testing
CREATE TABLE brain_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  brain_template_id UUID REFERENCES brain_templates(id),
  ab_test_id UUID REFERENCES brain_ab_tests(id),
  request_type VARCHAR(50) NOT NULL,
  response_time_ms INTEGER,
  tokens_used INTEGER,
  feedback_rating INTEGER CHECK (feedback_rating IN (-1, 0, 1)),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX brain_logs_org_idx ON brain_request_logs(org_id, created_at DESC);
CREATE INDEX brain_logs_brain_idx ON brain_request_logs(brain_template_id, created_at DESC);
CREATE INDEX brain_logs_ab_idx ON brain_request_logs(ab_test_id, created_at DESC);
CREATE INDEX brain_logs_user_idx ON brain_request_logs(user_id, created_at DESC);
CREATE INDEX brain_logs_created_idx ON brain_request_logs(created_at DESC);

-- Partition by month for better performance
-- ALTER TABLE brain_request_logs PARTITION BY RANGE (created_at);
-- (Uncomment and add partitions in production)

-- Comments
COMMENT ON TABLE brain_request_logs IS 'Detailed logs of every brain request for analytics and optimization';

-- ============================================================
-- PERFORMANCE STATISTICS (Materialized View)
-- ============================================================

-- Aggregated performance metrics per brain template
CREATE MATERIALIZED VIEW brain_performance_stats AS
SELECT 
  brain_template_id,
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  AVG(response_time_ms) as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_response_time,
  MIN(response_time_ms) as min_response_time,
  MAX(response_time_ms) as max_response_time,
  SUM(tokens_used) as total_tokens,
  AVG(tokens_used) as avg_tokens,
  COUNT(CASE WHEN feedback_rating = 1 THEN 1 END) as positive_feedback,
  COUNT(CASE WHEN feedback_rating = -1 THEN 1 END) as negative_feedback,
  COUNT(CASE WHEN feedback_rating = 0 THEN 1 END) as neutral_feedback,
  COUNT(CASE WHEN feedback_rating IS NOT NULL THEN 1 END) as total_feedback,
  CASE 
    WHEN COUNT(CASE WHEN feedback_rating IS NOT NULL THEN 1 END) > 0 THEN
      COUNT(CASE WHEN feedback_rating = 1 THEN 1 END)::FLOAT / 
      COUNT(CASE WHEN feedback_rating IS NOT NULL THEN 1 END)
    ELSE NULL
  END as satisfaction_rate
FROM brain_request_logs
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY brain_template_id, DATE(created_at);

-- Index on materialized view
CREATE INDEX brain_perf_brain_date_idx ON brain_performance_stats(brain_template_id, date DESC);
CREATE INDEX brain_perf_date_idx ON brain_performance_stats(date DESC);

-- Comments
COMMENT ON MATERIALIZED VIEW brain_performance_stats IS 'Daily aggregated performance metrics for each brain template';

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to refresh performance stats
CREATE OR REPLACE FUNCTION refresh_brain_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY brain_performance_stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_brain_stats() IS 'Refresh brain performance statistics materialized view';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to save version history on config change
CREATE OR REPLACE FUNCTION save_brain_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only save if config actually changed
  IF OLD.config IS DISTINCT FROM NEW.config THEN
    INSERT INTO brain_version_history (
      brain_template_id,
      version,
      config,
      change_summary,
      created_by
    ) VALUES (
      NEW.id,
      OLD.version,
      OLD.config,
      'Config updated',
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION save_brain_version() IS 'Automatically save brain template version history on config changes';

-- Function to get active brain for org
CREATE OR REPLACE FUNCTION get_org_brain(org_uuid UUID)
RETURNS TABLE (
  brain_id UUID,
  brain_name VARCHAR,
  brain_version VARCHAR,
  brain_config JSONB,
  custom_config JSONB,
  pricing_tier VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bt.id,
    bt.name,
    bt.version,
    bt.config,
    oba.custom_config,
    bt.pricing_tier
  FROM org_brain_assignments oba
  JOIN brain_templates bt ON bt.id = oba.brain_template_id
  WHERE oba.org_id = org_uuid
    AND oba.is_active = true
    AND bt.is_active = true
  LIMIT 1;
  
  -- If no assignment, return default brain
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      bt.id,
      bt.name,
      bt.version,
      bt.config,
      '{}'::JSONB as custom_config,
      bt.pricing_tier
    FROM brain_templates bt
    WHERE bt.is_default = true
      AND bt.is_active = true
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_org_brain(UUID) IS 'Get active brain configuration for an organization';

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER brain_templates_updated_at 
BEFORE UPDATE ON brain_templates
FOR EACH ROW 
EXECUTE FUNCTION update_brain_updated_at();

-- Save version history on config change
CREATE TRIGGER brain_version_history_trigger
BEFORE UPDATE ON brain_templates
FOR EACH ROW 
EXECUTE FUNCTION save_brain_version();

-- ============================================================
-- DEFAULT DATA: Brain Templates
-- ============================================================

-- NOTE: Brain templates use provider_id references instead of hardcoded models
-- Superadmin assigns AI providers via UI
-- Config structure uses provider_id which maps to ai_providers table

-- Insert Echii Brain (Basic Tier)
INSERT INTO brain_templates (
  name,
  version,
  description,
  config,
  is_default,
  pricing_tier,
  is_active
) VALUES (
  'Echii Brain',
  '1.0.0',
  'Smart AI assistant for everyday tasks. Perfect for getting started with AI-powered content and conversations.',
  '{
    "providers": {
      "chat": null,
      "embeddings": null,
      "completion": null
    },
    "agents": {
      "chat": {
        "systemPrompt": "You are a helpful AI assistant. Use the knowledge base to provide accurate, contextual answers. Be concise and friendly.",
        "temperature": 0.7,
        "maxTokens": 2000,
        "tools": ["kb_search", "memory_recall"],
        "providerId": null
      }
    },
    "rag": {
      "enabled": true,
      "topK": 3,
      "minSimilarity": 0.75,
      "rerankingEnabled": false,
      "hybridSearch": true,
      "weights": {
        "vector": 0.7,
        "fts": 0.3
      }
    },
    "memory": {
      "maxContextTokens": 4000,
      "maxMemoryTokens": 1000,
      "conversationWindowSize": 5,
      "enableSummarization": false
    },
    "limits": {
      "maxRequestsPerMinute": 10,
      "maxTokensPerDay": 50000
    },
    "features": {
      "multiAgent": false,
      "streamingEnabled": true,
      "contentAnalysis": false,
      "multiModal": false
    }
  }'::JSONB,
  true,
  'echii',
  true
);

-- Insert Pulz Brain (Mid Tier)
INSERT INTO brain_templates (
  name,
  version,
  description,
  config,
  is_default,
  pricing_tier,
  is_active
) VALUES (
  'Pulz Brain',
  '1.0.0',
  'Advanced AI with multi-agent capabilities. Create professional content, analyze data, and get deep insights with specialist AI agents.',
  '{
    "providers": {
      "chat": null,
      "embeddings": null,
      "completion": null
    },
    "agents": {
      "writer": {
        "systemPrompt": "You are an expert content writer with access to the knowledge base. Create engaging, well-structured content based on user requirements and available context. Always cite sources when using information from the knowledge base.",
        "temperature": 0.8,
        "maxTokens": 4000,
        "tools": ["kb_search", "web_search", "style_analysis", "content_outline"],
        "providerId": null
      },
      "analyst": {
        "systemPrompt": "You are a data analyst capable of interpreting data, generating insights, and creating visualizations. Use SQL queries when needed and explain complex analysis in simple terms.",
        "temperature": 0.2,
        "maxTokens": 3000,
        "tools": ["sql_query", "data_viz", "statistics", "trend_analysis"],
        "providerId": null
      },
      "coach": {
        "systemPrompt": "You are a productivity and growth coach. Help users achieve their goals, build better habits, and stay motivated. Reference their past progress and preferences.",
        "temperature": 0.7,
        "maxTokens": 2000,
        "tools": ["memory_recall", "goal_tracking", "habit_analysis", "progress_report"],
        "providerId": null
      }
    },
    "rag": {
      "enabled": true,
      "topK": 8,
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
      "enableSummarization": true,
      "temporalMemory": false
    },
    "limits": {
      "maxRequestsPerMinute": 60,
      "maxTokensPerDay": 500000
    },
    "features": {
      "multiAgent": true,
      "streamingEnabled": true,
      "contentAnalysis": true,
      "multiModal": false,
      "rlhf": false,
      "abTesting": false
    }
  }'::JSONB,
  false,
  'pulz',
  true
);

-- Insert Quanta Brain (Enterprise Tier)
INSERT INTO brain_templates (
  name,
  version,
  description,
  config,
  is_default,
  pricing_tier,
  is_active
) VALUES (
  'Quanta Brain',
  '1.0.0',
  'Ultimate AI powerhouse with all features unlocked. Multi-modal intelligence, graph memory, causal reasoning, and continuous learning from your feedback.',
  '{
    "providers": {
      "chat": null,
      "embeddings": null,
      "completion": null,
      "vision": null
    },
    "agents": {
      "writer": {
        "systemPrompt": "You are a world-class content writer with access to comprehensive knowledge bases and advanced tools. Create exceptional, engaging content that exceeds professional standards. Cite sources meticulously.",
        "temperature": 0.8,
        "maxTokens": 8000,
        "tools": ["kb_search", "web_search", "image_analysis", "style_analysis", "content_outline", "grammar_check", "seo_optimize"],
        "providerId": null
      },
      "analyst": {
        "systemPrompt": "You are an elite data analyst with expertise in complex analysis, statistical modeling, and predictive analytics. Generate actionable insights and create compelling visualizations.",
        "temperature": 0.2,
        "maxTokens": 6000,
        "tools": ["sql_query", "data_viz", "statistics", "trend_analysis", "ml_predict", "causal_analysis"],
        "providerId": null
      },
      "coach": {
        "systemPrompt": "You are a transformative productivity and personal growth coach. Leverage deep user understanding from memory systems to provide personalized, impactful guidance.",
        "temperature": 0.7,
        "maxTokens": 4000,
        "tools": ["memory_recall", "goal_tracking", "habit_analysis", "progress_report", "temporal_patterns", "behavioral_insights"],
        "providerId": null
      },
      "generalist": {
        "systemPrompt": "You are an exceptionally knowledgeable AI assistant capable of handling any query with expertise. Provide comprehensive, accurate responses using all available tools and knowledge.",
        "temperature": 0.7,
        "maxTokens": 4000,
        "tools": ["kb_search", "web_search", "memory_recall", "calculator", "code_execution"],
        "providerId": null
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
      "graphMemory": true,
      "causalReasoning": true
    },
    "memory": {
      "maxContextTokens": 32000,
      "maxMemoryTokens": 8000,
      "conversationWindowSize": 50,
      "enableSummarization": true,
      "temporalMemory": true,
      "causalReasoning": true,
      "graphMemory": true
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
      "customTools": true,
      "advancedAnalytics": true,
      "apiAccess": true,
      "prioritySupport": true
    }
  }'::JSONB,
  false,
  'quanta',
  true
);

-- ============================================================
-- GRANTS (Security)
-- ============================================================

-- Revoke public access
REVOKE ALL ON brain_templates FROM PUBLIC;
REVOKE ALL ON org_brain_assignments FROM PUBLIC;
REVOKE ALL ON brain_version_history FROM PUBLIC;
REVOKE ALL ON brain_ab_tests FROM PUBLIC;
REVOKE ALL ON brain_request_logs FROM PUBLIC;

-- Grant appropriate access
-- (Adjust based on your role-based access control)
-- GRANT SELECT ON brain_templates TO authenticated;
-- GRANT ALL ON brain_templates TO service_role;

-- ============================================================
-- VALIDATION
-- ============================================================

-- Ensure at least one default brain exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM brain_templates WHERE is_default = true) THEN
    RAISE EXCEPTION 'No default brain template configured';
  END IF;
END $$;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 001_brain_system.sql completed successfully';
  RAISE NOTICE 'Created 3 brain templates: Echii, Pulz, Quanta';
  RAISE NOTICE 'Total tables created: 5';
  RAISE NOTICE 'Total functions created: 4';
  RAISE NOTICE 'Total triggers created: 2';
END $$;
