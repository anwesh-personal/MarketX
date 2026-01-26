-- ============================================================
-- AXIOM - CONVERSATION TO BRAIN ASSOCIATION
-- Created: 2026-01-24
-- Description: Adds ability to push conversations to specific brains
-- ============================================================

BEGIN;

-- ============================================================
-- ADD BRAIN ASSOCIATION TO CONVERSATIONS
-- ============================================================

-- Add brain_template_id to conversations if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'brain_template_id'
    ) THEN
        ALTER TABLE conversations 
        ADD COLUMN brain_template_id UUID REFERENCES brain_templates(id);
        
        RAISE NOTICE 'Added brain_template_id to conversations ✓';
    END IF;
END $$;

-- Add status to track conversation state
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'status'
    ) THEN
        ALTER TABLE conversations 
        ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
            CHECK (status IN ('active', 'archived', 'pushed_to_brain'));
        
        RAISE NOTICE 'Added status to conversations ✓';
    END IF;
END $$;

-- Add pushed_at timestamp
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'pushed_to_brain_at'
    ) THEN
        ALTER TABLE conversations 
        ADD COLUMN pushed_to_brain_at TIMESTAMPTZ;
        
        RAISE NOTICE 'Added pushed_to_brain_at to conversations ✓';
    END IF;
END $$;

-- Add summary field for conversation summary
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversations' AND column_name = 'summary'
    ) THEN
        ALTER TABLE conversations 
        ADD COLUMN summary TEXT;
        
        RAISE NOTICE 'Added summary to conversations ✓';
    END IF;
END $$;

-- Index for brain-based queries
CREATE INDEX IF NOT EXISTS conversations_brain_idx 
    ON conversations(brain_template_id, created_at DESC);

-- ============================================================
-- CONVERSATION BRAIN HISTORY
-- Tracks when conversations are pushed to different brains
-- ============================================================

CREATE TABLE IF NOT EXISTS conversation_brain_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    brain_template_id UUID NOT NULL REFERENCES brain_templates(id),
    pushed_by UUID REFERENCES users(id),
    
    -- What was learned
    memories_created INTEGER DEFAULT 0,
    embeddings_created INTEGER DEFAULT 0,
    learning_summary TEXT,
    
    -- Metadata
    pushed_at TIMESTAMPTZ DEFAULT NOW(),
    processing_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS conv_brain_history_conv_idx 
    ON conversation_brain_history(conversation_id, pushed_at DESC);
CREATE INDEX IF NOT EXISTS conv_brain_history_brain_idx 
    ON conversation_brain_history(brain_template_id, pushed_at DESC);

-- ============================================================
-- FUNCTION: Push Conversation to Brain
-- ============================================================

CREATE OR REPLACE FUNCTION push_conversation_to_brain(
    p_conversation_id UUID,
    p_brain_template_id UUID,
    p_user_id UUID
) RETURNS JSON AS $$
DECLARE
    v_history_id UUID;
    v_org_id UUID;
    v_message_count INTEGER;
BEGIN
    -- Get conversation details
    SELECT org_id, total_messages INTO v_org_id, v_message_count
    FROM conversations 
    WHERE id = p_conversation_id;
    
    IF v_org_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Conversation not found');
    END IF;
    
    -- Create history record
    INSERT INTO conversation_brain_history (
        conversation_id, brain_template_id, pushed_by, processing_status
    ) VALUES (
        p_conversation_id, p_brain_template_id, p_user_id, 'pending'
    ) RETURNING id INTO v_history_id;
    
    -- Update conversation
    UPDATE conversations 
    SET brain_template_id = p_brain_template_id,
        status = 'pushed_to_brain',
        pushed_to_brain_at = NOW(),
        updated_at = NOW()
    WHERE id = p_conversation_id;
    
    RETURN json_build_object(
        'success', true,
        'history_id', v_history_id,
        'conversation_id', p_conversation_id,
        'brain_template_id', p_brain_template_id,
        'message_count', v_message_count
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Get Brain's Conversation Data
-- ============================================================

CREATE OR REPLACE FUNCTION get_brain_conversations(
    p_brain_template_id UUID,
    p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
    conversation_id UUID,
    org_id UUID,
    user_id UUID,
    title VARCHAR(500),
    total_messages INTEGER,
    summary TEXT,
    pushed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.org_id,
        c.user_id,
        c.title,
        c.total_messages,
        c.summary,
        c.pushed_to_brain_at,
        c.created_at
    FROM conversations c
    WHERE c.brain_template_id = p_brain_template_id
    ORDER BY c.pushed_to_brain_at DESC NULLS LAST, c.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VALIDATION
-- ============================================================

DO $$
DECLARE
    conv_cols INTEGER;
BEGIN
    SELECT COUNT(*) INTO conv_cols 
    FROM information_schema.columns 
    WHERE table_name = 'conversations' 
    AND column_name IN ('brain_template_id', 'status', 'pushed_to_brain_at', 'summary');
    
    RAISE NOTICE '';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'CONVERSATION TO BRAIN MIGRATION COMPLETE';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'New fields added to conversations: %', conv_cols;
    RAISE NOTICE 'History table: conversation_brain_history';
    RAISE NOTICE 'Functions: push_conversation_to_brain, get_brain_conversations';
    RAISE NOTICE '==================================================';
END $$;

COMMIT;
