-- ============================================================
-- AXIOM ENGINE - CONSOLIDATED MIGRATION 05
-- Agent System, Conversations, Messages, Memory
-- Source: System B (004, 012), System C (brain_missing, agent_memory, conversation_brain)
-- ============================================================

-- ============================================================
-- AGENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    brain_template_id UUID REFERENCES brain_templates(id),
    name VARCHAR(255) NOT NULL,
    agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN (
        'writer', 'analyst', 'coach', 'generalist', 'support', 'sales', 'custom'
    )),
    description TEXT,
    capabilities TEXT[],
    system_prompt TEXT,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_org ON agents(org_id);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_agents_brain ON agents(brain_template_id);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    agent_id UUID REFERENCES agents(id),
    brain_template_id UUID REFERENCES brain_templates(id),
    title VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    metadata JSONB DEFAULT '{}',
    summary TEXT,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_brain ON conversations(brain_template_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    tokens_used INTEGER,
    model_used VARCHAR(100),
    latency_ms INTEGER,
    feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(org_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- Update feedback FK now that conversations/messages exist
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_conversation_id_fkey;
ALTER TABLE feedback ADD CONSTRAINT feedback_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL;
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_message_id_fkey;
ALTER TABLE feedback ADD CONSTRAINT feedback_message_id_fkey
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- ============================================================
-- AGENT SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    agent_id UUID REFERENCES agents(id),
    conversation_id UUID REFERENCES conversations(id),
    session_data JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_user ON agent_sessions(user_id, is_active);

-- ============================================================
-- TOOLS & INTENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tool_type VARCHAR(50) DEFAULT 'function',
    parameters JSONB DEFAULT '{}',
    implementation JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intent_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    intent_name VARCHAR(255) NOT NULL,
    patterns TEXT[] NOT NULL,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.7,
    response_template TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intent_patterns_agent ON intent_patterns(agent_type);

-- ============================================================
-- AGENT-SPECIFIC MEMORY (from 012)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    agent_type VARCHAR(50) NOT NULL,
    memory_type VARCHAR(50) NOT NULL CHECK (memory_type IN (
        'preference', 'style', 'fact', 'instruction', 'correction',
        'resonance', 'avoid', 'example', 'context', 'goal'
    )),
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    source VARCHAR(50) DEFAULT 'conversation' CHECK (source IN (
        'conversation', 'explicit', 'inferred', 'imported', 'system'
    )),
    confidence DECIMAL(3,2) DEFAULT 1.0,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, agent_type, memory_type, key)
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_user ON agent_memory(user_id, agent_type, is_active);
CREATE INDEX IF NOT EXISTS idx_agent_memory_org ON agent_memory(org_id, agent_type);

-- ============================================================
-- AGENT RESONANCE, LEARNING, STYLES, INTERACTIONS (from 012)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_resonance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    resonance_type VARCHAR(50) NOT NULL CHECK (resonance_type IN (
        'tone', 'format', 'length', 'depth', 'style',
        'vocabulary', 'examples', 'structure', 'pacing', 'enthusiasm'
    )),
    pattern TEXT NOT NULL,
    examples TEXT[],
    anti_patterns TEXT[],
    score DECIMAL(3,2) DEFAULT 0.0,
    occurrence_count INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, agent_type, resonance_type, pattern)
);

CREATE TABLE IF NOT EXISTS agent_learning_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    trigger_text TEXT,
    learning_summary TEXT NOT NULL,
    confidence_change DECIMAL(3,2),
    affected_memory_ids UUID[],
    affected_resonance_ids UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_style_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    style_config JSONB NOT NULL DEFAULT '{}',
    writer_style JSONB DEFAULT '{}',
    analyst_style JSONB DEFAULT '{}',
    coach_style JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, agent_type)
);

CREATE TABLE IF NOT EXISTS agent_interaction_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    total_interactions INTEGER DEFAULT 0,
    total_tokens_used BIGINT DEFAULT 0,
    avg_satisfaction_score DECIMAL(3,2),
    last_interaction_at TIMESTAMPTZ,
    last_topic TEXT,
    ongoing_project TEXT,
    top_intents JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, agent_type)
);

-- Helper functions from 012
CREATE OR REPLACE FUNCTION get_or_create_agent_style(
    p_org_id UUID, p_user_id UUID, p_agent_type VARCHAR(50)
) RETURNS agent_style_profiles AS $$
DECLARE v_profile agent_style_profiles;
BEGIN
    SELECT * INTO v_profile FROM agent_style_profiles
    WHERE user_id = p_user_id AND agent_type = p_agent_type;
    IF NOT FOUND THEN
        INSERT INTO agent_style_profiles (org_id, user_id, agent_type)
        VALUES (p_org_id, p_user_id, p_agent_type) RETURNING * INTO v_profile;
    END IF;
    RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_agent_interaction(
    p_org_id UUID, p_user_id UUID, p_agent_type VARCHAR(50),
    p_tokens_used INTEGER DEFAULT 0, p_topic TEXT DEFAULT NULL,
    p_intent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO agent_interaction_summary (
        org_id, user_id, agent_type, total_interactions,
        total_tokens_used, last_interaction_at, last_topic
    ) VALUES (p_org_id, p_user_id, p_agent_type, 1, p_tokens_used, NOW(), p_topic)
    ON CONFLICT (user_id, agent_type) DO UPDATE SET
        total_interactions = agent_interaction_summary.total_interactions + 1,
        total_tokens_used = agent_interaction_summary.total_tokens_used + EXCLUDED.total_tokens_used,
        last_interaction_at = NOW(),
        last_topic = COALESCE(EXCLUDED.last_topic, agent_interaction_summary.last_topic),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
