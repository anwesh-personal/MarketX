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
import { satelliteSendOrchestrator } from './SatelliteSendOrchestrator'

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
   * Queues mastery agent decisions (contact, timing, angle, pacing) async
   * so the learning loop can track what was decided for each send.
   */
  async send(orgId: string, params: SendEmailParams): Promise<DispatchResult> {
    const { adapter, providerId, error: provErr } = await this.loadAdapter(orgId)
    if (!adapter) return { success: false, error: provErr || 'No active email provider for org' }

    const result = await adapter.sendEmail(params)

    if (result.success) {
      await this.logSignalEvent({
        orgId,
        providerId: providerId!,
        eventType:  'send',
        email:      Array.isArray(params.to) ? params.to[0] : params.to,
        messageId:  result.messageId,
        trackingTags: params.trackingTags,
      })

      this.queuePreSendDecisions(orgId, params, result.messageId)
    }

    return { success: result.success, messageId: result.messageId, provider: providerId, error: result.error }
  }

  /**
   * Send a bulk campaign via the org's satellite constellation.
   * The SatelliteSendOrchestrator distributes recipients across satellites,
   * enforces warmup pacing, and records sends. Direct adapter bypass is used
   * ONLY as a fallback when no satellites are provisioned.
   */
  async sendBulk(orgId: string, params: BulkSendParams): Promise<DispatchResult> {
    // Primary path: satellite-paced dispatch
    const orchResult = await satelliteSendOrchestrator.dispatch(orgId, params)

    if (orchResult.success || orchResult.totalSent > 0) {
      return {
        success: orchResult.success,
        campaignId: orchResult.chunks[0]?.campaignId,
        provider: 'satellite-orchestrated',
        error: orchResult.overflow.length > 0
          ? `${orchResult.totalSent} sent, ${orchResult.overflow.length} recipients exceeded daily capacity`
          : undefined,
      }
    }

    // Fallback: if NO satellites at all, try direct adapter (legacy / no-satellite orgs)
    if (orchResult.error?.includes('No eligible satellites')) {
      const { adapter, providerId, error: provErr } = await this.loadAdapter(orgId)
      if (!adapter) return { success: false, error: provErr || 'No active email provider for org' }

      console.warn(`[EmailDispatchService] Org ${orgId} has no satellites — falling back to direct adapter send (no pacing enforcement)`)
      const result: BulkSendResult = await adapter.sendBulk(params)
      return { success: result.success, campaignId: result.campaignId, provider: providerId, error: result.error }
    }

    return { success: false, error: orchResult.error || 'Dispatch failed' }
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

    // Resolution order:
    // 1) Org-level provider from email_provider_configs (highest priority, active)
    // 2) Global provider from email_provider_configs (highest priority, active)
    // 3) Legacy: engine_instances.email_provider_id (backward compat)
    // No env fallbacks. No hardcoded providers.

    let providerType: string | null = null
    let cfg: Record<string, any> = {}

    // Try org-level config
    const { data: orgConfig } = await db
      .from('email_provider_configs')
      .select('*')
      .eq('partner_id', orgId)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (orgConfig) {
      providerType = orgConfig.provider_type
      cfg = orgConfig
    }

    // Fallback to global config
    if (!providerType) {
      const { data: globalConfig } = await db
        .from('email_provider_configs')
        .select('*')
        .eq('scope', 'global')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (globalConfig) {
        providerType = globalConfig.provider_type
        cfg = globalConfig
      }
    }

    // Legacy fallback: engine_instances.email_provider_id
    if (!providerType) {
      const { data: instance } = await db
        .from('engine_instances')
        .select('email_provider_id, email_provider_config')
        .eq('org_id', orgId)
        .eq('status', 'active')
        .not('email_provider_id', 'is', null)
        .order('deployed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (instance?.email_provider_id) {
        providerType = instance.email_provider_id
        cfg = instance.email_provider_config || {}
      }
    }

    if (!providerType) {
      return {
        adapter: null,
        providerId: null,
        error: 'No active email provider configured. Add one in Superadmin → Email Providers.',
      }
    }

    const adapter = getEmailProviderAdapter(providerType)
    if (!adapter) {
      return { adapter: null, providerId: providerType, error: `Unsupported email provider: ${providerType}` }
    }

    adapter.configure({
      apiKey:        cfg.api_key,
      apiSecret:     cfg.api_secret,
      baseUrl:       cfg.api_base_url || cfg.base_url,
      region:        cfg.region,
      fromEmail:     cfg.from_email || (cfg.provider_settings as Record<string, string>)?.from_email,
      fromName:      cfg.from_name || (cfg.provider_settings as Record<string, string>)?.from_name,
      webhookSecret: cfg.webhook_secret,
      extra:         { ...cfg, ...(cfg.provider_settings || {}) },
    })

    return { adapter, providerId: providerType, error: null }
  }

  /**
   * Queue mastery agent decisions after a send for audit + learning.
   * Non-blocking: fire-and-forget, errors logged but never block send.
   */
  private queuePreSendDecisions(orgId: string, params: SendEmailParams, messageId?: string) {
    try {
      const { Queue } = require('bullmq')
      const connectionOptions = (() => {
        if (process.env.REDIS_URL) {
          const u = new URL(process.env.REDIS_URL)
          return { host: u.hostname, port: parseInt(u.port) || 6379, password: u.password || undefined }
        }
        return { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379') }
      })()

      const queue = new Queue('mastery-agent', { connection: connectionOptions, prefix: 'axiom:' })

      const tags = params.trackingTags || {}
      const email = Array.isArray(params.to) ? params.to[0] : params.to

      queue.add('contact_decision', {
        agentType: 'contact_decision',
        orgId,
        input: { email, beliefId: tags.beliefId, icpId: tags.icpId },
      }, { jobId: `presend-contact-${orgId}-${messageId ?? Date.now()}` }).catch(() => {})

      queue.add('angle_selection', {
        agentType: 'angle_selection',
        orgId,
        input: { beliefId: tags.beliefId, icpId: tags.icpId, offerId: tags.offerId },
      }, { jobId: `presend-angle-${orgId}-${messageId ?? Date.now()}` }).catch(() => {})

      queue.add('send_pacing', {
        agentType: 'send_pacing',
        orgId,
        input: { email },
      }, { jobId: `presend-pacing-${orgId}-${messageId ?? Date.now()}` }).catch(() => {})
    } catch {
      // Redis unavailable — don't block the send
    }
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
