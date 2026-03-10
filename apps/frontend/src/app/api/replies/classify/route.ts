import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { aiProviderService } from '@/services/ai/AIProviderService'

const classifySchema = z.object({
    belief_id: z.string().uuid('belief_id must be a valid UUID'),
    reply_text: z.string().min(3, 'reply_text must be at least 3 chars'),
    flow_id: z.string().uuid().optional(),
    flow_step_id: z.string().uuid().optional(),
    occurred_at: z.string().datetime().optional(),
})

const LABELS = [
    'Interested',
    'Clarification',
    'Objection',
    'Timing',
    'Referral',
    'Negative',
    'Noise',
] as const

type ReplyLabel = (typeof LABELS)[number]

function normalizeLabel(label: string): ReplyLabel {
    const normalized = label.trim().toLowerCase()
    const matched = LABELS.find((l) => l.toLowerCase() === normalized)
    return matched ?? 'Noise'
}

function extractJson(text: string): string {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('Model output did not contain JSON object')
    }
    return text.slice(start, end + 1)
}

function heuristicFallback(reply: string): { label: ReplyLabel; confidence: number; rationale: string } {
    const t = reply.toLowerCase()
    if (/(book|schedule|let'?s talk|interested|sounds good|yes)/.test(t)) {
        return { label: 'Interested', confidence: 0.62, rationale: 'Detected clear positive intent keywords.' }
    }
    if (/(what|how|can you|details|clarify|question)/.test(t)) {
        return { label: 'Clarification', confidence: 0.56, rationale: 'Detected question-oriented language.' }
    }
    if (/(not interested|no thanks|remove me|stop|unsubscribe)/.test(t)) {
        return { label: 'Negative', confidence: 0.68, rationale: 'Detected explicit rejection keywords.' }
    }
    if (/(later|next month|next quarter|not now|timing)/.test(t)) {
        return { label: 'Timing', confidence: 0.58, rationale: 'Detected deferment/timing language.' }
    }
    if (/(talk to|speak with|contact|my team|loop in)/.test(t)) {
        return { label: 'Referral', confidence: 0.54, rationale: 'Detected referral/redirect language.' }
    }
    return { label: 'Noise', confidence: 0.45, rationale: 'No reliable signal matched deterministic patterns.' }
}

export async function POST(req: NextRequest) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me, error: meError } = await supabase
        .from('users')
        .select('id, org_id')
        .eq('id', user.id)
        .single()
    if (meError || !me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = classifySchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const input = parsed.data

    const { data: belief, error: beliefError } = await supabase
        .from('belief')
        .select('id, partner_id, offer_id, icp_id, brief_id')
        .eq('id', input.belief_id)
        .eq('partner_id', me.org_id)
        .single()
    if (beliefError || !belief) {
        return NextResponse.json({ error: 'Belief not found for this org' }, { status: 404 })
    }

    let label: ReplyLabel = 'Noise'
    let confidence = 0
    let rationale = 'No rationale'
    let modelMeta: Record<string, unknown> = {}
    let usedFallback = false

    try {
        const response = await aiProviderService.generateChat(
            me.org_id,
            [
                {
                    role: 'system',
                    content: [
                        'Classify inbound sales reply into exactly one label:',
                        LABELS.join(', '),
                        'Return only JSON: {"label":"...","confidence":0-1,"rationale":"..."}',
                    ].join('\n'),
                },
                {
                    role: 'user',
                    content: `Reply:\n${input.reply_text}`,
                },
            ],
            {
                temperature: 0.1,
                maxTokens: 180,
                responseFormat: { type: 'json_object' },
            }
        )

        const raw = extractJson(response.content)
        const parsedModel = JSON.parse(raw) as { label?: string; confidence?: number; rationale?: string }

        label = normalizeLabel(parsedModel.label ?? 'Noise')
        confidence = Math.max(0, Math.min(1, Number(parsedModel.confidence ?? 0.5)))
        rationale = String(parsedModel.rationale ?? 'Classified by model')
        modelMeta = {
            provider: response.providerType,
            model: response.model,
            usage: response.usage,
        }
    } catch (e: any) {
        const fallback = heuristicFallback(input.reply_text)
        label = fallback.label
        confidence = fallback.confidence
        rationale = fallback.rationale
        usedFallback = true
        modelMeta = { fallback_error: e?.message ?? 'unknown' }
    }

    const { data: signalRow, error: signalError } = await supabase
        .from('signal_event')
        .insert({
            partner_id: me.org_id,
            offer_id: belief.offer_id,
            icp_id: belief.icp_id,
            brief_id: belief.brief_id,
            belief_id: belief.id,
            flow_id: input.flow_id ?? null,
            flow_step_id: input.flow_step_id ?? null,
            event_type: 'reply',
            event_value: null,
            occurred_at: input.occurred_at ?? new Date().toISOString(),
            meta: {
                reply_text: input.reply_text,
                classification: {
                    label,
                    confidence,
                    rationale,
                    labels: LABELS,
                    used_fallback: usedFallback,
                },
                model: modelMeta,
            },
        })
        .select('id, occurred_at, meta')
        .single()

    if (signalError || !signalRow) {
        return NextResponse.json({ error: `Failed to persist reply signal: ${signalError?.message ?? 'unknown'}` }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        classification: { label, confidence, rationale, used_fallback: usedFallback },
        signal_event: { id: signalRow.id, occurred_at: signalRow.occurred_at },
    })
}
