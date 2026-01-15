import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';

const router = Router();
const pool = new Pool({ connectionString: config.databaseUrl });

// JWT secret (should be in env vars in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-CHANGE-IN-PRODUCTION';
const JWT_EXPIRES_IN = '7d';

// ============================================================
// SCHEMAS
// ============================================================

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

const CreateAdminSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    full_name: z.string().min(1),
});

// ============================================================
// SUPERADMIN AUTH ROUTES
// ============================================================

/**
 * POST /api/superadmin/auth/login
 * Login as superadmin
 */
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = LoginSchema.parse(req.body);

        // Get admin from database
        const { rows } = await pool.query(
            'SELECT * FROM platform_admins WHERE email = $1 AND is_active = true',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = rows[0];

        // Verify password
        if (!admin.password_hash) {
            return res.status(401).json({ error: 'Password not set for this admin' });
        }

        const isValidPassword = await bcrypt.compare(password, admin.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                adminId: admin.id,
                email: admin.email,
                type: 'superadmin',
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Log the login
        await pool.query(
            `SELECT log_superadmin_action($1, 'login', 'platform_admin', $2, NULL, $3)`,
            [admin.id, admin.id, req.ip]
        );

        res.json({
            success: true,
            admin_id: admin.id,
            email: admin.email,
            full_name: admin.full_name,
            token,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        console.error('Superadmin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/superadmin/auth/create-admin
 * Create a new superadmin (protected - requires existing superadmin token)
 */
router.post('/create-admin', async (req: Request, res: Response) => {
    try {
        // Verify superadmin token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.substring(7);
        let decoded;

        try {
            decoded = jwt.verify(token, JWT_SECRET) as { adminId: string; type: string };
        } catch {
            return res.status(401).json({ error: 'Invalid token' });
        }

        if (decoded.type !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Parse request
        const { email, password, full_name } = CreateAdminSchema.parse(req.body);

        // Check if admin already exists
        const { rows: existing } = await pool.query(
            'SELECT id FROM platform_admins WHERE email = $1',
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Admin with this email already exists' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create admin
        const { rows } = await pool.query(
            `INSERT INTO platform_admins (email, full_name, password_hash, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id, email, full_name`,
            [email, full_name, password_hash]
        );

        const newAdmin = rows[0];

        // Log the action
        await pool.query(
            `SELECT log_superadmin_action($1, 'create_admin', 'platform_admin', $2, $3, $4)`,
            [
                decoded.adminId,
                newAdmin.id,
                JSON.stringify({ email, full_name }),
                req.ip
            ]
        );

        res.json({
            success: true,
            admin: {
                id: newAdmin.id,
                email: newAdmin.email,
                full_name: newAdmin.full_name,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        console.error('Create admin error:', error);
        res.status(500).json({ error: 'Failed to create admin' });
    }
});

/**
 * POST /api/superadmin/auth/logout
 * Logout (client-side token removal, server-side logging)
 */
router.post('/logout', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);

            try {
                const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string };

                // Log the logout
                await pool.query(
                    `SELECT log_superadmin_action($1, 'logout', 'platform_admin', $2, NULL, $3)`,
                    [decoded.adminId, decoded.adminId, req.ip]
                );
            } catch {
                // Token invalid, but that's ok for logout
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

/**
 * POST /api/superadmin/auth/verify
 * Verify if token is valid
 */
router.post('/verify', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string; email: string; type: string };

        if (decoded.type !== 'superadmin') {
            return res.status(403).json({ error: 'Not a superadmin token' });
        }

        // Check if admin still exists and is active
        const { rows } = await pool.query(
            'SELECT id, email, full_name FROM platform_admins WHERE id = $1 AND is_active = true',
            [decoded.adminId]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Admin not found or inactive' });
        }

        res.json({
            valid: true,
            admin: rows[0],
        });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        console.error('Token verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

export default router;
