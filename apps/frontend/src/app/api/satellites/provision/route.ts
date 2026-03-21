import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getConfigValues } from '@/lib/platform-config'
import { requireFeature } from '@/lib/requireFeature'

const provisionSchema = z.object({
  domains: z.array(z.object({
    domain: z.string().min(4),
    tld: z.string().min(2),
    provider: z.enum(['manual', 'mailgun', 'ses', 'mailwizz', 'sendgrid', 'postmark', 'sparkpost', 'smtp', 'custom']).optional().default('manual'),
  })).min(1).max(25),
  mailboxes_per_domain: z.number().int().min(1).max(50).optional(),
  mailbox_prefix: z.string().min(1).max(20).optional().default('sat'),
  daily_send_cap: z.number().int().min(1).max(100000).optional(),
  warmup_target_days: z.number().int().min(1).max(90).optional(),
})

export async function POST(req: NextRequest) {
  const gate = await requireFeature(req, 'can_manage_satellites')
  if (gate.denied) return gate.response

  if (!['owner', 'admin', 'superadmin'].includes(gate.role)) {
    return NextResponse.json({ error: 'Only admin/owner can provision satellites' }, { status: 403 })
  }

  const supabase = createClient()

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const parsed = provisionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const cfg = await getConfigValues(supabase, [
    'send_pacing_global_daily_cap',
    'send_pacing_warmup_default_days',
    'domain_max_satellites_per_domain',
    'domain_max_domains_per_org',
  ])

  const input = {
    ...parsed.data,
    mailboxes_per_domain: parsed.data.mailboxes_per_domain ?? Number(cfg['domain_max_satellites_per_domain']),
    daily_send_cap: parsed.data.daily_send_cap ?? Number(cfg['send_pacing_global_daily_cap']),
    warmup_target_days: parsed.data.warmup_target_days ?? Number(cfg['send_pacing_warmup_default_days']),
  }

  const maxDomainsPerOrg = Number(cfg['domain_max_domains_per_org'])
  const { data: existingDomainCount } = await supabase
    .from('sending_domains')
    .select('id')
    .eq('partner_id', gate.orgId)
  if ((existingDomainCount?.length ?? 0) + input.domains.length > maxDomainsPerOrg) {
    return NextResponse.json({
      error: `Provisioning would exceed the ${maxDomainsPerOrg} domain limit. Current: ${existingDomainCount?.length ?? 0}, Requested: ${input.domains.length}. Adjust via Platform Config.`,
    }, { status: 409 })
  }

  const domainRows = input.domains.map((d) => ({
    partner_id: gate.orgId,
    domain: d.domain.toLowerCase(),
    tld: d.tld.toLowerCase(),
    provider: d.provider,
    verification_status: 'pending' as const,
    warmup_status: 'not_started' as const,
    is_active: true,
  }))

  const { data: insertedDomains, error: domainError } = await supabase
    .from('sending_domains')
    .upsert(domainRows, { onConflict: 'partner_id,domain' })
    .select('id, domain, tld, provider')

  if (domainError || !insertedDomains) {
    return NextResponse.json({ error: `Failed to provision sending domains: ${domainError?.message ?? 'unknown'}` }, { status: 500 })
  }

  const satelliteRows = insertedDomains.flatMap((domain) => {
    const rows = []
    for (let i = 1; i <= input.mailboxes_per_domain; i += 1) {
      const localPart = `${input.mailbox_prefix}${String(i).padStart(2, '0')}`
      rows.push({
        partner_id: gate.orgId,
        domain_id: domain.id,
        mailbox_local_part: localPart,
        mailbox_email: `${localPart}@${domain.domain}`,
        status: 'provisioning' as const,
        reputation_score: 0.5,
        daily_send_cap: input.daily_send_cap,
        current_daily_sent: 0,
        warmup_day: 0,
        warmup_target_days: input.warmup_target_days,
        is_active: true,
      })
    }
    return rows
  })

  const { data: insertedSatellites, error: satError } = await supabase
    .from('sending_satellites')
    .upsert(satelliteRows, { onConflict: 'partner_id,mailbox_email' })
    .select('id, domain_id, mailbox_email, status, daily_send_cap')

  if (satError) {
    return NextResponse.json({ error: `Failed to provision satellites: ${satError.message}` }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    partner_id: gate.orgId,
    domains_provisioned: insertedDomains.length,
    satellites_provisioned: insertedSatellites?.length ?? 0,
    domains: insertedDomains,
  }, { status: 201 })
}
