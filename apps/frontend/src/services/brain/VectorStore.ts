import { createClient } from '@/lib/supabase/server'
import { aiProviderService } from '../ai/AIProviderService'
import crypto from 'crypto'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface EmbeddingDocument {
    id?: string
    orgId: string
    sourceType: 'kb' | 'conversation' | 'user_memory' | 'system'
    sourceId: string
    chunkIndex: number
    content: string
    embedding?: number[]
    metadata?: Record<string, any>
}

export interface SearchResult {
    id: string
    content: string
    metadata: Record<string, any>
    combinedScore: number
    vectorScore: number
    ftsScore: number
    sourceType: string
    sourceId: string
}

export interface SearchOptions {
    orgId: string
    sourceTypes?: ('kb' | 'conversation' | 'user_memory' | 'system')[]
    topK?: number
    vectorWeight?: number
    ftsWeight?: number
    minSimilarity?: number
}

export interface VectorSearchOptions {
    orgId: string
    sourceTypes?: ('kb' | 'conversation' | 'user_memory' | 'system')[]
    topK?: number
    minSimilarity?: number
}

export interface EmbeddingStats {
    cacheHit: boolean
    generationTimeMs: number
    tokensUsed: number
    model: string
}

// ============================================================
// VECTOR STORE SERVICE
// ============================================================

export class VectorStore {
    private getSupabase() { return createClient() }
    private embeddingModel = 'text-embedding-3-large'
    private dimensions = 1536
    private maxBatchSize = 100

    /**
     * Generate embedding for text using AI provider
     * Checks cache first to reduce API calls
     */
    async generateEmbedding(
        text: string,
        orgId: string,
        providerId: string,
        useCache: boolean = true
    ): Promise<{ embedding: number[], stats: EmbeddingStats }> {
        const startTime = Date.now()

        // Check cache first
        if (useCache) {
            const cached = await this.getCachedEmbedding(text, orgId)
            if (cached) {
                await this.updateCacheAccess(cached.id)

                // Log cache hit
                await this.logEmbeddingStats(orgId, true, Date.now() - startTime, 0)

                return {
                    embedding: cached.embedding,
                    stats: {
                        cacheHit: true,
                        generationTimeMs: Date.now() - startTime,
                        tokensUsed: 0,
                        model: this.embeddingModel
                    }
                }
            }
        }

        // Generate new embedding via AIProviderService (uses orgId to resolve provider)
        const embedding = await this.callEmbeddingAPI(text, orgId)

        // Estimate tokens (rough: 1 token ~= 4 chars)
        const tokensUsed = Math.ceil(text.length / 4)

        // Cache the result
        if (useCache) {
            await this.cacheEmbedding(text, embedding, orgId)
        }

        // Log stats
        await this.logEmbeddingStats(orgId, false, Date.now() - startTime, tokensUsed)

        return {
            embedding,
            stats: {
                cacheHit: false,
                generationTimeMs: Date.now() - startTime,
                tokensUsed,
                model: this.embeddingModel
            }
        }
    }

