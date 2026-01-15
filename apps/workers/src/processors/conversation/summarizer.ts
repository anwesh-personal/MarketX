import { Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
})

interface SummaryJob {
    conversationId: string
    messageCount?: number
}

export async function summarizeConversation(job: Job<SummaryJob>) {
    const { conversationId, messageCount = 50 } = job.data

    console.log(`💬 Summarizing conversation ${conversationId}`)

    try {
        // 1. Fetch conversation messages
        const { data: messages, error: fetchError } = await supabase
            .from('messages')
            .select('role, content, created_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(messageCount)

        if (fetchError) throw fetchError

        if (!messages || messages.length === 0) {
            console.log(`⚠️  No messages found for conversation ${conversationId}`)
            return { success: false, reason: 'No messages found' }
        }

        job.updateProgress(20)

        // 2. Format messages for summarization
        const conversationText = messages
            .map((m) => `${m.role}: ${m.content}`)
            .join('\n\n')

        job.updateProgress(40)

        // 3. Generate summary using GPT
        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: `Summarize the following conversation concisely. Extract:
1. Main topics discussed
2. Key decisions or conclusions
3. Action items or follow-ups
4. Important facts or data mentioned

Provide a structured summary in clear paragraphs.`,
                },
                {
                    role: 'user',
                    content: conversationText,
                },
            ],
            temperature: 0.3,
            max_tokens: 500,
        })

        job.updateProgress(70)

        const summary = response.choices[0].message.content || ''

        console.log(`📝 Generated summary (${summary.length} chars)`)

        // 4. Store summary
        const { error: insertError } = await supabase
            .from('conversation_summaries')
            .insert({
                conversation_id: conversationId,
                summary,
                message_count: messages.length,
                created_at: new Date().toISOString(),
            })

        if (insertError && !insertError.message.includes('does not exist')) {
            console.warn('Could not insert summary:', insertError)
        }

        // 5. Update conversation metadata
        const { error: updateError } = await supabase
            .from('conversations')
            .update({
                last_summarized_at: new Date().toISOString(),
                summary_message_count: messages.length,
            })
            .eq('id', conversationId)

        if (updateError && !updateError.message.includes('does not exist')) {
            console.warn('Could not update conversation:', updateError)
        }

        job.updateProgress(100)

        console.log(`✅ Conversation ${conversationId} summarized successfully`)

        return {
            success: true,
            summary,
            messageCount: messages.length,
        }
    } catch (error: any) {
        console.error(`❌ Failed to summarize conversation ${conversationId}:`, error)
        throw error
    }
}
