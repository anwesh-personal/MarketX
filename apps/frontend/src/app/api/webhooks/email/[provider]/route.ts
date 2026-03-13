/**
 * UNIFIED EMAIL WEBHOOK HANDLER
 * ==============================
 * Single route handles all email providers: /api/webhooks/email/[provider]
 *   e.g. /api/webhooks/email/mailwizz
 *        /api/webhooks/email/mailgun
 *        /api/webhooks/email/ses
 *        /api/webhooks/email/sendgrid
 *
 * Adding a new provider = add adapter, no route changes needed.
 *
 * Flow:
 *   Request → verify signature → parse events → save signal_event → queue learning-loop job
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Queue } from 'bullmq'
import { getEmailProviderAdapter } from '@/services/email/EmailProviderAdapter'
import type { CanonicalEmailEvent } from '@/services/email/EmailProviderAdapter'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function getRedisConfig() {
  if (process.env.REDIS_URL) {
    const u = new URL(process.env.REDIS_URL)
    return { host: u.hostname, port: parseInt(u.port) || 6379, password: u.password || undefined }
  }
  return { host: process.env.REDIS_HOST || 'localhost', port: 6379 }
}

const learningQueue = new Queue('learning-loop', { connection: getRedisConfig(), prefix: 'axiom:' })

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const providerId = params.provider.toLowerCase()
  const rawBody    = await req.text()

  // 1. Get adapter
  const adapter = getEmailProviderAdapter(providerId)
  if (!adapter) {
    return NextResponse.json({ error: `Unknown provider: ${providerId}` }, { status: 400 })
  }

  // 2. Load provider config for signature verification
  const { data: provConfig } = await supabase
    .from('email_provider_configs')
    .select('webhook_secret, config')
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .limit(1)
    .single()

  const webhookSecret = provConfig?.webhook_secret || provConfig?.config?.webhook_secret
    || process.env[`${providerId.toUpperCase()}_WEBHOOK_SECRET`]
    || ''

  adapter.configure({ webhookSecret })

  // 3. Verify
  const valid = await adapter.verifyWebhook(req, rawBody)
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 4. Parse events
  let events: CanonicalEmailEvent[]
  try {
    events = await adapter.parseEvents(req, rawBody)
  } catch (e: any) {
    return NextResponse.json({ error: `Parse failed: ${e.message}` }, { status: 400 })
  }

  if (events.length === 0) return NextResponse.json({ received: 0 })

  // 5. Insert signal_events (ON CONFLICT DO NOTHING for idempotency)
  const inserts = events.map(evt => ({
    partner_id:  evt.orgId || null,
    event_type:  evt.type,
    source:      providerId,
    belief_id:   evt.beliefId || null,
    icp_id:      evt.icpId   || null,
    offer_id:    evt.offerId  || null,
    brief_id:    evt.briefId  || null,
    occurred_at: evt.timestamp,
    metadata: {
      email:       evt.email,
      message_id:  evt.messageId,
      campaign_id: evt.campaignId,
      reply_body:  evt.replyBody,
      provider:    providerId,
    },
  }))

  const { error: insertErr } = await supabase
    .from('signal_event')
    .upsert(inserts, { onConflict: 'partner_id,event_type,metadata->>message_id', ignoreDuplicates: true })

  if (insertErr) {
    console.error('[webhook] signal_event insert error:', insertErr.message)
  }

  // 6. If there are high-value events (reply, click, bounce), trigger learning immediately
  const highValue = events.filter(e => ['reply', 'click', 'bounce'].includes(e.type))
  if (highValue.length > 0 && events[0].orgId) {
    const orgIds = [...new Set(highValue.map(e => e.orgId).filter(Boolean))]
    for (const orgId of orgIds) {
      await learningQueue.add('coach_analysis', {
        orgId,
        triggeredBy: 'webhook',
        provider:    providerId,
        eventTypes:  [...new Set(highValue.map(e => e.type))],
      }, { jobId: `webhook-${orgId}-${Date.now()}` })
    }
  }

  return NextResponse.json({ received: events.length, provider: providerId })
}
