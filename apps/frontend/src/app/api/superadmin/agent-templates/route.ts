import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'

// ============================================================
// TYPES
// ============================================================

export interface AgentTemplate {
    id: string
    slug: string
    name: string
    description: string | null
    avatar_emoji: string
    avatar_color: string
    category: 'writer' | 'research' | 'learning' | 'builder' | 'general'
    product_target: 'market_writer' | 'market_builder' | 'market_coach' | 'all'
    system_prompt: string
    persona_prompt: string | null
    instruction_prompt: string | null
    guardrails_prompt: string | null
    preferred_provider: string | null
    preferred_model: string | null
    temperature: number
    max_tokens: number
    tools_enabled: string[]
    skills: any[]
    has_own_kb: boolean
    kb_object_types: string[]
    kb_min_confidence: number
    input_schema: Record<string, any>
    output_schema: Record<string, any>
    max_turns: number
    requires_approval: boolean
    can_access_brain: boolean
    can_write_to_brain: boolean
    is_active: boolean
    is_system: boolean
    tier: 'basic' | 'pro' | 'enterprise'
    version: string
    created_by: string | null
    created_at: string
    updated_at: string
}

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const createAgentTemplateSchema = z.object({
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    avatar_emoji: z.string().max(10).default('🤖'),
    avatar_color: z.enum(['primary', 'success', 'warning', 'accent', 'info']).default('primary'),
    category: z.enum(['writer', 'research', 'learning', 'builder', 'general']).default('general'),
    product_target: z.enum(['market_writer', 'market_builder', 'market_coach', 'all']).default('market_writer'),
    system_prompt: z.string().default(''),
    persona_prompt: z.string().optional(),
    instruction_prompt: z.string().optional(),
    guardrails_prompt: z.string().optional(),
    preferred_provider: z.string().optional(),
    preferred_model: z.string().optional(),
    temperature: z.number().min(0).max(2).default(0.7),
    max_tokens: z.number().min(100).max(128000).default(4096),
    tools_enabled: z.array(z.string()).default([]),
    skills: z.array(z.any()).default([]),
    has_own_kb: z.boolean().default(false),
    kb_object_types: z.array(z.string()).default([]),
    kb_min_confidence: z.number().min(0).max(1).default(0.6),
    input_schema: z.record(z.any()).default({}),
    output_schema: z.record(z.any()).default({}),
    max_turns: z.number().min(1).max(50).default(10),
    requires_approval: z.boolean().default(false),
    can_access_brain: z.boolean().default(true),
    can_write_to_brain: z.boolean().default(false),
    is_active: z.boolean().default(true),
    tier: z.enum(['basic', 'pro', 'enterprise']).default('basic'),
})

// ============================================================
// GET /api/superadmin/agent-templates
// List all agent templates
// ============================================================

export async function GET(req: NextRequest) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Superadmin access required' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(req.url)
        const category = searchParams.get('category')
        const product = searchParams.get('product')
        const activeOnly = searchParams.get('active') === 'true'

        const supabase = createClient()
        let qb = supabase
            .from('agent_templates')
            .select('*')
            .order('category')
            .order('name')

        if (category) {
            qb = qb.eq('category', category)
        }

        if (product) {
            qb = qb.or(`product_target.eq.${product},product_target.eq.all`)
        }

        if (activeOnly) {
            qb = qb.eq('is_active', true)
        }

        const { data: templates, error } = await qb

        if (error) throw new Error(error.message)

        const all = templates ?? []

        const stats = {
            total: all.length,
            active: all.filter(t => t.is_active).length,
            byCategory: {
                writer: all.filter(t => t.category === 'writer').length,
                research: all.filter(t => t.category === 'research').length,
                learning: all.filter(t => t.category === 'learning').length,
                builder: all.filter(t => t.category === 'builder').length,
                general: all.filter(t => t.category === 'general').length,
            },
            byProduct: {
                market_writer: all.filter(t => t.product_target === 'market_writer' || t.product_target === 'all').length,
                market_builder: all.filter(t => t.product_target === 'market_builder' || t.product_target === 'all').length,
                market_coach: all.filter(t => t.product_target === 'market_coach' || t.product_target === 'all').length,
            },
            system: all.filter(t => t.is_system).length,
        }

        return NextResponse.json({
            agents: all,
            stats,
            count: all.length
        })
    } catch (error: any) {
        console.error('GET /api/superadmin/agent-templates failed:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

// ============================================================
// POST /api/superadmin/agent-templates
// Create new agent template
// ============================================================

export async function POST(req: NextRequest) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Superadmin access required' },
                { status: 401 }
            )
        }

        const body = await req.json()
        const validated = createAgentTemplateSchema.parse(body)

        const supabase = createClient()

        // Check slug uniqueness
        const { data: existing } = await supabase
            .from('agent_templates')
            .select('id')
            .eq('slug', validated.slug)
            .maybeSingle()

        if (existing) {
            return NextResponse.json(
                { error: 'An agent template with this slug already exists' },
                { status: 409 }
            )
        }

        const { data: result, error } = await supabase
            .from('agent_templates')
            .insert({
                slug: validated.slug,
                name: validated.name,
                description: validated.description || null,
                avatar_emoji: validated.avatar_emoji,
                avatar_color: validated.avatar_color,
                category: validated.category,
                product_target: validated.product_target,
                system_prompt: validated.system_prompt,
                persona_prompt: validated.persona_prompt || null,
                instruction_prompt: validated.instruction_prompt || null,
                guardrails_prompt: validated.guardrails_prompt || null,
                preferred_provider: validated.preferred_provider || null,
                preferred_model: validated.preferred_model || null,
                temperature: validated.temperature,
                max_tokens: validated.max_tokens,
                tools_enabled: validated.tools_enabled,
                skills: validated.skills,
                has_own_kb: validated.has_own_kb,
                kb_object_types: validated.kb_object_types,
                kb_min_confidence: validated.kb_min_confidence,
                input_schema: validated.input_schema,
                output_schema: validated.output_schema,
                max_turns: validated.max_turns,
                requires_approval: validated.requires_approval,
                can_access_brain: validated.can_access_brain,
                can_write_to_brain: validated.can_write_to_brain,
                is_active: validated.is_active,
                tier: validated.tier,
                created_by: admin.id,
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json(
                    { error: 'An agent template with this slug already exists' },
                    { status: 409 }
                )
            }
            throw new Error(error.message)
        }

        return NextResponse.json(
            { agent: result },
            { status: 201 }
        )
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                },
                { status: 400 }
            )
        }

        console.error('POST /api/superadmin/agent-templates failed:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
