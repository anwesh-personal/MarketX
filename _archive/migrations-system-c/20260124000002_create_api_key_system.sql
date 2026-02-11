-- ============================================================================
-- API KEY SYSTEM FOR ENGINE ACCESS
-- Ported from Lekhika - Production Grade
-- ============================================================================
--
-- This migration creates:
-- 1. user_api_keys table - Store API keys for user-engine access
-- 2. Add api_key column to engine_instances
-- 3. Functions for API key generation and validation
-- 4. Engine assignment with automatic API key generation

-- ============================================================================
-- 1. ADD API KEY COLUMN TO ENGINE_INSTANCES TABLE
-- ============================================================================

ALTER TABLE engine_instances ADD COLUMN IF NOT EXISTS api_key text UNIQUE;
ALTER TABLE engine_instances ADD COLUMN IF NOT EXISTS api_key_created_at timestamptz DEFAULT now();

-- ============================================================================
-- 2. CREATE USER_API_KEYS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,  -- References platform users (can be org user or system user)
    engine_id uuid REFERENCES engine_instances(id) ON DELETE CASCADE NOT NULL,
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- API Key Details
    api_key text UNIQUE NOT NULL,
    key_type text DEFAULT 'engine_access' 
        CHECK (key_type IN ('engine_access', 'admin', 'system', 'webhook')),
    permissions text[] DEFAULT ARRAY['execute', 'read'],
    
    -- Status & Usage
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    last_used_at timestamptz,
    
    -- Rate limiting
    rate_limit_per_minute integer DEFAULT 60,
    rate_limit_per_day integer DEFAULT 10000,
    
    -- Expiration (optional)
    expires_at timestamptz,  -- NULL = never expires
    
    -- Metadata
    name text,  -- Human-readable name for the key
    description text,
    metadata jsonb DEFAULT '{}',
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid,  -- Who created this key
    
    -- Unique constraint: one key per user-engine combination
    UNIQUE(user_id, engine_id)
);

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_engine_id ON user_api_keys(engine_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_org_id ON user_api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_api_key ON user_api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_is_active ON user_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_engine_instances_api_key ON engine_instances(api_key);

-- ============================================================================
-- 4. API KEY GENERATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_axiom_api_key(
    p_user_id uuid, 
    p_engine_id uuid
) RETURNS text AS $$
DECLARE
    v_api_key text;
    v_timestamp text;
    v_random text;
BEGIN
    -- Generate timestamp in base36
    v_timestamp := to_hex(extract(epoch from now())::bigint);
    
    -- Generate random hex
    v_random := encode(gen_random_bytes(8), 'hex');
    
    -- Format: AXIOM-{user_id_slice}-{engine_id_slice}-{timestamp}-{random}
    v_api_key := 'AXIOM-' ||
        substr(p_user_id::text, 1, 8) || '-' ||
        substr(p_engine_id::text, 1, 8) || '-' ||
        v_timestamp || '-' ||
        v_random;
    
    RETURN v_api_key;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. ASSIGN ENGINE TO USER WITH AUTO API KEY
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_engine_to_user(
    p_user_id uuid,
    p_engine_id uuid,
    p_org_id uuid DEFAULT NULL,
    p_assigned_by uuid DEFAULT NULL,
    p_permissions text[] DEFAULT ARRAY['execute', 'read'],
    p_key_name text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_api_key text;
    v_key_record record;
    v_engine_name text;
BEGIN
    -- Get engine name for the key name
    SELECT name INTO v_engine_name FROM engine_instances WHERE id = p_engine_id;
    
    -- Generate API key
    v_api_key := generate_axiom_api_key(p_user_id, p_engine_id);
    
    -- Insert API key record
    INSERT INTO user_api_keys (
        user_id,
        engine_id,
        org_id,
        api_key,
        key_type,
        permissions,
        name,
        created_by
    ) VALUES (
        p_user_id,
        p_engine_id,
        p_org_id,
        v_api_key,
        'engine_access',
        p_permissions,
        COALESCE(p_key_name, v_engine_name || ' Access Key'),
        p_assigned_by
    )
    ON CONFLICT (user_id, engine_id) 
    DO UPDATE SET 
        api_key = EXCLUDED.api_key,
        is_active = true,
        updated_at = now()
    RETURNING * INTO v_key_record;
    
    -- Return the created key info
    RETURN jsonb_build_object(
        'success', true,
        'api_key', v_api_key,
        'key_id', v_key_record.id,
        'engine_id', p_engine_id,
        'user_id', p_user_id,
        'permissions', p_permissions
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. VALIDATE API KEY FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_api_key(p_api_key text)
RETURNS jsonb AS $$
DECLARE
    v_key_record record;
BEGIN
    -- Find the key
    SELECT 
        k.*,
        e.name as engine_name,
        e.status as engine_status,
        e.flow_config
    INTO v_key_record
    FROM user_api_keys k
    JOIN engine_instances e ON k.engine_id = e.id
    WHERE k.api_key = p_api_key
    AND k.is_active = true
    AND (k.expires_at IS NULL OR k.expires_at > now());
    
    -- Not found
    IF v_key_record IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Invalid or expired API key'
        );
    END IF;
    
    -- Check if engine is active
    IF v_key_record.engine_status != 'active' THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Engine is not active'
        );
    END IF;
    
    -- Update usage
    UPDATE user_api_keys 
    SET 
        usage_count = usage_count + 1,
        last_used_at = now()
    WHERE api_key = p_api_key;
    
    -- Return valid response
    RETURN jsonb_build_object(
        'valid', true,
        'user_id', v_key_record.user_id,
        'engine_id', v_key_record.engine_id,
        'org_id', v_key_record.org_id,
        'engine_name', v_key_record.engine_name,
        'permissions', v_key_record.permissions,
        'usage_count', v_key_record.usage_count + 1
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. REVOKE API KEY FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION revoke_api_key(p_api_key text)
RETURNS boolean AS $$
BEGIN
    UPDATE user_api_keys 
    SET is_active = false, updated_at = now()
    WHERE api_key = p_api_key;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. REGENERATE API KEY FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION regenerate_api_key(p_api_key text)
RETURNS text AS $$
DECLARE
    v_key_record record;
    v_new_api_key text;
BEGIN
    -- Get existing key record
    SELECT * INTO v_key_record
    FROM user_api_keys
    WHERE api_key = p_api_key;
    
    IF v_key_record IS NULL THEN
        RAISE EXCEPTION 'API key not found';
    END IF;
    
    -- Generate new key
    v_new_api_key := generate_axiom_api_key(v_key_record.user_id, v_key_record.engine_id);
    
    -- Update record with new key
    UPDATE user_api_keys 
    SET 
        api_key = v_new_api_key,
        usage_count = 0,
        updated_at = now()
    WHERE api_key = p_api_key;
    
    RETURN v_new_api_key;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE TRIGGER update_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can view their own API keys
CREATE POLICY "Users can view own API keys" ON user_api_keys
    FOR SELECT USING (user_id = auth.uid());

-- Users can create their own API keys
CREATE POLICY "Users can create own API keys" ON user_api_keys
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own API keys
CREATE POLICY "Users can update own API keys" ON user_api_keys
    FOR UPDATE USING (user_id = auth.uid());

-- Org admins can manage org API keys
CREATE POLICY "Org admins can manage org API keys" ON user_api_keys
    FOR ALL USING (
        org_id IN (
            SELECT org_id FROM organization_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Service role bypass
CREATE POLICY "Service role has full access to API keys" ON user_api_keys
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 11. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_api_keys IS 'Stores API keys for user access to deployed engines';
COMMENT ON COLUMN user_api_keys.api_key IS 'Format: AXIOM-{user_id_slice}-{engine_id_slice}-{timestamp}-{random}';
COMMENT ON COLUMN user_api_keys.key_type IS 'engine_access=normal user, admin=superadmin, system=internal, webhook=external triggers';
COMMENT ON COLUMN user_api_keys.permissions IS 'Array of permissions: execute, read, configure, admin';
COMMENT ON FUNCTION generate_axiom_api_key IS 'Generates a unique API key for user-engine combination';
COMMENT ON FUNCTION assign_engine_to_user IS 'Assigns an engine to a user and creates their API key';
COMMENT ON FUNCTION validate_api_key IS 'Validates an API key and returns user/engine info';
