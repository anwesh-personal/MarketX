import { createClient } from '@/lib/supabase/server'
import { vectorStore } from './VectorStore'
import { BrainConfig } from './BrainConfigService'
import { aiProviderService } from '../ai/AIProviderService'
import crypto from 'crypto'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface RAGContext {
    orgId: string
    userId?: string
    brainConfig: BrainConfig
    brainTemplateId?: string
}

export interface RAGResult {
    context: string
    documents: RetrievedDocument[]
    metadata: {
        totalRetrieved: number
        finalCount: number
        avgRelevanceScore: number
        retrievalTimeMs: number
        rerankingTimeMs: number
        totalTimeMs: number
        cacheHit: boolean
        expansionUsed: boolean
        rerankingUsed: boolean
    }
    /** Set to true when top document score is below the agent's min_confidence threshold */
    gapDetected: boolean
    /** The top document's confidence score (0 if no docs found) */
    gapConfidence: number
}

export interface RetrievedDocument {
    id: string
    content: string
    score: number
    sourceType: string
    sourceId: string
    metadata: Record<string, any>
    citation?: string
}

export interface QueryExpansion {
    original: string
    expanded: string[]
    method: 'synonyms' | 'llm' | 'embedding_neighbors' | 'hybrid'
}

// ============================================================
// RAG ORCHESTRATOR SERVICE
// ============================================================

export class RAGOrchestrator {
    private getSupabase() { return createClient() }

    /**
     * Main RAG retrieval pipeline
     * This is the core intelligence that powers all agent interactions
     */
    async retrieve(
        query: string,
        context: RAGContext
    ): Promise<RAGResult> {
        const startTime = Date.now()

        // Check if RAG is enabled in brain config
        if (!context.brainConfig.rag.enabled) {
            return this.emptyResult('RAG disabled in brain configuration')
        }

        // Check cache first
        const queryHash = this.hashQuery(query)
        const cached = await this.getCachedResult(queryHash, context.orgId)

        if (cached) {
            // Log cache hit
            await this.logMetrics(query, queryHash, context, {
                ...cached.metadata,
                cacheHit: true,
                totalTimeMs: Date.now() - startTime
            })

            return cached
        }

        // Step 1: Query Expansion (if needed)
        let queries = [query]
        let expansionUsed = false

        if (this.shouldExpandQuery(query, context.brainConfig)) {
            const expansion = await this.expandQuery(query, context)
            queries = [query, ...expansion.expanded]
            expansionUsed = true

            // Track expansion for learning loop
            await this.trackExpansion(expansion, context.orgId)
        }

        const retrievalStart = Date.now()

        // Step 2: Retrieve documents using hybrid search
        const retrievedDocs = await this.retrieveDocuments(
            queries,
            context
        )

        const retrievalTime = Date.now() - retrievalStart

        if (retrievedDocs.length === 0) {
            // Record knowledge gap — no documents found at all
            this.recordKnowledgeGap(context.orgId, query, 0).catch(err =>
                console.error('[RAGOrchestrator] Gap recording failed:', err)
            )
            return this.emptyResult('No relevant documents found')
        }

        const rerankingStart = Date.now()

        // Step 3: Rerank documents by relevance
        let finalDocs = retrievedDocs
        let rerankingUsed = false

        if (context.brainConfig.rag.rerankingEnabled && retrievedDocs.length > 1) {
            finalDocs = await this.rerankDocuments(
                query,
                retrievedDocs,
                context
            )
            rerankingUsed = true
        }

        const rerankingTime = Date.now() - rerankingStart

        // Step 4: Assemble context with token budget management
        const contextString = this.assembleContext(
            finalDocs,
            context.brainConfig.memory.maxContextTokens
        )

        // Calculate metrics
        const avgScore  = finalDocs.reduce((sum, doc) => sum + doc.score, 0) / finalDocs.length
        const topScore  = finalDocs[0]?.score ?? 0
        const totalTime = Date.now() - startTime

        // Gap detection: if the best document is below the confidence threshold,
        // record it as a knowledge gap (fire-and-forget — never blocks the response)
        const minConfidence = (context.brainConfig as any).ragMinConfidence ?? 0.65
        const gapDetected   = topScore < minConfidence

        if (gapDetected) {
            this.recordKnowledgeGap(context.orgId, query, topScore).catch(err =>
                console.error('[RAGOrchestrator] Gap recording failed:', err)
            )
        }

        const result: RAGResult = {
            context: contextString,
            documents: finalDocs,
            metadata: {
                totalRetrieved: retrievedDocs.length,
                finalCount: finalDocs.length,
                avgRelevanceScore: avgScore,
                retrievalTimeMs: retrievalTime,
                rerankingTimeMs: rerankingTime,
                totalTimeMs: totalTime,
                cacheHit: false,
                expansionUsed,
                rerankingUsed
            },
            gapDetected,
            gapConfidence: topScore,
        }

        // Cache result
        await this.cacheResult(queryHash, context.orgId, query, result, totalTime)

        // Log metrics
        await this.logMetrics(query, queryHash, context, result.metadata)

        return result
    }

