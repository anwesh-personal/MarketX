/**
 * POST /api/writer/push-to-mta
 *
 * Pushes Writer Studio output to the org's configured MTA (MailWizz).
 *
 * Architecture:
 *   1. Auth + feature gate (can_write_emails)
 *   2. Load run → execution output from engine_run_logs
 *   3. Load org's MTA config from email_provider_configs (partner_id scoped)
 *   4. Configure adapter with org-specific credentials (ZERO cross-org leakage)
 *   5. Push campaign via adapter.sendBulk()
 *   6. Record dispatch in signal_event for attribution
 *
 * Security:
 *   - Credentials loaded per partner_id — tenant-isolated
 *   - Execution ownership verified (run.triggered_by === userId)
 *   - No hardcoded credentials anywhere
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireFeature } from '@/lib/requireFeature'
import { getEmailProviderAdapter } from '@/services/email/EmailProviderAdapter'
import type { ProviderConfig, BulkSendParams } from '@/services/email/EmailProviderAdapter'

const supabaseService = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PushRequest {
    run_id: string
    /** Optional: override which emails to push (by step index). Defaults to all. */
    email_indices?: number[]
    /** Optional: list of recipient emails. If omitted, campaign is created without subscribers. */
    recipients?: Array<{ email: string; firstName?: string; lastName?: string }>
    /** Optional: override campaign name */
    campaign_name?: string
    /** Optional: schedule for later */
    scheduled_at?: string
}

