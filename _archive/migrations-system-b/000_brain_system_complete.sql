-- ============================================================
-- AXIOM BRAIN - COMPLETE SYSTEM MIGRATION
-- Created: 2026-01-15
-- Description: Complete brain system setup - all migrations in one file
-- ============================================================

-- This file combines all brain migrations for easy deployment:
-- - 001_brain_system.sql (Brain Configuration)
-- - 002_vector_system.sql (Vector Store & Embeddings)
-- - 003_rag_system.sql (RAG Orchestration)
-- - 004_agent_system.sql (Multi-Agent System)

-- Run this file with:
-- psql -h <host> -U postgres -d postgres -f database/migrations/000_brain_system_complete.sql

BEGIN;

-- ============================================================
-- PREREQUISITES CHECK
-- ============================================================

DO $$
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    RAISE EXCEPTION 'organizations table does not exist. Please run base Axiom migrations first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    RAISE EXCEPTION 'users table does not exist. Please run base Axiom migrations first.';
  END IF;
  
  RAISE NOTICE 'Prerequisites check passed ✓';
END $$;

-- ============================================================
-- MIGRATION 001: BRAIN CONFIGURATION SYSTEM
-- ============================================================

DO $$ BEGIN RAISE NOTICE 'Running Migration 001: Brain Configuration System'; END $$;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Brain Templates Table
CREATE TABLE IF NOT EXISTS brain_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  pricing_tier VARCHAR(50) CHECK (pricing_tier IN ('echii', 'pulz', 'quanta')),
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, version)
);

CREATE INDEX IF NOT EXISTS brain_templates_tier_idx ON brain_templates(pricing_tier, is_active);
CREATE INDEX IF NOT EXISTS brain_templates_default_idx ON brain_templates(is_default) WHERE is_default = true;

-- Organization Brain Assignments
CREATE TABLE IF NOT EXISTS org_brain_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brain_template_id UUID NOT NULL REFERENCES brain_templates(id) ON DELETE CASCADE,
  custom_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID,
  UNIQUE(org_id, brain_template_id)
);

CREATE INDEX IF NOT EXISTS org_brain_org_idx ON org_brain_assignments(org_id, is_active);

