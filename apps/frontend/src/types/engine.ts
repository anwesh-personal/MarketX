// ============================================================
// ENGINE TYPES — Engine-as-Bundle Architecture
// ============================================================

// ── Master Bundle (superadmin creates, no org_id) ───────────
export interface EngineBundle {
    id: string
    name: string
    description: string | null
    slug: string | null
    tier: 'echii' | 'pulz' | 'quanta'
    status: 'active' | 'draft' | 'archived'

    // Component references
    brain_template_id: string | null
    brain_template_name?: string | null
    brain_template_tier?: string | null
    workflow_template_id: string | null
    workflow_template_name?: string | null
    email_provider_id: string | null
    email_provider_name?: string | null

    // API key strategy
    default_api_key_mode: 'platform' | 'byok' | 'hybrid'

    config: Record<string, unknown>

    created_by: string | null
    created_at: string
    updated_at: string

    // Aggregates (joined)
    _deployments_count?: number
    _active_deployments?: number
}

// ── Deployed Engine Instance (clone of bundle, org-scoped) ──
export interface EngineInstance {
    id: string
    name: string

    // Bundle this was cloned from
    bundle_id: string | null
    bundle_name?: string | null

    // Workflow template
    template_id: string
    template_name?: string | null

    // Org & user assignment
    org_id: string | null
    org_name?: string | null
    assigned_user_id: string | null
    assigned_user_email?: string | null

    // Live brain agent (snapshot at deploy time)
    brain_agent_id: string | null
    brain_agent_name?: string | null

    // Email provider
    email_provider_id: string | null
    email_provider_config: Record<string, unknown> | null

    // API key strategy
    api_key_mode: 'platform' | 'byok' | 'hybrid'
    byok_keys: Record<string, string> | null  // encrypted at rest

    // Legacy fields
    kb_id: string | null
    constitution_id: string | null
    constitution_name?: string | null

    config: Record<string, unknown>
    status: 'active' | 'standby' | 'disabled' | 'error'

    runs_today: number
    runs_total: number
    last_run_at: string | null
    error_message: string | null

    is_master: boolean
    deployed_at: string | null
    deployed_by: string | null

    created_at: string
    updated_at: string

    tier?: string
    api_key?: string
}

// ── Deployment record (audit log) ───────────────────────────
export interface EngineBundleDeployment {
    id: string
    bundle_id: string
    bundle_name?: string | null
    engine_instance_id: string
    org_id: string
    org_name?: string | null
    assigned_user_id: string | null
    assigned_user_email?: string | null
    brain_agent_id: string | null
    deployed_by: string | null
    api_key_mode: 'platform' | 'byok' | 'hybrid'
    deployment_notes: string | null
    status: 'success' | 'failed' | 'rolling_back'
    error_message: string | null
    created_at: string
}

// ── Deploy request payload ───────────────────────────────────
export interface DeployBundleRequest {
    bundle_id: string
    org_id: string
    assigned_user_id?: string | null
    api_key_mode: 'platform' | 'byok' | 'hybrid'
    byok_keys?: Record<string, string>
    email_provider_id?: string | null
    deployment_notes?: string
}

// ── Execution types ──────────────────────────────────────────
export interface ExecutionState {
    executionId: string | null
    status: 'idle' | 'running' | 'completed' | 'failed'
    progress: number
    currentNode: string | null
    output: string | null
    tokensUsed: number
    cost: number
    durationMs: number
    error: string | null
}

// ── Legacy/shared ────────────────────────────────────────────
export interface WorkflowTemplate {
    id: string
    name: string
    description: string | null
    status: string
}

export interface Organization {
    id: string
    name: string
    plan?: string
}

export interface BrainTemplate {
    id: string
    name: string
    pricing_tier?: string
    version?: string
    is_active?: boolean
}
