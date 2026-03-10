import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import crypto from 'crypto'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const bookingSchema = z.object({
    external_booking_id: z.string().min(1),
    partner_id: z.string().uuid(),
    offer_id: z.string().uuid(),
    icp_id: z.string().uuid(),
    brief_id: z.string().uuid(),
    belief_id: z.string().uuid(),
    flow_id: z.string().uuid().optional(),
    flow_step_id: z.string().uuid().optional(),
    booked_at: z.string().datetime(),
    value: z.number().optional(),
    source: z.enum(['crm', 'calendar', 'manual']).optional().default('crm'),
    metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

function verifyWebhookSecret(req: NextRequest): boolean {
    const expected = process.env.CRM_BOOKING_WEBHOOK_SECRET
    if (!expected) return false
    const incoming = req.headers.get('x-axiom-webhook-secret') || ''
    if (!incoming) return false
    return cryptoSafeEqual(expected, incoming)
}

function cryptoSafeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a)
    const bBuf = Buffer.from(b)
    if (aBuf.length !== bBuf.length) return false
    return crypto.timingSafeEqual(aBuf, bBuf)
}

export async function POST(req: NextRequest) {
    if (!verifyWebhookSecret(req)) {
        return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
    }

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = bookingSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const booking = parsed.data

    const { data: meeting, error: meetingError } = await supabase
        .from('meeting')
        .upsert({
            external_booking_id: booking.external_booking_id,
            partner_id: booking.partner_id,
            offer_id: booking.offer_id,
            icp_id: booking.icp_id,
            brief_id: booking.brief_id,
            belief_id: booking.belief_id,
            flow_id: booking.flow_id ?? null,
            flow_step_id: booking.flow_step_id ?? null,
            source: booking.source,
            status: 'booked',
            booked_at: booking.booked_at,
            meta: booking.metadata,
        }, { onConflict: 'external_booking_id' })
        .select('id, external_booking_id, booked_at, status')
        .single()

    if (meetingError || !meeting) {
        return NextResponse.json({ error: `Failed to persist meeting: ${meetingError?.message ?? 'unknown'}` }, { status: 500 })
    }

    const { data: signal, error: signalError } = await supabase
        .from('signal_event')
        .insert({
            partner_id: booking.partner_id,
            offer_id: booking.offer_id,
            icp_id: booking.icp_id,
            brief_id: booking.brief_id,
            belief_id: booking.belief_id,
            flow_id: booking.flow_id ?? null,
            flow_step_id: booking.flow_step_id ?? null,
            event_type: 'booking',
            event_value: booking.value ?? null,
            occurred_at: booking.booked_at,
            meta: {
                provider: 'crm',
                external_booking_id: booking.external_booking_id,
                meeting_id: meeting.id,
                booking_metadata: booking.metadata,
            },
        })
        .select('id, event_type, occurred_at')
        .single()

    if (signalError || !signal) {
        return NextResponse.json({ error: `Failed to persist booking signal_event: ${signalError?.message ?? 'unknown'}` }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        meeting,
        signal_event: signal,
    }, { status: 201 })
}
