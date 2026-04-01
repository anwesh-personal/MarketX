/**
 * PROMPT STACK ASSEMBLER
 * ======================
 * Assembles the final prompt stack by:
 *   1. Starting with base inline prompts from brain_agents
 *   2. Loading prompt_assignments for this brain agent
 *   3. Fetching the linked prompt_blocks
 *   4. APPENDING blocks by category to the corresponding prompt layer
 *
 * NEVER replaces base prompts — blocks are additive only.
 * This is Phase 3 of the Engine Unification Plan.
 */

import { createClient } from '@/lib/supabase/server'
import type { EngineRuntimePromptStack } from '@/services/engine/EngineInstanceResolver'

// ============================================================
// TYPES
// ============================================================

export interface AssembledPromptStack {
    /** Foundation prompt (base + foundation blocks) */
    foundation: string
    /** Persona prompt (base + persona blocks) */
    persona: string
    /** Domain prompt (base + domain blocks) */
    domain: string | null
    /** Guardrails prompt (base + guardrails + compliance blocks) */
    guardrails: string
    /** Additional instruction blocks (instruction, task, output, analysis, optimization) */
    instructions: string | null
    /** Number of prompt blocks appended */
    blockCount: number
    /** Names of blocks used (for audit trail) */
    blockNames: string[]
}

// ============================================================
// ASSEMBLER
// ============================================================

/**
 * Assemble the full prompt stack for a brain agent.
 * Loads prompt_assignments → prompt_blocks and appends by category.
 *
 * @param brainAgentId - The brain_agents.id to load assignments for
 * @param basePrompts  - The inline prompts from the brain_agents row (base layer)
 * @returns Assembled stack with blocks appended
 */
export async function assemblePromptStack(
    brainAgentId: string,
    basePrompts: EngineRuntimePromptStack
): Promise<AssembledPromptStack> {
    const supabase = createClient()

    // Load active prompt assignments for this brain agent, ordered by priority
    const { data: assignments, error } = await supabase
        .from('prompt_assignments')
        .select(`
            priority,
            prompt_blocks (
                id, name, slug, category, content, is_active, is_system
            )
        `)
        .eq('target_id', brainAgentId)
        .eq('target_type', 'brain_agent')
        .eq('is_active', true)
        .order('priority', { ascending: true })

    // If the query fails (e.g., table doesn't exist yet), return base prompts unchanged.
    // This ensures backward compatibility during migration.
    if (error) {
        console.warn(
            `[PromptStackAssembler] Failed to load prompt assignments for brain_agent ${brainAgentId}: ${error.message}. ` +
            `Falling back to base prompts only.`
        )
        return {
            foundation: basePrompts.foundation,
            persona: basePrompts.persona,
            domain: basePrompts.domain,
            guardrails: basePrompts.guardrails,
            instructions: null,
            blockCount: 0,
            blockNames: [],
        }
    }

    // Start with base prompts
    let foundation = basePrompts.foundation
    let persona = basePrompts.persona
    let domain = basePrompts.domain || ''
    let guardrails = basePrompts.guardrails
    let instructions = ''

    const blockNames: string[] = []

    // Append blocks by category
    for (const assignment of (assignments ?? [])) {
        const block = (assignment as any).prompt_blocks
        if (!block?.content || !block.is_active) continue

        blockNames.push(block.name)

        const marker = `\n\n--- [Prompt Block: ${block.name}] ---\n`
        const content = block.content.trim()

        switch (block.category) {
            case 'foundation':
                foundation += marker + content
                break
            case 'persona':
                persona += marker + content
                break
            case 'domain':
                domain += marker + content
                break
            case 'guardrails':
            case 'compliance':
                guardrails += marker + content
                break
            case 'instruction':
            case 'task':
            case 'output':
            case 'analysis':
            case 'optimization':
            default:
                instructions += marker + content
                break
        }
    }

    return {
        foundation,
        persona,
        domain: domain.trim() || null,
        guardrails,
        instructions: instructions.trim() || null,
        blockCount: blockNames.length,
        blockNames,
    }
}

/**
 * Flatten an assembled prompt stack into a single system prompt string.
 * Used by the worker to build the final LLM system prompt.
 */
export function flattenPromptStack(stack: AssembledPromptStack): string {
    const parts: string[] = []

    if (stack.foundation) {
        parts.push(stack.foundation)
    }
    if (stack.persona) {
        parts.push(stack.persona)
    }
    if (stack.domain) {
        parts.push(stack.domain)
    }
    if (stack.guardrails) {
        parts.push(stack.guardrails)
    }
    if (stack.instructions) {
        parts.push(stack.instructions)
    }

    return parts.join('\n\n')
}
