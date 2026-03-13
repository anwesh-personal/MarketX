/**
 * TOOL LOADER
 *
 * Loads tool definitions from the brain_tools table in Supabase.
 * Returns them formatted for direct injection into the LLM's tool list.
 *
 * Rules:
 *  - No tool names hardcoded in TypeScript. All tool metadata lives in brain_tools.
 *  - Tools are filtered by the agent's granted list (brain_agents.tools_granted).
 *  - Disabled tools (is_enabled = false) are never returned.
 *  - If a granted tool no longer exists in the registry, it is silently skipped
 *    and a warning is logged. The agent still works with remaining tools.
 */

import { createClient } from '@/lib/supabase/server'
import type { BrainToolDefinition } from '@/services/ai/types'

export class ToolLoader {
    /**
     * Load tool definitions for a deployed agent.
     *
     * @param agentId  — brain_agents.id
     * @returns        — array of tool definitions ready for LLM injection
     */
    static async getAgentTools(agentId: string): Promise<BrainToolDefinition[]> {
        const supabase = createClient()

        // Step 1: Get the agent's granted tools list
        const { data: agent, error: agentError } = await supabase
            .from('brain_agents')
            .select('tools_granted, tier')
            .eq('id', agentId)
            .single()

        if (agentError || !agent) {
            throw new Error(`[ToolLoader] Agent ${agentId} not found: ${agentError?.message}`)
        }

        if (!agent.tools_granted || agent.tools_granted.length === 0) {
            return []
        }

        // Step 2: Fetch tool definitions from brain_tools — include min_tier for enforcement
        const { data: tools, error: toolsError } = await supabase
            .from('brain_tools')
            .select('name, description, parameters, min_tier')
            .in('name', agent.tools_granted)
            .eq('is_enabled', true)

        if (toolsError) {
            throw new Error(`[ToolLoader] Failed to load tools for agent ${agentId}: ${toolsError.message}`)
        }

        if (!tools || tools.length === 0) {
            return []
        }

        // Tier hierarchy for enforcement
        const tierRank: Record<string, number> = { basic: 1, medium: 2, enterprise: 3 }
        const agentTierRank = tierRank[agent.tier] ?? 1

        // Warn if any granted tools are missing from the registry
        const returnedNames = new Set(tools.map(t => t.name))
        for (const granted of agent.tools_granted) {
            if (!returnedNames.has(granted)) {
                console.warn(
                    `[ToolLoader] Tool "${granted}" is granted to agent ${agentId} ` +
                    `but does not exist or is disabled in brain_tools. Skipping.`
                )
            }
        }

        // Step 3: Filter by min_tier, format for LLM
        const allowed = tools.filter(tool => {
            const required = tierRank[tool.min_tier] ?? 1
            if (required > agentTierRank) {
                console.warn(
                    `[ToolLoader] Tool "${tool.name}" requires tier "${tool.min_tier}" ` +
                    `but agent ${agentId} is on tier "${agent.tier}". Skipping.`
                )
                return false
            }
            return true
        })

        return allowed.map(tool => ({
            type: 'function',
            function: {
                name:        tool.name,
                description: tool.description,
                parameters:  tool.parameters as Record<string, unknown>,
            },
        }))
    }

    /**
     * Load tool definitions for a specific list of tool names.
     * Used when you need tools without a specific agent context
     * (e.g. in admin tooling or the reflection worker).
     *
     * @param names — array of brain_tools.name values
     */
    static async getToolsByName(names: string[]): Promise<BrainToolDefinition[]> {
        if (names.length === 0) return []

        const supabase = createClient()

        const { data: tools, error } = await supabase
            .from('brain_tools')
            .select('name, description, parameters')
            .in('name', names)
            .eq('is_enabled', true)

        if (error) {
            throw new Error(`[ToolLoader] Failed to load tools by name: ${error.message}`)
        }

        return (tools ?? []).map(tool => ({
            type: 'function',
            function: {
                name:        tool.name,
                description: tool.description,
                parameters:  tool.parameters as Record<string, unknown>,
            },
        }))
    }
}