    /**
     * Determine if query should be expanded
     */
    private shouldExpandQuery(query: string, config: BrainConfig): boolean {
        // Short queries benefit more from expansion
        const wordCount = query.split(/\s+/).length

        // Don't expand very long queries (already specific)
        if (wordCount > 20) return false

        // Always expand short queries
        if (wordCount <= 3) return true

        // Expand based on config (higher topK = more expansion needed)
        return config.rag.topK >= 8
    }

    /**
     * Expand query into alternative phrasings using LLM via AIProviderService
     */
    private async expandQuery(
        query: string,
        context: RAGContext
    ): Promise<QueryExpansion> {
        try {
            // Use LLM to generate alternative queries via AIProviderService
            // AIProviderService handles provider resolution automatically for the org
            const chatResponse = await aiProviderService.generateChat(
                context.orgId,
                [
                    {
                        role: 'system',
                        content: 'You are a query expansion assistant. Generate 2-3 alternative phrasings of the user\'s query to improve search recall. Return ONLY a JSON array of strings, nothing else.'
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                {
                    temperature: 0.7,
                    maxTokens: 200
                }
            )

            const content = chatResponse.content

            // Parse JSON array
            const expanded = JSON.parse(content.trim())

            return {
                original: query,
                expanded: Array.isArray(expanded) ? expanded.slice(0, 3) : [query],
                method: 'llm'
            }
        } catch (error) {
            console.error('Query expansion failed:', error)
            // Fallback to original query
            return {
                original: query,
                expanded: [query],
                method: 'synonyms'
            }
        }
    }

    /**
     * Retrieve documents using hybrid search
     * Executes multiple queries in parallel and deduplicates
     */
    private async retrieveDocuments(
        queries: string[],
        context: RAGContext
    ): Promise<RetrievedDocument[]> {
        const providerId = context.brainConfig.providers.embeddings

        if (!providerId) {
            throw new Error('No embedding provider configured')
        }

        // Execute all queries in parallel
        const searchPromises = queries.map(q =>
            vectorStore.search(q, {
                orgId: context.orgId,
                sourceTypes: ['kb', 'user_memory', 'system', 'conversation'],
                topK: context.brainConfig.rag.topK,
                vectorWeight: context.brainConfig.rag.weights.vector,
                ftsWeight: context.brainConfig.rag.weights.fts,
                minSimilarity: context.brainConfig.rag.minSimilarity
            }, providerId)
        )

        const results = await Promise.all(searchPromises)

        // Flatten and deduplicate by document ID
        const allDocs = results.flat()
        const uniqueDocs = new Map<string, RetrievedDocument>()

        for (const doc of allDocs) {
            // Keep highest score for duplicates
            const existing = uniqueDocs.get(doc.id)
            if (!existing || doc.combinedScore > existing.score) {
                uniqueDocs.set(doc.id, {
                    id: doc.id,
                    content: doc.content,
                    score: doc.combinedScore,
                    sourceType: doc.sourceType,
                    sourceId: doc.sourceId,
                    metadata: doc.metadata
                })
            }
        }

        // Convert to array and sort by score
        const documents = Array.from(uniqueDocs.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, context.brainConfig.rag.topK * 2) // Get more candidates for reranking

        return documents
    }

    /**
     * Rerank documents by actual relevance to original query using LLM via AIProviderService
     */
    private async rerankDocuments(
        query: string,
        documents: RetrievedDocument[],
        context: RAGContext
    ): Promise<RetrievedDocument[]> {
        try {
            // Score each document using org's configured provider via AIProviderService
            const scoredDocs = await Promise.all(
                documents.map(async (doc) => {
                    const score = await this.scoreRelevance(query, doc.content, context.orgId)
                    return { ...doc, score }
                })
            )

            // Sort by new scores and take top K
            return scoredDocs
                .sort((a, b) => b.score - a.score)
                .slice(0, context.brainConfig.rag.topK)
        } catch (error) {
            console.error('Reranking failed:', error)
            // Fallback to original order
            return documents.slice(0, context.brainConfig.rag.topK)
        }
    }

    /**
     * Score document relevance using LLM via AIProviderService
     */
    private async scoreRelevance(
        query: string,
        content: string,
        orgId: string
    ): Promise<number> {
        try {
            const chatResponse = await aiProviderService.generateChat(
                orgId,
                [
                    {
                        role: 'system',
                        content: 'Score the relevance of this passage to the query on a scale of 0.0 to 1.0. Respond with ONLY the number, nothing else.'
                    },
                    {
                        role: 'user',
                        content: `Query: ${query}\n\nPassage: ${content.substring(0, 500)}`
                    }
                ],
                {
                    temperature: 0.0,
                    maxTokens: 10
                }
            )

            const scoreText = chatResponse.content.trim()
            const score = parseFloat(scoreText)

            return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score))
        } catch (error) {
            console.error('Relevance scoring failed:', error)
            return 0.5 // Neutral score on error
        }
    }