    /**
     * Generate embeddings in batch for efficiency
     * Automatically handles batching and rate limiting
     */
    async batchGenerateEmbeddings(
        texts: string[],
        orgId: string,
        providerId: string
    ): Promise<number[][]> {
        const allEmbeddings: number[][] = []

        // Process in batches to respect API limits
        for (let i = 0; i < texts.length; i += this.maxBatchSize) {
            const batch = texts.slice(i, i + this.maxBatchSize)

            // Check cache for each text in batch
            const batchResults: (number[] | null)[] = []
            const uncachedIndices: number[] = []
            const uncachedTexts: string[] = []

            for (let j = 0; j < batch.length; j++) {
                const cached = await this.getCachedEmbedding(batch[j], orgId)
                if (cached) {
                    await this.updateCacheAccess(cached.id)
                    batchResults.push(cached.embedding)
                } else {
                    batchResults.push(null)
                    uncachedIndices.push(j)
                    uncachedTexts.push(batch[j])
                }
            }

            // Generate embeddings for uncached texts via AIProviderService
            if (uncachedTexts.length > 0) {
                const newEmbeddings = await this.callEmbeddingAPIBatch(uncachedTexts, orgId)

                // Cache new embeddings
                for (let j = 0; j < uncachedTexts.length; j++) {
                    await this.cacheEmbedding(uncachedTexts[j], newEmbeddings[j], orgId)
                }

                // Fill in batch results
                for (let j = 0; j < uncachedIndices.length; j++) {
                    batchResults[uncachedIndices[j]] = newEmbeddings[j]
                }
            }

            allEmbeddings.push(...(batchResults as number[][]))

            // Rate limiting: wait 1s between batches
            if (i + this.maxBatchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }

        return allEmbeddings
    }

    /**
     * Index documents (create embeddings and store in database)
     */
    async indexDocuments(
        documents: EmbeddingDocument[],
        providerId: string,
        onProgress?: (progress: number) => void
    ): Promise<void> {
        if (documents.length === 0) return

        const orgId = documents[0].orgId

        // Generate embeddings in batches
        const contents = documents.map(d => d.content)
        const embeddings = await this.batchGenerateEmbeddings(contents, orgId, providerId)

        // Report progress
        if (onProgress) {
            onProgress(50) // Embeddings generated
        }

        // Prepare data for batch insertion
        const embeddingsData = documents.map((doc, i) => ({
            org_id: doc.orgId,
            source_type: doc.sourceType,
            source_id: doc.sourceId,
            chunk_index: doc.chunkIndex,
            content: doc.content,
            embedding: JSON.stringify(embeddings[i]),
            metadata: doc.metadata || {}
        }))

        // Batch insert using SQL function
        const { data, error } = await this.getSupabase().rpc('batch_insert_embeddings', {
            embeddings_data: embeddingsData
        })

        if (error) {
            console.error('Failed to batch insert embeddings:', error)
            throw new Error(`Failed to index documents: ${error.message}`)
        }

        // Report completion
        if (onProgress) {
            onProgress(100)
        }
    }

    /**
     * Hybrid search (vector + FTS)
     * Best for user queries where keywords matter
     */
    async search(
        query: string,
        options: SearchOptions,
        providerId: string
    ): Promise<SearchResult[]> {
        const startTime = Date.now()

        // Generate query embedding
        const { embedding: queryEmbedding } = await this.generateEmbedding(
            query,
            options.orgId,
            providerId
        )

        // Perform hybrid search using SQL function
        const { data, error } = await this.getSupabase().rpc('hybrid_search', {
            query_embedding: JSON.stringify(queryEmbedding),
            query_text: query,
            org_uuid: options.orgId,
            source_types: options.sourceTypes || null,
            top_k: options.topK || 5,
            vector_weight: options.vectorWeight || 0.7,
            fts_weight: options.ftsWeight || 0.3,
            min_similarity: options.minSimilarity || 0.0
        })

        if (error) {
            console.error('Hybrid search failed:', error)
            throw new Error(`Search failed: ${error.message}`)
        }

        const searchTime = Date.now() - startTime

        // Log search metrics
        await this.logSearchMetrics(options.orgId, searchTime)

        return (data || []).map((row: any) => ({
            id: row.id,
            content: row.content,
            metadata: row.metadata,
            combinedScore: row.combined_score,
            vectorScore: row.vector_score,
            ftsScore: row.fts_score,
            sourceType: row.source_type,
            sourceId: row.source_id
        }))
    }

    /**
     * Vector-only search (pure semantic similarity)
     * Faster than hybrid, use when keywords don't matter
     */
    async vectorSearch(
        query: string,
        options: VectorSearchOptions,
        providerId: string
    ): Promise<SearchResult[]> {
        const startTime = Date.now()

        // Generate query embedding
        const { embedding: queryEmbedding } = await this.generateEmbedding(
            query,
            options.orgId,
            providerId
        )

        // Perform vector search using SQL function
        const { data, error } = await this.getSupabase().rpc('vector_search', {
            query_embedding: JSON.stringify(queryEmbedding),
            org_uuid: options.orgId,
            source_types: options.sourceTypes || null,
            top_k: options.topK || 5,
            min_similarity: options.minSimilarity || 0.0
        })

        if (error) {
            console.error('Vector search failed:', error)
            throw new Error(`Vector search failed: ${error.message}`)
        }

        const searchTime = Date.now() - startTime

        // Log search metrics
        await this.logSearchMetrics(options.orgId, searchTime)

        return (data || []).map((row: any) => ({
            id: row.id,
            content: row.content,
            metadata: row.metadata,
            combinedScore: row.similarity_score,
            vectorScore: row.similarity_score,
            ftsScore: 0,
            sourceType: row.source_type,
            sourceId: row.source_id
        }))
    }

    /**
     * Delete embeddings by source
     * Used when KB or conversation is deleted
     */
    async deleteBySource(sourceId: string, orgId: string): Promise<number> {
        const { data, error } = await this.getSupabase().rpc('delete_embeddings_by_source', {
            source_uuid: sourceId,
            org_uuid: orgId
        })

        if (error) {
            console.error('Failed to delete embeddings:', error)
            throw new Error(`Failed to delete embeddings: ${error.message}`)
        }

        return data || 0
    }

    /**
     * Get embedding count for organization
     */
    async getOrgEmbeddingCount(orgId: string): Promise<number> {
        const { data, error } = await this.getSupabase().rpc('get_org_embedding_count', {
            org_uuid: orgId
        })

        if (error) {
            console.error('Failed to get embedding count:', error)
            return 0
        }

        return data || 0
    }

    /**
     * Get embedding count by source type
     */
    async getEmbeddingCountBySource(
        orgId: string,
        sourceType: 'kb' | 'conversation' | 'user_memory' | 'system'
    ): Promise<number> {
        const { data, error } = await this.getSupabase().rpc('get_embedding_count_by_source', {
            org_uuid: orgId,
            source: sourceType
        })

        if (error) {
            console.error('Failed to get embedding count by source:', error)
            return 0
        }

        return data || 0
    }

    /**
     * Get embedding statistics for organization
     */
    async getStats(orgId: string, days: number = 30): Promise<any[]> {
        const { data, error } = await this.getSupabase()
            .from('embedding_stats')
            .select('*')
            .eq('org_id', orgId)
            .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('date', { ascending: false })

        if (error) {
            console.error('Failed to get embedding stats:', error)
            throw new Error(`Failed to get stats: ${error.message}`)
        }

        return data || []
    }

    // ============================================================
    // PRIVATE HELPER METHODS
    // ============================================================

    /**
     * Call embedding API via AIProviderService
     * Uses org's configured embedding provider with automatic failover
     */
    private async callEmbeddingAPI(text: string, orgId: string): Promise<number[]> {
        const result = await aiProviderService.embedTexts(orgId, [text])
        return result.embeddings[0]
    }

    /**
     * Call embedding API in batch via AIProviderService
     */
    private async callEmbeddingAPIBatch(texts: string[], orgId: string): Promise<number[][]> {
        const result = await aiProviderService.embedTexts(orgId, texts)
        return result.embeddings
    }

    /**
     * Get cached embedding by content hash
     */
    private async getCachedEmbedding(
        text: string,
        orgId: string
    ): Promise<{ id: string, embedding: number[] } | null> {
        const hash = this.hashContent(text)

        const { data, error } = await this.getSupabase()
            .from('embedding_cache')
            .select('id, embedding')
            .eq('content_hash', hash)
            .eq('model', this.embeddingModel)
            .eq('org_id', orgId)
            .single()

        if (error || !data) return null

        return {
            id: data.id,
            embedding: JSON.parse(data.embedding as any)
        }
    }

    /**
     * Cache embedding
     */
    private async cacheEmbedding(
        text: string,
        embedding: number[],
        orgId: string
    ): Promise<void> {
        const hash = this.hashContent(text)

        const { error } = await this.getSupabase()
            .from('embedding_cache')
            .upsert({
                content_hash: hash,
                embedding: JSON.stringify(embedding),
                model: this.embeddingModel,
                org_id: orgId
            }, {
                onConflict: 'content_hash,model,org_id'
            })

        if (error) {
            // Don't throw - caching failure shouldn't break the flow
            console.error('Failed to cache embedding:', error)
        }
    }

    /**
     * Update cache access statistics
     */
    private async updateCacheAccess(cacheId: string): Promise<void> {
        const { error } = await this.getSupabase().rpc('update_cache_access', {
            cache_uuid: cacheId
        })

        if (error) {
            console.error('Failed to update cache access:', error)
        }
    }

    /**
     * Hash content using SHA256
     */
    private hashContent(text: string): string {
        return crypto.createHash('sha256').update(text).digest('hex')
    }

    /**
     * Log embedding generation statistics
     */
    private async logEmbeddingStats(
        orgId: string,
        cacheHit: boolean,
        generationTimeMs: number,
        tokensUsed: number
    ): Promise<void> {
        const today = new Date().toISOString().split('T')[0]

        const { error } = await this.getSupabase().rpc('update_embedding_stats', {
            org_uuid: orgId,
            stat_date: today,
            search_time_ms: null,
            cache_hit: cacheHit,
            tokens_used: tokensUsed
        })

        if (error) {
            console.error('Failed to log embedding stats:', error)
        }
    }

    /**
     * Log search performance metrics
     */
    private async logSearchMetrics(
        orgId: string,
        searchTimeMs: number
    ): Promise<void> {
        const today = new Date().toISOString().split('T')[0]

        const { error } = await this.getSupabase().rpc('update_embedding_stats', {
            org_uuid: orgId,
            stat_date: today,
            search_time_ms: searchTimeMs,
            cache_hit: null,
            tokens_used: null
        })

        if (error) {
            console.error('Failed to log search metrics:', error)
        }
    }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const vectorStore = new VectorStore()
