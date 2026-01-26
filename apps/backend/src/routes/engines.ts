/**
 * AXIOM ENGINE API ROUTES
 * RESTful API for engine management and execution
 */

import { Router, Request, Response } from 'express';
import {
    engineDeploymentService,
    executionService,
    workflowExecutionService
} from '../services';
import { optionalApiKeyMiddleware } from '../middleware/apiKeyAuth';

const router = Router();

// ============================================================================
// ENGINE CRUD ROUTES
// ============================================================================

/**
 * GET /api/engines
 * List all engines (with optional filters)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { orgId, status, activeOnly } = req.query;

        const engines = await engineDeploymentService.getEngines({
            orgId: orgId as string,
            status: status as string,
            activeOnly: activeOnly === 'true'
        });

        res.json({ engines });
    } catch (error: any) {
        console.error('Error fetching engines:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/engines/stats
 * Get engine statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const stats = await engineDeploymentService.getEngineStats(days);
        res.json(stats);
    } catch (error: any) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/engines/:id
 * Get a specific engine
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const engine = await engineDeploymentService.getEngine(req.params.id);

        if (!engine) {
            return res.status(404).json({ error: 'Engine not found' });
        }

        res.json(engine);
    } catch (error: any) {
        console.error('Error fetching engine:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/engines/:id/stats
 * Get statistics for a specific engine
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
    try {
        const engineId = req.params.id;
        const days = parseInt(req.query.days as string) || 30;

        const stats = await engineDeploymentService.getEngineSingleStats(engineId, days);

        if (!stats) {
            return res.status(404).json({ error: 'Engine not found' });
        }

        res.json(stats);
    } catch (error: any) {
        console.error('Error fetching engine stats:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/engines/deploy
 * Deploy a new engine from a workflow template
 */
