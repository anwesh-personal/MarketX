/**
 * PROMPT ASSEMBLER
 *
 * Assembles the layered system prompt from a brain_agents record,
 * RAG context, and memory items.
 *
 * Layer order (always this, never deviated from):
 *   1. Foundation   — what the agent IS (locked, copied from template)
 *   2. Persona      — name, personality, communication style
 *   3. Domain       — client's business context (editable by org_admin)
 *   4. Guardrails   — hard rules that override everything (locked)
 *   5. Context      — RAG results + relevant memories (runtime, per-request)
 *   6. Task         — explicit instruction for this request (per-request)
 *
 * Rules:
 *  - Guardrails are always injected AFTER domain, so they can never be
 *    overridden by user-supplied domain content.
 *  - Optional constitution rules are injected after guardrails, before context,
 *    so org rules apply before RAG/domain knowledge.
 *  - If gap_detected = true in the RAG result, a strict-grounding note
 *    is injected into the context layer so the agent does not hallucinate.
 *  - Empty layers are silently omitted — no blank sections.
 *  - The assembled prompt is deterministic: same inputs → same output.
 */

import type { RAGResult } from './RAGOrchestrator'

// Shape of a row from brain_agents (only the fields we need)
export interface BrainAgentPromptData {
    foundation_prompt:  string
    persona_prompt:     string
    domain_prompt:      string | null
    guardrails_prompt:  string
    strict_grounding:   boolean
    name:               string
}

export interface MemoryItem {
    content:       string
    memory_type:   string
    importance:    number
}

/**
 * Constitution rule for injection into system prompt.
 * Carries rule_type and enforcement_level so PromptAssembler
 * can group them semantically (forbidden ≠ style advisory).
 */
export interface ConstitutionRuleItem {
    content: string
    ruleType?: 'brand_voice' | 'compliance' | 'forbidden' | 'required' | 'style' | 'format'
    enforcementLevel?: 'strict' | 'soft' | 'advisory'
}

export interface PromptLayerDebug {
    name:     string
    chars:    number
    editable: boolean
    included: boolean
}

export interface AssembledPrompt {
    systemPrompt: string
    layers:       PromptLayerDebug[]
    totalChars:   number
}

