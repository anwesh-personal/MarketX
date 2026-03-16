import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiProviderService } from '@/services/ai/AIProviderService'

export async function POST(req: NextRequest) {
    const supabase = createClient()

    try {
        // 1. Authenticate
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Get user's org (RLS policy uses get_user_org_id() to avoid recursion)
        const { data: userRecord, error: userError } = await supabase
            .from('users')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (userError || !userRecord?.org_id) {
            console.error('[onboarding] users query failed:', userError)
            return NextResponse.json({ error: `User lookup failed: ${userError?.message || 'no org_id'}` }, { status: 400 })
        }

        const orgId = userRecord.org_id
        const body = await req.json()
        const { company, icps, offer, voice } = body

        if (!company?.name || !company?.description) {
            return NextResponse.json({ error: 'Company name and description are required' }, { status: 400 })
        }

        // 2. Build Knowledge Base from company data
        const kbData = buildKBData(company, icps, offer, voice)

        const { data: kb, error: kbError } = await supabase
            .from('knowledge_bases')
            .insert({
                org_id: orgId,
                name: `${company.name} — Core Knowledge`,
                data: kbData,
                version: 1,
                is_active: true,
            })
            .select('id')
            .single()

        if (kbError) {
            console.error('KB creation failed:', kbError)
        }

        // 3. Create ICP records in RS:OS
        const icpRecords = []
        for (const icp of (icps || [])) {
            if (!icp.title) continue

            const { data: icpRecord, error: icpError } = await supabase
                .from('icp')
                .insert({
                    partner_id: orgId,
                    name: `${icp.title} (${icp.seniority || 'Any'})`,
                    criteria: {
                        job_title: icp.title,
                        seniority: icp.seniority,
                        company_size: icp.company_size,
                        industry: icp.industry || company.industry,
                        pain_points: (icp.pain_points || []).filter((p: string) => p.trim()),
                        goals: (icp.goals || []).filter((g: string) => g.trim()),
                        objections: (icp.objections || []).filter((o: string) => o.trim()),
                    },
                    status: 'ACTIVE',
                })
                .select('id, name')
                .single()

            if (icpRecord) icpRecords.push(icpRecord)
            if (icpError) console.error('ICP creation failed:', icpError)
        }

        // 4. Create Offer record in RS:OS
        let offerRecord = null
        if (offer?.name) {
            const { data: offerData, error: offerError } = await supabase
                .from('offer')
                .insert({
                    partner_id: orgId,
                    name: offer.name,
                    category: offer.category || 'general',
                    primary_promise: offer.primary_promise,
                    status: 'ACTIVE',
                    metadata: {
                        pricing_model: offer.pricing_model,
                        key_differentiators: (offer.key_differentiators || []).filter((d: string) => d.trim()),
                        proof_points: (offer.proof_points || []).filter((p: string) => p.trim()),
                    },
                })
                .select('id, name')
                .single()

            if (offerData) offerRecord = offerData
            if (offerError) console.error('Offer creation failed:', offerError)
        }

        // 5. Update Brain Agent's domain_prompt with onboarding data
        const domainContext = buildDomainPrompt(company, icps, offer, voice)

        const { data: agents } = await supabase
            .from('brain_agents')
            .select('id, domain_prompt')
            .eq('org_id', orgId)

        for (const agent of (agents || [])) {
            const current = agent.domain_prompt || ''
            const updated = `${domainContext}\n\n${current}`.trim()

            await supabase
                .from('brain_agents')
                .update({
                    domain_prompt: updated,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', agent.id)
        }

        // 6. Store voice data as constitution rules (if voice configured)
        if (voice?.tone || (voice?.phrases_to_avoid?.length && voice.phrases_to_avoid.some((p: string) => p.trim()))) {
            await createConstitutionRules(supabase, orgId, voice)
        }

        // 7. Create initial brain memories from onboarding
        const memories = buildInitialMemories(company, icps, offer, voice, orgId)
        if (memories.length > 0) {
            await supabase.from('brain_memories').insert(memories)
        }

        // 8. Mark onboarding complete (safe — ignores if columns don't exist)
        const { error: markError } = await supabase
            .from('users')
            .update({
                onboarding_completed: true,
                onboarding_completed_at: new Date().toISOString(),
                onboarding_data: { company, icps, offer, voice },
            })
            .eq('id', user.id)

        if (markError) {
            console.error('[onboarding] mark complete failed:', markError.message)
        }

        // Update onboarding session (safe — table might not exist)
        const { error: sessionError } = await supabase
            .from('onboarding_sessions')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                company_data: company,
                icp_data: icps,
                offer_data: offer,
                voice_data: voice,
            })
            .eq('user_id', user.id)
            .eq('status', 'in_progress')

        if (sessionError) {
            console.error('[onboarding] session update failed:', sessionError.message)
        }

        // 9. Generate a sample email via the real AI provider (if configured)
        let sampleEmail = ''
        let aiUsed = false
        try {
            const icp = icps?.[0]
            const prompt = buildSampleEmailPrompt(company, icp, offer, voice)

            const response = await aiProviderService.generateChat(
                orgId,
                [
                    { role: 'system', content: prompt.system },
                    { role: 'user', content: prompt.user },
                ],
                { temperature: 0.7, maxTokens: 1500 }
            )

            if (response.content) {
                sampleEmail = response.content
                aiUsed = true
            }
        } catch (aiError: any) {
            console.error('[onboarding] AI email generation failed (expected if no provider configured):', aiError.message)
            sampleEmail = buildFallbackEmail(company, icps?.[0], offer, voice)
        }

        return NextResponse.json({
            success: true,
            kb_id: kb?.id ?? null,
            icps_created: icpRecords.length,
            offer_created: !!offerRecord,
            agents_updated: (agents || []).length,
            sample_email: sampleEmail,
            ai_generated: aiUsed,
        })
    } catch (error: any) {
        console.error('Onboarding completion error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

// ============================================================
// HELPERS
// ============================================================

function buildKBData(company: any, icps: any[], offer: any, voice: any): Record<string, any> {
    const clean = (arr: string[]) => (arr || []).filter((s: string) => s?.trim())

    return {
        schema_version: '1.0.0',
        kb_version: '1.0.0',
        stage: 'pre-embeddings',
        brand: {
            brand_name_exact: company.name,
            industry: company.industry || '',
            website: company.website || '',
            company_size: company.size || '',
            description: company.description,
            voice_rules: voice?.tone ? [`Write in a ${voice.tone} tone`] : [],
            personality: voice?.personality || [],
            phrases_to_use: clean(voice?.phrases_to_use),
            phrases_to_avoid: clean(voice?.phrases_to_avoid),
            email_sign_off: voice?.email_sign_off || '',
            compliance: {
                forbidden_claims: clean(voice?.phrases_to_avoid),
                required_disclosures: [],
            },
        },
        icp_library: {
            segments: (icps || []).filter((i: any) => i.title).map((icp: any, idx: number) => ({
                icp_id: `onboarding_icp_${idx + 1}`,
                segment_name: `${icp.title} (${icp.seniority || 'Any'})`,
                industry_group_norm: icp.industry || company.industry || '',
                seniority_norm: (icp.seniority || 'MANAGER').toUpperCase().replace(/[- ]/g, '_'),
                company_size: icp.company_size || '',
                pain_points: clean(icp.pain_points),
                goals: clean(icp.goals),
                objections: clean(icp.objections),
                job_titles: [icp.title],
                buying_triggers: [],
                decision_criteria: [],
            })),
        },
        offer_library: {
            offers: offer?.name ? [{
                offer_id: 'onboarding_offer_1',
                offer_name: offer.name,
                category: offer.category || 'General',
                value_proposition: offer.primary_promise || '',
                differentiators: clean(offer.key_differentiators),
                pricing_model: offer.pricing_model || '',
                proof_points: clean(offer.proof_points),
                delivery_timeline: '',
            }] : [],
        },
        angles_library: { angles: [] },
        ctas_library: { ctas: [{ cta_id: 'default_cta', cta_type: 'REPLY', label: 'Reply', destination_type: 'reply', destination_slug: '' }] },
        email_library: {
            flow_blueprints: [{
                flow_blueprint_id: 'intro_flow',
                flow_name: 'Introduction Flow',
                goal: 'MEANINGFUL_REPLY',
                length_range: { min: 3, max: 5 },
                sequence_structure: ['intro', 'value', 'ask'],
                default_cta_type: 'REPLY',
            }],
            subject_firstline_variants: [],
            reply_playbooks: [],
            reply_strategies: [],
        },
        website_library: { page_blueprints: [], layouts: [] },
        social_library: { pillars: [], post_blueprints: [] },
        routing: { defaults: [], rules: [] },
        testing: {
            pages: { enabled: false, max_variants: 3, evaluation_window_days: 7, min_sample_size: 100 },
            email_flows: { enabled: true, max_variants: 3, evaluation_window_days: 7, min_sample_size: 100 },
            email_replies: { enabled: false, max_variants: 3, evaluation_window_days: 7, min_sample_size: 100 },
            subject_firstline: { enabled: true, max_variants: 5, evaluation_window_days: 7, min_sample_size: 100 },
        },
        guardrails: { paused_patterns: [] },
        learning: { history: [], preferences: [] },
    }
}

function buildDomainPrompt(company: any, icps: any[], offer: any, voice: any): string {
    const lines: string[] = []

    lines.push(`## COMPANY CONTEXT`)
    lines.push(`You work for ${company.name}, a ${company.industry || ''} company.`)
    lines.push(`${company.description}`)

    if (offer?.name) {
        lines.push(`\n## PRIMARY OFFER`)
        lines.push(`Product: ${offer.name}`)
        if (offer.primary_promise) lines.push(`Promise: ${offer.primary_promise}`)

        const diffs = (offer.key_differentiators || []).filter((d: string) => d.trim())
        if (diffs.length) lines.push(`Differentiators: ${diffs.join('; ')}`)
    }

    for (const icp of (icps || [])) {
        if (!icp.title) continue
        lines.push(`\n## TARGET CUSTOMER: ${icp.title}`)
        const pains = (icp.pain_points || []).filter((p: string) => p.trim())
        if (pains.length) lines.push(`Pain points: ${pains.join('; ')}`)
        const goals = (icp.goals || []).filter((g: string) => g.trim())
        if (goals.length) lines.push(`Goals: ${goals.join('; ')}`)
    }

    if (voice?.tone) {
        lines.push(`\n## COMMUNICATION STYLE`)
        lines.push(`Tone: ${voice.tone}`)
        if (voice.personality?.length) lines.push(`Personality: ${voice.personality.join(', ')}`)
        if (voice.email_sign_off) lines.push(`Sign-off: ${voice.email_sign_off}`)
    }

    return lines.join('\n')
}

async function createConstitutionRules(supabase: any, orgId: string, voice: any) {
    const rules: any[] = []

    if (voice.tone) {
        rules.push({
            org_id: orgId,
            rule_type: 'style',
            enforcement: 'strict',
            content: `Always write in a ${voice.tone} tone.${voice.personality?.length ? ` Embody these traits: ${voice.personality.join(', ')}.` : ''}`,
            is_active: true,
        })
    }

    const avoid = (voice.phrases_to_avoid || []).filter((p: string) => p.trim())
    for (const phrase of avoid) {
        rules.push({
            org_id: orgId,
            rule_type: 'forbidden',
            enforcement: 'strict',
            content: `Never use the phrase: "${phrase}"`,
            is_active: true,
        })
    }

    if (rules.length > 0) {
        await supabase.from('constitution_rules').insert(rules)
    }
}

function buildInitialMemories(company: any, icps: any[], offer: any, voice: any, orgId: string): any[] {
    const memories: any[] = []
    const now = new Date().toISOString()

    memories.push({
        org_id: orgId,
        memory_type: 'semantic',
        content: `Company: ${company.name}. ${company.description}`,
        summary: `Core company identity for ${company.name}`,
        importance: 1.0,
        source: 'onboarding',
        created_at: now,
    })

    if (offer?.name) {
        memories.push({
            org_id: orgId,
            memory_type: 'semantic',
            content: `Primary offer: ${offer.name}. Promise: ${offer.primary_promise || 'N/A'}`,
            summary: `Main product/offer`,
            importance: 0.9,
            source: 'onboarding',
            created_at: now,
        })
    }

    for (const icp of (icps || [])) {
        if (!icp.title) continue
        const pains = (icp.pain_points || []).filter((p: string) => p.trim())
        memories.push({
            org_id: orgId,
            memory_type: 'semantic',
            content: `Target customer: ${icp.title} (${icp.seniority}). Pain points: ${pains.join(', ')}`,
            summary: `ICP profile: ${icp.title}`,
            importance: 0.85,
            source: 'onboarding',
            created_at: now,
        })
    }

    return memories
}

function buildSampleEmailPrompt(company: any, icp: any, offer: any, voice: any): { system: string; user: string } {
    const title = icp?.title || 'decision-maker'
    const pains = (icp?.pain_points || []).filter((p: string) => p.trim())
    const goals = (icp?.goals || []).filter((g: string) => g.trim())
    const diffs = (offer?.key_differentiators || []).filter((d: string) => d.trim())
    const proofs = (offer?.proof_points || []).filter((p: string) => p.trim())
    const personality = (voice?.personality || []).join(', ')

    const system = [
        `You are a cold email writer for ${company.name}, a ${company.industry || ''} company.`,
        `Company: ${company.description}`,
        offer?.name ? `Product: ${offer.name}. Promise: ${offer.primary_promise || ''}` : '',
        diffs.length ? `Differentiators: ${diffs.join('; ')}` : '',
        proofs.length ? `Proof points: ${proofs.join('; ')}` : '',
        voice?.tone ? `Tone: ${voice.tone}` : '',
        personality ? `Personality: ${personality}` : '',
        voice?.email_sign_off ? `Sign off with: ${voice.email_sign_off}` : '',
        voice?.phrases_to_avoid?.filter((p: string) => p.trim()).length
            ? `NEVER use: ${voice.phrases_to_avoid.filter((p: string) => p.trim()).join(', ')}` : '',
    ].filter(Boolean).join('\n')

    const user = [
        `Write a single cold outreach email to a ${title}${icp?.seniority ? ` (${icp.seniority})` : ''}.`,
        pains.length ? `Their pain points: ${pains.join('; ')}` : '',
        goals.length ? `Their goals: ${goals.join('; ')}` : '',
        `Keep it under 150 words. Make it personal, specific, and end with a soft CTA.`,
        `Use [First Name] as placeholder. Output ONLY the email body, nothing else.`,
    ].filter(Boolean).join('\n')

    return { system, user }
}

function buildFallbackEmail(company: any, icp: any, offer: any, voice: any): string {
    const title = icp?.title || 'decision-maker'
    const pain = icp?.pain_points?.find((p: string) => p.trim()) || 'the challenges you face'
    const promise = offer?.primary_promise || 'transform your operations'
    const signOff = voice?.email_sign_off || 'Best'

    return [
        `Hi [First Name],`,
        ``,
        `I noticed that many ${title}s in ${company.industry || 'your industry'} are dealing with ${pain}.`,
        ``,
        `At ${company.name}, we help teams like yours ${promise}.`,
        ``,
        `Would a quick 15-minute chat make sense to see if this is relevant?`,
        ``,
        `${signOff},`,
        `[Your Name]`,
        ``,
        `---`,
        `(Note: This is a template. Once an AI provider is configured, your Brain will generate personalized emails using everything you taught it during onboarding.)`,
    ].join('\n')
}
