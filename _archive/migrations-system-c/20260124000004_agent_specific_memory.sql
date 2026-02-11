-- ============================================================
-- AXIOM BRAIN - AGENT-SPECIFIC MEMORY ARCHITECTURE
-- Created: 2026-01-24
-- Description: Agent-scoped memory tables following the principle
--              that "memories, resonance etc are all agent specific"
-- ============================================================

BEGIN;

-- ============================================================
-- AGENT MEMORY TABLE
-- Each agent has its own memory store with specific memory types
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    agent_type VARCHAR(50) NOT NULL, -- 'writer', 'analyst', 'coach', 'generalist'
    
    -- Memory Content
    memory_type VARCHAR(50) NOT NULL CHECK (memory_type IN (
        'preference',       -- User preference within agent domain
        'style',            -- Writing/analysis/coaching style learned
        'fact',             -- User-provided fact relevant to agent
        'instruction',      -- Standing instruction for agent
        'correction',       -- User correction of agent behavior
        'resonance',        -- What resonates with user
        'avoid',            -- What user wants to avoid
        'example',          -- Good/bad examples from user
        'context',          -- Persistent context for agent
        'goal'              -- User goals for this agent domain
    )),
    
    -- Key-Value Storage
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'conversation' CHECK (source IN (
        'conversation',     -- Extracted from conversation
        'explicit',         -- User explicitly stated
        'inferred',         -- Agent inferred from behavior
        'imported',         -- Imported from external source
        'system'            -- System-generated
    )),
    confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Access Tracking
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent exact duplicates per user/agent/type
    UNIQUE(user_id, agent_type, memory_type, key)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS agent_memory_user_agent_idx ON agent_memory(user_id, agent_type, is_active);
CREATE INDEX IF NOT EXISTS agent_memory_type_idx ON agent_memory(memory_type, agent_type);
CREATE INDEX IF NOT EXISTS agent_memory_access_idx ON agent_memory(last_accessed_at DESC);
CREATE INDEX IF NOT EXISTS agent_memory_org_idx ON agent_memory(org_id, agent_type);

-- ============================================================
-- AGENT RESONANCE TABLE
-- Tracks what resonates with users per agent type
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_resonance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    
    -- Resonance Data
    resonance_type VARCHAR(50) NOT NULL CHECK (resonance_type IN (
        'tone',             -- Tone of voice that works
        'format',           -- Format preferences
        'length',           -- Preferred response length
        'depth',            -- Level of detail
        'style',            -- Communication style
        'vocabulary',       -- Vocabulary level
        'examples',         -- Use of examples
        'structure',        -- How to structure responses
        'pacing',           -- Fast/slow pacing
        'enthusiasm'        -- Energy level
    )),
    
    -- What resonates
    pattern TEXT NOT NULL,          -- The pattern that resonates
    examples TEXT[],                -- Examples that worked
    anti_patterns TEXT[],           -- Patterns that didn't work
    
    -- Scoring
    score DECIMAL(3,2) DEFAULT 0.0 CHECK (score >= -1 AND score <= 1), -- -1 to 1
    occurrence_count INTEGER DEFAULT 1,
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, agent_type, resonance_type, pattern)
);

CREATE INDEX IF NOT EXISTS agent_resonance_user_idx ON agent_resonance(user_id, agent_type);
CREATE INDEX IF NOT EXISTS agent_resonance_score_idx ON agent_resonance(score DESC);

-- ============================================================
-- AGENT LEARNING LOG
-- Tracks how agents learn and adapt to users
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_learning_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    
    -- Learning Event
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'memory_created',       -- New memory created
        'memory_updated',       -- Memory updated
        'memory_reinforced',    -- Memory confidence increased
        'memory_weakened',      -- Memory confidence decreased
        'resonance_detected',   -- New resonance pattern found
        'correction_received',  -- User corrected agent
        'praise_received',      -- User praised response
        'style_adjusted',       -- Agent adjusted style
        'preference_learned',   -- New preference learned
        'goal_set'              -- User set a goal
    )),
    
    -- Event Details
    source_type VARCHAR(50) NOT NULL, -- 'feedback', 'explicit', 'behavioral'
    trigger_text TEXT,                 -- What triggered this learning
    learning_summary TEXT NOT NULL,    -- What was learned
    confidence_change DECIMAL(3,2),    -- Change in confidence
    
    -- Impact
    affected_memory_ids UUID[],        -- Memories affected
    affected_resonance_ids UUID[],     -- Resonances affected
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_learning_user_idx ON agent_learning_log(user_id, agent_type, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_learning_event_idx ON agent_learning_log(event_type, created_at DESC);

-- ============================================================
-- AGENT STYLE PROFILES
-- Per-user style configurations for each agent
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_style_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    
    -- Style Configuration (JSONB for flexibility)
    style_config JSONB NOT NULL DEFAULT '{
        "tone": "professional",
        "formality": 0.7,
        "verbosity": 0.5,
        "technicality": 0.5,
        "enthusiasm": 0.5,
        "use_examples": true,
        "use_bullet_points": true,
        "use_headers": true,
        "preferred_length": "medium"
    }',
    
    -- Writer-specific
    writer_style JSONB DEFAULT '{
        "voice": null,
        "pov": "professional",
        "sentence_structure": "varied",
        "vocabulary_level": "standard"
    }',
    
    -- Analyst-specific
    analyst_style JSONB DEFAULT '{
        "chart_preference": "bar",
        "data_depth": "summary",
        "include_raw_data": false,
        "statistical_rigor": "moderate"
    }',
    
    -- Coach-specific
    coach_style JSONB DEFAULT '{
        "support_style": "balanced",
        "challenge_level": "moderate",
        "accountability_frequency": "weekly",
        "celebration_style": "subtle"
    }',
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, agent_type)
);

