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
