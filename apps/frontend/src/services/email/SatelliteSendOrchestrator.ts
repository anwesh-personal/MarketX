/**
 * SATELLITE SEND ORCHESTRATOR
 * ===========================
 * Production-grade email dispatch that respects satellite pacing.
 *
 * Instead of blasting all recipients through a single adapter call,
 * this orchestrator:
 *
 *   1. Fetches all ACTIVE satellites for the org
 *   2. Computes per-satellite available capacity (warmup-aware)
 *   3. Distributes recipients across satellites (round-robin weighted by capacity)
 *   4. Sends each chunk through the adapter using the satellite's from address
 *   5. Records sends per satellite (updates current_daily_sent, warmup_day, status)
 *   6. Returns a detailed manifest of what went where
 *
 * This is the ONLY path through which bulk email should be sent.
 * Never call adapter.sendBulk() directly — always go through here.
 *
 * Architecture:
 *   Campaign Dispatch API → SatelliteSendOrchestrator → MailWizzAdapter.sendBulk()
 *                                                      → pacing/record
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getEmailProviderAdapter } from './EmailProviderAdapter'
import type { BulkSendParams, BulkSendResult, ProviderConfig } from './EmailProviderAdapter'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Satellite {
  id: string
  partner_id: string
  domain_id: string
  mailbox_email: string
  mailbox_local_part: string
  status: string
  daily_send_cap: number
  current_daily_sent: number
  warmup_day: number
  warmup_target_days: number
  is_active: boolean
  reputation_score: number
  domain?: {
    domain: string
    provider: string
    warmup_status: string
    verification_status: string
  }
}

interface SatelliteAllocation {
  satellite: Satellite
  availableCapacity: number
  allocatedRecipients: BulkSendParams['recipients']
}

interface SendChunkResult {
  satelliteId: string
  satelliteEmail: string
  recipientCount: number
  success: boolean
  campaignId?: string
  error?: string
}

export interface OrchestratorResult {
  success: boolean
  totalRecipients: number
  totalSent: number
  totalFailed: number
  chunks: SendChunkResult[]
  /** Recipients that couldn't be allocated to any satellite (capacity exhausted) */
  overflow: BulkSendParams['recipients']
  error?: string
}

interface OrchestratorConfig {
  /** Global daily cap per satellite from config_table (overrides DB per-satellite cap) */
  globalDailyCap: number
  /** Minimum volume during warmup (prevents 0-send days) */
  warmupMinVolume: number
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
   * Dispatch a bulk campaign across the org's satellite constellation.
   *
   * @param orgId - The organization ID
   * @param params - Standard BulkSendParams (recipients, subject, htmlBody, etc.)
   * @returns Detailed manifest with per-satellite results
   */
  async dispatch(orgId: string, params: BulkSendParams): Promise<OrchestratorResult> {
    const db = this.supabase()

    // ── 1. Load platform pacing config ──────────────────────────────────────
    const config = await this.loadPacingConfig(db)

    // ── 2. Fetch active satellites with their domain info ───────────────────
    const { data: satellites, error: satErr } = await db
      .from('sending_satellites')
      .select(`
        id, partner_id, domain_id, mailbox_email, mailbox_local_part,
        status, daily_send_cap, current_daily_sent,
        warmup_day, warmup_target_days, is_active, reputation_score,
        sending_domains!inner(domain, provider, warmup_status, verification_status)
      `)
      .eq('partner_id', orgId)
      .eq('is_active', true)
      .in('status', ['active', 'warming'])
      .order('reputation_score', { ascending: false })

    if (satErr) {
      return {
        success: false, totalRecipients: params.recipients.length,
        totalSent: 0, totalFailed: 0, chunks: [], overflow: params.recipients,
        error: `Failed to load satellites: ${satErr.message}`,
      }
    }

    // Only use satellites whose domains are verified
    const eligibleSats: Satellite[] = (satellites || [])
      .filter((s: any) => {
        const domain = Array.isArray(s.sending_domains)
          ? s.sending_domains[0]
          : s.sending_domains
        return domain?.verification_status === 'verified'
      })
      .map((s: any) => {
        const domain = Array.isArray(s.sending_domains)
          ? s.sending_domains[0]
          : s.sending_domains
        return { ...s, sending_domains: undefined, domain } as Satellite
      })

    if (eligibleSats.length === 0) {
      return {
        success: false, totalRecipients: params.recipients.length,
        totalSent: 0, totalFailed: 0, chunks: [], overflow: params.recipients,
        error: 'No eligible satellites. Ensure at least one satellite is active/warming with a verified domain.',
      }
    }

    // ── 3. Compute per-satellite available capacity ─────────────────────────
    const allocations = this.computeAllocations(eligibleSats, params.recipients, config)

    if (allocations.allocatedChunks.length === 0) {
      return {
        success: false, totalRecipients: params.recipients.length,
        totalSent: 0, totalFailed: 0, chunks: [], overflow: params.recipients,
        error: 'All satellites have exhausted their daily send capacity. Try again tomorrow or provision more satellites.',
      }
    }

    // ── 4. Load the provider adapter ────────────────────────────────────────
    const providerType = eligibleSats[0].domain?.provider || 'mailwizz'
    const { adapter, error: adapterError } = await this.loadProviderAdapter(db, orgId, providerType)
    if (!adapter) {
      return {
        success: false, totalRecipients: params.recipients.length,
        totalSent: 0, totalFailed: 0, chunks: [], overflow: params.recipients,
        error: adapterError || 'Failed to load email provider adapter',
      }
    }

    // ── 5. Send each chunk through the adapter ──────────────────────────────
    const chunks: SendChunkResult[] = []
    let totalSent = 0
    let totalFailed = 0

    for (const alloc of allocations.allocatedChunks) {
      if (alloc.allocatedRecipients.length === 0) continue

      const chunkParams: BulkSendParams = {
        ...params,
        campaignName: `${params.campaignName} [${alloc.satellite.mailbox_email}]`,
        fromEmail: alloc.satellite.mailbox_email,
        fromName: params.fromName || alloc.satellite.mailbox_local_part,
        recipients: alloc.allocatedRecipients,
      }

      try {
        const result = await adapter.sendBulk(chunkParams)

        if (result.success) {
          // Record sends in the satellite's daily counter
          await this.recordSends(db, alloc.satellite, alloc.allocatedRecipients.length)
          totalSent += alloc.allocatedRecipients.length
        } else {
          totalFailed += alloc.allocatedRecipients.length
        }

        chunks.push({
          satelliteId: alloc.satellite.id,
          satelliteEmail: alloc.satellite.mailbox_email,
          recipientCount: alloc.allocatedRecipients.length,
          success: result.success,
          campaignId: result.campaignId,
          error: result.error,
        })
      } catch (err: any) {
        totalFailed += alloc.allocatedRecipients.length
        chunks.push({
          satelliteId: alloc.satellite.id,
          satelliteEmail: alloc.satellite.mailbox_email,
          recipientCount: alloc.allocatedRecipients.length,
          success: false,
          error: err.message,
        })
      }
    }

    return {
      success: totalSent > 0,
      totalRecipients: params.recipients.length,
      totalSent,
      totalFailed,
      chunks,
      overflow: allocations.overflow,
    }
  }

