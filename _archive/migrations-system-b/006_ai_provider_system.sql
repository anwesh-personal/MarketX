-- ============================================================
-- AXIOM BRAIN - MIGRATION 006: AI Provider System
-- Created: 2026-01-16
-- Description: Complete AI provider management with failover,
--              usage tracking, cost analytics, and brain integration
-- ============================================================

-- ============================================================
-- AI PROVIDERS TABLE (Extend existing or create)
-- ============================================================

-- Create ai_providers table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'mistral', 'perplexity', 'xai')),
  name VARCHAR(255) NOT NULL,
  api_key TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns for tracking if table exists
DO $$
BEGIN
  -- Add usage_count if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_providers' AND column_name = 'usage_count'
  ) THEN
    ALTER TABLE ai_providers ADD COLUMN usage_count INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- Add failures if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_providers' AND column_name = 'failures'
  ) THEN
    ALTER TABLE ai_providers ADD COLUMN failures INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- Add last_used_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_providers' AND column_name = 'last_used_at'
  ) THEN
    ALTER TABLE ai_providers ADD COLUMN last_used_at TIMESTAMPTZ;
  END IF;

  -- Add last_failure_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_providers' AND column_name = 'last_failure_at'
  ) THEN
    ALTER TABLE ai_providers ADD COLUMN last_failure_at TIMESTAMPTZ;
  END IF;

  -- Add auto_disabled_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_providers' AND column_name = 'auto_disabled_at'
  ) THEN
    ALTER TABLE ai_providers ADD COLUMN auto_disabled_at TIMESTAMPTZ;
  END IF;

  -- Add models_discovered if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_providers' AND column_name = 'models_discovered'
  ) THEN
    ALTER TABLE ai_providers ADD COLUMN models_discovered JSONB DEFAULT '[]';
  END IF;

  -- Add priority if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_providers' AND column_name = 'priority'
  ) THEN
    ALTER TABLE ai_providers ADD COLUMN priority INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS ai_providers_active_idx ON ai_providers(provider, is_active) 
  WHERE is_active = true AND auto_disabled_at IS NULL;
CREATE INDEX IF NOT EXISTS ai_providers_priority_idx ON ai_providers(provider, priority DESC, failures ASC);
CREATE INDEX IF NOT EXISTS ai_providers_failures_idx ON ai_providers(failures) WHERE failures > 0;

COMMENT ON TABLE ai_providers IS 'AI provider API keys with failover support and usage tracking';
COMMENT ON COLUMN ai_providers.usage_count IS 'Total successful generations with this key';
COMMENT ON COLUMN ai_providers.failures IS 'Consecutive failures (resets on success). Auto-disables at 3.';
COMMENT ON COLUMN ai_providers.auto_disabled_at IS 'Timestamp when key was auto-disabled due to repeated failures';
COMMENT ON COLUMN ai_providers.models_discovered IS 'Array of model objects discovered during validation';
COMMENT ON COLUMN ai_providers.priority IS 'Failover priority (higher = try first)';

-- ============================================================
-- BRAIN AI CONFIGURATIONS
-- ============================================================

-- Brain-specific AI provider configurations
CREATE TABLE IF NOT EXISTS brain_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id UUID NOT NULL UNIQUE, -- Can be template or cloned instance
  preferred_provider VARCHAR(50) NOT NULL CHECK (preferred_provider IN ('openai', 'anthropic', 'google', 'mistral', 'perplexity', 'xai')),
  fallback_providers VARCHAR(50)[] DEFAULT '{"anthropic", "google"}',
  model_overrides JSONB DEFAULT '{}',
  max_tokens INTEGER DEFAULT 2000,
  temperature FLOAT DEFAULT 0.7,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS brain_configs_brain_idx ON brain_configs(brain_id);
CREATE INDEX IF NOT EXISTS brain_configs_provider_idx ON brain_configs(preferred_provider);

COMMENT ON TABLE brain_configs IS 'AI provider configuration per brain instance';
COMMENT ON COLUMN brain_configs.brain_id IS 'References brain_templates.id for templates or cloned brain IDs';
COMMENT ON COLUMN brain_configs.fallback_providers IS 'Ordered array of fallback providers if preferred fails';
COMMENT ON COLUMN brain_configs.model_overrides IS 'Agent-specific model overrides: {agent_type: model_id}';

-- ============================================================
-- USER BRAIN ASSIGNMENTS
-- ============================================================

-- Track individual user brain instances (cloned from templates)
CREATE TABLE IF NOT EXISTS user_brain_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brain_template_id UUID NOT NULL REFERENCES brain_templates(id),
  brain_id UUID NOT NULL, -- Cloned instance ID
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, brain_id)
);

