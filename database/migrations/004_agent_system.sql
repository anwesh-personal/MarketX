-- ============================================================
-- AXIOM BRAIN - MIGRATION 004: Multi-Agent System
-- Created: 2026-01-15
-- Description: Intelligent agent routing, tool execution,
--              intent classification, and agent performance tracking
-- ============================================================

-- ============================================================
-- AGENTS REGISTRY
-- ============================================================

-- Predefined agent definitions
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN ('writer', 'analyst', 'coach', 'generalist', 'custom')),
  system_prompt TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  tools TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX agents_type_active_idx ON agents(agent_type, is_active);
CREATE INDEX agents_active_idx ON agents(is_active);

-- Comments
COMMENT ON TABLE agents IS 'Registry of specialized AI agents with configurations and capabilities';
COMMENT ON COLUMN agents.agent_type IS 'Type: writer (content), analyst (data), coach (productivity), generalist (general), custom (user-defined)';
COMMENT ON COLUMN agents.config IS 'Agent-specific config: temperature, maxTokens, capabilities, etc.';
COMMENT ON COLUMN agents.tools IS 'Array of tool names this agent can use';

-- Insert default agents
INSERT INTO agents (name, agent_type, system_prompt, config, tools) VALUES
(
  'Writer Agent',
  'writer',
  'You are an expert content writer with access to the knowledge base. Your task is to create engaging, well-structured content based on user requirements and available context. Always cite sources when using information from the knowledge base.',
  '{
    "temperature": 0.8,
    "maxTokens": 4000,
    "capabilities": ["long_form_content", "blog_posts", "marketing_copy", "technical_docs"]
  }'::JSONB,
  ARRAY['kb_search', 'style_analysis', 'grammar_check', 'content_outline']
),
(
  'Analyst Agent',
  'analyst',
  'You are a data analyst capable of interpreting data, generating insights, and creating visualizations. Use SQL queries when needed and explain complex analysis in simple terms.',
  '{
    "temperature": 0.2,
    "maxTokens": 3000,
    "capabilities": ["data_analysis", "sql_queries", "statistics", "visualization"]
  }'::JSONB,
  ARRAY['sql_query', 'data_viz', 'statistics', 'trend_analysis']
),
(
  'Coach Agent',
  'coach',
  'You are a productivity and growth coach. Help users achieve their goals, build better habits, and stay motivated. Reference their past progress and preferences.',
  '{
    "temperature": 0.7,
    "maxTokens": 2000,
    "capabilities": ["goal_setting", "habit_tracking", "motivation", "accountability"]
  }'::JSONB,
  ARRAY['memory_recall', 'goal_tracking', 'habit_analysis', 'progress_report']
),
(
  'Generalist Agent',
  'generalist',
  'You are a helpful AI assistant. Answer questions accurately using the knowledge base and your general knowledge. Be conversational and friendly.',
  '{
    "temperature": 0.7,
    "maxTokens": 2000,
    "capabilities": ["general_chat", "q_and_a", "explanation"]
  }'::JSONB,
  ARRAY['kb_search', 'memory_recall', 'web_search']
);

-- ============================================================
-- AGENT SESSIONS
-- ============================================================

-- Track agent invocations and state
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id),
  agent_type VARCHAR(50),
  state JSONB DEFAULT '{}',
  tools_used TEXT[] DEFAULT '{}',
  tokens_used INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX agent_sessions_conv_idx ON agent_sessions(conversation_id);
CREATE INDEX agent_sessions_agent_idx ON agent_sessions(agent_id, started_at DESC);
CREATE INDEX agent_sessions_type_idx ON agent_sessions(agent_type, started_at DESC);

-- Comments
COMMENT ON TABLE agent_sessions IS 'Track every agent invocation with state and tool usage';
COMMENT ON COLUMN agent_sessions.state IS 'Agent state for stateful agents (e.g., multi-turn tasks)';
COMMENT ON COLUMN agent_sessions.tools_used IS 'List of tools invoked during this session';

-- ============================================================
-- TOOLS REGISTRY
-- ============================================================

-- Catalog of available tools
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  parameters JSONB NOT NULL,
  implementation VARCHAR(50) CHECK (implementation IN ('internal', 'api', 'function')),
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX tools_active_idx ON tools(is_active);
CREATE INDEX tools_impl_idx ON tools(implementation, is_active);

-- Comments
COMMENT ON TABLE tools IS 'Registry of tools available to agents';
COMMENT ON COLUMN tools.parameters IS 'JSON schema defining tool parameters';
COMMENT ON COLUMN tools.implementation IS 'internal: built-in code, api: external API, function: serverless function';

