import cron from "node-cron";
import { runDailyOptimization } from "./learning.loop";
import { getDreamState } from "./dreamState";
import { Pool } from "pg";

/**
 * AXIOM OPERATIONS SCHEDULER
 * ==========================
 * 
 * TWO SEPARATE SYSTEMS:
 * 1. BRAIN (Chat) - Conversations, Memory, RAG
 * 2. ENGINES (Content) - Writer, Workflows, Runs
 * 
 * This scheduler handles:
 * - Idle-based Dream State (2 hours inactivity → learns)
 * - 6 AM EST Daily Learning Loop (Engine optimization)
 * - Health Checks
 * 
 * NO STUBS. SHE LEARNS WHEN IDLE.
 */

let isInitialized = false;
let lastActivityTimestamp = Date.now();
let idleCheckInterval: ReturnType<typeof setInterval> | null = null;
let isDreamStateRunning = false;

const IDLE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const IDLE_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

/**
 * Record activity - call this when user interacts with the system
 * Should be called from:
 * - Chat message received
 * - Engine run started
 * - Any user action
 */
export function recordActivity(): void {
    lastActivityTimestamp = Date.now();
    // If Dream State was triggered by idle, it will naturally complete
    // We don't interrupt it - let it finish its cycle
}

/**
 * Check if system is idle (2+ hours of no activity)
 */
function isSystemIdle(): boolean {
    const idleTimeMs = Date.now() - lastActivityTimestamp;
    return idleTimeMs >= IDLE_THRESHOLD_MS;
}

/**
 * Get idle time in minutes
 */
export function getIdleTimeMinutes(): number {
    return Math.floor((Date.now() - lastActivityTimestamp) / 1000 / 60);
}

/**
 * Start all schedulers
 */
export function startDailyCron(): void {
    if (isInitialized) {
        console.log("⏰ Cron Scheduler already running");
        return;
    }

    // ====================================================================
    // 1. IDLE-BASED DREAM STATE TRIGGER
    // Checks every 5 minutes if system has been idle for 2+ hours
    // When idle, starts learning: memory consolidation, embeddings, etc.
    // ====================================================================
    idleCheckInterval = setInterval(async () => {
        if (isDreamStateRunning) {
            return; // Already running
        }

        if (isSystemIdle()) {
            console.log(`🌙 System idle for ${getIdleTimeMinutes()} min - starting Dream State...`);
            isDreamStateRunning = true;

            try {
                const dreamState = getDreamState();
                const pool = new Pool({ connectionString: process.env.DATABASE_URL });

                const { rows: orgs } = await pool.query(
                    `SELECT id FROM organizations WHERE status = 'active' LIMIT 10`
                );
                await pool.end();

                for (const org of orgs) {
                    console.log(`🌙 Starting Dream Cycle for org ${org.id}...`);
                    await dreamState.startDreamCycle(org.id);
                }

                console.log(`🌙 Dream State cycle completed`);
            } catch (error) {
                console.error("❌ Idle Dream State failed:", error);
            } finally {
                isDreamStateRunning = false;
            }
        }
    }, IDLE_CHECK_INTERVAL_MS);

    // ====================================================================
    // 2. DAILY LEARNING LOOP - 6:00 AM EST (11:00 UTC)
    // Document 07-Ops: Analyzes analytics, promotes winners, demotes losers
    // This is for ENGINE optimization, not Chat
    // Cron: "0 11 * * *" = 11:00 UTC = 6:00 AM EST
    // ====================================================================
    cron.schedule("0 11 * * *", async () => {
        console.log("🕕 [6 AM EST] Starting Daily Learning Loop (Engines)...");
        try {
            await runDailyOptimization();
            console.log("✅ [6 AM EST] Daily Learning Loop completed");
        } catch (error) {
            console.error("❌ [6 AM EST] Daily Learning Loop failed:", error);
        }
    });

    // ====================================================================
    // 3. MEMORY CLEANUP - 3:00 AM EST (8:00 UTC)
    // Cleans up expired caches and old data
    // ====================================================================
    cron.schedule("0 8 * * *", async () => {
        console.log("🧹 [3 AM EST] Starting memory cleanup...");
        try {
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });

            await pool.query(`DELETE FROM response_cache WHERE expires_at < NOW()`);
            await pool.query(`DELETE FROM query_cache WHERE expires_at < NOW()`);
            await pool.query(`
                DELETE FROM retry_queue 
                WHERE status IN ('completed', 'failed') 
                AND created_at < NOW() - INTERVAL '7 days'
            `);

            await pool.end();
            console.log("✅ [3 AM EST] Memory cleanup completed");
        } catch (error) {
            console.error("❌ [3 AM EST] Memory cleanup failed:", error);
        }
    });

    // ====================================================================
    // 4. HEALTH CHECK - Every 15 minutes
    // Monitors system health
    // ====================================================================
    cron.schedule("*/15 * * * *", async () => {
        try {
            const dreamState = getDreamState();
            const health = await dreamState.getHealthStatus();

            if (health.overall !== 'healthy' || health.failedJobsLast24h > 0) {
                console.log(`⚠️ System Health: ${health.overall}`);
                if (health.failedJobsLast24h > 0) {
                    console.log(`   Failed Jobs (24h): ${health.failedJobsLast24h}`);
                }
            }
        } catch {
            // Silent fail
        }
    });

    isInitialized = true;
    console.log("⏰ Axiom Scheduler initialized:");
    console.log("   🌙 Dream State: Triggers after 2 hours idle");
    console.log("   📊 Learning Loop: 6:00 AM EST (Engine optimization)");
    console.log("   🧹 Cleanup: 3:00 AM EST");
    console.log("   🔍 Health Check: Every 15 minutes");
}

/**
 * Force trigger Dream State (for testing or manual trigger)
 */
export async function triggerDreamStateNow(orgId?: string): Promise<void> {
    console.log("🌙 Manual Dream State trigger...");
    isDreamStateRunning = true;

    try {
        const dreamState = getDreamState();

        if (orgId) {
            await dreamState.startDreamCycle(orgId);
        } else {
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            const { rows: orgs } = await pool.query(
                `SELECT id FROM organizations WHERE status = 'active' LIMIT 10`
            );
            await pool.end();

            for (const org of orgs) {
                await dreamState.startDreamCycle(org.id);
            }
        }
    } finally {
        isDreamStateRunning = false;
    }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
    isRunning: boolean;
    idleTimeMinutes: number;
    idleThresholdMinutes: number;
    isDreamStateActive: boolean;
    nextRuns: Record<string, string>;
} {
    return {
        isRunning: isInitialized,
        idleTimeMinutes: getIdleTimeMinutes(),
        idleThresholdMinutes: IDLE_THRESHOLD_MS / 1000 / 60,
        isDreamStateActive: isDreamStateRunning,
        nextRuns: {
            dreamState: `After ${IDLE_THRESHOLD_MS / 1000 / 60} min idle (currently ${getIdleTimeMinutes()} min)`,
            dailyLearning: "6:00 AM EST (11:00 UTC)",
            cleanup: "3:00 AM EST (8:00 UTC)",
            healthCheck: "Every 15 minutes"
        }
    };
}

/**
 * Shutdown scheduler
 */
export function shutdownScheduler(): void {
    if (idleCheckInterval) {
        clearInterval(idleCheckInterval);
        idleCheckInterval = null;
    }
    isInitialized = false;
    console.log("⏰ Scheduler shutdown");
}
