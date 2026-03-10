import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ConversationEmbedInput {
    conversationId: string
    orgId: string
    userId: string
}

export async function embedConversation(input: ConversationEmbedInput) {
    const { conversationId, orgId, userId } = input

    const { data: messages } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200)

    if (!messages?.length) return { success: true, embedded: 0 }

    const { data: existingEmbeds } = await supabase
        .from('embeddings')
        .select('source_id')
        .eq('org_id', orgId)
        .eq('source_type', 'conversation')
        .like('metadata->>conversation_id', conversationId)

    const existingMsgIds = new Set((existingEmbeds ?? []).map(e => e.source_id))

    const importantMessages = messages.filter(m => {
        if (existingMsgIds.has(m.id)) return false
        if (!m.content || m.content.length < 50) return false
        if (m.role === 'system') return false
        return true
    })

    const chunks: Array<{ msgId: string; content: string; chunkIdx: number }> = []

    for (let i = 0; i < importantMessages.length; i += 2) {
        const pair = importantMessages.slice(i, i + 2)
        const content = pair.map(m => `[${m.role}]: ${m.content}`).join('\n\n')
        if (content.length > 50) {
            chunks.push({
                msgId: pair[0].id,
                content: content.slice(0, 4000),
                chunkIdx: Math.floor(i / 2),
            })
        }
    }

    if (!chunks.length) return { success: true, embedded: 0 }

    const { data: providerRow } = await supabase
        .from('ai_providers')
        .select('api_key')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .single()

    if (!providerRow?.api_key) {
        const { data: platformKey } = await supabase
            .from('ai_providers')
            .select('api_key')
            .is('org_id', null)
            .eq('is_active', true)
            .limit(1)
            .single()
        if (!platformKey?.api_key) return { success: true, embedded: 0, reason: 'No embedding API key' }
        providerRow!.api_key = platformKey.api_key
    }

    let embedded = 0

    for (const chunk of chunks) {
        try {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${providerRow!.api_key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'text-embedding-3-large', input: chunk.content }),
            })
            const data = await response.json()
            const embedding = data.data?.[0]?.embedding
            if (!embedding) continue

            await supabase.from('embeddings').insert({
                org_id: orgId,
                source_type: 'conversation',
                source_id: chunk.msgId,
                chunk_index: chunk.chunkIdx,
                content: chunk.content,
                embedding,
                metadata: {
                    conversation_id: conversationId,
                    user_id: userId,
                    chunk_pair_index: chunk.chunkIdx,
                },
            })
            embedded++
        } catch { /* continue on failure */ }
    }

    return { success: true, embedded, conversation_id: conversationId, total_chunks: chunks.length }
}
