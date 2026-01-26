import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { brainConfigService } from '@/services/brain/BrainConfigService'
import { getSuperadmin } from '@/lib/superadmin-middleware'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const updateBrainSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    version: z.string().regex(/^\d+\.\d+\.\d+/).optional(),
    description: z.string().optional(),
    config: z.any().optional(), // Same structure as create, but optional
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    pricingTier: z.enum(['echii', 'pulz', 'quanta']).optional(),
    metadata: z.record(z.any()).optional()
})

// ============================================================
// GET /api/superadmin/brains/[id]
// Get specific brain template
// ============================================================

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Authenticate
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Superadmin access required' },
                { status: 401 }
            )
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(params.id)) {
            return NextResponse.json(
                { error: 'Invalid brain template ID format' },
                { status: 400 }
            )
        }

        // Fetch template
        const template = await brainConfigService.getTemplate(params.id)

        if (!template) {
            return NextResponse.json(
                { error: 'Brain template not found' },
                { status: 404 }
            )
        }

        // Get version history
        const history = await brainConfigService.getVersionHistory(params.id, 10)

        // Get performance metrics (last 30 days)
        const metrics = await brainConfigService.getPerformanceMetrics(params.id, 30)

        return NextResponse.json({
            template,
            history,
            metrics
        })
    } catch (error: any) {
        console.error(`GET /api/superadmin/brains/${params.id} failed:`, error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

// ============================================================
// PATCH /api/superadmin/brains/[id]
// Update brain template
// ============================================================

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Authenticate
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Superadmin access required' },
                { status: 401 }
            )
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(params.id)) {
            return NextResponse.json(
                { error: 'Invalid brain template ID format' },
                { status: 400 }
            )
        }

        // Check template exists
        const existing = await brainConfigService.getTemplate(params.id)
        if (!existing) {
            return NextResponse.json(
                { error: 'Brain template not found' },
                { status: 404 }
            )
        }

        // Parse and validate request body
        const body = await req.json()
        const validated = updateBrainSchema.parse(body)

        // Update template
        const template = await brainConfigService.updateTemplate(
            params.id,
            validated,
            admin.id
        )

        return NextResponse.json({ template })
    } catch (error: any) {
        // Zod validation error
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                },
                { status: 400 }
            )
        }

        // Unique constraint violation
        if (error.message?.includes('duplicate') || error.code === '23505') {
            return NextResponse.json(
                { error: 'A brain template with this name and version already exists' },
                { status: 409 }
            )
        }

        console.error(`PATCH /api/superadmin/brains/${params.id} failed:`, error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

// ============================================================
// DELETE /api/superadmin/brains/[id]
// Deactivate brain template (soft delete)
// ============================================================

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Authenticate
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Superadmin access required' },
                { status: 401 }
            )
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(params.id)) {
            return NextResponse.json(
                { error: 'Invalid brain template ID format' },
                { status: 400 }
            )
        }

        // Check template exists
        const existing = await brainConfigService.getTemplate(params.id)
        if (!existing) {
            return NextResponse.json(
                { error: 'Brain template not found' },
                { status: 404 }
            )
        }

        // Check if it's the default brain
        if (existing.isDefault) {
            return NextResponse.json(
                { error: 'Cannot deactivate the default brain template' },
                { status: 400 }
            )
        }

        // Deactivate template
        await brainConfigService.deactivateTemplate(params.id, admin.id)

        return NextResponse.json({
            success: true,
            message: 'Brain template deactivated successfully'
        })
    } catch (error: any) {
        console.error(`DELETE /api/superadmin/brains/${params.id} failed:`, error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
