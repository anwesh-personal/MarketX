/**
 * KB API Routes - CRUD operations for Knowledge Bases
 * 
 * GET - List all KBs for org
 * POST - Create new KB
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { KnowledgeBaseSchema } from '@/lib/kb';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(request: Request) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get('orgId');

        let query = supabase
            .from('knowledge_bases')
            .select('id, name, description, version, stage, is_active, created_at, updated_at')
            .order('created_at', { ascending: false });

        if (orgId) {
            query = query.eq('org_id', orgId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({
            success: true,
            kbs: data
        });
    } catch (error: any) {
        console.error('KB list error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = await request.json();
        const { name, description, orgId, data: kbData } = body;

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Name is required' },
                { status: 400 }
            );
        }

        // Validate KB data if provided
        if (kbData) {
            const result = KnowledgeBaseSchema.safeParse(kbData);
            if (!result.success) {
                return NextResponse.json(
                    { success: false, error: 'Invalid KB data', details: result.error.issues },
                    { status: 400 }
                );
            }
        }

        // Default empty KB structure
        const defaultKB = {
            schema_version: '1.0.0',
            kb_version: '1.0.0',
            stage: 'pre-embeddings',
            brand: {
                brand_name_exact: 'InMarket',
                voice_rules: ['Be professional', 'Be clear', 'Be concise'],
                compliance: {
                    forbidden_claims: [],
                    required_disclosures: [],
                },
            },
            icp_library: {
                segments: [{
                    icp_id: 'default_icp',
                    segment_name: 'Default Segment',
                    industry_group_norm: 'Technology',
                    revenue_band_norm: 'SMB',
                    seniority_norm: 'MANAGER',
                    pain_points: ['Need to improve efficiency'],
                    job_titles: ['Manager'],
                    buying_triggers: ['Growth initiative'],
                    decision_criteria: ['ROI', 'Ease of use'],
                }],
            },
            offer_library: {
                offers: [{
                    offer_id: 'default_offer',
                    offer_name: 'Core Service',
                    category: 'Professional Services',
                    value_proposition: 'We help you achieve your goals',
                    differentiators: ['Expert team', 'Proven methodology'],
                    pricing_model: 'Monthly subscription',
                    delivery_timeline: '30 days',
                    proof_points: ['100+ customers'],
                }],
            },
            angles_library: {
                angles: [{
                    angle_id: 'default_angle',
                    angle_name: 'Upside Focus',
                    axis: 'upside',
                    narrative: 'Focus on the potential gains and opportunities',
                }],
            },
            ctas_library: {
                ctas: [{
                    cta_id: 'default_cta',
                    cta_type: 'BOOK_CALL',
                    label: 'Book a Call',
                    destination_type: 'calendar',
                    destination_slug: '/book',
                }],
            },
            website_library: {
                page_blueprints: [{
                    blueprint_id: 'landing_bp',
                    page_type: 'LANDING',
                    buyer_stage: 'AWARENESS',
                    required_sections: ['hero', 'features', 'cta'],
                    default_cta_type: 'BOOK_CALL',
                }],
                layouts: [{
                    layout_id: 'default_layout',
                    layout_name: 'Standard Layout',
                    structure: ['hero', 'content', 'cta'],
                }],
            },
            email_library: {
                flow_blueprints: [{
                    flow_blueprint_id: 'intro_flow',
                    flow_name: 'Introduction Flow',
                    goal: 'MEANINGFUL_REPLY',
                    length_range: { min: 3, max: 5 },
                    sequence_structure: ['intro', 'value', 'ask'],
                    default_cta_type: 'REPLY',
                }],
                subject_firstline_variants: [{
                    variant_id: 'default_subject',
                    subject: 'Quick question about {{company}}',
                    first_line: 'I noticed that...',
                }],
                reply_playbooks: [{
                    playbook_id: 'default_playbook',
                    playbook_name: 'Standard Replies',
                    scenarios: [{
                        scenario_id: 'general_inquiry',
                        description: 'General inquiry or question',
                        allowed_strategy_ids: ['guidance_first'],
                    }],
                }],
                reply_strategies: [{
                    strategy_id: 'guidance_first',
                    strategy_name: 'Guidance First',
                    strategy_type: 'GUIDANCE_FIRST',
                    rules: ['Answer the question directly', 'Provide helpful context'],
                }],
            },
            social_library: {
                pillars: [{
                    pillar_id: 'thought_leadership',
                    pillar_name: 'Thought Leadership',
                    description: 'Share industry insights and expertise',
                }],
                post_blueprints: [{
                    post_blueprint_id: 'linkedin_insight',
                    platform: 'LinkedIn',
                    post_type: 'insight',
                    structure_rules: ['Hook first', 'Value second', 'CTA last'],
                }],
            },
            routing: {
                defaults: [{
                    context: {},
                    destination_type: 'page',
                    destination_slug: '/book',
                    cta_type: 'BOOK_CALL',
                }],
                rules: [],
            },
            testing: {
                pages: { enabled: true, max_variants: 3, evaluation_window_days: 7, min_sample_size: 100 },
                email_flows: { enabled: true, max_variants: 3, evaluation_window_days: 7, min_sample_size: 100 },
                email_replies: { enabled: true, max_variants: 3, evaluation_window_days: 7, min_sample_size: 100 },
                subject_firstline: { enabled: true, max_variants: 5, evaluation_window_days: 7, min_sample_size: 100 },
            },
            guardrails: {
                paused_patterns: [],
            },
            learning: {
                history: [],
                preferences: [],
            },
        };

        const { data, error } = await supabase
            .from('knowledge_bases')
            .insert({
                id: uuidv4(),
                name,
                description: description || null,
                org_id: orgId || null,
                data: kbData || defaultKB,
                version: '1.0.0',
                stage: 'pre-embeddings',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            kb: data
        });
    } catch (error: any) {
        console.error('KB create error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
