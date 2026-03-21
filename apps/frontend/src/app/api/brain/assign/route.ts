/**
 * Brain Assignment API
 * 
 * API for assigning brains to users and configuring AI providers
 * 
 * POST /api/brain/assign - Assign brain to user
 * GET /api/brain/config/:brainId - Get brain AI configuration
 * PUT /api/brain/config/:brainId - Update brain AI configuration
 * 
 * @author Anwesh Rath
 * @date 2026-01-16
 */

import { NextRequest, NextResponse } from 'next/server'
import { brainAIConfigService } from '@/services/brain/BrainAIConfigService'
import { createClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/requireFeature'

/**
 * POST /api/brain/assign
 * Assign brain template to user (creates clone)
 */
export async function POST(request: NextRequest) {
    try {
        const gate = await requireFeature(request, 'can_train_brain')
        if (gate.denied) return gate.response

        const supabase = createClient()

        // Verify authentication
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { userId, organizationId, brainTemplateId } = body

        // Validate required fields
        if (!userId || !organizationId || !brainTemplateId) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, organizationId, brainTemplateId' },
                { status: 400 }
            )
        }

        // Verify permissions (only superadmin or org admin can assign brains)
        const { data: admin } = await supabase
            .from('platform_admins')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!admin) {
            // Check if user is org admin
            const { data: orgUser } = await supabase
                .from('organization_users')
                .select('role')
                .eq('user_id', user.id)
                .eq('organization_id', organizationId)
                .single()

            if (!orgUser || orgUser.role !== 'admin') {
                return NextResponse.json(
                    { error: 'Insufficient permissions' },
                    { status: 403 }
                )
            }
        }

        // Assign brain to user
        const assignment = await brainAIConfigService.assignBrainToUser(
            userId,
            organizationId,
            brainTemplateId
        )

        return NextResponse.json({
            success: true,
            assignment,
            message: `Brain assigned successfully. Workers will handle initialization.`
        })

    } catch (error: any) {
        console.error('Brain assignment error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to assign brain' },
            { status: 500 }
        )
    }
}

/**
 * GET /api/brain/assign?userId=xxx&organizationId=xxx
 * Get user's active brain
 */
export async function GET(request: NextRequest) {
    try {
        const gate = await requireFeature(request, 'can_train_brain')
        if (gate.denied) return gate.response

        const supabase = createClient()

        // Verify authentication
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')
        const organizationId = searchParams.get('organizationId')

        if (!userId || !organizationId) {
            return NextResponse.json(
                { error: 'Missing userId or organizationId' },
                { status: 400 }
            )
        }

        const brainId = await brainAIConfigService.getUserBrain(userId, organizationId)

        if (!brainId) {
            return NextResponse.json(
                { hasBrain: false, brainId: null },
                { status: 200 }
            )
        }

        // Get brain config
        const config = await brainAIConfigService.getBrainAIConfig(brainId)

        return NextResponse.json({
            hasBrain: true,
            brainId,
            config
        })

    } catch (error: any) {
        console.error('Get brain error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to get brain' },
            { status: 500 }
        )
    }
}
