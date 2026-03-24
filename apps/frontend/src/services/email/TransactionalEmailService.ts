/**
 * TRANSACTIONAL EMAIL SERVICE
 * ===========================
 * Sends system/transactional emails using whatever provider is configured
 * in superadmin. Templates come from the database, not from code.
 *
 * Usage:
 *   const txEmail = new TransactionalEmailService()
 *   await txEmail.send('password_reset', 'user@example.com', {
 *     reset_link: 'https://...',
 *     email: 'user@example.com',
 *   })
 *
 * Zero hardcoded content. Provider, templates, from name/address — all from DB.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getEmailProviderAdapter } from '@/services/email/EmailProviderAdapter'
import type { ProviderConfig, SendEmailResult } from '@/services/email/EmailProviderAdapter'
import { decryptSecret } from '@/lib/secrets'

// ============================================================================
// TYPES
// ============================================================================

export interface SystemEmailConfig {
    providerId: string | null
    providerType: string | null
    fromName: string
    fromAddress: string
    replyTo: string | null
    appName: string
}

export interface EmailTemplate {
    id: string
    slug: string
    name: string
    subject: string
    html_body: string
    text_body: string | null
    variables: Array<{ name: string; required: boolean; description?: string; default?: string }>
    is_active: boolean
}

export interface SendTransactionalResult {
    success: boolean
    messageId?: string
    error?: string
    templateSlug: string
    recipient: string
    logId?: string
}

// ============================================================================
// SERVICE
// ============================================================================

export class TransactionalEmailService {
    private supabase: SupabaseClient

    constructor() {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!url || !key) throw new Error('Supabase credentials not configured')
        this.supabase = createClient(url, key)
    }

    // ── Load system email config from config_table ─────────────────────

    async getSystemEmailConfig(): Promise<SystemEmailConfig> {
        const keys = [
            'system_email_provider_id',
            'system_email_from_name',
            'system_email_from_address',
            'system_email_reply_to',
            'app_name',
        ]

        const { data: rows } = await this.supabase
            .from('config_table')
            .select('key, value')
            .in('key', keys)

        const configMap: Record<string, any> = {}
        for (const row of rows || []) {
            configMap[row.key] = row.value?.value ?? null
        }

        return {
            providerId: configMap['system_email_provider_id'] || null,
            providerType: null, // resolved below if providerId set
            fromName: configMap['system_email_from_name'] || 'Market Writer',
            fromAddress: configMap['system_email_from_address'] || 'noreply@marketwriter.io',
            replyTo: configMap['system_email_reply_to'] || null,
            appName: configMap['app_name'] || 'Market Writer',
        }
    }

    // ── Load a template by slug ─────────────────────────────────────────

    async getTemplate(slug: string): Promise<EmailTemplate | null> {
        const { data, error } = await this.supabase
            .from('system_email_templates')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .single()

        if (error || !data) return null
        return data as EmailTemplate
    }

    // ── List all templates ──────────────────────────────────────────────

    async listTemplates(): Promise<EmailTemplate[]> {
        const { data } = await this.supabase
            .from('system_email_templates')
            .select('*')
            .order('category')
            .order('name')

        return (data || []) as EmailTemplate[]
    }

    // ── Resolve variables in a string ───────────────────────────────────

    private resolveVariables(template: string, variables: Record<string, string>): string {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return variables[key] !== undefined ? variables[key] : match
        })
    }

    // ── Build and configure the provider adapter ───────────────────────

    private async buildAdapter(config: SystemEmailConfig) {
        if (!config.providerId) {
            return null
        }

        // Load provider config from DB
        const { data: provider } = await this.supabase
            .from('email_provider_configs')
            .select('*')
            .eq('id', config.providerId)
            .eq('is_active', true)
            .single()

        if (!provider) {
            console.error(`[TransactionalEmail] Provider ${config.providerId} not found or inactive`)
            return null
        }

        const adapter = getEmailProviderAdapter(provider.provider_type)
        if (!adapter) {
            console.error(`[TransactionalEmail] No adapter for provider type: ${provider.provider_type}`)
            return null
        }

        // Build provider config — decrypt secrets
        const adapterConfig: ProviderConfig = {
            apiKey: decryptSecret(provider.api_key) || undefined,
            apiSecret: decryptSecret(provider.api_secret) || undefined,
            baseUrl: provider.api_base_url || undefined,
            fromEmail: config.fromAddress,
            fromName: config.fromName,
            webhookSecret: provider.webhook_secret || undefined,
            extra: {
                smtp_host: provider.smtp_host,
                smtp_port: provider.smtp_port,
                smtp_username: decryptSecret(provider.smtp_username),
                smtp_password: decryptSecret(provider.smtp_password),
                smtp_encryption: provider.smtp_encryption,
            },
        }

        adapter.configure(adapterConfig)
        config.providerType = provider.provider_type

        return { adapter, providerType: provider.provider_type }
    }

    // ── SEND ────────────────────────────────────────────────────────────

    async send(
        templateSlug: string,
        recipient: string,
        variables: Record<string, string>,
        options?: {
            /** Override from name for this send */
            fromName?: string
            /** Override from address for this send */
            fromAddress?: string
            /** Admin ID if triggered by superadmin */
            sentBy?: string
        }
    ): Promise<SendTransactionalResult> {
        try {
            // 1. Load config
            const config = await this.getSystemEmailConfig()

            // 2. Load template
            const template = await this.getTemplate(templateSlug)
            if (!template) {
                return {
                    success: false,
                    error: `Template "${templateSlug}" not found or inactive`,
                    templateSlug,
                    recipient,
                }
            }

            // 3. Inject system variables (always available)
            const allVariables: Record<string, string> = {
                app_name: config.appName,
                year: new Date().getFullYear().toString(),
                ...variables,
            }

            // Apply defaults from template variable definitions
            for (const varDef of template.variables || []) {
                if (allVariables[varDef.name] === undefined && varDef.default) {
                    allVariables[varDef.name] = varDef.default
                }
            }

            // 4. Resolve template
            const resolvedSubject = this.resolveVariables(template.subject, allVariables)
            const resolvedHtml = this.resolveVariables(template.html_body, allVariables)
            const resolvedText = template.text_body
                ? this.resolveVariables(template.text_body, allVariables)
                : undefined

            // 5. Build provider
            const adapterResult = await this.buildAdapter(config)
            if (!adapterResult) {
                // Log the failure
                await this.logSend({
                    template_id: template.id,
                    template_slug: templateSlug,
                    recipient,
                    subject: resolvedSubject,
                    provider_id: null,
                    provider_type: null,
                    status: 'failed',
                    error: 'No email provider configured or provider inactive. Configure one in Superadmin → Email Providers, then set it in System Email settings.',
                    variables: allVariables,
                    sent_by: options?.sentBy || null,
                })

                return {
                    success: false,
                    error: 'No system email provider configured. Set one in Superadmin → Settings → System Email.',
                    templateSlug,
                    recipient,
                }
            }

            // 6. Send
            const result: SendEmailResult = await adapterResult.adapter.sendEmail({
                to: recipient,
                subject: resolvedSubject,
                htmlBody: resolvedHtml,
                textBody: resolvedText,
                fromName: options?.fromName || config.fromName,
                fromEmail: options?.fromAddress || config.fromAddress,
                replyTo: config.replyTo || undefined,
            })

            // 7. Log
            const logId = await this.logSend({
                template_id: template.id,
                template_slug: templateSlug,
                recipient,
                subject: resolvedSubject,
                provider_id: config.providerId,
                provider_type: adapterResult.providerType,
                status: result.success ? 'sent' : 'failed',
                message_id: result.messageId || null,
                error: result.error || null,
                variables: allVariables,
                sent_by: options?.sentBy || null,
            })

            if (!result.success) {
                console.error(`[TransactionalEmail] Send failed: ${result.error}`)
            } else {
                console.log(`✅ [TransactionalEmail] Sent "${templateSlug}" to ${recipient} (${result.messageId})`)
            }

            return {
                success: result.success,
                messageId: result.messageId,
                error: result.error,
                templateSlug,
                recipient,
                logId,
            }

        } catch (error: any) {
            console.error(`[TransactionalEmail] Error sending "${templateSlug}":`, error.message)
            return {
                success: false,
                error: error.message,
                templateSlug,
                recipient,
            }
        }
    }

    // ── Send to multiple recipients ─────────────────────────────────────

    async sendBatch(
        templateSlug: string,
        recipients: Array<{ email: string; variables: Record<string, string> }>,
        options?: { sentBy?: string }
    ): Promise<SendTransactionalResult[]> {
        const results: SendTransactionalResult[] = []
        for (const r of recipients) {
            const result = await this.send(templateSlug, r.email, r.variables, {
                sentBy: options?.sentBy,
            })
            results.push(result)
        }
        return results
    }

    // ── Log ─────────────────────────────────────────────────────────────

    private async logSend(data: {
        template_id: string | null
        template_slug: string
        recipient: string
        subject: string
        provider_id: string | null
        provider_type: string | null
        status: string
        message_id?: string | null
        error?: string | null
        variables?: Record<string, string> | null
        sent_by?: string | null
    }): Promise<string | undefined> {
        try {
            const { data: row } = await this.supabase
                .from('system_email_logs')
                .insert({
                    template_id: data.template_id,
                    template_slug: data.template_slug,
                    recipient: data.recipient,
                    subject: data.subject,
                    provider_id: data.provider_id,
                    provider_type: data.provider_type,
                    status: data.status,
                    message_id: data.message_id || null,
                    error: data.error || null,
                    variables: data.variables || null,
                    sent_by: data.sent_by || null,
                })
                .select('id')
                .single()

            return row?.id
        } catch (e) {
            console.error('[TransactionalEmail] Failed to log send:', e)
            return undefined
        }
    }
}

// Singleton for reuse across API routes
let _instance: TransactionalEmailService | null = null

export function getTransactionalEmailService(): TransactionalEmailService {
    if (!_instance) {
        _instance = new TransactionalEmailService()
    }
    return _instance
}
