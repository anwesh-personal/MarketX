/**
 * EMAIL DISPATCH SERVICE
 * ======================
 * Central service for sending emails via any configured provider.
 * Loads provider config from DB (email_providers / email_provider_configs tables).
 *
 * Usage:
 *   const svc = new EmailDispatchService()
 *   await svc.send(orgId, { to, subject, htmlBody, trackingTags })
 *
 * The service:
 *   1. Looks up active provider for org from DB
 *   2. Loads credentials
 *   3. Configures the right adapter
 *   4. Sends
 *   5. Logs to signal_event (send event)
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getEmailProviderAdapter, listSupportedProviders } from './EmailProviderAdapter'
import type { SendEmailParams, BulkSendParams, BulkSendResult, SendEmailResult, CampaignStats } from './EmailProviderAdapter'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DispatchResult {
  success: boolean
  messageId?: string
  campaignId?: string
  provider?: string
  error?: string
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class EmailDispatchService {
  private supabase() {
    return createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }

  /**
   * Send a single transactional email via the org's active provider.
   */
  async send(orgId: string, params: SendEmailParams): Promise<DispatchResult> {
    const { adapter, providerId, error: provErr } = await this.loadAdapter(orgId)
    if (!adapter) return { success: false, error: provErr || 'No active email provider for org' }

    const result = await adapter.sendEmail(params)

    // Log send event to signal_event
    if (result.success) {
      await this.logSignalEvent({
        orgId,
        providerId: providerId!,
        eventType:  'send',
        email:      Array.isArray(params.to) ? params.to[0] : params.to,
        messageId:  result.messageId,
        trackingTags: params.trackingTags,
      })
    }

    return { success: result.success, messageId: result.messageId, provider: providerId, error: result.error }
  }

  /**
   * Send a bulk campaign via the org's active provider.
   */
  async sendBulk(orgId: string, params: BulkSendParams): Promise<DispatchResult> {
    const { adapter, providerId, error: provErr } = await this.loadAdapter(orgId)
    if (!adapter) return { success: false, error: provErr || 'No active email provider for org' }

    const result: BulkSendResult = await adapter.sendBulk(params)
    return { success: result.success, campaignId: result.campaignId, provider: providerId, error: result.error }
  }

  /**
   * Fetch campaign stats for any provider.
   */
  async getCampaignStats(orgId: string, campaignId: string): Promise<CampaignStats | null> {
    const { adapter } = await this.loadAdapter(orgId)
    if (!adapter) return null
    try { return await adapter.getCampaignStats(campaignId) } catch { return null }
  }

  /**
   * Test connection to the org's configured provider.
   */
  async testConnection(orgId: string) {
    const { adapter, providerId } = await this.loadAdapter(orgId)
    if (!adapter) return { success: false, error: 'No active provider configured' }
    const result = await adapter.testConnection()
    return { ...result, provider: providerId }
  }

  /**
   * List all supported provider IDs.
   */
  getSupportedProviders() {
    return listSupportedProviders()
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private async loadAdapter(orgId: string) {
    const db = this.supabase()

    // Email provider config lives on engine_instances.email_provider_config (JSONB)
    // for the active engine instance of this org.
    // Schema (033_engine_bundles.sql): email_provider_id TEXT + email_provider_config JSONB
    const { data: instance } = await db
      .from('engine_instances')
      .select('email_provider_id, email_provider_config')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .not('email_provider_id', 'is', null)
      .order('deployed_at', { ascending: false })
      .limit(1)
      .single()

    if (!instance?.email_provider_id) {
      return { adapter: null, providerId: null, error: 'No active email provider configured on engine instance. Set email_provider_id on the deployed engine.' }
    }

    const providerId: string = instance.email_provider_id
    const cfg: Record<string, any> = instance.email_provider_config || {}

    const adapter = getEmailProviderAdapter(providerId)
    if (!adapter) return { adapter: null, providerId, error: `Unknown email provider: ${providerId}` }

    adapter.configure({
      apiKey:        cfg.api_key,
      apiSecret:     cfg.api_secret,
      baseUrl:       cfg.base_url,
      region:        cfg.region,
      fromEmail:     cfg.from_email,
      fromName:      cfg.from_name,
      webhookSecret: cfg.webhook_secret,
      extra:         cfg,
    })

    return { adapter, providerId, error: null }
  }

  private async logSignalEvent(params: {
    orgId: string
    providerId: string
    eventType: string
    email: string
    messageId?: string
    trackingTags?: Record<string, string | undefined>
  }) {
    try {
      await this.supabase().from('signal_event').insert({
        partner_id:  params.orgId,
        event_type:  params.eventType,
        source:      params.providerId,
        belief_id:   params.trackingTags?.beliefId   || null,
        icp_id:      params.trackingTags?.icpId      || null,
        offer_id:    params.trackingTags?.offerId     || null,
        brief_id:    params.trackingTags?.briefId     || null,
        occurred_at: new Date().toISOString(),
        metadata: { email: params.email, message_id: params.messageId },
      })
    } catch (e) {
      console.warn('[EmailDispatchService] Failed to log signal_event:', e)
    }
  }
}

export const emailDispatchService = new EmailDispatchService()
