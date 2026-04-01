/**
 * ENGINE INSTANCE RESOLVER
 * ========================
 * Single source of truth for resolving the active deployed engine for any org.
 * Every execution path (Writer, Chat, API, Scheduled) MUST go through this.
 *
 * Resolution chain:
 *   1. Find engine_instances WHERE org_id AND status = 'active'
 *      (prefer user-specific over org-wide, most recently deployed first)
 *   2. Load brain_agents row via engine's brain_agent_id → prompt stack + RAG
 *   3. Load org_agents WHERE engine_instance_id → per-agent configs
 *   4. Extract workflow from frozen snapshot (config.flowConfig)
 *   5. Return fully populated EngineRuntime
 *
 * Fail loud: if no engine is deployed → clear error. No phantom creation.
 */

import { createClient } from '@/lib/supabase/server'

// ============================================================
// TYPES
// ============================================================

export interface EngineRuntimePromptStack {
    foundation: string
    persona: string
    domain: string | null
    guardrails: string
}

export interface EngineRuntimeOrgAgent {
    id: string
    slug: string
    name: string
    systemPrompt: string
    personaPrompt: string | null
    instructionPrompt: string | null
    guardrailsPrompt: string | null
    preferredProvider: string | null
    preferredModel: string | null
    temperature: number
    maxTokens: number
    toolsEnabled: string[]
    canAccessBrain: boolean
    canWriteToBrain: boolean
    category: string
}

export interface EngineRuntimeLLM {
    provider: string
    model: string
    temperature: number
    maxTokens: number
}

export interface EngineRuntimeRAG {
    enabled: boolean
    topK: number
    minConfidence: number
    queryExpansion: boolean
    ftsWeight: number
    vectorWeight: number
}

export interface EngineRuntimeSelfHealing {
    enableRetryOnLowQuality: boolean
    maxRegenerationAttempts: number
    minQualityScore: number
    logGapsToLearning: boolean
}

export interface EngineRuntimeWriterConfig {
    angleClasses: Array<{ value: string; label: string; desc: string }>
    flowGoals: Array<{ value: string; label: string; desc: string }>
    emailCountOptions: number[]
    emailDefaults: {
        systemPromptSnippet: string
        maxValidationRetries: number
        minQualityScore: number
    }
}

export interface EngineRuntime {
    // Identity
    engineInstanceId: string
    engineName: string
    bundleId: string | null
    bundleSlug: string | null
    orgId: string

    // Workflow (frozen at deploy time)
    workflowNodes: any[]
    workflowEdges: any[]
    workflowTemplateId: string | null

    // Primary Brain Agent
    brainAgentId: string
    brainAgentName: string
    promptStack: EngineRuntimePromptStack
    strictGrounding: boolean

    // All Org Agents
    orgAgents: EngineRuntimeOrgAgent[]

    // LLM Config
    apiKeyMode: 'platform' | 'byok'
    defaultLlm: EngineRuntimeLLM

    // RAG Config
    rag: EngineRuntimeRAG

    // Self-healing
    selfHealing: EngineRuntimeSelfHealing

    // Writer-specific config (from bundle config)
    writerConfig: EngineRuntimeWriterConfig | null

    // Full snapshot for audit
    snapshot: Record<string, any>
}

// ============================================================
// ERROR CLASSES
// ============================================================

export class EngineNotDeployedError extends Error {
    public code = 'ENGINE_NOT_DEPLOYED'
    constructor(orgId: string) {
        super(
            `No active engine deployed for organization ${orgId}. ` +
            `Deploy an Engine Bundle from Superadmin → Engine Bundles.`
        )
        this.name = 'EngineNotDeployedError'
    }
}

export class EngineConfigError extends Error {
    public code = 'ENGINE_CONFIG_ERROR'
    constructor(engineName: string, detail: string) {
        super(`Engine "${engineName}" configuration error: ${detail}`)
        this.name = 'EngineConfigError'
    }
}