router.post('/deploy', async (req: Request, res: Response) => {
    try {
        const {
            name,
            description,
            templateId,
            orgId,
            kbId,
            constitutionId,
            flowConfig,
            executionMode,
            tier,
            config
        } = req.body;

        if (!name || !templateId) {
            return res.status(400).json({
                error: 'Missing required fields: name, templateId'
            });
        }

        if (!flowConfig || !flowConfig.nodes || !flowConfig.edges) {
            return res.status(400).json({
                error: 'Missing flowConfig with nodes and edges'
            });
        }

        const engine = await engineDeploymentService.deployEngine({
            name,
            description,
            templateId,
            orgId,
            kbId,
            constitutionId,
            flowConfig,
            executionMode: executionMode || 'sync',
            tier: tier || 'hobby',
            status: 'disabled', // Start disabled, activate explicitly
            config
        });

        res.status(201).json({
            success: true,
            message: 'Engine deployed successfully',
            engine
        });
    } catch (error: any) {
        console.error('Error deploying engine:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/engines/:id
 * Update an engine
 */
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const updates = req.body;
        const engine = await engineDeploymentService.updateEngine(req.params.id, updates);

        if (!engine) {
            return res.status(404).json({ error: 'Engine not found' });
        }

        res.json({ success: true, engine });
    } catch (error: any) {
        console.error('Error updating engine:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/engines/:id
 * Delete an engine
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const deleted = await engineDeploymentService.deleteEngine(req.params.id);

        if (!deleted) {
            return res.status(404).json({ error: 'Engine not found' });
        }

        res.json({ success: true, message: 'Engine deleted' });
    } catch (error: any) {
        console.error('Error deleting engine:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/engines/:id/duplicate
 * Duplicate an engine
 */
router.post('/:id/duplicate', async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        const engine = await engineDeploymentService.duplicateEngine(req.params.id, name);

        if (!engine) {
            return res.status(404).json({ error: 'Original engine not found' });
        }

        res.status(201).json({ success: true, engine });
    } catch (error: any) {
        console.error('Error duplicating engine:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/engines/:id/activate
 * Activate an engine
 */
router.post('/:id/activate', async (req: Request, res: Response) => {
    try {
        const engine = await engineDeploymentService.updateEngine(req.params.id, {
            status: 'active'
        });

        if (!engine) {
            return res.status(404).json({ error: 'Engine not found' });
        }

        res.json({ success: true, message: 'Engine activated', engine });
    } catch (error: any) {
        console.error('Error activating engine:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/engines/:id/deactivate
 * Deactivate an engine
 */
router.post('/:id/deactivate', async (req: Request, res: Response) => {
    try {
        const engine = await engineDeploymentService.updateEngine(req.params.id, {
            status: 'disabled'
        });

        if (!engine) {
            return res.status(404).json({ error: 'Engine not found' });
        }

        res.json({ success: true, message: 'Engine deactivated', engine });
    } catch (error: any) {
        console.error('Error deactivating engine:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ENGINE EXECUTION ROUTES
// ============================================================================

/**
 * POST /api/engines/:id/execute
 * Execute an engine
 * Supports both API key auth (X-API-Key header) and direct userId
 */
router.post('/:id/execute', optionalApiKeyMiddleware, async (req: Request, res: Response) => {
    try {
        const engineId = req.params.id;
        const { input, userId: bodyUserId, orgId: bodyOrgId, options } = req.body;

        // Use API key auth if available, otherwise use body params
        const userId = req.apiKeyAuth?.userId || bodyUserId;
        const orgId = req.apiKeyAuth?.orgId || bodyOrgId;

        if (!userId) {
            return res.status(400).json({
                error: 'userId is required',
                message: 'Provide userId in body or use API key authentication'
            });
        }

        // If using API key, verify it matches the engine being executed
        if (req.apiKeyAuth && req.apiKeyAuth.engineId !== engineId) {
            return res.status(403).json({
                error: 'API key not authorized for this engine',
                message: `This API key is for engine ${req.apiKeyAuth.engineId}`
            });
        }

        const result = await executionService.executeEngine({
            engineId,
            userId,
            orgId,
            input: input || {},
            options
        });

        // For queued executions, return immediately
        if (result.status === 'queued') {
            return res.status(202).json({
                success: true,
                message: 'Execution queued',
                executionId: result.executionId,
                jobId: result.jobId
            });
        }

        // For completed executions
        if (result.status === 'completed') {
            return res.json({
                success: true,
                executionId: result.executionId,
                output: result.result?.lastNodeOutput?.content,
                tokenUsage: result.result?.tokenUsage,
                durationMs: result.result?.durationMs
            });
        }

        // For failed executions
        return res.status(500).json({
            success: false,
            executionId: result.executionId,
            error: result.error
        });

    } catch (error: any) {
        console.error('Error executing engine:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/engines/executions/:executionId
 * Get execution status
 */
router.get('/executions/:executionId', async (req: Request, res: Response) => {
    try {
        const status = await executionService.getExecutionStatus(req.params.executionId);

        if (!status) {
            return res.status(404).json({ error: 'Execution not found' });
        }

        res.json(status);
    } catch (error: any) {
        console.error('Error fetching execution:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/engines/executions/:executionId/stop
 * Stop a running execution
 */
router.post('/executions/:executionId/stop', async (req: Request, res: Response) => {
    try {
        executionService.stopExecution(req.params.executionId);
        res.json({ success: true, message: 'Stop signal sent' });
    } catch (error: any) {
        console.error('Error stopping execution:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/engines/active
 * Get list of active executions
 */
router.get('/active', async (req: Request, res: Response) => {
    try {
        const active = executionService.getActiveExecutions();
        res.json({
            count: active.length,
            executions: active
        });
    } catch (error: any) {
        console.error('Error fetching active executions:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// WORKFLOW TEMPLATE EXECUTION
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Lazy-load Supabase client to avoid crash at module import
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
    if (!_supabase) {
        const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
            throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        }
        _supabase = createClient(url, key);
    }
    return _supabase;
}

/**
 * POST /api/engines/workflows/:id/execute
 * Execute a workflow template directly
 */
router.post('/workflows/:id/execute', optionalApiKeyMiddleware, async (req: Request, res: Response) => {
    const workflowId = req.params.id;
    const executionId = `exec-${uuidv4()}`;
    const startTime = Date.now();

    try {
        // Fetch workflow template from Supabase
        const { data: workflow, error: fetchError } = await getSupabase()
            .from('workflow_templates')
            .select('*')
            .eq('id', workflowId)
            .single();

        if (fetchError || !workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        if (workflow.status !== 'active' && workflow.status !== 'draft') {
            return res.status(400).json({ error: 'Workflow is disabled' });
        }

        const nodes = workflow.nodes || [];
        const edges = workflow.edges || [];

        if (nodes.length === 0) {
            return res.status(400).json({ error: 'Workflow has no nodes' });
        }

        // Parse input from request
        const input = req.body.input || {};

        // Create execution context
        const executionContext = {
            executionId,
            userId: (req as any).apiKeyUserId || 'system',
            tier: 'enterprise' as const,
            orgId: (req as any).apiKeyOrgId || undefined,
        };

        // Log execution start
        await getSupabase().from('engine_run_logs').insert({
            execution_id: executionId,
            status: 'running',
            trigger_type: 'api',
            trigger_metadata: {
                workflowId,
                workflowName: workflow.name,
                input,
                triggeredAt: new Date().toISOString(),
            },
        });

        // Execute workflow using the service
        const result = await workflowExecutionService.executeWorkflow(
            nodes,
            edges,
            input,
            executionId,
            null, // No progress callback for HTTP requests
            executionContext,
            {}
        );

        const durationMs = Date.now() - startTime;

        // Update log with result
        await getSupabase()
            .from('engine_run_logs')
            .update({
                status: result.success ? 'completed' : 'failed',
                node_outputs: result.nodeOutputs,
                token_usage: result.tokenUsage,
                error: result.error || null,
                completed_at: new Date().toISOString(),
            })
            .eq('execution_id', executionId);

        res.json({
            success: result.success,
            executionId,
            workflow: {
                id: workflow.id,
                name: workflow.name,
            },
            durationMs,
            nodeOutputs: result.nodeOutputs,
            lastNodeOutput: result.lastNodeOutput,
            tokenUsage: result.tokenUsage,
            error: result.error,
        });

    } catch (error: any) {
        console.error('Error executing workflow:', error);

        // Log failure
        await getSupabase()
            .from('engine_run_logs')
            .update({
                status: 'failed',
                error: error.message,
                completed_at: new Date().toISOString(),
            })
            .eq('execution_id', executionId);

        res.status(500).json({
            success: false,
            executionId,
            error: error.message
        });
    }
});

export default router;
