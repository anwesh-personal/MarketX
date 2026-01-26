import { Router } from "express";
import { executeRun } from "../core/writer.engine";
import { db } from "../db";
import { WriterInputSchema } from "../schemas/writer.input";
import { KnowledgeBaseSchema } from "../schemas/kb.schema";
import { v4 as uuidv4 } from "uuid";

export const router = Router();

/**
 * GET /api/stats - Dashboard Charts
 */
router.get("/stats", async (req, res) => {
    try {
        const stats = await db.query(`
      SELECT 
        DATE(occurred_at) as date,
        event_type,
        COUNT(*) as count
      FROM analytics_events
      WHERE occurred_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(occurred_at), event_type
      ORDER BY date DESC
    `);

        res.json(stats.rows);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * GET /api/kb/active - Get Active Knowledge Base
 */
router.get("/kb/active", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT id, version, stage, data, created_at FROM knowledge_bases WHERE is_active = true LIMIT 1"
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No active Knowledge Base found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * POST /api/kb/upload - Upload and Validate KB
 */
router.post("/kb/upload", async (req, res) => {
    try {
        // Validate against Zod schema
        const validatedKB = KnowledgeBaseSchema.parse(req.body.data);

        // Deactivate current KB
        await db.query("UPDATE knowledge_bases SET is_active = false");

        // Insert new KB
        const result = await db.query(
            `INSERT INTO knowledge_bases (version, stage, data, is_active) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
            [req.body.version || "1.0.0", "pre-embeddings", validatedKB, true]
        );

        res.json({
            success: true,
            kb_id: result.rows[0].id,
            message: "Knowledge Base uploaded and activated"
        });
    } catch (error) {
        res.status(400).json({
            error: "Validation failed",
            details: (error as Error).message
        });
    }
});

/**
 * POST /api/run/manual - Force Trigger (Document 07-Ops Override)
 */
router.post("/run/manual", async (req, res) => {
    try {
        // Fetch active KB
        const kbResult = await db.query(
            "SELECT data FROM knowledge_bases WHERE is_active = true LIMIT 1"
        );

        if (kbResult.rows.length === 0) {
            return res.status(404).json({ error: "No active Knowledge Base found" });
        }

        const kb = KnowledgeBaseSchema.parse(kbResult.rows[0].data);

        // Validate input
        const input = WriterInputSchema.parse(req.body.input || {
            run_type: "ON_DEMAND",
            icp: { icp_id: "default_icp" },
            offer: { offer_id: "default_offer" },
            generation_requests: {
                website: {
                    page_types: ["LANDING"]
                }
            }
        });

        // Create run record
        const runId = uuidv4();
        await db.query(
            `INSERT INTO runs (id, run_type, input_snapshot, status) 
       VALUES ($1, $2, $3, $4)`,
            [runId, input.run_type, input, "PENDING"]
        );

        // Execute
        const result = await executeRun(input, kb);

        // Update run record
        await db.query(
            `UPDATE runs 
       SET output_snapshot = $1, status = $2, completed_at = NOW() 
       WHERE id = $3`,
            [result, "COMPLETED", runId]
        );

        res.json({
            success: true,
            run_id: runId,
            output: result
        });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * GET /api/runs - List Recent Runs
 */
router.get("/runs", async (req, res) => {
    try {
        const result = await db.query(`
      SELECT id, run_type, status, started_at, completed_at
      FROM runs
      ORDER BY started_at DESC
      LIMIT 50
    `);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * GET /api/analytics/variants - Variant Performance
 */
router.get("/analytics/variants", async (req, res) => {
    try {
        const result = await db.query(`
      SELECT 
        variant_id,
        COUNT(*) FILTER (WHERE event_type = 'BOOKED_CALL') as booked_calls,
        COUNT(*) FILTER (WHERE event_type = 'REPLY') as replies,
        COUNT(*) FILTER (WHERE event_type = 'CLICK') as clicks,
        COUNT(*) FILTER (WHERE event_type = 'BOUNCE') as bounces,
        MAX(occurred_at) as last_event
      FROM analytics_events
      GROUP BY variant_id
      ORDER BY booked_calls DESC
    `);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * POST /api/analytics/event - Track Analytics Event
 */
router.post("/analytics/event", async (req, res) => {
    try {
        const { run_id, variant_id, event_type, payload } = req.body;

        await db.query(
            `INSERT INTO analytics_events (run_id, variant_id, event_type, payload) 
       VALUES ($1, $2, $3, $4)`,
            [run_id, variant_id, event_type, payload || {}]
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

// ============================================================
// BRAIN SYSTEM ROUTES
// ============================================================

import { getDreamState } from "../core/dreamState";
import { getSelfHealing } from "../core/selfHealing";
import { getSchedulerStatus, triggerDreamStateNow } from "../core/ops.scheduler";

/**
 * GET /api/brain/status - Get Brain System Status
 */
router.get("/brain/status", async (req, res) => {
    try {
        const dreamState = getDreamState();
        const selfHealing = getSelfHealing();
        const scheduler = getSchedulerStatus();

        const dreamHealth = await dreamState.getHealthStatus();
        const healingServices = selfHealing.getServiceHealthStatus();

        res.json({
            brain: {
                status: "operational",
                timestamp: new Date().toISOString()
            },
            dreamState: {
                overall: dreamHealth.overall,
                lastCycleAt: dreamHealth.lastCycleAt,
                pendingJobs: dreamHealth.pendingJobs,
                failedJobsLast24h: dreamHealth.failedJobsLast24h,
                avgCycleDurationMinutes: dreamHealth.avgCycleDurationMinutes
            },
            selfHealing: {
                servicesMonitored: healingServices.size,
                circuitsOpen: Array.from(healingServices.values())
                    .filter(s => s.circuitState === 'open').length,
                overallHealth: Array.from(healingServices.values())
                    .every(s => s.status === 'healthy') ? 'healthy' : 'degraded'
            },
            scheduler: scheduler
        });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * POST /api/brain/dream/trigger - Manually trigger Dream State
 */
router.post("/brain/dream/trigger", async (req, res) => {
    try {
        const { orgId } = req.body;

        await triggerDreamStateNow(orgId);

        res.json({
            success: true,
            message: `Dream State triggered${orgId ? ` for org ${orgId}` : ' for all organizations'}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * GET /api/brain/dream/cycles - Get recent Dream Cycles
 */
router.get("/brain/dream/cycles", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, org_id, started_at, ended_at, status, 
                   jobs_completed, jobs_failed, total_duration_ms
            FROM dream_cycles
            ORDER BY started_at DESC
            LIMIT 20
        `);

        res.json({ cycles: result.rows });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * GET /api/brain/dream/jobs - Get Dream Jobs
 */
router.get("/brain/dream/jobs", async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT id, type, org_id, priority, status, progress, 
                   retry_count, created_at, started_at, completed_at
            FROM dream_jobs
        `;
        const params: string[] = [];

        if (status) {
            query += ` WHERE status = $1`;
            params.push(status as string);
        }

        query += ` ORDER BY created_at DESC LIMIT 50`;

        const result = await db.query(query, params);
        res.json({ jobs: result.rows });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * GET /api/brain/healing/patterns - Get Error Patterns
 */
router.get("/brain/healing/patterns", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, fingerprint, category, occurrences, 
                   first_seen, last_seen, successful_recoveries, 
                   failed_recoveries, best_recovery_action, is_resolved
            FROM error_patterns
            ORDER BY last_seen DESC
            LIMIT 50
        `);

        res.json({ patterns: result.rows });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * GET /api/brain/analytics - Get Brain Analytics Summary
 */
router.get("/brain/analytics", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                day_bucket,
                SUM(total_requests) as total_requests,
                SUM(successful_requests) as successful_requests,
                SUM(total_tokens) as total_tokens,
                AVG(avg_response_time_ms) as avg_response_time,
                AVG(avg_user_rating) as avg_rating
            FROM brain_analytics
            WHERE day_bucket >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY day_bucket
            ORDER BY day_bucket DESC
        `);

        res.json({ analytics: result.rows });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

// ============================================================
// CONVERSATION → BRAIN ROUTES
// Push conversations to specific brains for learning
// ============================================================

/**
 * GET /api/brain/templates - Get available brain templates
 */
router.get("/brain/templates", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, name, version, description, pricing_tier, is_default, is_active
            FROM brain_templates
            WHERE is_active = true
            ORDER BY is_default DESC, name
        `);

        res.json({ brains: result.rows });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * POST /api/conversations/:id/push-to-brain - Push conversation to a brain
 */
router.post("/conversations/:id/push-to-brain", async (req, res) => {
    try {
        const conversationId = req.params.id;
        const { brainTemplateId, userId } = req.body;

        if (!brainTemplateId) {
            return res.status(400).json({ error: 'brainTemplateId is required' });
        }

        // Use the database function
        const result = await db.query(
            `SELECT push_conversation_to_brain($1, $2, $3) as result`,
            [conversationId, brainTemplateId, userId || null]
        );

        const pushResult = result.rows[0]?.result;

        if (!pushResult?.success) {
            return res.status(400).json({ error: pushResult?.error || 'Failed to push' });
        }

        res.json({
            success: true,
            message: `Conversation pushed to brain. Learning will happen during next idle cycle.`,
            ...pushResult
        });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * GET /api/brain/:brainId/conversations - Get conversations pushed to a brain
 */
router.get("/brain/:brainId/conversations", async (req, res) => {
    try {
        const brainId = req.params.brainId;
        const limit = parseInt(req.query.limit as string) || 50;

        const result = await db.query(
            `SELECT * FROM get_brain_conversations($1, $2)`,
            [brainId, limit]
        );

        res.json({ conversations: result.rows });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * GET /api/brain/:brainId/learning-history - Get learning history for a brain
 */
router.get("/brain/:brainId/learning-history", async (req, res) => {
    try {
        const brainId = req.params.brainId;

        const result = await db.query(`
            SELECT 
                cbh.*,
                c.title as conversation_title,
                c.total_messages,
                u.email as pushed_by_email
            FROM conversation_brain_history cbh
            JOIN conversations c ON cbh.conversation_id = c.id
            LEFT JOIN users u ON cbh.pushed_by = u.id
            WHERE cbh.brain_template_id = $1
            ORDER BY cbh.pushed_at DESC
            LIMIT 50
        `, [brainId]);

        res.json({ history: result.rows });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

// ============================================================
// WORKER TRIGGER ENDPOINTS
// External systems (MailWiz, etc.) call these to queue jobs
// ============================================================

import { queueService } from '../services/queue/queueService';

/**
 * POST /api/workers/dream-state - Queue Dream State job
 */
router.post("/workers/dream-state", async (req, res) => {
    try {
        const { type, orgId, config } = req.body;

        if (!type || !orgId) {
            return res.status(400).json({ error: 'type and orgId are required' });
        }

        const validTypes = ['memory_consolidation', 'embedding_optimization', 'conversation_summary',
            'feedback_analysis', 'pattern_precomputation', 'cleanup', 'full_cycle'];

        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: `Invalid type. Valid: ${validTypes.join(', ')}` });
        }

        const job = await queueService.dreamState.add(`dream-${type}`, {
            type,
            orgId,
            config
        });

        res.json({
            success: true,
            jobId: job.id,
            message: `Dream State job queued: ${type}`,
            queue: 'dream-state'
        });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * POST /api/workers/fine-tuning - Queue Fine-Tuning job
 */
router.post("/workers/fine-tuning", async (req, res) => {
    try {
        const { type, orgId, brainTemplateId, provider, config } = req.body;

        if (!type || !orgId) {
            return res.status(400).json({ error: 'type and orgId are required' });
        }

        const validTypes = ['collect', 'format', 'submit', 'monitor', 'deploy', 'full_pipeline'];

        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: `Invalid type. Valid: ${validTypes.join(', ')}` });
        }

        const job = await queueService.fineTuning.add(`finetune-${type}`, {
            type,
            orgId,
            brainTemplateId,
            provider: provider || 'openai',
            config
        });

        res.json({
            success: true,
            jobId: job.id,
            message: `Fine-Tuning job queued: ${type}`,
            queue: 'fine-tuning'
        });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * POST /api/workers/learning-loop - Queue Learning Loop job
 */
router.post("/workers/learning-loop", async (req, res) => {
    try {
        const { type, orgId, config } = req.body;

        const validTypes = ['analyze', 'promote', 'demote', 'update_kb', 'full_loop'];
        const jobType = type || 'full_loop';

        if (!validTypes.includes(jobType)) {
            return res.status(400).json({ error: `Invalid type. Valid: ${validTypes.join(', ')}` });
        }

        const job = await queueService.learningLoop.add(`learning-${jobType}`, {
            type: jobType,
            orgId,
            config
        });

        res.json({
            success: true,
            jobId: job.id,
            message: `Learning Loop job queued: ${jobType}`,
            queue: 'learning-loop'
        });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

/**
 * GET /api/workers/status - Get worker queue status
 */
router.get("/workers/status", async (req, res) => {
    try {
        const [dreamStats, finetuneStats, learningStats] = await Promise.all([
            queueService.dreamState.getJobCounts(),
            queueService.fineTuning.getJobCounts(),
            queueService.learningLoop.getJobCounts(),
        ]);

        res.json({
            queues: {
                dreamState: dreamStats,
                fineTuning: finetuneStats,
                learningLoop: learningStats
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});