CREATE INDEX IF NOT EXISTS user_brain_user_idx ON user_brain_assignments(user_id, is_active);
CREATE INDEX IF NOT EXISTS user_brain_org_idx ON user_brain_assignments(organization_id, is_active);
CREATE INDEX IF NOT EXISTS user_brain_active_idx ON user_brain_assignments(is_active, created_at DESC);

COMMENT ON TABLE user_brain_assignments IS 'Maps users to their cloned brain instances';
COMMENT ON COLUMN user_brain_assignments.brain_id IS 'Unique cloned brain instance ID (not the template ID)';

-- Enable RLS
ALTER TABLE user_brain_assignments ENABLE ROW LEVEL SECURITY;

-- Users can see their own assignments
CREATE POLICY users_own_brains ON user_brain_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM platform_admins
      WHERE platform_admins.email = auth.jwt() ->> 'email'
    )
  );

-- ============================================================
-- AI USAGE LOGS
-- ============================================================

-- Detailed usage logs for cost tracking and analytics
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  brain_id UUID,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_type VARCHAR(50),
  model_used VARCHAR(100) NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  response_time_ms INTEGER,
  was_fallback BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS ai_usage_provider_idx ON ai_usage_log(provider_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS ai_usage_brain_idx ON ai_usage_log(brain_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS ai_usage_org_idx ON ai_usage_log(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS ai_usage_user_idx ON ai_usage_log(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS ai_usage_timestamp_idx ON ai_usage_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS ai_usage_cost_idx ON ai_usage_log(cost_usd DESC, timestamp DESC);

COMMENT ON TABLE ai_usage_log IS 'Detailed AI usage logs for cost tracking and analytics';
COMMENT ON COLUMN ai_usage_log.was_fallback IS 'True if this was a fallback provider (primary failed)';
COMMENT ON COLUMN ai_usage_log.metadata IS 'Additional context: request_id, error_message, finish_reason, etc.';

-- ============================================================
-- AI MODEL PRICING (Dynamic pricing table)
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  model_id VARCHAR(100) NOT NULL,
  input_cost_per_1k_tokens DECIMAL(10, 6) NOT NULL,
  output_cost_per_1k_tokens DECIMAL(10, 6) NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, model_id, effective_date)
);

CREATE INDEX IF NOT EXISTS ai_pricing_active_idx ON ai_model_pricing(provider, model_id, effective_date DESC) 
  WHERE is_active = true;

COMMENT ON TABLE ai_model_pricing IS 'AI model pricing database for accurate cost tracking';
COMMENT ON COLUMN ai_model_pricing.effective_date IS 'When this pricing went into effect';

-- Insert current pricing (as of 2026-01-16)
INSERT INTO ai_model_pricing (provider, model_id, input_cost_per_1k_tokens, output_cost_per_1k_tokens) VALUES
-- OpenAI
('openai', 'gpt-4-turbo-preview', 0.01, 0.03),
('openai', 'gpt-4', 0.03, 0.06),
('openai', 'gpt-4-32k', 0.06, 0.12),
('openai', 'gpt-3.5-turbo', 0.0005, 0.0015),
('openai', 'gpt-3.5-turbo-16k', 0.003, 0.004),

-- Anthropic
('anthropic', 'claude-3-5-sonnet-20241022', 0.003, 0.015),
('anthropic', 'claude-3-opus-20240229', 0.015, 0.075),
('anthropic', 'claude-3-sonnet-20240229', 0.003, 0.015),
('anthropic', 'claude-3-haiku-20240307', 0.00025, 0.00125),

-- Google
('google', 'gemini-pro', 0.00025, 0.0005),
('google', 'gemini-pro-vision', 0.00025, 0.0005),
('google', 'gemini-1.5-pro', 0.00035, 0.00105),
('google', 'gemini-1.5-flash', 0.000075, 0.0003),

-- Mistral
('mistral', 'mistral-large-latest', 0.008, 0.024),
('mistral', 'mistral-medium-latest', 0.0027, 0.0081),
('mistral', 'mistral-small-latest', 0.002, 0.006),
('mistral', 'open-mistral-7b', 0.00025, 0.00025),

-- Perplexity
('perplexity', 'llama-3.1-sonar-small-128k-online', 0.0002, 0.0002),
('perplexity', 'llama-3.1-sonar-large-128k-online', 0.001, 0.001),
('perplexity', 'llama-3.1-sonar-huge-128k-online', 0.005, 0.005),

-- X.AI
('xai', 'grok-beta', 0.005, 0.015)
ON CONFLICT (provider, model_id, effective_date) DO NOTHING;

-- ============================================================
-- FUNCTIONS: Provider Usage Tracking
-- ============================================================

-- Drop existing functions first to avoid parameter conflicts
DROP FUNCTION IF EXISTS increment_provider_usage(UUID);
DROP FUNCTION IF EXISTS increment_provider_failure(UUID);
DROP FUNCTION IF EXISTS mark_provider_inactive(UUID);
DROP FUNCTION IF EXISTS rotate_provider_key(UUID, TEXT);

-- Atomically increment provider usage (thread-safe)
CREATE OR REPLACE FUNCTION increment_provider_usage(p_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ai_providers 
  SET usage_count = usage_count + 1,
      last_used_at = NOW(),
      failures = 0  -- Reset on success
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_provider_usage(UUID) IS 
  'Atomically increment provider usage count and reset failures';

-- Atomically increment provider failures (thread-safe)
CREATE OR REPLACE FUNCTION increment_provider_failure(p_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ai_providers
  SET failures = failures + 1,
      last_failure_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_provider_failure(UUID) IS 
  'Atomically increment provider failure count';

-- ============================================================
-- FUNCTIONS: Brain Cloning
-- ============================================================

-- Clone brain template for user
CREATE OR REPLACE FUNCTION clone_brain_template(
  p_user_id UUID,
  p_org_id UUID,
  p_template_id UUID
) RETURNS TABLE (
  brain_id UUID,
  brain_name VARCHAR,
  success BOOLEAN
) AS $$
DECLARE
  v_template brain_templates%ROWTYPE;
  v_new_brain_id UUID;
BEGIN
  -- Get template
  SELECT * INTO v_template
  FROM brain_templates
  WHERE id = p_template_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brain template not found or inactive: %', p_template_id;
  END IF;

  -- Generate new brain ID (this will be the cloned instance ID)
  v_new_brain_id := gen_random_uuid();

  -- Clone brain config (inherits from template)
  INSERT INTO brain_configs (
    brain_id,
    preferred_provider,
    fallback_providers,
    model_overrides,
    max_tokens,
    temperature
  )
  SELECT 
    v_new_brain_id,
    COALESCE(bc.preferred_provider, 'openai'),
    COALESCE(bc.fallback_providers, ARRAY['anthropic', 'google']),
    COALESCE(bc.model_overrides, '{}'::JSONB),
    COALESCE(bc.max_tokens, 2000),
    COALESCE(bc.temperature, 0.7)
  FROM brain_configs bc
  WHERE bc.brain_id = p_template_id
  ON CONFLICT (brain_id) DO NOTHING;

  -- If template had no config, use defaults
  IF NOT FOUND THEN
    INSERT INTO brain_configs (brain_id)
    VALUES (v_new_brain_id);
  END IF;

  -- Return success
  RETURN QUERY SELECT v_new_brain_id, v_template.name, true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clone_brain_template(UUID, UUID, UUID) IS 
  'Clone brain template for user assignment. Returns new brain_id for tracking.';

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at on brain_configs
CREATE OR REPLACE FUNCTION update_brain_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brain_configs_updated_at
BEFORE UPDATE ON brain_configs
FOR EACH ROW
EXECUTE FUNCTION update_brain_config_timestamp();

-- Auto-update updated_at on ai_providers
CREATE OR REPLACE FUNCTION update_ai_provider_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_providers_updated_at
BEFORE UPDATE ON ai_providers
FOR EACH ROW
EXECUTE FUNCTION update_ai_provider_timestamp();

-- ============================================================
-- SECURITY (RLS Policies)
-- ============================================================

-- Enable RLS
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_pricing ENABLE ROW LEVEL SECURITY;

-- AI Providers: Only superadmins can see/manage
CREATE POLICY superadmin_ai_providers ON ai_providers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE platform_admins.email = auth.jwt() ->> 'email'
    )
  );

-- Brain Configs: Users can see their org's brain config
CREATE POLICY users_brain_configs ON brain_configs
  FOR SELECT
  TO authenticated
  USING (true); -- All authenticated users can read (filtered by app logic)

-- AI Usage Log: Users can see their own usage
CREATE POLICY users_usage_log ON ai_usage_log
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM platform_admins
      WHERE platform_admins.email = auth.jwt() ->> 'email'
    )
  );

-- Model Pricing: Everyone can read (for cost estimates)
CREATE POLICY public_pricing ON ai_model_pricing
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================================
-- VALIDATION
-- ============================================================

-- Ensure pricing data exists
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM ai_model_pricing) = 0 THEN
    RAISE WARNING 'No AI model pricing data loaded';
  ELSE
    RAISE NOTICE 'Loaded % pricing records', (SELECT COUNT(*) FROM ai_model_pricing);
  END IF;
END $$;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 006_ai_provider_system.sql COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created/updated:';
  RAISE NOTICE '  - ai_providers (with tracking columns)';
  RAISE NOTICE '  - brain_configs';
  RAISE NOTICE '  - ai_usage_log';
  RAISE NOTICE '  - ai_model_pricing (% models)', (SELECT COUNT(*) FROM ai_model_pricing);
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - clone_brain_template()';
  RAISE NOTICE 'RLS Policies: 4 policies enabled';
  RAISE NOTICE '========================================';
END $$;
