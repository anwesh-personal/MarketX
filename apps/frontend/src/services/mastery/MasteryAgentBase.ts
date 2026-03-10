import { SupabaseClient } from '@supabase/supabase-js'

export type AgentType =
    | 'contact_decision' | 'timing_window' | 'angle_selection'
    | 'send_pacing' | 'reply_meaning'
    | 'buying_role' | 'buyer_stage' | 'uncertainty_resolution' | 'sequence_progression'

export interface AgentContext {
    partnerId: string
    supabase: SupabaseClient
    agentVersion?: string
}

export interface KnowledgeObject {
    id: string
    partner_id: string | null
    scope: 'local' | 'candidate_global' | 'global'
    object_type: string
    title: string
    description: string | null
    confidence: number
    sample_size: number
    pattern_data: Record<string, any>
    recommendation: string | null
    constraints: Record<string, any>
    locked_fields: string[]
}

export interface DecisionResult {
    decision: string
    detail: Record<string, any>
    confidence: number
    reasoning: string
    knowledgeObjectsUsed: string[]
}

export abstract class MasteryAgentBase {
    protected agentType: AgentType
    protected context: AgentContext
    protected version: string

    constructor(agentType: AgentType, context: AgentContext) {
        this.agentType = agentType
        this.context = context
        this.version = context.agentVersion ?? '1.0'
    }

    /**
     * Read from Local KB first, then Global priors.
     * Agents never read candidate_global directly.
     */
    protected async readKnowledge(
        objectType: string,
        filters?: { minConfidence?: number; limit?: number; applicableIndustry?: string }
    ): Promise<KnowledgeObject[]> {
        const { supabase, partnerId } = this.context
        const limit = filters?.limit ?? 20
        const minConf = filters?.minConfidence ?? 0

        const { data: localKB } = await supabase
            .from('knowledge_object')
            .select('*')
            .eq('partner_id', partnerId)
            .eq('scope', 'local')
            .eq('object_type', objectType)
            .gte('confidence', minConf)
            .eq('promotion_status', 'active')
            .order('confidence', { ascending: false })
            .limit(limit)

        const localIds = new Set((localKB ?? []).map((k: any) => k.id))

        const { data: globalKB } = await supabase
            .from('knowledge_object')
            .select('*')
            .eq('scope', 'global')
            .eq('object_type', objectType)
            .gte('confidence', minConf)
            .eq('promotion_status', 'active')
            .order('confidence', { ascending: false })
            .limit(limit)

        const combined = [...(localKB ?? []), ...(globalKB ?? []).filter((g: any) => !localIds.has(g.id))]
        return combined.slice(0, limit) as KnowledgeObject[]
    }

    /**
     * Write to Local KB only. Agents cannot write to global or candidate_global.
     */
    protected async writeKnowledge(input: {
        objectType: string
        title: string
        description?: string
        patternData: Record<string, any>
        confidence: number
        sampleSize: number
        recommendation?: string
        applicableIndustries?: string[]
        applicableGeographies?: string[]
    }): Promise<string> {
        const { supabase, partnerId } = this.context

        const { data, error } = await supabase
            .from('knowledge_object')
            .insert({
                partner_id: partnerId,
                scope: 'local',
                object_type: input.objectType,
                title: input.title,
                description: input.description ?? null,
                pattern_data: input.patternData,
                confidence: input.confidence,
                sample_size: input.sampleSize,
                recommendation: input.recommendation ?? null,
                applicable_industries: input.applicableIndustries ?? [],
                applicable_geographies: input.applicableGeographies ?? [],
                evidence_count: 1,
                evidence_sources: [{ agent: this.agentType, version: this.version, at: new Date().toISOString() }],
            })
            .select('id')
            .single()

        if (error) throw new Error(`KB write failed: ${error.message}`)
        return data.id
    }

    /**
     * Update existing local KB entry with new evidence.
     */
    protected async updateKnowledge(
        objectId: string,
        updates: {
            confidence?: number
            sampleSize?: number
            patternData?: Record<string, any>
            recommendation?: string
        }
    ): Promise<void> {
        const { supabase, partnerId } = this.context

        const updatePayload: Record<string, any> = {
            last_observed_at: new Date().toISOString(),
        }
        if (updates.confidence !== undefined) updatePayload.confidence = updates.confidence
        if (updates.sampleSize !== undefined) updatePayload.sample_size = updates.sampleSize
        if (updates.patternData !== undefined) updatePayload.pattern_data = updates.patternData
        if (updates.recommendation !== undefined) updatePayload.recommendation = updates.recommendation

        const { error } = await supabase
            .from('knowledge_object')
            .update(updatePayload)
            .eq('id', objectId)
            .eq('partner_id', partnerId)
            .eq('scope', 'local')

        if (error) throw new Error(`KB update failed: ${error.message}`)
    }

    /**
     * Log every decision for full audit trail.
     */
    protected async logDecision(input: {
        decisionType: string
        entityId?: string
        entityType?: string
        inputs: Record<string, any>
        result: DecisionResult
        lockedConstraints?: Record<string, any>
        executionTimeMs?: number
    }): Promise<string> {
        const { supabase, partnerId } = this.context

        const { data, error } = await supabase
            .from('agent_decision_log')
            .insert({
                partner_id: partnerId,
                agent_type: this.agentType,
                agent_version: this.version,
                decision_type: input.decisionType,
                entity_id: input.entityId ?? null,
                entity_type: input.entityType ?? null,
                inputs: input.inputs,
                knowledge_objects_used: input.result.knowledgeObjectsUsed,
                decision: input.result.decision,
                decision_detail: input.result.detail,
                confidence: input.result.confidence,
                reasoning: input.result.reasoning,
                locked_constraints: input.lockedConstraints ?? {},
                execution_time_ms: input.executionTimeMs ?? null,
            })
            .select('id')
            .single()

        if (error) throw new Error(`Decision log failed: ${error.message}`)
        return data.id
    }

    /**
     * Main execution method — implemented by each agent.
     */
    abstract execute(input: Record<string, any>): Promise<DecisionResult>
}
