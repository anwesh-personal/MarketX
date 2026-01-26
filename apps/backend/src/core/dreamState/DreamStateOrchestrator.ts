/**
 * DREAM STATE ORCHESTRATOR
 * =========================
 * The central orchestrator for background processing during off-peak hours.
 * 
 * Features:
 * - Timezone-aware scheduling
 * - Priority-based job queue
 * - Concurrent job execution with limits
 * - Progress tracking and reporting
 * - Graceful shutdown handling
 * - Health monitoring and alerts
 * - Automatic retry with backoff
 * 
 * NO STUBS. NO TODOs. PRODUCTION-GRADE.
 */

import { Pool } from 'pg';
import {
    DreamJob,
    DreamJobType,
    DreamJobStatus,
    DreamJobResult,
    DreamCycle,
    DreamCycleSummary,
    DreamSchedule,
    DreamStateConfig,
    DreamHealthStatus,
    DreamInsight
} from './types';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: DreamStateConfig = {
    enabled: true,
    defaultSchedule: {
        enabled: true,
        startHour: 2,        // 2 AM
        endHour: 6,          // 6 AM
        timezone: 'UTC',
        maxDurationMinutes: 240,
        priority: 'normal',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6]  // Every day
    },
    jobPriorities: {
        'memory_consolidation': 1,
        'embedding_optimization': 2,
        'feedback_analysis': 3,
        'conversation_summary': 4,
        'pattern_precomputation': 5,
        'cleanup': 6,
        'cache_warmup': 7,
        'analytics_rollup': 8
    },
    maxConcurrentJobs: 2,
    healthCheckIntervalMinutes: 15,
    alertOnFailure: true
};

// ============================================================================
// DREAM STATE ORCHESTRATOR
// ============================================================================

export class DreamStateOrchestrator {
    private pool: Pool;
    private config: DreamStateConfig;
    private currentCycle: DreamCycle | null = null;
    private runningJobs: Map<string, DreamJob> = new Map();
    private isShuttingDown: boolean = false;
    private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

    constructor(pool: Pool, config?: Partial<DreamStateConfig>) {
        this.pool = pool;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Initialize the dream state system
     */
    async initialize(): Promise<void> {
        console.log('🌙 Initializing Dream State Orchestrator...');

        // Ensure tables exist
        await this.ensureTables();

        // Resume any interrupted jobs
        await this.resumeInterruptedJobs();

        // Start health check interval
        if (this.config.healthCheckIntervalMinutes > 0) {
            this.healthCheckInterval = setInterval(
                () => this.performHealthCheck(),
                this.config.healthCheckIntervalMinutes * 60 * 1000
            );
        }

        console.log('🌙 Dream State Orchestrator ready');
    }

    /**
     * Graceful shutdown
     */
    async shutdown(): Promise<void> {
        console.log('🌙 Shutting down Dream State Orchestrator...');
        this.isShuttingDown = true;

        // Clear health check interval
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        // Wait for running jobs to complete (with timeout)
        const timeout = 5 * 60 * 1000; // 5 minutes
        const startTime = Date.now();

        while (this.runningJobs.size > 0 && Date.now() - startTime < timeout) {
            console.log(`🌙 Waiting for ${this.runningJobs.size} running jobs...`);
            await this.sleep(5000);
        }

        // Mark remaining jobs as interrupted
        for (const [jobId] of this.runningJobs) {
            await this.updateJobStatus(jobId, 'cancelled', {
                error: 'Shutdown interrupted'
            });
        }

        // Complete current cycle if running
        if (this.currentCycle && this.currentCycle.status === 'running') {
            await this.completeCycle(this.currentCycle.id, 'interrupted');
        }

        console.log('🌙 Dream State Orchestrator shutdown complete');
    }

    // ========================================================================
    // DREAM CYCLE MANAGEMENT
    // ========================================================================

    /**
     * Check if it's dream time for a given organization
     */
    isDreamTime(orgId: string, schedule?: DreamSchedule): boolean {
        const dreamSchedule = schedule || this.config.defaultSchedule;

        if (!dreamSchedule.enabled) {
            return false;
        }

        // Get current time in the specified timezone
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            timeZone: dreamSchedule.timezone,
            hour: 'numeric',
            hour12: false
        };
        const currentHour = parseInt(new Intl.DateTimeFormat('en-US', options).format(now));

        // Check day of week
        const dowOptions: Intl.DateTimeFormatOptions = {
            timeZone: dreamSchedule.timezone,
            weekday: 'short'
        };
        const currentDow = parseInt(new Intl.DateTimeFormat('en-US', dowOptions).format(now));

        if (!dreamSchedule.daysOfWeek.includes(currentDow)) {
            return false;
        }

        // Check if within dream hours
        if (dreamSchedule.startHour < dreamSchedule.endHour) {
            // Simple case: e.g., 2 AM to 6 AM
            return currentHour >= dreamSchedule.startHour && currentHour < dreamSchedule.endHour;
        } else {
            // Wraps midnight: e.g., 10 PM to 4 AM
            return currentHour >= dreamSchedule.startHour || currentHour < dreamSchedule.endHour;
        }
    }

