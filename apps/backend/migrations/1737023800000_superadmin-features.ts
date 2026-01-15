/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * MIGRATION 005: Superadmin Features
 * Adds impersonation logging and license transaction tracking
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
    // ============================================================
    // 1. IMPERSONATION LOGS
    // ============================================================
    pgm.createTable('impersonation_logs', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        admin_id: {
            type: 'uuid',
            notNull: true,
            references: 'platform_admins(id)',
            onDelete: 'CASCADE',
        },
        target_user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)',
            onDelete: 'CASCADE',
        },
        target_org_id: {
            type: 'uuid',
            references: 'organizations(id)',
            onDelete: 'CASCADE',
        },
        started_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
        ended_at: {
            type: 'timestamptz',
        },
        duration_seconds: {
            type: 'integer',
        },
        actions_taken: {
            type: 'jsonb',
            default: '[]',
        },
        ip_address: {
            type: 'varchar(45)',
        },
        user_agent: {
            type: 'text',
        },
    });

    pgm.createIndex('impersonation_logs', 'admin_id');
    pgm.createIndex('impersonation_logs', 'target_user_id');
    pgm.createIndex('impersonation_logs', 'started_at', { method: 'btree' });

    // ============================================================
    // 2. LICENSE TRANSACTIONS
    // ============================================================
    pgm.createTable('license_transactions', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        org_id: {
            type: 'uuid',
            notNull: true,
            references: 'organizations(id)',
            onDelete: 'CASCADE',
        },
        admin_id: {
            type: 'uuid',
            references: 'platform_admins(id)',
        },
        transaction_type: {
            type: 'varchar(50)',
            notNull: true,
            check: `transaction_type IN (
        'created', 'upgraded', 'downgraded', 
        'gifted', 'suspended', 'reactivated',
        'quota_updated', 'plan_changed'
      )`,
        },
        from_plan: {
            type: 'varchar(50)',
        },
        to_plan: {
            type: 'varchar(50)',
        },
        price_usd: {
            type: 'decimal(10,2)',
        },
        quota_changes: {
            type: 'jsonb',
        },
        notes: {
            type: 'text',
        },
        created_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
    });

    pgm.createIndex('license_transactions', 'org_id');
    pgm.createIndex('license_transactions', 'admin_id');
    pgm.createIndex('license_transactions', 'transaction_type');
    pgm.createIndex('license_transactions', 'created_at', { method: 'btree' });

    // ============================================================
    // 3. TEAM INVITATIONS
    // ============================================================
    pgm.createTable('team_invitations', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        org_id: {
            type: 'uuid',
            notNull: true,
            references: 'organizations(id)',
            onDelete: 'CASCADE',
        },
        invited_by_user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)',
        },
        email: {
            type: 'varchar(255)',
            notNull: true,
        },
        full_name: {
            type: 'varchar(255)',
        },
        role: {
            type: 'varchar(20)',
            notNull: true,
            check: "role IN ('owner', 'admin', 'member', 'viewer')",
        },
        permissions: {
            type: 'jsonb',
            default: '{}',
        },
        invitation_token: {
            type: 'varchar(255)',
            notNull: true,
            unique: true,
        },
        status: {
            type: 'varchar(20)',
            default: "'pending'",
            check: "status IN ('pending', 'accepted', 'expired', 'revoked')",
        },
        expires_at: {
            type: 'timestamptz',
            notNull: true,
        },
        accepted_at: {
            type: 'timestamptz',
        },
        created_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
    });

    pgm.createIndex('team_invitations', 'org_id');
    pgm.createIndex('team_invitations', 'email');
    pgm.createIndex('team_invitations', 'invitation_token', { unique: true });
    pgm.createIndex('team_invitations', 'status');

    // ============================================================
    // 4. AUDIT LOG (For all superadmin actions)
    // ============================================================
    pgm.createTable('superadmin_audit_log', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        admin_id: {
            type: 'uuid',
            notNull: true,
            references: 'platform_admins(id)',
        },
        action: {
            type: 'varchar(100)',
            notNull: true,
        },
        resource_type: {
            type: 'varchar(50)',
            notNull: true,
        },
        resource_id: {
            type: 'uuid',
        },
        changes: {
            type: 'jsonb',
        },
        ip_address: {
            type: 'varchar(45)',
        },
        user_agent: {
            type: 'text',
        },
        created_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
    });

    pgm.createIndex('superadmin_audit_log', 'admin_id');
    pgm.createIndex('superadmin_audit_log', 'action');
    pgm.createIndex('superadmin_audit_log', 'resource_type');
    pgm.createIndex('superadmin_audit_log', 'created_at', { method: 'btree' });

    // ============================================================
    // 5. HELPER FUNCTIONS
    // ============================================================

    // Function to log superadmin actions
    pgm.sql(`
    CREATE OR REPLACE FUNCTION log_superadmin_action(
      p_admin_id uuid,
      p_action varchar,
      p_resource_type varchar,
      p_resource_id uuid,
      p_changes jsonb DEFAULT NULL,
      p_ip_address varchar DEFAULT NULL
    )
    RETURNS uuid
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_log_id uuid;
    BEGIN
      INSERT INTO superadmin_audit_log (
        admin_id, action, resource_type, resource_id, changes, ip_address
      )
      VALUES (
        p_admin_id, p_action, p_resource_type, p_resource_id, p_changes, p_ip_address
      )
      RETURNING id INTO v_log_id;
      
      RETURN v_log_id;
    END;
    $$;
  `);

    // Function to create organization with audit
    pgm.sql(`
    CREATE OR REPLACE FUNCTION create_organization_with_audit(
      p_admin_id uuid,
      p_org_name varchar,
      p_slug varchar,
      p_plan varchar,
      p_quotas jsonb
    )
    RETURNS TABLE (
      org_id uuid,
      transaction_id uuid
    )
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_org_id uuid;
      v_transaction_id uuid;
    BEGIN
      -- Create organization
      INSERT INTO organizations (name, slug, plan, status, max_kbs, max_runs_per_month, max_team_members)
      VALUES (
        p_org_name,
        p_slug,
        p_plan,
        'active',
        COALESCE((p_quotas->>'max_kbs')::integer, 1),
        COALESCE((p_quotas->>'max_runs_per_month')::integer, 10),
        COALESCE((p_quotas->>'max_team_members')::integer, 3)
      )
      RETURNING id INTO v_org_id;
      
      -- Log transaction
      INSERT INTO license_transactions (org_id, admin_id, transaction_type, to_plan, quota_changes)
      VALUES (v_org_id, p_admin_id, 'created', p_plan, p_quotas)
      RETURNING id INTO v_transaction_id;
      
      -- Audit log
      PERFORM log_superadmin_action(
        p_admin_id,
        'create_organization',
        'organization',
        v_org_id,
        jsonb_build_object('plan', p_plan, 'quotas', p_quotas),
        NULL
      );
      
      RETURN QUERY SELECT v_org_id, v_transaction_id;
    END;
    $$;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    // Drop functions
    pgm.sql('DROP FUNCTION IF EXISTS create_organization_with_audit(uuid, varchar, varchar, varchar, jsonb)');
    pgm.sql('DROP FUNCTION IF EXISTS log_superadmin_action(uuid, varchar, varchar, uuid, jsonb, varchar)');

    // Drop tables
    pgm.dropTable('superadmin_audit_log');
    pgm.dropTable('team_invitations');
    pgm.dropTable('license_transactions');
    pgm.dropTable('impersonation_logs');
}
