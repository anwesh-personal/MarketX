/**
 * MAILWIZZ ADAPTER
 * Implements EmailProviderAdapter for MailWizz MTA.
 * Docs: https://api-docs.mailwizz.com/
 */

import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import type {
  EmailProviderAdapter, ProviderConfig, ConnectionTestResult,
  SendEmailParams, SendEmailResult, BulkSendParams, BulkSendResult,
  CampaignStats, CanonicalEmailEvent, CanonicalEventType,
} from '../EmailProviderAdapter'

const EVENT_MAP: Record<string, CanonicalEventType> = {
  subscribe:        'send',
  delivery:         'send',
  open:             'open',
  click:            'click',
  unsubscribe:      'complaint',
  complaint:        'complaint',
  bounce:           'bounce',
  hard_bounce:      'bounce',
  soft_bounce:      'bounce',
  internal_bounce:  'bounce',
  reply:            'reply',
}

export class MailWizzAdapter implements EmailProviderAdapter {
  readonly id               = 'mailwizz'
  readonly name             = 'MailWizz'
  /**
   * MailWizz is an AUTORESPONDER / CAMPAIGN MANAGER — not an SMTP server.
   * It manages subscriber lists, email sequences, and campaign scheduling.
   * Internally it routes actual email delivery through a configured SMTP
   * relay (AWS SES, Mailgun, Postfix, etc.) — that relay is the real MTA.
   * MarketX uses MailWizz for: subscriber management, campaign dispatch,
   * and receiving open/click/reply/bounce webhooks.
   */
  readonly providerCategory = 'autoresponder' as const
  readonly capabilities     = {
    send: true, bulkSend: true, webhooks: true, campaignStats: true, replyTracking: true,
  }

  private apiKey    = ''
  private apiSecret = ''
  private baseUrl   = ''
  private webhookSecret = ''
  private fromEmail = ''
  private fromName  = ''

