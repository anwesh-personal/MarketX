import { createClient } from '@supabase/supabase-js'
import aiService from '../../utils/ai-service'
import { generateEmbedding } from '../../utils/embeddings'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface MemoryExtractionInput {
    conversationId: string
    orgId: string
    userId: string
    brainAgentId?: string
}

export async function extractMemoriesFromConversation(input: MemoryExtractionInput) {
    const { conversationId, orgId, userId, brainAgentId } = input

    const { data: messages, error: msgErr } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100)
    if (msgErr) throw msgErr
    if (!messages?.length) return { success: true, memories_extracted: 0 }

    const transcript = messages.map(m => `[${m.role}]: ${m.content}`).join('\n')

    let extractedFacts: Array<{
        type: 'fact' | 'preference' | 'instruction' | 'context' | 'feedback'
        content: string
        confidence: number
        keywords: string[]
    }> = []

    try {
        const result = await aiService.call(transcript.slice(0, 8000), {
            systemPrompt: `Extract memorable facts, preferences, instructions, and context from this conversation.
Return JSON: { "memories": [{ "type": "fact|preference|instruction|context|feedback", "content": "...", "confidence": 0.0-1.0, "keywords": ["..."] }] }
Only extract non-trivial, reusable information. Skip greetings and trivial exchanges.
Max 10 memories per conversation.`,
            temperature: 0,
        })
        const parsed = JSON.parse(result.content)
        extractedFacts = parsed.memories ?? []
    } catch {
        extractedFacts = extractFactsHeuristic(messages)
    }

    if (!extractedFacts.length) return { success: true, memories_extracted: 0 }

    const memoryInserts = extractedFacts.map(f => ({
        org_id: orgId,
        user_id: userId,
        agent_id: brainAgentId ?? null,
        memory_type: f.type,
        content: f.content,
        keywords: f.keywords,
        confidence: f.confidence,
        source_conversation_id: conversationId,
        metadata: { extraction_method: 'provider_abstraction' },
    }))

    const { data: inserted, error: insertErr } = await supabase
        .from('brain_memories')
        .insert(memoryInserts)
        .select('id, content')
    if (insertErr) throw insertErr

    for (const mem of (inserted ?? [])) {
        try {
            const embedding = await generateEmbedding(mem.content, orgId)
            await supabase.from('embeddings').insert({
                org_id: orgId,
                source_type: 'brain_memory',
                source_id: mem.id,
                chunk_index: 0,
                content: mem.content,
                embedding,
                metadata: { conversation_id: conversationId, user_id: userId },
            })
        } catch { /* embedding failure shouldn't block memory storage */ }
    }

    return {
        success: true,
        memories_extracted: inserted?.length ?? 0,
        conversation_id: conversationId,
    }
}

function extractFactsHeuristic(messages: any[]): Array<{
    type: 'fact' | 'preference' | 'instruction' | 'context' | 'feedback'
    content: string
    confidence: number
    keywords: string[]
}> {
    const facts: any[] = []
    const userMessages = messages.filter(m => m.role === 'user')

    for (const msg of userMessages) {
        const text = msg.content ?? ''
        if (text.length < 20) continue

        if (/i (prefer|like|want|need|always|never)/i.test(text)) {
            facts.push({ type: 'preference', content: text.slice(0, 500), confidence: 0.6, keywords: extractKeywords(text) })
        }
        if (/my (company|team|product|service|industry|budget)/i.test(text)) {
            facts.push({ type: 'context', content: text.slice(0, 500), confidence: 0.7, keywords: extractKeywords(text) })
        }
        if (/(please|make sure|don't|do not|always|must|should)/i.test(text) && text.length > 30) {
            facts.push({ type: 'instruction', content: text.slice(0, 500), confidence: 0.5, keywords: extractKeywords(text) })
        }
    }

    return facts.slice(0, 10)
}

function extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'and', 'in', 'that', 'it', 'for', 'on', 'with', 'as', 'at', 'by', 'from', 'or', 'but', 'not', 'this', 'my', 'i', 'me', 'we', 'our', 'you', 'your'])
    return text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w))
        .slice(0, 10)
}
