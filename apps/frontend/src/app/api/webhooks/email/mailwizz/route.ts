import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const EVENT_MAP: Record<string, string> = {
    'subscribe': 'send',
    'delivery': 'send',
    'open': 'open',
    'click': 'click',
    'bounce': 'bounce',
    'complaint': 'complaint',
    'unsubscribe': 'complaint',
    'hard_bounce': 'bounce',
    'soft_bounce': 'bounce',
    'internal_bounce': 'bounce',
}

export async function POST(req: NextRequest) {
    const secret = process.env.MAILWIZZ_WEBHOOK_SECRET
    if (!secret) return NextResponse.json({ error: 'Mailwizz webhook secret not configured' }, { status: 500 })

    const signatureHeader = req.headers.get('x-mw-signature') || req.headers.get('x-mailwizz-signature')
    const rawBody = await req.text()

    if (signatureHeader) {
        const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
        if (!crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
    } else {
        const authHeader = req.headers.get('authorization')
        if (authHeader !== `Bearer ${secret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    let payload: any
    try { payload = JSON.parse(rawBody) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const events = Array.isArray(payload) ? payload : [payload]
    const supabase = createClient()
    const signalInserts: any[] = []
    const errors: string[] = []

    for (const evt of events) {
        const mwEvent = evt.event || evt.type || evt.event_type
        const canonicalType = EVENT_MAP[mwEvent?.toLowerCase()]
        if (!canonicalType) {
            errors.push(`Unknown Mailwizz event type: ${mwEvent}`)
            continue
        }

        const customFields = evt.custom_fields || evt.custom || evt.tags || {}
        const partnerId = customFields.partner_id || evt.partner_id
        const offerId = customFields.offer_id || evt.offer_id
        const icpId = customFields.icp_id || evt.icp_id
        const briefId = customFields.brief_id || evt.brief_id
        const beliefId = customFields.belief_id || evt.belief_id
        const satelliteId = customFields.satellite_id || evt.satellite_id

        if (!partnerId || !offerId || !icpId || !briefId || !beliefId) {
            errors.push(`Missing required IDs in event ${mwEvent}: partner_id=${partnerId}, offer_id=${offerId}, icp_id=${icpId}, brief_id=${briefId}, belief_id=${beliefId}`)
            continue
        }

        const messageId = evt.message_id || evt.email_uid || evt.campaign_uid
        const idempotencyKey = `mw_${messageId ?? 'noid'}_${canonicalType}_${Date.now()}`

        signalInserts.push({
            partner_id: partnerId,
            offer_id: offerId,
            icp_id: icpId,
            brief_id: briefId,
            belief_id: beliefId,
            event_type: canonicalType,
            source: 'mailwizz',
            metadata: {
                raw_event: mwEvent,
                message_id: messageId,
                subscriber_email: evt.subscriber?.email || evt.email || evt.to,
                campaign_uid: evt.campaign_uid || evt.campaign_id,
                list_uid: evt.list_uid || evt.list_id,
                satellite_id: satelliteId,
                ip: evt.ip || evt.ip_address,
                user_agent: evt.user_agent,
                url: evt.url,
                bounce_type: canonicalType === 'bounce' ? (mwEvent?.includes('hard') ? 'hard' : 'soft') : undefined,
                idempotency_key: idempotencyKey,
            },
        })
    }

    if (signalInserts.length > 0) {
        const { error: insertErr } = await supabase
            .from('signal_event')
            .insert(signalInserts)
        if (insertErr) {
            return NextResponse.json({
                error: `Signal insert failed: ${insertErr.message}`,
                partial_errors: errors,
            }, { status: 500 })
        }
    }

    return NextResponse.json({
        success: true,
        events_processed: signalInserts.length,
        events_skipped: errors.length,
        skipped_reasons: errors.length > 0 ? errors : undefined,
    })
}
