import { createClient } from '@/lib/supabase/server'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface BrainConfig {
    providers: {
        chat: string | null
        embeddings: string | null
        completion?: string | null
        vision?: string | null
    }
    agents: Record<string, AgentConfig>
    rag: RAGConfig
    memory: MemoryConfig
    limits: LimitsConfig
    features?: FeaturesConfig
}

export interface AgentConfig {
    systemPrompt: string
    temperature: number
    maxTokens: number
    tools: string[]
    providerId?: string | null
}

export interface RAGConfig {
    enabled: boolean
    topK: number
    minSimilarity: number
    rerankingEnabled: boolean
    hybridSearch: boolean
    weights: {
        vector: number
        fts: number
    }
    graphMemory?: boolean
    causalReasoning?: boolean
}

export interface MemoryConfig {
    maxContextTokens: number
    maxMemoryTokens: number
    conversationWindowSize: number
    enableSummarization: boolean
    temporalMemory?: boolean
    causalReasoning?: boolean
    graphMemory?: boolean
}

export interface LimitsConfig {
    maxRequestsPerMinute: number
    maxTokensPerDay: number
}

export interface FeaturesConfig {
    multiAgent?: boolean
    streamingEnabled?: boolean
    contentAnalysis?: boolean
    multiModal?: boolean
    rlhf?: boolean
    abTesting?: boolean
    customTools?: boolean
    advancedAnalytics?: boolean
    apiAccess?: boolean
    prioritySupport?: boolean
}

export interface BrainTemplate {
    id: string
    name: string
    version: string
    description: string
    config: BrainConfig
    isActive: boolean
    isDefault: boolean
    pricingTier: 'echii' | 'pulz' | 'quanta'
    metadata: Record<string, any>
    createdBy?: string
    createdAt: string
    updatedAt: string
}

export interface OrgBrainAssignment {
    id: string
    orgId: string
    brainTemplateId: string
    customConfig: Record<string, any>
    isActive: boolean
    assignedAt: string
    assignedBy?: string
}

export interface BrainVersionHistory {
    id: string
    brainTemplateId: string
    version: string
    config: BrainConfig
    changeSummary?: string
    createdBy?: string
    createdAt: string
}

export interface BrainRequestLog {
    id?: string
    orgId: string
    userId?: string
    brainTemplateId: string
    abTestId?: string
    requestType: string
    responseTimeMs: number
    tokensUsed: number
    feedbackRating?: -1 | 0 | 1
    metadata?: Record<string, any>
}

export interface BrainPerformanceMetrics {
    brainTemplateId: string
    date: string
    totalRequests: number
    avgResponseTime: number
    p95ResponseTime: number
    p99ResponseTime: number
    minResponseTime: number
    maxResponseTime: number
    totalTokens: number
    avgTokens: number
    positiveFeedback: number
    negativeFeedback: number
    neutralFeedback: number
    totalFeedback: number
    satisfactionRate: number | null
}

// ============================================================
// BRAIN CONFIGURATION SERVICE
// ============================================================

export class BrainConfigService {
    /**
     * Get Supabase client - created lazily to avoid request scope issues
     */
    private getSupabase() {
        return createClient()
    }

    /**
     * Get all active brain templates
     * Optionally filter by pricing tier
     */
    async listTemplates(tier?: 'echii' | 'pulz' | 'quanta'): Promise<BrainTemplate[]> {
        const supabase = this.getSupabase()

        let query = supabase
            .from('brain_templates')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (tier) {
            query = query.eq('pricing_tier', tier)
        }

        const { data, error } = await query

        if (error) {
            console.error('Failed to list brain templates:', error)
            throw new Error(`Failed to list brain templates: ${error.message}`)
        }

        return this.mapBrainTemplates(data || [])
    }

