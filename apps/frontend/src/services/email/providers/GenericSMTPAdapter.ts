/**
 * GENERIC SMTP ADAPTER
 * ====================
 * Connects to ANY SMTP server (Postfix, hMailServer, PowerMTA, Postal,
 * cPanel, Plesk, or any third-party SMTP relay).
 *
 * Uses nodemailer under the hood. Supports TLS/SSL/STARTTLS.
 *
 * Capabilities:
 *   send:          YES (transactional single send)
 *   bulkSend:      NO  (use autoresponder layer for bulk)
 *   webhooks:      NO  (SMTP has no webhook standard; use provider-specific or IMAP polling)
 *   campaignStats: NO
 *   replyTracking: NO
 *
 * This adapter is for orgs that bring their own SMTP server and just need
 * Market Writer to send through it. Feedback comes from the autoresponder
 * layer (MailWizz etc.) or IMAP polling — not from SMTP itself.
 */

import nodemailer from 'nodemailer'
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
} from '../EmailProviderAdapter'

export class GenericSMTPAdapter implements EmailProviderAdapter {
  readonly id = 'smtp'
  readonly name = 'Generic SMTP'
  readonly providerCategory = 'smtp_relay' as const
  readonly capabilities = {
    send: true,
    bulkSend: false,
    webhooks: false,
    campaignStats: false,
    replyTracking: false,
  }

  private host = ''
  private port = 587
  private secure = false
  private user = ''
  private pass = ''
  private fromEmail = ''
  private fromName = 'Market Writer'
  private tls: 'tls' | 'ssl' | 'starttls' | 'none' = 'tls'

  configure(config: ProviderConfig): void {
    const extra = config.extra || {}
    this.host = String(extra.smtp_host || config.baseUrl || '')
    this.port = Number(extra.smtp_port || 587)
    this.user = String(extra.smtp_username || config.apiKey || '')
    this.pass = String(extra.smtp_password || config.apiSecret || '')
    this.fromEmail = config.fromEmail || ''
    this.fromName = config.fromName || 'Market Writer'
    this.tls = (String(extra.smtp_encryption || 'tls')) as typeof this.tls
    this.secure = this.tls === 'ssl' || (this.tls === 'tls' && this.port === 465)
  }

  private createTransport() {
    return nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      auth: this.user ? { user: this.user, pass: this.pass } : undefined,
      tls: {
        rejectUnauthorized: true,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    })
  }

  async testConnection(): Promise<ConnectionTestResult> {
    if (!this.host) {
      return { success: false, error: 'SMTP host not configured' }
    }
    const t0 = Date.now()
    try {
      const transport = this.createTransport()
      await transport.verify()
      transport.close()
      return { success: true, latencyMs: Date.now() - t0 }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { success: false, error: msg, latencyMs: Date.now() - t0 }
    }
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    if (!this.host) {
      return { success: false, error: 'SMTP host not configured' }
    }

    const transport = this.createTransport()
    try {
      const to = Array.isArray(params.to) ? params.to.join(', ') : params.to
      const info = await transport.sendMail({
        from: `"${params.fromName || this.fromName}" <${params.fromEmail || this.fromEmail}>`,
        to,
        replyTo: params.replyTo || undefined,
        subject: params.subject,
        html: params.htmlBody,
        text: params.textBody || undefined,
        headers: params.trackingTags
          ? {
              'X-Axiom-Org-Id': params.trackingTags.orgId || '',
              'X-Axiom-Belief-Id': params.trackingTags.beliefId || '',
              'X-Axiom-ICP-Id': params.trackingTags.icpId || '',
              'X-Axiom-Offer-Id': params.trackingTags.offerId || '',
              'X-Axiom-Brief-Id': params.trackingTags.briefId || '',
            }
          : undefined,
      })
      return { success: true, messageId: info.messageId, raw: info }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { success: false, error: msg }
    } finally {
      transport.close()
    }
  }

  async sendBulk(_params: BulkSendParams): Promise<BulkSendResult> {
    return {
      success: false,
      error: 'Generic SMTP does not support bulk send. Use an autoresponder (MailWizz) for campaigns.',
    }
  }

  async verifyWebhook(_req: NextRequest, _rawBody: string): Promise<boolean> {
    return false
  }

  async parseEvents(_req: NextRequest, _rawBody: string): Promise<CanonicalEmailEvent[]> {
    return []
  }

  async getCampaignStats(_campaignId: string): Promise<CampaignStats> {
    return {
      campaignId: _campaignId,
      sent: 0, opens: 0, uniqueOpens: 0, clicks: 0, uniqueClicks: 0,
      replies: 0, bounces: 0, complaints: 0,
      openRate: 0, clickRate: 0, replyRate: 0, bounceRate: 0,
    }
  }
}
