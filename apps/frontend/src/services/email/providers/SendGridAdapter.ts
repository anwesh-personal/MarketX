/**
 * SENDGRID ADAPTER
 * Uses SendGrid v3 API
 */

import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import type {
  EmailProviderAdapter, ProviderConfig, ConnectionTestResult,
  SendEmailParams, SendEmailResult, BulkSendParams, BulkSendResult,
  CampaignStats, CanonicalEmailEvent, CanonicalEventType,
} from '../EmailProviderAdapter'

const EVENT_MAP: Record<string, CanonicalEventType> = {
  delivered:         'send',
  open:              'open',
  click:             'click',
  bounce:            'bounce',
  blocked:           'bounce',
  dropped:           'bounce',
  spamreport:        'complaint',
  unsubscribe:       'complaint',
  group_unsubscribe: 'complaint',
}

export class SendGridAdapter implements EmailProviderAdapter {
  readonly id   = 'sendgrid'
  readonly name = 'SendGrid'
  readonly capabilities = {
    send: true, bulkSend: true, webhooks: true, campaignStats: true, replyTracking: false,
  }

  private apiKey        = ''
  private webhookSecret = ''
  private fromEmail     = ''
  private fromName      = ''

  configure(config: ProviderConfig) {
    this.apiKey        = config.apiKey        || ''
    this.webhookSecret = config.webhookSecret || ''
    this.fromEmail     = config.fromEmail     || ''
    this.fromName      = config.fromName      || 'Market Writer'
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const t0 = Date.now()
    try {
      const res = await this.sgGet('/v3/user/credits')
      return { success: !!res.remain, latencyMs: Date.now() - t0, details: `Credits remaining: ${res.remain}` }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const body = {
        personalizations: [{
          to: (Array.isArray(params.to) ? params.to : [params.to]).map(e => ({ email: e })),
          custom_args: params.trackingTags ? {
            org_id:    params.trackingTags.orgId    || '',
            belief_id: params.trackingTags.beliefId || '',
            icp_id:    params.trackingTags.icpId    || '',
            offer_id:  params.trackingTags.offerId  || '',
            brief_id:  params.trackingTags.briefId  || '',
          } : {},
        }],
        from: { email: params.fromEmail || this.fromEmail, name: params.fromName || this.fromName },
        reply_to: params.replyTo ? { email: params.replyTo } : undefined,
        subject: params.subject,
        content: [
          { type: 'text/html', value: params.htmlBody },
          ...(params.textBody ? [{ type: 'text/plain', value: params.textBody }] : []),
        ],
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking:  { enable: true },
        },
      }
      const res = await this.sgPost('/v3/mail/send', body)
      const messageId = res.headers?.['x-message-id'] as string | undefined
      return { success: true, messageId, raw: res }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async sendBulk(params: BulkSendParams): Promise<BulkSendResult> {
    try {
      const personalizations = params.recipients.map(r => ({
        to: [{ email: r.email }],
        dynamic_template_data: { firstName: r.firstName || '', lastName: r.lastName || '', ...r.customFields },
        custom_args: {
          org_id:    params.trackingTags?.orgId    || '',
          belief_id: params.trackingTags?.beliefId || '',
          icp_id:    params.trackingTags?.icpId    || '',
        },
      }))
      const body = {
        personalizations,
        from:    { email: params.fromEmail || this.fromEmail, name: params.fromName || this.fromName },
        subject: params.subject,
        content: [{ type: 'text/html', value: params.htmlBody }],
        send_at: params.scheduledAt ? Math.floor(new Date(params.scheduledAt).getTime() / 1000) : undefined,
      }
      await this.sgPost('/v3/mail/send', body)
      return { success: true, queued: params.recipients.length }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async verifyWebhook(req: NextRequest, rawBody: string): Promise<boolean> {
    if (!this.webhookSecret) return false
    const sig       = req.headers.get('x-twilio-email-event-webhook-signature') || ''
    const timestamp = req.headers.get('x-twilio-email-event-webhook-timestamp') || ''
    try {
      const payload = timestamp + rawBody
      const expected = crypto.createHmac('sha256', this.webhookSecret).update(payload).digest('base64')
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    } catch { return false }
  }

  async parseEvents(_req: NextRequest, rawBody: string): Promise<CanonicalEmailEvent[]> {
    try {
      const events = JSON.parse(rawBody) as any[]
      return (events || []).flatMap((evt): CanonicalEmailEvent[] => {
        const canonical = EVENT_MAP[evt.event]
        if (!canonical) return []
        return [{
          type:       canonical,
          email:      evt.email || '',
          messageId:  evt.sg_message_id,
          campaignId: evt.campaign_id || evt.custom_args?.campaign_id,
          orgId:      evt.custom_args?.org_id,
          beliefId:   evt.custom_args?.belief_id,
          icpId:      evt.custom_args?.icp_id,
          offerId:    evt.custom_args?.offer_id,
          briefId:    evt.custom_args?.brief_id,
          timestamp:  evt.timestamp ? new Date(evt.timestamp * 1000).toISOString() : new Date().toISOString(),
          raw: evt,
        }]
      })
    } catch { return [] }
  }

  async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    const data = await this.sgGet(`/v3/campaigns/${campaignId}/schedules`)
    const s = data?.stats?.results?.[0]?.stats?.[0]?.metrics || {}
    const sent = s.requests || 0
    return {
      campaignId,
      sent,
      opens:         s.opens         || 0, uniqueOpens:  s.unique_opens  || 0,
      clicks:        s.clicks        || 0, uniqueClicks: s.unique_clicks || 0,
      replies:       0,
      bounces:       (s.bounces      || 0) + (s.blocks || 0),
      complaints:    s.spam_reports  || 0,
      openRate:      sent ? (s.open_rate  || 0) : 0,
      clickRate:     sent ? (s.click_rate || 0) : 0,
      replyRate:     0,
      bounceRate:    sent ? ((s.bounces || 0) / sent) : 0,
    }
  }

  private async sgGet(path: string) {
    const res = await fetch(`https://api.sendgrid.com${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
    })
    return res.json()
  }

  private async sgPost(path: string, body: unknown) {
    const res = await fetch(`https://api.sendgrid.com${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok && res.status !== 202) {
      const err = await res.text()
      throw new Error(`SendGrid error ${res.status}: ${err}`)
    }
    return { status: res.status, headers: Object.fromEntries(res.headers.entries()) }
  }
}
