import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '../../utils/embeddings'

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

    let embedded = 0

    for (const chunk of chunks) {
        try {
            const embedding = await generateEmbedding(chunk.content, orgId)

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