  // ─── Allocation Engine ──────────────────────────────────────────────────────

  private computeAllocations(
    satellites: Satellite[],
    recipients: BulkSendParams['recipients'],
    config: OrchestratorConfig,
  ): { allocatedChunks: SatelliteAllocation[]; overflow: BulkSendParams['recipients'] } {
    // Compute effective capacity per satellite
    const satCaps: Array<{ sat: Satellite; cap: number }> = satellites.map((sat) => {
      const effectiveDailyCap = Math.min(sat.daily_send_cap, config.globalDailyCap)

      let warmupCap = effectiveDailyCap
      if (sat.status === 'warming' || sat.warmup_day < sat.warmup_target_days) {
        const rampFraction = Math.min(1, (sat.warmup_day + 1) / sat.warmup_target_days)
        warmupCap = Math.max(config.warmupMinVolume, Math.round(effectiveDailyCap * rampFraction))
      }

      const remaining = Math.max(0, warmupCap - sat.current_daily_sent)
      return { sat, cap: remaining }
    }).filter((s) => s.cap > 0)

    // Distribute recipients across satellites (greedy: fill highest-capacity first)
    // Sort by capacity descending for even distribution
    satCaps.sort((a, b) => b.cap - a.cap)

    const allocations: SatelliteAllocation[] = satCaps.map((sc) => ({
      satellite: sc.sat,
      availableCapacity: sc.cap,
      allocatedRecipients: [],
    }))

    let recipientIdx = 0
    const totalCapacity = satCaps.reduce((sum, sc) => sum + sc.cap, 0)

    // Weighted distribution — each satellite gets a proportional share
    for (const alloc of allocations) {
      if (recipientIdx >= recipients.length) break

      const share = Math.ceil((alloc.availableCapacity / totalCapacity) * recipients.length)
      const count = Math.min(share, alloc.availableCapacity, recipients.length - recipientIdx)

      alloc.allocatedRecipients = recipients.slice(recipientIdx, recipientIdx + count)
      recipientIdx += count
    }

    // Any leftovers that couldn't fit
    const overflow = recipients.slice(recipientIdx)

    return { allocatedChunks: allocations, overflow }
  }

  // ─── Record Sends ──────────────────────────────────────────────────────────

  private async recordSends(db: any, satellite: Satellite, sendsCompleted: number) {
    const newDailySent = satellite.current_daily_sent + sendsCompleted

    // Advance warmup_day only once per calendar day.
    // The daily reset cron sets current_daily_sent to 0 at midnight UTC.
    // So if current_daily_sent was 0 before this send, this is the first send of the day.
    const isFirstSendOfDay = satellite.current_daily_sent === 0
    const newWarmupDay =
      isFirstSendOfDay && satellite.warmup_day < satellite.warmup_target_days
        ? satellite.warmup_day + 1
        : satellite.warmup_day

    const statusTransition =
      satellite.status === 'warming' && newWarmupDay >= satellite.warmup_target_days
        ? 'active'
        : satellite.status

    await db
      .from('sending_satellites')
      .update({
        current_daily_sent: newDailySent,
        warmup_day: newWarmupDay,
        status: statusTransition,
        last_send_at: new Date().toISOString(),
      })
      .eq('id', satellite.id)
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

  // ─── Platform Config ───────────────────────────────────────────────────────

  private async loadPacingConfig(db: any): Promise<OrchestratorConfig> {
    const { data: rows }: { data: any[] | null } = await db
      .from('config_table')
      .select('key, value')
      .in('key', ['send_pacing_global_daily_cap', 'send_pacing_warmup_min_volume'])

    const map: Record<string, any> = {}
    for (const r of rows || []) {
      map[r.key] = typeof r.value === 'object' && r.value !== null && 'value' in r.value
        ? r.value.value
        : r.value
    }

    return {
      globalDailyCap: Number(map['send_pacing_global_daily_cap']) || 3000,
      warmupMinVolume: Number(map['send_pacing_warmup_min_volume']) || 25,
    }
  }
}

export const satelliteSendOrchestrator = new SatelliteSendOrchestrator()