-- Insert default tools
INSERT INTO tools (name, description, parameters, implementation, config) VALUES
(
  'kb_search',
  'Search the knowledge base for relevant information',
  '{
    "query": {"type": "string", "description": "Search query", "required": true},
    "maxResults": {"type": "number", "description": "Maximum results to return", "required": false, "default": 5}
  }'::JSONB,
  'internal',
  '{"timeout": 5000}'::JSONB
),
(
  'web_search',
  'Search the web for current information',
  '{
    "query": {"type": "string", "description": "Search query", "required": true},
    "maxResults": {"type": "number", "description": "Maximum results", "required": false, "default": 5}
  }'::JSONB,
  'api',
  '{"provider": "serpapi", "timeout": 10000}'::JSONB
),
(
  'memory_recall',
  'Retrieve user-specific memories and preferences',
  '{
    "context": {"type": "string", "description": "Context to search memories", "required": true}
  }'::JSONB,
  'internal',
  '{}'::JSONB
),
(
  'sql_query',
  'Execute SQL queries for data analysis',
  '{
    "query": {"type": "string", "description": "SQL query", "required": true},
    "database": {"type": "string", "description": "Database name", "required": false}
  }'::JSONB,
  'internal',
  '{"maxRows": 1000, "timeout": 30000}'::JSONB
),
(
  'style_analysis',
  'Analyze writing style and provide suggestions',
  '{
    "text": {"type": "string", "description": "Text to analyze", "required": true}
  }'::JSONB,
  'internal',
  '{}'::JSONB
),
(
  'content_outline',
  'Generate content outline from topic',
  '{
    "topic": {"type": "string", "description": "Topic to outline", "required": true},
    "depth": {"type": "number", "description": "Outline depth", "required": false, "default": 2}
  }'::JSONB,
  'internal',
  '{}'::JSONB
);

-- ============================================================
-- TOOL EXECUTION LOGS
-- ============================================================

-- Track every tool execution
CREATE TABLE tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES tools(id),
  tool_name VARCHAR(255),
  parameters JSONB,
  result JSONB,
  execution_time_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX tool_exec_session_idx ON tool_executions(agent_session_id);
CREATE INDEX tool_exec_tool_idx ON tool_executions(tool_id, created_at DESC);
CREATE INDEX tool_exec_success_idx ON tool_executions(success, tool_id);

-- Comments
COMMENT ON TABLE tool_executions IS 'Complete execution log for every tool invocation';
COMMENT ON COLUMN tool_executions.result IS 'Tool execution result (structure varies by tool)';

-- ============================================================
-- INTENT CLASSIFICATION PATTERNS
-- ============================================================

-- Patterns for routing queries to agents
CREATE TABLE intent_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  keywords TEXT[] NOT NULL,
  regex_pattern TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX intent_patterns_type_idx ON intent_patterns(agent_type, is_active);
CREATE INDEX intent_patterns_priority_idx ON intent_patterns(priority DESC, is_active);

-- Comments
COMMENT ON TABLE intent_patterns IS 'Keyword and regex patterns for intent classification and agent routing';
COMMENT ON COLUMN intent_patterns.priority IS 'Higher priority patterns matched first';

-- Insert default intent patterns
INSERT INTO intent_patterns (agent_type, keywords, priority) VALUES
('writer', ARRAY['write', 'create', 'draft', 'compose', 'blog', 'article', 'content', 'copy'], 10),
('analyst', ARRAY['analyze', 'data', 'metrics', 'report', 'statistics', 'trends', 'query', 'sql'], 10),
('coach', ARRAY['goal', 'habit', 'motivation', 'progress', 'improve', 'plan', 'productivity'], 10),
('generalist', ARRAY['what', 'how', 'explain', 'tell', 'who', 'when', 'where', 'why'], 5);

-- ============================================================
-- AGENT PERFORMANCE METRICS
-- ============================================================

-- Daily performance stats per agent
CREATE TABLE agent_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  avg_tokens_used INTEGER,
  avg_tools_used FLOAT,
  success_rate FLOAT,
  avg_user_rating FLOAT,
  UNIQUE(agent_id, date)
);

-- Indexes
CREATE INDEX agent_metrics_agent_date_idx ON agent_metrics(agent_id, date DESC);
CREATE INDEX agent_metrics_date_idx ON agent_metrics(date DESC);

