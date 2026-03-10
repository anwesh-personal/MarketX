import { createClient } from '@supabase/supabase-js'

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

    const { data: providerRow } = await supabase
        .from('ai_providers')
        .select('id, provider, api_key')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .single()

    let extractedFacts: Array<{
        type: 'fact' | 'preference' | 'instruction' | 'context' | 'feedback'
        content: string
        confidence: number
        keywords: string[]
    }> = []

    if (providerRow?.api_key) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${providerRow.api_key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0,
                    response_format: { type: 'json_object' },
                    messages: [
                        {
                            role: 'system',
                            content: `Extract memorable facts, preferences, instructions, and context from this conversation.
Return JSON: { "memories": [{ "type": "fact|preference|instruction|context|feedback", "content": "...", "confidence": 0.0-1.0, "keywords": ["..."] }] }
Only extract non-trivial, reusable information. Skip greetings and trivial exchanges.
Max 10 memories per conversation.`
                        },
                        { role: 'user', content: transcript.slice(0, 8000) }
                    ],
                }),
            })
            const data = await response.json()
            const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}')
            extractedFacts = parsed.memories ?? []
        } catch {
            extractedFacts = extractFactsHeuristic(messages)
        }
    } else {
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
        metadata: { extraction_method: providerRow ? 'llm' : 'heuristic' },
    }))

    const { data: inserted, error: insertErr } = await supabase
        .from('brain_memories')
        .insert(memoryInserts)
        .select('id, content')
    if (insertErr) throw insertErr

    const embeddingInserts = (inserted ?? []).map(m => ({
        org_id: orgId,
        source_type: 'brain_memory',
        source_id: m.id,
        chunk_index: 0,
        content: m.content,
        metadata: { conversation_id: conversationId, user_id: userId },
    }))

    for (const emb of embeddingInserts) {
        try {
            const embResponse = await generateEmbedding(emb.content, providerRow?.api_key)
            if (embResponse) {
                await supabase.from('embeddings').insert({
                    ...emb,
                    embedding: embResponse,
                })
            }
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
            facts.push({
                type: 'preference',
                content: text.slice(0, 500),
                confidence: 0.6,
                keywords: extractKeywords(text),
            })
        }
        if (/my (company|team|product|service|industry|budget)/i.test(text)) {
            facts.push({
                type: 'context',
                content: text.slice(0, 500),
                confidence: 0.7,
                keywords: extractKeywords(text),
            })
        }
        if (/(please|make sure|don't|do not|always|must|should)/i.test(text) && text.length > 30) {
            facts.push({
                type: 'instruction',
                content: text.slice(0, 500),
                confidence: 0.5,
                keywords: extractKeywords(text),
            })
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

async function generateEmbedding(text: string, apiKey?: string): Promise<number[] | null> {
    if (!apiKey) return null
    try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'text-embedding-3-large', input: text }),
        })
        const data = await response.json()
        return data.data?.[0]?.embedding ?? null
    } catch { return null }
}
