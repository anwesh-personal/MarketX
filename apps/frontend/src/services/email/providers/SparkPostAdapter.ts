/**
 * SPARKPOST ADAPTER
 * =================
 * https://developers.sparkpost.com/api/
 *
 * SparkPost is an enterprise email delivery service with:
 *   - REST API for transactional and campaign sends
 *   - Webhook relay for all event types
 *   - Detailed per-message and aggregate stats
 *
 * Capabilities:
 *   send:          YES
 *   bulkSend:      YES (transmissions API)
 *   webhooks:      YES (relay webhooks)
 *   campaignStats: YES (metrics API)
 *   replyTracking: NO
 */

import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import type {
  EmailProviderAdapter,
  ProviderConfig,
  ConnectionTestResult,
  SendEmailParams,
  SendEmailResult,
  BulkSendParams,
  BulkSendResult,
  CampaignStats,
  CanonicalEmailEvent,
  CanonicalEventType,
} from '../EmailProviderAdapter'

const EVENT_MAP: Record<string, CanonicalEventType> = {
  delivery:         'send',
  injection:        'send',
  open:             'open',
  initial_open:     'open',
  click:            'click',
  bounce:           'bounce',
  out_of_band:      'bounce',
  spam_complaint:   'complaint',
  list_unsubscribe: 'complaint',
}

export class SparkPostAdapter implements EmailProviderAdapter {
  readonly id = 'sparkpost'
  readonly name = 'SparkPost'
  readonly providerCategory = 'smtp_relay' as const
  readonly capabilities = {
    send: true,
    bulkSend: true,
    webhooks: true,
    campaignStats: true,
    replyTracking: false,
  }

  private apiKey = ''
  private baseUrl = 'https://api.sparkpost.com/api/v1'
  private webhookSecret = ''
  private fromEmail = ''
  private fromName = 'Market Writer'

  configure(config: ProviderConfig): void {
    this.apiKey = config.apiKey || ''
    this.baseUrl = (config.baseUrl || 'https://api.sparkpost.com/api/v1').replace(/\/$/, '')
    this.webhookSecret = config.webhookSecret || ''
    this.fromEmail = config.fromEmail || ''
    this.fromName = config.fromName || 'Market Writer'
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const t0 = Date.now()
    try {
      const res = await fetch(`${this.baseUrl}/account`, {
        headers: { Authorization: this.apiKey, Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return { success: true, latencyMs: Date.now() - t0 }
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e), latencyMs: Date.now() - t0 }
    }
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const recipients = (Array.isArray(params.to) ? params.to : [params.to]).map((email) => ({
        address: { email },
      }))

      const metadata = params.trackingTags
        ? {
            org_id: params.trackingTags.orgId,
            belief_id: params.trackingTags.beliefId,
            icp_id: params.trackingTags.icpId,
            offer_id: params.trackingTags.offerId,
            brief_id: params.trackingTags.briefId,
          }
        : undefined

      const body = {
        recipients,
        content: {
          from: { email: params.fromEmail || this.fromEmail, name: params.fromName || this.fromName },
          subject: params.subject,
          html: params.htmlBody,
          text: params.textBody || undefined,
          reply_to: params.replyTo || undefined,
        },
        options: { open_tracking: true, click_tracking: true },
        metadata,
      }

      const res = await fetch(`${this.baseUrl}/transmissions`, {
        method: 'POST',
        headers: {
          Authorization: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.errors?.[0]?.message || `HTTP ${res.status}`, raw: data }
      return { success: true, messageId: data.results?.id, raw: data }
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  async sendBulk(params: BulkSendParams): Promise<BulkSendResult> {
    try {
      const recipients = params.recipients.map((r) => ({
        address: { email: r.email, name: r.firstName ? `${r.firstName} ${r.lastName || ''}`.trim() : undefined },
        substitution_data: r.customFields || {},
      }))

      const body = {
        recipients,
        content: {
          from: { email: params.fromEmail || this.fromEmail, name: params.fromName || this.fromName },
          subject: params.subject,
          html: params.htmlBody,
          text: params.textBody || undefined,
        },
        options: { open_tracking: true, click_tracking: true },
        campaign_id: params.campaignName,
        metadata: params.trackingTags
          ? { org_id: params.trackingTags.orgId, belief_id: params.trackingTags.beliefId }
          : undefined,
      }

      const res = await fetch(`${this.baseUrl}/transmissions`, {
        method: 'POST',
        headers: { Authorization: this.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.errors?.[0]?.message || `HTTP ${res.status}` }
      return { success: true, campaignId: data.results?.id, queued: data.results?.total_accepted_recipients }
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  async verifyWebhook(req: NextRequest, rawBody: string): Promise<boolean> {
    if (!this.webhookSecret) return true
    const sig = req.headers.get('x-messagesystems-webhook-token') || ''
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  }

  async parseEvents(_req: NextRequest, rawBody: string): Promise<CanonicalEmailEvent[]> {
    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return []
    }

    const items = Array.isArray(payload) ? payload : [payload]
    const results: CanonicalEmailEvent[] = []

    for (const item of items) {
      const msys = (item as Record<string, unknown>).msys as Record<string, Record<string, unknown>> | undefined
      if (!msys) continue

      const eventCategory = Object.keys(msys)[0]
      if (!eventCategory) continue
      const evt = msys[eventCategory]

      const spType = String(evt.type || eventCategory)
      const canonical = EVENT_MAP[spType]
      if (!canonical) continue

      const meta = (evt.rcpt_meta || {}) as Record<string, string>

      results.push({
        type: canonical,
        email: String(evt.rcpt_to || ''),
        messageId: String(evt.message_id || evt.transmission_id || ''),
        campaignId: String(evt.campaign_id || ''),
        orgId: meta.org_id || undefined,
        beliefId: meta.belief_id || undefined,
        icpId: meta.icp_id || undefined,
        offerId: meta.offer_id || undefined,
        briefId: meta.brief_id || undefined,
        timestamp: String(evt.timestamp || new Date().toISOString()),
        raw: item as Record<string, unknown>,
      })
    }

    return results
  }

  async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    try {
      const from = new Date(Date.now() - 30 * 86400_000).toISOString()
      const res = await fetch(
        `${this.baseUrl}/metrics/deliverability/campaign?campaigns=${campaignId}&from=${from}&metrics=count_sent,count_unique_confirmed_opened,count_clicked,count_bounce,count_spam_complaint`,
        { headers: { Authorization: this.apiKey, Accept: 'application/json' } }
      )
      const data = await res.json()
      const r = data.results?.[0] || {}
      const sent = r.count_sent || 0
      const opens = r.count_unique_confirmed_opened || 0
      const clicks = r.count_clicked || 0
      const bounces = r.count_bounce || 0
      const complaints = r.count_spam_complaint || 0
      return {
        campaignId,
        sent, opens, uniqueOpens: opens, clicks, uniqueClicks: clicks,
        replies: 0, bounces, complaints,
        openRate: sent ? opens / sent : 0,
        clickRate: sent ? clicks / sent : 0,
        replyRate: 0,
        bounceRate: sent ? bounces / sent : 0,
      }
    } catch {
      return {
        campaignId,
        sent: 0, opens: 0, uniqueOpens: 0, clicks: 0, uniqueClicks: 0,
        replies: 0, bounces: 0, complaints: 0,
        openRate: 0, clickRate: 0, replyRate: 0, bounceRate: 0,
      }
    }
  }
}
