/**
 * OUTPUT NODE SCHEMAS
 * Input/Output contracts for workflow output/delivery nodes
 */

import { z } from 'zod';

// ============================================================================
// OUTPUT WEBHOOK
// ============================================================================

export const OutputWebhookInput = z.object({
    /** URL to send to */
    url: z.string().url(),
    /** HTTP method */
    method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
    /** Data to send */
    payload: z.record(z.string(), z.any()),
    /** Custom headers */
    headers: z.record(z.string(), z.string()).optional(),
    /** Authentication */
    auth: z.object({
        type: z.enum(['none', 'bearer', 'api_key', 'hmac']),
        value: z.string().optional(),
        headerName: z.string().optional(),
        secret: z.string().optional(),
    }).optional(),
    /** Retry on failure */
    retryOnFailure: z.boolean().default(true),
    /** Max retries */
    maxRetries: z.number().default(3),
});

export const OutputWebhookOutput = z.object({
    /** Was delivery successful */
    success: z.boolean(),
    /** HTTP status code */
    statusCode: z.number(),
    /** Response body */
    responseBody: z.any().optional(),
    /** Delivery timestamp */
    deliveredAt: z.string(),
    /** Retry attempts made */
    retryAttempts: z.number(),
});

export type OutputWebhookInputType = z.infer<typeof OutputWebhookInput>;
export type OutputWebhookOutputType = z.infer<typeof OutputWebhookOutput>;

// ============================================================================
// OUTPUT STORE
// ============================================================================

export const OutputStoreInput = z.object({
    /** Table to store in */
    table: z.string().default('generated_content'),
    /** Data to store */
    data: z.record(z.string(), z.any()),
    /** Content field name */
    contentField: z.string().default('content'),
    /** Additional metadata */
    metadata: z.record(z.string(), z.any()).optional(),
    /** Tags for categorization */
    tags: z.array(z.string()).optional(),
    /** Create version if exists */
    versioning: z.boolean().default(true),
});

export const OutputStoreOutput = z.object({
    /** Was storage successful */
    success: z.boolean(),
    /** Record ID */
    recordId: z.string(),
    /** Version number (if versioned) */
    version: z.number().optional(),
    /** Storage timestamp */
    storedAt: z.string(),
    /** Table stored to */
    table: z.string(),
});

export type OutputStoreInputType = z.infer<typeof OutputStoreInput>;
export type OutputStoreOutputType = z.infer<typeof OutputStoreOutput>;

// ============================================================================
// OUTPUT EMAIL
// ============================================================================

export const OutputEmailInput = z.object({
    /** Recipient email */
    to: z.string().email(),
    /** From email (optional, uses default) */
    from: z.string().email().optional(),
    /** Subject line */
    subject: z.string(),
    /** HTML body */
    bodyHtml: z.string(),
    /** Plain text body */
    bodyText: z.string().optional(),
    /** Reply-to address */
    replyTo: z.string().email().optional(),
    /** CC recipients */
    cc: z.array(z.string().email()).optional(),
    /** BCC recipients */
    bcc: z.array(z.string().email()).optional(),
    /** Schedule for later */
    scheduledFor: z.string().optional(),
    /** Track opens/clicks */
    tracking: z.boolean().default(true),
});

export const OutputEmailOutput = z.object({
    /** Was email sent */
    success: z.boolean(),
    /** Email provider message ID */
    messageId: z.string().optional(),
    /** Sent timestamp */
    sentAt: z.string(),
    /** Provider used */
    provider: z.string(),
    /** Tracking enabled */
    trackingEnabled: z.boolean(),
});

export type OutputEmailInputType = z.infer<typeof OutputEmailInput>;
export type OutputEmailOutputType = z.infer<typeof OutputEmailOutput>;

// ============================================================================
// OUTPUT ANALYTICS
// ============================================================================

export const OutputAnalyticsInput = z.object({
    /** Event type */
    eventType: z.string(),
    /** Event data */
    eventData: z.record(z.string(), z.any()),
    /** Associated entity type */
    entityType: z.string().optional(),
    /** Associated entity ID */
    entityId: z.string().optional(),
    /** User ID if applicable */
    userId: z.string().optional(),
    /** Org ID */
    orgId: z.string().optional(),
});

export const OutputAnalyticsOutput = z.object({
    /** Was event logged */
    success: z.boolean(),
    /** Event ID */
    eventId: z.string(),
    /** Logged timestamp */
    loggedAt: z.string(),
});

export type OutputAnalyticsInputType = z.infer<typeof OutputAnalyticsInput>;
export type OutputAnalyticsOutputType = z.infer<typeof OutputAnalyticsOutput>;

// ============================================================================
// OUTPUT EXPORT
// ============================================================================

export const OutputExportInput = z.object({
    /** Content to export */
    content: z.string(),
    /** Export format */
    format: z.enum(['json', 'markdown', 'html', 'pdf', 'docx', 'csv']),
    /** Filename */
    filename: z.string(),
    /** Include styling (for HTML/PDF) */
    includeStyling: z.boolean().default(true),
    /** Custom styles */
    customStyles: z.string().optional(),
    /** Metadata to include */
    metadata: z.record(z.string(), z.any()).optional(),
});

export const OutputExportOutput = z.object({
    /** Was export successful */
    success: z.boolean(),
    /** File URL (if stored) */
    fileUrl: z.string().optional(),
    /** File size in bytes */
    fileSize: z.number(),
    /** Format exported */
    format: z.string(),
    /** Filename */
    filename: z.string(),
    /** Export timestamp */
    exportedAt: z.string(),
});

export type OutputExportInputType = z.infer<typeof OutputExportInput>;
export type OutputExportOutputType = z.infer<typeof OutputExportOutput>;

// ============================================================================
// OUTPUT SCHEDULE
// ============================================================================

export const OutputScheduleInput = z.object({
    /** Type of scheduled action */
    actionType: z.enum(['webhook', 'email', 'workflow']),
    /** When to execute */
    executeAt: z.string(),
    /** Action configuration */
    actionConfig: z.record(z.string(), z.any()),
    /** Notification on completion */
    notifyOnComplete: z.boolean().default(false),
    /** Notification email */
    notificationEmail: z.string().email().optional(),
});

export const OutputScheduleOutput = z.object({
    /** Was scheduling successful */
    success: z.boolean(),
    /** Scheduled job ID */
    jobId: z.string(),
    /** Scheduled execution time */
    scheduledFor: z.string(),
    /** Action type */
    actionType: z.string(),
    /** Created timestamp */
    createdAt: z.string(),
});

export type OutputScheduleInputType = z.infer<typeof OutputScheduleInput>;
export type OutputScheduleOutputType = z.infer<typeof OutputScheduleOutput>;