export class PromptAssembler {
    /**
     * Assemble the full system prompt from all layers.
     *
     * @param agent             — brain_agents row data
     * @param rag               — RAG retrieval result for this query
     * @param memories          — relevant long-term memories for this query
     * @param task              — explicit task instruction (optional)
     * @param constitutionRules — org constitution rules (optional), injected after guardrails
     */
    static assemble(
        agent:             BrainAgentPromptData,
        rag:               RAGResult | null,
        memories:          MemoryItem[],
        task?:             string,
        constitutionRules?: ConstitutionRuleItem[],
    ): AssembledPrompt {
        const sections: Array<{ name: string; content: string; editable: boolean }> = []

        // ── Layer 1: Foundation ───────────────────────────────────────────────
        if (agent.foundation_prompt.trim()) {
            sections.push({
                name:     'foundation',
                content:  agent.foundation_prompt.trim(),
                editable: false,
            })
        }

        // ── Layer 2: Persona ─────────────────────────────────────────────────
        if (agent.persona_prompt.trim()) {
            sections.push({
                name:     'persona',
                content:  `## PERSONA\n${agent.persona_prompt.trim()}`,
                editable: false,
            })
        }

        // ── Layer 3: Domain ──────────────────────────────────────────────────
        if (agent.domain_prompt?.trim()) {
            sections.push({
                name:     'domain',
                content:  `## BUSINESS CONTEXT\n${agent.domain_prompt.trim()}`,
                editable: true,
            })
        }

        // ── Layer 4: Guardrails (always after domain — cannot be overridden) ─
        if (agent.guardrails_prompt.trim()) {
            sections.push({
                name:     'guardrails',
                content:  `## GUARDRAILS — THESE RULES OVERRIDE EVERYTHING ABOVE\n${agent.guardrails_prompt.trim()}`,
                editable: false,
            })
        }

        // ── Layer 4b: Constitution (org rules, after guardrails, before context) ─
        if (constitutionRules && constitutionRules.length > 0) {
            const constitutionText = PromptAssembler.formatConstitutionRules(constitutionRules)
            sections.push({
                name:     'constitution',
                content:  `## ORGANIZATION CONSTITUTION RULES\n${constitutionText}`,
                editable: false,
            })
        }

        // ── Layer 5: Context (RAG + memories) ────────────────────────────────
        const contextParts: string[] = []

        if (rag && rag.documents.length > 0) {
            const docText = rag.documents
                .map(d => `[${d.sourceType}] ${d.content.trim()}`)
                .join('\n\n')
            contextParts.push(`### Knowledge Base\n${docText}`)
        }

        // Strict grounding notice when KB confidence is low
        if (rag?.gapDetected) {
            if (agent.strict_grounding) {
                contextParts.push(
                    `### IMPORTANT — Knowledge Gap Detected\n` +
                    `No high-confidence KB match was found for this query (confidence: ${(rag.gapConfidence * 100).toFixed(0)}%). ` +
                    `You MUST NOT guess or fabricate information. ` +
                    `Say: "I don't have specific information about this in my knowledge base yet." ` +
                    `Then offer to note it as a gap to be filled.`
                )
            } else {
                contextParts.push(
                    `### Note — Low KB Confidence\n` +
                    `The knowledge base returned low-confidence results for this query. ` +
                    `Be transparent if you are uncertain and suggest the user add relevant content.`
                )
            }
        }

        // Relevant memories
        const highValueMemories = memories
            .filter(m => m.importance >= 0.3)
            .sort((a, b) => b.importance - a.importance)
            .slice(0, 6)

        if (highValueMemories.length > 0) {
            const memText = highValueMemories
                .map(m => `- [${m.memory_type}] ${m.content.trim()}`)
                .join('\n')
            contextParts.push(`### Relevant Memory\n${memText}`)
        }

        if (contextParts.length > 0) {
            sections.push({
                name:     'context',
                content:  `## RETRIEVED CONTEXT\n${contextParts.join('\n\n')}`,
                editable: false,
            })
        }

        // ── Layer 6: Task ─────────────────────────────────────────────────────
        if (task?.trim()) {
            sections.push({
                name:     'task',
                content:  `## CURRENT TASK\n${task.trim()}`,
                editable: false,
            })
        }

        const systemPrompt = sections.map(s => s.content).join('\n\n')

        const constitutionChars = (constitutionRules ?? []).reduce((sum, r) => sum + r.content.length, 0)
        const layers: PromptLayerDebug[] = [
            { name: 'foundation',     chars: agent.foundation_prompt.length,       editable: false, included: !!agent.foundation_prompt.trim() },
            { name: 'persona',        chars: agent.persona_prompt.length,           editable: false, included: !!agent.persona_prompt.trim() },
            { name: 'domain',         chars: agent.domain_prompt?.length ?? 0,     editable: true,  included: !!(agent.domain_prompt?.trim()) },
            { name: 'guardrails',     chars: agent.guardrails_prompt.length,        editable: false, included: !!agent.guardrails_prompt.trim() },
            { name: 'constitution',   chars: constitutionChars,                     editable: false, included: (constitutionRules?.length ?? 0) > 0 },
            { name: 'context',        chars: contextParts.join('').length,          editable: false, included: contextParts.length > 0 },
            { name: 'task',           chars: task?.length ?? 0,                    editable: false, included: !!(task?.trim()) },
        ]

        return {
            systemPrompt,
            layers,
            totalChars: systemPrompt.length,
        }
    }

    /**
     * Groups constitution rules by enforcement level and rule type
     * so the LLM receives clear semantic hierarchy:
     *  - STRICT rules are non-negotiable (forbidden, compliance, required)
     *  - SOFT rules are strong preferences (brand_voice, style)
     *  - ADVISORY rules are suggestions (format, etc.)
     */
    private static formatConstitutionRules(rules: ConstitutionRuleItem[]): string {
        const strict  = rules.filter(r => r.enforcementLevel === 'strict' || r.ruleType === 'forbidden' || r.ruleType === 'compliance')
        const soft    = rules.filter(r => r.enforcementLevel === 'soft' && r.ruleType !== 'forbidden' && r.ruleType !== 'compliance')
        const advisory = rules.filter(r => r.enforcementLevel === 'advisory' && r.ruleType !== 'forbidden' && r.ruleType !== 'compliance')
        const ungrouped = rules.filter(r => !r.enforcementLevel && !r.ruleType)

        const parts: string[] = []

        if (strict.length > 0) {
            parts.push(
                `### MANDATORY (violation = blocked output)\n` +
                strict.map(r => `- [${(r.ruleType ?? 'required').toUpperCase()}] ${r.content}`).join('\n')
            )
        }

        if (soft.length > 0) {
            parts.push(
                `### STRONGLY PREFERRED\n` +
                soft.map(r => `- [${(r.ruleType ?? 'style').toUpperCase()}] ${r.content}`).join('\n')
            )
        }

        if (advisory.length > 0) {
            parts.push(
                `### ADVISORY (follow when possible)\n` +
                advisory.map(r => `- [${(r.ruleType ?? 'format').toUpperCase()}] ${r.content}`).join('\n')
            )
        }

        if (ungrouped.length > 0) {
            parts.push(ungrouped.map(r => `- ${r.content}`).join('\n'))
        }

        return parts.join('\n\n')
    }
}
