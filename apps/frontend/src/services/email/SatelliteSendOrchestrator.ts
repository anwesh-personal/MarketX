/**
 * CAMPAIGN SEND ORCHESTRATOR
 * ==========================
 * Dispatches campaigns through MailWizz.
 *
 * MarketWriter's role:
 *   1. Circuit breaker — block if complaint rate too high
 *   2. Suppression filter — remove bounced/complained/unsub contacts
 *   3. Load MailWizz credentials from email_provider_configs
 *   4. Create campaign in MailWizz via API (list already pushed by Refinery)
 *
 * MailWizz's role:
 *   - Delivery server management (SMTP config, quotas, daily caps)
 *   - Actual SMTP delivery + retries
 *   - Domain/SPF/DKIM verification
 *   - Send pacing and throttling
 *
 * MarketWriter does NOT manage sending_satellites or sending_domains.
 * Those are MailWizz concerns.
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getEmailProviderAdapter } from './EmailProviderAdapter'
import type { BulkSendParams, ProviderConfig } from './EmailProviderAdapter'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrchestratorResult {
  success: boolean
  totalRecipients: number
  suppressedCount: number
  campaignId?: string
  error?: string
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class SatelliteSendOrchestrator {
  private supabase() {
    return createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }

  /**
   * Dispatch a campaign through MailWizz.
   *
   * @param orgId  - The organization/partner ID
   * @param params - Campaign content + recipient list reference
   * @returns Result with campaignId from MailWizz
   */
  async dispatch(orgId: string, params: BulkSendParams): Promise<OrchestratorResult> {
    const db = this.supabase()

    // ── 1. CIRCUIT BREAKER ──────────────────────────────────────────────
    const cb = await this.checkComplaintRate(db, orgId)
    if (cb.tripped) {
      return {
        success: false,
        totalRecipients: params.recipients.length,
        suppressedCount: 0,
        error: `CIRCUIT BREAKER: Complaint rate ${(cb.rate * 100).toFixed(3)}% exceeds threshold ${(cb.threshold * 100).toFixed(3)}% (${cb.complaints}/${cb.sends} in ${cb.lookbackDays}d). Sending paused.`,
      }
    }

    // ── 2. SUPPRESSION FILTER ───────────────────────────────────────────
    const { cleanRecipients, suppressedCount } = await this.filterSuppressed(
      db, orgId, params.recipients,
    )

    if (suppressedCount > 0) {
      console.log(`[Orchestrator] Filtered ${suppressedCount} suppressed for org=${orgId}`)
    }

    if (cleanRecipients.length === 0) {
      return {
        success: false,
        totalRecipients: params.recipients.length,
        suppressedCount,
        error: `All ${params.recipients.length} recipients are suppressed. No emails to send.`,
      }
    }

    // ── 3. LOAD PROVIDER ADAPTER ────────────────────────────────────────
    const { adapter, error: adapterErr } = await this.loadProviderAdapter(db, orgId, 'mailwizz')
    if (!adapter) {
      return {
        success: false,
        totalRecipients: params.recipients.length,
        suppressedCount,
        error: adapterErr || 'Failed to load MailWizz adapter',
      }
    }

    // ── 4. CREATE CAMPAIGN IN MAILWIZZ ──────────────────────────────────
    const result = await adapter.sendBulk({
      ...params,
      recipients: cleanRecipients,
    })

    return {
      success: result.success,
      totalRecipients: params.recipients.length,
      suppressedCount,
      campaignId: result.campaignId,
      error: result.error,
    }
  }

  // ─── Provider Loading ──────────────────────────────────────────────────────

  private async loadProviderAdapter(
    db: any,
    orgId: string,
    providerType: string,
  ) {
    // Try org-level config first, then global
    const { data: cfg }: { data: any } = await db
      .from('email_provider_configs')
      .select('*')
      .or(`partner_id.eq.${orgId},scope.eq.global`)
      .eq('provider_type', providerType)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!cfg) {
      return { adapter: null, error: `No active config for provider '${providerType}'. Configure in Superadmin → Email Providers.` }
    }

    const adapter = getEmailProviderAdapter(providerType)
    if (!adapter) {
      return { adapter: null, error: `Unsupported provider: ${providerType}` }
    }

    adapter.configure({
      apiKey: cfg.api_key,
      apiSecret: cfg.api_secret,
      baseUrl: cfg.api_base_url || cfg.base_url,
      region: cfg.region,
      fromEmail: cfg.from_email || (cfg.provider_settings as Record<string, string>)?.from_email,
      fromName: cfg.from_name || (cfg.provider_settings as Record<string, string>)?.from_name,
      webhookSecret: cfg.webhook_secret,
      extra: { ...cfg, ...(cfg.provider_settings || {}) },
    })

    return { adapter, error: null }
  }

  // ─── Complaint Rate Circuit Breaker ──────────────────────────────────────

  private async checkComplaintRate(
    db: any,
    orgId: string,
  ): Promise<{ tripped: boolean; rate: number; threshold: number; complaints: number; sends: number; lookbackDays: number }> {
    let threshold = 0.001   // 0.1% — ISPs flag at this level
    let lookbackDays = 7
    let minSends = 100

    try {
      const { data: cfgRows } = await db
        .from('config_table')
        .select('key, value')
        .in('key', ['complaint_rate_threshold', 'complaint_rate_lookback_days', 'complaint_rate_min_sends'])

      if (cfgRows) {
        for (const r of cfgRows) {
          const val = typeof r.value === 'object' && r.value !== null && 'value' in r.value
            ? r.value.value : r.value
          if (r.key === 'complaint_rate_threshold') threshold = Number(val) || threshold
          if (r.key === 'complaint_rate_lookback_days') lookbackDays = Number(val) || lookbackDays
          if (r.key === 'complaint_rate_min_sends') minSends = Number(val) || minSends
        }
      }
    } catch {
      // config_table may not exist — use defaults
    }

    const since = new Date()
    since.setDate(since.getDate() - lookbackDays)

    const { count: sendCount } = await db
      .from('signal_event')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', orgId)
      .eq('event_type', 'send')
      .gte('occurred_at', since.toISOString())

    const sends = sendCount ?? 0

    if (sends < minSends) {
      return { tripped: false, rate: 0, threshold, complaints: 0, sends, lookbackDays }
    }

    const { count: complaintCount } = await db
      .from('signal_event')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', orgId)
      .eq('event_type', 'complaint')
      .gte('occurred_at', since.toISOString())

    const complaints = complaintCount ?? 0
    const rate = complaints / sends

    return { tripped: rate >= threshold, rate, threshold, complaints, sends, lookbackDays }
  }

  // ─── Suppression List Filter ────────────────────────────────────────────

  private async filterSuppressed(
    db: any,
    orgId: string,
    recipients: BulkSendParams['recipients'],
  ): Promise<{ cleanRecipients: BulkSendParams['recipients']; suppressedCount: number }> {
    if (recipients.length === 0) {
      return { cleanRecipients: [], suppressedCount: 0 }
    }

    const emails = recipients.map((r) => r.email.toLowerCase())

    // Check partner-level suppression
    const { data: partnerSuppressed } = await db
      .from('partner_contact_suppression')
      .select('email')
      .eq('partner_id', orgId)
      .eq('is_active', true)
      .in('email', emails)

    // Check global suppression
    const { data: globalSuppressed } = await db
      .from('global_contact_suppression')
      .select('email')
      .eq('is_active', true)
      .in('email', emails)

    const suppressedEmails = new Set<string>()
    for (const row of partnerSuppressed || []) {
      if (row.email) suppressedEmails.add(row.email.toLowerCase())
    }
    for (const row of globalSuppressed || []) {
      if (row.email) suppressedEmails.add(row.email.toLowerCase())
    }

    if (suppressedEmails.size === 0) {
      return { cleanRecipients: recipients, suppressedCount: 0 }
    }

    const cleanRecipients = recipients.filter(
      (r) => !suppressedEmails.has(r.email.toLowerCase())
    )

    return {
      cleanRecipients,
      suppressedCount: recipients.length - cleanRecipients.length,
    }
  }
}

export const satelliteSendOrchestrator = new SatelliteSendOrchestrator()
