import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type SnsEnvelope = {
    Type: 'Notification' | 'SubscriptionConfirmation' | 'UnsubscribeConfirmation'
    MessageId: string
    TopicArn: string
    Subject?: string
    Message: string
    Timestamp: string
    SignatureVersion: string
    Signature: string
    SigningCertURL: string
    SubscribeURL?: string
    Token?: string
}

function buildSnsStringToSign(envelope: SnsEnvelope): string {
    const base: Array<[string, string | undefined]> = [
        ['Message', envelope.Message],
        ['MessageId', envelope.MessageId],
    ]

    if (envelope.Type === 'Notification' && envelope.Subject) {
        base.push(['Subject', envelope.Subject])
    }

    base.push(['Timestamp', envelope.Timestamp])
    base.push(['TopicArn', envelope.TopicArn])
    base.push(['Type', envelope.Type])

    if (envelope.Type === 'SubscriptionConfirmation' || envelope.Type === 'UnsubscribeConfirmation') {
        base.push(['Token', envelope.Token])
        base.push(['SubscribeURL', envelope.SubscribeURL])
    }

    return base
        .filter(([, v]) => typeof v === 'string')
        .map(([k, v]) => `${k}\n${v}\n`)
        .join('')
}

async function verifySnsSignature(envelope: SnsEnvelope): Promise<boolean> {
    if (envelope.SignatureVersion !== '1') return false

    const certUrl = new URL(envelope.SigningCertURL)
    if (certUrl.protocol !== 'https:') return false
    if (!certUrl.hostname.endsWith('.amazonaws.com')) return false

    const certResponse = await fetch(envelope.SigningCertURL)
    if (!certResponse.ok) return false
    const certPem = await certResponse.text()

    const verifier = crypto.createVerify('RSA-SHA1')
    verifier.update(buildSnsStringToSign(envelope), 'utf8')
    verifier.end()
    return verifier.verify(certPem, Buffer.from(envelope.Signature, 'base64'))
}

function mapSesEventToSignal(eventType: string): 'send' | 'open' | 'click' | 'bounce' | 'complaint' | null {
    switch (eventType) {
        case 'Delivery': return 'send'
        case 'Open': return 'open'
        case 'Click': return 'click'
        case 'Bounce': return 'bounce'
        case 'Complaint': return 'complaint'
        default: return null
    }
}

export async function POST(req: NextRequest) {
    let envelope: SnsEnvelope
    try {
        envelope = (await req.json()) as SnsEnvelope
    } catch {
        return NextResponse.json({ error: 'Invalid SNS payload' }, { status: 400 })
    }

    const verified = await verifySnsSignature(envelope)
    if (!verified) {
        return NextResponse.json({ error: 'Invalid SNS signature' }, { status: 401 })
    }

    if (envelope.Type === 'SubscriptionConfirmation' && envelope.SubscribeURL) {
        await fetch(envelope.SubscribeURL)
        return NextResponse.json({ success: true, subscription_confirmed: true })
    }

    if (envelope.Type !== 'Notification') {
        return NextResponse.json({ success: true, skipped: true, reason: `unsupported_sns_type:${envelope.Type}` })
    }

    let message: any
    try {
        message = JSON.parse(envelope.Message)
    } catch {
        return NextResponse.json({ error: 'Invalid SES message payload' }, { status: 400 })
    }

    const sesType = String(message.eventType ?? '')
    const mapped = mapSesEventToSignal(sesType)
    if (!mapped) {
        return NextResponse.json({ success: true, skipped: true, reason: `unsupported_ses_event:${sesType}` })
    }

    const tags = message.mail?.tags ?? {}
    const partnerId = String(tags.partner_id?.[0] ?? '')
    const offerId = String(tags.offer_id?.[0] ?? '')
    const icpId = String(tags.icp_id?.[0] ?? '')
    const briefId = String(tags.brief_id?.[0] ?? '')
    const beliefId = String(tags.belief_id?.[0] ?? '')
    const flowId = tags.flow_id?.[0] ? String(tags.flow_id[0]) : null
    const flowStepId = tags.flow_step_id?.[0] ? String(tags.flow_step_id[0]) : null

    if (!partnerId || !offerId || !icpId || !briefId || !beliefId) {
        return NextResponse.json({ error: 'Missing required SES mail.tags ids' }, { status: 400 })
    }

    const occurredAt = message.mail?.timestamp
        ? new Date(message.mail.timestamp).toISOString()
        : new Date().toISOString()

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
                provider: 'ses',
                provider_event: sesType,
                sns_message_id: envelope.MessageId,
                payload: message,
            },
        })
        .select('id, event_type, occurred_at')
        .single()

    if (insertError || !inserted) {
        return NextResponse.json({ error: `Failed to persist signal_event: ${insertError?.message ?? 'unknown'}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, signal_event: inserted }, { status: 201 })
}
