/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * MIGRATION 003: Platform Superadmin & Worker Queue System
 * Adds superadmin role and job queue infrastructure for async workers
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
    // ============================================================
    // 1. PLATFORM ADMINS (Above Organizations)
    // ============================================================
    pgm.createTable('platform_admins', {
        id: {
            type: 'uuid',
            primaryKey: true,
            references: 'auth.users(id)',
            onDelete: 'CASCADE',
        },
        email: {
            type: 'varchar(255)',
            notNull: true,
            unique: true,
        },
        full_name: {
            type: 'varchar(255)',
        },

        // Superadmin permissions
        can_manage_orgs: {
            type: 'boolean',
            default: true,
        },
        can_view_all_data: {
            type: 'boolean',
            default: false, // Dangerous - require explicit grant
        },
        can_manage_billing: {
            type: 'boolean',
            default: true,
        },
        can_manage_platform_config: {
            type: 'boolean',
            default: true,
        },
        can_execute_system_jobs: {
            type: 'boolean',
            default: true,
        },

        is_active: {
            type: 'boolean',
            default: true,
        },

        created_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
        last_login_at: {
            type: 'timestamptz',
        },
    });

    pgm.createIndex('platform_admins', 'email', { unique: true });
    pgm.createIndex('platform_admins', 'is_active');

    // ============================================================
    // 2. JOB QUEUE (For async workers)
    // ============================================================
    pgm.createTable('jobs', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },

        // Job metadata
        job_type: {
            type: 'varchar(50)',
            notNull: true,
            check: "job_type IN ('writer_run', 'learning_loop', 'analytics_aggregation', 'kb_validation')",
        },

        // Tenant context
        org_id: {
            type: 'uuid',
            references: 'organizations(id)',
            onDelete: 'CASCADE',
        },
        triggered_by_user_id: {
            type: 'uuid',
            references: 'users(id)',
        },

        // Job data
        payload: {
            type: 'jsonb',
            notNull: true,
        },

        // Status tracking
        status: {
            type: 'varchar(20)',
            default: "'pending'",
            check: "status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')",
        },

        // Worker assignment
        worker_id: {
            type: 'varchar(100)', // Which worker instance is processing this
        },

        // Timing
        created_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
        started_at: {
            type: 'timestamptz',
        },
        completed_at: {
            type: 'timestamptz',
        },

        // Retry logic
        attempts: {
            type: 'integer',
            default: 0,
        },
        max_attempts: {
            type: 'integer',
            default: 3,
        },

        // Results
        result: {
            type: 'jsonb',
        },
        error: {
            type: 'jsonb',
        },

        // Priority (higher = more urgent)
        priority: {
            type: 'integer',
            default: 0,
        },
    });

    // Indexes for job queue performance
    pgm.createIndex('jobs', ['status', 'priority', 'created_at'], { name: 'idx_jobs_queue' });
    pgm.createIndex('jobs', 'org_id');
    pgm.createIndex('jobs', 'job_type');
    pgm.createIndex('jobs', 'worker_id');
    pgm.createIndex('jobs', 'created_at', { method: 'btree', order: 'DESC' });

    // Partial index for pending jobs (worker polling)
    pgm.createIndex('jobs', ['priority', 'created_at'], {
        where: "status = 'pending'",
        name: 'idx_jobs_pending',
    });

    // ============================================================
    // 3. WORKER HEARTBEATS (Track active workers)
    // ============================================================
    pgm.createTable('workers', {
        id: {
            type: 'varchar(100)',
            primaryKey: true, // e.g., "writer-worker-1"
        },
        worker_type: {
            type: 'varchar(50)',
            notNull: true,
            check: "worker_type IN ('writer', 'learning', 'analytics', 'system')",
        },

        // Health
        status: {
            type: 'varchar(20)',
            default: "'idle'",
            check: "status IN ('idle', 'busy', 'offline')",
        },

        // Current job
        current_job_id: {
            type: 'uuid',
            references: 'jobs(id)',
        },

        // Metadata
        hostname: {
            type: 'varchar(255)',
        },
        version: {
            type: 'varchar(50)',
        },

        // Capacity
        concurrent_jobs: {
            type: 'integer',
            default: 1,
        },

        // Heartbeat
        last_heartbeat_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
        started_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
    });

    pgm.createIndex('workers', 'worker_type');
    pgm.createIndex('workers', 'status');
    pgm.createIndex('workers', 'last_heartbeat_at');

    // ============================================================
    // 4. PLATFORM USAGE STATS (For billing & monitoring)
    // ============================================================
    pgm.createTable('platform_usage_stats', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },

        date: {
            type: 'date',
            notNull: true,
        },

        // Aggregated metrics
        total_orgs: {
            type: 'integer',
            default: 0,
        },
        active_orgs: {
            type: 'integer',
            default: 0,
        },
        total_users: {
            type: 'integer',
            default: 0,
        },
        total_runs: {
            type: 'integer',
            default: 0,
        },
        total_analytics_events: {
            type: 'bigint',
            default: 0,
        },

        // LLM usage
        total_llm_calls: {
            type: 'integer',
            default: 0,
        },
        total_tokens_used: {
            type: 'bigint',
            default: 0,
        },
        estimated_llm_cost_usd: {
            type: 'decimal(10,2)',
            default: 0,
        },

        // Revenue
        mrr_usd: {
            type: 'decimal(10,2)',
            default: 0,
        },

        calculated_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
    });

    pgm.createIndex('platform_usage_stats', 'date', { unique: true });

    // ============================================================
    // 5. Add superadmin bypass for RLS
    // ============================================================

    // Function to check if user is platform admin
    pgm.sql(`
    CREATE OR REPLACE FUNCTION auth.is_platform_admin()
    RETURNS boolean
    LANGUAGE sql
    STABLE
    AS $$
      SELECT EXISTS (
        SELECT 1 FROM platform_admins 
        WHERE id = auth.uid() AND is_active = true
      )
    $$;
  `);

    // Update RLS policies to allow superadmin access
    // (Only for viewing, not for mutations - keep audit trail clean)

    pgm.sql(`
    CREATE POLICY "Platform admins can view all organizations"
      ON organizations FOR SELECT
      USING (auth.is_platform_admin());
  `);

    pgm.sql(`
    CREATE POLICY "Platform admins can view all users"
      ON users FOR SELECT
      USING (auth.is_platform_admin());
  `);

    pgm.sql(`
    CREATE POLICY "Platform admins can view all KBs"
      ON knowledge_bases FOR SELECT
      USING (auth.is_platform_admin());
  `);

    pgm.sql(`
    CREATE POLICY "Platform admins can view all runs"
      ON runs FOR SELECT
      USING (auth.is_platform_admin());
  `);

    // ============================================================
    // 6. Job queue helper functions
    // ============================================================

    // Function to create a job
    pgm.sql(`
    CREATE OR REPLACE FUNCTION create_job(
      p_job_type varchar,
      p_org_id uuid,
      p_payload jsonb,
      p_priority integer DEFAULT 0
    )
    RETURNS uuid
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_job_id uuid;
    BEGIN
      INSERT INTO jobs (job_type, org_id, triggered_by_user_id, payload, priority)
      VALUES (p_job_type, p_org_id, auth.uid(), p_payload, p_priority)
      RETURNING id INTO v_job_id;
      
      RETURN v_job_id;
    END;
    $$;
  `);

    // Function to claim next job (for workers)
    pgm.sql(`
    CREATE OR REPLACE FUNCTION claim_next_job(
      p_worker_id varchar,
      p_job_type varchar DEFAULT NULL
    )
    RETURNS TABLE (
      job_id uuid,
      job_type varchar,
      payload jsonb,
      org_id uuid
    )
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_job_id uuid;
    BEGIN
      -- Find and lock next pending job
      SELECT id INTO v_job_id
      FROM jobs
      WHERE status = 'pending'
        AND (p_job_type IS NULL OR jobs.job_type = p_job_type)
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;
      
      IF v_job_id IS NOT NULL THEN
        -- Update job status
        UPDATE jobs
        SET status = 'processing',
            worker_id = p_worker_id,
            started_at = NOW(),
            attempts = attempts + 1
        WHERE id = v_job_id;
        
        -- Return job details
        RETURN QUERY
        SELECT jobs.id, jobs.job_type, jobs.payload, jobs.org_id
        FROM jobs
        WHERE jobs.id = v_job_id;
      END IF;
    END;
    $$;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    // Drop functions
    pgm.sql('DROP FUNCTION IF EXISTS claim_next_job(varchar, varchar)');
    pgm.sql('DROP FUNCTION IF EXISTS create_job(varchar, uuid, jsonb, integer)');
    pgm.sql('DROP FUNCTION IF EXISTS auth.is_platform_admin()');

    // Drop tables
    pgm.dropTable('platform_usage_stats');
    pgm.dropTable('workers');
    pgm.dropTable('jobs');
    pgm.dropTable('platform_admins');
}
