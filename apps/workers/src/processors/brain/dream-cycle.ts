import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface DreamCycleInput {
    orgId: string
    agentId?: string
    lookbackDays?: number
}

export async function runDreamCycle(input: DreamCycleInput) {
    const { orgId, agentId } = input
    const lookbackDays = input.lookbackDays ?? 7
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()

    // 1. Gather recent memories
    let memoryQuery = supabase
        .from('brain_memories')
        .select('id, memory_type, content, keywords, confidence, created_at')
        .eq('org_id', orgId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100)
    if (agentId) memoryQuery = memoryQuery.eq('agent_id', agentId)

    const { data: recentMemories } = await memoryQuery

    // 2. Gather recent knowledge gaps
    const { data: gaps } = await supabase
        .from('knowledge_gaps')
        .select('id, query, context, confidence, created_at')
        .eq('org_id', orgId)
        .gte('created_at', since)
        .order('confidence', { ascending: true })
        .limit(50)

    // 3. Gather existing reflections for dedup
    const { data: existingReflections } = await supabase
        .from('brain_reflections')
        .select('id, reflection_type, content')
        .eq('org_id', orgId)
        .gte('created_at', since)
        .limit(50)

    const existingReflectionTexts = new Set((existingReflections ?? []).map(r => r.content?.slice(0, 100)))

    // 4. Analyze patterns in memories
    const memoryTypeDistribution: Record<string, number> = {}
    const allKeywords: Record<string, number> = {}
    for (const mem of (recentMemories ?? [])) {
        memoryTypeDistribution[mem.memory_type] = (memoryTypeDistribution[mem.memory_type] ?? 0) + 1
        for (const kw of (mem.keywords ?? [])) {
            allKeywords[kw] = (allKeywords[kw] ?? 0) + 1
        }
    }

    const topKeywords = Object.entries(allKeywords)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([k]) => k)

    // 5. Generate reflections
    const reflections: Array<{
        org_id: string
        agent_id: string | null
        reflection_type: string
        content: string
        source_memory_ids: string[]
        confidence: number
        metadata: Record<string, any>
    }> = []

    // Pattern reflection: what topics keep coming up
    if (topKeywords.length >= 3) {
        const content = `Recurring themes in recent conversations: ${topKeywords.slice(0, 10).join(', ')}. Memory distribution: ${Object.entries(memoryTypeDistribution).map(([k, v]) => `${k}(${v})`).join(', ')}.`
        if (!existingReflectionTexts.has(content.slice(0, 100))) {
            reflections.push({
                org_id: orgId,
                agent_id: agentId ?? null,
                reflection_type: 'pattern_analysis',
                content,
                source_memory_ids: (recentMemories ?? []).slice(0, 10).map(m => m.id),
                confidence: 0.6,
                metadata: { top_keywords: topKeywords, memory_distribution: memoryTypeDistribution },
            })
        }
    }

    // Gap reflection: what we don't know
    if ((gaps ?? []).length > 0) {
        const gapTopics = (gaps ?? []).slice(0, 5).map(g => g.query?.slice(0, 80) ?? 'unknown')
        const content = `Knowledge gaps detected (${(gaps ?? []).length} total): ${gapTopics.join('; ')}. Avg gap confidence: ${((gaps ?? []).reduce((s, g) => s + Number(g.confidence ?? 0), 0) / (gaps ?? []).length).toFixed(2)}.`
        if (!existingReflectionTexts.has(content.slice(0, 100))) {
            reflections.push({
                org_id: orgId,
                agent_id: agentId ?? null,
                reflection_type: 'gap_analysis',
                content,
                source_memory_ids: [],
                confidence: 0.5,
                metadata: { gap_count: (gaps ?? []).length, gap_ids: (gaps ?? []).slice(0, 10).map(g => g.id) },
            })
        }
    }

    // Quality reflection: how confident are our memories
    const avgConfidence = (recentMemories ?? []).length > 0
        ? (recentMemories ?? []).reduce((s, m) => s + Number(m.confidence ?? 0), 0) / (recentMemories ?? []).length
        : 0
    if ((recentMemories ?? []).length > 5) {
        const lowConfCount = (recentMemories ?? []).filter(m => Number(m.confidence) < 0.5).length
        const content = `Memory quality assessment: ${(recentMemories ?? []).length} recent memories, avg confidence ${avgConfidence.toFixed(2)}, ${lowConfCount} low-confidence entries need reinforcement.`
        if (!existingReflectionTexts.has(content.slice(0, 100))) {
            reflections.push({
                org_id: orgId,
                agent_id: agentId ?? null,
                reflection_type: 'quality_assessment',
                content,
                source_memory_ids: (recentMemories ?? []).filter(m => Number(m.confidence) < 0.5).map(m => m.id),
                confidence: 0.7,
                metadata: { avg_confidence: avgConfidence, low_conf_count: lowConfCount, total: (recentMemories ?? []).length },
            })
        }
    }

    // 6. Persist reflections
    if (reflections.length > 0) {
        await supabase.from('brain_reflections').insert(reflections)
    }

    // 7. Log dream cycle
    const dreamLog = {
        org_id: orgId,
        agent_id: agentId ?? null,
        cycle_type: 'nightly',
        memories_reviewed: (recentMemories ?? []).length,
        gaps_reviewed: (gaps ?? []).length,
        reflections_generated: reflections.length,
        top_keywords: topKeywords,
        avg_memory_confidence: avgConfidence,
        metadata: {
            lookback_days: lookbackDays,
            memory_distribution: memoryTypeDistribution,
        },
    }

    await supabase.from('brain_dream_logs').insert(dreamLog)

    return {
        success: true,
        org_id: orgId,
        memories_reviewed: (recentMemories ?? []).length,
        gaps_reviewed: (gaps ?? []).length,
        reflections_generated: reflections.length,
        dream_logged: true,
    }
}
