/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * MIGRATION 002: Multi-Tenancy & Authentication
 * Adds organizations, users, and RLS policies for SaaS multi-tenancy
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
    // ============================================================
    // 1. ORGANIZATIONS (Tenants)
    // ============================================================
    pgm.createTable('organizations', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()'),
        },
        name: {
            type: 'varchar(255)',
            notNull: true,
        },
        slug: {
            type: 'varchar(100)',
            notNull: true,
            unique: true,
        },

        // Subscription/Licensing
        plan: {
            type: 'varchar(50)',
            notNull: true,
            default: "'free'",
            check: "plan IN ('free', 'starter', 'pro', 'enterprise')",
        },
        status: {
            type: 'varchar(20)',
            notNull: true,
            default: "'active'",
            check: "status IN ('active', 'suspended', 'cancelled')",
        },

        // Quotas
        max_kbs: {
            type: 'integer',
            default: 1,
        },
        max_runs_per_month: {
            type: 'integer',
            default: 10,
        },
        max_team_members: {
            type: 'integer',
            default: 3,
        },

        // Usage tracking
        current_kbs_count: {
            type: 'integer',
            default: 0,
        },
        runs_this_month: {
            type: 'integer',
            default: 0,
        },

        // Billing
        stripe_customer_id: {
            type: 'varchar(255)',
        },
        stripe_subscription_id: {
            type: 'varchar(255)',
        },

        // Metadata
        created_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
        updated_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
    });

    pgm.createIndex('organizations', 'slug', { unique: true });
    pgm.createIndex('organizations', 'status');
    pgm.createIndex('organizations', 'plan');

    // ============================================================
    // 2. USERS (Team Members)
    // ============================================================
    pgm.createTable('users', {
        id: {
            type: 'uuid',
            primaryKey: true,
            references: 'auth.users(id)', // Links to Supabase Auth
            onDelete: 'CASCADE',
        },
        org_id: {
            type: 'uuid',
            notNull: true,
            references: 'organizations(id)',
            onDelete: 'CASCADE',
        },

        // Profile
        email: {
            type: 'varchar(255)',
            notNull: true,
        },
        full_name: {
            type: 'varchar(255)',
        },

        // Role
        role: {
            type: 'varchar(20)',
            notNull: true,
            default: "'member'",
            check: "role IN ('owner', 'admin', 'member', 'viewer')",
        },

        // Permissions
        can_upload_kb: {
            type: 'boolean',
            default: false,
        },
        can_trigger_runs: {
            type: 'boolean',
            default: false,
        },
        can_view_analytics: {
            type: 'boolean',
            default: true,
        },
        can_manage_team: {
            type: 'boolean',
            default: false,
        },

        // Status
        is_active: {
            type: 'boolean',
            default: true,
        },
        last_seen_at: {
            type: 'timestamptz',
        },

        // Metadata
        created_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
        updated_at: {
            type: 'timestamptz',
            default: pgm.func('NOW()'),
        },
    });

    pgm.createIndex('users', 'org_id');
    pgm.createIndex('users', 'email');
    pgm.createIndex('users', 'role');
    pgm.createIndex('users', 'is_active');

    // ============================================================
    // 3. Add org_id to all data tables
    // ============================================================

    // knowledge_bases
    pgm.addColumn('knowledge_bases', {
        org_id: {
            type: 'uuid',
            references: 'organizations(id)',
            onDelete: 'CASCADE',
        },
    });
    pgm.createIndex('knowledge_bases', 'org_id');

    // runs
    pgm.addColumn('runs', {
        org_id: {
            type: 'uuid',
            references: 'organizations(id)',
            onDelete: 'CASCADE',
        },
        triggered_by_user_id: {
            type: 'uuid',
            references: 'users(id)',
        },
    });
    pgm.createIndex('runs', 'org_id');
    pgm.createIndex('runs', 'triggered_by_user_id');

    // generated_content
    pgm.addColumn('generated_content', {
        org_id: {
            type: 'uuid',
            references: 'organizations(id)',
            onDelete: 'CASCADE',
        },
    });
    pgm.createIndex('generated_content', 'org_id');

    // analytics_events
    pgm.addColumn('analytics_events', {
        org_id: {
            type: 'uuid',
            references: 'organizations(id)',
            onDelete: 'CASCADE',
        },
    });
    pgm.createIndex('analytics_events', 'org_id');

    // aggregated_metrics
    pgm.addColumn('aggregated_metrics', {
        org_id: {
            type: 'uuid',
            references: 'organizations(id)',
            onDelete: 'CASCADE',
        },
    });
    pgm.createIndex('aggregated_metrics', 'org_id');

    // learning_history
    pgm.addColumn('learning_history', {
        org_id: {
            type: 'uuid',
            references: 'organizations(id)',
            onDelete: 'CASCADE',
        },
    });
    pgm.createIndex('learning_history', 'org_id');

    // ============================================================
    // 4. ENABLE ROW LEVEL SECURITY
    // ============================================================

    pgm.sql('ALTER TABLE organizations ENABLE ROW LEVEL SECURITY');
    pgm.sql('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
    pgm.sql('ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY');
    pgm.sql('ALTER TABLE runs ENABLE ROW LEVEL SECURITY');
    pgm.sql('ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY');
    pgm.sql('ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY');
    pgm.sql('ALTER TABLE aggregated_metrics ENABLE ROW LEVEL SECURITY');
    pgm.sql('ALTER TABLE learning_history ENABLE ROW LEVEL SECURITY');

    // ============================================================
    // 5. RLS POLICIES
    // ============================================================

    // Organizations: Users see only their org
    pgm.sql(`
    CREATE POLICY "Users see own organization"
      ON organizations FOR SELECT
      USING (id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
      ));
  `);

    pgm.sql(`
    CREATE POLICY "Owners can update organization"
      ON organizations FOR UPDATE
      USING (id IN (
        SELECT org_id FROM users WHERE id = auth.uid() AND role = 'owner'
      ));
  `);

    // Users: See team members in same org
    pgm.sql(`
    CREATE POLICY "Users see own team"
      ON users FOR SELECT
      USING (org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
      ));
  `);

    pgm.sql(`
    CREATE POLICY "Admins can manage team"
      ON users FOR ALL
      USING (org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid() AND (role = 'owner' OR role = 'admin' OR can_manage_team = true)
      ));
  `);

    // Knowledge Bases: Org-scoped
    pgm.sql(`
    CREATE POLICY "Users see org KBs"
      ON knowledge_bases FOR SELECT
      USING (org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
      ));
  `);

    pgm.sql(`
    CREATE POLICY "Authorized users can upload KB"
      ON knowledge_bases FOR INSERT
      WITH CHECK (org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid() AND (role IN ('owner', 'admin') OR can_upload_kb = true)
      ));
  `);

    // Runs: Org-scoped
    pgm.sql(`
    CREATE POLICY "Users see org runs"
      ON runs FOR SELECT
      USING (org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
      ));
  `);

    pgm.sql(`
    CREATE POLICY "Authorized users can trigger runs"
      ON runs FOR INSERT
      WITH CHECK (org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid() AND (role IN ('owner', 'admin') OR can_trigger_runs = true)
      ));
  `);

    // Generated Content: Org-scoped (read-only for most)
    pgm.sql(`
    CREATE POLICY "Users see org content"
      ON generated_content FOR SELECT
      USING (org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
      ));
  `);

    // Analytics Events: Org-scoped
    pgm.sql(`
    CREATE POLICY "Users see org analytics"
      ON analytics_events FOR SELECT
      USING (org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid() AND can_view_analytics = true
      ));
  `);

    pgm.sql(`
    CREATE POLICY "Analytics can be inserted"
      ON analytics_events FOR INSERT
      WITH CHECK (org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
      ));
  `);

    // Aggregated Metrics: Org-scoped
    pgm.sql(`
    CREATE POLICY "Users see org metrics"
      ON aggregated_metrics FOR SELECT
      USING (org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid() AND can_view_analytics = true
      ));
  `);

    // Learning History: Org-scoped
    pgm.sql(`
    CREATE POLICY "Users see org learning history"
      ON learning_history FOR SELECT
      USING (org_id IN (
        SELECT org_id FROM users WHERE id = auth.uid()
      ));
  `);

    // ============================================================
    // 6. HELPER FUNCTION: Get user's org_id
    // ============================================================
    pgm.sql(`
    CREATE OR REPLACE FUNCTION auth.user_org_id()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    AS $$
      SELECT org_id FROM users WHERE id = auth.uid()
    $$;
  `);

    // ============================================================
    // 7. AUDIT TRIGGERS (Track who did what)
    // ============================================================
    pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

    pgm.sql(`
    CREATE TRIGGER organizations_updated_at
      BEFORE UPDATE ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  `);

    pgm.sql(`
    CREATE TRIGGER users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    // Drop triggers
    pgm.sql('DROP TRIGGER IF EXISTS organizations_updated_at ON organizations');
    pgm.sql('DROP TRIGGER IF EXISTS users_updated_at ON users');
    pgm.sql('DROP FUNCTION IF EXISTS update_updated_at()');
    pgm.sql('DROP FUNCTION IF EXISTS auth.user_org_id()');

    // Disable RLS
    pgm.sql('ALTER TABLE learning_history DISABLE ROW LEVEL SECURITY');
    pgm.sql('ALTER TABLE aggregated_metrics DISABLE ROW LEVEL SECURITY');
    pgm.sql('ALTER TABLE analytics_events DISABLE ROW LEVEL SECURITY');
    pgm.sql('ALTER TABLE generated_content DISABLE ROW LEVEL SECURITY');
    pgm.sql('ALTER TABLE runs DISABLE ROW LEVEL SECURITY');
    pgm.sql('ALTER TABLE knowledge_bases DISABLE ROW LEVEL SECURITY');
    pgm.sql('ALTER TABLE users DISABLE ROW LEVEL SECURITY');
    pgm.sql('ALTER TABLE organizations DISABLE ROW LEVEL SECURITY');

    // Remove org_id columns
    pgm.dropColumn('learning_history', 'org_id');
    pgm.dropColumn('aggregated_metrics', 'org_id');
    pgm.dropColumn('analytics_events', 'org_id');
    pgm.dropColumn('generated_content', 'org_id');
    pgm.dropColumn('runs', ['org_id', 'triggered_by_user_id']);
    pgm.dropColumn('knowledge_bases', 'org_id');

    // Drop tables
    pgm.dropTable('users');
    pgm.dropTable('organizations');
}
