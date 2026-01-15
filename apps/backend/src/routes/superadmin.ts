import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import { config } from '../config';

const router = Router();
const pool = new Pool({ connectionString: config.databaseUrl });


// ============================================================
// MIDDLEWARE: Verify Superadmin
// ============================================================

interface SuperadminRequest extends Request {
    superadminId?: string;
}

const verifySuperadmin = async (
    req: SuperadminRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.substring(7);

        // Verify token is valid superadmin session
        // For now, using simple token check (replace with JWT in production)
        const { rows } = await pool.query(
            'SELECT id FROM platform_admins WHERE id = $1 AND is_active = true',
            [token]
        );

        if (rows.length === 0) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        req.superadminId = rows[0].id;
        next();
    } catch (error) {
        console.error('Superadmin verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================================
// SCHEMAS
// ============================================================

const CreateOrganizationSchema = z.object({
    org_name: z.string().min(1).max(255),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
    plan: z.enum(['free', 'starter', 'pro', 'enterprise']),
    owner_email: z.string().email(),
    owner_name: z.string().min(1).max(255),
    quotas: z.object({
        max_kbs: z.number().int().min(1),
        max_runs_per_month: z.number().int().min(1),
        max_team_members: z.number().int().min(1),
    }),
});

const UpdateOrganizationSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    plan: z.enum(['free', 'starter', 'pro', 'enterprise']).optional(),
    status: z.enum(['active', 'suspended', 'cancelled']).optional(),
    max_kbs: z.number().int().min(0).optional(),
    max_runs_per_month: z.number().int().min(0).optional(),
    max_team_members: z.number().int().min(0).optional(),
});

const ImpersonateUserSchema = z.object({
    user_id: z.string().uuid(),
});

// ============================================================
// ROUTES: Organizations
// ============================================================

/**
 * GET /api/superadmin/organizations
 * List all organizations
 */
