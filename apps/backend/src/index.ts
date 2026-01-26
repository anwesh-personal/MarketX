import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { startDailyCron, recordActivity } from "./core/ops.scheduler";
import { router } from "./routes/api";
import superadminRouter from "./routes/superadmin";
import superadminAuthRouter from "./routes/auth-superadmin";
import enginesRouter from "./routes/engines";
import apiKeysRouter from "./routes/apiKeys";
import { executionService, initializeEngineService, apiKeyService } from "./services";
import { initializeDreamState, getDreamState } from "./core/dreamState";
import { initializeSelfHealing, getSelfHealing } from "./core/selfHealing";
import { initializeFineTuning, getFineTuning } from "./core/fineTuning";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors()); // Allow frontend access

// Track activity on every request (resets idle timer)
app.use((req, res, next) => {
    // Don't count health checks as activity
    if (req.path !== '/health' && !req.path.includes('/brain/status')) {
        recordActivity();
    }
    next();
});

// Database connection
const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Initialize services
async function initializeServices() {
    try {
        // Core engine services
        initializeEngineService(dbPool);
        await executionService.initialize(dbPool);
        apiKeyService.initialize(dbPool);

        // Brain system - Dream State (background optimization)
        const dreamState = initializeDreamState(dbPool);
        await dreamState.initialize();
        console.log("🌙 Dream State initialized");

        // Brain system - Self-Healing (error recovery)
        const selfHealing = initializeSelfHealing(dbPool);
        await selfHealing.initialize();
        console.log("🔧 Self-Healing initialized");

        // Brain system - Fine-Tuning Pipeline
        const fineTuning = initializeFineTuning(dbPool);
        await fineTuning.initialize();
        console.log("🎯 Fine-Tuning Pipeline initialized");

        console.log("✅ All services initialized");
    } catch (error) {
        console.error("❌ Failed to initialize services:", error);
    }
}

// Graceful shutdown
async function gracefulShutdown() {
    console.log("\n🛑 Shutting down gracefully...");

    try {
        // Shutdown Dream State
        const dreamState = getDreamState();
        await dreamState.shutdown();

        // Shutdown Self-Healing
        const selfHealing = getSelfHealing();
        await selfHealing.shutdown();

        // Shutdown Fine-Tuning Pipeline
        const fineTuning = getFineTuning();
        await fineTuning.shutdown();

        // Close database pool
        await dbPool.end();

        console.log("✅ Graceful shutdown complete");
        process.exit(0);
    } catch (error) {
        console.error("❌ Shutdown error:", error);
        process.exit(1);
    }
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// API Routes
app.use("/api", router);
app.use("/api/superadmin", superadminRouter);
app.use("/api/superadmin/auth", superadminAuthRouter);
app.use("/api/engines", enginesRouter);
app.use("/api/keys", apiKeysRouter);

// Health check
app.get("/health", async (req, res) => {
    try {
        const dreamHealth = await getDreamState().getHealthStatus();
        const selfHealingHealth = getSelfHealing().getServiceHealthStatus();

        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            activeExecutions: executionService.getActiveCount(),
            dreamState: {
                status: dreamHealth.overall,
                lastCycle: dreamHealth.lastCycleAt,
                pendingJobs: dreamHealth.pendingJobs
            },
            selfHealing: {
                services: selfHealingHealth.size,
                circuitsOpen: Array.from(selfHealingHealth.values())
                    .filter(s => s.circuitState === 'open').length
            }
        });
    } catch (error) {
        // Fallback health response if systems not initialized
        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            activeExecutions: executionService.getActiveCount()
        });
    }
});

// 07-Ops: Schedule the 6:00 AM Daily Run
startDailyCron();

// Start server
app.listen(8080, async () => {
    console.log("🚀 Axiom Engine API running on port 8080");
    console.log("📍 API Routes: http://localhost:8080/api");
    console.log("🔐 Superadmin: http://localhost:8080/api/superadmin");
    console.log("🔑 Auth: http://localhost:8080/api/superadmin/auth");
    console.log("⚙️  Engines: http://localhost:8080/api/engines");
    console.log("🔐 API Keys: http://localhost:8080/api/keys");

    await initializeServices();
});
