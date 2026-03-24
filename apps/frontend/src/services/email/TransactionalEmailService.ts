/**
 * TRANSACTIONAL EMAIL SERVICE
 * ===========================
 * Sends INTERNAL system/transactional emails (password resets, welcome,
 * invites, notifications). Completely independent of the Email Providers
 * system (which is for customer campaign sending via MailWizz/SES/etc).
 *
 * SMTP config uses the EXISTING keys in config_table that are already
 * managed from Superadmin → Settings → Email tab:
 *   smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email
 *
 * Templates come from system_email_templates table — fully editable
 * from the Settings → System Email tab.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { decryptSecret } from '@/lib/secrets'

// ── Types ─────────────────────────────────────────

export interface SystemSmtpConfig {
    host: string
    port: number
    username: string
    password: string
    fromEmail: string
    fromName: string
    replyTo: string | null
    appName: string
    isConfigured: boolean
}

export interface EmailTemplate {
    id: string
    slug: string
    name: string
    subject: string
    html_body: string
    text_body: string | null
    variables: Array<{
        name: string
        required: boolean
        description?: string
        default?: string
    }>
    is_active: boolean
    category: string
}

export interface SendResult {
    success: boolean
    messageId?: string
    error?: string
    templateSlug: string
    recipient: string
    logId?: string
}

// ── Service ───────────────────────────────────────

export class TransactionalEmailService {
    private supabase: SupabaseClient

    constructor() {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!url || !key) throw new Error('Missing Supabase credentials')
        this.supabase = createClient(url, key)
    }

    /** Load SMTP config from existing config_table keys */
    async getSmtpConfig(): Promise<SystemSmtpConfig> {
        const keys = [
            'smtp_host', 'smtp_port', 'smtp_username',
            'smtp_password', 'smtp_from_email',
            'system_email_from_name', 'system_email_reply_to',
            'app_name',
        ]
        const { data: rows } = await this.supabase
            .from('config_table')
            .select('key, value')
            .in('key', keys)

        const c: Record<string, any> = {}
        for (const row of rows || []) {
            c[row.key] = row.value?.value ?? null
        }

        const host = c['smtp_host'] || ''
        const pw = c['smtp_password'] || ''

        return {
            host,
            port: parseInt(c['smtp_port']) || 587,
            username: c['smtp_username'] || '',
            password: decryptSecret(pw),
            fromEmail: c['smtp_from_email'] || '',
            fromName: c['system_email_from_name'] || c['app_name'] || 'Market Writer',
            replyTo: c['system_email_reply_to'] || null,
            appName: c['app_name'] || 'Market Writer',
            isConfigured: Boolean(host && c['smtp_from_email']),
        }
    }

    /** Create nodemailer transport */
    private createTransport(cfg: SystemSmtpConfig) {
        const secure = cfg.port === 465
        return nodemailer.createTransport({
            host: cfg.host,
            port: cfg.port,
            secure,
            auth: cfg.username
                ? { user: cfg.username, pass: cfg.password }
                : undefined,
            tls: { rejectUnauthorized: true },
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 30_000,
        })
    }

    /** Test SMTP connection */
    async testConnection(): Promise<{
        success: boolean
        error?: string
        latencyMs?: number
    }> {
        const cfg = await this.getSmtpConfig()
        if (!cfg.isConfigured) {
            return { success: false, error: 'SMTP not configured in Settings → Email' }
        }
        const t0 = Date.now()
        try {
            const t = this.createTransport(cfg)
            await t.verify()
            t.close()
            return { success: true, latencyMs: Date.now() - t0 }
        } catch (e: any) {
            return { success: false, error: e.message, latencyMs: Date.now() - t0 }
        }
    }

    /** Get template by slug */
    async getTemplate(slug: string): Promise<EmailTemplate | null> {
        const { data } = await this.supabase
            .from('system_email_templates')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .single()
        return data as EmailTemplate | null
    }

    /** List all templates */
    async listTemplates(): Promise<EmailTemplate[]> {
        const { data } = await this.supabase
            .from('system_email_templates')
            .select('*')
            .order('category')
            .order('name')
        return (data || []) as EmailTemplate[]
    }

    /** Resolve {{variables}} */
    private resolve(tpl: string, vars: Record<string, string>): string {
        return tpl.replace(/\{\{(\w+)\}\}/g, (m, k) =>
            vars[k] !== undefined ? vars[k] : m
        )
    }

    /** Send a transactional email */
    async send(
        slug: string,
        recipient: string,
        variables: Record<string, string>,
        opts?: { fromName?: string; fromAddress?: string; sentBy?: string }
    ): Promise<SendResult> {
        try {
            const cfg = await this.getSmtpConfig()
            const tpl = await this.getTemplate(slug)

            if (!tpl) {
                return { success: false, error: `Template "${slug}" not found or inactive`, templateSlug: slug, recipient }
            }

            // Merge system + caller + default vars
            const vars: Record<string, string> = {
                app_name: cfg.appName,
                year: new Date().getFullYear().toString(),
                ...variables,
            }
            for (const v of tpl.variables || []) {
                if (vars[v.name] === undefined && v.default) vars[v.name] = v.default
            }

            const subject = this.resolve(tpl.subject, vars)
            const html = this.resolve(tpl.html_body, vars)
            const text = tpl.text_body ? this.resolve(tpl.text_body, vars) : undefined

            if (!cfg.isConfigured) {
                await this.log({ template_id: tpl.id, template_slug: slug, recipient, subject, status: 'failed', error: 'SMTP not configured. Go to Settings → Email.', variables: vars, sent_by: opts?.sentBy || null })
                return { success: false, error: 'SMTP not configured. Set it up in Settings → Email.', templateSlug: slug, recipient }
            }

            const transport = this.createTransport(cfg)
            const fromName = opts?.fromName || cfg.fromName
            const fromAddr = opts?.fromAddress || cfg.fromEmail

            try {
                const info = await transport.sendMail({
                    from: `"${fromName}" <${fromAddr}>`,
                    to: recipient,
                    replyTo: cfg.replyTo || undefined,
                    subject, html, text,
                })
                const logId = await this.log({ template_id: tpl.id, template_slug: slug, recipient, subject, status: 'sent', message_id: info.messageId, variables: vars, sent_by: opts?.sentBy || null })
                console.log(`✅ [SystemEmail] "${slug}" → ${recipient} (${info.messageId})`)
                return { success: true, messageId: info.messageId, templateSlug: slug, recipient, logId }
            } catch (err: any) {
                await this.log({ template_id: tpl.id, template_slug: slug, recipient, subject, status: 'failed', error: err.message, variables: vars, sent_by: opts?.sentBy || null })
                return { success: false, error: err.message, templateSlug: slug, recipient }
            } finally {
                transport.close()
            }
        } catch (e: any) {
            return { success: false, error: e.message, templateSlug: slug, recipient }
        }
    }

    /** Batch send */
    async sendBatch(slug: string, recipients: Array<{ email: string; variables: Record<string, string> }>, opts?: { sentBy?: string }): Promise<SendResult[]> {
        const results: SendResult[] = []
        for (const r of recipients) {
            results.push(await this.send(slug, r.email, r.variables, { sentBy: opts?.sentBy }))
        }
        return results
    }

    private async log(d: { template_id: string | null; template_slug: string; recipient: string; subject: string; status: string; message_id?: string | null; error?: string | null; variables?: Record<string, string> | null; sent_by?: string | null }): Promise<string | undefined> {
        try {
            const { data: row } = await this.supabase.from('system_email_logs').insert({ template_id: d.template_id, template_slug: d.template_slug, recipient: d.recipient, subject: d.subject, provider_id: null, provider_type: 'smtp', status: d.status, message_id: d.message_id || null, error: d.error || null, variables: d.variables || null, sent_by: d.sent_by || null }).select('id').single()
            return row?.id
        } catch { return undefined }
    }
}

let _inst: TransactionalEmailService | null = null
export function getTransactionalEmailService(): TransactionalEmailService {
    if (!_inst) _inst = new TransactionalEmailService()
    return _inst
}
