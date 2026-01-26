/**
 * Brain AI Configuration API
 * 
 * Manages AI provider configuration for individual brain instances
 * Handles GET/PUT operations for brain-specific AI settings
 * 
 * @route /api/brain/config/[brainId]
 * @author Anwesh Rath
 * @date 2026-01-16
 */

import { NextRequest, NextResponse } from 'next/server'
import { brainAIConfigService } from '@/services/brain/BrainAIConfigService'
import type { BrainAIConfig } from '@/services/brain/BrainAIConfigService'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/brain/config/[brainId]
 * 
 * Retrieve AI configuration for a specific brain instance
 * 
 * @param brainId - UUID of brain instance
 * @returns BrainAIConfig | null
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { brainId: string } }
) {
    try {
        const { brainId } = params

        if (!brainId) {
            return NextResponse.json(
                { error: 'Brain ID is required' },
                { status: 400 }
            )
        }

        // TODO: Add authentication check
        // const supabase = createClient()
        // const { data: { user } } = await supabase.auth.getUser()
        // if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Fetch brain configuration
        const config = await brainAIConfigService.getBrainAIConfig(brainId)

        if (!config) {
            return NextResponse.json(
                { error: 'Brain configuration not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ config })

    } catch (error: any) {
        console.error(`Error fetching brain config for ${params.brainId}:`, error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch brain configuration' },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/brain/config/[brainId]
 * 
 * Update AI configuration for a specific brain instance
 * 
 * @body Partial<BrainAIConfig>
 * @returns { success: boolean message: string }
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { brainId: string } }
) {
    try {
        const { brainId } = params
        const body = await request.json()

        if (!brainId) {
            return NextResponse.json(
                { error: 'Brain ID is required' },
                { status: 400 }
            )
        }

        // TODO: Add authentication & authorization check
        // const supabase = createClient()
        // const { data: { user } } = await supabase.auth.getUser()
        // if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Validate request body
        const {
            preferredProvider,
            fallbackProviders,
            modelOverrides,
            maxTokens,
            temperature
        } = body

        if (!preferredProvider) {
            return NextResponse.json(
                { error: 'preferredProvider is required' },
                { status: 400 }
            )
        }

        // Validate provider types
        const validProviders = ['openai', 'anthropic', 'google', 'mistral', 'perplexity', 'xai']
        if (!validProviders.includes(preferredProvider)) {
            return NextResponse.json(
                { error: `Invalid preferred provider: ${preferredProvider}` },
                { status: 400 }
            )
        }

        if (fallbackProviders) {
            const invalidFallback = fallbackProviders.find(
                (p: string) => !validProviders.includes(p)
            )
            if (invalidFallback) {
                return NextResponse.json(
                    { error: `Invalid fallback provider: ${invalidFallback}` },
                    { status: 400 }
                )
            }
        }

        // Update configuration
        const config: BrainAIConfig = {
            brainId,
            preferredProvider,
            fallbackProviders: fallbackProviders || ['anthropic', 'google'],
            modelOverrides: modelOverrides || {},
            maxTokens: maxTokens || 2000,
            temperature: temperature ?? 0.7
        }

        await brainAIConfigService.configureBrainAI(config)

        return NextResponse.json({
            success: true,
            message: `Brain configuration updated successfully`,
            config
        })

    } catch (error: any) {
        console.error(`Error updating brain config for ${params.brainId}:`, error)
        return NextResponse.json(
            { error: error.message || 'Failed to update brain configuration' },
            { status: 500 }
        )
    }
}
