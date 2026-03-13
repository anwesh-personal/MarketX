/**
 * BRAIN RUNTIME RESOLVER
 *
 * Single source of truth for runtime brain configuration.
 * Loads the active deployed org-level brain_agents row and returns one normalized
 * runtime object used by chat, Writer Studio, Workflow Engine, and brain tools.
 *
 * Design: deployed brain_agents is the runtime authority. Template is used only
 * for fallback and audit (template_id, template_version).
 */

import { createClient } from '@/lib/supabase/server'
import type { BrainConfig, RAGConfig } from './BrainConfigService'

// ============================================================
// RUNTIME TYPES
// ============================================================

export interface BrainRuntimePromptStack {
    foundation: string
    persona: string
    domain: string | null
    guardrails: string
    strictGrounding: boolean
    agentName: string
}

export interface BrainRuntimeRAG {
    enabled: boolean
    topK: number
    minSimilarity: number
    queryExpansion: boolean
    ftsWeight: number
    vectorWeight: number
    rerankingEnabled?: boolean
    hybridSearch?: boolean
}

export interface BrainRuntimeEmailDefaults {
    /** Default system prompt snippet for email generation */
    emailSystemPromptSnippet: string
    /** Max retries for quality validation before failing */
    maxValidationRetries: number
    /** Min quality score (0–1) to accept output */
    minQualityScore: number
}

export interface BrainRuntimeSelfHealing {
    /** Enable automatic retry on low quality */
    enableRetryOnLowQuality: boolean
    /** Max regeneration attempts per run */
    maxRegenerationAttempts: number
    /** Log gaps to knowledge_gaps for learning loop */
    logGapsToLearning: boolean
}

export interface BrainRuntime {
    /** Resolved active brain agent id (brain_agents.id) */
    agentId: string
    /** Template id (brain_templates.id) — audit/source */
    templateId: string | null
    /** Template version string at deploy time */
    templateVersion: string
    /** Human-readable agent name */
    name: string
    /** Prompt stack — used by PromptAssembler */
    prompt: BrainRuntimePromptStack
    /** Tools granted (brain_tools.name values) */
    toolsGranted: string[]
    /** Preferred LLM provider slug; null = platform default */
    preferredProvider: string | null
    /** Preferred model id; null = provider default */
    preferredModel: string | null
    /** Use platform API keys (false = org BYOK) */
    usePlatformKeys: boolean
    /** RAG settings — used by RAGOrchestrator and workflow nodes */
    rag: BrainRuntimeRAG
    /** Max tool-call turns per request */
    maxTurns: number
    /** Email-generation defaults for workflow/Writer */
    emailDefaults: BrainRuntimeEmailDefaults
    /** Self-healing and learning-loop behavior */
    selfHealing: BrainRuntimeSelfHealing
    /** Merged brain config for legacy RAGOrchestrator signature (from template or synthetic) */
    brainConfigForRAG: BrainConfig
}

// ============================================================
// RESOLVER
// ============================================================

type DeployedAgentRow = {
    id: string
    template_id: string | null
    template_version: string
    name: string
    foundation_prompt: string
    persona_prompt: string
    domain_prompt: string | null
    guardrails_prompt: string
    strict_grounding: boolean
    max_turns: number
    preferred_provider: string | null
    preferred_model: string | null
    use_platform_keys: boolean
    tools_granted: string[]
    rag_top_k: number
    rag_min_confidence: number
    rag_query_expansion: boolean
    rag_fts_weight: number
    rag_vector_weight: number
}

const DEFAULT_EMAIL_DEFAULTS: BrainRuntimeEmailDefaults = {
    emailSystemPromptSnippet: 'Generate clear, professional email content that matches the user\'s brand voice and goals.',
    maxValidationRetries: 2,
    minQualityScore: 0.6,
}

const DEFAULT_SELF_HEALING: BrainRuntimeSelfHealing = {
    enableRetryOnLowQuality: true,
    maxRegenerationAttempts: 2,
    logGapsToLearning: true,
}