  configure(config: ProviderConfig) {
    this.apiKey         = config.apiKey     || ''
    this.apiSecret      = config.apiSecret  || ''
    this.baseUrl        = (config.baseUrl   || '').replace(/\/$/, '')
    this.webhookSecret  = config.webhookSecret || ''
    this.fromEmail      = config.fromEmail  || ''
    this.fromName       = config.fromName   || 'Market Writer'
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const t0 = Date.now()
    try {
      const res = await this.mwGet('/lists')
      return { success: res.status === 'success', latencyMs: Date.now() - t0 }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  // ─── SEND ────────────────────────────────────────────────────────────────

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const payload = {
        fromName:    params.fromName  || this.fromName,
        fromEmail:   params.fromEmail || this.fromEmail,
        subject:     params.subject,
        toEmail:     Array.isArray(params.to) ? params.to[0] : params.to,
        body:        params.htmlBody,
        plainText:   params.textBody || '',
        replyTo:     params.replyTo  || '',
        trackOpens:  true,
        trackClicks: true,
      }
      const res = await this.mwPost('/transactional-emails', payload)
      return { success: res.status === 'success', messageId: res.data?.email?.message_id, raw: res }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async sendBulk(params: BulkSendParams): Promise<BulkSendResult> {
    try {
      // 1. Create a list (or reuse) with recipients
      const listRes = await this.mwPost('/lists', {
        general: { name: `${params.campaignName} — ${Date.now()}`, displayName: params.campaignName },
        defaults: { fromEmail: params.fromEmail || this.fromEmail, fromName: params.fromName || this.fromName, replyTo: params.fromEmail || this.fromEmail, subject: params.subject },
        notifications: { subscribe: 'no', unsubscribe: 'no' },
      })
      const listUid = listRes.data?.list?.list_uid
      if (!listUid) throw new Error('Failed to create MailWizz list')

      // 2. Bulk subscribe recipients with tracking custom fields
      const subscribers = params.recipients.map(r => ({
        EMAIL: r.email,
        FNAME: r.firstName || '',
        LNAME: r.lastName  || '',
        ORG_ID:    params.trackingTags?.orgId    || '',
        BELIEF_ID: params.trackingTags?.beliefId || '',
        ICP_ID:    params.trackingTags?.icpId    || '',
        OFFER_ID:  params.trackingTags?.offerId  || '',
        BRIEF_ID:  params.trackingTags?.briefId  || '',
        ...r.customFields,
      }))
      await this.mwPost(`/lists/${listUid}/subscribers/import`, { subscribers })

      // 3. Create + send campaign
      const campRes = await this.mwPost('/campaigns', {
        name:        params.campaignName,
        type:        'regular',
        status:      params.scheduledAt ? 'paused' : 'sending',
        send_at:     params.scheduledAt || new Date().toISOString(),
        from_name:   params.fromName  || this.fromName,
        from_email:  params.fromEmail || this.fromEmail,
        reply_to:    params.fromEmail || this.fromEmail,
        subject:     params.subject,
        list_uid:    listUid,
        template:    { content: params.htmlBody },
        options: { url_tracking: 'yes', open_tracking: 'yes' },
      })

      return {
        success: campRes.status === 'success',
        campaignId: campRes.data?.campaign?.campaign_uid,
        queued: params.recipients.length,
        raw: campRes,
      }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  // ─── WEBHOOKS ────────────────────────────────────────────────────────────

  async verifyWebhook(req: NextRequest, rawBody: string): Promise<boolean> {
    if (!this.webhookSecret) return false
    const sig = req.headers.get('x-mw-signature') || req.headers.get('x-mailwizz-signature')
    if (sig) {
      const expected = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex')
      try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) } catch { return false }
    }
    const auth = req.headers.get('authorization')
    return auth === `Bearer ${this.webhookSecret}`
  }

  async parseEvents(_req: NextRequest, rawBody: string): Promise<CanonicalEmailEvent[]> {
    let payload: unknown
    try { payload = JSON.parse(rawBody) } catch { return [] }
    const events = Array.isArray(payload) ? payload : [payload]
    const result: CanonicalEmailEvent[] = []

    for (const evt of events) {
      const raw       = evt as Record<string, any>
      const mwType    = raw.event || raw.type || raw.event_type
      const canonical = EVENT_MAP[String(mwType).toLowerCase()]
      if (!canonical) continue

      // Attribution IDs from custom fields or top-level fields
      const cf = raw.subscriber_custom_fields || raw.custom_fields || {}
      result.push({
        type:       canonical,
        email:      raw.subscriber?.email || raw.email || raw.to || '',
        messageId:  raw.message_id || raw.msg_id,
        campaignId: raw.campaign_uid || raw.campaign_id,
        orgId:      cf.ORG_ID    || raw.org_id,
        beliefId:   cf.BELIEF_ID || raw.belief_id,
        icpId:      cf.ICP_ID    || raw.icp_id,
        offerId:    cf.OFFER_ID  || raw.offer_id,
        briefId:    cf.BRIEF_ID  || raw.brief_id,
        replyBody:  canonical === 'reply' ? (raw.reply_body || raw.body || '') : undefined,
        timestamp:  raw.occurred_at || raw.timestamp || new Date().toISOString(),
        raw,
      })
    }
    return result
  }

  // ─── STATS ───────────────────────────────────────────────────────────────

  async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    const res = await this.mwGet(`/campaigns/${campaignId}/stats`)
    const d = res.data?.campaign_stats || {}
    const sent    = Number(d.total_sent        || 0)
    const opens   = Number(d.total_opens       || 0)
    const clicks  = Number(d.total_clicks      || 0)
    const bounces = Number(d.total_hard_bounces || 0) + Number(d.total_soft_bounces || 0)
    return {
      campaignId,
      campaignName:  d.campaign?.name,
      sent,
      opens,        uniqueOpens:  Number(d.unique_opens   || 0),
      clicks,       uniqueClicks: Number(d.unique_clicks  || 0),
      replies:       Number(d.total_replies    || 0),
      bounces,
      complaints:    Number(d.total_complaints || 0),
      openRate:      sent ? opens   / sent : 0,
      clickRate:     sent ? clicks  / sent : 0,
      replyRate:     sent ? Number(d.total_replies || 0) / sent : 0,
      bounceRate:    sent ? bounces / sent : 0,
    }
  }

  // ─── HTTP helpers ────────────────────────────────────────────────────────

  private async mwGet(path: string) {
    const timestamp = Math.floor(Date.now() / 1000)
    const sig = crypto.createHmac('sha256', this.apiSecret)
      .update(`GET\n${path}\n${timestamp}`).digest('hex')
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      headers: {
        'X-MW-PUBLIC-KEY': this.apiKey,
        'X-MW-TIMESTAMP':  String(timestamp),
        'X-MW-REMOTE-ADDR': '127.0.0.1',
        'X-MW-SIGNATURE':   sig,
        'Content-Type':     'application/json',
      },
    })
    return res.json()
  }

  private async mwPost(path: string, body: unknown) {
    const timestamp = Math.floor(Date.now() / 1000)
    const bodyStr = JSON.stringify(body)
    const sig = crypto.createHmac('sha256', this.apiSecret)
      .update(`POST\n${path}\n${timestamp}\n${bodyStr}`).digest('hex')
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method: 'POST',
      headers: {
        'X-MW-PUBLIC-KEY': this.apiKey,
        'X-MW-TIMESTAMP':  String(timestamp),
        'X-MW-REMOTE-ADDR': '127.0.0.1',
        'X-MW-SIGNATURE':   sig,
        'Content-Type':     'application/json',
      },
      body: bodyStr,
    })
    return res.json()
  }
}