CREATE INDEX IF NOT EXISTS agent_style_user_idx ON agent_style_profiles(user_id, agent_type);

-- ============================================================
-- AGENT INTERACTION HISTORY
-- Summary of agent-user interactions for context
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_interaction_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    
    -- Aggregated Stats
    total_interactions INTEGER DEFAULT 0,
    total_tokens_used BIGINT DEFAULT 0,
    avg_satisfaction_score DECIMAL(3,2),
    
    -- Recent Activity
    last_interaction_at TIMESTAMPTZ,
    last_topic TEXT,
    ongoing_project TEXT,
    
    -- Common Intents
    top_intents JSONB DEFAULT '[]', -- [{intent: "write_blog", count: 50}, ...]
    
    -- Lifecycle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, agent_type)
);

CREATE INDEX IF NOT EXISTS agent_interaction_user_idx ON agent_interaction_summary(user_id, agent_type);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_resonance ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learning_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_style_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_interaction_summary ENABLE ROW LEVEL SECURITY;

-- Agent Memory: Users can only access their own memories
CREATE POLICY agent_memory_select ON agent_memory FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY agent_memory_insert ON agent_memory FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY agent_memory_update ON agent_memory FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY agent_memory_delete ON agent_memory FOR DELETE
    USING (user_id = auth.uid());

-- Agent Resonance: Users can access their own resonance data
CREATE POLICY agent_resonance_select ON agent_resonance FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY agent_resonance_insert ON agent_resonance FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Agent Style Profiles: Users manage their own styles
CREATE POLICY agent_style_select ON agent_style_profiles FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY agent_style_upsert ON agent_style_profiles FOR ALL
    USING (user_id = auth.uid());

-- Interaction Summary: Users can view their own
CREATE POLICY agent_interaction_select ON agent_interaction_summary FOR SELECT
    USING (user_id = auth.uid());

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to get or create a style profile for user/agent
CREATE OR REPLACE FUNCTION get_or_create_agent_style(
    p_org_id UUID,
    p_user_id UUID,
    p_agent_type VARCHAR(50)
) RETURNS agent_style_profiles AS $$
DECLARE
    v_profile agent_style_profiles;
BEGIN
    SELECT * INTO v_profile
    FROM agent_style_profiles
    WHERE user_id = p_user_id AND agent_type = p_agent_type;
    
    IF NOT FOUND THEN
        INSERT INTO agent_style_profiles (org_id, user_id, agent_type)
        VALUES (p_org_id, p_user_id, p_agent_type)
        RETURNING * INTO v_profile;
    END IF;
    
    RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a learning event
CREATE OR REPLACE FUNCTION record_agent_learning(
    p_org_id UUID,
    p_user_id UUID,
    p_agent_type VARCHAR(50),
    p_event_type VARCHAR(50),
    p_source_type VARCHAR(50),
    p_learning_summary TEXT,
    p_conversation_id UUID DEFAULT NULL,
    p_message_id UUID DEFAULT NULL,
    p_trigger_text TEXT DEFAULT NULL,
    p_confidence_change DECIMAL(3,2) DEFAULT NULL,
    p_affected_memory_ids UUID[] DEFAULT NULL,
    p_affected_resonance_ids UUID[] DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO agent_learning_log (
        org_id, user_id, agent_type, conversation_id, message_id,
        event_type, source_type, trigger_text, learning_summary,
        confidence_change, affected_memory_ids, affected_resonance_ids
    ) VALUES (
        p_org_id, p_user_id, p_agent_type, p_conversation_id, p_message_id,
        p_event_type, p_source_type, p_trigger_text, p_learning_summary,
        p_confidence_change, p_affected_memory_ids, p_affected_resonance_ids
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update interaction summary
CREATE OR REPLACE FUNCTION update_agent_interaction(
    p_org_id UUID,
    p_user_id UUID,
    p_agent_type VARCHAR(50),
    p_tokens_used INTEGER DEFAULT 0,
    p_topic TEXT DEFAULT NULL,
    p_intent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO agent_interaction_summary (
        org_id, user_id, agent_type, 
        total_interactions, total_tokens_used,
        last_interaction_at, last_topic
    ) VALUES (
        p_org_id, p_user_id, p_agent_type,
        1, p_tokens_used,
        NOW(), p_topic
    )
    ON CONFLICT (user_id, agent_type) DO UPDATE SET
        total_interactions = agent_interaction_summary.total_interactions + 1,
        total_tokens_used = agent_interaction_summary.total_tokens_used + EXCLUDED.total_tokens_used,
        last_interaction_at = NOW(),
        last_topic = COALESCE(EXCLUDED.last_topic, agent_interaction_summary.last_topic),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VALIDATION
-- ============================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('agent_memory', 'agent_resonance', 'agent_learning_log', 'agent_style_profiles', 'agent_interaction_summary');
    
    RAISE NOTICE '';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'AGENT-SPECIFIC MEMORY ARCHITECTURE COMPLETE';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'Tables Created: %', table_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Tables:';
    RAISE NOTICE '  - agent_memory (per-agent memories)';
    RAISE NOTICE '  - agent_resonance (what resonates)';
    RAISE NOTICE '  - agent_learning_log (learning events)';
    RAISE NOTICE '  - agent_style_profiles (style config)';
    RAISE NOTICE '  - agent_interaction_summary (usage stats)';
    RAISE NOTICE '';
    RAISE NOTICE 'Status: ✓ SUCCESS';
    RAISE NOTICE '==================================================';
END $$;

COMMIT;
