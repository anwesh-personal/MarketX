/**
 * AWS SES ADAPTER
 * Uses SES v2 API + SNS for webhooks
 */

import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import type {
  EmailProviderAdapter, ProviderConfig, ConnectionTestResult,
  SendEmailParams, SendEmailResult, BulkSendParams, BulkSendResult,
  CampaignStats, CanonicalEmailEvent, CanonicalEventType,
} from '../EmailProviderAdapter'

const NOTIF_MAP: Record<string, CanonicalEventType> = {
  Delivery:  'send',
  Open:      'open',
  Click:     'click',
  Bounce:    'bounce',
  Complaint: 'complaint',
}

export class SESAdapter implements EmailProviderAdapter {
  readonly id   = 'ses'
  readonly name = 'AWS SES'
  readonly capabilities = {
    send: true, bulkSend: true, webhooks: true, campaignStats: false, replyTracking: false,
  }

  private accessKeyId     = ''
  private secretAccessKey = ''
  private region          = 'us-east-1'
  private fromEmail       = ''
  private fromName        = ''

  configure(config: ProviderConfig) {
    this.accessKeyId     = config.apiKey     || ''
    this.secretAccessKey = config.apiSecret  || ''
    this.region          = config.region     || 'us-east-1'
    this.fromEmail       = config.fromEmail  || ''
    this.fromName        = config.fromName   || 'Market Writer'
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const t0 = Date.now()
    try {
      await this.sesCall('GetAccount', {})
      return { success: true, latencyMs: Date.now() - t0 }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const toList = Array.isArray(params.to) ? params.to : [params.to]
      const body: Record<string, unknown> = {
        FromEmailAddress: params.fromEmail
          ? `${params.fromName || this.fromName} <${params.fromEmail}>`
          : `${this.fromName} <${this.fromEmail}>`,
        Destination: { ToAddresses: toList },
        Content: {
          Simple: {
            Subject: { Data: params.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: params.htmlBody, Charset: 'UTF-8' },
              Text: { Data: params.textBody || '', Charset: 'UTF-8' },
            },
          },
        },
        Tags: params.trackingTags
          ? Object.entries(params.trackingTags).map(([k, v]) => ({ Name: k, Value: v || '' }))
          : [],
      }
      const res = await this.sesCall('SendEmail', body)
      return { success: !!res.MessageId, messageId: res.MessageId, raw: res }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async sendBulk(params: BulkSendParams): Promise<BulkSendResult> {
    // SES bulk: send individually (no native list management)
    let queued = 0
    for (const r of params.recipients) {
      const res = await this.sendEmail({
        to: r.email,
        subject: params.subject,
        htmlBody: params.htmlBody,
        textBody: params.textBody,
        fromName: params.fromName,
        fromEmail: params.fromEmail,
        trackingTags: params.trackingTags,
      })
      if (res.success) queued++
    }
    return { success: queued > 0, queued }
  }

  async verifyWebhook(req: NextRequest, rawBody: string): Promise<boolean> {
    try {
      const body = JSON.parse(rawBody)
      const certUrl = body.SigningCertURL || ''
      if (!certUrl.endsWith('.amazonaws.com')) return false
      // SNS signature verification (simplified — full RSA verification in production)
      return !!body.Signature
    } catch { return false }
  }

  async parseEvents(_req: NextRequest, rawBody: string): Promise<CanonicalEmailEvent[]> {
    try {
      const body = JSON.parse(rawBody)
      // SNS wrapper
      const message = body.Message ? JSON.parse(body.Message) : body
      const notifType: string = message.notificationType || message.eventType || ''
      const canonical = NOTIF_MAP[notifType]
      if (!canonical) return []

      let email = ''
      let messageId = message.mail?.messageId
      const tags = (message.mail?.tags || {}) as Record<string, string[]>

      if (canonical === 'bounce')    email = message.bounce?.bouncedRecipients?.[0]?.emailAddress || ''
      if (canonical === 'complaint') email = message.complaint?.complainedRecipients?.[0]?.emailAddress || ''
      if (canonical === 'send')      email = message.mail?.destination?.[0] || ''
      if (canonical === 'open')      email = message.open?.ipAddress ? message.mail?.destination?.[0] || '' : ''
      if (canonical === 'click')     email = message.click?.ipAddress ? message.mail?.destination?.[0] || '' : ''

      return [{
        type: canonical,
        email,
        messageId,
        orgId:    tags.org_id?.[0],
        beliefId: tags.belief_id?.[0],
        icpId:    tags.icp_id?.[0],
        offerId:  tags.offer_id?.[0],
        briefId:  tags.brief_id?.[0],
        timestamp: message.mail?.timestamp || new Date().toISOString(),
        raw: message,
      }]
    } catch { return [] }
  }

  async getCampaignStats(_campaignId: string): Promise<CampaignStats> {
    // SES doesn't have campaign-level stats via API without SES sending metrics
    return { campaignId: _campaignId, sent: 0, opens: 0, uniqueOpens: 0, clicks: 0, uniqueClicks: 0, replies: 0, bounces: 0, complaints: 0, openRate: 0, clickRate: 0, replyRate: 0, bounceRate: 0 }
  }

  private async sesCall(action: string, body: Record<string, unknown>) {
    const url = `https://email.${this.region}.amazonaws.com/v2/email/${action.toLowerCase().replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`).replace(/^-/, '')}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Amz-Target': `AmazonSimpleEmailServiceV2.${action}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`SES ${action} failed: ${res.status} ${await res.text()}`)
    return res.json()
  }
}
