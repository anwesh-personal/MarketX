/**
 * UNIFIED EMAIL WEBHOOK HANDLER
 * ==============================
 * Enterprise-grade: no band-aids, no env fallbacks for secrets, idempotent.
 *
 * Single route: /api/webhooks/email/[provider]
 *   e.g. /api/webhooks/email/mailwizz
 *        /api/webhooks/email/mailgun
 *        /api/webhooks/email/ses
 *        /api/webhooks/email/sendgrid
 *
 * Flow:
 *   1. Resolve adapter by provider (path param).
 *   2. Load webhook config from email_provider_configs (provider_type, webhook_secret required).
 *   3. Verify signature; reject 401 if invalid.
 *   4. Parse canonical events; reject 400 on parse error.
 *   5. INSERT into signal_event (source + metadata). On unique_violation (23505) → 200 (idempotent).
 *   6. Enqueue learning-loop job for reply/click/bounce per org.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireEnv } from '@/lib/require-env'
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
    return { host: u.hostname, port: parseInt(u.port, 10) || 6379, password: u.password || undefined }
  }
  return { host: requireEnv('REDIS_HOST'), port: 6379 }
}

function getLearningQueue(): Queue | null {
  try {
    return new Queue('learning-loop', { connection: getRedisConfig(), prefix: 'axiom:' })
  } catch {
    return null
  }
}

function getMasteryQueue(): Queue | null {
  try {
    return new Queue('mastery-agent', { connection: getRedisConfig(), prefix: 'axiom:' })
  } catch {
    return null
  }
}

// Postgres unique_violation
const PG_UNIQUE_VIOLATION = '23505'

export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const providerId = params.provider?.toLowerCase()
  if (!providerId) {
    return NextResponse.json({ error: 'Missing provider' }, { status: 400 })
  }

  const adapter = getEmailProviderAdapter(providerId)
  if (!adapter) {
    return NextResponse.json({ error: `Unsupported provider: ${providerId}` }, { status: 400 })
  }

  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Load config: email_provider_configs uses provider_type (not provider_id)
  const { data: provConfig, error: configError } = await supabase
    .from('email_provider_configs')
    .select('webhook_secret, provider_settings')
    .eq('provider_type', providerId)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (configError) {
    console.error('[webhook] config load error:', configError.message)
    return NextResponse.json({ error: 'Provider config unavailable' }, { status: 503 })
  }

  const webhookSecret =
    provConfig?.webhook_secret ??
    (provConfig?.provider_settings as Record<string, unknown>)?.webhook_secret

  if (adapter.capabilities.webhooks && !webhookSecret) {
    return NextResponse.json(
      {
        error: `Webhook secret not configured for ${providerId}. Configure it in Superadmin → Email Providers.`,
      },
      { status: 503 }
    )
  }

  adapter.configure({ webhookSecret: String(webhookSecret ?? '') })

  const valid = await adapter.verifyWebhook(req, rawBody)
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let events: CanonicalEmailEvent[]
  try {
    events = await adapter.parseEvents(req, rawBody)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Parse failed'
    return NextResponse.json({ error: `Parse failed: ${message}` }, { status: 400 })
  }

  if (events.length === 0) {
    return NextResponse.json({ received: 0, provider: providerId })
  }

  // partner_id is NOT NULL; only persist events with org attribution
  const eventsWithOrg = events.filter((e) => e.orgId != null)
  if (eventsWithOrg.length === 0) {
    return NextResponse.json(
      {
        error: 'All events missing org_id (attribution). Ensure tracking tags are set when sending.',
      },
      { status: 400 }
    )
  }

  const inserts = eventsWithOrg.map((evt) => ({
    partner_id: evt.orgId!,
    event_type: evt.type,
    source: providerId,
    belief_id: evt.beliefId ?? null,
    icp_id: evt.icpId ?? null,
    offer_id: evt.offerId ?? null,
    brief_id: evt.briefId ?? null,
    occurred_at: evt.timestamp,
    metadata: {
      email: evt.email,
      message_id: evt.messageId,
      campaign_id: evt.campaignId,
      reply_body: evt.replyBody,
      provider: providerId,
    },
  }))

  const { error: insertErr } = await supabase.from('signal_event').insert(inserts)

  if (insertErr) {
    if (insertErr.code === PG_UNIQUE_VIOLATION) {
      return NextResponse.json({
        received: eventsWithOrg.length,
        provider: providerId,
        duplicate: true,
      })
    }
    console.error('[webhook] signal_event insert error:', insertErr.code, insertErr.message)
    return NextResponse.json(
      {
        error: 'Failed to persist events',
        code: insertErr.code,
      },
      { status: 500 }
    )
  }

  const highValue = eventsWithOrg.filter((e) => ['reply', 'click', 'bounce'].includes(e.type))
  const orgIds = [...new Set(highValue.map((e) => e.orgId!))]

  if (orgIds.length > 0) {
    const queue = getLearningQueue()
    if (queue) {
      for (const orgId of orgIds) {
        await queue.add(
          'coach_analysis',
          {
            orgId,
            triggeredBy: 'webhook',
            provider: providerId,
            eventTypes: [...new Set(highValue.map((e) => e.type))],
          },
          { jobId: `webhook-${orgId}-${Date.now()}` }
        )
      }
    }
  }

  // Queue mastery agent jobs for reply classification (reply_meaning agent)
  const replyEvents = eventsWithOrg.filter((e) => e.type === 'reply')
  if (replyEvents.length > 0) {
    const masteryQueue = getMasteryQueue()
    if (masteryQueue) {
      for (const evt of replyEvents) {
        await masteryQueue.add(
          'reply_meaning',
          {
            agentType: 'reply_meaning' as const,
            orgId: evt.orgId!,
            input: {
              replyBody: evt.replyBody ?? '',
              senderEmail: evt.email,
              beliefId: evt.beliefId,
              messageId: evt.messageId,
              campaignId: evt.campaignId,
            },
          },
          { jobId: `reply-classify-${evt.orgId}-${evt.messageId ?? Date.now()}` }
        )
      }
    }
  }

  // ── Forward to Refinery Nexus (fire-and-forget) ───────────
  // Axiom is the primary webhook receiver (for learning-loop / signal_event).
  // Refinery is the data warehouse. We forward so ClickHouse engagement_events
  // stays in sync without requiring MailWizz to dual-send.
  forwardToRefinery(rawBody, providerId).catch((err) =>
    console.warn('[webhook] Refinery forward failed (non-blocking):', err.message)
  )

  return NextResponse.json({ received: eventsWithOrg.length, provider: providerId })
}

/**
 * Fire-and-forget: POST raw webhook payload to Refinery Nexus.
 * Uses the REFINERY_NEXUS_URL env var + a v1 API key.
 * If either is missing, silently skips (dev mode / not yet configured).
 */
async function forwardToRefinery(rawBody: string, provider: string) {
  const refineryUrl = process.env.REFINERY_NEXUS_URL
  const refineryKey = process.env.REFINERY_NEXUS_API_KEY
  if (!refineryUrl || !refineryKey) return

  const endpoint = `${refineryUrl.replace(/\/+$/, '')}/api/v1/webhooks/${provider}`
  await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': refineryKey,
    },
    body: rawBody,
    signal: AbortSignal.timeout(5000),
  })
}
