import { db } from "../db";
import { PromoteDirective, PauseDirective } from "../schemas/learning.rules";

/**
 * MODULE 2: The Learning Loop
 * Goal: Read Analytics -> Write KB Preferences
 * 
 * Implements Document 05-Learning-Loop policies
 */
export async function runDailyOptimization(): Promise<void> {
    console.log("🧠 Starting Daily Learning Loop...");

    // STEP 1: Define Window (PREVIOUS_CALENDAR_DAY)
    const yesterday = getYesterdayWindow();

    // STEP 2: Aggregate Analytics Data
    const stats = await aggregateAnalytics(yesterday.start, yesterday.end);

    // STEP 3: Apply Policies
    const promotions: PromoteDirective[] = [];
    const pauses: PauseDirective[] = [];

    for (const variant of stats) {
        // WINNER POLICY: Primary Outcome = BOOKED_CALL
        if (variant.booked_calls > 0) {
            promotions.push({
                variant_id: variant.variant_id,
                preference_type: "PREFER_ANGLE",
                reason: `Booked ${variant.booked_calls} calls on ${yesterday.start}`,
            });
        }

        // LOSER POLICY: High Bounce Rate
        if (variant.bounce_rate > 0.15) {
            pauses.push({
                variant_id: variant.variant_id,
                pattern: variant.variant_id,
                reason: `Bounce rate ${(variant.bounce_rate * 100).toFixed(1)}% exceeds 15% threshold`,
            });
        }
    }

    // STEP 4: Execute KB Updates
    await executeKBUpdates(promotions, pauses);

    console.log(`✅ Learning Loop Complete: ${promotions.length} promotions, ${pauses.length} pauses`);
}

/**
 * Get yesterday's time window
 */
function getYesterdayWindow(): { start: string; end: string } {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const start = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
    const end = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

    return { start, end };
}

/**
 * Aggregate analytics by variant
 */
async function aggregateAnalytics(start: string, end: string) {
    const query = `
    SELECT 
      variant_id,
      COUNT(*) FILTER (WHERE event_type = 'BOOKED_CALL') as booked_calls,
      COUNT(*) FILTER (WHERE event_type = 'REPLY') as replies,
      COUNT(*) FILTER (WHERE event_type = 'BOUNCE') as bounces,
      COUNT(*) as total_events,
      CASE 
        WHEN COUNT(*) > 0 THEN COUNT(*) FILTER (WHERE event_type = 'BOUNCE')::float / COUNT(*)
        ELSE 0
      END as bounce_rate
    FROM analytics_events
    WHERE occurred_at >= $1 AND occurred_at <= $2
    GROUP BY variant_id
  `;

    const result = await db.query(query, [start, end]);
    return result.rows;
}

/**
 * Update Knowledge Base with learning directives
 */
async function executeKBUpdates(
    promotions: PromoteDirective[],
    pauses: PauseDirective[]
): Promise<void> {
    // Get active KB
    const kbResult = await db.query(
        "SELECT id, data FROM knowledge_bases WHERE is_active = true LIMIT 1"
    );

    if (kbResult.rows.length === 0) {
        throw new Error("No active Knowledge Base found");
    }

    const kb = kbResult.rows[0];
    let data = kb.data;

    // Add promotions to learning.preferences
    for (const promo of promotions) {
        const newPref = {
            pref_id: `pref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            preference_type: promo.preference_type,
            preferred_ids: [promo.variant_id],
            reason: promo.reason,
        };

        if (!data.learning.preferences) {
            data.learning.preferences = [];
        }

        data.learning.preferences.push(newPref);
    }

    // Add pauses to guardrails.paused_patterns
    for (const pause of pauses) {
        if (!data.guardrails) {
            data.guardrails = { paused_patterns: [] };
        }

        if (!data.guardrails.paused_patterns) {
            data.guardrails.paused_patterns = [];
        }

        data.guardrails.paused_patterns.push(pause.pattern);
    }

    // Update KB in database
    await db.query("UPDATE knowledge_bases SET data = $1 WHERE id = $2", [
        JSON.stringify(data),
        kb.id,
    ]);

    // Audit log
    console.log(`📝 KB Updated:`, {
        promotions: promotions.length,
        pauses: pauses.length,
        timestamp: new Date().toISOString(),
    });
}