-- Brain Version History
CREATE TABLE IF NOT EXISTS brain_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_template_id UUID NOT NULL REFERENCES brain_templates(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS brain_version_history_template_idx ON brain_version_history(brain_template_id, created_at DESC);

-- Brain Request Logs
CREATE TABLE IF NOT EXISTS brain_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  brain_template_id UUID REFERENCES brain_templates(id),
  ab_test_id UUID,
  request_type VARCHAR(50),
  response_time_ms INTEGER,
  tokens_used INTEGER,
  feedback_rating SMALLINT CHECK (feedback_rating IN (-1, 0, 1)),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS brain_request_logs_org_idx ON brain_request_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brain_request_logs_brain_idx ON brain_request_logs(brain_template_id, created_at DESC);

-- Insert default brain templates
INSERT INTO brain_templates (name, version, description, config, is_default, pricing_tier, is_active)
VALUES 
('Echii Brain', '1.0.0', 'Smart AI assistant for everyday tasks', 
'{"providers":{"chat":null,"embeddings":null,"completion":null},"agents":{"chat":{"systemPrompt":"You are a helpful AI assistant.","temperature":0.7,"maxTokens":2000,"tools":["kb_search","memory_recall"],"providerId":null}},"rag":{"enabled":true,"topK":3,"minSimilarity":0.75,"rerankingEnabled":false,"hybridSearch":true,"weights":{"vector":0.7,"fts":0.3}},"memory":{"maxContextTokens":4000,"maxMemoryTokens":1000,"conversationWindowSize":5,"enableSummarization":false},"limits":{"maxRequestsPerMinute":10,"maxTokensPerDay":50000},"features":{"multiAgent":false,"streamingEnabled":true}}'::JSONB,
true, 'echii', true),
('Pulz Brain', '1.0.0', 'Advanced AI with multi-agent capabilities',
'{"providers":{"chat":null,"embeddings":null},"agents":{"writer":{"systemPrompt":"Expert content writer","temperature":0.8,"maxTokens":4000,"tools":["kb_search","content_outline"],"providerId":null}},"rag":{"enabled":true,"topK":8,"minSimilarity":0.65,"rerankingEnabled":true,"hybridSearch":true,"weights":{"vector":0.6,"fts":0.4}},"memory":{"maxContextTokens":16000,"maxMemoryTokens":3000,"conversationWindowSize":20,"enableSummarization":true},"limits":{"maxRequestsPerMinute":60,"maxTokensPerDay":500000},"features":{"multiAgent":true,"streamingEnabled":true}}'::JSONB,
false, 'pulz', true),
('Quanta Brain', '1.0.0', 'Ultimate AI powerhouse',
'{"providers":{"chat":null,"embeddings":null,"vision":null},"agents":{"writer":{"systemPrompt":"World-class content writer","temperature":0.8,"maxTokens":8000,"tools":["kb_search","content_outline"],"providerId":null}},"rag":{"enabled":true,"topK":15,"minSimilarity":0.6,"rerankingEnabled":true,"hybridSearch":true,"weights":{"vector":0.5,"fts":0.5},"graphMemory":true},"memory":{"maxContextTokens":32000,"maxMemoryTokens":8000,"conversationWindowSize":50,"enableSummarization":true,"temporalMemory":true,"graphMemory":true},"limits":{"maxRequestsPerMinute":200,"maxTokensPerDay":10000000},"features":{"multiAgent":true,"streamingEnabled":true,"multiModal":true,"rlhf":true,"abTesting":true}}'::JSONB,
false, 'quanta', true)
ON CONFLICT (name, version) DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'Migration 001 Complete ✓'; END $$;

-- ============================================================
-- MIGRATION 002: VECTOR STORE & EMBEDDINGS
-- ============================================================

DO $$ BEGIN RAISE NOTICE 'Running Migration 002: Vector Store & Embeddings'; END $$;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Embeddings Table
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('kb', 'conversation', 'user_memory', 'system')),
  source_id UUID NOT NULL,
  chunk_index INTEGER DEFAULT 0,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS embeddings_vector_idx ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS embeddings_metadata_idx ON embeddings USING gin(metadata);
CREATE INDEX IF NOT EXISTS embeddings_org_source_idx ON embeddings(org_id, source_type);
CREATE INDEX IF NOT EXISTS embeddings_fts_idx ON embeddings USING gin(to_tsvector('english', content));

-- Embedding Cache
CREATE TABLE IF NOT EXISTS embedding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_hash VARCHAR(64) NOT NULL,
  embedding vector(1536) NOT NULL,
  model VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  UNIQUE(content_hash, model, org_id)
);

CREATE INDEX IF NOT EXISTS embedding_cache_hash_idx ON embedding_cache(content_hash, model);

-- Embedding Stats
CREATE TABLE IF NOT EXISTS embedding_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_embeddings INTEGER DEFAULT 0,
  total_searches INTEGER DEFAULT 0,
  avg_search_time_ms FLOAT DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  cache_hit_rate FLOAT DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  UNIQUE(org_id, date)
);

DO $$ BEGIN RAISE NOTICE 'Migration 002 Complete ✓'; END $$;

-- ============================================================
-- MIGRATION 003: RAG ORCHESTRATION
-- ============================================================

DO $$ BEGIN RAISE NOTICE 'Running Migration 003: RAG Orchestration'; END $$;

-- RAG Query Cache
CREATE TABLE IF NOT EXISTS rag_query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  query_hash VARCHAR(64) NOT NULL,
  query_text TEXT NOT NULL,
  results JSONB NOT NULL,
  retrieval_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  UNIQUE(query_hash, org_id)
);

CREATE INDEX IF NOT EXISTS rag_cache_hash_idx ON rag_query_cache(query_hash, org_id);