    /**
     * Assemble context string with citations and token management
     */
    private assembleContext(
        documents: RetrievedDocument[],
        maxTokens: number
    ): string {
        if (documents.length === 0) {
            return 'No relevant context found.'
        }

        let context = '## Relevant Context\n\n'
        let tokenCount = this.estimateTokens(context)
        let includedDocs = 0

        for (const doc of documents) {
            // Create citation
            const citation = this.createCitation(doc, includedDocs + 1)
            doc.citation = citation

            const docText = `[${includedDocs + 1}] ${doc.content}\n\n`
            const docTokens = this.estimateTokens(docText)

            // Check if adding this doc would exceed token budget
            if (tokenCount + docTokens > maxTokens && includedDocs > 0) {
                context += `\n*[${documents.length - includedDocs} more document(s) omitted due to token limit]*\n`
                break
            }

            context += docText
            tokenCount += docTokens
            includedDocs++
        }

        // Add citation guide
        context += '\n---\n**Citation Guide:**\n'
        for (let i = 0; i < includedDocs; i++) {
            context += `[${i + 1}] ${documents[i].citation}\n`
        }

        return context
    }

    /**
     * Create human-readable citation for document
     */
    private createCitation(doc: RetrievedDocument, index: number): string {
        const meta = doc.metadata

        let parts: string[] = []

        if (meta.file_name) parts.push(meta.file_name)
        if (meta.title) parts.push(meta.title)
        if (meta.page_number) parts.push(`p.${meta.page_number}`)
        if (meta.section) parts.push(meta.section)

        if (parts.length === 0) {
            parts.push(`Document ${index}`)
        }

        return parts.join(' - ')
    }

