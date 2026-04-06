/**
 * GET /api/superadmin/mta/overview
 * Superadmin: fetches MailWizz lists + delivery servers for ALL orgs.
 * Shows which org has which MailWizz instance, lists, and server count.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { getEmailProviderAdapter } from '@/services/email/EmailProviderAdapter'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const admin = await getSuperadmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all active MailWizz configs across all orgs
  const { data: configs, error } = await supabase
    .from('email_provider_configs')
    .select('*, partner:partner_id(id, legal_name)')
    .eq('provider_type', 'mailwizz')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // For each config, fetch lists + delivery servers from their MailWizz
  const overview = await Promise.all(
    (configs || []).map(async (cfg: any) => {
      const adapter = getEmailProviderAdapter('mailwizz')
      if (!adapter) return { config: cfg, lists: [], servers: [], error: 'No adapter' }

      adapter.configure({
        apiKey: cfg.api_key,
        apiSecret: cfg.api_secret,
        baseUrl: cfg.api_base_url || cfg.base_url,
      })

      const mw = adapter as any
      let lists: any[] = []
      let servers: any[] = []
      let fetchError: string | null = null

      try {
        if (typeof mw.getLists === 'function') lists = await mw.getLists()
      } catch (e: any) { fetchError = e.message }

      try {
        if (typeof mw.getDeliveryServers === 'function') servers = await mw.getDeliveryServers()
      } catch { /* delivery servers endpoint may not be available */ }

      return {
        orgId: cfg.partner_id,
        orgName: cfg.partner?.legal_name || cfg.partner_id,
        scope: cfg.scope,
        baseUrl: cfg.api_base_url || cfg.base_url,
        lists,
        deliveryServers: servers,
        error: fetchError,
      }
    })
  )

  return NextResponse.json({ overview })
}
