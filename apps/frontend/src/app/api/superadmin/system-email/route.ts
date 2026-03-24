/**
 * /api/superadmin/system-email
 *
 * GET    → system email config + all templates + recent send logs
 * PUT    → update system email config (provider, from name/address, reply-to)
 * POST   → send a test email or trigger a template send
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'
import { getTransactionalEmailService } from '@/services/email/TransactionalEmailService'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── GET — load config + templates + logs ──────────────────────────

export async function GET(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const txService = getTransactionalEmailService()

        // Load system email config
        const config = await txService.getSystemEmailConfig()

        // If provider configured, get its details
        let providerDetails = null
        if (config.providerId) {
            const { data: provider } = await supabase
                .from('email_provider_configs')
                .select('id, display_name, provider_type, is_active, health_status')
                .eq('id', config.providerId)
                .single()
            providerDetails = provider || null
        }

        // Load all templates
        const templates = await txService.listTemplates()

        // Load available providers (for dropdown)
        const { data: availableProviders } = await supabase
            .from('email_provider_configs')
            .select('id, display_name, provider_type, is_active, health_status, scope')
            .order('priority', { ascending: false })

        // Load recent send logs
        const { data: recentLogs } = await supabase
            .from('system_email_logs')
            .select('*')
            .order('sent_at', { ascending: false })
            .limit(50)

        // Stats
        const { data: statsData } = await supabase
            .from('system_email_logs')
            .select('status')

        const stats = {
            total: (statsData || []).length,
            sent: (statsData || []).filter((l: any) => l.status === 'sent').length,
            failed: (statsData || []).filter((l: any) => l.status === 'failed').length,
        }

        return NextResponse.json({
            config: {
                ...config,
                provider: providerDetails,
            },
            templates,
            available_providers: availableProviders || [],
            recent_logs: recentLogs || [],
            stats,
        })
    } catch (error: any) {
        console.error('System email GET error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ── PUT — update system email config ──────────────────────────────

export async function PUT(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const {
            provider_id,
            from_name,
            from_address,
            reply_to,
            app_name,
        } = body

        const updates: { key: string; value: any; description: string }[] = []

        if (provider_id !== undefined) {
            updates.push({
                key: 'system_email_provider_id',
                value: { value: provider_id },
                description: 'UUID of the email provider for system emails',
            })
        }
        if (from_name !== undefined) {
            updates.push({
                key: 'system_email_from_name',
                value: { value: from_name },
                description: 'From name for system emails',
            })
        }
        if (from_address !== undefined) {
            updates.push({
                key: 'system_email_from_address',
                value: { value: from_address },
                description: 'From email address for system emails',
            })
        }
        if (reply_to !== undefined) {
            updates.push({
                key: 'system_email_reply_to',
                value: { value: reply_to },
                description: 'Reply-to address for system emails',
            })
        }
        if (app_name !== undefined) {
            updates.push({
                key: 'app_name',
                value: { value: app_name },
                description: 'Application name used in templates',
            })
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
        }

        const { error } = await supabase
            .from('config_table')
            .upsert(updates, { onConflict: 'key' })

        if (error) throw error

        return NextResponse.json({ success: true, updated: updates.length })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// ── POST — send test email or trigger template ────────────────────

export async function POST(req: NextRequest) {
    const admin = await getSuperadmin(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { action, template_slug, recipient, variables = {} } = body

        if (!recipient) {
            return NextResponse.json({ error: 'recipient is required' }, { status: 400 })
        }

        const txService = getTransactionalEmailService()

        if (action === 'test') {
            // Send test email
            const config = await txService.getSystemEmailConfig()
            const result = await txService.send('test_email', recipient, {
                provider_name: config.providerType || 'configured provider',
                from_address: config.fromAddress,
                sent_at: new Date().toISOString(),
                ...variables,
            }, { sentBy: admin.id })

            return NextResponse.json(result, { status: result.success ? 200 : 500 })
        }

        if (action === 'send' && template_slug) {
            // Send arbitrary template
            const result = await txService.send(template_slug, recipient, variables, {
                sentBy: admin.id,
            })
            return NextResponse.json(result, { status: result.success ? 200 : 500 })
        }

        return NextResponse.json({ error: 'Invalid action. Use "test" or "send".' }, { status: 400 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
