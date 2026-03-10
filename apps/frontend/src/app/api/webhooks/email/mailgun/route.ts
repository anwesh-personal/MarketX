import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type MailgunEvent = {
    event?: string
    timestamp?: string
    token?: string
    signature?: string
    'user-variables'?: Record<string, unknown>
    [key: string]: unknown
}

function verifyMailgunSignature(timestamp: string, token: string, signature: string): boolean {
    const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY
    if (!signingKey) return false
    const digest = crypto
        .createHmac('sha256', signingKey)
        .update(`${timestamp}${token}`)
        .digest('hex')
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}

function mapMailgunEventToSignal(event: string): 'send' | 'open' | 'click' | 'bounce' | 'complaint' | null {
    switch (event) {
        case 'delivered': return 'send'
        case 'opened': return 'open'
        case 'clicked': return 'click'
        case 'failed':
        case 'permanent_fail':
        case 'temporary_fail':
            return 'bounce'
        case 'complained': return 'complaint'
        default: return null
    }
}

function parseEventData(raw: FormData): MailgunEvent {
    const eventData = raw.get('event-data')
    if (typeof eventData === 'string') {
        return JSON.parse(eventData) as MailgunEvent
    }

    return {
        event: String(raw.get('event') ?? ''),
        timestamp: String(raw.get('timestamp') ?? ''),
        token: String(raw.get('token') ?? ''),
        signature: String(raw.get('signature') ?? ''),
    }
}

export async function POST(req: NextRequest) {
    let form: FormData
    try {
        form = await req.formData()
    } catch {
        return NextResponse.json({ error: 'Invalid form payload' }, { status: 400 })
    }

    let payload: MailgunEvent
    try {
        payload = parseEventData(form)
    } catch {
        return NextResponse.json({ error: 'Invalid event-data payload' }, { status: 400 })
    }

    const timestamp = String(payload.timestamp ?? '')
    const token = String(payload.token ?? '')
    const signature = String(payload.signature ?? '')
    if (!timestamp || !token || !signature) {
        return NextResponse.json({ error: 'Missing webhook signature fields' }, { status: 401 })
    }
    if (!verifyMailgunSignature(timestamp, token, signature)) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    const event = String(payload.event ?? '').toLowerCase()
    const mapped = mapMailgunEventToSignal(event)
    if (!mapped) {
        return NextResponse.json({ success: true, skipped: true, reason: `unsupported_event:${event}` })
    }

    const vars = (payload['user-variables'] ?? {}) as Record<string, unknown>
    const partnerId = String(vars.partner_id ?? '')
    const offerId = String(vars.offer_id ?? '')
    const icpId = String(vars.icp_id ?? '')
    const briefId = String(vars.brief_id ?? '')
    const beliefId = String(vars.belief_id ?? '')
    const flowId = vars.flow_id ? String(vars.flow_id) : null
    const flowStepId = vars.flow_step_id ? String(vars.flow_step_id) : null

    if (!partnerId || !offerId || !icpId || !briefId || !beliefId) {
        return NextResponse.json({ error: 'Missing required ids in user-variables' }, { status: 400 })
    }

    const occurredAt = new Date(Number(timestamp) * 1000).toISOString()

    const { data: inserted, error: insertError } = await supabase
        .from('signal_event')
        .insert({
            partner_id: partnerId,
            offer_id: offerId,
            icp_id: icpId,
            brief_id: briefId,
            belief_id: beliefId,
            flow_id: flowId,
            flow_step_id: flowStepId,
            event_type: mapped,
            event_value: null,
            occurred_at: occurredAt,
            meta: {
                provider: 'mailgun',
                provider_event: event,
                payload,
            },
        })
        .select('id, event_type, occurred_at')
        .single()

    if (insertError || !inserted) {
        return NextResponse.json({ error: `Failed to persist signal_event: ${insertError?.message ?? 'unknown'}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, signal_event: inserted }, { status: 201 })
}
