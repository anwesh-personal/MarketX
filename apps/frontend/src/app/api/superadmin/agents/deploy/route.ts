export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const deploySchema = z.object({
    org_id:              z.string().uuid('org_id must be a valid UUID'),
    template_id:         z.string().uuid('template_id must be a valid UUID'),
    // Override fields — if not provided, values come from the template
    name:                z.string().min(1).max(255).optional(),
    avatar_emoji:        z.string().max(10).optional(),
    tier:                z.enum(['basic', 'medium', 'enterprise']).optional(),
    foundation_prompt:   z.string().optional(),
    persona_prompt:      z.string().optional(),
    domain_prompt:       z.string().optional(),
    guardrails_prompt:   z.string().optional(),
    tools_granted:       z.array(z.string()).optional(),
    agents_enabled:      z.array(z.string()).optional(),
    rag_top_k:           z.number().int().min(1).max(20).optional(),
    rag_min_confidence:  z.number().min(0).max(1).optional(),
    rag_query_expansion: z.boolean().optional(),
    max_turns:           z.number().int().min(1).max(25).optional(),
    strict_grounding:    z.boolean().optional(),
    use_platform_keys:   z.boolean().optional(),
    preferred_provider:  z.string().optional(),
    preferred_model:     z.string().optional(),
})

// POST /api/superadmin/agents/deploy
export async function POST(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const parsed = deploySchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
    }

    const supabase = createClient()

    // 1. Verify org exists
    const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', parsed.data.org_id)
        .single()

    if (orgErr || !org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // 2. Fetch template + its prompt layers
    const { data: template, error: tmplErr } = await supabase
        .from('brain_templates')
        .select(`
            id, name, pricing_tier, version,
            default_tools, default_agents, default_rag_config,
            foundation:foundation_layer_id(content),
            persona:persona_layer_id(content),
            guardrails:guardrails_layer_id(content)
        `)
        .eq('id', parsed.data.template_id)
        .eq('is_active', true)
        .single()

    if (tmplErr || !template) {
        return NextResponse.json({ error: 'Template not found or inactive' }, { status: 404 })
    }

    // 3. Check if agent already exists for this org (no duplicates)
    const { data: existing } = await supabase
        .from('brain_agents')
        .select('id, status')
        .eq('org_id', parsed.data.org_id)
        .is('user_id', null)
        .single()

    if (existing) {
        return NextResponse.json(
            { error: `This org already has a deployed agent (id: ${existing.id}, status: ${existing.status}). Update it instead of re-deploying.` },
            { status: 409 }
        )
    }

    // 4. Resolve prompt content
    // Template → prompt layer text (copied at deploy time — never referenced)
    const ragConfig = template.default_rag_config as Record<string, unknown> ?? {}

    const agentRow = {
        org_id:              parsed.data.org_id,
        user_id:             null,
        template_id:         parsed.data.template_id,
        template_version:    template.version,

        name:                parsed.data.name           ?? template.name,
        avatar_emoji:        parsed.data.avatar_emoji   ?? '🧠',
        tier:                parsed.data.tier           ?? (template.pricing_tier === 'echii' ? 'basic' : template.pricing_tier === 'pulz' ? 'medium' : 'enterprise'),
        status:              'configuring',

        // Prompt layers — copied as text (NOT referenced)
        foundation_prompt:   parsed.data.foundation_prompt  ?? (template.foundation  as any)?.content ?? '',
        persona_prompt:      parsed.data.persona_prompt     ?? (template.persona     as any)?.content ?? '',
        domain_prompt:       parsed.data.domain_prompt      ?? null,
        guardrails_prompt:   parsed.data.guardrails_prompt  ?? (template.guardrails  as any)?.content ?? '',

        tools_granted:       parsed.data.tools_granted  ?? (template.default_tools  as string[]) ?? [],
        agents_enabled:      parsed.data.agents_enabled ?? (template.default_agents as string[]) ?? ['writer', 'generalist'],

        rag_top_k:           parsed.data.rag_top_k          ?? (ragConfig.topK           as number) ?? 8,
        rag_min_confidence:  parsed.data.rag_min_confidence ?? (ragConfig.minConfidence  as number) ?? 0.65,
        rag_query_expansion: parsed.data.rag_query_expansion ?? (ragConfig.queryExpansion as boolean) ?? true,
        rag_fts_weight:      (ragConfig.ftsWeight    as number) ?? 0.3,
        rag_vector_weight:   (ragConfig.vectorWeight as number) ?? 0.7,

        max_turns:           parsed.data.max_turns       ?? 20,
        strict_grounding:    parsed.data.strict_grounding ?? true,
        use_platform_keys:   parsed.data.use_platform_keys ?? true,
        preferred_provider:  parsed.data.preferred_provider ?? null,
        preferred_model:     parsed.data.preferred_model    ?? null,

        deployed_at:         new Date().toISOString(),
        deployed_by:         admin.id,
    }

    const { data: agent, error: agentErr } = await supabase
        .from('brain_agents')
        .insert(agentRow)
        .select()
        .single()

    if (agentErr) {
        console.error('Deploy agent failed:', agentErr)
        return NextResponse.json({ error: agentErr.message }, { status: 500 })
    }

    // 5. Create default KB sections for this agent
    const defaultSections = [
        { name: 'brand_voice',   display_name: 'Brand Voice',    lock_level: 'org_admin',   description: 'Brand personality, tone, and communication style' },
        { name: 'icp',           display_name: 'ICP',            lock_level: 'org_admin',   description: 'Ideal Customer Profile definition' },
        { name: 'offer',         display_name: 'Your Offer',     lock_level: 'org_admin',   description: 'Product/service details and value proposition' },
        { name: 'angles',        display_name: 'Angle Library',  lock_level: 'org_admin',   description: 'Belief frameworks and messaging angles' },
        { name: 'examples',      display_name: 'Examples',       lock_level: 'user',        description: 'Good examples and reference content' },
        { name: 'guardrails',    display_name: 'Guardrails',     lock_level: 'superadmin',  description: 'Content restrictions (managed by platform)' },
    ]

    const sectionsToInsert = defaultSections.map(s => ({
        agent_id:     agent.id,
        org_id:       parsed.data.org_id,
        ...s,
        is_active:    true,
    }))

    const { error: sectErr } = await supabase.from('kb_sections').insert(sectionsToInsert)
    if (sectErr) {
        console.error('KB sections creation failed:', sectErr)
        // Non-fatal — agent is created, sections can be created manually
    }

    return NextResponse.json({
        agent,
        org: { id: org.id, name: org.name },
        kb_sections_created: sectErr ? 0 : defaultSections.length,
    }, { status: 201 })
}
