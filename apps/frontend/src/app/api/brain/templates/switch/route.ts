import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/requireFeature'

async function getAuthContext(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    const { data: userRecord } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
    if (!userRecord?.org_id) return null
    return { userId: user.id, orgId: userRecord.org_id }
}

export async function POST(request: NextRequest) {
    try {
        const gate = await requireFeature(request, 'can_train_brain')
        if (gate.denied) return gate.response

        const supabase = createClient()
        const ctx = await getAuthContext(supabase)
        if (!ctx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { templateId } = body

        if (!templateId) {
            return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
        }

        const { data: template, error: templateError } = await supabase
            .from('brain_templates')
            .select('id, name, config, pricing_tier')
            .eq('id', templateId)
            .eq('is_active', true)
            .single()

        if (templateError || !template) {
            return NextResponse.json({ error: 'Template not found or inactive' }, { status: 404 })
        }

        const { data: existingAgent, error: agentError } = await supabase
            .from('brain_agents')
            .select('id')
            .eq('org_id', ctx.orgId)
            .eq('is_active', true)
            .single()

        if (existingAgent) {
            const { error: updateError } = await supabase
                .from('brain_agents')
                .update({
                    brain_template_id: templateId,
                    config: template.config,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingAgent.id)

            if (updateError) throw updateError
        } else {
            const { error: insertError } = await supabase
                .from('brain_agents')
                .insert({
                    org_id: ctx.orgId,
                    brain_template_id: templateId,
                    name: `${template.name} Agent`,
                    agent_type: 'generalist',
                    system_prompt: template.config?.agents?.chat?.systemPrompt || 'You are a helpful AI assistant.',
                    tools: template.config?.agents?.chat?.tools || [],
                    config: template.config,
                    is_active: true
                })

            if (insertError) throw insertError
        }

        return NextResponse.json({ success: true, templateId, templateName: template.name })
    } catch (error: any) {
        console.error('Switch brain template error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to switch brain template' },
            { status: 500 }
        )
    }
}