    /**
     * Get brain template by ID
     */
    async getTemplate(id: string): Promise<BrainTemplate | null> {
        const supabase = this.getSupabase()

        const { data, error } = await supabase
            .from('brain_templates')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return null // Not found
            }
            console.error('Failed to get brain template:', error)
            throw new Error(`Failed to get brain template: ${error.message}`)
        }

        return this.mapBrainTemplate(data)
    }

    /**
     * Create new brain template (Superadmin only)
     */
    async createTemplate(
        template: Omit<BrainTemplate, 'id' | 'createdAt' | 'updatedAt'>,
        adminId: string
    ): Promise<BrainTemplate> {
        const supabase = this.getSupabase()

        const { data, error } = await supabase
            .from('brain_templates')
            .insert({
                name: template.name,
                version: template.version,
                description: template.description,
                config: template.config,
                is_active: template.isActive,
                is_default: template.isDefault,
                pricing_tier: template.pricingTier,
                metadata: template.metadata || {},
                created_by: adminId
            })
            .select()
            .single()

        if (error) {
            console.error('Failed to create brain template:', error)
            throw new Error(`Failed to create brain template: ${error.message}`)
        }

        return this.mapBrainTemplate(data)
    }

    /**
     * Update brain template
     * Automatically saves version history via database trigger
     */
    async updateTemplate(
        id: string,
        updates: Partial<BrainTemplate>,
        adminId: string
    ): Promise<BrainTemplate> {
        const supabase = this.getSupabase()
        const updateData: any = {}

        if (updates.name !== undefined) updateData.name = updates.name
        if (updates.version !== undefined) updateData.version = updates.version
        if (updates.description !== undefined) updateData.description = updates.description
        if (updates.config !== undefined) updateData.config = updates.config
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive
        if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault
        if (updates.pricingTier !== undefined) updateData.pricing_tier = updates.pricingTier
        if (updates.metadata !== undefined) updateData.metadata = updates.metadata

        // Track who made the change
        updateData.created_by = adminId

        const { data, error } = await supabase
            .from('brain_templates')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Failed to update brain template:', error)
            throw new Error(`Failed to update brain template: ${error.message}`)
        }

        return this.mapBrainTemplate(data)
    }

    /**
     * Deactivate brain template (soft delete)
     */
    async deactivateTemplate(id: string, adminId: string): Promise<void> {
        const supabase = this.getSupabase()

        const { error } = await supabase
            .from('brain_templates')
            .update({
                is_active: false,
                created_by: adminId
            })
            .eq('id', id)

        if (error) {
            console.error('Failed to deactivate brain template:', error)
            throw new Error(`Failed to deactivate brain template: ${error.message}`)
        }
    }

    /**
     * Get org's assigned brain configuration
     * Returns brain template merged with org-specific customizations
     * Falls back to default brain if no assignment
     */
    async getOrgBrain(orgId: string): Promise<BrainTemplate & { customConfig?: any }> {
        const supabase = this.getSupabase()

        // First try to get assigned brain
        const { data, error } = await supabase
            .from('org_brain_assignments')
            .select(`
        custom_config,
        brain_template:brain_templates(*)
      `)
            .eq('org_id', orgId)
            .eq('is_active', true)
            .single()

        if (error || !data) {
            // No assignment - return default brain
            const { data: defaultBrain, error: defaultError } = await supabase
                .from('brain_templates')
                .select('*')
                .eq('is_default', true)
                .eq('is_active', true)
                .single()

            if (defaultError || !defaultBrain) {
                throw new Error('No default brain template configured')
            }

            return this.mapBrainTemplate(defaultBrain)
        }

        // Merge template config with custom overrides
        const template = (data as any).brain_template
        const customConfig = data.custom_config || {}

        const mergedTemplate = this.mapBrainTemplate(template)

        return {
            ...mergedTemplate,
            config: this.mergeConfigs(mergedTemplate.config, customConfig),
            customConfig
        }
    }

    /**
     * Assign brain template to organization
     */
    async assignBrainToOrg(
        orgId: string,
        brainTemplateId: string,
        customConfig?: any,
        adminId?: string
    ): Promise<void> {
        const supabase = this.getSupabase()

        const { error } = await supabase
            .from('org_brain_assignments')
            .upsert({
                org_id: orgId,
                brain_template_id: brainTemplateId,
                custom_config: customConfig || {},
                is_active: true,
                assigned_by: adminId
            }, {
                onConflict: 'org_id,brain_template_id'
            })

        if (error) {
            console.error('Failed to assign brain to org:', error)
            throw new Error(`Failed to assign brain to org: ${error.message}`)
        }
    }

    /**
     * Remove brain assignment from org (revert to default)
     */
    async unassignBrainFromOrg(orgId: string, brainTemplateId: string): Promise<void> {
        const supabase = this.getSupabase()

        const { error } = await supabase
            .from('org_brain_assignments')
            .update({ is_active: false })
            .eq('org_id', orgId)
            .eq('brain_template_id', brainTemplateId)

        if (error) {
            console.error('Failed to unassign brain from org:', error)
            throw new Error(`Failed to unassign brain from org: ${error.message}`)
        }
    }

    /**
     * Get version history for a brain template
     */
    async getVersionHistory(brainTemplateId: string, limit: number = 20): Promise<BrainVersionHistory[]> {
        const supabase = this.getSupabase()

        const { data, error } = await supabase
            .from('brain_version_history')
            .select('*')
            .eq('brain_template_id', brainTemplateId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('Failed to get version history:', error)
            throw new Error(`Failed to get version history: ${error.message}`)
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            brainTemplateId: row.brain_template_id,
            version: row.version,
            config: row.config,
            changeSummary: row.change_summary,
            createdBy: row.created_by,
            createdAt: row.created_at
        }))
    }

    /**
     * Rollback brain template to a previous version
     */
    async rollbackToVersion(
        brainTemplateId: string,
        versionId: string,
        adminId: string
    ): Promise<BrainTemplate> {
        const supabase = this.getSupabase()

        // Get version config
        const { data: version, error: versionError } = await supabase
            .from('brain_version_history')
            .select('config, version')
            .eq('id', versionId)
            .single()

        if (versionError) {
            console.error('Failed to get version:', versionError)
            throw new Error(`Failed to get version: ${versionError.message}`)
        }

        // Create new version string with rollback marker
        const newVersion = `${version.version}-rollback-${Date.now()}`

        // Update template with old config
        return this.updateTemplate(
            brainTemplateId,
            {
                config: version.config,
                version: newVersion
            },
            adminId
        )
    }

    /**
     * Log brain request for analytics and learning loop
     */
    async logRequest(log: BrainRequestLog): Promise<void> {
        const supabase = this.getSupabase()

        const { error } = await supabase
            .from('brain_request_logs')
            .insert({
                org_id: log.orgId,
                user_id: log.userId,
                brain_template_id: log.brainTemplateId,
                ab_test_id: log.abTestId,
                request_type: log.requestType,
                response_time_ms: log.responseTimeMs,
                tokens_used: log.tokensUsed,
                feedback_rating: log.feedbackRating,
                metadata: log.metadata || {}
            })

        if (error) {
            // Don't throw - logging failure shouldn't break the request
            console.error('Failed to log brain request:', error)
        }
    }

    /**
     * Get performance metrics for a brain template
     */
    async getPerformanceMetrics(
        brainTemplateId: string,
        days: number = 30
    ): Promise<BrainPerformanceMetrics[]> {
        const supabase = this.getSupabase()

        const { data, error } = await supabase
            .from('brain_performance_stats')
            .select('*')
            .eq('brain_template_id', brainTemplateId)
            .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('date', { ascending: false })

        if (error) {
            console.error('Failed to get performance metrics:', error)
            throw new Error(`Failed to get performance metrics: ${error.message}`)
        }

        return (data || []).map((row: any) => ({
            brainTemplateId: row.brain_template_id,
            date: row.date,
            totalRequests: row.total_requests,
            avgResponseTime: row.avg_response_time,
            p95ResponseTime: row.p95_response_time,
            p99ResponseTime: row.p99_response_time,
            minResponseTime: row.min_response_time,
            maxResponseTime: row.max_response_time,
            totalTokens: row.total_tokens,
            avgTokens: row.avg_tokens,
            positiveFeedback: row.positive_feedback,
            negativeFeedback: row.negative_feedback,
            neutralFeedback: row.neutral_feedback,
            totalFeedback: row.total_feedback,
            satisfactionRate: row.satisfaction_rate
        }))
    }

    /**
     * Refresh performance statistics materialized view
     */
    async refreshPerformanceStats(): Promise<void> {
        const supabase = this.getSupabase()

        const { error } = await supabase.rpc('refresh_brain_stats')

        if (error) {
            console.error('Failed to refresh performance stats:', error)
            throw new Error(`Failed to refresh performance stats: ${error.message}`)
        }
    }

    // ============================================================
    // PRIVATE HELPER METHODS
    // ============================================================

    /**
     * Deep merge configs - custom overrides template
     */
    private mergeConfigs(template: any, custom: any): any {
        if (!custom || Object.keys(custom).length === 0) {
            return template
        }

        const merged = { ...template }

        for (const key in custom) {
            if (typeof custom[key] === 'object' && !Array.isArray(custom[key]) && custom[key] !== null) {
                merged[key] = this.mergeConfigs(template[key] || {}, custom[key])
            } else {
                merged[key] = custom[key]
            }
        }

        return merged
    }

    /**
     * Map database row to BrainTemplate
     */
    private mapBrainTemplate(row: any): BrainTemplate {
        return {
            id: row.id,
            name: row.name,
            version: row.version,
            description: row.description,
            config: row.config,
            isActive: row.is_active,
            isDefault: row.is_default,
            pricingTier: row.pricing_tier,
            metadata: row.metadata || {},
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }
    }

    /**
     * Map multiple database rows to BrainTemplates
     */
    private mapBrainTemplates(rows: any[]): BrainTemplate[] {
        return rows.map(row => this.mapBrainTemplate(row))
    }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const brainConfigService = new BrainConfigService()
