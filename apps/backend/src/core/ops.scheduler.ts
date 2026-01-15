import cron from "node-cron";
import { runDailyOptimization } from "./learning.loop";

/**
 * Document 07-Ops: Schedule implementation using node-cron
 * Runs daily at 06:00 AM
 */
export function startDailyCron(): void {
    // Cron expression for 6 AM daily: "0 6 * * *"
    cron.schedule("0 6 * * *", async () => {
        console.log("🕕 Starting Scheduled Daily Ops Run...");
        try {
            await runDailyOptimization();
            console.log("✅ Daily Ops Run Completed Successfully");
        } catch (error) {
            console.error("❌ Daily Ops Run Failed:", error);
        }
    });

    console.log("⏰ Daily Cron Scheduler initialized (06:00 AM)");
}
