/**
 * AXIOM TRIGGER SERVICE
 * 
 * Manages workflow triggers - the entry points that START workflow executions.
 * 
 * Trigger Types:
 * - Webhook: HTTP endpoint that receives external data
 * - Schedule: Cron-based recurring execution
 * - Email Inbound: MailWiz webhook handler
 * - Manual: API call from frontend
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     TRIGGER FLOW                            │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                              │
 * │  External Event (Webhook/Cron/Email)                        │
 * │         │                                                    │
 * │         ▼                                                    │
 * │  TriggerService.handleTrigger()                             │
 * │         │                                                    │
 * │         ├── Validate trigger config                         │
 * │         ├── Load workflow template                          │
 * │         ├── Prepare input data                              │
 * │         │                                                    │
 * │         ▼                                                    │
 * │  Queue job to 'workflow:execute'                            │
 * │         │                                                    │
 * │         ▼                                                    │
 * │  WorkflowWorker picks up job                                │
 * │         │                                                    │
 * │         ▼                                                    │
 * │  workflowExecutionService.executeWorkflow()                 │
 * │                                                              │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * @author Ghazal (Axiom AI)
 * @date 2026-01-27
 */

import { Queue } from 'bullmq';
import { createHmac } from 'crypto';
import { Express, Request, Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

export interface TriggerConfig {
    triggerId: string;
    triggerType: 'webhook' | 'schedule' | 'email-inbound' | 'manual';
    workflowId: string;
    engineId?: string;
    enabled: boolean;
    config: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface WebhookTriggerConfig {
    path: string;                    // e.g., '/webhook/abc123'
    method: 'GET' | 'POST' | 'PUT';
    authType?: 'none' | 'apiKey' | 'bearer' | 'hmac';
    authSecret?: string;
    inputMapping?: Record<string, string>; // Map incoming fields to workflow input
}

export interface ScheduleTriggerConfig {
    cronExpression: string;          // e.g., '0 9 * * *' (9am daily)
    timezone: string;                // e.g., 'Asia/Kolkata'
    inputData?: Record<string, any>; // Static input for each run
}

export interface EmailTriggerConfig {
    emailAddress: string;            // Monitored email address
    subjectFilter?: string;          // Only trigger for matching subjects
    senderFilter?: string;           // Only trigger for matching senders
    inputMapping?: Record<string, string>;
}

export interface TriggerEvent {
    triggerId: string;
    triggerType: string;
    payload: Record<string, any>;
    metadata: {
        source: string;
        timestamp: string;
        requestId?: string;
        ip?: string;
    };
}

// ============================================================================
// TRIGGER REGISTRY
// ============================================================================

class TriggerRegistry {
    private triggers: Map<string, TriggerConfig> = new Map();
    private webhookPathIndex: Map<string, string> = new Map(); // path -> triggerId

    register(config: TriggerConfig): void {
        this.triggers.set(config.triggerId, config);

        // Index webhook endpoints
        if (config.triggerType === 'webhook') {
            const webhookConfig = config.config as WebhookTriggerConfig;
            if (webhookConfig.path) {
                this.webhookPathIndex.set(webhookConfig.path, config.triggerId);
            }
        }

        console.log(`📝 Registered trigger: ${config.triggerId} (${config.triggerType})`);
    }

    unregister(triggerId: string): void {
        const config = this.triggers.get(triggerId);
        if (config && config.triggerType === 'webhook') {
            const webhookConfig = config.config as WebhookTriggerConfig;
            if (webhookConfig.path) {
                this.webhookPathIndex.delete(webhookConfig.path);
            }
        }
        this.triggers.delete(triggerId);
        console.log(`🗑️ Unregistered trigger: ${triggerId}`);
    }

    get(triggerId: string): TriggerConfig | undefined {
        return this.triggers.get(triggerId);
    }

    getByWebhookPath(path: string): TriggerConfig | undefined {
        const triggerId = this.webhookPathIndex.get(path);
        return triggerId ? this.triggers.get(triggerId) : undefined;
    }

    getAll(): TriggerConfig[] {
        return Array.from(this.triggers.values());
    }

    getEnabled(): TriggerConfig[] {
        return Array.from(this.triggers.values()).filter(t => t.enabled);
    }
}

// ============================================================================
// TRIGGER SERVICE
// ============================================================================

export class TriggerService {
    private registry: TriggerRegistry;
    private workflowQueue: Queue | null = null;
    private router: Router;

    constructor() {
        this.registry = new TriggerRegistry();
        this.router = Router();
        this.setupWebhookRouter();
    }

    /**
     * Initialize with BullMQ queue
     */
    initialize(workflowQueue: Queue): void {
        this.workflowQueue = workflowQueue;
        console.log('🎯 TriggerService initialized with workflow queue');
    }

    /**
     * Get Express router for webhook endpoints
     */
    getRouter(): Router {
        return this.router;
    }

    /**
     * Register a trigger configuration
     */
    registerTrigger(config: TriggerConfig): void {
        this.registry.register(config);

        // If schedule trigger, set up BullMQ repeat
        if (config.triggerType === 'schedule' && config.enabled) {
            this.setupScheduleTrigger(config);
        }
    }

    /**
     * Unregister a trigger
     */
    unregisterTrigger(triggerId: string): void {
        this.registry.unregister(triggerId);
    }

    /**
     * Handle incoming trigger event
     */
    async handleTrigger(event: TriggerEvent): Promise<{ success: boolean; executionId?: string; error?: string }> {
        const trigger = this.registry.get(event.triggerId);

        if (!trigger) {
            return { success: false, error: `Trigger not found: ${event.triggerId}` };
        }

        if (!trigger.enabled) {
            return { success: false, error: `Trigger is disabled: ${event.triggerId}` };
        }

        if (!this.workflowQueue) {
            return { success: false, error: 'Workflow queue not initialized' };
        }

        try {
            // Generate execution ID
            const executionId = uuidv4();

            // Prepare workflow input from trigger payload
            const workflowInput = this.prepareInput(trigger, event.payload);

            // Queue workflow execution job
            await this.workflowQueue.add(
                'execute',
                {
                    executionId,
                    workflowId: trigger.workflowId,
                    engineId: trigger.engineId,
                    input: workflowInput,
                    triggerId: trigger.triggerId,
                    triggerType: trigger.triggerType,
                    triggerMetadata: event.metadata,
                },
                {
                    jobId: executionId,
                    removeOnComplete: 100,
                    removeOnFail: 50,
                }
            );

            console.log(`🚀 Trigger fired: ${trigger.triggerId} → Execution: ${executionId}`);

            return { success: true, executionId };
        } catch (error: any) {
            console.error(`❌ Trigger error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Prepare workflow input from trigger payload and config mapping
     */
    private prepareInput(trigger: TriggerConfig, payload: Record<string, any>): Record<string, any> {
        const config = trigger.config;
        const inputMapping = config.inputMapping || {};

        // Start with the raw payload
        let input: Record<string, any> = { ...payload };

        // Apply input mapping if specified
        if (Object.keys(inputMapping).length > 0) {
            input = {};
            for (const [targetField, sourceField] of Object.entries(inputMapping)) {
                const sourcePath = sourceField as string;
                input[targetField] = this.getNestedValue(payload, sourcePath);
            }
        }

        // Add static input data for schedule triggers
        if (config.inputData) {
            input = { ...config.inputData, ...input };
        }

        // Add trigger metadata
        input._trigger = {
            triggerId: trigger.triggerId,
            triggerType: trigger.triggerType,
            timestamp: new Date().toISOString(),
        };

        return input;
    }

    /**
     * Get nested value from object
     */
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((acc, part) => acc?.[part], obj);
    }

    /**
     * Set up Express router for webhook endpoints
     */
    private setupWebhookRouter(): void {
        // Dynamic webhook handler
        this.router.all('/webhook/:triggerId', async (req: Request, res: Response) => {
            const { triggerId } = req.params;
            const trigger = this.registry.get(triggerId);

            if (!trigger) {
                return res.status(404).json({ error: 'Trigger not found' });
            }

            if (!trigger.enabled) {
                return res.status(403).json({ error: 'Trigger is disabled' });
            }

            if (trigger.triggerType !== 'webhook') {
                return res.status(400).json({ error: 'Not a webhook trigger' });
            }

            const webhookConfig = trigger.config as WebhookTriggerConfig;

            // Validate HTTP method
            if (webhookConfig.method && req.method !== webhookConfig.method) {
                return res.status(405).json({ error: `Method not allowed. Expected: ${webhookConfig.method}` });
            }

            // Validate authentication
            if (!this.validateWebhookAuth(req, webhookConfig)) {
                return res.status(401).json({ error: 'Authentication failed' });
            }

            // Build payload from request
            const payload = {
                body: req.body,
                query: req.query,
                headers: req.headers,
                params: req.params,
            };

            // Handle trigger
            const result = await this.handleTrigger({
                triggerId,
                triggerType: 'webhook',
                payload,
                metadata: {
                    source: 'webhook',
                    timestamp: new Date().toISOString(),
                    requestId: req.headers['x-request-id'] as string,
                    ip: req.ip,
                },
            });

            if (result.success) {
                res.status(202).json({
                    success: true,
                    executionId: result.executionId,
                    message: 'Workflow execution queued',
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error,
                });
            }
        });

        // List registered triggers (admin endpoint)
        this.router.get('/triggers', (req: Request, res: Response) => {
            const triggers = this.registry.getAll().map(t => ({
                triggerId: t.triggerId,
                triggerType: t.triggerType,
                workflowId: t.workflowId,
                enabled: t.enabled,
                createdAt: t.createdAt,
            }));
            res.json({ triggers });
        });

        // Register new trigger
        this.router.post('/triggers', (req: Request, res: Response) => {
            try {
                const config: TriggerConfig = {
                    triggerId: req.body.triggerId || uuidv4(),
                    triggerType: req.body.triggerType,
                    workflowId: req.body.workflowId,
                    engineId: req.body.engineId,
                    enabled: req.body.enabled ?? true,
                    config: req.body.config || {},
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                this.registerTrigger(config);
                res.status(201).json({ success: true, triggerId: config.triggerId });
            } catch (error: any) {
                res.status(400).json({ success: false, error: error.message });
            }
        });

        // Delete trigger
        this.router.delete('/triggers/:triggerId', (req: Request, res: Response) => {
            try {
                const { triggerId } = req.params;
                this.unregisterTrigger(triggerId);
                res.json({ success: true });
            } catch (error: any) {
                res.status(400).json({ success: false, error: error.message });
            }
        });
    }

    /**
     * Validate webhook authentication
     */
    private validateWebhookAuth(req: Request, config: WebhookTriggerConfig): boolean {
        if (!config.authType || config.authType === 'none') {
            return true;
        }

        switch (config.authType) {
            case 'apiKey': {
                const apiKey = req.headers['x-api-key'] || req.query.api_key;
                return apiKey === config.authSecret;
            }

            case 'bearer': {
                const auth = req.headers.authorization;
                if (!auth?.startsWith('Bearer ')) return false;
                const token = auth.slice(7);
                return token === config.authSecret;
            }

            case 'hmac': {
                // HMAC signature validation
                const signature = req.headers['x-signature'] as string;
                if (!signature || !config.authSecret) return false;

                const payload = JSON.stringify(req.body);
                const expectedSignature = createHmac('sha256', config.authSecret)
                    .update(payload)
                    .digest('hex');

                return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
            }

            default:
                return true;
        }
    }

    /**
     * Set up BullMQ repeat for schedule triggers
     */
    private async setupScheduleTrigger(trigger: TriggerConfig): Promise<void> {
        if (!this.workflowQueue) {
            console.warn('⚠️ Cannot set up schedule trigger: queue not initialized');
            return;
        }

        const scheduleConfig = trigger.config as ScheduleTriggerConfig;

        try {
            await this.workflowQueue.add(
                'schedule-trigger',
                {
                    triggerId: trigger.triggerId,
                    workflowId: trigger.workflowId,
                    engineId: trigger.engineId,
                    inputData: scheduleConfig.inputData,
                },
                {
                    repeat: {
                        pattern: scheduleConfig.cronExpression,
                        tz: scheduleConfig.timezone || 'UTC',
                    },
                    jobId: `schedule_${trigger.triggerId}`,
                }
            );

            console.log(`⏰ Schedule trigger set up: ${trigger.triggerId} - ${scheduleConfig.cronExpression}`);
        } catch (error: any) {
            console.error(`❌ Failed to set up schedule trigger: ${error.message}`);
        }
    }

    /**
     * Handle MailWiz email inbound webhook
     */
    async handleEmailInbound(emailData: Record<string, any>): Promise<void> {
        const triggers = this.registry.getEnabled().filter(t => t.triggerType === 'email-inbound');

        for (const trigger of triggers) {
            const config = trigger.config as EmailTriggerConfig;

            // Check if email matches filters
            const sender = emailData.from || emailData.sender;
            const subject = emailData.subject;

            if (config.senderFilter && !sender?.includes(config.senderFilter)) {
                continue;
            }

            if (config.subjectFilter && !subject?.includes(config.subjectFilter)) {
                continue;
            }

            // Fire trigger
            await this.handleTrigger({
                triggerId: trigger.triggerId,
                triggerType: 'email-inbound',
                payload: emailData,
                metadata: {
                    source: 'mailwiz',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }
}

// Export singleton
export const triggerService = new TriggerService();
