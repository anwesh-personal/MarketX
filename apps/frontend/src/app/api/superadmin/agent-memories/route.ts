/**
 * POST /api/superadmin/agent-memories
 *
 * Saves an instruction/correction to brain_memories with specified importance and scope.
 * Used by superadmin from Agent Chat tab to persist instructions for the brain.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const SEVERITY_TO_IMPORTANCE: Record<string, number> = {
    low: 0.3,
    medium: 0.6,
    high: 0.9,
    critical: 1.0,
}

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'just', 'because', 'but', 'and', 'or', 'if', 'while', 'that', 'this',
    'it', 'its', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she',
    'they', 'them', 'their', 'what', 'which', 'who', 'whom',
])

/**
 * Extract meaningful keywords from content for the GIN index.
 * Lightweight, deterministic, no LLM needed.
 */
function extractKeywords(content: string): string[] {
    return [...new Set(
        content
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
    )].slice(0, 20)
}

/**
 * Generate a single-sentence summary by taking the first sentence
 * or the first 200 characters, whichever is shorter.
 */
function generateSummary(content: string): string {
    const trimmed = content.trim()
    const firstSentenceEnd = trimmed.search(/[.!?]\s/)
    if (firstSentenceEnd > 0 && firstSentenceEnd < 300) {
        return trimmed.slice(0, firstSentenceEnd + 1)
    }
    if (trimmed.length <= 200) return trimmed
    return trimmed.slice(0, 197) + '...'
}

const bodySchema = z.object({
    orgId: z.string().uuid(),
    content: z.string().min(1).max(10000),
    severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    memoryType: z.enum(['fact', 'correction']).default('correction'),
    scope: z.enum(['org', 'user', 'global']).default('org'),
    agentId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
    try {
        const admin = await getSuperadmin(req)
        if (!admin) {
            return NextResponse.json({ error: 'Unauthorized - Superadmin access required' }, { status: 401 })
        }

        const body = await req.json()
        const parsed = bodySchema.parse(body)

        const importance = SEVERITY_TO_IMPORTANCE[parsed.severity] ?? 0.6

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: row, error } = await supabase
            .from('brain_memories')
            .insert({
                org_id: parsed.orgId,
                agent_id: parsed.agentId ?? null,
                user_id: parsed.userId ?? null,
                scope: parsed.scope,
                memory_type: parsed.memoryType,
                content: parsed.content.trim(),
                summary: generateSummary(parsed.content),
                keywords: extractKeywords(parsed.content),
                importance,
                is_active: true,
            })
            .select('id, content, memory_type, importance, scope, created_at')
            .single()

        if (error) {
            console.error('agent-memories insert error:', error)
            return NextResponse.json(
                { error: error.message || 'Failed to save instruction' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            id: row.id,
            content: row.content,
            memory_type: row.memory_type,
            importance: row.importance,
            scope: row.scope,
            created_at: row.created_at,
        })
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request', details: error.errors },
                { status: 400 }
            )
        }
        console.error('Agent memories API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to save instruction' },
            { status: 500 }
        )
    }
}