export async function POST(req: NextRequest) {
    try {
        // ─── 1. Auth + feature gate ─────────────────────────────
        const gate = await requireFeature(req, 'can_write_emails')
        if (gate.denied) return gate.response

        const orgId = gate.orgId
        const userId = gate.userId

        // ─── 2. Parse request ───────────────────────────────────
        const body = await req.json().catch(() => ({})) as PushRequest
        const { run_id, email_indices, recipients, campaign_name, scheduled_at } = body

        if (!run_id) {
            return NextResponse.json({ error: 'run_id is required' }, { status: 400 })
        }

        // ─── 3. Load run + verify ownership ─────────────────────
        const { data: run, error: runErr } = await supabaseService
            .from('runs')
            .select('id, org_id, triggered_by, execution_id, label, settings')
            .eq('id', run_id)
            .single()

        if (runErr || !run) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 })
        }

        if (run.org_id !== orgId) {
            return NextResponse.json({ error: 'Access denied — not your org' }, { status: 403 })
        }

        if (run.triggered_by !== userId && gate.role !== 'superadmin') {
            return NextResponse.json({ error: 'Access denied — not your run' }, { status: 403 })
        }

        if (!run.execution_id) {
            return NextResponse.json({ error: 'Run has no execution result yet' }, { status: 400 })
        }

        // ─── 4. Load execution output ───────────────────────────
        const { data: execution, error: execErr } = await supabaseService
            .from('engine_run_logs')
            .select('output_data, status')
            .eq('id', run.execution_id)
            .single()

        if (execErr || !execution) {
            return NextResponse.json({ error: 'Execution output not found' }, { status: 404 })
        }

        if (execution.status !== 'completed') {
            return NextResponse.json(
                { error: `Execution is not complete (status: ${execution.status})` },
                { status: 400 }
            )
        }

        const emails = parseEmailsFromOutput(execution.output_data)
        if (emails.length === 0) {
            return NextResponse.json({ error: 'No emails found in execution output' }, { status: 400 })
        }

        // Filter to selected indices if specified
        const selectedEmails = email_indices?.length
            ? emails.filter((_, i) => email_indices.includes(i))
            : emails

        if (selectedEmails.length === 0) {
            return NextResponse.json({ error: 'No emails selected for push' }, { status: 400 })
        }

        // ─── 5. Load org's MTA config (tenant-isolated) ─────────
        const { data: mtaConfig, error: mtaErr } = await supabaseService
            .from('email_provider_configs')
            .select('*')
            .eq('partner_id', orgId)
            .eq('is_active', true)
            .in('provider_type', ['mailwizz', 'mailgun', 'ses', 'sendgrid', 'smtp'])
            .order('priority', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (mtaErr) {
            return NextResponse.json(
                { error: 'Failed to load MTA configuration' },
                { status: 500 }
            )
        }

        if (!mtaConfig) {
            return NextResponse.json(
                {
                    error: 'No MTA configured for your organization. Configure one in Settings → Email Provider.',
                    code: 'MTA_NOT_CONFIGURED',
                },
                { status: 503 }
            )
        }

        // ─── 6. Configure adapter with org credentials ──────────
        const adapter = getEmailProviderAdapter(mtaConfig.provider_type)
        if (!adapter) {
            return NextResponse.json(
                { error: `Unsupported provider: ${mtaConfig.provider_type}` },
                { status: 500 }
            )
        }

        const providerConfig: ProviderConfig = {
            apiKey: mtaConfig.api_key ?? undefined,
            apiSecret: mtaConfig.api_secret ?? undefined,
            baseUrl: mtaConfig.api_base_url ?? undefined,
            fromEmail: (mtaConfig.provider_settings as any)?.from_email ?? undefined,
            fromName: (mtaConfig.provider_settings as any)?.from_name ?? undefined,
            webhookSecret: mtaConfig.webhook_secret ?? undefined,
            extra: mtaConfig.provider_settings as Record<string, unknown>,
        }

        adapter.configure(providerConfig)

        // ─── 7. Build campaign name + attribution tags ──────────
        const settings = (run.settings || {}) as Record<string, any>
        const campName = campaign_name
            || `${run.label || 'Writer'} — ${new Date().toLocaleDateString()}`

        const trackingTags = {
            orgId,
            icpId: settings.icp_id ?? undefined,
            offerId: settings.offer_id ?? undefined,
            beliefId: settings.belief_id ?? undefined,
        }

        // ─── 8. Push each email as a campaign ───────────────────
        const results: Array<{ step: number; success: boolean; campaignId?: string; error?: string }> = []

        for (const email of selectedEmails) {
            const params: BulkSendParams = {
                campaignName: `${campName} — Email ${email.step}`,
                subject: email.subject,
                htmlBody: email.body,
                recipients: recipients || [],
                trackingTags,
                scheduledAt: scheduled_at,
            }

            const result = await adapter.sendBulk(params)
            results.push({
                step: email.step,
                success: result.success,
                campaignId: result.campaignId,
                error: result.error,
            })
        }

        const successCount = results.filter(r => r.success).length

        // ─── 9. Log dispatch event ──────────────────────────────
        try {
            await supabaseService
                .from('signal_event')
                .insert(results.filter(r => r.success).map(r => ({
                    partner_id: orgId,
                    event_type: 'send' as const,
                    meta: {
                        source: 'writer_studio',
                        provider: mtaConfig.provider_type,
                        campaign_id: r.campaignId,
                        run_id: run.id,
                        step: r.step,
                    },
                    occurred_at: new Date().toISOString(),
                })))
        } catch (logErr: unknown) {
            const message = logErr instanceof Error ? logErr.message : 'unknown'
            console.warn('[push-to-mta] signal_event log failed:', message)
        }

        // ─── 10. Return result ──────────────────────────────────
        return NextResponse.json({
            success: successCount > 0,
            provider: mtaConfig.provider_type,
            pushed: successCount,
            total: selectedEmails.length,
            results,
            campaign_name: campName,
        })

    } catch (error: any) {
        console.error('[push-to-mta] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

// ─── Email parser (same logic as EmailOutputViewer) ─────────────
interface ParsedEmail {
    step: number
    subject: string
    body: string
}

function parseEmailsFromOutput(outputData: any): ParsedEmail[] {
    if (!outputData) return []

    const data = outputData.finalOutput ?? outputData

    if (Array.isArray(data)) {
        return data.map((e: any, i: number) => ({
            step: e.step ?? e.sequence_number ?? i + 1,
            subject: e.subject ?? e.subject_line ?? '',
            body: e.body ?? e.content ?? e.html ?? e.text ?? '',
        }))
    }

    if (data?.emails && Array.isArray(data.emails)) return parseEmailsFromOutput(data.emails)
    if (data?.sequence && Array.isArray(data.sequence)) return parseEmailsFromOutput(data.sequence)
    if (data?.output) return parseEmailsFromOutput(data.output)

    if (typeof data === 'object') {
        for (const key of Object.keys(data)) {
            const val = data[key]
            if (val?.output && typeof val.output === 'string') {
                try {
                    const parsed = JSON.parse(val.output)
                    const emails = parseEmailsFromOutput(parsed)
                    if (emails.length > 0) return emails
                } catch { /* not JSON */ }
            }
        }
    }

    return []
}