    /**
     * Estimate token count (rough: 1 token ≈ 4 characters)
     */
    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4)
    }

    /**
     * Hash query for caching
     */
    private hashQuery(query: string): string {
        return crypto.createHash('sha256').update(query.toLowerCase().trim()).digest('hex')
    }

    /**
     * Get cached RAG result
     */
    private async getCachedResult(
        queryHash: string,
        orgId: string
    ): Promise<RAGResult | null> {
        const { data, error } = await this.getSupabase().rpc('get_rag_cache', {
            query_sha256: queryHash,
            org_uuid: orgId
        })

        if (error || !data) return null

        return data as RAGResult
    }

    /**
     * Cache RAG result
     */
    private async cacheResult(
        queryHash: string,
        orgId: string,
        query: string,
        result: RAGResult,
        retrievalTime: number
    ): Promise<void> {
        const { error } = await this.getSupabase().rpc('cache_rag_result', {
            query_sha256: queryHash,
            org_uuid: orgId,
            query: query,
            result: result,
            retrieval_ms: retrievalTime
        })

        if (error) {
            console.error('Failed to cache RAG result:', error)
        }
    }

    /**
     * Track query expansion for learning loop
     */
    private async trackExpansion(
        expansion: QueryExpansion,
        orgId: string
    ): Promise<void> {
        const { error } = await this.getSupabase()
            .from('query_expansions')
            .insert({
                org_id: orgId,
                original_query: expansion.original,
                expanded_queries: expansion.expanded,
                expansion_method: expansion.method
            })

        if (error) {
            console.error('Failed to track query expansion:', error)
        }
    }

    /**
     * Log RAG performance metrics
     */
    private async logMetrics(
        query: string,
        queryHash: string,
        context: RAGContext,
        metadata: RAGResult['metadata']
    ): Promise<void> {
        const { error } = await this.getSupabase().rpc('log_rag_metrics', {
            org_uuid: context.orgId,
            brain_uuid: context.brainTemplateId || null,
            query: query,
            query_sha256: queryHash,
            retrieval_ms: metadata.retrievalTimeMs,
            reranking_ms: metadata.rerankingTimeMs,
            total_ms: metadata.totalTimeMs,
            docs_retrieved: metadata.totalRetrieved,
            docs_final: metadata.finalCount,
            avg_score: metadata.avgRelevanceScore,
            is_cache_hit: metadata.cacheHit,
            used_expansion: metadata.expansionUsed,
            used_reranking: metadata.rerankingUsed
        })

        if (error) {
            console.error('Failed to log RAG metrics:', error)
        }
    }

    /**
     * Return empty result
     */
    private emptyResult(reason: string): RAGResult {
        console.debug(`[RAGOrchestrator] Empty result: ${reason}`)
        return {
            context: '',
            documents: [],
            metadata: {
                totalRetrieved: 0,
                finalCount: 0,
                avgRelevanceScore: 0,
                retrievalTimeMs: 0,
                rerankingTimeMs: 0,
                totalTimeMs: 0,
                cacheHit: false,
                expansionUsed: false,
                rerankingUsed: false
            },
            gapDetected:   true,
            gapConfidence: 0,
        }
    }

    /**
     * Record a knowledge gap in the knowledge_gaps table.
     * Upserts by (org_id, domain) for active gaps — deduplicates automatically.
     * Never throws — always fire-and-forget.
     */
    private async recordKnowledgeGap(
        orgId: string,
        query:  string,
        score:  number
    ): Promise<void> {
        const domain      = this.inferDomain(query)
        const description = `Low/no KB match (score: ${score.toFixed(2)}) for: "${query.slice(0, 120)}"`
        const impact      = score === 0 ? 'high' : 'medium'

        const supabase = this.getSupabase()
        const { error } = await supabase
            .from('knowledge_gaps')
            .upsert(
                {
                    org_id:           orgId,
                    domain,
                    description,
                    failed_queries:   [query],
                    occurrence_count: 1,
                    impact_level:     impact,
                    last_identified:  new Date().toISOString(),
                    status:           'identified',
                },
                {
                    onConflict:        'org_id,domain',
                    ignoreDuplicates:  false,
                }
            )

        if (error) {
            // Do not throw — gap recording must never break RAG
            console.warn('[RAGOrchestrator] knowledge_gaps upsert failed:', error.message)
        }
    }

    /**
     * Infer the KB domain from the query text.
     * Keeps domain keys consistent with known KB section names.
     */
    private inferDomain(query: string): string {
        const q = query.toLowerCase()
        if (q.includes('icp') || q.includes('target') || q.includes('persona') || q.includes('seniority')) return 'icp_targeting'
        if (q.includes('offer') || q.includes('product') || q.includes('pricing') || q.includes('service')) return 'offer_details'
        if (q.includes('brand') || q.includes('voice') || q.includes('tone') || q.includes('style'))       return 'brand_voice'
        if (q.includes('angle') || q.includes('belief') || q.includes('hypothesis'))                       return 'angle_framework'
        if (q.includes('competitor') || q.includes('alternative') || q.includes('comparison'))             return 'competitor_landscape'
        if (q.includes('objection') || q.includes('pushback') || q.includes('concern'))                   return 'objection_handling'
        return 'general'
    }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const ragOrchestrator = new RAGOrchestrator()
