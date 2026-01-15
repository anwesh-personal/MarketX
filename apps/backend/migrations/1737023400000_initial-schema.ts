/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * MIGRATION 001: Initial Schema
 * Creates all core tables for Axiom Engine
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
    // Enable UUID extension
    pgm.sql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // ============================================================
    // 1. KNOWLEDGE BASES
    // ============================================================
    pgm.createTable('knowledge_bases', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        version: {
            type: 'varchar(50)',
            notNull: true,
        },
        stage: {
            type: 'varchar(20)',
            notNull: true,
            check: "stage IN ('pre-embeddings', 'embeddings-enabled')",
        },
        data: {
            type: 'jsonb',
            notNull: true,
        },
        is_active: {
            type: 'boolean',
            default: false,
        },
        created_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
        created_by: {
            type: 'varchar(255)',
        },
    });

    // Indexes
    pgm.createIndex('knowledge_bases', 'is_active', {
        where: 'is_active = true',
        name: 'idx_kb_active',
    });
    pgm.createIndex('knowledge_bases', 'version', { name: 'idx_kb_version' });
    pgm.createIndex('knowledge_bases', 'created_at', {
        method: 'btree',
        order: 'DESC',
        name: 'idx_kb_created_at',
    });

    // JSONB indexes
    pgm.sql("CREATE INDEX idx_kb_brand ON knowledge_bases USING gin ((data->'brand'))");
    pgm.sql("CREATE INDEX idx_kb_icps ON knowledge_bases USING gin ((data->'icp_library'->'segments'))");
    pgm.sql("CREATE INDEX idx_kb_offers ON knowledge_bases USING gin ((data->'offer_library'->'offers'))");

    // ============================================================
    // 2. RUNS
    // ============================================================
    pgm.createTable('runs', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        run_type: {
            type: 'varchar(20)',
            notNull: true,
            check: "run_type IN ('ON_DEMAND', 'DAILY_SCHEDULED', 'MANUAL_OVERRIDE')",
        },
        kb_version: {
            type: 'varchar(50)',
            notNull: true,
        },
        input_snapshot: {
            type: 'jsonb',
            notNull: true,
        },
        output_snapshot: {
            type: 'jsonb',
        },
        status: {
            type: 'varchar(20)',
            default: "'PENDING'",
            check: "status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL')",
        },
        started_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
        completed_at: {
            type: 'timestamptz',
        },
        triggered_by: {
            type: 'varchar(255)',
        },
        time_window_start: {
            type: 'timestamptz',
        },
        time_window_end: {
            type: 'timestamptz',
        },
        execution_time_ms: {
            type: 'integer',
        },
        errors: {
            type: 'jsonb',
        },
        summary: {
            type: 'jsonb',
        },
    });

    // Indexes
    pgm.createIndex('runs', 'status', { name: 'idx_runs_status' });
    pgm.createIndex('runs', 'run_type', { name: 'idx_runs_type' });
    pgm.createIndex('runs', 'started_at', { method: 'btree', order: 'DESC', name: 'idx_runs_started_at' });
    pgm.createIndex('runs', 'kb_version', { name: 'idx_runs_kb_version' });

    // ============================================================
    // 3. GENERATED CONTENT
    // ============================================================
    pgm.createTable('generated_content', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        run_id: {
            type: 'uuid',
            notNull: true,
            references: 'runs(id)',
            onDelete: 'CASCADE',
        },
        content_type: {
            type: 'varchar(20)',
            notNull: true,
            check: "content_type IN ('PAGE', 'EMAIL', 'EMAIL_FLOW', 'EMAIL_REPLY', 'SOCIAL_POST')",
        },
        variant_id: {
            type: 'varchar(100)',
            notNull: true,
        },
        icp_id: {
            type: 'varchar(100)',
            notNull: true,
        },
        offer_id: {
            type: 'varchar(100)',
            notNull: true,
        },
        buyer_stage: {
            type: 'varchar(20)',
            check: "buyer_stage IN ('AWARENESS', 'CONSIDERATION', 'EVALUATION', 'RISK_RESOLUTION', 'READY')",
        },
        blueprint_id: {
            type: 'varchar(100)',
        },
        layout_id: {
            type: 'varchar(100)',
        },
        angle_id: {
            type: 'varchar(100)',
        },
        cta_id: {
            type: 'varchar(100)',
        },
        strategy_id: {
            type: 'varchar(100)',
        },
        content_data: {
            type: 'jsonb',
            notNull: true,
        },
        generated_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
        is_active: {
            type: 'boolean',
            default: true,
        },
        paused_at: {
            type: 'timestamptz',
        },
        pause_reason: {
            type: 'text',
        },
    });

    // Indexes
    pgm.createIndex('generated_content', 'run_id', { name: 'idx_content_run' });
    pgm.createIndex('generated_content', 'content_type', { name: 'idx_content_type' });
    pgm.createIndex('generated_content', 'variant_id', { name: 'idx_content_variant' });
    pgm.createIndex('generated_content', ['icp_id', 'offer_id', 'buyer_stage'], { name: 'idx_content_context' });
    pgm.createIndex('generated_content', 'is_active', { where: 'is_active = true', name: 'idx_content_active' });
    pgm.createIndex('generated_content', 'generated_at', { method: 'btree', order: 'DESC', name: 'idx_content_generated_at' });
    pgm.sql('CREATE INDEX idx_content_data ON generated_content USING gin (content_data)');

    // ============================================================
    // 4. ANALYTICS EVENTS
    // ============================================================
    pgm.createTable('analytics_events', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        occurred_at: {
            type: 'timestamptz',
            notNull: true,
        },
        received_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
        run_id: {
            type: 'uuid',
            references: 'runs(id)',
        },
        content_id: {
            type: 'uuid',
            references: 'generated_content(id)',
        },
        variant_id: {
            type: 'varchar(100)',
        },
        event_type: {
            type: 'varchar(50)',
            notNull: true,
        },
        asset_type: {
            type: 'varchar(20)',
            check: "asset_type IN ('WEBSITE', 'EMAIL', 'EMAIL_FLOW', 'EMAIL_REPLY', 'SOCIAL_POST')",
        },
        icp_id: {
            type: 'varchar(100)',
        },
        offer_id: {
            type: 'varchar(100)',
        },
        buyer_stage: {
            type: 'varchar(20)',
        },
        platform: {
            type: 'varchar(50)',
        },
        payload: {
            type: 'jsonb',
        },
        source: {
            type: 'varchar(100)',
        },
        user_agent: {
            type: 'text',
        },
        ip_address: {
            type: 'inet',
        },
        idempotency_key: {
            type: 'varchar(255)',
            unique: true,
        },
        is_duplicate: {
            type: 'boolean',
            default: false,
        },
    });

    // Indexes
    pgm.createIndex('analytics_events', 'occurred_at', { method: 'btree', order: 'DESC', name: 'idx_events_occurred_at' });
    pgm.createIndex('analytics_events', 'content_id', { name: 'idx_events_content' });
    pgm.createIndex('analytics_events', 'variant_id', { name: 'idx_events_variant' });
    pgm.createIndex('analytics_events', 'event_type', { name: 'idx_events_type' });
    pgm.createIndex('analytics_events', ['icp_id', 'offer_id', 'event_type'], { name: 'idx_events_context' });
    pgm.createIndex('analytics_events', 'run_id', { name: 'idx_events_run' });
    pgm.createIndex('analytics_events', 'idempotency_key', { where: 'idempotency_key IS NOT NULL', name: 'idx_events_idempotency' });
    pgm.createIndex('analytics_events', ['occurred_at', 'variant_id', 'icp_id', 'offer_id'], {
        where: "event_type = 'BOOKED_CALL'",
        name: 'idx_events_booked_calls',
    });

    // ============================================================
    // 5. AGGREGATED METRICS
    // ============================================================
    pgm.createTable('aggregated_metrics', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        time_window_start: {
            type: 'timestamptz',
            notNull: true,
        },
        time_window_end: {
            type: 'timestamptz',
            notNull: true,
        },
        icp_id: {
            type: 'varchar(100)',
            notNull: true,
        },
        offer_id: {
            type: 'varchar(100)',
            notNull: true,
        },
        buyer_stage: {
            type: 'varchar(20)',
        },
        asset_type: {
            type: 'varchar(20)',
            notNull: true,
        },
        variant_id: {
            type: 'varchar(100)',
            notNull: true,
        },
        total_sent: {
            type: 'integer',
            default: 0,
        },
        total_delivered: {
            type: 'integer',
            default: 0,
        },
        total_opens: {
            type: 'integer',
            default: 0,
        },
        total_clicks: {
            type: 'integer',
            default: 0,
        },
        total_replies: {
            type: 'integer',
            default: 0,
        },
        total_booked_calls: {
            type: 'integer',
            default: 0,
        },
        total_bounces: {
            type: 'integer',
            default: 0,
        },
        total_unsubscribes: {
            type: 'integer',
            default: 0,
        },
        total_complaints: {
            type: 'integer',
            default: 0,
        },
        booked_call_rate: {
            type: 'decimal(5,4)',
        },
        reply_rate: {
            type: 'decimal(5,4)',
        },
        click_rate: {
            type: 'decimal(5,4)',
        },
        bounce_rate: {
            type: 'decimal(5,4)',
        },
        unsubscribe_rate: {
            type: 'decimal(5,4)',
        },
        complaint_rate: {
            type: 'decimal(5,4)',
        },
        sample_size: {
            type: 'integer',
            notNull: true,
        },
        is_statistically_significant: {
            type: 'boolean',
        },
        calculated_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
    });

    // Unique constraint
    pgm.addConstraint('aggregated_metrics', 'unique_aggregation', {
        unique: ['time_window_start', 'time_window_end', 'icp_id', 'offer_id', 'buyer_stage', 'asset_type', 'variant_id'],
    });

    // Indexes
    pgm.createIndex('aggregated_metrics', ['time_window_start', 'time_window_end'], { name: 'idx_metrics_window' });
    pgm.createIndex('aggregated_metrics', ['icp_id', 'offer_id', 'buyer_stage', 'asset_type'], { name: 'idx_metrics_context' });
    pgm.createIndex('aggregated_metrics', 'variant_id', { name: 'idx_metrics_variant' });
    pgm.sql('CREATE INDEX idx_metrics_booked_call_rate ON aggregated_metrics(booked_call_rate DESC NULLS LAST)');

    // ============================================================
    // 6. LEARNING HISTORY
    // ============================================================
    pgm.createTable('learning_history', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        executed_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
        run_id: {
            type: 'uuid',
            references: 'runs(id)',
        },
        mutation_type: {
            type: 'varchar(50)',
            notNull: true,
            check: "mutation_type IN ('PROMOTION', 'DEMOTION', 'PAUSE', 'RESUME')",
        },
        context: {
            type: 'jsonb',
            notNull: true,
        },
        variant_id: {
            type: 'varchar(100)',
        },
        pattern_type: {
            type: 'varchar(50)',
        },
        pattern_id: {
            type: 'varchar(100)',
        },
        reason: {
            type: 'text',
            notNull: true,
        },
        evidence: {
            type: 'jsonb',
        },
        kb_version_before: {
            type: 'varchar(50)',
        },
        kb_version_after: {
            type: 'varchar(50)',
        },
    });

    // Indexes
    pgm.createIndex('learning_history', 'executed_at', { method: 'btree', order: 'DESC', name: 'idx_learning_executed_at' });
    pgm.createIndex('learning_history', 'run_id', { name: 'idx_learning_run' });
    pgm.createIndex('learning_history', 'mutation_type', { name: 'idx_learning_type' });
    pgm.createIndex('learning_history', 'variant_id', { name: 'idx_learning_variant' });

    // ============================================================
    // 7. OPS CONFIG
    // ============================================================
    pgm.createTable('ops_config', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        version: {
            type: 'varchar(50)',
            notNull: true,
            unique: true,
        },
        config: {
            type: 'jsonb',
            notNull: true,
        },
        is_active: {
            type: 'boolean',
            default: false,
        },
        created_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
        created_by: {
            type: 'varchar(255)',
        },
    });

    // Index
    pgm.createIndex('ops_config', 'is_active', { where: 'is_active = true', name: 'idx_ops_active' });

    // ============================================================
    // 8. SYSTEM LOGS
    // ============================================================
    pgm.createTable('system_logs', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        logged_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
        level: {
            type: 'varchar(10)',
            notNull: true,
            check: "level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')",
        },
        module: {
            type: 'varchar(100)',
        },
        message: {
            type: 'text',
            notNull: true,
        },
        context: {
            type: 'jsonb',
        },
        error_stack: {
            type: 'text',
        },
    });

    // Indexes
    pgm.createIndex('system_logs', 'logged_at', { method: 'btree', order: 'DESC', name: 'idx_logs_logged_at' });
    pgm.createIndex('system_logs', 'level', { name: 'idx_logs_level' });
    pgm.createIndex('system_logs', 'module', { name: 'idx_logs_module' });

    // ============================================================
    // INITIAL DATA: Default Ops Config
    // ============================================================
    pgm.sql(`
    INSERT INTO ops_config (version, config, is_active) VALUES (
      '1.0.0',
      '{
        "schema_version": "1.0.0",
        "schedule": {
          "timezone": "America/New_York",
          "daily_run_time": "06:00",
          "enabled": true
        },
        "run_windows": {
          "default_input_window": "PREVIOUS_CALENDAR_DAY",
          "custom_ranges_allowed": false
        },
        "throttles": {
          "max_new_variants_per_day": 10,
          "max_promotions_per_context": 3,
          "max_demotions_per_context": 2,
          "max_pauses_per_day": 5
        },
        "guardrails": {
          "pause_on_threshold_breach": true,
          "thresholds": {
            "bounce_rate_max": 0.15,
            "unsubscribe_rate_max": 0.02,
            "complaint_rate_max": 0.001
          },
          "cooldown_policy": {
            "cooldown_days_after_pause": 7,
            "auto_resume_allowed": false
          }
        },
        "execution_modes": {
          "writer": { "enabled": true },
          "analytics": { "enabled": true },
          "learning_loop": { "enabled": true }
        },
        "exports": {
          "output_dir": "./generated",
          "formats": ["JSON", "MARKDOWN"],
          "emit_examples": true
        },
        "logging": {
          "level": "INFO",
          "retain_days": 90,
          "include_raw_source_payloads": false,
          "structured_format": true
        }
      }'::jsonb,
      true
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    // Drop tables in reverse order (respecting foreign keys)
    pgm.dropTable('system_logs');
    pgm.dropTable('ops_config');
    pgm.dropTable('learning_history');
    pgm.dropTable('aggregated_metrics');
    pgm.dropTable('analytics_events');
    pgm.dropTable('generated_content');
    pgm.dropTable('runs');
    pgm.dropTable('knowledge_bases');
}
