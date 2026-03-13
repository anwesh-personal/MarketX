/**
 * EMAIL PROVIDER ADAPTER
 * ======================
 * Clean interface every MTA/ESP must implement.
 * Add a new provider by:
 *   1. Create apps/frontend/src/services/email/providers/YourProvider.ts
 *   2. Implement EmailProviderAdapter
 *   3. Register in EmailProviderRegistry below
 *
 * Canonical event types (all providers normalize to these):
 *   send | open | click | reply | bounce | complaint
 *
 * Signal flow:
 *   MTA webhook → verifyWebhook → parseEvents → CanonicalEmailEvent[]
 *   → signal_event table → learning-loop-worker → Brain improves
 */

import type { NextRequest } from 'next/server'

// ─── Canonical Types ──────────────────────────────────────────────────────────

export type CanonicalEventType = 'send' | 'open' | 'click' | 'reply' | 'bounce' | 'complaint'

export interface CanonicalEmailEvent {
  type: CanonicalEventType
  email: string
  messageId?: string
  campaignId?: string
  /** Attribution IDs — embedded in campaign custom fields at send time */
  orgId?: string
  partnerId?: string
  beliefId?: string
  icpId?: string
  offerId?: string
  briefId?: string
  /** Reply body text — only set when type === 'reply' */
  replyBody?: string
  timestamp: string
  raw?: Record<string, unknown>
}

export interface SendEmailParams {
  to: string | string[]
  subject: string
  htmlBody: string
  textBody?: string
  fromName?: string
  fromEmail?: string
  replyTo?: string
  /** Custom fields embedded in email for attribution tracking */
  trackingTags?: {
    orgId?: string
    partnerId?: string
    beliefId?: string
    icpId?: string
    offerId?: string
    briefId?: string
  }
  /** Provider-specific extras */
  meta?: Record<string, unknown>
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
  raw?: unknown
}

export interface BulkSendParams {
  campaignName: string
  subject: string
  htmlBody: string
  textBody?: string
  fromName?: string
  fromEmail?: string
  recipients: Array<{ email: string; firstName?: string; lastName?: string; customFields?: Record<string, string> }>
  trackingTags?: SendEmailParams['trackingTags']
  scheduledAt?: string
}

export interface BulkSendResult {
  success: boolean
  campaignId?: string
  queued?: number
  error?: string
}

export interface CampaignStats {
  campaignId: string
  campaignName?: string
  sent: number
  opens: number
  uniqueOpens: number
  clicks: number
  uniqueClicks: number
  replies: number
  bounces: number
  complaints: number
  openRate: number
  clickRate: number
  replyRate: number
  bounceRate: number
}

export interface ProviderConfig {
  apiKey?: string
  apiSecret?: string
  baseUrl?: string
  region?: string
  fromEmail?: string
  fromName?: string
  webhookSecret?: string
  /** Any provider-specific config */
  extra?: Record<string, unknown>
}

export interface ConnectionTestResult {
  success: boolean
  latencyMs?: number
  error?: string
  details?: string
}

// ─── Adapter Interface ────────────────────────────────────────────────────────

export interface EmailProviderAdapter {
  /** Unique slug: 'mailwizz' | 'mailgun' | 'ses' | 'sendgrid' | 'smtp' */
  readonly id: string
  /** Human-readable name */
  readonly name: string
  /** Supported features */
  readonly capabilities: {
    send: boolean
    bulkSend: boolean
    webhooks: boolean
    campaignStats: boolean
    replyTracking: boolean
  }

  /** Configure provider (called after loading config from DB) */
  configure(config: ProviderConfig): void

  /** Test connection — called from superadmin UI */
  testConnection(): Promise<ConnectionTestResult>

  // ─── SEND ─────────────────────────────────────────────────────────────────

  /** Send a single transactional email */
  sendEmail(params: SendEmailParams): Promise<SendEmailResult>

  /** Send a bulk campaign */
  sendBulk(params: BulkSendParams): Promise<BulkSendResult>

  // ─── WEBHOOKS ─────────────────────────────────────────────────────────────

  /** Verify webhook authenticity — return false → 401 */
  verifyWebhook(req: NextRequest, rawBody: string): Promise<boolean>

  /** Parse raw webhook body into canonical events */
  parseEvents(req: NextRequest, rawBody: string): Promise<CanonicalEmailEvent[]>

  // ─── STATS ────────────────────────────────────────────────────────────────

  /** Fetch campaign stats from provider API */
  getCampaignStats(campaignId: string): Promise<CampaignStats>
}

// ─── Registry ─────────────────────────────────────────────────────────────────

import { MailWizzAdapter }  from './providers/MailWizzAdapter'
import { MailgunAdapter }   from './providers/MailgunAdapter'
import { SESAdapter }       from './providers/SESAdapter'
import { SendGridAdapter }  from './providers/SendGridAdapter'

const REGISTRY: Record<string, new () => EmailProviderAdapter> = {
  mailwizz:  MailWizzAdapter,
  mailgun:   MailgunAdapter,
  ses:       SESAdapter,
  sendgrid:  SendGridAdapter,
}

export function getEmailProviderAdapter(providerId: string): EmailProviderAdapter | null {
  const Cls = REGISTRY[providerId.toLowerCase()]
  if (!Cls) return null
  return new Cls()
}

export function listSupportedProviders(): string[] {
  return Object.keys(REGISTRY)
}
