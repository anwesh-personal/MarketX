import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
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

    const { data: dom, error: domErr } = await supabase
        .from('sending_domains')
        .select('id, partner_id, domain, provider, dns_records, verification_status')
        .eq('id', params.id)
        .eq('partner_id', me.org_id)
        .single()
    if (domErr || !dom) return NextResponse.json({ error: 'Domain not found for this org' }, { status: 404 })

    const verificationResults = await checkDnsRecords(dom.domain, dom.dns_records as any[])
    const allPassed = verificationResults.every(r => r.verified)
    const newStatus = allPassed ? 'verified' : 'failed'

    const { data: updated, error: updateErr } = await supabase
        .from('sending_domains')
        .update({
            verification_status: newStatus,
            dns_records: verificationResults,
            is_active: allPassed,
        })
        .eq('id', dom.id)
        .select()
        .single()

    if (updateErr) return NextResponse.json({ error: `Verification update failed: ${updateErr.message}` }, { status: 500 })

    return NextResponse.json({
        domain: updated,
        verification: {
            status: newStatus,
            records_checked: verificationResults.length,
            records_passed: verificationResults.filter(r => r.verified).length,
            details: verificationResults,
        },
    })
}

async function checkDnsRecords(
    domain: string,
    records: Array<{ type: string; name: string; value: string; purpose: string; verified?: boolean }>
) {
    return records.map(record => {
        if (record.value.startsWith('PENDING_')) {
            return { ...record, verified: false, check_note: 'Awaiting provider-generated value' }
        }
        return {
            ...record,
            verified: false,
            check_note: 'DNS verification requires server-side DNS lookup — hook into provider verification API for production',
        }
    })
}
