/**
 * Shared helper for /api/mta/* routes.
 * Resolves the org's active MailWizz config and returns a configured adapter.
 * Eliminates the copy-pasted config-load + adapter-configure block from every route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireFeature, type GateResult } from '@/lib/requireFeature'
import { getEmailProviderAdapter } from '@/services/email/EmailProviderAdapter'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface MtaContext {
  gate: Extract<GateResult, { denied: false }>
  adapter: NonNullable<ReturnType<typeof getEmailProviderAdapter>> & Record<string, any>
}

type MtaResult =
  | { ok: true; ctx: MtaContext }
  | { ok: false; response: NextResponse }

/**
 * Authenticates the request, loads the org's MailWizz config, and returns
 * a configured adapter ready to call MailWizz APIs.
 *
 * Usage:
 *   const result = await getMailWizzContext(req)
 *   if (!result.ok) return result.response
 *   const { adapter } = result.ctx
 */
export async function getMailWizzContext(req: NextRequest): Promise<MtaResult> {
  const gate = await requireFeature(req, 'can_view_metrics')
  if (gate.denied) return { ok: false, response: gate.response }

  const { data: cfg } = await supabase
    .from('email_provider_configs')
    .select('*')
    .or(`partner_id.eq.${gate.orgId},scope.eq.global`)
    .eq('provider_type', 'mailwizz')
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!cfg) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No MailWizz provider configured' }, { status: 404 }),
    }
  }

  const adapter = getEmailProviderAdapter('mailwizz')
  if (!adapter) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'MailWizz adapter unavailable' }, { status: 500 }),
    }
  }

  adapter.configure({
    apiKey: cfg.api_key,
    apiSecret: cfg.api_secret,
    baseUrl: cfg.api_base_url || cfg.base_url,
    webhookSecret: cfg.webhook_secret,
  })

  return { ok: true, ctx: { gate, adapter: adapter as any } }
}