router.get('/organizations', verifySuperadmin, async (req: SuperadminRequest, res: Response) => {
    try {
        const { rows } = await pool.query(`
      SELECT 
        o.*,
        COUNT(DISTINCT u.id) as current_team_size,
        COUNT(DISTINCT kb.id) as current_kbs_count,
        COUNT(DISTINCT r.id) as total_runs
      FROM organizations o
      LEFT JOIN users u ON u.org_id = o.id AND u.is_active = true
      LEFT JOIN knowledge_bases kb ON kb.org_id = o.id
      LEFT JOIN runs r ON r.org_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);

        res.json({ organizations: rows });
    } catch (error) {
        console.error('Error fetching organizations:', error);
        res.status(500).json({ error: 'Failed to fetch organizations' });
    }
});

/**
 * POST /api/superadmin/organizations
 * Create new organization with owner
 */
router.post('/organizations', verifySuperadmin, async (req: SuperadminRequest, res: Response) => {
    try {
        const body = CreateOrganizationSchema.parse(req.body);

        // Check if slug is unique
        const { rows: existing } = await pool.query(
            'SELECT id FROM organizations WHERE slug = $1',
            [body.slug]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Slug already taken' });
        }

        // Use database function to create org with audit trail
        const { rows } = await pool.query(`
      SELECT * FROM create_organization_with_audit($1, $2, $3, $4, $5)
    `, [
            req.superadminId,
            body.org_name,
            body.slug,
            body.plan,
            JSON.stringify(body.quotas)
        ]);

        const { org_id, transaction_id } = rows[0];

        // TODO: Create Supabase auth user for owner
        // TODO: Send welcome email

        res.json({
            success: true,
            org_id,
            transaction_id,
            message: 'Organization created successfully'
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        console.error('Error creating organization:', error);
        res.status(500).json({ error: 'Failed to create organization' });
    }
});

/**
 * PATCH /api/superadmin/organizations/:id
 * Update organization
 */
router.patch('/organizations/:id', verifySuperadmin, async (req: SuperadminRequest, res: Response) => {
    try {
        const orgId = req.params.id;
        const updates = UpdateOrganizationSchema.parse(req.body);

        // Get current org for audit trail
        const { rows: currentOrg } = await pool.query(
            'SELECT * FROM organizations WHERE id = $1',
            [orgId]
        );

        if (currentOrg.length === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Build update query
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
                updateFields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }

        values.push(orgId);
        const query = `
      UPDATE organizations
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

        const { rows } = await pool.query(query, values);

        // Log transaction
        await pool.query(`
      INSERT INTO license_transactions (org_id, admin_id, transaction_type, quota_changes, notes)
      VALUES ($1, $2, 'quota_updated', $3, 'Manual update by superadmin')
    `, [orgId, req.superadminId, JSON.stringify(updates)]);

        // Audit log
        await pool.query(`
      SELECT log_superadmin_action($1, 'update_organization', 'organization', $2, $3, $4)
    `, [
            req.superadminId,
            orgId,
            JSON.stringify({ from: currentOrg[0], to: rows[0] }),
            req.ip
        ]);

        res.json({ success: true, organization: rows[0] });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        console.error('Error updating organization:', error);
        res.status(500).json({ error: 'Failed to update organization' });
    }
});

// ============================================================
// ROUTES: Users
// ============================================================

/**
 * GET /api/superadmin/users
 * List all users across all organizations
 */
router.get('/users', verifySuperadmin, async (req: SuperadminRequest, res: Response) => {
    try {
        const { rows } = await pool.query(`
      SELECT 
        u.*,
        o.name as org_name,
        o.slug as org_slug,
        o.plan as org_plan,
        o.status as org_status
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      ORDER BY u.created_at DESC
    `);

        res.json({ users: rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * POST /api/superadmin/users/impersonate
 * Start impersonation session
 */
router.post('/users/impersonate', verifySuperadmin, async (req: SuperadminRequest, res: Response) => {
    try {
        const { user_id } = ImpersonateUserSchema.parse(req.body);

        // Get user details
        const { rows: userRows } = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [user_id]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userRows[0];

        // Create impersonation log
        const { rows } = await pool.query(`
      INSERT INTO impersonation_logs (admin_id, target_user_id, target_org_id, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
            req.superadminId,
            user_id,
            user.org_id,
            req.ip,
            req.headers['user-agent']
        ]);

        const impersonationId = rows[0].id;

        // Audit log
        await pool.query(`
      SELECT log_superadmin_action($1, 'impersonate_user', 'user', $2, $3, $4)
    `, [
            req.superadminId,
            user_id,
            JSON.stringify({ impersonation_id: impersonationId }),
            req.ip
        ]);

        // Return impersonation token (in real app, this would be a JWT)
        res.json({
            success: true,
            impersonation_id: impersonationId,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                org_id: user.org_id,
                role: user.role
            }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        console.error('Error starting impersonation:', error);
        res.status(500).json({ error: 'Failed to start impersonation' });
    }
});

/**
 * POST /api/superadmin/users/impersonate/end
 * End impersonation session
 */
router.post('/users/impersonate/end', verifySuperadmin, async (req: SuperadminRequest, res: Response) => {
    try {
        const { impersonation_id } = req.body;

        await pool.query(`
      UPDATE impersonation_logs
      SET ended_at = NOW(),
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::integer
      WHERE id = $1
    `, [impersonation_id]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error ending impersonation:', error);
        res.status(500).json({ error: 'Failed to end impersonation' });
    }
});

// ============================================================
// ROUTES: Platform Stats
// ============================================================

/**
 * GET /api/superadmin/stats
 * Get platform-wide statistics
 */
router.get('/stats', verifySuperadmin, async (req: SuperadminRequest, res: Response) => {
    try {
        const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM organizations WHERE status = 'active') as active_orgs,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
        (SELECT COUNT(*) FROM knowledge_bases) as total_kbs,
        (SELECT COUNT(*) FROM runs) as total_runs,
        (SELECT COUNT(*) FROM runs WHERE created_at >= NOW() - INTERVAL '30 days') as runs_last_30_days,
        (SELECT COUNT(*) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '30 days') as events_last_30_days,
        (SELECT SUM(current_kbs_count) FROM organizations) as total_kbs_count,
        (SELECT SUM(runs_this_month) FROM organizations) as runs_this_month
    `);

        // Calculate MRR
        const { rows: mrrRows } = await pool.query(`
      SELECT
        SUM(CASE 
          WHEN plan = 'starter' THEN 99
          WHEN plan = 'pro' THEN 299
          ELSE 0
        END) as mrr
      FROM organizations
      WHERE status = 'active'
    `);

        res.json({
            stats: {
                ...rows[0],
                mrr_usd: mrrRows[0].mrr || 0
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ============================================================
// ROUTES: License Transactions
// ============================================================

/**
 * GET /api/superadmin/licenses/transactions
 * Get license transaction history
 */
router.get('/licenses/transactions', verifySuperadmin, async (req: SuperadminRequest, res: Response) => {
    try {
        const { rows } = await pool.query(`
      SELECT 
        lt.*,
        o.name as org_name,
        o.slug as org_slug,
        pa.email as admin_email
      FROM license_transactions lt
      JOIN organizations o ON lt.org_id = o.id
      LEFT JOIN platform_admins pa ON lt.admin_id = pa.id
      ORDER BY lt.created_at DESC
      LIMIT 100
    `);

        res.json({ transactions: rows });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// ============================================================
// ROUTES: Audit Log
// ============================================================

/**
 * GET /api/superadmin/audit-log
 * Get superadmin audit log
 */
router.get('/audit-log', verifySuperadmin, async (req: SuperadminRequest, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;

        const { rows } = await pool.query(`
      SELECT 
        al.*,
        pa.email as admin_email,
        pa.full_name as admin_name
      FROM superadmin_audit_log al
      JOIN platform_admins pa ON al.admin_id = pa.id
      ORDER BY al.created_at DESC
      LIMIT $1
    `, [limit]);

        res.json({ audit_log: rows });
    } catch (error) {
        console.error('Error fetching audit log:', error);
        res.status(500).json({ error: 'Failed to fetch audit log' });
    }
});

export default router;