export class BrainAgentError extends Error {
    public code = 'BRAIN_AGENT_ERROR'
    constructor(engineName: string) {
        super(
            `Engine "${engineName}" has no brain agent. ` +
            `Redeploy the engine bundle with a brain template.`
        )
        this.name = 'BrainAgentError'
    }
}

// ============================================================
// SYSTEM DEFAULTS — loaded from system_config table.
// Cached per-request (not global) so superadmin edits do take effect.
// If system_config has no entry, these bare minimums apply.
// ============================================================

interface SystemDefaults {
    llm: EngineRuntimeLLM
    selfHealing: EngineRuntimeSelfHealing
    writerConfig: EngineRuntimeWriterConfig
}

let _cachedDefaults: SystemDefaults | null = null

async function loadSystemDefaults(supabase: any): Promise<SystemDefaults> {
    if (_cachedDefaults) return _cachedDefaults

    // Try loading from system_config (key = 'engine_defaults')
    const { data } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'engine_defaults')
        .maybeSingle()

    const cfg = data?.value || {}

    _cachedDefaults = {
        llm: {
            provider: cfg.llm?.provider || 'anthropic',
            model: cfg.llm?.model || 'claude-3-5-sonnet-20241022',
            temperature: cfg.llm?.temperature ?? 0.7,
            maxTokens: cfg.llm?.max_tokens ?? 4096,
        },
        selfHealing: {
            enableRetryOnLowQuality: cfg.self_healing?.enable_retry ?? true,
            maxRegenerationAttempts: cfg.self_healing?.max_regeneration_attempts ?? 2,
            minQualityScore: cfg.self_healing?.min_quality_score ?? 0.6,
            logGapsToLearning: cfg.self_healing?.log_gaps_to_learning ?? true,
        },
        writerConfig: {
            angleClasses: cfg.writer?.angle_classes || [
                { value: 'problem_reframe', label: 'Problem Reframe', desc: 'Challenge how they see the problem' },
                { value: 'social_proof', label: 'Social Proof', desc: 'Show who else solved this' },
                { value: 'direct_value', label: 'Direct Value', desc: 'Lead with the outcome' },
                { value: 'curiosity_gap', label: 'Curiosity Gap', desc: 'Tease an insight they\'re missing' },
                { value: 'contrarian', label: 'Contrarian', desc: 'Challenge conventional wisdom' },
            ],
            flowGoals: cfg.writer?.flow_goals || [
                { value: 'MEANINGFUL_REPLY', label: 'Get a Reply', desc: 'Optimize for conversation starters' },
                { value: 'BOOK_CALL', label: 'Book a Call', desc: 'Drive to calendar booking' },
                { value: 'EDUCATE', label: 'Educate', desc: 'Build awareness and trust first' },
            ],
            emailCountOptions: cfg.writer?.email_count_options || [3, 5, 7, 10],
            emailDefaults: {
                systemPromptSnippet: cfg.writer?.email_defaults?.system_prompt_snippet || 'Generate clear, professional email content that matches the user\'s brand voice and goals.',
                maxValidationRetries: cfg.writer?.email_defaults?.max_validation_retries ?? 2,
                minQualityScore: cfg.writer?.email_defaults?.min_quality_score ?? 0.6,
            },
        },
    }

    return _cachedDefaults
}

/**
 * Clear cached defaults (call when system_config is updated via superadmin)
 */
export function invalidateSystemDefaults() {
    _cachedDefaults = null
}

// ============================================================
// RESOLVER
// ============================================================

/**
 * Resolve the active deployed engine for an org.
 * Returns null if no engine found.
 */
