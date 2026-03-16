/**
 * POSTMARK ADAPTER
 * ================
 * https://postmarkapp.com/developer
 *
 * Postmark is a transactional email service with:
 *   - API-based send (no SMTP required)
 *   - Webhooks for bounce/open/click/delivery/spam-complaint
 *   - Inbound email processing (reply body capture)
 *   - Message stream separation (transactional vs broadcast)
 *
 * Capabilities:
 *   send:          YES
 *   bulkSend:      YES (batch API, max 500 per call)
 *   webhooks:      YES
 *   campaignStats: YES (message streams + stats API)
 *   replyTracking: YES (inbound webhook)
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
  Delivery:         'send',
  Bounce:           'bounce',
  HardBounce:       'bounce',
  SoftBounce:       'bounce',
  Open:             'open',
  Click:            'click',
  SpamComplaint:    'complaint',
  SubscriptionChange: 'complaint',
  InboundMessage:   'reply',
}

export class PostmarkAdapter implements EmailProviderAdapter {
  readonly id = 'postmark'
  readonly name = 'Postmark'
  readonly providerCategory = 'smtp_relay' as const
  readonly capabilities = {
    send: true,
    bulkSend: true,
    webhooks: true,
    campaignStats: true,
    replyTracking: true,
  }

  private serverToken = ''
  private webhookSecret = ''
  private fromEmail = ''
  private fromName = 'Market Writer'
  private messageStream = 'outbound'

  configure(config: ProviderConfig): void {
    this.serverToken = config.apiKey || ''
    this.webhookSecret = config.webhookSecret || ''
    this.fromEmail = config.fromEmail || ''
    this.fromName = config.fromName || 'Market Writer'
    this.messageStream = (config.extra as Record<string, string>)?.messageStream || 'outbound'
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const t0 = Date.now()
    try {
      const res = await fetch('https://api.postmarkapp.com/server', {
        headers: { 'X-Postmark-Server-Token': this.serverToken, Accept: 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.Message || `HTTP ${res.status}`)
      return { success: true, latencyMs: Date.now() - t0, details: data.Name }
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e), latencyMs: Date.now() - t0 }
    }
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const to = Array.isArray(params.to) ? params.to.join(', ') : params.to
      const body: Record<string, unknown> = {
        From: `${params.fromName || this.fromName} <${params.fromEmail || this.fromEmail}>`,
        To: to,
        Subject: params.subject,
        HtmlBody: params.htmlBody,
        TextBody: params.textBody || undefined,
        ReplyTo: params.replyTo || undefined,
        MessageStream: this.messageStream,
        TrackOpens: true,
        TrackLinks: 'HtmlAndText',
      }
      if (params.trackingTags) {
        body.Metadata = {
          org_id: params.trackingTags.orgId,
          belief_id: params.trackingTags.beliefId,
          icp_id: params.trackingTags.icpId,
          offer_id: params.trackingTags.offerId,
          brief_id: params.trackingTags.briefId,
        }
      }

      const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': this.serverToken,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.ErrorCode) {
        return { success: false, error: data.Message || `HTTP ${res.status}`, raw: data }
      }
      return { success: true, messageId: data.MessageID, raw: data }
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  async sendBulk(params: BulkSendParams): Promise<BulkSendResult> {
    try {
      const messages = params.recipients.map((r) => ({
        From: `${params.fromName || this.fromName} <${params.fromEmail || this.fromEmail}>`,
        To: r.email,
        Subject: params.subject,
        HtmlBody: params.htmlBody,
        TextBody: params.textBody || undefined,
        MessageStream: this.messageStream,
        TrackOpens: true,
        TrackLinks: 'HtmlAndText',
        Metadata: params.trackingTags
          ? {
              org_id: params.trackingTags.orgId,
              belief_id: params.trackingTags.beliefId,
              icp_id: params.trackingTags.icpId,
            }
          : undefined,
      }))

      const res = await fetch('https://api.postmarkapp.com/email/batch', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': this.serverToken,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(messages),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
      return { success: true, queued: messages.length, campaignId: undefined }
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  async verifyWebhook(req: NextRequest, _rawBody: string): Promise<boolean> {
    if (!this.webhookSecret) return true
    const sig = req.headers.get('x-postmark-signature') || ''
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(_rawBody).digest('base64')
    return sig === expected
  }

  async parseEvents(_req: NextRequest, rawBody: string): Promise<CanonicalEmailEvent[]> {
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return []
    }

    const recordType = String(payload.RecordType || '')
    const canonical = EVENT_MAP[recordType]
    if (!canonical) return []

    const metadata = (payload.Metadata || {}) as Record<string, string>

    const event: CanonicalEmailEvent = {
      type: canonical,
      email: String(payload.Recipient || payload.From || ''),
      messageId: String(payload.MessageID || ''),
      orgId: metadata.org_id || undefined,
      beliefId: metadata.belief_id || undefined,
      icpId: metadata.icp_id || undefined,
      offerId: metadata.offer_id || undefined,
      briefId: metadata.brief_id || undefined,
      replyBody: canonical === 'reply' ? String(payload.TextBody || '') : undefined,
      timestamp: String(payload.ReceivedAt || payload.DeliveredAt || new Date().toISOString()),
      raw: payload,
    }

    return [event]
  }

  async getCampaignStats(_campaignId: string): Promise<CampaignStats> {
    try {
      const res = await fetch(
        `https://api.postmarkapp.com/stats/outbound?fromdate=${new Date(Date.now() - 30 * 86400_000).toISOString().split('T')[0]}`,
        {
          headers: { 'X-Postmark-Server-Token': this.serverToken, Accept: 'application/json' },
        }
      )
      const data = await res.json()
      const sent = data.Sent || 0
      return {
        campaignId: _campaignId,
        sent,
        opens: data.Opens || 0,
        uniqueOpens: data.UniqueOpens || 0,
        clicks: data.TotalClicks || 0,
        uniqueClicks: data.UniqueLinksClicked || 0,
        replies: 0,
        bounces: (data.Bounced || 0) + (data.HardBounced || 0),
        complaints: data.SpamComplaints || 0,
        openRate: sent ? (data.Opens || 0) / sent : 0,
        clickRate: sent ? (data.TotalClicks || 0) / sent : 0,
        replyRate: 0,
        bounceRate: sent ? ((data.Bounced || 0) + (data.HardBounced || 0)) / sent : 0,
      }
    } catch {
      return {
        campaignId: _campaignId,
        sent: 0, opens: 0, uniqueOpens: 0, clicks: 0, uniqueClicks: 0,
        replies: 0, bounces: 0, complaints: 0,
        openRate: 0, clickRate: 0, replyRate: 0, bounceRate: 0,
      }
    }
  }
}
