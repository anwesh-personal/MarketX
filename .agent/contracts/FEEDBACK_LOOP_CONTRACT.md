# Market Writer — MTA-Agnostic Feedback Loop Contract

**Version:** 1.0  
**Date:** 2026-03-16  
**Author:** Axiom Engineering  
**Status:** Ratified  

---

## Purpose

Market Writer learns what works. It does NOT send emails, manage lists, or run campaigns — that is the MTA's job (MailWizz, or whatever replaces it).

Market Writer's only dependency on the MTA is: **normalized feedback events flowing into `signal_event`**.

This contract defines the stable interface between ANY MTA and Market Writer's learning brain so that switching MTA requires **zero code changes** in the learning/brain layer.

---

## Architecture Boundary

```
┌──────────────────────────────────────────────────────────────┐
│  MTA LAYER (replaceable)                                      │
│  MailWizz / SES / Mailgun / SendGrid / Generic SMTP / etc.   │
│                                                                │
│  Responsibilities:                                             │
│  - Manage subscriber lists and sequences                      │
│  - Send email bytes (SMTP or API)                             │
│  - Track opens/clicks (pixel + link wrapping)                 │
│  - Fire webhooks on events                                    │
│  - Optionally capture reply bodies                            │
└─────────────────────────┬────────────────────────────────────┘
                          │
                    webhook POST
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  FEEDBACK INGESTION LAYER (stable, never changes)            │
│  /api/webhooks/email/[provider]                               │
│                                                                │
│  1. Resolve adapter by provider slug                          │
│  2. Verify webhook signature                                  │
│  3. Parse → CanonicalEmailEvent[]                             │
│  4. INSERT into signal_event (idempotent)                     │
│  5. Enqueue learning-loop job                                 │
└─────────────────────────┬────────────────────────────────────┘
                          │
                   signal_event table
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  LEARNING LAYER (provider-blind)                              │
│  MarketingCoachProcessor                                      │
│                                                                │
│  Reads ONLY from signal_event. Never knows which provider.   │
│  Updates belief confidence, writes brain_memories,            │
│  brain_reflections. Triggers dream cycle.                     │
│                                                                │
│  Market Writer uses these learnings to write better emails.   │
└──────────────────────────────────────────────────────────────┘
```

---

## Non-Negotiable Rules

### Rule 1: Learning layer NEVER imports provider code
`MarketingCoachProcessor`, `MarketXToolExecutor`, `BrainOrchestrator` — none of these may import, reference, or be aware of any specific email provider. They read `signal_event` only.

### Rule 2: Canonical event types are fixed
```
send | open | click | reply | bounce | complaint
```
No provider-specific event types in `signal_event.event_type`. Ever. Adapters normalize before insert.

### Rule 3: Attribution tags are mandatory for persistence
Every event persisted to `signal_event` MUST have `partner_id` (org). Events without org attribution are rejected (400), not silently dropped.

### Rule 4: Idempotency is structural, not application-logic
`signal_event.idempotency_key` is a database-generated column with a unique index. Duplicate webhook deliveries produce a unique violation (23505) which the webhook handler treats as success. No application-level dedup maps.

### Rule 5: Provider capabilities degrade gracefully
If a provider does not support `replyTracking`, the adapter sets `replyBody: undefined`. Brain still processes the `reply` event type (count-based learning). No errors, no skips.

### Rule 6: Provider config lives in DB, not env
`email_provider_configs` is the single source of truth for credentials, webhook secrets, rate limits, and warmup config. No `process.env.MAILWIZZ_*` fallbacks.

### Rule 7: New MTA = new adapter file + registry entry + DB row
Nothing else changes. No webhook route changes. No learning code changes. No migration changes (unless new provider_type needs adding to the CHECK constraint).

---

## signal_event Schema (stable contract)

```sql
signal_event (
  id              UUID PRIMARY KEY,
  partner_id      UUID NOT NULL,          -- org attribution (FK partner)
  event_type      TEXT NOT NULL,          -- canonical: send|open|click|reply|bounce|complaint
  source          TEXT,                   -- provider slug: mailwizz|ses|mailgun|sendgrid|smtp|...
  belief_id       UUID,                   -- which belief this email expressed
  icp_id          UUID,                   -- which ICP segment
  offer_id        UUID,                   -- which offer
  brief_id        UUID,                   -- which brief
  metadata        JSONB DEFAULT '{}',     -- { email, message_id, campaign_id, reply_body, provider }
  idempotency_key TEXT GENERATED STORED,  -- unique: partner:type:message_id
  occurred_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL
)
```

### Metadata schema (JSONB)
```json
{
  "email":       "recipient@example.com",
  "message_id":  "provider-assigned-id",
  "campaign_id": "campaign-or-sequence-id",
  "reply_body":  "actual reply text or null",
  "provider":    "mailwizz"
}
```

---

## EmailProviderAdapter Interface (stable contract)

