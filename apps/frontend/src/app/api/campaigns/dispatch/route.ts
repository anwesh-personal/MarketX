/**
 * CAMPAIGN DISPATCH API
 * =====================
 * POST /api/campaigns/dispatch
 *
 * Production-grade endpoint for launching email campaigns.
 * Routes through the SatelliteSendOrchestrator — recipients are
 * distributed across the org's satellite constellation with
 * warmup-aware pacing enforced.
 *
 * Auth: Supabase session (admin/owner role required)
 * Body: { campaignName, subject, htmlBody, textBody?, recipients[], trackingTags?, scheduledAt? }
 *
 * Returns a detailed manifest: which satellite sent what, overflow recipients, etc.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireFeature } from '@/lib/requireFeature'
import { satelliteSendOrchestrator } from '@/services/email/SatelliteSendOrchestrator'

const dispatchSchema = z.object({
  campaignName: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  htmlBody: z.string().min(1),
  textBody: z.string().optional(),
  fromName: z.string().max(100).optional(),
  fromEmail: z.string().email().optional(),
  /** MailWizz list UID — the list must already exist (pushed by Refinery) */
  listUid: z.string().min(1),
  /** Optional MailWizz segment UID to narrow within the list */
  segmentUid: z.string().optional(),
  /** Optional delivery server IDs to pin to specific servers */
  deliveryServerIds: z.array(z.number()).optional(),
  recipients: z.array(z.object({
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    customFields: z.record(z.string()).optional(),
  })).min(1).max(50000),
  trackingTags: z.object({
    orgId: z.string().optional(),
    partnerId: z.string().optional(),
    beliefId: z.string().optional(),
    icpId: z.string().optional(),
    offerId: z.string().optional(),
    briefId: z.string().optional(),
  }).optional(),
  scheduledAt: z.string().datetime().optional(),
})

export async function POST(req: NextRequest) {
  // ── Feature gate + auth ─────────────────────────────────────────────────
  const gate = await requireFeature(req, 'can_write_emails')
  if (gate.denied) return gate.response

  // Only admins/owners can dispatch campaigns (additional role check on top of feature gate)
  const allowed = ['admin', 'owner', 'superadmin']
  if (!allowed.includes(gate.role)) {
    return NextResponse.json({ error: 'Insufficient permissions — admin or owner role required' }, { status: 403 })
  }

  // ── Parse ───────────────────────────────────────────────────────────────
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = dispatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  // ── Dispatch ────────────────────────────────────────────────────────────
  const result = await satelliteSendOrchestrator.dispatch(gate.orgId, {
    ...parsed.data,
    trackingTags: {
      ...parsed.data.trackingTags,
      orgId: gate.orgId,
    },
    meta: {
      listUid: parsed.data.listUid,
      segmentUid: parsed.data.segmentUid,
      deliveryServerIds: parsed.data.deliveryServerIds,
    },
  })

  const status = result.success ? 200 : (result.error?.includes('CIRCUIT') ? 429 : 500)
  return NextResponse.json(result, { status })
}
