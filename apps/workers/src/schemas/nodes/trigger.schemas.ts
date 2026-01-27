/**
 * TRIGGER NODE SCHEMAS
 * Input/Output contracts for workflow trigger nodes
 */

import { z } from 'zod';

// ============================================================================
// WEBHOOK TRIGGER
// ============================================================================

export const WebhookTriggerInput = z.object({
    /** Raw HTTP body */
    body: z.record(z.string(), z.any()).optional(),
    /** HTTP headers */
    headers: z.record(z.string(), z.string()).optional(),
    /** HTTP method */
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('POST'),
    /** Query parameters */
    query: z.record(z.string(), z.string()).optional(),
});

export const WebhookTriggerOutput = z.object({
    /** Parsed payload data */
    payload: z.record(z.string(), z.any()),
    /** Source identifier */
    source: z.string(),
    /** Timestamp of trigger */
    triggeredAt: z.string(),
    /** Webhook ID for tracking */
    webhookId: z.string().optional(),
});

export type WebhookTriggerInputType = z.infer<typeof WebhookTriggerInput>;
export type WebhookTriggerOutputType = z.infer<typeof WebhookTriggerOutput>;

// ============================================================================
// SCHEDULE TRIGGER
// ============================================================================

export const ScheduleTriggerInput = z.object({
    /** Cron expression */
    cron: z.string().optional(),
    /** Human-readable schedule */
    schedule: z.string().optional(),
    /** Timezone */
    timezone: z.string().default('UTC'),
});

export const ScheduleTriggerOutput = z.object({
    /** Scheduled time that triggered this run */
    scheduledTime: z.string(),
    /** Actual execution time */
    executionTime: z.string(),
    /** Run number (sequential) */
    runNumber: z.number().optional(),
    /** Last run output (for continuity) */
    lastRunOutput: z.record(z.string(), z.any()).optional(),
});

export type ScheduleTriggerInputType = z.infer<typeof ScheduleTriggerInput>;
export type ScheduleTriggerOutputType = z.infer<typeof ScheduleTriggerOutput>;

// ============================================================================
// MANUAL TRIGGER
// ============================================================================

export const ManualTriggerInput = z.object({
    /** User-provided input data */
    data: z.record(z.string(), z.any()).optional(),
    /** User ID who triggered */
    triggeredBy: z.string().optional(),
    /** Test mode flag */
    testMode: z.boolean().default(false),
});

export const ManualTriggerOutput = z.object({
    /** Passed-through input data */
    data: z.record(z.string(), z.any()),
    /** User who triggered */
    triggeredBy: z.string(),
    /** Timestamp */
    triggeredAt: z.string(),
    /** Execution mode */
    mode: z.enum(['test', 'live']),
});

export type ManualTriggerInputType = z.infer<typeof ManualTriggerInput>;
export type ManualTriggerOutputType = z.infer<typeof ManualTriggerOutput>;

// ============================================================================
// EMAIL TRIGGER (from n8n/MailWiz)
// ============================================================================

export const EmailTriggerInput = z.object({
    /** Sender email address */
    from: z.string().email(),
    /** Recipient email address */
    to: z.string().email(),
    /** Email subject */
    subject: z.string(),
    /** Plain text body */
    bodyText: z.string().optional(),
    /** HTML body */
    bodyHtml: z.string().optional(),
    /** Attachment info */
    attachments: z.array(z.object({
        filename: z.string(),
        contentType: z.string(),
        size: z.number(),
    })).optional(),
    /** Thread ID for replies */
    threadId: z.string().optional(),
});

export const EmailTriggerOutput = z.object({
    /** Parsed email data */
    email: z.object({
        from: z.string(),
        to: z.string(),
        subject: z.string(),
        body: z.string(),
    }),
    /** Detected intent (if any) */
    detectedIntent: z.string().optional(),
    /** Is this a reply in a thread */
    isReply: z.boolean(),
    /** Thread context (previous emails) */
    threadContext: z.array(z.string()).optional(),
});

export type EmailTriggerInputType = z.infer<typeof EmailTriggerInput>;
export type EmailTriggerOutputType = z.infer<typeof EmailTriggerOutput>;