-- Query Expansions
CREATE TABLE IF NOT EXISTS query_expansions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  original_query TEXT NOT NULL,
  expanded_queries TEXT[] NOT NULL,
  expansion_method VARCHAR(50) CHECK (expansion_method IN ('synonyms', 'llm', 'embedding_neighbors', 'hybrid')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RAG Metrics
CREATE TABLE IF NOT EXISTS rag_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  brain_template_id UUID REFERENCES brain_templates(id),
  query_text TEXT,
  query_hash VARCHAR(64),
  retrieval_time_ms INTEGER,
  reranking_time_ms INTEGER,
  total_time_ms INTEGER,
  total_docs_retrieved INTEGER,
  final_docs_count INTEGER,
  avg_relevance_score FLOAT,
  cache_hit BOOLEAN DEFAULT false,
  expansion_used BOOLEAN DEFAULT false,
  reranking_used BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rag_metrics_org_idx ON rag_metrics(org_id, created_at DESC);

DO $$ BEGIN RAISE NOTICE 'Migration 003 Complete ✓'; END $$;

-- ============================================================
-- CONVERSATIONS & MESSAGES (Required for Agents)
-- ============================================================

DO $$ BEGIN RAISE NOTICE 'Creating conversations and messages tables'; END $$;

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  total_messages INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversations_org_idx ON conversations(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS conversations_user_idx ON conversations(user_id, created_at DESC);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS messages_role_idx ON messages(role);

DO $$ BEGIN RAISE NOTICE 'Conversations and messages tables created ✓'; END $$;

-- ============================================================
-- MIGRATION 004: MULTI-AGENT SYSTEM
-- ============================================================

DO $$ BEGIN RAISE NOTICE 'Running Migration 004: Multi-Agent System'; END $$;

-- Agents Registry
CREATE TABLE IF NOT EXISTS agents (
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

CREATE INDEX IF NOT EXISTS agents_type_active_idx ON agents(agent_type, is_active);

-- Insert default agents
INSERT INTO agents (name, agent_type, system_prompt, config, tools)
VALUES 
('Writer Agent', 'writer', 'Expert content writer', '{"temperature":0.8,"maxTokens":4000}'::JSONB, ARRAY['kb_search','content_outline']),
('Generalist Agent', 'generalist', 'Helpful AI assistant', '{"temperature":0.7,"maxTokens":2000}'::JSONB, ARRAY['kb_search','memory_recall'])
ON CONFLICT (name) DO NOTHING;

-- Agent Sessions
CREATE TABLE IF NOT EXISTS agent_sessions (
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

CREATE INDEX IF NOT EXISTS agent_sessions_conv_idx ON agent_sessions(conversation_id);

-- Tools Registry
CREATE TABLE IF NOT EXISTS tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  parameters JSONB NOT NULL,
  implementation VARCHAR(50) CHECK (implementation IN ('internal', 'api', 'function')),
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tools
INSERT INTO tools (name, description, parameters, implementation, config)
VALUES 
('kb_search', 'Search knowledge base', '{"query":{"type":"string","required":true}}'::JSONB, 'internal', '{}'::JSONB),
('memory_recall', 'Recall user memories', '{"context":{"type":"string","required":true}}'::JSONB, 'internal', '{}'::JSONB),
('content_outline', 'Generate content outline', '{"topic":{"type":"string","required":true}}'::JSONB, 'internal', '{}'::JSONB)
ON CONFLICT (name) DO NOTHING;

-- Intent Patterns
CREATE TABLE IF NOT EXISTS intent_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,
  keywords TEXT[] NOT NULL,
  regex_pattern TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default patterns
INSERT INTO intent_patterns (agent_type, keywords, priority)
VALUES 
('writer', ARRAY['write','create','draft','compose','blog','article'], 10),
('generalist', ARRAY['what','how','explain','tell'], 5)
ON CONFLICT DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'Migration 004 Complete ✓'; END $$;

-- ============================================================
-- VALIDATION
-- ============================================================

DO $$
DECLARE
  brain_count INTEGER;
  agent_count INTEGER;
  tool_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO brain_count FROM brain_templates WHERE is_active = true;
  SELECT COUNT(*) INTO agent_count FROM agents WHERE is_active = true;
  SELECT COUNT(*) INTO tool_count FROM tools WHERE is_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'AXIOM BRAIN SYSTEM - MIGRATION COMPLETE';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Brain Templates: %', brain_count;
  RAISE NOTICE 'Active Agents: %', agent_count;
  RAISE NOTICE 'Available Tools: %', tool_count;
  RAISE NOTICE '';
  RAISE NOTICE 'System Status: ✓ READY';
  RAISE NOTICE '==================================================';
END $$;

COMMIT;
