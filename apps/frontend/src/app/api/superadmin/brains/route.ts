import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { brainConfigService } from '@/services/brain/BrainConfigService'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const createBrainSchema = z.object({
    name: z.string().min(1).max(255),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in format X.Y.Z'),
    description: z.string().optional(),
    config: z.object({
        providers: z.object({
            chat: z.string().nullable(),
            embeddings: z.string().nullable(),
            completion: z.string().nullable().optional(),
            vision: z.string().nullable().optional()
        }),
        agents: z.record(z.object({
            systemPrompt: z.string(),
            temperature: z.number().min(0).max(2),
            maxTokens: z.number().positive(),
            tools: z.array(z.string()),
            providerId: z.string().nullable().optional()
        })),
        rag: z.object({
            enabled: z.boolean(),
            topK: z.number().positive(),
            minSimilarity: z.number().min(0).max(1),
            rerankingEnabled: z.boolean(),
            hybridSearch: z.boolean(),
            weights: z.object({
                vector: z.number().min(0).max(1),
                fts: z.number().min(0).max(1)
            }),
            graphMemory: z.boolean().optional(),
            causalReasoning: z.boolean().optional()
        }),
        memory: z.object({
            maxContextTokens: z.number().positive(),
            maxMemoryTokens: z.number().positive(),
            conversationWindowSize: z.number().positive(),
            enableSummarization: z.boolean(),
            temporalMemory: z.boolean().optional(),
            causalReasoning: z.boolean().optional(),
            graphMemory: z.boolean().optional()
        }),
        limits: z.object({
            maxRequestsPerMinute: z.number().positive(),
            maxTokensPerDay: z.number().positive()
        }),
        features: z.object({
            multiAgent: z.boolean().optional(),
            streamingEnabled: z.boolean().optional(),
            contentAnalysis: z.boolean().optional(),
            multiModal: z.boolean().optional(),
            rlhf: z.boolean().optional(),
            abTesting: z.boolean().optional(),
            customTools: z.boolean().optional(),
            advancedAnalytics: z.boolean().optional(),
            apiAccess: z.boolean().optional(),
            prioritySupport: z.boolean().optional()
        }).optional()
    }),
    pricingTier: z.enum(['echii', 'pulz', 'quanta']),
    isDefault: z.boolean().optional(),
    metadata: z.record(z.any()).optional()
})

// ============================================================
// AUTHENTICATION HELPER
// ============================================================

async function requireSuperadmin(req: NextRequest) {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
        return null
    }

    // Check if user is superadmin
    const { data: admin, error: adminError } = await supabase
        .from('platform_admins')
        .select('id, email')
        .eq('email', user.email)
        .single()

    if (adminError || !admin) {
        return null
    }

    return admin
}

// ============================================================
// GET /api/superadmin/brains
// List all brain templates
// ============================================================

export async function GET(req: NextRequest) {
    try {
        // Authenticate
        const admin = await requireSuperadmin(req)
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Superadmin access required' },
                { status: 401 }
            )
        }

        // Get query parameters
        const { searchParams } = new URL(req.url)
        const tier = searchParams.get('tier') as 'echii' | 'pulz' | 'quanta' | null

        // Validate tier if provided
        if (tier && !['echii', 'pulz', 'quanta'].includes(tier)) {
            return NextResponse.json(
                { error: 'Invalid tier. Must be echii, pulz, or quanta' },
                { status: 400 }
            )
        }

        // Fetch templates
        const templates = await brainConfigService.listTemplates(tier || undefined)

        return NextResponse.json({
            brains: templates,
            templates, // Keep for backwards compatibility
            count: templates.length
        })
    } catch (error: any) {
        console.error('GET /api/superadmin/brains failed:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

// ============================================================
// POST /api/superadmin/brains
// Create new brain template
// ============================================================

export async function POST(req: NextRequest) {
    try {
        // Authenticate
        const admin = await requireSuperadmin(req)
        if (!admin) {
            return NextResponse.json(
                { error: 'Unauthorized - Superadmin access required' },
                { status: 401 }
            )
        }

        // Parse and validate request body
        const body = await req.json()
        const validated = createBrainSchema.parse(body)

        // Create template
        const template = await brainConfigService.createTemplate(
            {
                name: validated.name,
                version: validated.version,
                description: validated.description || '',
                config: validated.config,
                isActive: true,
                isDefault: validated.isDefault || false,
                pricingTier: validated.pricingTier,
                metadata: validated.metadata || {}
            },
            admin.id
        )

        return NextResponse.json(
            { template },
            { status: 201 }
        )
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

        // Unique constraint violation (duplicate name/version)
        if (error.message?.includes('duplicate') || error.code === '23505') {
            return NextResponse.json(
                { error: 'A brain template with this name and version already exists' },
                { status: 409 }
            )
        }

        console.error('POST /api/superadmin/brains failed:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
