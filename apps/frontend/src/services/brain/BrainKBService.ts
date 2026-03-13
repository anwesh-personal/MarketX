/**
 * BRAIN KB SERVICE
 *
 * Unified service for accessing Brain Knowledge Base (kb_sections/kb_documents).
 * This replaces the legacy `knowledge_bases` table for Brain-aware operations.
 *
 * Architecture:
 *   - Each deployed brain_agents has associated kb_sections
 *   - Each kb_section contains kb_documents
 *   - Documents are processed through embedding pipeline (pending → chunking → embedding → ready)
 *   - RAG queries use embeddings table which references kb_documents
 *
 * Usage:
 *   - Writer Studio, Brain Chat, and Agents should use this service for KB access
 *   - Legacy `knowledge_bases` table is deprecated for Brain operations
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// ============================================================
// TYPES
// ============================================================

export interface KBSection {
    id: string
    agent_id: string
    org_id: string
    name: string
    display_name: string
    description: string | null
    lock_level: 'superadmin' | 'org_admin' | 'user'
    is_active: boolean
    doc_count: number
    chunk_count: number
    last_updated: string | null
    created_at: string
}

export interface KBDocument {
    id: string
    section_id: string
    agent_id: string
    org_id: string
    title: string
    content: string
    content_hash: string
    file_name: string | null
    file_type: string | null
    status: 'pending' | 'chunking' | 'embedding' | 'ready' | 'error' | 'stale'
    chunk_count: number
    embed_model: string | null
    error_message: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface KBSearchResult {
    content: string
    source_type: string
    section_name: string | null
    document_title: string | null
    similarity_score: number
    metadata: Record<string, unknown>
}

export interface KBContext {
    sections: KBSection[]
    documents: KBDocument[]
    total_docs: number
    ready_docs: number
    pending_docs: number
}

// ============================================================
// SERVICE
// ============================================================

class BrainKBService {
    private getServiceClient() {
        return createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
    }

    /**
     * Get all KB sections for a brain agent.
     */
    async getSections(agentId: string, orgId: string): Promise<KBSection[]> {
        const supabase = createClient()
        
        const { data, error } = await supabase
            .from('kb_sections')
            .select('*')
            .eq('agent_id', agentId)
            .eq('org_id', orgId)
            .eq('is_active', true)
            .order('name')

        if (error) {
            throw new Error(`[BrainKBService.getSections] Failed: ${error.message}`)
        }

        return data ?? []
    }

    /**
     * Get all documents for a brain agent, optionally filtered by section.
     */
    async getDocuments(
        agentId: string,
        orgId: string,
        options?: { sectionId?: string; status?: string; limit?: number }
    ): Promise<KBDocument[]> {
        const supabase = createClient()
        
        let query = supabase
            .from('kb_documents')
            .select('*')
            .eq('agent_id', agentId)
            .eq('org_id', orgId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (options?.sectionId) {
            query = query.eq('section_id', options.sectionId)
        }

        if (options?.status) {
            query = query.eq('status', options.status)
        }

        if (options?.limit) {
            query = query.limit(options.limit)
        }

        const { data, error } = await query

        if (error) {
            throw new Error(`[BrainKBService.getDocuments] Failed: ${error.message}`)
        }

        return data ?? []
    }

    /**
     * Get full KB context for a brain agent (sections + documents summary).
     */
    async getKBContext(agentId: string, orgId: string): Promise<KBContext> {
        const [sections, documents] = await Promise.all([
            this.getSections(agentId, orgId),
            this.getDocuments(agentId, orgId),
        ])

        return {
            sections,
            documents,
            total_docs: documents.length,
            ready_docs: documents.filter(d => d.status === 'ready').length,
            pending_docs: documents.filter(d => d.status === 'pending' || d.status === 'chunking' || d.status === 'embedding').length,
        }
    }

    /**
     * Search KB using hybrid search (FTS + vector).
     * Uses embeddings table which is linked to kb_documents.
     */
    async search(
        orgId: string,
        query: string,
        options?: {
            agentId?: string
            sectionName?: string
            topK?: number
            minSimilarity?: number
        }
    ): Promise<KBSearchResult[]> {
        const supabase = createClient()
        const topK = options?.topK ?? 5
        
        let q = supabase
            .from('embeddings')
            .select('id, content, metadata, source_type, similarity')
            .eq('org_id', orgId)
            .textSearch('content', query, { type: 'websearch', config: 'english' })
            .limit(topK)

        if (options?.sectionName) {
            q = q.contains('metadata', { section: options.sectionName })
        }

        const { data, error } = await q

        if (error) {
            throw new Error(`[BrainKBService.search] Failed: ${error.message}`)
        }

        return (data ?? []).map(row => ({
            content: row.content,
            source_type: row.source_type ?? 'unknown',
            section_name: (row.metadata as Record<string, unknown>)?.section as string ?? null,
            document_title: (row.metadata as Record<string, unknown>)?.title as string ?? null,
            similarity_score: row.similarity ?? 0,
            metadata: row.metadata as Record<string, unknown> ?? {},
        }))
    }

    /**
     * Get aggregated KB content for a brain agent, suitable for prompt injection.
     * Returns concatenated content from ready documents, organized by section.
     */
    async getKBContentForPrompt(
        agentId: string,
        orgId: string,
        options?: {
            sections?: string[]
            maxChars?: number
        }
    ): Promise<string> {
        const supabase = createClient()
        const maxChars = options?.maxChars ?? 50000

        let query = supabase
            .from('kb_documents')
            .select(`
                title,
                content,
                section:kb_sections!inner(name, display_name)
            `)
            .eq('agent_id', agentId)
            .eq('org_id', orgId)
            .eq('is_active', true)
            .eq('status', 'ready')
            .order('created_at', { ascending: false })

        if (options?.sections && options.sections.length > 0) {
            query = query.in('kb_sections.name', options.sections)
        }

        const { data, error } = await query

        if (error) {
            throw new Error(`[BrainKBService.getKBContentForPrompt] Failed: ${error.message}`)
        }

        if (!data || data.length === 0) {
            return ''
        }

        const sectionMap: Record<string, string[]> = {}
        
        for (const doc of data) {
            const section = doc.section as { name: string; display_name: string }
            const sectionName = section?.display_name ?? 'General'
            
            if (!sectionMap[sectionName]) {
                sectionMap[sectionName] = []
            }
            
            sectionMap[sectionName].push(`### ${doc.title}\n${doc.content}`)
        }

        let result = ''
        for (const [sectionName, docs] of Object.entries(sectionMap)) {
            result += `\n## ${sectionName}\n\n`
            result += docs.join('\n\n')
            
            if (result.length > maxChars) {
                result = result.slice(0, maxChars) + '\n\n[Content truncated...]'
                break
            }
        }

        return result.trim()
    }

    /**
     * Get ICP context from RS:OS icp table.
     * Uses partner_id (= org_id).
     */
    async getICPContext(orgId: string, icpId?: string): Promise<Record<string, unknown> | null> {
        const supabase = createClient()

        if (icpId) {
            const { data, error } = await supabase
                .from('icp')
                .select('id, name, criteria, status')
                .eq('partner_id', orgId)
                .eq('id', icpId)
                .single()

            if (error) return null
            return data
        }

        const { data } = await supabase
            .from('icp')
            .select('id, name, criteria, status')
            .eq('partner_id', orgId)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()

        return data
    }

    /**
     * Get Belief context from RS:OS belief table.
     * Uses partner_id (= org_id).
     */
    async getBeliefContext(
        orgId: string,
        options?: { beliefId?: string; icpId?: string; limit?: number }
    ): Promise<Record<string, unknown>[]> {
        const supabase = createClient()

        let query = supabase
            .from('belief')
            .select('id, statement, angle, lane, status, confidence_score, allocation_weight, icp_id, offer_id, brief_id')
            .eq('partner_id', orgId)
            .in('status', ['TEST', 'SW', 'IW', 'RW', 'GW'])
            .order('confidence_score', { ascending: false })

        if (options?.beliefId) {
            query = query.eq('id', options.beliefId)
        }

        if (options?.icpId) {
            query = query.eq('icp_id', options.icpId)
        }

        if (options?.limit) {
            query = query.limit(options.limit)
        } else {
            query = query.limit(5)
        }

        const { data, error } = await query

        if (error) {
            throw new Error(`[BrainKBService.getBeliefContext] Failed: ${error.message}`)
        }

        return data ?? []
    }

    /**
     * Get Offer context from RS:OS offer table.
     * Uses partner_id (= org_id).
     */
    async getOfferContext(orgId: string, offerId?: string): Promise<Record<string, unknown> | null> {
        const supabase = createClient()

        if (offerId) {
            const { data, error } = await supabase
                .from('offer')
                .select('id, name, category, primary_promise, status')
                .eq('partner_id', orgId)
                .eq('id', offerId)
                .single()

            if (error) return null
            return data
        }

        const { data } = await supabase
            .from('offer')
            .select('id, name, category, primary_promise, status')
            .eq('partner_id', orgId)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()

        return data
    }

    /**
     * Build complete context for email generation.
     * Combines Brain KB + ICP + Belief + Offer.
     */
    async buildWriterContext(
        agentId: string,
        orgId: string,
        options?: {
            icpId?: string
            beliefId?: string
            offerId?: string
            kbSections?: string[]
        }
    ): Promise<{
        kb_content: string
        icp: Record<string, unknown> | null
        beliefs: Record<string, unknown>[]
        offer: Record<string, unknown> | null
    }> {
        const [kbContent, icp, beliefs, offer] = await Promise.all([
            this.getKBContentForPrompt(agentId, orgId, { sections: options?.kbSections }),
            this.getICPContext(orgId, options?.icpId),
            this.getBeliefContext(orgId, { 
                beliefId: options?.beliefId, 
                icpId: options?.icpId,
                limit: 5 
            }),
            this.getOfferContext(orgId, options?.offerId),
        ])

        return {
            kb_content: kbContent,
            icp,
            beliefs,
            offer,
        }
    }
}

export const brainKBService = new BrainKBService()