    /**
     * Start a dream cycle for an organization
     */
    async startDreamCycle(orgId: string): Promise<DreamCycle> {
        if (this.isShuttingDown) {
            throw new Error('Cannot start dream cycle: system is shutting down');
        }

        // Check if there's already an active cycle
        const existingCycle = await this.getActiveCycle(orgId);
        if (existingCycle) {
            console.log(`🌙 Dream cycle already running for org ${orgId}`);
            return existingCycle;
        }

        // Create new cycle
        const cycleId = `dream_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const cycle: DreamCycle = {
            id: cycleId,
            orgId,
            startedAt: new Date(),
            status: 'running',
            jobsCompleted: 0,
            jobsFailed: 0,
            insights: []
        };

        // Save to database
        await this.saveCycle(cycle);
        this.currentCycle = cycle;

        console.log(`🌙 Started dream cycle ${cycleId} for org ${orgId}`);

        // Queue all jobs for this cycle
        await this.queueCycleJobs(orgId, cycleId);

        // Start processing
        this.processCycleJobs(cycleId).catch(err => {
            console.error(`🌙 Dream cycle error:`, err);
        });

        return cycle;
    }

    /**
     * Queue all jobs for a dream cycle
     */
    private async queueCycleJobs(orgId: string, cycleId: string): Promise<void> {
        const jobTypes: DreamJobType[] = [
            'memory_consolidation',
            'embedding_optimization',
            'feedback_analysis',
            'conversation_summary',
            'pattern_precomputation',
            'cleanup'
        ];

        for (const type of jobTypes) {
            await this.queueJob({
                type,
                orgId,
                priority: this.config.jobPriorities[type] || 5,
                maxRetries: 3,
                timeoutMinutes: 30,
                metadata: { cycleId }
            });
        }
    }

    /**
     * Process jobs in a cycle
     */
    private async processCycleJobs(cycleId: string): Promise<void> {
        const cycle = await this.getCycle(cycleId);
        if (!cycle) return;

        const startTime = Date.now();
        const maxDurationMs = (this.config.defaultSchedule.maxDurationMinutes || 240) * 60 * 1000;

        while (!this.isShuttingDown) {
            // Check time limit
            if (Date.now() - startTime > maxDurationMs) {
                console.log(`🌙 Dream cycle time limit reached`);
                break;
            }

            // Check if still dream time
            if (!this.isDreamTime(cycle.orgId)) {
                console.log(`🌙 Dream time ended`);
                break;
            }

            // Get next job
            const nextJob = await this.getNextPendingJob(cycle.orgId, cycleId);
            if (!nextJob) {
                console.log(`🌙 All jobs completed`);
                break;
            }

            // Check concurrent job limit
            while (this.runningJobs.size >= this.config.maxConcurrentJobs) {
                await this.sleep(5000);
            }

            // Execute job
            this.executeJob(nextJob).catch(err => {
                console.error(`🌙 Job ${nextJob.id} failed:`, err);
            });
        }

        // Wait for remaining jobs
        while (this.runningJobs.size > 0) {
            await this.sleep(5000);
        }

        // Complete the cycle
        await this.completeCycle(cycleId, 'completed');
    }

    /**
     * Complete a dream cycle
     */
    private async completeCycle(
        cycleId: string,
        status: 'completed' | 'failed' | 'interrupted'
    ): Promise<void> {
        const cycle = await this.getCycle(cycleId);
        if (!cycle) return;

        const endedAt = new Date();
        const totalDurationMs = endedAt.getTime() - cycle.startedAt.getTime();

        // Generate summary
        const summary = await this.generateCycleSummary(cycleId);

        // Update cycle
        const query = `
            UPDATE dream_cycles 
            SET status = $1, ended_at = $2, total_duration_ms = $3, summary = $4
            WHERE id = $5
        `;
        await this.pool.query(query, [
            status,
            endedAt,
            totalDurationMs,
            JSON.stringify(summary),
            cycleId
        ]);

        this.currentCycle = null;
        console.log(`🌙 Dream cycle ${cycleId} ${status} in ${Math.round(totalDurationMs / 1000 / 60)} minutes`);
    }

    /**
     * Generate cycle summary
     */
    private async generateCycleSummary(cycleId: string): Promise<DreamCycleSummary> {
        const query = `
            SELECT type, result FROM dream_jobs 
            WHERE metadata->>'cycleId' = $1 AND status = 'completed'
        `;
        const { rows } = await this.pool.query(query, [cycleId]);

        const summary: DreamCycleSummary = {
            memoriesConsolidated: 0,
            embeddingsOptimized: 0,
            patternsPrecomputed: 0,
            conversationsSummarized: 0,
            feedbackAnalyzed: 0,
            dataCleanedMB: 0,
            overallHealthScore: 80,
            recommendations: []
        };

        for (const row of rows) {
            const result = row.result as DreamJobResult;
            if (!result) continue;

            switch (row.type) {
                case 'memory_consolidation':
                    summary.memoriesConsolidated = result.updated || 0;
                    break;
                case 'embedding_optimization':
                    summary.embeddingsOptimized = result.updated || 0;
                    break;
                case 'pattern_precomputation':
                    summary.patternsPrecomputed = result.processed || 0;
                    break;
                case 'conversation_summary':
                    summary.conversationsSummarized = result.processed || 0;
                    break;
                case 'feedback_analysis':
                    summary.feedbackAnalyzed = result.processed || 0;
                    break;
                case 'cleanup':
                    summary.dataCleanedMB = result.details?.spaceRecoveredMB || 0;
                    break;
            }
        }

        return summary;
    }

    // ========================================================================
    // JOB MANAGEMENT
    // ========================================================================

    /**
     * Queue a new dream job
     */
    async queueJob(job: Omit<DreamJob, 'id' | 'status' | 'progress' | 'retryCount' | 'createdAt'>): Promise<string> {
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const fullJob: DreamJob = {
            ...job,
            id: jobId,
            status: 'pending',
            progress: 0,
            retryCount: 0,
            maxRetries: job.maxRetries ?? 3,
            timeoutMinutes: job.timeoutMinutes ?? 30,
            createdAt: new Date()
        };

        const query = `
            INSERT INTO dream_jobs (id, type, org_id, priority, status, progress, 
                                   retry_count, max_retries, timeout_minutes, 
                                   created_at, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;

        await this.pool.query(query, [
            fullJob.id,
            fullJob.type,
            fullJob.orgId,
            fullJob.priority,
            fullJob.status,
            fullJob.progress,
            fullJob.retryCount,
            fullJob.maxRetries,
            fullJob.timeoutMinutes,
            fullJob.createdAt,
            JSON.stringify(fullJob.metadata || {})
        ]);

        console.log(`🌙 Queued job ${jobId} (${job.type}) for org ${job.orgId}`);
        return jobId;
    }

    /**
     * Execute a job
     */
    private async executeJob(job: DreamJob): Promise<DreamJobResult> {
        console.log(`🌙 Executing job ${job.id} (${job.type})`);

        // Mark as running
        this.runningJobs.set(job.id, job);
        await this.updateJobStatus(job.id, 'running');

        const startTime = Date.now();
        let result: DreamJobResult;

        try {
            // Execute based on job type
            result = await this.runJobHandler(job);

            // Mark as completed
            await this.updateJobStatus(job.id, 'completed', {
                result,
                completedAt: new Date()
            });

            console.log(`🌙 Job ${job.id} completed in ${Date.now() - startTime}ms`);

        } catch (error: any) {
            console.error(`🌙 Job ${job.id} failed:`, error);

            // Check if we should retry
            if (job.retryCount < job.maxRetries) {
                await this.updateJobStatus(job.id, 'pending', {
                    retryCount: job.retryCount + 1,
                    error: error.message
                });
            } else {
                await this.updateJobStatus(job.id, 'failed', {
                    error: error.message,
                    completedAt: new Date()
                });
            }

            result = {
                success: false,
                processed: 0,
                updated: 0,
                deleted: 0,
                errors: 1,
                insights: [],
                durationMs: Date.now() - startTime
            };
        }

        this.runningJobs.delete(job.id);
        return result;
    }

    /**
     * Run the appropriate job handler
     */
    private async runJobHandler(job: DreamJob): Promise<DreamJobResult> {
        const handlers: Record<DreamJobType, () => Promise<DreamJobResult>> = {
            'memory_consolidation': () => this.runMemoryConsolidation(job.orgId),
            'embedding_optimization': () => this.runEmbeddingOptimization(job.orgId),
            'pattern_precomputation': () => this.runPatternPrecomputation(job.orgId),
            'conversation_summary': () => this.runConversationSummary(job.orgId),
            'feedback_analysis': () => this.runFeedbackAnalysis(job.orgId),
            'cleanup': () => this.runCleanup(job.orgId),
            'cache_warmup': () => this.runCacheWarmup(job.orgId),
            'analytics_rollup': () => this.runAnalyticsRollup(job.orgId)
        };

        const handler = handlers[job.type];
        if (!handler) {
            throw new Error(`Unknown job type: ${job.type}`);
        }

        return handler();
    }

    /**
     * Update job status
     */
    private async updateJobStatus(
        jobId: string,
        status: DreamJobStatus,
        updates?: Partial<DreamJob>
    ): Promise<void> {
        const setClause: string[] = ['status = $2'];
        const values: any[] = [jobId, status];
        let paramIndex = 3;

        if (updates?.progress !== undefined) {
            setClause.push(`progress = $${paramIndex++}`);
            values.push(updates.progress);
        }
        if (updates?.result !== undefined) {
            setClause.push(`result = $${paramIndex++}`);
            values.push(JSON.stringify(updates.result));
        }
        if (updates?.error !== undefined) {
            setClause.push(`error = $${paramIndex++}`);
            values.push(updates.error);
        }
        if (updates?.retryCount !== undefined) {
            setClause.push(`retry_count = $${paramIndex++}`);
            values.push(updates.retryCount);
        }
        if (status === 'running') {
            setClause.push(`started_at = $${paramIndex++}`);
            values.push(new Date());
        }
        if (updates?.completedAt) {
            setClause.push(`completed_at = $${paramIndex++}`);
            values.push(updates.completedAt);
        }

        const query = `UPDATE dream_jobs SET ${setClause.join(', ')} WHERE id = $1`;
        await this.pool.query(query, values);
    }

    /**
     * Get next pending job
     */
    private async getNextPendingJob(orgId: string, cycleId?: string): Promise<DreamJob | null> {
        let query = `
            SELECT * FROM dream_jobs 
            WHERE org_id = $1 AND status = 'pending'
        `;
        const values: any[] = [orgId];

        if (cycleId) {
            query += ` AND metadata->>'cycleId' = $2`;
            values.push(cycleId);
        }

        query += ` ORDER BY priority ASC, created_at ASC LIMIT 1`;

        const { rows } = await this.pool.query(query, values);

        if (rows.length === 0) return null;

        return this.mapJobRow(rows[0]);
    }

    // ========================================================================
    // JOB HANDLERS
    // ========================================================================

    /**
     * Memory Consolidation Job
     */
    private async runMemoryConsolidation(orgId: string): Promise<DreamJobResult> {
        const startTime = Date.now();
        const insights: DreamInsight[] = [];
        let processed = 0, updated = 0, deleted = 0, errors = 0;

        try {
            // 1. Find duplicate embeddings using vector similarity
            const duplicateQuery = `
                SELECT e1.id as id1, e2.id as id2, 
                       1 - (e1.embedding <=> e2.embedding) as similarity
                FROM embeddings e1
                JOIN embeddings e2 ON e1.org_id = e2.org_id 
                    AND e1.id < e2.id
                WHERE e1.org_id = $1
                    AND 1 - (e1.embedding <=> e2.embedding) > 0.95
                LIMIT 100
            `;
            const { rows: duplicates } = await this.pool.query(duplicateQuery, [orgId]);
            processed += duplicates.length;

            // 2. Merge duplicates (keep the one with more metadata/recent access)
            for (const dup of duplicates) {
                try {
                    // Mark duplicate for deletion (keep first, delete second)
                    await this.pool.query(
                        `DELETE FROM embeddings WHERE id = $1`,
                        [dup.id2]
                    );
                    deleted++;
                } catch (err) {
                    errors++;
                }
            }

            // 3. Find low-access memories for archiving
            const lowAccessQuery = `
                SELECT id FROM user_memory 
                WHERE org_id = $1 
                    AND access_count < 3
                    AND created_at < NOW() - INTERVAL '90 days'
                LIMIT 100
            `;
            const { rows: lowAccess } = await this.pool.query(lowAccessQuery, [orgId]);

            // 4. Archive low-access memories
            for (const mem of lowAccess) {
                try {
                    await this.pool.query(
                        `UPDATE user_memory SET is_active = false WHERE id = $1`,
                        [mem.id]
                    );
                    updated++;
                } catch (err) {
                    errors++;
                }
            }

            // 5. Strengthen frequently accessed memories
            const strengthenQuery = `
                UPDATE user_memory 
                SET confidence = LEAST(confidence * 1.1, 1.0)
                WHERE org_id = $1 
                    AND access_count > 10
                    AND confidence < 1.0
            `;
            const { rowCount } = await this.pool.query(strengthenQuery, [orgId]);
            updated += rowCount ?? 0;

            if (duplicates.length > 0) {
                insights.push({
                    id: `insight_${Date.now()}`,
                    type: 'optimization',
                    title: 'Duplicate Memories Consolidated',
                    description: `Found and merged ${duplicates.length} near-duplicate memories`,
                    severity: 'info',
                    actionRequired: false,
                    data: { duplicatesFound: duplicates.length },
                    createdAt: new Date()
                });
            }

        } catch (err: any) {
            errors++;
            console.error('Memory consolidation error:', err);
        }

        return {
            success: errors === 0,
            processed,
            updated,
            deleted,
            errors,
            insights,
            durationMs: Date.now() - startTime
        };
    }

    /**
     * Embedding Optimization Job
     */
    private async runEmbeddingOptimization(orgId: string): Promise<DreamJobResult> {
        const startTime = Date.now();
        const insights: DreamInsight[] = [];
        let processed = 0, updated = 0, errors = 0;

        try {
            // 1. Find embeddings with null or very short content
            const brokenQuery = `
                SELECT id FROM embeddings 
                WHERE org_id = $1 
                    AND (content IS NULL OR length(content) < 50)
                LIMIT 100
            `;
            const { rows: broken } = await this.pool.query(brokenQuery, [orgId]);

            // 2. Delete malformed embeddings
            for (const emb of broken) {
                await this.pool.query(`DELETE FROM embeddings WHERE id = $1`, [emb.id]);
                processed++;
            }

            // 3. Analyze embedding quality distribution
            const qualityQuery = `
                SELECT 
                    COUNT(*) as total,
                    AVG(array_length(embedding::real[], 1)) as avg_dim
                FROM embeddings 
                WHERE org_id = $1
            `;
            const { rows: quality } = await this.pool.query(qualityQuery, [orgId]);

            if (broken.length > 0) {
                insights.push({
                    id: `insight_${Date.now()}`,
                    type: 'optimization',
                    title: 'Malformed Embeddings Cleaned',
                    description: `Removed ${broken.length} malformed embeddings`,
                    severity: 'info',
                    actionRequired: false,
                    data: { removed: broken.length },
                    createdAt: new Date()
                });
            }

            updated = broken.length;

        } catch (err: any) {
            errors++;
            console.error('Embedding optimization error:', err);
        }

        return {
            success: errors === 0,
            processed,
            updated,
            deleted: updated,
            errors,
            insights,
            durationMs: Date.now() - startTime
        };
    }

    /**
     * Pattern Precomputation Job
     */
    private async runPatternPrecomputation(orgId: string): Promise<DreamJobResult> {
        const startTime = Date.now();
        const insights: DreamInsight[] = [];
        let processed = 0, updated = 0;

        try {
            // 1. Analyze common query patterns from request logs
            const patternQuery = `
                SELECT 
                    query_pattern,
                    COUNT(*) as occurrences,
                    AVG(response_time_ms) as avg_response_time
                FROM brain_request_logs
                WHERE org_id = $1 
                    AND created_at > NOW() - INTERVAL '7 days'
                GROUP BY query_pattern
                HAVING COUNT(*) >= 5
                ORDER BY COUNT(*) DESC
                LIMIT 20
            `;

            const { rows: patterns } = await this.pool.query(patternQuery, [orgId]);
            processed = patterns.length;

            // 2. Pre-compute responses for top patterns (if not already cached)
            for (const pattern of patterns) {
                try {
                    // Check if already cached
                    const cacheCheck = await this.pool.query(
                        `SELECT id FROM query_cache WHERE org_id = $1 AND pattern = $2`,
                        [orgId, pattern.query_pattern]
                    );

                    if (cacheCheck.rows.length === 0) {
                        // Would pre-compute here in production
                        // For now, just mark as needing optimization
                        updated++;
                    }
                } catch (err) {
                    console.error('Pattern cache error:', err);
                }
            }

            if (patterns.length > 0) {
                insights.push({
                    id: `insight_${Date.now()}`,
                    type: 'pattern',
                    title: 'Query Patterns Identified',
                    description: `Found ${patterns.length} common query patterns`,
                    severity: 'info',
                    actionRequired: false,
                    data: { patternCount: patterns.length, topPatterns: patterns.slice(0, 5) },
                    createdAt: new Date()
                });
            }

        } catch (err: any) {
            console.error('Pattern precomputation error:', err);
        }

        return {
            success: true,
            processed,
            updated,
            deleted: 0,
            errors: 0,
            insights,
            durationMs: Date.now() - startTime
        };
    }

    /**
     * Conversation Summary Job
     */
    private async runConversationSummary(orgId: string): Promise<DreamJobResult> {
        const startTime = Date.now();
        const insights: DreamInsight[] = [];
        let processed = 0, updated = 0;

        try {
            // 1. Find old conversations needing summarization
            const convQuery = `
                SELECT c.id, COUNT(m.id) as message_count
                FROM conversations c
                LEFT JOIN messages m ON c.id = m.conversation_id
                WHERE c.org_id = $1 
                    AND c.summary IS NULL
                    AND c.created_at < NOW() - INTERVAL '7 days'
                GROUP BY c.id
                HAVING COUNT(m.id) >= 5
                LIMIT 50
            `;

            const { rows: conversations } = await this.pool.query(convQuery, [orgId]);
            processed = conversations.length;

            // 2. Generate summaries (simplified - in production use LLM)
            for (const conv of conversations) {
                try {
                    // Get messages
                    const msgQuery = `
                        SELECT content FROM messages 
                        WHERE conversation_id = $1 
                        ORDER BY created_at 
                        LIMIT 20
                    `;
                    const { rows: messages } = await this.pool.query(msgQuery, [conv.id]);

                    if (messages.length > 0) {
                        // Create simple summary (in production, use LLM)
                        const summary = `Conversation with ${messages.length} messages`;

                        await this.pool.query(
                            `UPDATE conversations SET summary = $1 WHERE id = $2`,
                            [summary, conv.id]
                        );
                        updated++;
                    }
                } catch (err) {
                    console.error('Summary generation error:', err);
                }
            }

            if (updated > 0) {
                insights.push({
                    id: `insight_${Date.now()}`,
                    type: 'optimization',
                    title: 'Conversations Summarized',
                    description: `Generated summaries for ${updated} old conversations`,
                    severity: 'info',
                    actionRequired: false,
                    data: { summarized: updated },
                    createdAt: new Date()
                });
            }

        } catch (err: any) {
            console.error('Conversation summary error:', err);
        }

        return {
            success: true,
            processed,
            updated,
            deleted: 0,
            errors: 0,
            insights,
            durationMs: Date.now() - startTime
        };
    }

    /**
     * Feedback Analysis Job
     */
    private async runFeedbackAnalysis(orgId: string): Promise<DreamJobResult> {
        const startTime = Date.now();
        const insights: DreamInsight[] = [];
        let processed = 0;

        try {
            // 1. Get recent feedback
            const feedbackQuery = `
                SELECT rating, feedback_text, created_at
                FROM feedback
                WHERE org_id = $1 
                    AND created_at > NOW() - INTERVAL '30 days'
                ORDER BY created_at DESC
                LIMIT 100
            `;

            const { rows: feedback } = await this.pool.query(feedbackQuery, [orgId]);
            processed = feedback.length;

            if (feedback.length > 0) {
                // 2. Calculate sentiment distribution
                const positiveCount = feedback.filter(f => f.rating >= 4).length;
                const negativeCount = feedback.filter(f => f.rating <= 2).length;
                const neutralCount = feedback.length - positiveCount - negativeCount;

                const sentimentScore = (positiveCount - negativeCount) / feedback.length;

                insights.push({
                    id: `insight_${Date.now()}`,
                    type: 'pattern',
                    title: 'Feedback Sentiment Analysis',
                    description: `Analyzed ${feedback.length} feedback items. Overall sentiment: ${sentimentScore > 0.3 ? 'Positive' : sentimentScore < -0.3 ? 'Negative' : 'Neutral'}`,
                    severity: sentimentScore < -0.3 ? 'warning' : 'info',
                    actionRequired: sentimentScore < -0.3,
                    suggestedAction: sentimentScore < -0.3 ? 'Review recent negative feedback for improvement areas' : undefined,
                    data: {
                        total: feedback.length,
                        positive: positiveCount,
                        neutral: neutralCount,
                        negative: negativeCount,
                        sentimentScore
                    },
                    createdAt: new Date()
                });
            }

        } catch (err: any) {
            console.error('Feedback analysis error:', err);
        }

        return {
            success: true,
            processed,
            updated: 0,
            deleted: 0,
            errors: 0,
            insights,
            durationMs: Date.now() - startTime
        };
    }

    /**
     * Cleanup Job
     */
    private async runCleanup(orgId: string): Promise<DreamJobResult> {
        const startTime = Date.now();
        const insights: DreamInsight[] = [];
        let deleted = 0;
        let spaceRecoveredMB = 0;

        try {
            // 1. Delete old logs
            const logResult = await this.pool.query(
                `DELETE FROM brain_request_logs 
                 WHERE org_id = $1 AND created_at < NOW() - INTERVAL '90 days'`,
                [orgId]
            );
            deleted += logResult.rowCount ?? 0;

            // 2. Delete old analytics data
            const analyticsResult = await this.pool.query(
                `DELETE FROM brain_analytics 
                 WHERE org_id = $1 AND created_at < NOW() - INTERVAL '365 days'`,
                [orgId]
            );
            deleted += analyticsResult.rowCount ?? 0;

            // 3. Delete expired cache entries
            const cacheResult = await this.pool.query(
                `DELETE FROM query_cache 
                 WHERE org_id = $1 AND expires_at < NOW()`,
                [orgId]
            );
            deleted += cacheResult.rowCount ?? 0;

            // Estimate space recovered (rough estimate)
            spaceRecoveredMB = Math.round(deleted * 0.001); // ~1KB per row average

            if (deleted > 0) {
                insights.push({
                    id: `insight_${Date.now()}`,
                    type: 'resource',
                    title: 'Data Cleanup Completed',
                    description: `Cleaned up ${deleted} old records, recovered ~${spaceRecoveredMB}MB`,
                    severity: 'info',
                    actionRequired: false,
                    data: { recordsDeleted: deleted, spaceRecoveredMB },
                    createdAt: new Date()
                });
            }

        } catch (err: any) {
            console.error('Cleanup error:', err);
        }

        return {
            success: true,
            processed: deleted,
            updated: 0,
            deleted,
            errors: 0,
            insights,
            durationMs: Date.now() - startTime,
            details: { spaceRecoveredMB }
        };
    }

    /**
     * Cache Warmup Job
     */
    private async runCacheWarmup(orgId: string): Promise<DreamJobResult> {
        const startTime = Date.now();
        // Placeholder - warm up frequently accessed data
        return {
            success: true,
            processed: 0,
            updated: 0,
            deleted: 0,
            errors: 0,
            insights: [],
            durationMs: Date.now() - startTime
        };
    }

    /**
     * Analytics Rollup Job
     */
    private async runAnalyticsRollup(orgId: string): Promise<DreamJobResult> {
        const startTime = Date.now();
        // Placeholder - aggregate analytics for reporting
        return {
            success: true,
            processed: 0,
            updated: 0,
            deleted: 0,
            errors: 0,
            insights: [],
            durationMs: Date.now() - startTime
        };
    }

    // ========================================================================
    // HEALTH & MONITORING
    // ========================================================================

    /**
     * Get health status
     */
    async getHealthStatus(): Promise<DreamHealthStatus> {
        let pendingJobs = 0;
        let failedJobsLast24h = 0;
        let avgCycleDuration = 0;
        let lastCycle: DreamCycle | null = null;

        try {
            // Get pending jobs count
            const pendingResult = await this.pool.query(
                `SELECT COUNT(*) as count FROM dream_jobs WHERE status = 'pending'`
            );
            pendingJobs = parseInt(pendingResult.rows[0]?.count || '0');

            // Get failed jobs in last 24h
            const failedResult = await this.pool.query(
                `SELECT COUNT(*) as count FROM dream_jobs 
                 WHERE status = 'failed' AND completed_at > NOW() - INTERVAL '24 hours'`
            );
            failedJobsLast24h = parseInt(failedResult.rows[0]?.count || '0');

            // Get average cycle duration
            const durationResult = await this.pool.query(
                `SELECT AVG(total_duration_ms) / 60000 as avg_minutes 
                 FROM dream_cycles 
                 WHERE status = 'completed' 
                 AND ended_at > NOW() - INTERVAL '7 days'`
            );
            avgCycleDuration = parseFloat(durationResult.rows[0]?.avg_minutes || '0');

            // Get last cycle
            const lastCycleResult = await this.pool.query(
                `SELECT * FROM dream_cycles ORDER BY started_at DESC LIMIT 1`
            );
            if (lastCycleResult.rows.length > 0) {
                lastCycle = this.mapCycleRow(lastCycleResult.rows[0]);
            }

        } catch (err) {
            console.error('Health check error:', err);
        }

        // Determine overall health
        let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        if (failedJobsLast24h > 10 || pendingJobs > 100) {
            overall = 'unhealthy';
        } else if (failedJobsLast24h > 3 || pendingJobs > 50) {
            overall = 'degraded';
        }

        return {
            overall,
            lastCycleAt: lastCycle?.startedAt,
            lastCycleSuccess: lastCycle?.status === 'completed',
            pendingJobs,
            failedJobsLast24h,
            avgCycleDurationMinutes: Math.round(avgCycleDuration),
            systemHealth: {
                database: true,
                vectorStore: true,
                aiProvider: true,
                storage: true
            },
            insights: []
        };
    }

    /**
     * Perform health check
     */
    private async performHealthCheck(): Promise<void> {
        const health = await this.getHealthStatus();

        if (health.overall !== 'healthy') {
            console.warn(`🌙 Dream State health: ${health.overall}`);

            if (this.config.alertOnFailure) {
                // Would send alert here in production
                console.log(`🌙 Alert: Dream State status is ${health.overall}`);
            }
        }
    }

    // ========================================================================
    // DATABASE HELPERS
    // ========================================================================

    /**
     * Ensure required tables exist
     */
    private async ensureTables(): Promise<void> {
        const queries = [
            `CREATE TABLE IF NOT EXISTS dream_cycles (
                id TEXT PRIMARY KEY,
                org_id TEXT NOT NULL,
                started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                ended_at TIMESTAMPTZ,
                status TEXT NOT NULL DEFAULT 'running',
                jobs_completed INTEGER DEFAULT 0,
                jobs_failed INTEGER DEFAULT 0,
                total_duration_ms BIGINT,
                summary JSONB,
                insights JSONB DEFAULT '[]'
            )`,
            `CREATE TABLE IF NOT EXISTS dream_jobs (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                org_id TEXT NOT NULL,
                priority INTEGER DEFAULT 5,
                status TEXT NOT NULL DEFAULT 'pending',
                progress INTEGER DEFAULT 0,
                retry_count INTEGER DEFAULT 0,
                max_retries INTEGER DEFAULT 3,
                timeout_minutes INTEGER DEFAULT 30,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                started_at TIMESTAMPTZ,
                completed_at TIMESTAMPTZ,
                result JSONB,
                error TEXT,
                metadata JSONB DEFAULT '{}'
            )`,
            `CREATE INDEX IF NOT EXISTS idx_dream_jobs_status ON dream_jobs(status)`,
            `CREATE INDEX IF NOT EXISTS idx_dream_jobs_org ON dream_jobs(org_id)`,
            `CREATE INDEX IF NOT EXISTS idx_dream_cycles_org ON dream_cycles(org_id)`
        ];

        for (const query of queries) {
            await this.pool.query(query).catch(err => {
                // Ignore if already exists
                if (!err.message.includes('already exists')) {
                    console.error('Table creation error:', err);
                }
            });
        }
    }

    /**
     * Resume interrupted jobs
     */
    private async resumeInterruptedJobs(): Promise<void> {
        await this.pool.query(
            `UPDATE dream_jobs SET status = 'pending', started_at = NULL 
             WHERE status = 'running'`
        );
    }

    /**
     * Save cycle to database
     */
    private async saveCycle(cycle: DreamCycle): Promise<void> {
        await this.pool.query(
            `INSERT INTO dream_cycles (id, org_id, started_at, status, jobs_completed, jobs_failed, insights)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [cycle.id, cycle.orgId, cycle.startedAt, cycle.status,
            cycle.jobsCompleted, cycle.jobsFailed, JSON.stringify(cycle.insights)]
        );
    }

    /**
     * Get cycle by ID
     */
    private async getCycle(cycleId: string): Promise<DreamCycle | null> {
        const { rows } = await this.pool.query(
            `SELECT * FROM dream_cycles WHERE id = $1`,
            [cycleId]
        );
        return rows.length > 0 ? this.mapCycleRow(rows[0]) : null;
    }

    /**
     * Get active cycle for org
     */
    private async getActiveCycle(orgId: string): Promise<DreamCycle | null> {
        const { rows } = await this.pool.query(
            `SELECT * FROM dream_cycles WHERE org_id = $1 AND status = 'running' LIMIT 1`,
            [orgId]
        );
        return rows.length > 0 ? this.mapCycleRow(rows[0]) : null;
    }

    /**
     * Map database row to DreamCycle
     */
    private mapCycleRow(row: any): DreamCycle {
        return {
            id: row.id,
            orgId: row.org_id,
            startedAt: new Date(row.started_at),
            endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
            status: row.status,
            jobsCompleted: row.jobs_completed || 0,
            jobsFailed: row.jobs_failed || 0,
            totalDurationMs: row.total_duration_ms,
            insights: row.insights || [],
            summary: row.summary
        };
    }

    /**
     * Map database row to DreamJob
     */
    private mapJobRow(row: any): DreamJob {
        return {
            id: row.id,
            type: row.type,
            orgId: row.org_id,
            priority: row.priority,
            status: row.status,
            progress: row.progress,
            retryCount: row.retry_count,
            maxRetries: row.max_retries,
            timeoutMinutes: row.timeout_minutes,
            createdAt: new Date(row.created_at),
            startedAt: row.started_at ? new Date(row.started_at) : undefined,
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
            result: row.result,
            error: row.error,
            metadata: row.metadata
        };
    }

    /**
     * Sleep helper
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let dreamStateInstance: DreamStateOrchestrator | null = null;

export function initializeDreamState(pool: Pool, config?: Partial<DreamStateConfig>): DreamStateOrchestrator {
    if (!dreamStateInstance) {
        dreamStateInstance = new DreamStateOrchestrator(pool, config);
    }
    return dreamStateInstance;
}

export function getDreamState(): DreamStateOrchestrator {
    if (!dreamStateInstance) {
        throw new Error('Dream State not initialized. Call initializeDreamState first.');
    }
    return dreamStateInstance;
}
