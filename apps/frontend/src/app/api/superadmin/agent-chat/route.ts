/**
 * POST /api/superadmin/agent-chat
 *
 * Runs a message through a specific agent template with full orchestration
 * (BrainOrchestrator.handleTurn, tools, optional constitution when orgId provided).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import type { AgentTemplate } from '../agent-templates/route'
import { brainOrchestrator } from '@/services/brain/BrainOrchestrator'
import { ToolLoader } from '@/services/brain/tools/ToolLoader'
import { PromptAssembler } from '@/services/brain/PromptAssembler'
import { loadConstitutionRules } from '@/services/brain/ConstitutionLoader'
import type { BrainChatMessage } from '@/services/ai/types'

/**
 * agent_templates doesn't have a strict_grounding column (brain_agents does).
 * For superadmin testing via template, always enforce strict grounding —
 * this is the production-safe default. If per-template grounding is needed
 * later, add the column to agent_templates and read it here.
 */
const TEMPLATE_STRICT_GROUNDING_DEFAULT = true

const bodySchema = z.object({
    agentTemplateId: z.string().uuid(),
    message: z.string().min(1).max(10000),
    history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional().default([]),
    orgId: z.string().uuid({ message: 'orgId is required — agents need an org context for tool execution and constitution rules' }),
})

export async function POST(req: NextRequest) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 })
        }

        const body = await req.json()
        const { agentTemplateId, message, history, orgId } = bodySchema.parse(body)

        const supabase = createClient()
        const { data: template, error: tmplErr } = await supabase
            .from('agent_templates')
            .select('*')
            .eq('id', agentTemplateId)
            .eq('is_active', true)
            .maybeSingle()

        if (tmplErr) throw new Error(tmplErr.message)
        if (!template) {
            return NextResponse.json({ error: 'Agent template not found or inactive' }, { status: 404 })
        }

        const toolNames = Array.isArray(template.tools_enabled) ? template.tools_enabled : []
        const tools = await ToolLoader.getToolsByName(toolNames)

        const constitutionRules = await loadConstitutionRules(orgId)

        const agentPromptData = {
            foundation_prompt: template.system_prompt ?? '',
            persona_prompt: template.persona_prompt ?? '',
            domain_prompt: null as string | null,
            guardrails_prompt: template.guardrails_prompt ?? '',
            strict_grounding: TEMPLATE_STRICT_GROUNDING_DEFAULT,
            name: template.name,
        }

        const systemPrompt = PromptAssembler.assemble(
            agentPromptData,
            null,
            [],
            undefined,
            constitutionRules
        ).systemPrompt

        const messages: BrainChatMessage[] = [
            ...history.map((m: { role: string; content: string }) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
            { role: 'user', content: message },
        ]

        const result = await brainOrchestrator.handleTurn({
            orgId,
            agentId: undefined,
            conversationId: undefined,
            messages,
            systemPrompt,
            tools,
            options: {
                maxTurns: template.max_turns ?? 10,
                preferredProvider: template.preferred_provider ?? undefined,
                preferredModel: template.preferred_model ?? undefined,
            },
        })

        return NextResponse.json({
            response: result.response,
            metadata: {
                agentTemplateId: template.id,
                agentName: template.name,
                tokensUsed: result.totalTokens,
                turnsUsed: result.turnsUsed,
                toolsUsed: result.toolCallsMade.map(t => t.name),
            },
        })
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request', details: error.errors },
                { status: 400 }
            )
        }
        console.error('Agent chat error:', error)
        return NextResponse.json(
            { error: error.message || 'Agent chat failed' },
            { status: 500 }
        )
    }
}