```typescript
interface EmailProviderAdapter {
  readonly id: string                    // slug: 'mailwizz' | 'ses' | 'smtp' | ...
  readonly name: string                  // human: 'MailWizz' | 'Amazon SES' | ...
  readonly providerCategory: 'autoresponder' | 'smtp_relay'
  readonly capabilities: {
    send: boolean
    bulkSend: boolean
    webhooks: boolean
    campaignStats: boolean
    replyTracking: boolean
  }

  configure(config: ProviderConfig): void
  testConnection(): Promise<ConnectionTestResult>
  sendEmail(params: SendEmailParams): Promise<SendEmailResult>
  sendBulk(params: BulkSendParams): Promise<BulkSendResult>
  verifyWebhook(req: NextRequest, rawBody: string): Promise<boolean>
  parseEvents(req: NextRequest, rawBody: string): Promise<CanonicalEmailEvent[]>
  getCampaignStats(campaignId: string): Promise<CampaignStats>
}
```

### CanonicalEmailEvent (stable)
```typescript
interface CanonicalEmailEvent {
  type: 'send' | 'open' | 'click' | 'reply' | 'bounce' | 'complaint'
  email: string
  messageId?: string
  campaignId?: string
  orgId?: string
  beliefId?: string
  icpId?: string
  offerId?: string
  briefId?: string
  replyBody?: string
  timestamp: string
}
```

---

## Provider Registry

File: `services/email/EmailProviderAdapter.ts`

```typescript
const REGISTRY: Record<string, new () => EmailProviderAdapter> = {
  mailwizz:  MailWizzAdapter,
  mailgun:   MailgunAdapter,
  ses:       SESAdapter,
  sendgrid:  SendGridAdapter,
  smtp:      GenericSMTPAdapter,
  postmark:  PostmarkAdapter,
  sparkpost: SparkPostAdapter,
}
```

Adding a provider = add adapter class + add entry here. Done.

---

## DB Constraint: email_provider_configs.provider_type

```sql
CHECK (provider_type IN (
  'mailwizz', 'mailgun', 'ses', 'sendgrid',
  'postmark', 'sparkpost', 'smtp', 'custom'
))
```

Expanding = ALTER TABLE + add to CHECK. No other changes needed.

---

## Webhook Endpoint Contract

**URL:** `POST /api/webhooks/email/{provider_slug}`

**Behavior:**
1. Adapter resolved by slug. Unknown → 400.
2. Config loaded from `email_provider_configs`. Missing/inactive → 503.
3. Webhook secret required if `capabilities.webhooks = true`. Missing → 503.
4. Signature verified. Invalid → 401.
5. Events parsed to canonical. Parse fail → 400.
6. Events without `orgId` filtered out. All missing → 400.
7. INSERT into `signal_event`. Unique violation → 200 (duplicate).
8. High-value events (reply/click/bounce) → enqueue `coach_analysis` job per org.
9. Success → 200 `{ received, provider }`.

---

## EmailDispatchService Contract

**Purpose:** Send emails via org's configured provider.

**Provider resolution order:**
1. `email_provider_configs` WHERE `partner_id = orgId` AND `is_active = true` ORDER BY `priority DESC`
2. If no org-level config: `email_provider_configs` WHERE `scope = 'global'` AND `is_active = true` ORDER BY `priority DESC`
3. No config → error (no fallback, no hardcoded provider)

**On send success:** log `send` event to `signal_event` with attribution tags.

---

## "Switch MTA" Checklist (what actually changes)

| Step | What | Where |
|------|------|-------|
| 1 | Write adapter class implementing `EmailProviderAdapter` | `services/email/providers/NewAdapter.ts` |
| 2 | Add to REGISTRY | `EmailProviderAdapter.ts` |
| 3 | Add `provider_type` to DB CHECK if new | Migration |
| 4 | Create `email_provider_configs` row in Superadmin UI | DB via UI |
| 5 | Point new provider's webhook URL to `/api/webhooks/email/{slug}` | Provider dashboard |

**What does NOT change:**
- Webhook route code
- signal_event schema
- MarketingCoachProcessor
- MarketXToolExecutor
- BrainOrchestrator
- Workflow engine
- Any learning/brain code

---

## Capability Matrix (current + planned)

| Provider | Category | send | bulkSend | webhooks | stats | replyBody |
|----------|----------|------|----------|----------|-------|-----------|
| MailWizz | autoresponder | Y | Y | Y | Y | Y |
| Mailgun | smtp_relay | Y | Y | Y | Y | N |
| SES | smtp_relay | Y | Y | Y | limited | N |
| SendGrid | smtp_relay | Y | Y | Y | Y | N |
| Generic SMTP | smtp_relay | Y | N | N | N | N |
| Postmark | smtp_relay | Y | Y | Y | Y | Y (inbound) |
| SparkPost | smtp_relay | Y | Y | Y | Y | N |

---

*This contract is the law. Any code that violates these rules is a bug, not a feature.*
