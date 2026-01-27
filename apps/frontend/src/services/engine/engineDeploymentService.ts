/**
 * Engine Deployment Service
 * 
 * Manages AI engine deployment, configuration, and lifecycle
 * Uses Axiom's engine_instances table from migration 014
 * 
 * @author Axiom Engine
 * @date 2026-01-27
 */

import { createClient } from '@supabase/supabase-js'

// Types matching Axiom's engine_instances schema from migration 014
interface EngineInstance {
    id: string
    name: string
    template_id: string
    org_id?: string
    kb_id?: string
    constitution_id?: string
    status: 'active' | 'standby' | 'disabled' | 'error'
    config: any
    runs_today: number
    runs_total: number
    last_run_at?: string
    error_message?: string
    created_at: string
    updated_at: string
}

interface CreateEngineInput {
    name: string
    template_id: string
    org_id?: string
    kb_id?: string
    constitution_id?: string
    status?: 'active' | 'standby' | 'disabled'
    config?: any
}

interface UpdateEngineInput {
    name?: string
    kb_id?: string
    constitution_id?: string
    status?: 'active' | 'standby' | 'disabled' | 'error'
    config?: any
    error_message?: string
}

class EngineDeploymentService {
    private supabase: any

    constructor() {
        // Will be initialized with pool
    }

    initialize(supabaseClient: any) {
        this.supabase = supabaseClient
        console.log('🚀 Engine Deployment Service initialized')
    }

    /**
     * Deploy a new engine from a workflow template
     */
    async deployEngine(input: CreateEngineInput): Promise<EngineInstance | null> {
        if (!this.supabase) {
            console.error('❌ Supabase not initialized')
            return null
        }

        try {
            console.log(`📦 Deploying new engine: ${input.name}`)

            const { data, error } = await this.supabase
                .from('engine_instances')
                .insert({
                    name: input.name,
                    template_id: input.template_id,
                    org_id: input.org_id,
                    kb_id: input.kb_id,
                    constitution_id: input.constitution_id,
                    status: input.status || 'disabled',
                    config: input.config || {}
                })
                .select()
                .single()

            if (error) throw error

            console.log(`✅ Engine deployed: ${data.id}`)
            return data as EngineInstance
        } catch (error) {
            console.error('❌ Failed to deploy engine:', error)
            return null
        }
    }

    /**
     * Clone engine from workflow template using database function
     */
    async cloneFromTemplate(templateId: string, name: string, orgId?: string): Promise<string | null> {
        if (!this.supabase) return null

        try {
            const { data, error } = await this.supabase
                .rpc('clone_engine_from_template', {
                    p_template_id: templateId,
                    p_name: name,
                    p_org_id: orgId || null
                })

            if (error) throw error
            console.log(`✅ Engine cloned from template: ${data}`)
            return data
        } catch (error) {
            console.error('❌ Failed to clone engine:', error)
            return null
        }
    }

    /**
     * Get all engines
     */
    async getAllEngines(includeDisabled = false): Promise<EngineInstance[]> {
        if (!this.supabase) return []

        try {
            let query = this.supabase
                .from('engine_instances')
                .select(`
                    *,
                    template:workflow_templates(id, name, status)
                `)
                .order('created_at', { ascending: false })

            if (!includeDisabled) {
                query = query.neq('status', 'disabled')
            }

            const { data, error } = await query

            if (error) throw error
            return (data || []) as EngineInstance[]
        } catch (error) {
            console.error('❌ Failed to fetch engines:', error)
            return []
        }
    }

    /**
     * Get engines by organization
     */
    async getEnginesByOrg(orgId: string): Promise<EngineInstance[]> {
        if (!this.supabase) return []

        try {
            const { data, error } = await this.supabase
                .from('engine_instances')
                .select(`
                    *,
                    template:workflow_templates(id, name)
                `)
                .eq('org_id', orgId)
                .order('name')

            if (error) throw error
            return (data || []) as EngineInstance[]
        } catch (error) {
            console.error(`❌ Failed to fetch engines for org ${orgId}:`, error)
            return []
        }
    }

