/**
 * API KEY SERVICE
 * ================
 * Manages API keys for engine access
 * Ported from Lekhika - Production Grade
 * 
 * Features:
 * - Generate unique API keys (AXIOM-{user}-{engine}-{timestamp}-{random})
 * - Validate API keys and return user/engine info
 * - Track usage and last used timestamps
 * - Revoke and regenerate keys
 * - Rate limiting support
 */

import { Pool } from 'pg';
import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface APIKeyRecord {
    id: string;
    user_id: string;
    engine_id: string;
    org_id: string | null;
    api_key: string;
    key_type: 'engine_access' | 'admin' | 'system' | 'webhook';
    permissions: string[];
    is_active: boolean;
    usage_count: number;
    last_used_at: string | null;
    rate_limit_per_minute: number;
    rate_limit_per_day: number;
    expires_at: string | null;
    name: string | null;
    description: string | null;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

export interface APIKeyValidationResult {
    valid: boolean;
    error?: string;
    user_id?: string;
    engine_id?: string;
    org_id?: string | null;
    engine_name?: string;
    permissions?: string[];
    usage_count?: number;
    flow_config?: any;
}

export interface CreateAPIKeyOptions {
    userId: string;
    engineId: string;
    orgId?: string | null;
    keyType?: 'engine_access' | 'admin' | 'system' | 'webhook';
    permissions?: string[];
    name?: string;
    description?: string;
    expiresAt?: Date | null;
    rateLimitPerMinute?: number;
    rateLimitPerDay?: number;
    createdBy?: string | null;
    metadata?: Record<string, any>;
}

// ============================================================================
// API KEY SERVICE CLASS
// ============================================================================

class APIKeyService {
    private pool: Pool | null = null;
    private readonly keyPrefix = 'AXIOM-';

    /**
     * Initialize with database pool
     */
    initialize(pool: Pool): void {
        this.pool = pool;
        console.log('✅ APIKeyService initialized');
    }

    private getPool(): Pool {
        if (!this.pool) {
            throw new Error('APIKeyService not initialized. Call initialize(pool) first.');
        }
        return this.pool;
    }

    // ========================================================================
    // KEY GENERATION
    // ========================================================================

    /**
     * Generate a unique API key
     * Format: AXIOM-{user_id_slice}-{engine_id_slice}-{timestamp}-{random}
     */
    generateAPIKey(userId: string, engineId: string): string {
        const timestamp = Date.now().toString(36);
        const randomPart = crypto.randomBytes(8).toString('hex');

        const key = `${this.keyPrefix}${userId.slice(0, 8)}-${engineId.slice(0, 8)}-${timestamp}-${randomPart}`;

        console.log('🔑 Generated API key:', key.slice(0, 20) + '...');
        return key;
    }

    /**
     * Validate API key format
     */
    validateKeyFormat(apiKey: string): boolean {
        const pattern = new RegExp(`^${this.keyPrefix}[a-f0-9-]+-[a-z0-9]+-[a-f0-9]{16}$`);
        return pattern.test(apiKey);
    }

    // ========================================================================
    // CRUD OPERATIONS
    // ========================================================================

    /**
     * Create a new API key for user-engine combination
     */
    async createAPIKey(options: CreateAPIKeyOptions): Promise<APIKeyRecord> {
        const pool = this.getPool();

        const {
            userId,
            engineId,
            orgId = null,
            keyType = 'engine_access',
            permissions = ['execute', 'read'],
            name,
            description,
            expiresAt = null,
            rateLimitPerMinute = 60,
            rateLimitPerDay = 10000,
            createdBy = null,
            metadata = {}
        } = options;

        const apiKey = this.generateAPIKey(userId, engineId);

        // Get engine name for default key name
        const engineResult = await pool.query(
            'SELECT name FROM engine_instances WHERE id = $1',
            [engineId]
        );
        const engineName = engineResult.rows[0]?.name || 'Engine';

        const result = await pool.query(
            `INSERT INTO user_api_keys (
                user_id, engine_id, org_id, api_key, key_type, permissions,
                name, description, expires_at, rate_limit_per_minute, rate_limit_per_day,
                created_by, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (user_id, engine_id) 
            DO UPDATE SET 
                api_key = EXCLUDED.api_key,
                is_active = true,
                updated_at = now()
            RETURNING *`,
            [
                userId,
                engineId,
                orgId,
                apiKey,
                keyType,
                permissions,
                name || `${engineName} Access Key`,
                description,
                expiresAt,
                rateLimitPerMinute,
                rateLimitPerDay,
                createdBy,
                JSON.stringify(metadata)
            ]
        );

        console.log('✅ API key created for user:', userId, 'engine:', engineId);
        return result.rows[0];
    }

    /**
     * Validate API key and return user/engine info
     */
    async validateAPIKey(apiKey: string): Promise<APIKeyValidationResult> {
        const pool = this.getPool();

        // Basic format check
        if (!apiKey.startsWith(this.keyPrefix)) {
            return { valid: false, error: 'Invalid API key format' };
        }

        const result = await pool.query(
            `SELECT 
                k.*,
                e.name as engine_name,
                e.status as engine_status,
                e.flow_config
            FROM user_api_keys k
            JOIN engine_instances e ON k.engine_id = e.id
            WHERE k.api_key = $1
            AND k.is_active = true
            AND (k.expires_at IS NULL OR k.expires_at > now())`,
            [apiKey]
        );

        if (result.rows.length === 0) {
            return { valid: false, error: 'Invalid or expired API key' };
        }

        const keyRecord = result.rows[0];

        // Check if engine is active
        if (keyRecord.engine_status !== 'active') {
            return { valid: false, error: 'Engine is not active' };
        }

        // Update usage
        await pool.query(
            `UPDATE user_api_keys 
            SET usage_count = usage_count + 1, last_used_at = now()
            WHERE api_key = $1`,
            [apiKey]
        );

        return {
            valid: true,
            user_id: keyRecord.user_id,
            engine_id: keyRecord.engine_id,
            org_id: keyRecord.org_id,
            engine_name: keyRecord.engine_name,
            permissions: keyRecord.permissions,
            usage_count: keyRecord.usage_count + 1,
            flow_config: keyRecord.flow_config
        };
    }

    /**
     * Get all API keys for a user
     */
    async getUserAPIKeys(userId: string): Promise<APIKeyRecord[]> {
        const pool = this.getPool();

        const result = await pool.query(
            `SELECT k.*, e.name as engine_name, e.status as engine_status
            FROM user_api_keys k
            JOIN engine_instances e ON k.engine_id = e.id
            WHERE k.user_id = $1
            ORDER BY k.created_at DESC`,
            [userId]
        );

        return result.rows;
    }

    /**
     * Get all API keys for an engine
     */
    async getEngineAPIKeys(engineId: string): Promise<APIKeyRecord[]> {
        const pool = this.getPool();

        const result = await pool.query(
            `SELECT * FROM user_api_keys
            WHERE engine_id = $1
            ORDER BY created_at DESC`,
            [engineId]
        );

        return result.rows;
    }

    /**
     * Get API key by ID
     */
    async getAPIKey(keyId: string): Promise<APIKeyRecord | null> {
        const pool = this.getPool();

        const result = await pool.query(
            'SELECT * FROM user_api_keys WHERE id = $1',
            [keyId]
        );

        return result.rows[0] || null;
    }

    /**
     * Revoke (deactivate) an API key
     */
    async revokeAPIKey(apiKey: string): Promise<boolean> {
        const pool = this.getPool();

        const result = await pool.query(
            `UPDATE user_api_keys 
            SET is_active = false, updated_at = now()
            WHERE api_key = $1
            RETURNING id`,
            [apiKey]
        );

        const success = (result.rowCount ?? 0) > 0;
        if (success) {
            console.log('✅ API key revoked:', apiKey.slice(0, 20) + '...');
        }
        return success;
    }

    /**
     * Regenerate API key (creates new key, invalidates old)
     */
    async regenerateAPIKey(apiKey: string): Promise<string | null> {
        const pool = this.getPool();

        // Get existing key record
        const existing = await pool.query(
            'SELECT * FROM user_api_keys WHERE api_key = $1',
            [apiKey]
        );

        if (existing.rows.length === 0) {
            return null;
        }

        const record = existing.rows[0];
        const newApiKey = this.generateAPIKey(record.user_id, record.engine_id);

        await pool.query(
            `UPDATE user_api_keys 
            SET api_key = $1, usage_count = 0, updated_at = now()
            WHERE api_key = $2`,
            [newApiKey, apiKey]
        );

        console.log('✅ API key regenerated:', newApiKey.slice(0, 20) + '...');
        return newApiKey;
    }

    /**
     * Delete API key permanently
     */
    async deleteAPIKey(keyId: string): Promise<boolean> {
        const pool = this.getPool();

        const result = await pool.query(
            'DELETE FROM user_api_keys WHERE id = $1 RETURNING id',
            [keyId]
        );

        return (result.rowCount ?? 0) > 0;
    }

    // ========================================================================
    // STATISTICS
    // ========================================================================

    /**
     * Get API key statistics
     */
    async getAPIKeyStats(): Promise<{
        total: number;
        active: number;
        revoked: number;
        totalUsage: number;
        byType: Record<string, number>;
    }> {
        const pool = this.getPool();

        const result = await pool.query(
            `SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_active = true) as active,
                COUNT(*) FILTER (WHERE is_active = false) as revoked,
                COALESCE(SUM(usage_count), 0) as total_usage,
                COUNT(*) FILTER (WHERE key_type = 'engine_access') as engine_access_count,
                COUNT(*) FILTER (WHERE key_type = 'admin') as admin_count,
                COUNT(*) FILTER (WHERE key_type = 'system') as system_count,
                COUNT(*) FILTER (WHERE key_type = 'webhook') as webhook_count
            FROM user_api_keys`
        );

        const row = result.rows[0];

        return {
            total: parseInt(row.total),
            active: parseInt(row.active),
            revoked: parseInt(row.revoked),
            totalUsage: parseInt(row.total_usage),
            byType: {
                engine_access: parseInt(row.engine_access_count),
                admin: parseInt(row.admin_count),
                system: parseInt(row.system_count),
                webhook: parseInt(row.webhook_count)
            }
        };
    }

    // ========================================================================
    // ENGINE ASSIGNMENT
    // ========================================================================

    /**
     * Assign engine to user and create API key
     * This is the main function for giving a user access to an engine
     */
    async assignEngineToUser(
        engineId: string,
        userId: string,
        options: {
            orgId?: string | null;
            permissions?: string[];
            keyName?: string;
            assignedBy?: string;
        } = {}
    ): Promise<{ apiKey: string; keyRecord: APIKeyRecord }> {

        const keyRecord = await this.createAPIKey({
            userId,
            engineId,
            orgId: options.orgId,
            permissions: options.permissions || ['execute', 'read'],
            name: options.keyName,
            createdBy: options.assignedBy
        });

        return {
            apiKey: keyRecord.api_key,
            keyRecord
        };
    }

    /**
     * Remove user's access to an engine (revoke their API key)
     */
    async removeEngineAccess(engineId: string, userId: string): Promise<boolean> {
        const pool = this.getPool();

        const result = await pool.query(
            `UPDATE user_api_keys 
            SET is_active = false, updated_at = now()
            WHERE engine_id = $1 AND user_id = $2
            RETURNING id`,
            [engineId, userId]
        );

        return (result.rowCount ?? 0) > 0;
    }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const apiKeyService = new APIKeyService();
export default apiKeyService;
