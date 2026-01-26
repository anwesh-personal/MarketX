/**
 * Brain AI Configuration Service
 * 
 * Integrates AI Provider Service with Brain system
 * Handles brain-to-provider assignments and worker coordination
 * 
 * @author Anwesh Rath
 * @date 2026-01-16
 */

import { createClient } from '@/lib/supabase/client'
import { aiProviderService } from '@/services/ai'
import type { ProviderType, GenerationOptions, GenerationResult } from '@/services/ai'

export interface BrainAIConfig {
    brainId: string
    preferredProvider: ProviderType
    fallbackProviders: ProviderType[]
    modelOverrides?: Record<string, string> // agent_type -> model_id
    maxTokens?: number
    temperature?: number
}

export interface BrainAssignment {
    userId: string
    organizationId: string
    brainTemplateId: string
    brainId: string  // Cloned brain instance
    isActive: boolean
    createdAt: Date
}

export class BrainAIConfigService {
    private getSupabase() { return createClient() }

    /**
     * Configure AI provider for a brain
     * Sets preferred provider and fallback chain
     */
    async configureBrainAI(config: BrainAIConfig): Promise<void> {
        const { error } = await this.getSupabase()
            .from('brain_configs')
            .upsert({
                brain_id: config.brainId,
                preferred_provider: config.preferredProvider,
                fallback_providers: config.fallbackProviders,
                model_overrides: config.modelOverrides || {},
                max_tokens: config.maxTokens || 2000,
                temperature: config.temperature ?? 0.7,
                updated_at: new Date().toISOString()
            })

        if (error) {
            throw new Error(`Failed to configure brain AI: ${error.message}`)
        }

        console.log(`✅ Brain ${config.brainId} configured with ${config.preferredProvider}`)
    }

    /**
     * Get AI configuration for a brain
     */
    async getBrainAIConfig(brainId: string): Promise<BrainAIConfig | null> {
        const { data, error } = await this.getSupabase()
            .from('brain_configs')
            .select('*')
            .eq('brain_id', brainId)
            .single()

        if (error || !data) {
            console.warn(`No AI config for brain ${brainId}, using defaults`)
            return {
                brainId,
                preferredProvider: 'openai',
                fallbackProviders: ['anthropic', 'google']
            }
        }

        return {
            brainId: data.brain_id,
            preferredProvider: data.preferred_provider as ProviderType,
            fallbackProviders: data.fallback_providers as ProviderType[],
            modelOverrides: data.model_overrides,
            maxTokens: data.max_tokens,
            temperature: data.temperature
        }
    }

    /**
     * Assign brain to user (creates clone from template)
     * This is the flow: Superadmin activates AI → Configure brain → Assign to user → Worker handles
     */
    async assignBrainToUser(
        userId: string,
        organizationId: string,
        brainTemplateId: string
    ): Promise<BrainAssignment> {
        // Step 1: Clone brain template for user
        const { data: clonedBrain, error: cloneError } = await this.getSupabase()
            .rpc('clone_brain_template', {
                p_user_id: userId,
                p_org_id: organizationId,
                p_template_id: brainTemplateId
            })

        if (cloneError) {
            throw new Error(`Failed to clone brain: ${cloneError.message}`)
        }

        // RPC returns TABLE, so data is an array
        if (!clonedBrain || clonedBrain.length === 0) {
            throw new Error('Brain cloning failed: No brain ID returned')
        }

        const brainId = clonedBrain[0].brain_id

        // Step 2: Inherit AI config from template
        const templateConfig = await this.getBrainAIConfig(brainTemplateId)
        if (templateConfig) {
            await this.configureBrainAI({
                ...templateConfig,
                brainId // Override with new cloned brain ID
            })
        }

        // Step 3: Create assignment record
        const { data: assignment, error: assignError } = await this.getSupabase()
            .from('user_brain_assignments')
            .insert({
                user_id: userId,
                organization_id: organizationId,
                brain_template_id: brainTemplateId,
                brain_id: brainId,
                is_active: true
            })
            .select()
            .single()

        if (assignError) {
            throw new Error(`Failed to create assignment: ${assignError.message}`)
        }

        console.log(`✅ Brain ${brainId} assigned to user ${userId}`)

        return {
            userId: assignment.user_id,
            organizationId: assignment.organization_id,
            brainTemplateId: assignment.brain_template_id,
            brainId: assignment.brain_id,
            isActive: assignment.is_active,
            createdAt: new Date(assignment.created_at)
        }
    }

    /**
     * Generate content using brain's configured AI provider
     * Handles failover automatically
     */
    async generateWithBrain(
        brainId: string,
        prompt: string,
        agentType?: string,
        options: Partial<GenerationOptions> = {}
    ): Promise<GenerationResult> {
        // Get brain's AI config
        const config = await this.getBrainAIConfig(brainId)
        if (!config) {
            throw new Error(`No AI configuration for brain ${brainId}`)
        }

        // Build generation options
        const generationOptions: GenerationOptions = {
            maxTokens: options.maxTokens || config.maxTokens,
            temperature: options.temperature ?? config.temperature,
            systemPrompt: options.systemPrompt,
            model: agentType && config.modelOverrides?.[agentType]
                ? config.modelOverrides[agentType]
                : options.model
        }

        // Try preferred provider first
        try {
            return await aiProviderService.generate(
                config.preferredProvider,
                prompt,
                generationOptions
            )
        } catch (error) {
            console.warn(`Preferred provider ${config.preferredProvider} failed, trying fallbacks`)

            // Try fallback providers
            for (const fallbackProvider of config.fallbackProviders) {
                try {
                    return await aiProviderService.generate(
                        fallbackProvider,
                        prompt,
                        generationOptions
                    )
                } catch (fallbackError) {
                    console.warn(`Fallback provider ${fallbackProvider} also failed`)
                    continue
                }
            }

            throw new Error('All AI providers failed for this brain')
        }
    }

    /**
     * Get user's active brain
     */
    async getUserBrain(userId: string, organizationId: string): Promise<string | null> {
        const { data, error } = await this.getSupabase()
            .from('user_brain_assignments')
            .select('brain_id')
            .eq('user_id', userId)
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (error || !data) {
            return null
        }

        return data.brain_id
    }

    /**
     * Deactivate user's brain
     */
    async deactivateUserBrain(userId: string, brainId: string): Promise<void> {
        const { error } = await this.getSupabase()
            .from('user_brain_assignments')
            .update({ is_active: false })
            .eq('user_id', userId)
            .eq('brain_id', brainId)

        if (error) {
            throw new Error(`Failed to deactivate brain: ${error.message}`)
        }

        console.log(`✅ Brain ${brainId} deactivated for user ${userId}`)
    }
}

// Export singleton
export const brainAIConfigService = new BrainAIConfigService()