/**
 * Load the active deployed org-level brain agent and return normalized runtime.
 * Returns null if org has no active deployed agent (caller may fall back to template-only or error).
 */
export async function getActiveBrainRuntime(orgId: string): Promise<BrainRuntime | null> {
    const supabase = createClient()

    const { data: agent, error } = await supabase
        .from('brain_agents')
        .select(`
            id,
            template_id,
            template_version,
            name,
            foundation_prompt,
            persona_prompt,
            domain_prompt,
            guardrails_prompt,
            strict_grounding,
            max_turns,
            preferred_provider,
            preferred_model,
            use_platform_keys,
            tools_granted,
            rag_top_k,
            rag_min_confidence,
            rag_query_expansion,
            rag_fts_weight,
            rag_vector_weight
        `)
        .eq('org_id', orgId)
        .is('user_id', null)
        .in('status', ['active', 'configuring'])
        .order('deployed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) {
        throw new Error(`BrainRuntimeResolver: failed to load agent for org ${orgId}: ${error.message}`)
    }

    if (!agent) {
        return null
    }

    const row = agent as unknown as DeployedAgentRow

    const rag: BrainRuntimeRAG = {
        enabled: true,
        topK: row.rag_top_k ?? 8,
        minSimilarity: row.rag_min_confidence ?? 0.65,
        queryExpansion: row.rag_query_expansion ?? true,
        ftsWeight: row.rag_fts_weight ?? 0.3,
        vectorWeight: row.rag_vector_weight ?? 0.7,
        rerankingEnabled: true,
        hybridSearch: true,
    }

    const brainConfigForRAG: BrainConfig = buildBrainConfigFromAgent(row, rag)

    const runtime: BrainRuntime = {
        agentId: row.id,
        templateId: row.template_id,
        templateVersion: row.template_version || '1.0.0',
        name: row.name,
        prompt: {
            foundation: row.foundation_prompt ?? '',
            persona: row.persona_prompt ?? '',
            domain: row.domain_prompt ?? null,
            guardrails: row.guardrails_prompt ?? '',
            strictGrounding: row.strict_grounding ?? true,
            agentName: row.name,
        },
        toolsGranted: Array.isArray(row.tools_granted) ? row.tools_granted : [],
        preferredProvider: row.preferred_provider ?? null,
        preferredModel: row.preferred_model ?? null,
        usePlatformKeys: row.use_platform_keys ?? true,
        rag,
        maxTurns: row.max_turns ?? 20,
        emailDefaults: DEFAULT_EMAIL_DEFAULTS,
        selfHealing: DEFAULT_SELF_HEALING,
        brainConfigForRAG,
    }

    return runtime
}

/**
 * Build a BrainConfig shape from deployed agent for RAGOrchestrator and other consumers
 * that still expect the legacy config.rag shape.
 */
function buildBrainConfigFromAgent(row: DeployedAgentRow, rag: BrainRuntimeRAG): BrainConfig {
    return {
        providers: { chat: null, embeddings: null },
        agents: {},
        rag: {
            enabled: rag.enabled,
            topK: rag.topK,
            minSimilarity: rag.minSimilarity,
            rerankingEnabled: rag.rerankingEnabled ?? true,
            hybridSearch: rag.hybridSearch ?? true,
            weights: { vector: rag.vectorWeight, fts: rag.ftsWeight },
        },
        memory: {
            maxContextTokens: 4000,
            maxMemoryTokens: 2000,
            conversationWindowSize: 20,
            enableSummarization: true,
        },
        limits: {
            maxRequestsPerMinute: 60,
            maxTokensPerDay: 500_000,
        },
    }
}

/**
 * Require active brain runtime for org. Throws if none deployed.
 */
export async function requireActiveBrainRuntime(orgId: string): Promise<BrainRuntime> {
    const runtime = await getActiveBrainRuntime(orgId)
    if (!runtime) {
        throw new Error(`No active brain agent deployed for organization ${orgId}. Deploy a brain from Superadmin first.`)
    }
    return runtime
}
