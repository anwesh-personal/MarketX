/**
 * GET /api/writer/config
 *
 * Returns Writer-specific configuration from the active deployed engine.
 * This replaces all hardcoded constants in the Writer /new page.
 *
 * Phase 5 of Engine Unification Plan.
 *
 * Returns: angle_classes, flow_goals, email_count_options, email_defaults
 * from the engine's config (set in Engine Bundle, frozen at deploy time).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveEngineRuntime } from '@/services/engine/EngineInstanceResolver'
import { requireFeature } from '@/lib/requireFeature'

export async function GET(req: NextRequest) {
    try {
        const gate = await requireFeature(req, 'can_write_emails')
        if (gate.denied) return gate.response

        const orgId = gate.orgId
        const userId = gate.userId

        const engineRuntime = await getActiveEngineRuntime(orgId, userId)

        if (!engineRuntime) {
            return NextResponse.json({
                success: true,
                config: null,
                message: 'No engine deployed. Using system defaults.',
            })
        }

        return NextResponse.json({
            success: true,
            config: engineRuntime.writerConfig,
            engine: {
                id: engineRuntime.engineInstanceId,
                name: engineRuntime.engineName,
                bundleId: engineRuntime.bundleId,
                apiKeyMode: engineRuntime.apiKeyMode,
            },
        })
    } catch (error: any) {
        console.error('Writer config error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to load writer config' },
            { status: 500 }
        )
    }
}
