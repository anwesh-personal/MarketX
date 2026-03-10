import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getConfigValues } from '@/lib/platform-config'

const createSchema = z.object({
    domain: z.string().min(3).max(253).regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i),
    provider: z.enum(['mailgun', 'ses', 'mailwizz', 'other']).default('mailgun'),
})

export async function GET(req: NextRequest) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()
    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    const url = new URL(req.url)
    const orgParam = url.searchParams.get('org_id')
    const targetOrg = me.role === 'superadmin' && orgParam ? orgParam : me.org_id

    const { data: domains, error: domErr } = await supabase
        .from('sending_domains')
        .select(`
            id, partner_id, domain, provider, verification_status,
            dns_records, warmup_status, warmup_day, warmup_target_days,
            is_active, created_at,
            sending_satellites(id, mailbox_email, status, daily_send_cap, current_daily_sent, warmup_day, is_active, reputation_score)
        `)
        .eq('partner_id', targetOrg)
        .order('created_at', { ascending: false })

    if (domErr) return NextResponse.json({ error: `Fetch failed: ${domErr.message}` }, { status: 500 })

    return NextResponse.json({ domains: domains ?? [] })
}

export async function POST(req: NextRequest) {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase
        .from('users')
        .select('id, org_id, role')
        .eq('id', user.id)
        .single()
    if (!me?.org_id) return NextResponse.json({ error: 'User org context not found' }, { status: 403 })

    const allowedRoles = ['admin', 'owner', 'superadmin']
    if (!allowedRoles.includes(me.role ?? '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

    const { domain, provider } = parsed.data

    const cfg = await getConfigValues(supabase, [
        'domain_default_warmup_days',
        'domain_max_domains_per_org',
    ])
    const warmupTargetDays = Number(cfg['domain_default_warmup_days'])
    const maxDomainsPerOrg = Number(cfg['domain_max_domains_per_org'])

    const { data: existingDomains } = await supabase
        .from('sending_domains')
        .select('id')
        .eq('partner_id', me.org_id)
    if ((existingDomains?.length ?? 0) >= maxDomainsPerOrg) {
        return NextResponse.json({
            error: `Organization has reached the maximum of ${maxDomainsPerOrg} domains. Adjust via Platform Config if needed.`,
        }, { status: 409 })
    }

    const { data: existing } = await supabase
        .from('sending_domains')
        .select('id')
        .eq('partner_id', me.org_id)
        .eq('domain', domain.toLowerCase())
        .limit(1)
    if (existing && existing.length > 0) {
        return NextResponse.json({ error: 'Domain already registered for this organization' }, { status: 409 })
    }

    const dnsRecords = generateRequiredDnsRecords(domain.toLowerCase(), provider)

    const { data: created, error: createErr } = await supabase
        .from('sending_domains')
        .insert({
            partner_id: me.org_id,
            domain: domain.toLowerCase(),
            provider,
            verification_status: 'pending',
            dns_records: dnsRecords,
            warmup_status: 'not_started',
            warmup_day: 0,
            warmup_target_days: warmupTargetDays,
            is_active: false,
        })
        .select()
        .single()

    if (createErr || !created) {
        return NextResponse.json({ error: `Domain creation failed: ${createErr?.message ?? 'unknown'}` }, { status: 500 })
    }

    return NextResponse.json({ domain: created, dns_records_to_configure: dnsRecords }, { status: 201 })
}

function generateRequiredDnsRecords(domain: string, provider: string) {
    const records: Array<{ type: string; name: string; value: string; priority?: number; purpose: string }> = []

    records.push({
        type: 'TXT',
        name: domain,
        value: `v=spf1 include:${provider === 'ses' ? 'amazonses.com' : provider === 'mailgun' ? 'mailgun.org' : 'spf.' + domain} ~all`,
        purpose: 'SPF - Sender Policy Framework',
    })

    if (provider === 'mailgun') {
        records.push(
            { type: 'TXT', name: `smtp._domainkey.${domain}`, value: 'PENDING_PROVIDER_KEY', purpose: 'DKIM - DomainKeys Identified Mail' },
            { type: 'CNAME', name: `email.${domain}`, value: 'mailgun.org', purpose: 'CNAME tracking' },
        )
    } else if (provider === 'ses') {
        records.push(
            { type: 'CNAME', name: `_amazonses.${domain}`, value: 'PENDING_PROVIDER_VERIFICATION', purpose: 'SES Domain Verification' },
            { type: 'CNAME', name: `selector1._domainkey.${domain}`, value: 'PENDING_DKIM_TOKEN_1', purpose: 'DKIM 1' },
            { type: 'CNAME', name: `selector2._domainkey.${domain}`, value: 'PENDING_DKIM_TOKEN_2', purpose: 'DKIM 2' },
            { type: 'CNAME', name: `selector3._domainkey.${domain}`, value: 'PENDING_DKIM_TOKEN_3', purpose: 'DKIM 3' },
        )
    } else if (provider === 'mailwizz') {
        records.push(
            { type: 'TXT', name: `mw._domainkey.${domain}`, value: 'PENDING_MAILWIZZ_DKIM', purpose: 'DKIM - Mailwizz' },
        )
    }

    records.push({
        type: 'TXT',
        name: `_dmarc.${domain}`,
        value: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${domain}; fo=1`,
        purpose: 'DMARC - Domain-based Message Authentication',
    })

    return records
}