export async function getActiveEngineRuntime(
    orgId: string,
    userId?: string
): Promise<EngineRuntime | null> {
    const supabase = createClient()

    // ─── 1. Find the active engine instance ─────────────────────
    // Prefer user-specific → org-wide, most recently deployed first
    let engineInstance: any = null

    if (userId) {
        const { data, error } = await supabase
            .from('engine_instances')
            .select('*')
            .eq('org_id', orgId)
            .eq('assigned_user_id', userId)
            .eq('status', 'active')
            .order('deployed_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            throw new Error(`EngineInstanceResolver: failed to query user engine: ${error.message}`)
        }
        engineInstance = data
    }

    if (!engineInstance) {
        const { data, error } = await supabase
            .from('engine_instances')
            .select('*')
            .eq('org_id', orgId)
            .is('assigned_user_id', null)
            .eq('status', 'active')
            .order('deployed_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            throw new Error(`EngineInstanceResolver: failed to query org engine: ${error.message}`)
        }
        engineInstance = data
    }

    if (!engineInstance) {
        return null
    }

    // ─── 2. Extract workflow from frozen snapshot ────────────────
    const flowConfig = engineInstance.config?.flowConfig
    const workflowNodes = flowConfig?.nodes ?? []
    const workflowEdges = flowConfig?.edges ?? []

    if (workflowNodes.length === 0) {
        throw new EngineConfigError(
            engineInstance.name,
            'No workflow nodes found in engine configuration. Redeploy the engine bundle.'
        )
    }

    // ─── 3. Load brain agent ────────────────────────────────────
    const brainAgentId = engineInstance.brain_agent_id
        ?? engineInstance.config?.brain_agent_id
        ?? (engineInstance.snapshot as any)?.primary_brain_agent_id
        ?? null

    if (!brainAgentId) {
        throw new BrainAgentError(engineInstance.name)
    }

    const { data: brainAgent, error: brainErr } = await supabase
        .from('brain_agents')
        .select(`
            id, name,
            foundation_prompt, persona_prompt, domain_prompt, guardrails_prompt,
            strict_grounding, max_turns,
            preferred_provider, preferred_model, use_platform_keys,
            tools_granted,
            rag_top_k, rag_min_confidence, rag_query_expansion,
            rag_fts_weight, rag_vector_weight
        `)
        .eq('id', brainAgentId)
        .maybeSingle()

    if (brainErr) {
        throw new Error(`EngineInstanceResolver: failed to load brain agent: ${brainErr.message}`)
    }
    if (!brainAgent) {
        throw new BrainAgentError(engineInstance.name)
    }

    // ─── 4. Load org agents ─────────────────────────────────────
    const { data: orgAgentsRaw } = await supabase
        .from('org_agents')
        .select(`
            id, slug, name,
            system_prompt, persona_prompt, instruction_prompt, guardrails_prompt,
            preferred_provider, preferred_model,
            temperature, max_tokens,
            tools_enabled, category,
            can_access_brain, can_write_to_brain
        `)
        .eq('engine_instance_id', engineInstance.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

    const orgAgents: EngineRuntimeOrgAgent[] = (orgAgentsRaw ?? []).map((a: any) => ({
        id: a.id,
        slug: a.slug,
        name: a.name,
        systemPrompt: a.system_prompt ?? '',
        personaPrompt: a.persona_prompt ?? null,
        instructionPrompt: a.instruction_prompt ?? null,
        guardrailsPrompt: a.guardrails_prompt ?? null,
        preferredProvider: a.preferred_provider ?? null,
        preferredModel: a.preferred_model ?? null,
        temperature: a.temperature ?? 0.7,
        maxTokens: a.max_tokens ?? 4096,
        toolsEnabled: Array.isArray(a.tools_enabled) ? a.tools_enabled : [],
        canAccessBrain: a.can_access_brain ?? true,
        canWriteToBrain: a.can_write_to_brain ?? false,
        category: a.category ?? 'general',
    }))

    // ─── 5. Resolve snapshot-level configs ───────────────────────
    const snapshot = engineInstance.snapshot ?? engineInstance.config?.bundle_snapshot ?? {}
    const snapshotLlm = snapshot.default_llm ?? {}
    const snapshotWriter = engineInstance.config?.writer ?? snapshot.writer ?? null
    const snapshotSelfHealing = engineInstance.config?.self_healing ?? snapshot.self_healing ?? null

    // Load system defaults from DB (system_config table — editable via Superadmin)
    const sysDefaults = await loadSystemDefaults(supabase)

    const defaultLlm: EngineRuntimeLLM = {
        provider: snapshotLlm.provider ?? brainAgent.preferred_provider ?? sysDefaults.llm.provider,
        model: snapshotLlm.model ?? brainAgent.preferred_model ?? sysDefaults.llm.model,
        temperature: snapshotLlm.temperature ?? sysDefaults.llm.temperature,
        maxTokens: snapshotLlm.max_tokens ?? sysDefaults.llm.maxTokens,
    }

    const rag: EngineRuntimeRAG = {
        enabled: true,
        topK: brainAgent.rag_top_k ?? 8,
        minConfidence: brainAgent.rag_min_confidence ?? 0.65,
        queryExpansion: brainAgent.rag_query_expansion ?? true,
        ftsWeight: brainAgent.rag_fts_weight ?? 0.3,
        vectorWeight: brainAgent.rag_vector_weight ?? 0.7,
    }

    const selfHealing: EngineRuntimeSelfHealing = snapshotSelfHealing
        ? {
            enableRetryOnLowQuality: snapshotSelfHealing.enable_retry_on_low_quality ?? sysDefaults.selfHealing.enableRetryOnLowQuality,
            maxRegenerationAttempts: snapshotSelfHealing.max_regeneration_attempts ?? sysDefaults.selfHealing.maxRegenerationAttempts,
            minQualityScore: snapshotSelfHealing.min_quality_score ?? sysDefaults.selfHealing.minQualityScore,
            logGapsToLearning: snapshotSelfHealing.log_gaps_to_learning ?? sysDefaults.selfHealing.logGapsToLearning,
        }
        : sysDefaults.selfHealing

    const writerConfig: EngineRuntimeWriterConfig | null = snapshotWriter
        ? {
            angleClasses: snapshotWriter.angle_classes ?? sysDefaults.writerConfig.angleClasses,
            flowGoals: snapshotWriter.flow_goals ?? sysDefaults.writerConfig.flowGoals,
            emailCountOptions: snapshotWriter.email_count_options ?? sysDefaults.writerConfig.emailCountOptions,
            emailDefaults: {
                systemPromptSnippet: snapshotWriter.email_defaults?.system_prompt_snippet ?? sysDefaults.writerConfig.emailDefaults.systemPromptSnippet,
                maxValidationRetries: snapshotWriter.email_defaults?.max_validation_retries ?? sysDefaults.writerConfig.emailDefaults.maxValidationRetries,
                minQualityScore: snapshotWriter.email_defaults?.min_quality_score ?? sysDefaults.writerConfig.emailDefaults.minQualityScore,
            },
        }
        : sysDefaults.writerConfig

    // ─── 6. Build runtime ───────────────────────────────────────
    const runtime: EngineRuntime = {
        engineInstanceId: engineInstance.id,
        engineName: engineInstance.name,
        bundleId: engineInstance.bundle_id ?? null,
        bundleSlug: snapshot.bundle_slug ?? null,
        orgId,

        workflowNodes,
        workflowEdges,
        workflowTemplateId: engineInstance.template_id ?? null,

        brainAgentId: brainAgent.id,
        brainAgentName: brainAgent.name,
        promptStack: {
            foundation: brainAgent.foundation_prompt ?? '',
            persona: brainAgent.persona_prompt ?? '',
            domain: brainAgent.domain_prompt ?? null,
            guardrails: brainAgent.guardrails_prompt ?? '',
        },
        strictGrounding: brainAgent.strict_grounding ?? true,

        orgAgents,

        apiKeyMode: (engineInstance.api_key_mode as 'platform' | 'byok') ?? 'platform',
        defaultLlm,

        rag,
        selfHealing,
        writerConfig,

        snapshot,
    }

    return runtime
}

/**
 * Require active engine runtime for org. Throws if none deployed.
 */
export async function requireActiveEngineRuntime(
    orgId: string,
    userId?: string
): Promise<EngineRuntime> {
    const runtime = await getActiveEngineRuntime(orgId, userId)
    if (!runtime) {
        throw new EngineNotDeployedError(orgId)
    }
    return runtime
}
