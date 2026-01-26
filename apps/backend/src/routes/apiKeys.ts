/**
 * API KEY ROUTES
 * ==============
 * RESTful API for managing API keys
 */

import { Router, Request, Response } from 'express';
import { apiKeyService } from '../services/apiKey/apiKeyService';

const router = Router();

// ============================================================================
// VALIDATION ENDPOINT (for external systems)
// ============================================================================

/**
 * POST /api/keys/validate
 * Validate an API key and return user/engine info
 * This is the main endpoint external systems use to authenticate
 */
router.post('/validate', async (req: Request, res: Response) => {
    try {
        const { apiKey } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        const result = await apiKeyService.validateAPIKey(apiKey);

        if (!result.valid) {
            return res.status(401).json({
                valid: false,
                error: result.error
            });
        }

        res.json(result);
    } catch (error: any) {
        console.error('Error validating API key:', error);
        res.status(500).json({ error: 'Failed to validate API key' });
    }
});

// ============================================================================
// KEY MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/keys
 * List API keys (filtered by user or engine)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { userId, engineId } = req.query;

        if (userId) {
            const keys = await apiKeyService.getUserAPIKeys(userId as string);
            return res.json({ keys });
        }

        if (engineId) {
            const keys = await apiKeyService.getEngineAPIKeys(engineId as string);
            return res.json({ keys });
        }

        res.status(400).json({ error: 'userId or engineId query parameter required' });
    } catch (error: any) {
        console.error('Error listing API keys:', error);
        res.status(500).json({ error: 'Failed to list API keys' });
    }
});

/**
 * GET /api/keys/:id
 * Get a specific API key by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const key = await apiKeyService.getAPIKey(req.params.id);

        if (!key) {
            return res.status(404).json({ error: 'API key not found' });
        }

        res.json({ key });
    } catch (error: any) {
        console.error('Error getting API key:', error);
        res.status(500).json({ error: 'Failed to get API key' });
    }
});

/**
 * POST /api/keys
 * Create a new API key
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const {
            userId,
            engineId,
            orgId,
            keyType,
            permissions,
            name,
            description,
            expiresAt,
            rateLimitPerMinute,
            rateLimitPerDay,
            createdBy,
            metadata
        } = req.body;

        if (!userId || !engineId) {
            return res.status(400).json({ error: 'userId and engineId are required' });
        }

        const keyRecord = await apiKeyService.createAPIKey({
            userId,
            engineId,
            orgId,
            keyType,
            permissions,
            name,
            description,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            rateLimitPerMinute,
            rateLimitPerDay,
            createdBy,
            metadata
        });

        res.status(201).json({
            success: true,
            message: 'API key created',
            key: keyRecord
        });
    } catch (error: any) {
        console.error('Error creating API key:', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
});

/**
 * POST /api/keys/:apiKey/revoke
 * Revoke (deactivate) an API key
 */
router.post('/:apiKey/revoke', async (req: Request, res: Response) => {
    try {
        const success = await apiKeyService.revokeAPIKey(req.params.apiKey);

        if (!success) {
            return res.status(404).json({ error: 'API key not found' });
        }

        res.json({ success: true, message: 'API key revoked' });
    } catch (error: any) {
        console.error('Error revoking API key:', error);
        res.status(500).json({ error: 'Failed to revoke API key' });
    }
});

/**
 * POST /api/keys/:apiKey/regenerate
 * Regenerate an API key (creates new key, invalidates old)
 */
router.post('/:apiKey/regenerate', async (req: Request, res: Response) => {
    try {
        const newApiKey = await apiKeyService.regenerateAPIKey(req.params.apiKey);

        if (!newApiKey) {
            return res.status(404).json({ error: 'API key not found' });
        }

        res.json({
            success: true,
            message: 'API key regenerated',
            apiKey: newApiKey
        });
    } catch (error: any) {
        console.error('Error regenerating API key:', error);
        res.status(500).json({ error: 'Failed to regenerate API key' });
    }
});

/**
 * DELETE /api/keys/:id
 * Delete an API key permanently
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const success = await apiKeyService.deleteAPIKey(req.params.id);

        if (!success) {
            return res.status(404).json({ error: 'API key not found' });
        }

        res.json({ success: true, message: 'API key deleted' });
    } catch (error: any) {
        console.error('Error deleting API key:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

// ============================================================================
// ENGINE ASSIGNMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/keys/assign
 * Assign an engine to a user and create their API key
 */
router.post('/assign', async (req: Request, res: Response) => {
    try {
        const { engineId, userId, orgId, permissions, keyName, assignedBy } = req.body;

        if (!engineId || !userId) {
            return res.status(400).json({ error: 'engineId and userId are required' });
        }

        const result = await apiKeyService.assignEngineToUser(engineId, userId, {
            orgId,
            permissions,
            keyName,
            assignedBy
        });

        res.status(201).json({
            success: true,
            message: 'Engine assigned to user',
            apiKey: result.apiKey,
            keyRecord: result.keyRecord
        });
    } catch (error: any) {
        console.error('Error assigning engine:', error);
        res.status(500).json({ error: 'Failed to assign engine' });
    }
});

/**
 * POST /api/keys/unassign
 * Remove a user's access to an engine
 */
router.post('/unassign', async (req: Request, res: Response) => {
    try {
        const { engineId, userId } = req.body;

        if (!engineId || !userId) {
            return res.status(400).json({ error: 'engineId and userId are required' });
        }

        const success = await apiKeyService.removeEngineAccess(engineId, userId);

        if (!success) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        res.json({ success: true, message: 'Engine access removed' });
    } catch (error: any) {
        console.error('Error unassigning engine:', error);
        res.status(500).json({ error: 'Failed to unassign engine' });
    }
});

// ============================================================================
// STATISTICS ENDPOINT
// ============================================================================

/**
 * GET /api/keys/stats
 * Get API key statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats = await apiKeyService.getAPIKeyStats();
        res.json(stats);
    } catch (error: any) {
        console.error('Error getting API key stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

export default router;
