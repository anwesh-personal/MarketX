/**
 * MAILGUN ADAPTER
 */

import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import type {
  EmailProviderAdapter, ProviderConfig, ConnectionTestResult,
  SendEmailParams, SendEmailResult, BulkSendParams, BulkSendResult,
  CampaignStats, CanonicalEmailEvent, CanonicalEventType,
} from '../EmailProviderAdapter'

const EVENT_MAP: Record<string, CanonicalEventType> = {
  delivered:      'send',
  opened:         'open',
  clicked:        'click',
  failed:         'bounce',
  permanent_fail: 'bounce',
  temporary_fail: 'bounce',
  complained:     'complaint',
  unsubscribed:   'complaint',
}

export class MailgunAdapter implements EmailProviderAdapter {
  readonly id   = 'mailgun'
  readonly name = 'Mailgun'
  readonly capabilities = {
    send: true, bulkSend: true, webhooks: true, campaignStats: true, replyTracking: false,
  }

  private apiKey       = ''
  private domain       = ''
  private baseUrl      = 'https://api.mailgun.net'
  private webhookSecret = ''
  private fromEmail    = ''
  private fromName     = ''

  configure(config: ProviderConfig) {
    this.apiKey        = config.apiKey      || ''
    this.domain        = String(config.extra?.domain || '')
    this.baseUrl       = config.baseUrl     || 'https://api.mailgun.net'
    this.webhookSecret = config.webhookSecret || ''
    this.fromEmail     = config.fromEmail   || ''
    this.fromName      = config.fromName    || 'Market Writer'
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const t0 = Date.now()
    try {
      const res = await this.mgGet(`/v3/domains/${this.domain}`)
      return { success: !!res.domain, latencyMs: Date.now() - t0 }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const form = new URLSearchParams()
      form.append('from', `${params.fromName || this.fromName} <${params.fromEmail || this.fromEmail}>`)
      form.append('to', Array.isArray(params.to) ? params.to.join(',') : params.to)
      form.append('subject', params.subject)
      form.append('html', params.htmlBody)
      if (params.textBody) form.append('text', params.textBody)
      if (params.replyTo)  form.append('h:Reply-To', params.replyTo)
      // Attribution tags as custom headers
      if (params.trackingTags) {
        const t = params.trackingTags
        if (t.orgId)    form.append('h:X-Org-Id',    t.orgId)
        if (t.beliefId) form.append('h:X-Belief-Id', t.beliefId)
        if (t.icpId)    form.append('h:X-Icp-Id',    t.icpId)
        if (t.offerId)  form.append('h:X-Offer-Id',  t.offerId)
        if (t.briefId)  form.append('h:X-Brief-Id',  t.briefId)
      }
      const data = await this.mgPost(`/v3/${this.domain}/messages`, form)
      return { success: !!data.id, messageId: data.id, raw: data }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async sendBulk(params: BulkSendParams): Promise<BulkSendResult> {
    // Mailgun batch send via recipient-variables
    try {
      const recipientVars: Record<string, Record<string, string>> = {}
      for (const r of params.recipients) {
        recipientVars[r.email] = {
          first_name: r.firstName || '',
          last_name:  r.lastName  || '',
          ...r.customFields,
        }
      }
      const form = new URLSearchParams()
      form.append('from', `${params.fromName || this.fromName} <${params.fromEmail || this.fromEmail}>`)
      form.append('to', params.recipients.map(r => r.email).join(','))
      form.append('subject', params.subject)
      form.append('html', params.htmlBody)
      if (params.textBody) form.append('text', params.textBody)
      form.append('recipient-variables', JSON.stringify(recipientVars))
      if (params.trackingTags) {
        const t = params.trackingTags
        if (t.orgId)    form.append('h:X-Org-Id',    t.orgId)
        if (t.beliefId) form.append('h:X-Belief-Id', t.beliefId)
      }
      const data = await this.mgPost(`/v3/${this.domain}/messages`, form)
      return { success: !!data.id, campaignId: data.id, queued: params.recipients.length }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async verifyWebhook(_req: NextRequest, rawBody: string): Promise<boolean> {
    if (!this.webhookSecret) return false
    try {
      const body = JSON.parse(rawBody)
      const { timestamp, token, signature } = body?.signature || {}
      const expected = crypto.createHmac('sha256', this.webhookSecret)
        .update(`${timestamp}${token}`).digest('hex')
      return crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(expected))
    } catch { return false }
  }

  async parseEvents(_req: NextRequest, rawBody: string): Promise<CanonicalEmailEvent[]> {
    try {
      const body = JSON.parse(rawBody)
      const evtData = body['event-data'] || body
      const type = EVENT_MAP[evtData?.event]
      if (!type) return []
      const headers = evtData?.message?.headers || {}
      return [{
        type,
        email:      evtData.recipient || evtData.email || '',
        messageId:  evtData.id || headers['message-id'],
        campaignId: evtData['user-variables']?.campaign_id,
        orgId:      headers['x-org-id']    || evtData['user-variables']?.org_id,
        beliefId:   headers['x-belief-id'] || evtData['user-variables']?.belief_id,
        icpId:      headers['x-icp-id']    || evtData['user-variables']?.icp_id,
        offerId:    headers['x-offer-id']  || evtData['user-variables']?.offer_id,
        briefId:    headers['x-brief-id']  || evtData['user-variables']?.brief_id,
        timestamp:  evtData.timestamp
          ? new Date(evtData.timestamp * 1000).toISOString()
          : new Date().toISOString(),
        raw: evtData,
      }]
    } catch { return [] }
  }

  async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    const data = await this.mgGet(`/v3/${this.domain}/events?message-id=${campaignId}`)
    const items: any[] = data.items || []
    const counts: Record<string, number> = {}
    for (const item of items) {
      const t = EVENT_MAP[item.event]
      if (t) counts[t] = (counts[t] || 0) + 1
    }
    const sent = counts.send || 0
    return {
      campaignId,
      sent,
      opens:         counts.open  || 0, uniqueOpens:  counts.open  || 0,
      clicks:        counts.click || 0, uniqueClicks: counts.click || 0,
      replies:       counts.reply || 0,
      bounces:       counts.bounce || 0,
      complaints:    counts.complaint || 0,
      openRate:      sent ? (counts.open  || 0) / sent : 0,
      clickRate:     sent ? (counts.click || 0) / sent : 0,
      replyRate:     sent ? (counts.reply || 0) / sent : 0,
      bounceRate:    sent ? (counts.bounce || 0) / sent : 0,
    }
  }

  private authHeader() {
    return `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`
  }

  private async mgGet(path: string) {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: { Authorization: this.authHeader() } })
    return res.json()
  }

  private async mgPost(path: string, body: URLSearchParams) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: this.authHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    return res.json()
  }
}
