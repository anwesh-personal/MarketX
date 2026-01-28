export interface EngineInstance {
    id: string;
    name: string;
    template_id: string;
    template_name?: string | null;
    org_id: string | null;
    org_name?: string | null;
    kb_id: string | null;
    constitution_id: string | null;
    constitution_name?: string | null;
    config: Record<string, any>;
    status: 'active' | 'standby' | 'disabled' | 'error';
    runs_today: number;
    runs_total: number;
    last_run_at: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
    // API Key (Frontend ghost feature for now, replaced by ApiKeyManager)
    api_key?: string;
}

export interface ExecutionState {
    executionId: string | null;
    status: 'idle' | 'running' | 'completed' | 'failed';
    progress: number;
    currentNode: string | null;
    output: string | null;
    tokensUsed: number;
    cost: number;
    durationMs: number;
    error: string | null;
}

export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string | null;
    status: string;
}

export interface Organization {
    id: string;
    name: string;
}