-- Comments
COMMENT ON TABLE agent_metrics IS 'Daily aggregated performance metrics per agent';
COMMENT ON COLUMN agent_metrics.success_rate IS 'Percentage of sessions completed without errors';

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get agent by intent classification
CREATE OR REPLACE FUNCTION classify_intent(query_text TEXT)
RETURNS VARCHAR AS $$
DECLARE
  matched_agent VARCHAR;
  pattern_record RECORD;
BEGIN
  -- Try pattern matching (highest priority first)
  FOR pattern_record IN
    SELECT agent_type, keywords, regex_pattern
    FROM intent_patterns
    WHERE is_active = true
    ORDER BY priority DESC
  LOOP
    -- Check keywords
    IF EXISTS (
      SELECT 1
      FROM unnest(pattern_record.keywords) AS keyword
      WHERE query_text ILIKE '%' || keyword || '%'
    ) THEN
      RETURN pattern_record.agent_type;
    END IF;
    
    -- Check regex if present
    IF pattern_record.regex_pattern IS NOT NULL
       AND query_text ~ pattern_record.regex_pattern THEN
      RETURN pattern_record.agent_type;
    END IF;
  END LOOP;
  
  -- Default to generalist
  RETURN 'generalist';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION classify_intent IS 'Classify user query intent to route to appropriate agent';

-- Update agent metrics
CREATE OR REPLACE FUNCTION update_agent_metrics(
  agent_uuid UUID,
  metric_date DATE,
  response_time_ms INTEGER DEFAULT NULL,
  tokens INTEGER DEFAULT NULL,
  tools_count INTEGER DEFAULT NULL,
  success BOOLEAN DEFAULT NULL,
  user_rating FLOAT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO agent_metrics (
    agent_id,
    date,
    total_sessions,
    avg_response_time_ms,
    avg_tokens_used,
    avg_tools_used,
    success_rate,
    avg_user_rating
  ) VALUES (
    agent_uuid,
    metric_date,
    1,
    COALESCE(response_time_ms, 0),
    COALESCE(tokens, 0),
    COALESCE(tools_count, 0)::FLOAT,
    CASE WHEN success IS true THEN 1.0 WHEN success IS false THEN 0.0 ELSE NULL END,
    user_rating
  )
  ON CONFLICT (agent_id, date) DO UPDATE SET
    total_sessions = agent_metrics.total_sessions + 1,
    avg_response_time_ms = (
      agent_metrics.avg_response_time_ms * agent_metrics.total_sessions + 
      COALESCE(response_time_ms, 0)
    ) / (agent_metrics.total_sessions + 1),
    avg_tokens_used = (
      agent_metrics.avg_tokens_used * agent_metrics.total_sessions + 
      COALESCE(tokens, 0)
    ) / (agent_metrics.total_sessions + 1),
    avg_tools_used = (
      agent_metrics.avg_tools_used * agent_metrics.total_sessions + 
      COALESCE(tools_count, 0)::FLOAT
    ) / (agent_metrics.total_sessions + 1),
    success_rate = CASE 
      WHEN success IS NOT NULL THEN
        (
          COALESCE(agent_metrics.success_rate * agent_metrics.total_sessions, 0) + 
          CASE WHEN success THEN 1.0 ELSE 0.0 END
        ) / (agent_metrics.total_sessions + 1)
      ELSE agent_metrics.success_rate
    END,
    avg_user_rating = CASE
      WHEN user_rating IS NOT NULL THEN
        (
          COALESCE(agent_metrics.avg_user_rating * agent_metrics.total_sessions, 0) + 
          user_rating
        ) / (agent_metrics.total_sessions + 1)
      ELSE agent_metrics.avg_user_rating
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_agent_metrics IS 'Incrementally update agent performance metrics';

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at for agents
CREATE OR REPLACE FUNCTION update_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agents_updated_at 
BEFORE UPDATE ON agents
FOR EACH ROW 
EXECUTE FUNCTION update_agents_updated_at();

-- ============================================================
-- GRANTS (Security)
-- ============================================================

-- Revoke public access
REVOKE ALL ON agents FROM PUBLIC;
REVOKE ALL ON agent_sessions FROM PUBLIC;
REVOKE ALL ON tools FROM PUBLIC;
REVOKE ALL ON tool_executions FROM PUBLIC;
REVOKE ALL ON intent_patterns FROM PUBLIC;
REVOKE ALL ON agent_metrics FROM PUBLIC;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 004_agent_system.sql completed successfully';
  RAISE NOTICE 'Created 4 default agents: Writer, Analyst, Coach, Generalist';
  RAISE NOTICE 'Created 6 default tools';
  RAISE NOTICE 'Created intent classification system';
  RAISE NOTICE 'Multi-agent system ready';
END $$;
