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
  delivery:         'delivery',
  open:             'open',
  click:            'click',
  unsubscribe:      'unsubscribe',
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
      // MailWizz Campaign Create API: POST /campaigns
      // Expects form-encoded with campaign[...] nested params.
      // The list should ALREADY exist (pushed by Refinery).
      // MarketWriter creates the CAMPAIGN against that list.
      const listUid = params.meta?.listUid as string
      if (!listUid) throw new Error('listUid is required — Refinery must push the list first')

      const sendAt = params.scheduledAt
        ? new Date(params.scheduledAt).toISOString().replace('T', ' ').slice(0, 19)
        : new Date().toISOString().replace('T', ' ').slice(0, 19)

      const campaignData: Record<string, any> = {
        name:       params.campaignName,
        type:       'regular',
        from_name:  params.fromName  || this.fromName,
        from_email: params.fromEmail || this.fromEmail,
        subject:    params.subject,
        reply_to:   params.fromEmail || this.fromEmail,
        send_at:    sendAt,
        list_uid:   listUid,
        template: {
          content:         params.htmlBody,
          inline_css:      'yes',
          auto_plain_text: 'yes',
        },
        options: {
          url_tracking:     'yes',
          plain_text_email: 'yes',
        },
      }

      // Optional: segment within the list
      if (params.meta?.segmentUid) {
        campaignData.segment_uid = params.meta.segmentUid as string
      }

      // Optional: assign specific delivery servers (satellite mapping)
      if (params.meta?.deliveryServerIds) {
        const ids = params.meta.deliveryServerIds as number[]
        ids.forEach((id, i) => {
          campaignData[`delivery_servers[${i}]`] = id
        })
      }

      const campRes = await this.mwPost('/campaigns', campaignData)

      return {
        success: campRes.status === 'success',
        campaignId: campRes.campaign_uid || campRes.data?.campaign_uid,
        queued: params.recipients.length,
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

  // ─── CAMPAIGN CONTROL ──────────────────────────────────────────────────

  async pauseCampaign(campaignUid: string): Promise<{ success: boolean }> {
    const res = await this.mwPatch(`/campaigns/${campaignUid}`, { status: 'paused' })
    return { success: res.status === 'success' }
  }

  async unpauseCampaign(campaignUid: string): Promise<{ success: boolean }> {
    const res = await this.mwPatch(`/campaigns/${campaignUid}`, { status: 'sending' })
    return { success: res.status === 'success' }
  }

  async getDeliveryServers(): Promise<{ id: number; name: string }[]> {
    const res = await this.mwGet('/delivery-servers')
    const records = res.data?.records || []
    return records.map((r: any) => ({ id: r.server_id, name: r.name || r.hostname }))
  }

  async getLists(): Promise<{ listUid: string; name: string; subscriberCount: number }[]> {
    const res = await this.mwGet('/lists', { per_page: '100' })
    const records = res.data?.records || []
    return records.map((r: any) => ({
      listUid: r.general?.list_uid || r.list_uid,
      name: r.general?.name || r.name,
      subscriberCount: Number(r.subscribers_count || 0),
    }))
  }

  // ─── HTTP helpers ────────────────────────────────────────────────────────
  // MailWizz API requires:
  //   1. Form-encoded body (NOT JSON)
  //   2. HMAC-SHA256 signature of the sorted params
  //   3. X-MW-PUBLIC-KEY header for identification

  private buildFormData(obj: Record<string, any>, prefix = ''): URLSearchParams {
    const params = new URLSearchParams()
    const flatten = (src: Record<string, any>, pfx: string) => {
      for (const [k, v] of Object.entries(src)) {
        const key = pfx ? `${pfx}[${k}]` : k
        if (v != null && typeof v === 'object' && !Array.isArray(v)) {
          flatten(v, key)
        } else if (v != null) {
          params.append(key, String(v))
        }
      }
    }
    flatten(obj, prefix)
    return params
  }

  private sign(method: string, path: string, params: URLSearchParams): string {
    // Sort params alphabetically and build signing string
    const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
    const paramStr = sorted.map(([k, v]) => `${k}=${v}`).join('&')
    const sigBase = `${method.toUpperCase()}\n${path}\n${paramStr}`
    return crypto.createHmac('sha256', this.apiSecret).update(sigBase).digest('hex')
  }

  private headers(method: string, path: string, params: URLSearchParams): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000)
    params.append('timestamp', String(timestamp))
    return {
      'X-MW-PUBLIC-KEY': this.apiKey,
      'X-MW-TIMESTAMP': String(timestamp),
      'X-MW-REMOTE-ADDR': '127.0.0.1',
      'X-MW-SIGNATURE': this.sign(method, path, params),
    }
  }

  private async mwGet(path: string, query: Record<string, string> = {}) {
    const params = new URLSearchParams(query)
    const hdrs = this.headers('GET', path, params)
    const qs = params.toString()
    const url = `${this.baseUrl}/api${path}${qs ? '?' + qs : ''}`
    const res = await fetch(url, { headers: { ...hdrs, 'Content-Type': 'application/x-www-form-urlencoded' } })
    return res.json()
  }

  private async mwPost(path: string, body: Record<string, any>) {
    const params = this.buildFormData(body)
    const hdrs = this.headers('POST', path, params)
    const res = await fetch(`${this.baseUrl}/api${path}`, {
      method: 'POST',
      headers: { ...hdrs, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    return res.json()
  }

  private async mwPut(path: string, body: Record<string, any>) {
    const params = this.buildFormData(body)
    const hdrs = this.headers('PUT', path, params)
    const res = await fetch(`${this.baseUrl}/api${path}`, {
      method: 'PUT',
      headers: { ...hdrs, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    return res.json()
  }

  private async mwPatch(path: string, body: Record<string, any> = {}) {
    const params = this.buildFormData(body)
    const hdrs = this.headers('PATCH', path, params)
    const res = await fetch(`${this.baseUrl}/api${path}`, {
      method: 'PATCH',
      headers: { ...hdrs, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    return res.json()
  }
}
