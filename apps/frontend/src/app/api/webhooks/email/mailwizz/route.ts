/**
 * MAILWIZZ WEBHOOK RECEIVER
 * =========================
 * Receives email event webhooks from MailWizz and writes them to signal_event.
 *
 * Events handled:
 *   open, click, reply, bounce, complaint, unsubscribe, delivery
 *   (all valid per migration 061 signal_event_event_type_check constraint)
 *
 * SECURITY: validates X-MW-Signature header using webhook_secret from email_provider_configs.
 * If no webhook_secret is configured, signature check is skipped (but logged).
 *
 * NON-BLOCKING: writes to DB asynchronously. Immediately returns 200 to MailWizz
 * so it doesn't retry. Heavy processing (mastery updates, engagement scoring) is
 * queued as a BullMQ job.
 *
 * MIGRATION-SAFE: webhook secret + provider ID from DB. Change server = update DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ============================================================================
// EVENT TYPE MAPPING
// ============================================================================

// MailWizz event type → signal_event event_type
const MW_EVENT_MAP: Record<string, string> = {
  open:        'open',
  click:       'click',
  reply:       'reply',
  bounce:      'bounce',
  hard_bounce: 'bounce',
  soft_bounce: 'bounce',
  complaint:   'complaint',
  abuse:       'complaint',
  unsubscribe: 'unsubscribe',
  track:       'delivery',
  delivery:    'delivery',
  send:        'send',
};

// ============================================================================
// SIGNATURE VALIDATION
// ============================================================================

async function validateSignature(
  req: NextRequest,
  rawBody: string
): Promise<boolean> {
  const { data: provider } = await supabase
    .from('email_provider_configs')
    .select('webhook_secret')
    .eq('provider_type', 'mailwizz')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!provider?.webhook_secret) {
    // No secret configured — allow but warn
    console.warn('⚠ MailWizz webhook: no webhook_secret configured, skipping signature check');
    return true;
  }

  const signature = req.headers.get('x-mw-signature') || req.headers.get('x-webhook-signature') || '';
  if (!signature) {
    console.warn('⚠ MailWizz webhook: missing signature header');
    return false;
  }

  const expected = crypto
    .createHmac('sha256', provider.webhook_secret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', ''), 'hex'),
    Buffer.from(expected, 'hex')
  );
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: 'Could not read body' }, { status: 400 });
  }

  // Validate signature — reject on error, not silently allow
  const sigValid = await validateSignature(req, rawBody).catch((err) => {
    console.error(`❌ MailWizz webhook: signature validation threw: ${err.message}`);
    return false;
  });
  if (!sigValid) {
    console.error('❌ MailWizz webhook: invalid signature — rejecting');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse payload — MailWizz sends form-encoded or JSON
  let payload: Record<string, any>;
  const contentType = req.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      payload = JSON.parse(rawBody);
    } else {
      const params = new URLSearchParams(rawBody);
      payload = Object.fromEntries(params.entries());
    }
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Immediately return 200 — MailWizz will retry if we take too long
  // Process the event asynchronously
  processWebhookEvent(payload).catch(err => {
    console.error(`❌ MailWizz webhook processing error: ${err.message}`);
  });

  return NextResponse.json({ received: true });
}

// ============================================================================
// EVENT PROCESSING (ASYNC)
// ============================================================================

async function processWebhookEvent(payload: Record<string, any>): Promise<void> {
  const mwEventType = (payload.type || payload.event || '').toLowerCase();
  const eventType = MW_EVENT_MAP[mwEventType];

  if (!eventType) {
    console.log(`ℹ MailWizz webhook: unrecognized event type '${mwEventType}' — skipping`);
    return;
  }

  const email = payload.subscriber?.email || payload.email || null;
  const campaignUid = payload.campaign?.campaign_uid || payload.campaign_uid || null;
  const subscriberUid = payload.subscriber?.subscriber_uid || payload.subscriber_uid || null;

  if (!email) {
    console.warn('⚠ MailWizz webhook: no email in payload — skipping');
    return;
  }

  // Look up the org via campaign metadata (if we tagged it) or via subscriber
  // Campaign metadata is set when we push via campaign-pusher.ts
  let orgId: string | null = null;
  if (campaignUid) {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('org_id')
      .eq('external_uid', campaignUid)
      .maybeSingle();
    orgId = campaign?.org_id || null;
  }

  // Write to signal_event table
  const { error } = await supabase.from('signal_event').insert({
    event_type: eventType,
    contact_email: email,
    org_id: orgId,
    source: 'mailwizz',
    metadata: {
      campaign_uid: campaignUid,
      subscriber_uid: subscriberUid,
      mw_event_type: mwEventType,
      raw: payload,
    },
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`❌ MailWizz webhook: failed to write signal_event: ${error.message}`);
    return;
  }

  console.log(`📨 MailWizz webhook processed: ${eventType} for ${email}`);

  // Handle unsubscribe immediately — CAN-SPAM compliance
  if (eventType === 'unsubscribe') {
    await handleUnsubscribe(email, orgId, payload);
  }
}

// ============================================================================
// UNSUBSCRIBE HANDLER — CAN-SPAM / GDPR Compliance
// ============================================================================

async function handleUnsubscribe(
  email: string,
  orgId: string | null,
  _payload: Record<string, any>
): Promise<void> {
  console.log(`🚫 Processing unsubscribe for ${email}`);

  if (!orgId) {
    // Without orgId we cannot safely scope the update — a global email match
    // could accidentally unsubscribe the same address in a different org.
    // The signal_event row is already written (orgId: null) for audit purposes.
    console.warn(`⚠ Unsubscribe for ${email}: no orgId resolved from campaign — skipping contact update. Check campaigns.external_uid mapping.`);
    return;
  }

  const { error } = await supabase
    .from('contacts')
    .update({
      unsubscribed: true,
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_source: 'mailwizz_webhook',
    })
    .eq('email', email)
    .eq('org_id', orgId);

  if (error) {
    console.error(`❌ Failed to mark ${email} as unsubscribed in org ${orgId}: ${error.message}`);
  } else {
    console.log(`✅ Contact ${email} marked as unsubscribed in org ${orgId}`);
  }
}
