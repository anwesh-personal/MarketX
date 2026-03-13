import { Job } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import { semanticChunk } from '../../utils/chunker'
import { generateEmbedding } from '../../utils/embeddings'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ [KB Processor] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — DB operations will fail')
}

const supabase = createClient(supabaseUrl!, supabaseKey!)

export interface KBProcessingJob {
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

    // Mark as chunking in kb_documents (schema: pending→chunking→embedding→ready)
    await supabase.from('kb_documents').update({ status: 'chunking' }).eq('id', documentId)
    await updateProcessingStatus(kbId, documentId, 'processing')

    try {
        // 1. Semantic chunk — respects paragraph + sentence boundaries
        job.updateProgress(10)
        const chunks = semanticChunk(content, 400, 40)

        console.log(`📦 Created ${chunks.length} semantic chunks`)

        // Mark as embedding phase
        await supabase.from('kb_documents').update({ status: 'embedding', chunk_count: chunks.length }).eq('id', documentId)
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
                kb_id:       kbId,
                document_id: documentId,
                org_id:      orgId,
                chunk_index: i,
                content:     chunk.text,
                embedding,
                source_type: 'kb',
                metadata: {
                    ...metadata,
                    tokens:     chunk.tokens,
                    startIndex: chunk.startIndex,
                    endIndex:   chunk.endIndex,
                    chunkIndex: i,
                    totalChunks: chunks.length,
                },
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

        // 4. Mark kb_documents as ready (schema: ready = fully embedded and searchable)
        job.updateProgress(95)
        const { error: updateError } = await supabase
            .from('kb_documents')
            .update({
                status:      'ready',
                chunk_count: chunks.length,
                embed_model: 'text-embedding-3-large',
                updated_at:  new Date().toISOString(),
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

        // Mark kb_documents as error + record message
        await supabase.from('kb_documents')
            .update({ status: 'error', error_message: error.message })
            .eq('id', documentId)
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
