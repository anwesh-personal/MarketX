import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/requireFeature'

const patchSchema = z.object({
  satellite_id: z.string().uuid(),
  status: z.enum(['provisioning', 'warming', 'active', 'paused', 'disabled']).optional(),
  daily_send_cap: z.number().int().min(100).max(10000).optional(),
  is_active: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const gate = await requireFeature(req, 'can_manage_satellites')
  if (gate.denied) return gate.response

  const supabase = createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me, error: meError } = await supabase
    .from('users')
    .select('id, org_id')
    .eq('id', user.id)
    .single()
  if (meError || !me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

  const domainStatus = req.nextUrl.searchParams.get('domain_status')
  const satelliteStatus = req.nextUrl.searchParams.get('satellite_status')

  let domainQuery = supabase
    .from('sending_domains')
    .select('id, domain, tld, provider, verification_status, warmup_status, is_active, created_at')
    .eq('partner_id', me.org_id)
    .order('created_at', { ascending: false })

  if (domainStatus) domainQuery = domainQuery.eq('verification_status', domainStatus)
  const { data: domains, error: domainError } = await domainQuery
  if (domainError) return NextResponse.json({ error: domainError.message }, { status: 500 })

  const domainIds = (domains ?? []).map((d) => d.id)
  if (!domainIds.length) return NextResponse.json({ domains: [], satellites: [], stats: { domains: 0, satellites: 0 } })

  let satQuery = supabase
    .from('sending_satellites')
    .select('id, domain_id, mailbox_email, status, reputation_score, daily_send_cap, current_daily_sent, warmup_day, warmup_target_days, is_active, created_at')
    .eq('partner_id', me.org_id)
    .in('domain_id', domainIds)
    .order('created_at', { ascending: false })

  if (satelliteStatus) satQuery = satQuery.eq('status', satelliteStatus)
  const { data: satellites, error: satError } = await satQuery
  if (satError) return NextResponse.json({ error: satError.message }, { status: 500 })

  const byDomain = new Map<string, any[]>()
  for (const sat of satellites ?? []) {
    const arr = byDomain.get(sat.domain_id) ?? []
    arr.push(sat)
    byDomain.set(sat.domain_id, arr)
  }

  const domainsWithSatellites = (domains ?? []).map((d) => ({
    ...d,
    satellites: byDomain.get(d.id) ?? [],
  }))

  return NextResponse.json({
    domains: domainsWithSatellites,
    satellites: satellites ?? [],
    stats: {
      domains: domains?.length ?? 0,
      satellites: satellites?.length ?? 0,
      active_satellites: (satellites ?? []).filter((s) => s.status === 'active' && s.is_active).length,
      warming_satellites: (satellites ?? []).filter((s) => s.status === 'warming').length,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const gate = await requireFeature(req, 'can_manage_satellites')
  if (gate.denied) return gate.response

  const supabase = createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me, error: meError } = await supabase
    .from('users')
    .select('id, org_id, role')
    .eq('id', user.id)
    .single()
  if (meError || !me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })
  if (!['owner', 'admin', 'superadmin'].includes(me.role ?? '')) {
    return NextResponse.json({ error: 'Only admin/owner can update satellites' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

  const { satellite_id, ...updates } = parsed.data
  const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => typeof v !== 'undefined'))
  if (!Object.keys(cleanUpdates).length) {
    return NextResponse.json({ error: 'No update fields provided' }, { status: 400 })
  }

  const { data: current, error: currentError } = await supabase
    .from('sending_satellites')
    .select('id, partner_id')
    .eq('id', satellite_id)
    .single()
  if (currentError || !current) return NextResponse.json({ error: 'Satellite not found' }, { status: 404 })
  if (current.partner_id !== me.org_id && me.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden for this partner scope' }, { status: 403 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('sending_satellites')
    .update(cleanUpdates)
    .eq('id', satellite_id)
    .select('id, mailbox_email, status, daily_send_cap, is_active, updated_at')
    .single()

  if (updateError || !updated) return NextResponse.json({ error: `Failed to update satellite: ${updateError?.message ?? 'unknown'}` }, { status: 500 })
  return NextResponse.json({ success: true, satellite: updated })
}
