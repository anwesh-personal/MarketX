/**
 * AXIOM SCHEDULER
 * ===============
 * Registers BullMQ repeatable jobs at worker boot time.
 * Uses BullMQ's native repeatable job system (backed by Redis) —
 * no external cron, no setInterval, survives restarts cleanly.
 *
 * BullMQ deduplicates repeatables by jobId — calling this on every
 * boot is idempotent. It will NOT create duplicate schedules.
 *
 * Jobs registered:
 *   1. satellite_daily_reset  — 00:00 UTC daily
 *      Resets current_daily_sent to 0 on all active satellites.
 *      Without this, satellites permanently exhaust capacity.
 *
 *   2. analytics_rollup       — 01:00 UTC daily
 *      Aggregates signal_event → belief_daily_rollup → partner_daily_rollup.
 *      Feeds the member dashboard with yesterday's stats.
 *
 *   3. learning_loop          — 03:00 UTC daily
 *      Triggers coach_analysis for all orgs with recent signal data.
 *      Updates belief confidence scores and brain learnings.
 */

import { Queue } from 'bullmq';
import { QueueName, getRedisConnectionOptions } from '../config/queues';

const connection = getRedisConnectionOptions();
const scheduledTaskQueue = new Queue(QueueName.SCHEDULED_TASK, {
  connection,
  prefix: 'axiom:',
});

interface ScheduleEntry {
  /** Unique repeatable job key — must be stable across restarts */
  jobId: string;
  /** Human label for logs */
  label: string;
  /** Cron expression (UTC) */
  cron: string;
  /** Job payload for the scheduled-task-worker */
  data: {
    taskType: string;
    label: string;
    payload?: Record<string, unknown>;
  };
}

const SCHEDULE: ScheduleEntry[] = [
  {
    jobId: 'cron::satellite-daily-reset',
    label: 'Satellite Daily Reset',
    cron: '0 0 * * *', // midnight UTC
    data: {
      taskType: 'satellite_daily_reset',
      label: 'Satellite Daily Reset (cron)',
    },
  },
  {
    jobId: 'cron::analytics-rollup',
    label: 'Daily Analytics Rollup',
    cron: '0 1 * * *', // 01:00 UTC — after satellite reset
    data: {
      taskType: 'analytics_rollup',
      label: 'Daily Analytics Rollup (cron)',
    },
  },
  {
    jobId: 'cron::learning-loop',
    label: 'Daily Learning Loop',
    cron: '0 3 * * *', // 03:00 UTC — after rollup
    data: {
      taskType: 'learning_loop',
      label: 'Daily Learning Loop (cron)',
    },
  },
];

/**
 * Register all repeatable jobs. Safe to call on every boot —
 * BullMQ deduplicates by repeat key (cron + jobId).
 */
export async function registerScheduledJobs(): Promise<void> {
  console.log('[Scheduler] Registering repeatable jobs...');

  for (const entry of SCHEDULE) {
    try {
      await scheduledTaskQueue.add(
        entry.label,
        entry.data,
        {
          repeat: {
            pattern: entry.cron,
            utc: true,
          },
          jobId: entry.jobId,
          removeOnComplete: 50,
          removeOnFail: 200,
        },
      );
      console.log(`  ✓ ${entry.label} → ${entry.cron} (UTC)`);
    } catch (err: any) {
      console.error(`  ✗ ${entry.label} failed: ${err.message}`);
    }
  }

  // Log any existing repeatables for visibility
  const repeatables = await scheduledTaskQueue.getRepeatableJobs();
  console.log(`[Scheduler] ${repeatables.length} repeatable job(s) active:`);
  for (const r of repeatables) {
    console.log(`  - ${r.name} | cron: ${r.pattern} | next: ${r.next ? new Date(r.next).toISOString() : 'pending'}`);
  }
}

/**
 * Remove all existing repeatable jobs. Useful for clean resets.
 */
export async function clearAllSchedules(): Promise<void> {
  const repeatables = await scheduledTaskQueue.getRepeatableJobs();
  for (const r of repeatables) {
    await scheduledTaskQueue.removeRepeatableByKey(r.key);
  }
  console.log(`[Scheduler] Cleared ${repeatables.length} repeatable job(s)`);
}
