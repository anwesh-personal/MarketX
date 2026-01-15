import { Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import { simpleChunk } from '../../utils/chunker'
import { generateEmbedding } from '../../utils/embeddings'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface KBProcessingJob {
    kbId: string
    documentId: string
    content: string
    orgId: string  // REQUIRED to fetch AI provider
    metadata?: Record<string, any>
}

export async function processKBDocument(job: Job<KBProcessingJob>) {
    const { kbId, documentId, content, orgId, metadata } = job.data

    console.log(`📄 Processing document ${documentId} for KB ${kbId}`)

    if (!orgId) {
        throw new Error('orgId is required to fetch AI provider')
    }

    await updateProcessingStatus(kbId, documentId, 'processing')

    try {
        // 1. Chunk the document
        job.updateProgress(10)
        const chunks = simpleChunk(content, 512, 50)

        console.log(`📦 Created ${chunks.length} chunks`)

        await updateProcessingStatus(kbId, documentId, 'processing', {
            totalChunks: chunks.length,
            processedChunks: 0,
        })

        // 2. Generate embeddings for each chunk using org's AI provider
        job.updateProgress(30)
        const embeddings = []

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i]

            // Generate embedding - uses AI Management, NOT hardcoded
            const embedding = await generateEmbedding(chunk.text, orgId)

            embeddings.push({
                kb_id: kbId,
                document_id: documentId,
                chunk_index: i,
                content: chunk.text,
                embedding: embedding,
                metadata: {
                    ...metadata,
                    tokens: chunk.tokens,
                    startIndex: chunk.startIndex,
                    endIndex: chunk.endIndex,
                },
                type: 'kb',
                created_at: new Date().toISOString(),
            })

            // Update progress
            const progress = 30 + (i / chunks.length) * 50
            job.updateProgress(Math.floor(progress))

            await updateProcessingStatus(kbId, documentId, 'processing', {
                processedChunks: i + 1,
            })
        }

        console.log(`🔢 Generated ${embeddings.length} embeddings`)

        // 3. Store embeddings in batch
        job.updateProgress(85)
        const { error: insertError } = await supabase
            .from('embeddings')
            .insert(embeddings)

        if (insertError) {
            console.error('Failed to insert embeddings:', insertError)
            throw insertError
        }

        // 4. Update KB document status (if kb_documents table exists)
        job.updateProgress(95)
        const { error: updateError } = await supabase
            .from('kb_documents')
            .update({
                status: 'processed',
                chunk_count: chunks.length,
                processed_at: new Date().toISOString(),
            })
            .eq('id', documentId)

        if (updateError && !updateError.message.includes('does not exist')) {
            console.warn('Could not update kb_documents:', updateError)
        }

        // 5. Mark as complete
        await updateProcessingStatus(kbId, documentId, 'completed', {
            totalEmbeddings: embeddings.length,
            processedEmbeddings: embeddings.length,
        })

        job.updateProgress(100)

        console.log(`✅ Document ${documentId} processed successfully`)

        return {
            success: true,
            chunks: chunks.length,
            embeddings: embeddings.length,
        }
    } catch (error: any) {
        console.error(`❌ Failed to process document ${documentId}:`, error)

        // Mark as failed
        await updateProcessingStatus(kbId, documentId, 'failed', {
            error: error.message,
        })

        throw error
    }
}

async function updateProcessingStatus(
    kbId: string,
    documentId: string,
    status: string,
    updates: Record<string, any> = {}
) {
    const { error } = await supabase.from('kb_processing_status').upsert({
        kb_id: kbId,
        document_id: documentId,
        status,
        ...updates,
        ...(status === 'processing' && { started_at: new Date().toISOString() }),
        ...(status === 'completed' && { completed_at: new Date().toISOString() }),
    })

    if (error && !error.message.includes('does not exist')) {
        console.warn('Could not update processing status:', error)
    }
}