    /**
     * Get engine by ID
     */
    async getEngineById(engineId: string): Promise<EngineInstance | null> {
        if (!this.supabase) return null

        try {
            const { data, error } = await this.supabase
                .from('engine_instances')
                .select(`
                    *,
                    template:workflow_templates(id, name, nodes, edges)
                `)
                .eq('id', engineId)
                .single()

            if (error) throw error
            return data as EngineInstance
        } catch (error) {
            console.error(`❌ Failed to fetch engine ${engineId}:`, error)
            return null
        }
    }

    /**
     * Update an engine
     */
    async updateEngine(engineId: string, updates: UpdateEngineInput): Promise<EngineInstance | null> {
        if (!this.supabase) return null

        try {
            console.log(`📝 Updating engine: ${engineId}`)

            const { data, error } = await this.supabase
                .from('engine_instances')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', engineId)
                .select()
                .single()

            if (error) throw error

            console.log(`✅ Engine updated: ${engineId}`)
            return data as EngineInstance
        } catch (error) {
            console.error(`❌ Failed to update engine ${engineId}:`, error)
            return null
        }
    }

    /**
     * Set engine status
     */
    async setEngineStatus(engineId: string, status: 'active' | 'standby' | 'disabled' | 'error', errorMessage?: string): Promise<boolean> {
        if (!this.supabase) return false

        try {
            const updates: any = {
                status,
                updated_at: new Date().toISOString()
            }

            if (errorMessage !== undefined) {
                updates.error_message = errorMessage
            }

            const { error } = await this.supabase
                .from('engine_instances')
                .update(updates)
                .eq('id', engineId)

            if (error) throw error
            console.log(`✅ Engine ${engineId} status set to: ${status}`)
            return true
        } catch (error) {
            console.error(`❌ Failed to set engine status ${engineId}:`, error)
            return false
        }
    }

    /**
     * Get engine statistics from run logs
     */
    async getEngineStats(engineId: string): Promise<any> {
        if (!this.supabase) return null

        try {
            // Get run logs for this engine
            const { data: logs, error } = await this.supabase
                .from('engine_run_logs')
                .select('status, tokens_used, cost_usd, duration_ms')
                .eq('engine_id', engineId)

            if (error) throw error

            const stats = {
                total_runs: logs.length,
                successful: logs.filter((l: any) => l.status === 'completed').length,
                failed: logs.filter((l: any) => l.status === 'failed').length,
                total_tokens: logs.reduce((sum: number, l: any) => sum + (l.tokens_used || 0), 0),
                total_cost: logs.reduce((sum: number, l: any) => sum + parseFloat(l.cost_usd || 0), 0),
                avg_duration: logs.length > 0
                    ? logs.reduce((sum: number, l: any) => sum + (l.duration_ms || 0), 0) / logs.length
                    : 0
            }

            return stats
        } catch (error) {
            console.error(`❌ Failed to get stats for engine ${engineId}:`, error)
            return null
        }
    }

    /**
     * Increment run counter after successful execution
     */
    async incrementRunCounter(engineId: string): Promise<boolean> {
        if (!this.supabase) return false

        try {
            // Try RPC first (atomic increment)
            const { error } = await this.supabase.rpc('increment_engine_runs', {
                p_engine_id: engineId
            })

            // Fallback if RPC doesn't exist - fetch then update
            if (error) {
                // Get current values
                const { data: current, error: fetchError } = await this.supabase
                    .from('engine_instances')
                    .select('runs_today, runs_total')
                    .eq('id', engineId)
                    .single()

                if (fetchError) throw fetchError

                // Update with incremented values
                const { error: updateError } = await this.supabase
                    .from('engine_instances')
                    .update({
                        runs_today: (current?.runs_today || 0) + 1,
                        runs_total: (current?.runs_total || 0) + 1,
                        last_run_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', engineId)

                if (updateError) throw updateError
            }

            return true
        } catch (error) {
            console.error(`❌ Failed to increment run counter for ${engineId}:`, error)
            return false
        }
    }
}

// Export singleton
export const engineDeploymentService = new EngineDeploymentService()
export default engineDeploymentService
