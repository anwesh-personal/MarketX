/**
 * /api/superadmin/system-email
 *
 * System/transactional email management.
 * COMPLETELY ISOLATED from Email Providers (which are for customer campaigns).
 * Uses the existing SMTP config from Settings → Email tab.
 *
 * GET  → templates + recent send logs + smtp status
 * POST → send test email or trigger a template send
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { getTransactionalEmailService } from '@/services/email/TransactionalEmailService'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const svc = getTransactionalEmailService()
        const smtpConfig = await svc.getSmtpConfig()
        const templates = await svc.listTemplates()

        const { data: logs } = await supabase
            .from('system_email_logs')
            .select('*')
            .order('sent_at', { ascending: false })
            .limit(50)

        const { data: allLogs } = await supabase
            .from('system_email_logs')
            .select('status')

        const stats = {
            total: (allLogs || []).length,
            sent: (allLogs || []).filter((l: any) => l.status === 'sent').length,
            failed: (allLogs || []).filter((l: any) => l.status === 'failed').length,
        }

        return NextResponse.json({
            smtp: {
                isConfigured: smtpConfig.isConfigured,
                host: smtpConfig.host || null,
                fromEmail: smtpConfig.fromEmail || null,
                fromName: smtpConfig.fromName,
                appName: smtpConfig.appName,
            },
            templates,
            recent_logs: logs || [],
            stats,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { action, template_slug, recipient, variables = {} } = body
        const svc = getTransactionalEmailService()

        if (action === 'test_connection') {
            return NextResponse.json(await svc.testConnection())
        }

        if (!recipient) {
            return NextResponse.json({ error: 'recipient required' }, { status: 400 })
        }

        if (action === 'test') {
            const cfg = await svc.getSmtpConfig()
            const result = await svc.send('test_email', recipient, {
                provider_name: `SMTP (${cfg.host})`,
                from_address: cfg.fromEmail,
                sent_at: new Date().toISOString(),
                ...variables,
            }, { sentBy: admin.id })
            return NextResponse.json(result)
        }

        if (action === 'send' && template_slug) {
            const result = await svc.send(template_slug, recipient, variables, { sentBy: admin.id })
            return NextResponse.json(result)
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
