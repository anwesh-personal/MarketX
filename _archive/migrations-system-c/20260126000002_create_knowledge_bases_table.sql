-- ============================================================
-- MIGRATION: Create Knowledge Bases Table
-- This table stores KB JSON data referenced by engine_instances
-- ============================================================

-- Create knowledge_bases table (referenced by engine_instances.kb_id)
CREATE TABLE IF NOT EXISTS knowledge_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- The actual KB data (JSON blob matching kb.schema.ts)
    data JSONB NOT NULL DEFAULT '{}',
    
    -- Version tracking for updates
    version INTEGER DEFAULT 1,
    
    -- Metadata
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_org_id ON knowledge_bases(org_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_status ON knowledge_bases(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_updated ON knowledge_bases(updated_at DESC);

-- GIN index for JSONB queries (e.g., querying ICP segments)
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_data ON knowledge_bases USING GIN(data);

-- Comments
COMMENT ON TABLE knowledge_bases IS 'Stores Knowledge Base JSON data used by workflow engines for content generation';
COMMENT ON COLUMN knowledge_bases.data IS 'Full KB JSON matching kb.schema.ts structure';
COMMENT ON COLUMN knowledge_bases.version IS 'Incremented on each update for cache invalidation';

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;

-- Users can see KBs from their organization
CREATE POLICY "Users see org KBs"
    ON knowledge_bases FOR SELECT
    USING (
        org_id IN (
            SELECT organization_id FROM memberships WHERE user_id = auth.uid()
        )
    );

-- Users can create KBs for their organization  
CREATE POLICY "Users create org KBs"
    ON knowledge_bases FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT organization_id FROM memberships WHERE user_id = auth.uid()
        )
    );

-- Users can update KBs in their organization
CREATE POLICY "Users update org KBs"
    ON knowledge_bases FOR UPDATE
    USING (
        org_id IN (
            SELECT organization_id FROM memberships WHERE user_id = auth.uid()
        )
    );

-- Service role can do anything
CREATE POLICY "Service role full access on KBs"
    ON knowledge_bases
    USING (auth.role() = 'service_role');

-- ============================================================
-- HELPER FUNCTION: Update version on data change
-- ============================================================

CREATE OR REPLACE FUNCTION increment_kb_version()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.data IS DISTINCT FROM NEW.data THEN
        NEW.version := OLD.version + 1;
        NEW.updated_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kb_version_trigger
    BEFORE UPDATE ON knowledge_bases
    FOR EACH ROW
    EXECUTE FUNCTION increment_kb_version();

-- ============================================================
-- SEED: Example KB for testing
-- ============================================================

-- Only insert if no KBs exist (development seed)
INSERT INTO knowledge_bases (id, name, org_id, description, data)
SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Demo Knowledge Base',
    (SELECT id FROM organizations LIMIT 1),
    'Example KB for testing workflow execution',
    '{
        "brand": {
            "brand_name_exact": "Axiom Demo",
            "voice_rules": ["Be professional", "Be helpful", "Be concise"]
        },
        "icp_library": {
            "segments": [{
                "icp_id": "icp_default",
                "segment_name": "Growth Marketing Leaders",
                "industry_group_norm": "Technology",
                "revenue_band_norm": "$1M-$10M",
                "job_titles": ["Head of Marketing", "VP Growth", "CMO"],
                "pain_points": ["Content creation is slow", "Hard to maintain consistency", "Team is overwhelmed"],
                "decision_criteria": ["Time savings", "Quality output", "Easy to use"]
            }]
        },
        "offer_library": {
            "offers": [{
                "offer_id": "offer_default",
                "offer_name": "Axiom Workflow Engine",
                "category": "Content Automation",
                "value_proposition": "Generate consistent, on-brand content in seconds",
                "differentiators": ["AI-powered workflows", "KB-driven consistency", "Multi-channel output"],
                "proof_points": ["80% faster content creation", "99% brand consistency", "5x more output"],
                "pricing_model": "Monthly subscription",
                "delivery_timeline": "Instant deployment"
            }]
        },
        "angles_library": {
            "angles": [{
                "angle_id": "angle_speed",
                "angle_name": "Speed Angle",
                "axis": "speed",
                "narrative": "Stop waiting weeks for content. Get it in minutes."
            }, {
                "angle_id": "angle_control",
                "angle_name": "Control Angle",
                "axis": "control",
                "narrative": "Finally take control of your content pipeline."
            }]
        },
        "website_library": {
            "page_blueprints": [{
                "blueprint_id": "bp_landing",
                "page_type": "LANDING",
                "buyer_stage": "AWARENESS",
                "default_cta_type": "BOOK_CALL"
            }],
            "layouts": [{
                "layout_id": "layout_default",
                "structure": ["hero", "features", "proof", "cta"],
                "applies_to": { "buyer_stage": "AWARENESS" }
            }]
        },
        "email_library": {
            "flow_blueprints": [{
                "flow_blueprint_id": "flow_nurture",
                "name": "Nurture Sequence",
                "goal": "MEANINGFUL_REPLY",
                "length_range": { "min": 5, "max": 7 }
            }],
            "reply_playbooks": [{
                "playbook_id": "pb_default",
                "name": "Standard Reply Playbook",
                "scenarios": [{
                    "scenario_id": "pricing_question",
                    "allowed_strategy_ids": ["strat_guidance"]
                }]
            }],
            "reply_strategies": [{
                "strategy_id": "strat_guidance",
                "strategy_type": "GUIDANCE_FIRST",
                "rules": ["Answer the question directly", "Provide value first", "Suggest next step"]
            }]
        },
        "social_library": {
            "post_blueprints": [{
                "post_blueprint_id": "post_insight",
                "platform": "LinkedIn",
                "post_type": "insight"
            }],
            "pillars": [{
                "pillar_id": "pillar_education",
                "pillar_name": "Education"
            }]
        },
        "ctas_library": {
            "ctas": [{
                "cta_id": "cta_book",
                "cta_type": "BOOK_CALL",
                "label": "Book a Strategy Call",
                "destination_type": "calendar",
                "destination_slug": "/book"
            }, {
                "cta_id": "cta_learn",
                "cta_type": "CLICK",
                "label": "Learn More",
                "destination_type": "page",
                "destination_slug": "/how-it-works"
            }]
        },
        "routing": {
            "rules": [{
                "rule_id": "route_awareness",
                "if": { "buyer_stage": "AWARENESS" },
                "then": { "next_destination_slug": "/how-it-works", "preferred_cta_id": "cta_learn" }
            }]
        }
    }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM knowledge_bases LIMIT 1);
