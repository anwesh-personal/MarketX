/**
 * AXIOM WORKFLOW EXECUTION SERVICE
 * Full port from Lekhika's workflowExecutionService.js
 * 
 * Executes workflows node-by-node with:
 * - Topological ordering (respects dependencies)
 * - Real-time progress callbacks
 * - Token/cost tracking per node
 * - Checkpoint/resume on failure
 * - Support for sync AND async execution
 * 
 * No shortcuts. Production-grade from Day 1.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { aiService, AICallResult } from '../utils/ai-service';
import { kbResolutionService, ResolutionContext } from '../utils/kb-resolution-service';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
        label: string;
        nodeType: string;
        description?: string;
        config?: Record<string, any>;
        [key: string]: any;
    };
}

export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    animated?: boolean;
}

export interface ExecutionContext {
    executionId: string;
    userId: string;
    tier: 'hobby' | 'pro' | 'enterprise';
    orgId?: string;
}

export interface ExecutionOptions {
    /** Engine ID if executing from a deployed engine */
    engineId?: string;
    /** Pre-loaded KB (if already fetched) */
    preloadedKb?: Record<string, any>;
    /** Pre-loaded engine config (if already fetched) */
    preloadedConfig?: Record<string, any>;
}

export interface PipelineData {
    userInput: Record<string, any>;
    nodeOutputs: Record<string, NodeOutput>;
    lastNodeOutput: NodeOutput | null;
    executionUser: ExecutionContext;
    /** Loaded Knowledge Base (null if engine has no kb_id configured) */
    kb: Record<string, any> | null;
    /** Engine configuration */
    engineConfig: Record<string, any> | null;
    /** Constitution rules for content validation */
    constitution: Record<string, any> | null;
    tokenUsage: {
        totalTokens: number;
        totalCost: number;
        totalWords: number;
    };
    tokenLedger: TokenLedgerEntry[];
}

export interface NodeOutput {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    type: string; // 'trigger', 'input', 'ai_generation', 'condition', 'output'
    content: any;
    aiMetadata?: {
        tokens: number;
        cost: number;
        provider: string;
        model: string;
        durationMs: number;
    };
    sequenceNumber?: number;  // Added after execution
    executedAt?: string;      // Added after execution
}

export interface TokenLedgerEntry {
    nodeId: string;
    nodeName: string;
    tokens: number;
    cost: number;
    provider?: string;
    timestamp: string;
}

export interface ProgressUpdate {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    progress: number;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    nodeIndex: number;
    totalNodes: number;
    tokens?: number;
    words?: number;
    cost?: number;
    aiResponse?: string;
    error?: string;
    nodeResults?: Record<string, NodeOutput>;
}

export interface ExecutionResult {
    success: boolean;
    executionId: string;
    nodeOutputs: Record<string, NodeOutput>;
    lastNodeOutput: NodeOutput | null;
    tokenUsage: {
        totalTokens: number;
        totalCost: number;
        totalWords: number;
    };
    tokenLedger: TokenLedgerEntry[];
    durationMs: number;
    error?: string;
}

type ProgressCallback = (update: ProgressUpdate) => void;

// ============================================================================
// CONFIG ADAPTER — Maps UI config shape to executor expectations
// Handles: AI array→flat, camelCase→snake_case, key renames, structure transforms
// ============================================================================

function normalizeNodeConfig(nodeType: string, rawConfig: Record<string, any>): Record<string, any> {
    const config = { ...rawConfig };

    // ── AI Config: Array of entries → flat top-level keys ──
    if (Array.isArray(config.aiConfig) && config.aiConfig.length > 0) {
        const primary = config.aiConfig[0];
        if (!config.provider && primary.providerId) config.provider = primary.providerId;
        if (!config.model && primary.model) config.model = primary.model;
        if (config.temperature == null && primary.temperature != null) config.temperature = primary.temperature;
        if (config.maxTokens == null && primary.maxTokens != null) config.maxTokens = primary.maxTokens;
    }

    // ── Resolver nodes: camelCase → snake_case ──
    if (nodeType.startsWith('resolve-')) {
        const camelToSnake: Record<string, string> = {
            icpId: 'icp_id',
            industryHint: 'industry',
            industryNiche: 'industry_niche',
            jobTitleHint: 'job_title',
            targetRole: 'target_role',
            companySizeHint: 'company_size',
            revenueBand: 'revenue_band',
            offerId: 'offer_id',
            offerCategory: 'offer_category',
            offerNameHint: 'offer_name',
            buyerStage: 'buyer_stage',
            preferredAxis: 'angle_axis',
            contentType: 'content_type',
            pageType: 'page_type',
            flowGoal: 'flow_goal',
            ctaType: 'cta_type',
        };
        for (const [camel, snake] of Object.entries(camelToSnake)) {
            if (config[camel] != null && config[snake] == null) {
                config[snake] = config[camel];
            }
        }
    }

    // ── Transform nodes: key renames + value mapping ──
    if (nodeType === 'transform-locker' || nodeType === 'add-content-locker') {
        if (config.unlockMethod && !config.lockerType) {
            const methodMap: Record<string, string> = { email_capture: 'email', social_share: 'social', payment: 'paywall' };
            config.lockerType = methodMap[config.unlockMethod] || config.unlockMethod;
        }
        if (config.gatePercentage != null && config.percentage == null) config.percentage = config.gatePercentage;
        if (config.lockerTitle && !config.ctaText) config.ctaText = config.lockerTitle;
        if (config.lockerDescription && !config.ctaDescription) config.ctaDescription = config.lockerDescription;
    }

    if (nodeType === 'transform-format') {
        if (config.inputFormat && !config.from) config.from = config.inputFormat;
        if (config.outputFormat && !config.to) config.to = config.outputFormat;
    }

    if (nodeType === 'transform-personalize') {
        if (Array.isArray(config.variableMappings) && !config.variables) {
            const flat: Record<string, string> = {};
            for (const m of config.variableMappings) {
                if (m.variableName && m.sourceField) flat[m.variableName] = m.sourceField;
            }
            config.variables = flat;
        }
        if (config.customVariablePattern && !config.pattern) config.pattern = config.customVariablePattern;
    }

    // ── Output nodes: key renames + structural transforms ──
    if (nodeType === 'output-webhook' || nodeType === 'output-n8n') {
        if (config.webhookMethod && !config.method) config.method = config.webhookMethod;
        if (config.webhookBodyTemplate && !config.customPayload) config.customPayload = config.webhookBodyTemplate;
        if (Array.isArray(config.webhookHeaders) && !config.headers) {
            const flat: Record<string, string> = {};
            for (const h of config.webhookHeaders) {
                if (h.key && h.value) flat[h.key] = h.value;
            }
            config.headers = flat;
        }
        if (config.webhookAuth && typeof config.webhookAuth === 'object') {
            if (config.webhookAuth.type && !config.authType) config.authType = config.webhookAuth.type;
            if (config.webhookAuth.bearerToken && !config.authToken) config.authToken = config.webhookAuth.bearerToken;
            if (config.webhookAuth.apiKey && !config.apiKey) config.apiKey = config.webhookAuth.apiKey;
            if (config.webhookAuth.apiKeyHeader && !config.apiKeyHeader) config.apiKeyHeader = config.webhookAuth.apiKeyHeader;
        }
    }

    if (nodeType === 'output-store') {
        if (config.storeTable && !config.tableName) config.tableName = config.storeTable;
    }

    if (nodeType === 'output-email') {
        if (config.emailTo && !config.to) config.to = config.emailTo;
        if (config.emailSubjectTemplate && !config.subject) config.subject = config.emailSubjectTemplate;
        if (config.emailBodyTemplate && !config.htmlTemplate) config.htmlTemplate = config.emailBodyTemplate;
        if ((config.emailFromName || config.emailFromAddress) && !config.from) {
            const name = config.emailFromName || 'Axiom';
            const addr = config.emailFromAddress || 'noreply@axiom.engine';
            config.from = `${name} <${addr}>`;
        }
    }

    if (nodeType === 'output-analytics') {
        if (config.analyticsEventName && !config.eventName) config.eventName = config.analyticsEventName;
    }

    // ── Condition/Utility nodes ──
    if (nodeType === 'condition-if-else') {
        if (!config.condition && (config.field || config.operator || config.value)) {
            const opMap: Record<string, string> = {
                eq: 'equals', neq: 'notEquals', gt: 'greaterThan', lt: 'lessThan',
                gte: 'greaterThan', lte: 'lessThan', contains: 'contains',
                notContains: 'notContains', regex: 'regex', isEmpty: 'isEmpty',
                isNotEmpty: 'isNotEmpty', fieldEquals: 'fieldEquals', expression: 'expression',
            };
            config.condition = {
                type: opMap[config.operator] || config.operator || 'contains',
                field: config.field,
                value: config.value,
                expression: config.expression,
                flags: config.flags,
            };
        }
    }

    if (nodeType === 'condition-switch') {
        if (Array.isArray(config.cases) && !config._casesNormalized) {
            const flat: Record<string, string> = {};
            for (const c of config.cases) {
                if (c.pattern != null && c.label) flat[String(c.pattern)] = c.label;
            }
            config.cases = flat;
            config._casesNormalized = true;
        }
        if (typeof config.defaultPath === 'boolean' && !config.default) {
            config.default = config.defaultPath ? 'default' : '';
        }
    }

    if (nodeType === 'delay-wait') {
        if (config.duration != null && config.delayMs == null) {
            const unitMs: Record<string, number> = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };
            const multiplier = unitMs[config.unit || 's'] || 1000;
            config.delayMs = Number(config.duration) * multiplier;
        }
    }

    if (nodeType === 'human-review') {
        if (Array.isArray(config.approvers) && !config.reviewers) config.reviewers = config.approvers;
        if (config.timeout != null && config.timeoutMs == null) config.timeoutMs = config.timeout;
    }

    if (nodeType === 'error-handler') {
        if (config.retryDelay != null && config.retryDelayMs == null) config.retryDelayMs = config.retryDelay;
        if (config.catchAll != null && !config.errorAction) {
            config.errorAction = config.catchAll ? 'retry' : 'stop';
        }
    }

    if (nodeType === 'split-parallel') {
        if (Array.isArray(config.branchNames) && !config.branches) config.branches = config.branchNames;
    }

    if (nodeType === 'merge-combine') {
        const waitMap: Record<string, string> = { all: 'waitAll', any: 'waitAny', first: 'waitFirst' };
        if (config.waitMode && !config.strategy) config.strategy = waitMap[config.waitMode] || config.waitMode;
        const mergeMap: Record<string, string> = { combine: 'object', last: 'object', custom: 'object', concat: 'concat', array: 'array' };
        if (config.mergeStrategy && !config.mergeType) config.mergeType = mergeMap[config.mergeStrategy] || config.mergeStrategy;
    }

    return config;
}

// ============================================================================
// EXECUTION STATE MANAGER
// ============================================================================

class ExecutionStateManager {
    private executionStates: Map<string, any> = new Map();
    private checkpointStates: Map<string, any> = new Map();

    updateState(executionId: string, updates: Record<string, any>): void {
        const current = this.executionStates.get(executionId) || {};
        this.executionStates.set(executionId, { ...current, ...updates });
    }

    getState(executionId: string): any {
        return this.executionStates.get(executionId);
    }

    createCheckpoint(executionId: string, nodeId: string, state: any): void {
        const key = `${executionId}:${nodeId}`;
        this.checkpointStates.set(key, { ...state, checkpointAt: new Date().toISOString() });
    }

    getCheckpoint(executionId: string, nodeId: string): any {
        return this.checkpointStates.get(`${executionId}:${nodeId}`);
    }

    isWorkflowStopped(executionId: string): boolean {
        const state = this.executionStates.get(executionId);
        return state?.status === 'stopped' || state?.forceStopped === true;
    }

    isWorkflowPaused(executionId: string): boolean {
        const state = this.executionStates.get(executionId);
        return state?.status === 'paused';
    }

    stopWorkflow(executionId: string): void {
        this.updateState(executionId, { status: 'stopped', forceStopped: true });
    }

    pauseWorkflow(executionId: string): void {
        this.updateState(executionId, { status: 'paused' });
    }

    resumeWorkflow(executionId: string): void {
        this.updateState(executionId, { status: 'running' });
    }

    clearState(executionId: string): void {
        this.executionStates.delete(executionId);
        // Clear all checkpoints for this execution
        for (const key of this.checkpointStates.keys()) {
            if (key.startsWith(`${executionId}:`)) {
                this.checkpointStates.delete(key);
            }
        }
    }
}

const stateManager = new ExecutionStateManager();

// ============================================================================
// WORKFLOW EXECUTION SERVICE
// ============================================================================

class WorkflowExecutionService {
    private supabase: SupabaseClient | null = null;

    initialize(supabase: SupabaseClient): void {
        this.supabase = supabase;
    }

    /**
     * Load engine configuration, Knowledge Base, and Constitution
     * 
     * @param engineId - UUID of the engine instance
     * @returns Object with kb, config, and constitution
     */
    async loadEngineData(engineId: string): Promise<{
        kb: Record<string, any> | null;
        config: Record<string, any> | null;
        constitution: Record<string, any> | null;
    }> {
        if (!this.supabase) {
            console.warn('⚠️ Supabase client not initialized, cannot load engine data');
            return { kb: null, config: null, constitution: null };
        }

        try {
            // Load engine with related data
            const { data: engine, error } = await this.supabase
                .from('engine_instances')
                .select(`
                    id,
                    config,
                    kb_id,
                    constitution_id,
                    knowledge_bases (data),
                    constitutions (name, rules)
                `)
                .eq('id', engineId)
                .single();

            if (error) throw error;

            if (!engine) {
                console.warn(`⚠️ Engine not found: ${engineId}`);
                return { kb: null, config: null, constitution: null };
            }

            // Extract KB data
            const kb = (engine as any).knowledge_bases?.data || null;

            // Extract constitution
            const constitutionData = (engine as any).constitutions;
            const constitution = constitutionData ? {
                name: constitutionData.name,
                rules: constitutionData.rules,
            } : null;

            return {
                kb,
                config: engine.config || null,
                constitution,
            };
        } catch (error) {
            console.error(`❌ Error loading engine data: ${error}`);
            return { kb: null, config: null, constitution: null };
        }
    }

    /**
     * Build execution order using topological sort
     * Ensures nodes execute only after their dependencies
     */
    buildExecutionOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
        // Build adjacency list and in-degree count
        const inDegree = new Map<string, number>();
        const adjacency = new Map<string, string[]>();
        const nodeMap = new Map<string, WorkflowNode>();

        // Initialize
        for (const node of nodes) {
            nodeMap.set(node.id, node);
            inDegree.set(node.id, 0);
            adjacency.set(node.id, []);
        }

        // Count incoming edges
        for (const edge of edges) {
            inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
            adjacency.get(edge.source)?.push(edge.target);
        }

        // Find nodes with no incoming edges (start nodes)
        const queue: string[] = [];
        for (const [nodeId, degree] of inDegree) {
            if (degree === 0) {
                queue.push(nodeId);
            }
        }

        // Kahn's algorithm for topological sort
        const executionOrder: WorkflowNode[] = [];
        while (queue.length > 0) {
            const current = queue.shift()!;
            const node = nodeMap.get(current);
            if (node) {
                executionOrder.push(node);
            }

            for (const neighbor of (adjacency.get(current) || [])) {
                const newDegree = (inDegree.get(neighbor) || 1) - 1;
                inDegree.set(neighbor, newDegree);
                if (newDegree === 0) {
                    queue.push(neighbor);
                }
            }
        }

        // Check for cycles
        if (executionOrder.length !== nodes.length) {
            console.warn('⚠️ Workflow contains cycles, some nodes may not execute');
        }

        console.log('📋 Execution order:', executionOrder.map(n => `${n.data.label} (${n.data.nodeType})`));

        return executionOrder;
    }

    /**
     * MAIN EXECUTION METHOD
     * 
     * @param nodes - Workflow nodes to execute
     * @param edges - Connections between nodes
     * @param initialInput - Original input from trigger
     * @param executionId - Unique execution ID
     * @param progressCallback - Optional callback for progress updates
     * @param executionUser - User context (ID, tier, org)
     * @param options - Optional execution options (engineId, preloaded KB/config)
     */
    async executeWorkflow(
        nodes: WorkflowNode[],
        edges: WorkflowEdge[],
        initialInput: Record<string, any>,
        executionId: string,
        progressCallback: ProgressCallback | null,
        executionUser: ExecutionContext,
        options: ExecutionOptions = {}
    ): Promise<ExecutionResult> {
        const startTime = Date.now();

        console.log(`🚀 Starting workflow execution: ${executionId}`);
        console.log(`   User: ${executionUser.userId}, Tier: ${executionUser.tier}`);
        console.log(`   Nodes: ${nodes.length}, Edges: ${edges.length}`);
        if (options.engineId) {
            console.log(`   Engine: ${options.engineId}`);
        }

        // Initialize execution state
        stateManager.updateState(executionId, {
            status: 'running',
            startTime: new Date().toISOString(),
            progress: 0
        });

        // Build execution order
        const executionOrder = this.buildExecutionOrder(nodes, edges);

        // Load KB, engine config, and constitution if engineId provided
        let kb: Record<string, any> | null = options.preloadedKb || null;
        let engineConfig: Record<string, any> | null = options.preloadedConfig || null;
        let constitution: Record<string, any> | null = null;

        if (options.engineId && !kb) {
            const engineData = await this.loadEngineData(options.engineId);
            kb = engineData.kb;
            engineConfig = engineData.config;
            constitution = engineData.constitution;
            if (kb) {
                console.log(`   📚 KB loaded: ${Object.keys(kb).length} top-level keys`);
            }
            if (constitution) {
                console.log(`   📜 Constitution loaded: ${constitution.name}`);
            }
        }

        // Initialize pipeline data with loaded KB and constitution
        const pipelineData: PipelineData = {
            userInput: initialInput,
            nodeOutputs: {},
            lastNodeOutput: null,
            executionUser,
            kb,
            engineConfig,
            constitution,
            tokenUsage: { totalTokens: 0, totalCost: 0, totalWords: 0 },
            tokenLedger: []
        };

        // Send initial progress
        if (progressCallback) {
            progressCallback({
                nodeId: 'initializing',
                nodeName: 'Initializing...',
                nodeType: 'system',
                progress: 5,
                status: 'running',
                nodeIndex: -1,
                totalNodes: executionOrder.length
            });
        }

        try {
            // Execute each node in order
            for (let i = 0; i < executionOrder.length; i++) {
                const node = executionOrder[i];

                // Check if workflow was stopped
                if (stateManager.isWorkflowStopped(executionId)) {
                    console.log(`🛑 Workflow ${executionId} stopped`);
                    return {
                        success: false,
                        executionId,
                        nodeOutputs: pipelineData.nodeOutputs,
                        lastNodeOutput: pipelineData.lastNodeOutput,
                        tokenUsage: pipelineData.tokenUsage,
                        tokenLedger: pipelineData.tokenLedger,
                        durationMs: Date.now() - startTime,
                        error: 'Workflow stopped by user'
                    };
                }

                // Calculate progress
                const progress = Math.round(((i + 0.5) / executionOrder.length) * 100);

                // Send node starting progress
                if (progressCallback) {
                    progressCallback({
                        nodeId: node.id,
                        nodeName: node.data.label,
                        nodeType: node.data.nodeType,
                        progress,
                        status: 'running',
                        nodeIndex: i,
                        totalNodes: executionOrder.length
                    });
                }

                console.log(`\n▶️ Executing node ${i + 1}/${executionOrder.length}: ${node.data.label} (${node.data.nodeType})`);

                try {
                    // Execute the node
                    const nodeOutput = await this.executeNode(node, pipelineData, executionId);

                    // Store output
                    pipelineData.nodeOutputs[node.id] = {
                        ...nodeOutput,
                        sequenceNumber: i + 1,
                        executedAt: new Date().toISOString()
                    };

                    // Update last node output for content-producing nodes
                    // (resolvers, transforms, and KB nodes also produce useful context)
                    if (['ai_generation', 'output', 'generator', 'resolver', 'transform', 'kb_retrieval'].includes(nodeOutput.type)) {
                        pipelineData.lastNodeOutput = pipelineData.nodeOutputs[node.id];
                    }

                    // Respect condition results: stop downstream execution if shouldContinue is false
                    if (nodeOutput.type === 'condition' && nodeOutput.content?.shouldContinue === false) {
                        console.log(`⏭️ Condition '${node.data.label}' returned shouldContinue=false — halting pipeline`);
                        break;
                    }

                    // Track tokens
                    if (nodeOutput.aiMetadata) {
                        pipelineData.tokenUsage.totalTokens += nodeOutput.aiMetadata.tokens;
                        pipelineData.tokenUsage.totalCost += nodeOutput.aiMetadata.cost;
                        pipelineData.tokenLedger.push({
                            nodeId: node.id,
                            nodeName: node.data.label,
                            tokens: nodeOutput.aiMetadata.tokens,
                            cost: nodeOutput.aiMetadata.cost,
                            provider: nodeOutput.aiMetadata.provider,
                            timestamp: new Date().toISOString()
                        });
                    }

                    // Create checkpoint
                    stateManager.createCheckpoint(executionId, node.id, {
                        nodeOutputs: pipelineData.nodeOutputs,
                        tokenUsage: pipelineData.tokenUsage
                    });

                    // Send node completed progress
                    const completionProgress = Math.round(((i + 1) / executionOrder.length) * 100);
                    if (progressCallback) {
                        progressCallback({
                            nodeId: node.id,
                            nodeName: node.data.label,
                            nodeType: node.data.nodeType,
                            progress: completionProgress,
                            status: 'completed',
                            nodeIndex: i,
                            totalNodes: executionOrder.length,
                            tokens: nodeOutput.aiMetadata?.tokens,
                            cost: nodeOutput.aiMetadata?.cost,
                            aiResponse: typeof nodeOutput.content === 'string'
                                ? nodeOutput.content.substring(0, 500)
                                : undefined,
                            nodeResults: pipelineData.nodeOutputs
                        });
                    }

                    console.log(`✅ Node completed: ${node.data.label}`);

                } catch (nodeError: any) {
                    console.error(`❌ Node failed: ${node.data.label}`, nodeError.message);

                    // Send failure progress
                    if (progressCallback) {
                        progressCallback({
                            nodeId: node.id,
                            nodeName: node.data.label,
                            nodeType: node.data.nodeType,
                            progress,
                            status: 'failed',
                            nodeIndex: i,
                            totalNodes: executionOrder.length,
                            error: nodeError.message,
                            nodeResults: pipelineData.nodeOutputs
                        });
                    }

                    // Save checkpoint for resume
                    await this.saveCheckpointToDatabase(executionId, node.id, pipelineData, nodeError.message);

                    throw nodeError;
                }
            }

            // Workflow completed successfully
            console.log(`\n🎉 Workflow completed: ${executionId}`);
            console.log(`   Total tokens: ${pipelineData.tokenUsage.totalTokens}`);
            console.log(`   Total cost: $${pipelineData.tokenUsage.totalCost.toFixed(4)}`);
            console.log(`   Duration: ${Date.now() - startTime}ms`);

            // Final progress callback
            if (progressCallback) {
                progressCallback({
                    nodeId: 'complete',
                    nodeName: 'Workflow Complete',
                    nodeType: 'system',
                    progress: 100,
                    status: 'completed',
                    nodeIndex: executionOrder.length,
                    totalNodes: executionOrder.length,
                    nodeResults: pipelineData.nodeOutputs
                });
            }

            stateManager.updateState(executionId, {
                status: 'completed',
                endTime: new Date().toISOString(),
                progress: 100
            });

            return {
                success: true,
                executionId,
                nodeOutputs: pipelineData.nodeOutputs,
                lastNodeOutput: pipelineData.lastNodeOutput,
                tokenUsage: pipelineData.tokenUsage,
                tokenLedger: pipelineData.tokenLedger,
                durationMs: Date.now() - startTime
            };

        } catch (error: any) {
            stateManager.updateState(executionId, {
                status: 'failed',
                endTime: new Date().toISOString(),
                error: error.message
            });

            return {
                success: false,
                executionId,
                nodeOutputs: pipelineData.nodeOutputs,
                lastNodeOutput: pipelineData.lastNodeOutput,
                tokenUsage: pipelineData.tokenUsage,
                tokenLedger: pipelineData.tokenLedger,
                durationMs: Date.now() - startTime,
                error: error.message
            };
        }
    }

    /**
     * Execute a single node
     */
    async executeNode(
        node: WorkflowNode,
        pipelineData: PipelineData,
        executionId: string
    ): Promise<NodeOutput> {
        const nodeType = node.data.nodeType || node.type;

        // Normalize config: maps UI shape → executor shape (camelCase→snake_case, array→flat, key renames)
        node.data.config = normalizeNodeConfig(nodeType, node.data.config || {});

        // Route to appropriate handler based on node type
        switch (nodeType) {
            // =========================================================
            // TRIGGER NODES (V2 naming: trigger-*)
            // =========================================================
            case 'trigger-webhook':
            case 'trigger-schedule':
            case 'trigger-manual':
            case 'trigger-email-inbound':
            // Legacy triggers
            case 'webhook-trigger':
            case 'schedule-trigger':
            case 'manual-trigger':
            case 'email-trigger':
                return this.executeTriggerNode(node, pipelineData);

            // =========================================================
            // RESOLVER NODES (V2) - KB Context Resolution
            // =========================================================
            case 'resolve-icp':
            case 'resolve-offer':
            case 'resolve-angle':
            case 'resolve-blueprint':
            case 'resolve-cta':
                return this.executeResolverNode(node, pipelineData);

            // =========================================================
            // GENERATOR NODES (V2) - Content Generation
            // =========================================================
            case 'generate-website-page':
            case 'generate-website-bundle':
            case 'generate-email-flow':
            case 'generate-email-reply':
            case 'generate-social-post':
                return this.executeGeneratorNode(node, pipelineData, executionId);

            // =========================================================
            // PROCESSOR / ENRICHER NODES (V2 naming: enrich-*, analyze-*)
            // =========================================================
            case 'analyze-intent':
            case 'enrich-web-search':
            case 'enrich-company-data':
            case 'enrich-contact-data':
            case 'enrich-context':
            // Legacy processors
            case 'web-search':
            case 'seo-optimize':
            case 'generate-llm':
                return this.executeProcessNode(node, pipelineData, executionId);

            // =========================================================
            // TRANSFORM NODES (V2 naming: transform-*)
            // =========================================================
            case 'transform-locker':
            case 'transform-format':
            case 'transform-personalize':
            // Legacy transforms
            case 'add-content-locker':
            case 'content-locker':
                return this.executeTransformNode(node, pipelineData);

            // =========================================================
            // VALIDATOR NODES (V2 naming: validate-*)
            // =========================================================
            case 'validate-quality':
            case 'validate-constitution':
                return this.executeValidatorNode(node, pipelineData, executionId);

            // =========================================================
            // CONDITION / UTILITY NODES (V2 naming: condition-*, loop-*, etc.)
            // =========================================================
            case 'condition-if-else':
            case 'condition-switch':
            case 'loop-foreach':
            case 'merge-combine':
            case 'delay-wait':
            case 'human-review':
            case 'error-handler':
            case 'split-parallel':
            // Legacy conditions
            case 'route-by-stage':
            case 'route-by-validation':
            case 'route-by-type':
            case 'logic-gate':
            case 'validation-check':
                return this.executeConditionNode(node, pipelineData);

            // =========================================================
            // OUTPUT NODES (V2 naming: output-*)
            // =========================================================
            case 'output-webhook':
            case 'output-store':
            case 'output-email':
            case 'output-analytics':
            // Legacy outputs
            case 'output-n8n':
            case 'output-export':
            case 'output-schedule':
                return this.executeOutputNode(node, pipelineData);

            // =========================================================
            // LEGACY NODES (backward compatibility)
            // =========================================================
            case 'input-config':
            case 'text-input':
            case 'file-upload':
                return this.executeInputNode(node, pipelineData);

            case 'retrieve-kb':
                return this.executeKBNode(node, pipelineData);

            case 'live-preview':
            case 'email-preview':
                return this.executePreviewNode(node, pipelineData);

            default:
                console.warn(`⚠️ Unknown node type: ${nodeType}, using passthrough`);
                return {
                    nodeId: node.id,
                    nodeName: node.data.label,
                    nodeType,
                    type: 'passthrough',
                    content: pipelineData.lastNodeOutput?.content || pipelineData.userInput
                };
        }
    }

    /**
     * Execute KB Retrieval Node
     * Uses Supabase FTS on embeddings table (full-text search, no embedding model needed).
     * Falls back to kb_documents content search if embeddings table yields nothing.
     */
    private async executeKBNode(node: WorkflowNode, pipelineData: PipelineData): Promise<NodeOutput> {
        const config = node.data.config || {};
        const userInputObj = pipelineData.userInput || {};

        const rawQuery = config.query ||
            pipelineData.lastNodeOutput?.content ||
            (typeof userInputObj === 'object'
                ? (userInputObj as Record<string, any>).query ||
                  (userInputObj as Record<string, any>).message ||
                  (userInputObj as Record<string, any>).topic
                : userInputObj) ||
            '';
        const query = String(rawQuery).substring(0, 500).trim();

        const orgId = pipelineData.executionUser?.orgId || null;
        const topK = config.topK || 5;
        const sectionFilter = config.section || null;

        if (!query) {
            return {
                nodeId: node.id,
                nodeName: node.data.label,
                nodeType: node.data.nodeType,
                type: 'kb_retrieval',
                content: { retrieved: false, query: '', context: '', sources: [], sourceCount: 0, error: 'No query provided' }
            };
        }

        if (!this.supabase) {
            console.warn('[KB Node] Supabase not initialized - returning empty');
            return {
                nodeId: node.id,
                nodeName: node.data.label,
                nodeType: node.data.nodeType,
                type: 'kb_retrieval',
                content: { retrieved: false, query, context: '', sources: [], sourceCount: 0, error: 'Supabase not available' }
            };
        }

        try {
            // Attempt 1: FTS on embeddings table
            let embeddingQuery = this.supabase
                .from('embeddings')
                .select('id, content, metadata, source_type')
                .textSearch('content', query, { type: 'websearch', config: 'english' })
                .limit(topK);

            if (orgId) {
                embeddingQuery = embeddingQuery.eq('org_id', orgId);
            }
            if (sectionFilter) {
                embeddingQuery = embeddingQuery.contains('metadata', { section: sectionFilter });
            }

            const { data: embResults, error: embError } = await embeddingQuery;

            if (!embError && embResults && embResults.length > 0) {
                const context = embResults.map((r: any) => r.content).join('\n\n---\n\n');
                const sources = embResults.map((r: any) => ({
                    content: r.content.substring(0, 200),
                    source_type: r.source_type ?? 'kb',
                    section: (r.metadata as any)?.section ?? null,
                    title: (r.metadata as any)?.title ?? null,
                }));
                console.log(`[KB Node] FTS returned ${embResults.length} results for: "${query.substring(0, 80)}"`);
                return {
                    nodeId: node.id,
                    nodeName: node.data.label,
                    nodeType: node.data.nodeType,
                    type: 'kb_retrieval',
                    content: { retrieved: true, query, context, sources, sourceCount: embResults.length }
                };
            }

            // Attempt 2: Fallback — FTS on kb_documents content
            let docQuery = this.supabase
                .from('kb_documents')
                .select('id, title, content, status')
                .eq('status', 'ready')
                .eq('is_active', true)
                .textSearch('content', query, { type: 'websearch', config: 'english' })
                .limit(topK);

            if (orgId) {
                docQuery = docQuery.eq('org_id', orgId);
            }

            const { data: docResults, error: docError } = await docQuery;

            if (!docError && docResults && docResults.length > 0) {
                const context = docResults.map((d: any) => `[${d.title}]\n${d.content}`).join('\n\n---\n\n');
                const sources = docResults.map((d: any) => ({
                    content: d.content.substring(0, 200),
                    source_type: 'kb_document',
                    title: d.title,
                }));
                console.log(`[KB Node] Doc FTS fallback returned ${docResults.length} results`);
                return {
                    nodeId: node.id,
                    nodeName: node.data.label,
                    nodeType: node.data.nodeType,
                    type: 'kb_retrieval',
                    content: { retrieved: true, query, context, sources, sourceCount: docResults.length }
                };
            }

            // Nothing found — return graceful empty
            console.warn(`[KB Node] No results found for query: "${query.substring(0, 80)}"`);
            return {
                nodeId: node.id,
                nodeName: node.data.label,
                nodeType: node.data.nodeType,
                type: 'kb_retrieval',
                content: { retrieved: false, query, context: '', sources: [], sourceCount: 0, error: 'No matching KB content found' }
            };

        } catch (err: any) {
            console.error(`[KB Node] Search error: ${err.message}`);
            return {
                nodeId: node.id,
                nodeName: node.data.label,
                nodeType: node.data.nodeType,
                type: 'kb_retrieval',
                content: { retrieved: false, query, context: '', sources: [], sourceCount: 0, error: err.message }
            };
        }
    }

    /**
     * Execute trigger node
     */
    private executeTriggerNode(node: WorkflowNode, pipelineData: PipelineData): NodeOutput {
        return {
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: node.data.nodeType,
            type: 'trigger',
            content: {
                triggered: true,
                triggerType: node.data.nodeType,
                input: pipelineData.userInput,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Execute input node
     */
    private executeInputNode(node: WorkflowNode, pipelineData: PipelineData): NodeOutput {
        const config = node.data.config || {};

        return {
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: node.data.nodeType,
            type: 'input',
            content: {
                ...pipelineData.userInput,
                validated: true,
                schema: config.schema
            }
        };
    }

    /**
     * Execute resolver node (V2) - KB Context Resolution
     * These nodes query the KB to resolve ICP, Offer, Angle, Blueprint, CTA
     * 
     * IMPORTANT: Every resolver has access to:
     * - pipelineData.userInput (ORIGINAL initial input - never lost)
     * - pipelineData.lastNodeOutput (previous node output)
     * - pipelineData.nodeOutputs (all previous node outputs by ID)
     * - pipelineData.kb (Knowledge Base if engine has kb_id configured)
     */
    private executeResolverNode(node: WorkflowNode, pipelineData: PipelineData): NodeOutput {
        const nodeType = node.data.nodeType;
        const config = node.data.config || {};
        const userInput = pipelineData.userInput;
        const previousOutput = pipelineData.lastNodeOutput?.content || {};
        const kb = pipelineData.kb;

        // Build resolution hints from all available sources
        const hints = {
            ...userInput,
            ...previousOutput,
            ...config,
        };

        let content: Record<string, unknown>;

        // Check if KB is available for actual resolution
        if (kb) {
            // KB is loaded - use kbResolutionService for real resolution
            const resolutionContext: ResolutionContext = {
                kb: kb as any, // Cast to KnowledgeBase type
                initialInput: userInput,
                pipelineContext: previousOutput as Record<string, unknown>,
            };

            content = this.resolveWithKB(nodeType, resolutionContext, hints);
        } else {
            // No KB available - return hints for later resolution (e.g., in engine execution)
            content = this.resolveWithoutKB(nodeType, hints, userInput);
        }

        return {
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: nodeType,
            type: 'resolver',
            content,
        };
    }

    /**
     * Resolve with actual KB using kbResolutionService
     */
    private resolveWithKB(
        nodeType: string,
        context: ResolutionContext,
        hints: Record<string, any>
    ): Record<string, unknown> {
        switch (nodeType) {
            case 'resolve-icp': {
                const result = kbResolutionService.resolveICP(context, {
                    industryHint: hints.industry || hints.industry_niche,
                    jobTitleHint: hints.job_title || hints.target_role,
                    companySizeHint: hints.company_size || hints.revenue_band,
                    icpId: hints.icp_id,
                });
                return {
                    resolved: true,
                    nodeType: 'resolve-icp',
                    icpId: result.icpId,
                    segment: result.segment,
                    confidence: result.confidence,
                    matchReason: result.matchReason,
                    initialInput: context.initialInput,
                };
            }

            case 'resolve-offer': {
                const result = kbResolutionService.resolveOffer(context, {
                    offerId: hints.offer_id,
                    categoryHint: hints.offer_category,
                    offerNameHint: hints.offer_name,
                });
                return {
                    resolved: true,
                    nodeType: 'resolve-offer',
                    offerId: result.offerId,
                    offer: result.offer,
                    confidence: result.confidence,
                    matchReason: result.matchReason,
                    initialInput: context.initialInput,
                };
            }

            case 'resolve-angle': {
                const icpId = hints.icp_id || (context.pipelineContext as any)?.icpId;
                const result = kbResolutionService.selectAngle(context, {
                    icpId: icpId || 'default',
                    offerId: hints.offer_id || (context.pipelineContext as any)?.offerId,
                    buyerStage: hints.buyer_stage,
                    preferredAxis: hints.angle_axis,
                });
                return {
                    resolved: true,
                    nodeType: 'resolve-angle',
                    angleId: result.angleId,
                    angle: result.angle,
                    selectionReason: result.selectionReason,
                    wasKBPreference: result.wasKBPreference,
                    initialInput: context.initialInput,
                };
            }

            case 'resolve-blueprint': {
                const result = kbResolutionService.selectBlueprint(context, {
                    contentType: hints.content_type || 'website_page',
                    pageType: hints.page_type,
                    flowGoal: hints.flow_goal,
                    platform: hints.platform,
                    buyerStage: hints.buyer_stage,
                });
                if (result) {
                    return {
                        resolved: true,
                        nodeType: 'resolve-blueprint',
                        blueprintId: result.blueprintId,
                        blueprintType: result.blueprintType,
                        blueprint: result.blueprint,
                        layoutId: result.layoutId,
                        layout: result.layout,
                        initialInput: context.initialInput,
                    };
                }
                return {
                    resolved: false,
                    nodeType: 'resolve-blueprint',
                    error: 'No matching blueprint found',
                    initialInput: context.initialInput,
                };
            }

            case 'resolve-cta': {
                const result = kbResolutionService.selectCTA(context, {
                    pageType: hints.page_type,
                    buyerStage: hints.buyer_stage,
                    icpId: hints.icp_id || (context.pipelineContext as any)?.icpId,
                    preferredType: hints.cta_type,
                });
                return {
                    resolved: true,
                    nodeType: 'resolve-cta',
                    ctaId: result.ctaId,
                    cta: result.cta,
                    routingContext: result.routingContext,
                    initialInput: context.initialInput,
                };
            }

            default:
                return {
                    resolved: false,
                    error: `Unknown resolver type: ${nodeType}`,
                    initialInput: context.initialInput,
                };
        }
    }

    /**
     * Fallback when no KB is available - returns hints for later resolution
     */
    private resolveWithoutKB(
        nodeType: string,
        hints: Record<string, any>,
        userInput: Record<string, any>
    ): Record<string, unknown> {
        // Return structured hints that can be used by downstream nodes
        // or by engine execution when KB becomes available
        switch (nodeType) {
            case 'resolve-icp':
                return {
                    resolved: false,
                    nodeType: 'resolve-icp',
                    pendingResolution: true,
                    hints: {
                        industryHint: hints.industry || hints.industry_niche,
                        jobTitleHint: hints.job_title || hints.target_role,
                        companySizeHint: hints.company_size || hints.revenue_band,
                        icpId: hints.icp_id,
                    },
                    initialInput: userInput,
                };

            case 'resolve-offer':
                return {
                    resolved: false,
                    nodeType: 'resolve-offer',
                    pendingResolution: true,
                    hints: {
                        offerId: hints.offer_id,
                        categoryHint: hints.offer_category,
                        offerNameHint: hints.offer_name,
                    },
                    initialInput: userInput,
                };

            case 'resolve-angle':
                return {
                    resolved: false,
                    nodeType: 'resolve-angle',
                    pendingResolution: true,
                    params: {
                        icpId: hints.icp_id,
                        offerId: hints.offer_id,
                        buyerStage: hints.buyer_stage,
                        preferredAxis: hints.angle_axis,
                    },
                    initialInput: userInput,
                };

            case 'resolve-blueprint':
                return {
                    resolved: false,
                    nodeType: 'resolve-blueprint',
                    pendingResolution: true,
                    params: {
                        contentType: hints.content_type || 'website_page',
                        pageType: hints.page_type,
                        flowGoal: hints.flow_goal,
                        platform: hints.platform,
                        buyerStage: hints.buyer_stage,
                    },
                    initialInput: userInput,
                };

            case 'resolve-cta':
                return {
                    resolved: false,
                    nodeType: 'resolve-cta',
                    pendingResolution: true,
                    params: {
                        pageType: hints.page_type,
                        buyerStage: hints.buyer_stage,
                        icpId: hints.icp_id,
                        preferredType: hints.cta_type,
                    },
                    initialInput: userInput,
                };

            default:
                return {
                    resolved: false,
                    error: `Unknown resolver type: ${nodeType}`,
                    initialInput: userInput,
                };
        }
    }

    /**
     * Execute generator node (V2) - Content Generation
     * These nodes generate actual content using KB context from resolver nodes
     * 
     * IMPORTANT: Generators receive accumulated context:
     * - Resolved ICP, Offer, Angle, Blueprint, CTA from resolver nodes
     * - Original initial input (always available)
     */
    private async executeGeneratorNode(
        node: WorkflowNode,
        pipelineData: PipelineData,
        executionId: string
    ): Promise<NodeOutput> {
        const nodeType = node.data.nodeType;
        const config = node.data.config || {};
        const userInput = pipelineData.userInput;

        // Accumulate context from all previous resolver nodes
        const resolvedContext = this.buildResolvedContext(pipelineData);

        // Build generation prompt with full context
        const prompt = this.buildGeneratorPrompt(nodeType, resolvedContext, config);
        const systemPrompt = this.getGeneratorSystemPrompt(nodeType, resolvedContext);

        // Determine provider/model
        const provider = config.provider || userInput.provider || 'openai';
        const model = config.model || userInput.ai_model || 'gpt-4o';

        console.log(`🎨 Generator: ${nodeType} using ${provider}/${model}`);

        // Make AI call
        const aiResult = await aiService.call(prompt, {
            provider,
            model,
            systemPrompt,
            temperature: config.temperature ?? 0.8,
            maxTokens: config.maxTokens ?? 4096,
            userId: pipelineData.executionUser.userId,
            tier: pipelineData.executionUser.tier,
        });

        return {
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: nodeType,
            type: 'generator',
            content: {
                generated: true,
                contentType: nodeType.replace('generate-', ''),
                output: aiResult.content,
                resolvedContext, // Include for traceability
                initialInput: userInput, // Always included
            },
            aiMetadata: {
                tokens: aiResult.tokens.total,
                cost: aiResult.cost,
                provider: aiResult.provider,
                model: aiResult.model,
                durationMs: aiResult.durationMs,
            },
        };
    }

    /**
     * Execute transform node - Content transformation without AI
     * 
     * Transform Types:
     * - transform-locker: Insert content locker HTML at specified position
     * - transform-format: Convert between formats (MD→HTML, HTML→MD, JSON→text)
     * - transform-personalize: Variable substitution with user/context data
     */
    private async executeTransformNode(
        node: WorkflowNode,
        pipelineData: PipelineData
    ): Promise<NodeOutput> {
        const nodeType = node.data.nodeType;
        const config = node.data.config || {};
        const lastContent = pipelineData.lastNodeOutput?.content;
        const userInput = pipelineData.userInput;

        // Get content to transform
        let content: string = '';
        if (typeof lastContent === 'string') {
            content = lastContent;
        } else if (lastContent?.output) {
            content = typeof lastContent.output === 'string' ? lastContent.output : JSON.stringify(lastContent.output);
        } else if (lastContent?.content) {
            content = typeof lastContent.content === 'string' ? lastContent.content : JSON.stringify(lastContent.content);
        } else if (lastContent) {
            content = JSON.stringify(lastContent);
        }

        let result: Record<string, unknown> = {};

        switch (nodeType) {
            // =====================================================
            // CONTENT LOCKER - Insert gated content marker
            // =====================================================
            case 'transform-locker':
            case 'add-content-locker':
            case 'content-locker': {
                const position = config.position || 'middle'; // 'start', 'middle', 'end', 'percentage'
                const percentage = config.percentage || 50;
                const lockerType = config.lockerType || 'email'; // 'email', 'paywall', 'social'
                const ctaText = config.ctaText || 'Unlock full content';
                const ctaDescription = config.ctaDescription || 'Enter your email to continue reading';

                // Build content locker HTML
                const lockerHtml = this.buildContentLockerHtml(lockerType, ctaText, ctaDescription, config);

                // Insert locker at specified position
                let transformedContent: string;
                const paragraphs = content.split(/\n\n+/);

                if (position === 'start') {
                    transformedContent = lockerHtml + '\n\n' + content;
                } else if (position === 'end') {
                    transformedContent = content + '\n\n' + lockerHtml;
                } else if (position === 'percentage' || position === 'middle') {
                    const insertAt = Math.floor(paragraphs.length * (percentage / 100));
                    const before = paragraphs.slice(0, insertAt).join('\n\n');
                    const after = paragraphs.slice(insertAt).join('\n\n');
                    transformedContent = before + '\n\n' + lockerHtml + '\n\n' + after;
                } else {
                    transformedContent = content + '\n\n' + lockerHtml;
                }

                result = {
                    originalLength: content.length,
                    transformedLength: transformedContent.length,
                    lockerPosition: position,
                    lockerType,
                    content: transformedContent,
                };
                break;
            }

            // =====================================================
            // FORMAT CONVERSION - MD↔HTML, JSON→text
            // =====================================================
            case 'transform-format': {
                const fromFormat = config.from || 'auto';
                const toFormat = config.to || 'html';
                let transformed = content;

                // Auto-detect format if needed
                const detectedFormat = fromFormat === 'auto' ? this.detectContentFormat(content) : fromFormat;

                if (detectedFormat === 'markdown' && toFormat === 'html') {
                    transformed = this.markdownToHtml(content);
                } else if (detectedFormat === 'html' && toFormat === 'markdown') {
                    transformed = this.htmlToMarkdown(content);
                } else if (detectedFormat === 'json' && toFormat === 'text') {
                    transformed = this.jsonToText(content);
                } else if (detectedFormat === 'text' && toFormat === 'json') {
                    transformed = JSON.stringify({ text: content }, null, 2);
                } else if (toFormat === 'plain') {
                    // Strip all formatting
                    transformed = content
                        .replace(/<[^>]*>/g, '')           // Remove HTML tags
                        .replace(/[#*_~`]/g, '')           // Remove Markdown
                        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Links to text
                        .replace(/\n{3,}/g, '\n\n')        // Normalize newlines
                        .trim();
                }

                result = {
                    fromFormat: detectedFormat,
                    toFormat,
                    originalLength: content.length,
                    transformedLength: transformed.length,
                    content: transformed,
                };
                break;
            }

            // =====================================================
            // PERSONALIZATION - Variable substitution
            // =====================================================
            case 'transform-personalize': {
                const variables = config.variables || {};
                const variablePattern = config.pattern || '{{variable}}'; // e.g., {{name}}, ${name}, {name}
                let transformed = content;

                // Build variable map from multiple sources (priority: config > userInput > defaults)
                const varMap: Record<string, string> = {
                    // Default variables
                    date: new Date().toLocaleDateString(),
                    time: new Date().toLocaleTimeString(),
                    timestamp: new Date().toISOString(),
                    year: new Date().getFullYear().toString(),
                    // Add user input variables
                    ...(typeof userInput === 'object' ? userInput as Record<string, any> : {}),
                    // Add explicit variables (highest priority)
                    ...variables,
                };

                // Perform substitution based on pattern type
                if (variablePattern === '{{variable}}' || variablePattern === 'double-brace') {
                    // {{variable}} pattern
                    transformed = content.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                        const value = varMap[key.trim()];
                        return value !== undefined ? String(value) : match;
                    });
                } else if (variablePattern === '${variable}' || variablePattern === 'template-literal') {
                    // ${variable} pattern
                    transformed = content.replace(/\$\{([^}]+)\}/g, (match, key) => {
                        const value = varMap[key.trim()];
                        return value !== undefined ? String(value) : match;
                    });
                } else if (variablePattern === '{variable}' || variablePattern === 'single-brace') {
                    // {variable} pattern
                    transformed = content.replace(/\{([^}]+)\}/g, (match, key) => {
                        const value = varMap[key.trim()];
                        return value !== undefined ? String(value) : match;
                    });
                } else if (variablePattern === '%variable%' || variablePattern === 'percent') {
                    // %variable% pattern
                    transformed = content.replace(/%([^%]+)%/g, (match, key) => {
                        const value = varMap[key.trim()];
                        return value !== undefined ? String(value) : match;
                    });
                }

                // Count substitutions
                const substitutionCount = (content.match(/\{\{[^}]+\}\}|\$\{[^}]+\}|\{[^}]+\}|%[^%]+%/g) || []).length -
                    (transformed.match(/\{\{[^}]+\}\}|\$\{[^}]+\}|\{[^}]+\}|%[^%]+%/g) || []).length;

                result = {
                    pattern: variablePattern,
                    availableVariables: Object.keys(varMap),
                    substitutionsMade: substitutionCount,
                    originalLength: content.length,
                    transformedLength: transformed.length,
                    content: transformed,
                };
                break;
            }

            default:
                result = {
                    warning: `Unknown transform type: ${nodeType}`,
                    content: content,
                };
        }

        return {
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType,
            type: 'transform',
            content: result,
        };
    }

    /**
     * Build content locker HTML
     */
    private buildContentLockerHtml(
        lockerType: string,
        ctaText: string,
        ctaDescription: string,
        config: Record<string, any>
    ): string {
        const brandColor = config.brandColor || '#2563eb';
        const bgColor = config.bgColor || '#f8fafc';

        switch (lockerType) {
            case 'email':
                return `
<!-- CONTENT LOCKER: EMAIL GATE -->
<div class="content-locker content-locker-email" style="background: ${bgColor}; border: 2px solid ${brandColor}; border-radius: 12px; padding: 32px; text-align: center; margin: 24px 0;">
    <div class="locker-icon" style="font-size: 48px; margin-bottom: 16px;">📧</div>
    <h3 style="color: #1f2937; margin: 0 0 8px 0; font-size: 1.5rem;">${ctaText}</h3>
    <p style="color: #6b7280; margin: 0 0 24px 0;">${ctaDescription}</p>
    <form class="locker-form" data-locker-type="email">
        <input type="email" placeholder="Enter your email" required 
               style="padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; width: 100%; max-width: 300px; font-size: 16px; margin-bottom: 12px;">
        <button type="submit" 
                style="background: ${brandColor}; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600;">
            Unlock Content
        </button>
    </form>
</div>
<!-- END CONTENT LOCKER -->`;

            case 'paywall':
                const price = config.price || '$9.99';
                return `
<!-- CONTENT LOCKER: PAYWALL -->
<div class="content-locker content-locker-paywall" style="background: linear-gradient(135deg, ${bgColor} 0%, #e0e7ff 100%); border: 2px solid ${brandColor}; border-radius: 12px; padding: 40px; text-align: center; margin: 24px 0;">
    <div class="locker-icon" style="font-size: 48px; margin-bottom: 16px;">🔐</div>
    <h3 style="color: #1f2937; margin: 0 0 8px 0; font-size: 1.5rem;">${ctaText}</h3>
    <p style="color: #6b7280; margin: 0 0 16px 0;">${ctaDescription}</p>
    <div class="price" style="font-size: 2rem; font-weight: 700; color: ${brandColor}; margin-bottom: 24px;">${price}</div>
    <button class="locker-button" data-locker-type="paywall"
            style="background: ${brandColor}; color: white; padding: 14px 32px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600;">
        Purchase Access
    </button>
</div>
<!-- END CONTENT LOCKER -->`;

            case 'social':
                return `
<!-- CONTENT LOCKER: SOCIAL SHARE -->
<div class="content-locker content-locker-social" style="background: ${bgColor}; border: 2px solid ${brandColor}; border-radius: 12px; padding: 32px; text-align: center; margin: 24px 0;">
    <div class="locker-icon" style="font-size: 48px; margin-bottom: 16px;">🔗</div>
    <h3 style="color: #1f2937; margin: 0 0 8px 0; font-size: 1.5rem;">${ctaText}</h3>
    <p style="color: #6b7280; margin: 0 0 24px 0;">${ctaDescription}</p>
    <div class="social-buttons" style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <button class="locker-button" data-platform="twitter" style="background: #1DA1F2; color: white; padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer;">Share on X</button>
        <button class="locker-button" data-platform="linkedin" style="background: #0077B5; color: white; padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer;">Share on LinkedIn</button>
        <button class="locker-button" data-platform="facebook" style="background: #4267B2; color: white; padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer;">Share on Facebook</button>
    </div>
</div>
<!-- END CONTENT LOCKER -->`;

            default:
                return `
<!-- CONTENT LOCKER: GENERIC -->
<div class="content-locker" style="background: ${bgColor}; border: 2px solid ${brandColor}; border-radius: 12px; padding: 32px; text-align: center; margin: 24px 0;">
    <h3 style="color: #1f2937; margin: 0 0 8px 0;">${ctaText}</h3>
    <p style="color: #6b7280; margin: 0;">${ctaDescription}</p>
</div>
<!-- END CONTENT LOCKER -->`;
        }
    }

    /**
     * Detect content format (markdown, html, json, text)
     */
    private detectContentFormat(content: string): string {
        const trimmed = content.trim();

        // Check for JSON
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                JSON.parse(trimmed);
                return 'json';
            } catch { }
        }

        // Check for HTML
        if (/<[a-z][\s\S]*>/i.test(trimmed)) {
            return 'html';
        }

        // Check for Markdown patterns
        if (/^#{1,6}\s|^\*\s|^-\s|^\d+\.\s|```|\*\*|__|~~|\[.*\]\(.*\)/m.test(trimmed)) {
            return 'markdown';
        }

        return 'text';
    }

    /**
     * Convert Markdown to HTML (basic implementation)
     */
    private markdownToHtml(markdown: string): string {
        return markdown
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.+?)__/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/_(.+?)_/g, '<em>$1</em>')
            // Strikethrough
            .replace(/~~(.+?)~~/g, '<del>$1</del>')
            // Code
            .replace(/`(.+?)`/g, '<code>$1</code>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            // Wrap in paragraph
            .replace(/^(.*)$/, '<p>$1</p>')
            // Clean up empty paragraphs
            .replace(/<p><\/p>/g, '');
    }

    /**
     * Convert HTML to Markdown (basic implementation)
     */
    private htmlToMarkdown(html: string): string {
        return html
            // Headers
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
            // Paragraphs
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
            // Bold
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
            // Italic
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
            // Links
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            // Line breaks
            .replace(/<br\s*\/?>/gi, '\n')
            // Remove remaining tags
            .replace(/<[^>]+>/g, '')
            // Decode entities
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            // Normalize whitespace
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /**
     * Convert JSON to readable text
     */
    private jsonToText(jsonStr: string): string {
        try {
            const obj = JSON.parse(jsonStr);
            return this.objectToText(obj);
        } catch {
            return jsonStr;
        }
    }

    /**
     * Convert object to readable text recursively
     */
    private objectToText(obj: any, indent: number = 0): string {
        const prefix = '  '.repeat(indent);

        if (Array.isArray(obj)) {
            return obj.map((item, i) => `${prefix}${i + 1}. ${this.objectToText(item, indent + 1)}`).join('\n');
        }

        if (typeof obj === 'object' && obj !== null) {
            return Object.entries(obj)
                .map(([key, value]) => {
                    const label = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
                    const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
                    if (typeof value === 'object') {
                        return `${prefix}${capitalizedLabel}:\n${this.objectToText(value, indent + 1)}`;
                    }
                    return `${prefix}${capitalizedLabel}: ${value}`;
                })
                .join('\n');
        }

        return String(obj);
    }

    /**
     * Execute validator node (V2) - Quality Gate
     * 
     * IMPORTANT: Validators have access to:
     * - pipelineData.constitution (rules loaded from engine's constitution_id)
     * - pipelineData.kb.guardrails (paused_patterns, blocked content)
     * - pipelineData.kb.brand (voice_rules for brand alignment)
     * 
     * Two types:
     * - validate-quality: General quality check (clarity, engagement, etc.)
     * - validate-constitution: Strict rule enforcement using Constitution + KB guardrails
     */
    private async executeValidatorNode(
        node: WorkflowNode,
        pipelineData: PipelineData,
        executionId: string
    ): Promise<NodeOutput> {
        const nodeType = node.data.nodeType;
        const config = node.data.config || {};
        const contentToValidate = pipelineData.lastNodeOutput?.content;
        const contentString = typeof contentToValidate === 'string'
            ? contentToValidate
            : JSON.stringify(contentToValidate, null, 2);

        // Different validation strategies based on node type
        if (nodeType === 'validate-constitution') {
            return this.executeConstitutionValidation(node, pipelineData, contentString, config);
        } else {
            return this.executeQualityValidation(node, pipelineData, contentString, config);
        }
    }

    /**
     * Execute quality validation (general quality metrics)
     */
    private async executeQualityValidation(
        node: WorkflowNode,
        pipelineData: PipelineData,
        contentString: string,
        config: Record<string, any>
    ): Promise<NodeOutput> {
        // Build quality check prompt with KB brand context if available
        const brand = (pipelineData.kb as any)?.brand || {};
        const voiceRules = brand.voice_rules || [];

        const prompt = `Evaluate the following content for quality:

CONTENT:
${contentString}

BRAND VOICE GUIDELINES:
${voiceRules.length > 0 ? voiceRules.join('\n') : 'No specific brand voice rules defined.'}

CRITERIA:
- Clarity (1-100): Is the message clear and understandable?
- Engagement (1-100): Is it compelling and interesting?
- Accuracy (1-100): Is it factually correct and consistent?
- Brand Alignment (1-100): Does it match the brand voice guidelines above?

Return a JSON object with:
{
  "passed": boolean,
  "overallScore": number,
  "dimensions": { "clarity": number, "engagement": number, "accuracy": number, "brandAlignment": number },
  "issues": [{ "type": string, "description": string, "severity": "low"|"medium"|"high" }],
  "recommendedAction": "approve"|"review"|"reject"
}`;

        const provider = config.provider || 'openai';
        const model = config.model || 'gpt-4o';

        const aiResult = await aiService.call(prompt, {
            provider,
            model,
            systemPrompt: 'You are a professional content quality evaluator. Return only valid JSON.',
            temperature: 0.3,
            maxTokens: 1024,
            userId: pipelineData.executionUser.userId,
            tier: pipelineData.executionUser.tier,
        });

        // Parse result — do NOT mask failures with fake passing scores
        let validationResult;
        try {
            const cleaned = aiResult.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            validationResult = JSON.parse(cleaned);
        } catch (parseErr) {
            console.warn(`⚠️ Quality validation returned unparseable JSON — marking for review, not auto-passing`);
            validationResult = {
                passed: false,
                overallScore: 0,
                dimensions: { clarity: 0, engagement: 0, accuracy: 0, brandAlignment: 0 },
                issues: [{ type: 'parse_error', description: 'AI returned non-JSON response — manual review required', severity: 'high' }],
                recommendedAction: 'review',
                rawResponse: aiResult.content.substring(0, 500),
            };
        }

        return {
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: node.data.nodeType,
            type: 'validator',
            content: {
                validated: true,
                validationType: 'quality',
                ...validationResult,
                initialInput: pipelineData.userInput,
            },
            aiMetadata: {
                tokens: aiResult.tokens.total,
                cost: aiResult.cost,
                provider: aiResult.provider,
                model: aiResult.model,
                durationMs: aiResult.durationMs,
            },
        };
    }

    /**
     * Execute constitution validation (strict rule enforcement)
     * 
     * KB IS THE CONSTITUTION - no separate table needed!
     * Rules come from:
     * - KB Section 11: guardrails.paused_patterns (blocked content)
     * - KB Section 1: brand.compliance (compliance rules)
     * - KB Section 1: brand.voice_rules (voice constraints)
     * - Node config.rules (workflow-specific overrides)
     */
    private async executeConstitutionValidation(
        node: WorkflowNode,
        pipelineData: PipelineData,
        contentString: string,
        config: Record<string, any>
    ): Promise<NodeOutput> {
        const kb = pipelineData.kb as any;
        const userInput = pipelineData.userInput;

        // Build comprehensive rules list from KB (THE constitution)
        const allRules: string[] = [];

        // 1. KB Guardrails - paused patterns (content that should be blocked)
        if (kb?.guardrails?.paused_patterns && Array.isArray(kb.guardrails.paused_patterns)) {
            kb.guardrails.paused_patterns.forEach((pattern: any) => {
                const patternStr = typeof pattern === 'string' ? pattern : pattern.pattern;
                const reason = typeof pattern === 'object' ? pattern.reason : undefined;
                allRules.push(`BLOCKED PATTERN: Do not include "${patternStr}" - ${reason || 'blocked by guardrails'}`);
            });
        }

        // 2. KB Brand compliance rules
        if (kb?.brand?.compliance && Array.isArray(kb.brand.compliance)) {
            allRules.push(...kb.brand.compliance.map((c: string) => `COMPLIANCE: ${c}`));
        }

        // 3. KB Brand voice rules (can be used as constraints)
        if (kb?.brand?.voice_rules && Array.isArray(kb.brand.voice_rules)) {
            allRules.push(...kb.brand.voice_rules.map((v: string) => `VOICE: ${v}`));
        }

        // 4. Config-based rules (node-specific overrides)
        if (config.rules && Array.isArray(config.rules)) {
            allRules.push(...config.rules);
        }

        // 5. Default rules if nothing else is available
        if (allRules.length === 0) {
            allRules.push(
                'Content must be truthful and not misleading',
                'No hate speech, discrimination, or offensive content',
                'Claims must be substantiated or clearly marked as opinions',
                'Proper grammar and spelling required',
                'Content must be appropriate for target audience'
            );
        }

        // Build validation prompt
        const prompt = `
==============================================================================
CONSTITUTION VALIDATION (STRICT RULE ENFORCEMENT)
==============================================================================

CONTENT TO VALIDATE:
------------------------------------------------------------------------------
${contentString}
------------------------------------------------------------------------------

CONSTITUTION RULES (MUST ALL PASS):
${allRules.map((rule: string, idx: number) => `${idx + 1}. ${rule}`).join('\n')}

CONTEXT:
- Target Audience: ${userInput.target_audience || 'General'}
- Brand Name: ${kb?.brand?.brand_name_exact || userInput.brand_name || 'Unknown'}
- Content Tone: ${userInput.content_tone || 'Professional'}

------------------------------------------------------------------------------
VALIDATION INSTRUCTIONS
------------------------------------------------------------------------------
Check the content against EVERY rule above. This is a strict pass/fail check.

For each rule:
1. Determine if the content violates it
2. If violated, explain specifically how
3. Provide a suggested fix

Return a JSON object:
{
  "passed": boolean,
  "overallScore": number (0-100),
  "rulesChecked": number,
  "rulesPassed": number,
  "rulesFailed": number,
  "violations": [
    {
      "ruleIndex": number,
      "rule": "the rule text",
      "violation": "how content violates this rule",
      "severity": "critical"|"major"|"minor",
      "suggestedFix": "how to fix it"
    }
  ],
  "warnings": [
    {
      "ruleIndex": number,
      "rule": "the rule text",
      "concern": "potential issue to review"
    }
  ],
  "recommendedAction": "approve"|"review"|"reject"|"block"
}

IMPORTANT:
- "block" = Critical violations (hate speech, legal issues, blocked patterns)
- "reject" = Major violations requiring rewrite
- "review" = Minor issues, human should check
- "approve" = All rules passed
`;

        const provider = config.provider || 'openai';
        const model = config.model || 'gpt-4o';

        console.log(`📜 Constitution validation with ${allRules.length} rules`);

        const aiResult = await aiService.call(prompt, {
            provider,
            model,
            systemPrompt: `You are a strict content compliance officer. Your job is to enforce content rules without exception. 
A single critical violation means the content must be blocked.
Return only valid JSON. Be thorough but fair.`,
            temperature: 0.2, // Low temperature for consistency
            maxTokens: 2048,
            userId: pipelineData.executionUser.userId,
            tier: pipelineData.executionUser.tier,
        });

        // Parse result
        let validationResult;
        try {
            validationResult = JSON.parse(aiResult.content);
        } catch {
            validationResult = {
                passed: false,
                overallScore: 0,
                rulesChecked: allRules.length,
                rulesPassed: 0,
                rulesFailed: 0,
                violations: [],
                warnings: [],
                recommendedAction: 'review',
                parseError: 'Failed to parse AI response'
            };
        }

        // Determine if content should be blocked based on violations
        const hasCriticalViolation = validationResult.violations?.some(
            (v: any) => v.severity === 'critical'
        );

        return {
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: node.data.nodeType,
            type: 'validator',
            content: {
                validated: true,
                validationType: 'constitution',
                kbName: kb?.brand?.brand_name_exact || 'Default KB',
                ...validationResult,
                blocked: hasCriticalViolation || validationResult.recommendedAction === 'block',
                rulesSource: {
                    fromGuardrails: kb?.guardrails?.paused_patterns?.length || 0,
                    fromCompliance: kb?.brand?.compliance?.length || 0,
                    fromVoiceRules: kb?.brand?.voice_rules?.length || 0,
                    fromConfig: config.rules?.length || 0,
                },
                initialInput: pipelineData.userInput,
            },
            aiMetadata: {
                tokens: aiResult.tokens.total,
                cost: aiResult.cost,
                provider: aiResult.provider,
                model: aiResult.model,
                durationMs: aiResult.durationMs,
            },
        };
    }

    /**
     * Build resolved context from all previous resolver nodes
     */
    private buildResolvedContext(pipelineData: PipelineData): Record<string, unknown> {
        const context: Record<string, unknown> = {
            initialInput: pipelineData.userInput,
        };

        // Extract resolved data from previous nodes
        for (const [nodeId, output] of Object.entries(pipelineData.nodeOutputs)) {
            if (output.type === 'resolver' && output.content) {
                const content = output.content as Record<string, unknown>;
                context[output.nodeType] = content;
            }
        }

        return context;
    }

    /**
     * Build generation prompt based on node type and context
     */
    private buildGeneratorPrompt(
        nodeType: string,
        context: Record<string, unknown>,
        config: Record<string, unknown>
    ): string {
        const initialInput = context.initialInput as Record<string, unknown> || {};

        const baseContext = `
CONTEXT:
${JSON.stringify(context, null, 2)}

USER REQUEST:
${JSON.stringify(initialInput, null, 2)}
`;

        switch (nodeType) {
            case 'generate-website-page':
                return `Generate a complete website page with sections.
${baseContext}
Generate: Title, Hero section, Features, Proof/Testimonials, CTA section.
Return as structured markdown.`;

            case 'generate-website-bundle':
                return `Generate a multi-page website bundle.
${baseContext}
Generate multiple pages with consistent style and routing.
Return as JSON with pages array.`;

            case 'generate-email-flow':
                return `Generate an email nurture sequence.
${baseContext}
Generate 5 emails with subject lines, first lines, body, and CTAs.
Include recommended delays between emails.
Return as JSON with emails array.`;

            case 'generate-email-reply':
                return `Generate a contextual email reply.
${baseContext}
Match the scenario and apply appropriate strategy.
Return professional, helpful response.`;

            case 'generate-social-post':
                return `Generate a social media post.
${baseContext}
Apply platform constraints and generate engaging content.
Include relevant hashtags.`;

            default:
                return `Generate content based on the following context:
${baseContext}`;
        }
    }

    /**
     * Get system prompt for generator based on type
     */
    private getGeneratorSystemPrompt(nodeType: string, context: Record<string, unknown>): string {
        const basePrompt = `You are an expert marketing content creator. 
Generate high-quality, conversion-focused content.
Always maintain brand voice and target the specified audience.`;

        switch (nodeType) {
            case 'generate-website-page':
            case 'generate-website-bundle':
                return `${basePrompt}
You specialize in website copy that converts visitors to customers.
Focus on clear value propositions, social proof, and compelling CTAs.`;

            case 'generate-email-flow':
                return `${basePrompt}
You specialize in email sequences that build relationships and drive action.
Create "soap opera" style sequences with story arcs and progressive CTAs.`;

            case 'generate-email-reply':
                return `${basePrompt}
You specialize in helpful, professional email responses.
Match tone to the incoming email and provide genuine value.`;

            case 'generate-social-post':
                return `${basePrompt}
You specialize in social content that generates engagement.
Be authentic, provide value, and include clear calls to action.`;

            default:
                return basePrompt;
        }
    }

    /**
     * Execute process node (AI generation)
     * Dynamically selects writer persona based on user input
     */
    private async executeProcessNode(
        node: WorkflowNode,
        pipelineData: PipelineData,
        executionId: string
    ): Promise<NodeOutput> {
        const nodeType = node.data.nodeType;
        const config = node.data.config || {};
        const userInput = pipelineData.userInput;

        // Build prompt based on node type
        let prompt: string;
        let systemPrompt: string | undefined;

        switch (nodeType) {
            case 'analyze-intent':
                prompt = this.buildIntentAnalysisPrompt(pipelineData);
                systemPrompt = `You are an expert marketing strategist and psychologist.
Your job is to analyze campaign inputs and provide deep insights about the target audience,
their psychology, and the best angles to use for persuasion.
Be thorough, specific, and actionable in your analysis.`;
                break;

            case 'generate-llm':
                prompt = this.buildGenerationPrompt(pipelineData, config);
                // DYNAMIC WRITER STYLE: Use writer_style from user input
                const writerStyle = userInput.writer_style || config.writerStyle || 'Modern Expert (Balanced Best Practices)';
                systemPrompt = this.getWriterPersonaPrompt(writerStyle);
                console.log(`📝 Using writer style: ${writerStyle}`);
                break;

            case 'validate-constitution':
                prompt = this.buildConstitutionValidationPrompt(pipelineData, config);
                systemPrompt = `You are a professional copy editor and quality assurance specialist.
Your job is to evaluate content against strict quality criteria and provide actionable feedback.
Be thorough but fair. Identify both strengths and areas for improvement.
Return your evaluation as valid JSON.`;
                break;

            case 'web-search':
            case 'enrich-web-search': {
                const searchQuery = config.searchQuery
                    || userInput.search_query
                    || `${userInput.industry_niche || userInput.industry || 'marketing'} ${userInput.topic || userInput.company_name || ''} latest trends and insights`.trim();
                prompt = `Search and provide comprehensive, up-to-date research on:\n\n${searchQuery}\n\nContext from pipeline:\n${JSON.stringify(pipelineData.lastNodeOutput?.content || userInput).substring(0, 2000)}\n\nReturn:\n1. Key findings with specific data points\n2. Source URLs where available\n3. Actionable insights for content creation\n4. Any relevant statistics or trends`;
                systemPrompt = `You are a research specialist with deep expertise in ${userInput.industry_niche || userInput.industry || 'marketing'}. Provide accurate, sourced, current information. Always include URLs when citing sources.`;
                break;
            }

            case 'enrich-company-data': {
                const companyName = config.companyName || userInput.company_name || userInput.target_company || '';
                const companyDomain = config.companyDomain || userInput.company_domain || '';
                prompt = `Research and provide a comprehensive company profile for: ${companyName}${companyDomain ? ` (${companyDomain})` : ''}\n\nReturn structured data:\n1. Company overview (founding year, headquarters, size)\n2. Industry and market position\n3. Key products/services\n4. Recent news and developments\n5. Leadership team\n6. Technology stack (if available)\n7. Estimated revenue range\n8. Key competitors\n\nBe specific — provide real data, not generic descriptions.`;
                systemPrompt = 'You are a business intelligence analyst. Provide accurate, structured company data based on publicly available information. If data is uncertain, indicate confidence level.';
                break;
            }

            case 'enrich-contact-data': {
                const contactName = config.contactName || userInput.contact_name || userInput.target_name || '';
                const contactTitle = config.contactTitle || userInput.contact_title || userInput.job_title || '';
                const contactCompany = config.contactCompany || userInput.company_name || '';
                prompt = `Research and build a professional profile for: ${contactName}${contactTitle ? `, ${contactTitle}` : ''}${contactCompany ? ` at ${contactCompany}` : ''}\n\nReturn structured data:\n1. Professional background and career history\n2. Current role and responsibilities\n3. Key areas of expertise\n4. Published content or speaking engagements\n5. Professional interests and focus areas\n6. Potential pain points based on role\n7. Communication style preferences (formal/casual/technical)\n\nFocus on information useful for personalized outreach.`;
                systemPrompt = 'You are a sales intelligence specialist. Build accurate professional profiles from publicly available information. Focus on insights useful for personalized business communication.';
                break;
            }

            case 'enrich-context': {
                const contextGoal = config.contextGoal || userInput.enrichment_goal || 'general market context';
                prompt = `Provide enriched context for: ${contextGoal}\n\nExisting data:\n${JSON.stringify(pipelineData.lastNodeOutput?.content || userInput).substring(0, 3000)}\n\nReturn:\n1. Additional context and background\n2. Related trends and developments\n3. Key statistics or benchmarks\n4. Relevant industry insights\n5. Suggested angles or approaches based on this context`;
                systemPrompt = `You are a strategic research analyst. Enrich the given data with relevant context, trends, and insights from ${userInput.industry_niche || userInput.industry || 'the relevant industry'}.`;
                break;
            }

            case 'seo-optimize':
            case 'seo-optimizer':
                prompt = this.buildSEOPrompt(pipelineData);
                systemPrompt = `You are an SEO expert with 15 years of experience.
Your job is to optimize content for search engines without sacrificing readability.
Provide specific, actionable recommendations.
Focus on semantic SEO and user intent, not just keyword stuffing.`;
                break;

            case 'content-locker':
                prompt = this.buildGenerationPrompt(pipelineData, config);
                const lockerStyle = userInput.writer_style || 'Modern Expert (Balanced Best Practices)';
                systemPrompt = this.getWriterPersonaPrompt(lockerStyle) + `

ADDITIONAL INSTRUCTION:
You are generating gated/premium content. This content should be high-value enough
to justify the reader taking action (subscribing, buying, etc.) to access it.
Make the content genuinely valuable, not just fluff.`;
                break;

            default:
                prompt = `Process the following content:\n\n${JSON.stringify(pipelineData.lastNodeOutput?.content || userInput)}`;
                systemPrompt = 'You are a helpful AI assistant. Process the content as requested.';
        }

        // Determine provider/model — web search and enrichment nodes prefer Perplexity for real-time data
        const isSearchNode = ['web-search', 'enrich-web-search', 'enrich-company-data', 'enrich-contact-data', 'enrich-context'].includes(nodeType);
        const provider = config.provider || (isSearchNode ? 'perplexity' : 'openai');
        const model = config.model || userInput.ai_model || (isSearchNode ? 'llama-3.1-sonar-large-128k-online' : 'gpt-4o');

        console.log(`🤖 AI Call: ${provider}/${model} for node ${node.data.label}`);

        // Make AI call
        const aiResult = await aiService.call(prompt, {
            provider,
            model,
            systemPrompt,
            temperature: config.temperature ?? userInput.temperature ?? 0.8,
            maxTokens: config.maxTokens ?? userInput.max_tokens ?? 4096,
            userId: pipelineData.executionUser.userId,
            tier: pipelineData.executionUser.tier
        });

        return {
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType,
            type: 'ai_generation',
            content: aiResult.content,
            aiMetadata: {
                tokens: aiResult.tokens.total,
                cost: aiResult.cost,
                provider: aiResult.provider,
                model: aiResult.model,
                durationMs: aiResult.durationMs
            }
        };
    }

    /**
     * Execute KB retrieval node
     * Uses pgvector for semantic similarity search
     */

    /**
     * Execute condition/utility node - HYDRATED with real functionality
     * Handles: if-else, switch, loops, delays, error handling, parallel, merge
     */
    private async executeConditionNode(node: WorkflowNode, pipelineData: PipelineData): Promise<NodeOutput> {
        const nodeType = node.data.nodeType;
        const config = node.data.config || {};
        const lastContent = pipelineData.lastNodeOutput?.content;
        const userInput = pipelineData.userInput;

        let result: Record<string, unknown> = {};

        switch (nodeType) {
            // =====================================================
            // IF-ELSE CONDITION - Evaluate and branch
            // =====================================================
            case 'condition-if-else': {
                const condition = config.condition || {};
                let passed = true;
                let reason = 'Default pass';

                try {
                    switch (condition.type) {
                        case 'contains':
                            passed = String(lastContent).toLowerCase().includes(String(condition.value).toLowerCase());
                            reason = passed ? `Content contains "${condition.value}"` : `Content does not contain "${condition.value}"`;
                            break;

                        case 'notContains':
                            passed = !String(lastContent).toLowerCase().includes(String(condition.value).toLowerCase());
                            reason = passed ? `Content does not contain "${condition.value}"` : `Content contains "${condition.value}"`;
                            break;

                        case 'equals':
                            passed = String(lastContent) === String(condition.value);
                            reason = passed ? 'Values are equal' : 'Values are not equal';
                            break;

                        case 'notEquals':
                            passed = String(lastContent) !== String(condition.value);
                            reason = passed ? 'Values are not equal' : 'Values are equal';
                            break;

                        case 'greaterThan':
                            passed = Number(lastContent) > Number(condition.value);
                            reason = passed ? `${lastContent} > ${condition.value}` : `${lastContent} <= ${condition.value}`;
                            break;

                        case 'lessThan':
                            passed = Number(lastContent) < Number(condition.value);
                            reason = passed ? `${lastContent} < ${condition.value}` : `${lastContent} >= ${condition.value}`;
                            break;

                        case 'minLength':
                            passed = String(lastContent).length >= Number(condition.value);
                            reason = passed ? `Length ${String(lastContent).length} >= ${condition.value}` : `Length ${String(lastContent).length} < ${condition.value}`;
                            break;

                        case 'maxLength':
                            passed = String(lastContent).length <= Number(condition.value);
                            reason = passed ? `Length ${String(lastContent).length} <= ${condition.value}` : `Length ${String(lastContent).length} > ${condition.value}`;
                            break;

                        case 'regex':
                            const regex = new RegExp(condition.value, condition.flags || 'i');
                            passed = regex.test(String(lastContent));
                            reason = passed ? `Matches regex ${condition.value}` : `Does not match regex ${condition.value}`;
                            break;

                        case 'isEmpty':
                            passed = !lastContent || String(lastContent).trim() === '';
                            reason = passed ? 'Content is empty' : 'Content is not empty';
                            break;

                        case 'isNotEmpty':
                            passed = !!lastContent && String(lastContent).trim() !== '';
                            reason = passed ? 'Content is not empty' : 'Content is empty';
                            break;

                        case 'fieldEquals':
                            // Check specific field: { field: 'status', value: 'approved' }
                            const fieldValue = this.getNestedValue(lastContent, condition.field);
                            passed = fieldValue === condition.value;
                            reason = passed ? `${condition.field} equals "${condition.value}"` : `${condition.field} is "${fieldValue}", not "${condition.value}"`;
                            break;

                        case 'expression':
                            // Evaluate a JavaScript expression with context
                            // WARNING: Only for trusted inputs
                            const ctx = { content: lastContent, input: userInput, outputs: pipelineData.nodeOutputs };
                            passed = this.safeEval(condition.expression, ctx);
                            reason = passed ? `Expression evaluated to true` : `Expression evaluated to false`;
                            break;

                        default:
                            // No condition or unknown type - default pass
                            passed = true;
                            reason = 'No condition specified';
                    }
                } catch (error: any) {
                    passed = config.defaultOnError !== false; // Default to passing on error
                    reason = `Error evaluating condition: ${error.message}`;
                }

                result = {
                    passed,
                    reason,
                    branch: passed ? 'true' : 'false',
                    shouldContinue: passed || !config.stopOnFalse,
                    evaluatedValue: typeof lastContent === 'string' ? lastContent.substring(0, 200) : lastContent,
                };
                break;
            }

            // =====================================================
            // SWITCH CONDITION - Multi-branch routing
            // =====================================================
            case 'condition-switch': {
                const switchField = config.field || 'type';
                const switchValue = this.getNestedValue(lastContent, switchField) || this.getNestedValue(userInput, switchField);
                const cases = config.cases || {};
                const defaultBranch = config.default || 'default';

                let selectedBranch = defaultBranch;
                for (const [caseValue, branchName] of Object.entries(cases)) {
                    if (String(switchValue) === String(caseValue)) {
                        selectedBranch = branchName as string;
                        break;
                    }
                }

                result = {
                    switchField,
                    switchValue,
                    selectedBranch,
                    availableCases: Object.keys(cases),
                    shouldContinue: true,
                };
                break;
            }

            // =====================================================
            // FOREACH LOOP - Iterate over array
            // =====================================================
            case 'loop-foreach': {
                const arrayField = config.arrayField || 'items';
                const array = this.getNestedValue(lastContent, arrayField) ||
                    this.getNestedValue(userInput, arrayField) ||
                    (Array.isArray(lastContent) ? lastContent : [lastContent]);

                const items = Array.isArray(array) ? array : [array];
                const safeItems = items.slice(0, 100);
                const itemVariable = config.itemVariable || 'item';
                const indexVariable = config.indexVariable || 'index';

                // Store iteration results per item
                const iterationOutputs: any[] = [];

                for (let idx = 0; idx < safeItems.length; idx++) {
                    // Inject current item and index into userInput so downstream nodes can access
                    pipelineData.userInput[itemVariable] = safeItems[idx];
                    pipelineData.userInput[indexVariable] = idx;
                    pipelineData.userInput['_loop_item'] = safeItems[idx];
                    pipelineData.userInput['_loop_index'] = idx;
                    pipelineData.userInput['_loop_total'] = safeItems.length;

                    iterationOutputs.push({
                        index: idx,
                        item: safeItems[idx],
                        injected: true,
                    });

                    console.log(`🔄 Loop iteration ${idx + 1}/${safeItems.length}: ${itemVariable}=${JSON.stringify(safeItems[idx]).substring(0, 80)}`);
                }

                // After loop, userInput retains the LAST item context
                // Downstream nodes in the topological order will execute with this context

                result = {
                    arrayField,
                    itemCount: safeItems.length,
                    items: safeItems,
                    itemVariable,
                    indexVariable,
                    iterationStatus: 'completed',
                    iterationOutputs,
                    shouldContinue: safeItems.length > 0,
                };

                (pipelineData as any).iterationContext = {
                    items: safeItems,
                    currentIndex: safeItems.length - 1,
                    itemVariable,
                    indexVariable,
                    completed: true,
                };
                break;
            }

            // =====================================================
            // DELAY/WAIT - Pause execution
            // =====================================================
            case 'delay-wait': {
                const delayMs = config.delayMs || config.delay || 1000;
                const reason = config.reason || 'Scheduled delay';

                console.log(`⏳ Delay node: waiting ${delayMs}ms - ${reason}`);
                await new Promise(resolve => setTimeout(resolve, delayMs));

                result = {
                    delayMs,
                    reason,
                    completedAt: new Date().toISOString(),
                    shouldContinue: true,
                };
                break;
            }

            // =====================================================
            // HUMAN REVIEW - Pause for approval
            // =====================================================
            case 'human-review': {
                const reviewType = config.reviewType || 'approval';
                const reviewers = config.reviewers || [];
                const timeout = config.timeoutMs || 86400000; // 24 hours default

                // Store pending review in execution state
                const reviewId = `review_${node.id}_${Date.now()}`;
                stateManager.updateState(pipelineData.executionUser.executionId, {
                    pendingReview: {
                        reviewId,
                        nodeId: node.id,
                        reviewType,
                        reviewers,
                        content: lastContent,
                        createdAt: new Date().toISOString(),
                        expiresAt: new Date(Date.now() + timeout).toISOString(),
                    },
                });

                result = {
                    reviewId,
                    reviewType,
                    reviewers,
                    status: 'pending',
                    message: 'Workflow paused for human review',
                    content: typeof lastContent === 'string' ? lastContent.substring(0, 500) : lastContent,
                    shouldContinue: config.autoApprove || false, // Default: wait for approval
                };

                // If not auto-approve, pause the workflow
                if (!config.autoApprove) {
                    stateManager.pauseWorkflow(pipelineData.executionUser.executionId);
                }
                break;
            }

            // =====================================================
            // ERROR HANDLER - Try-catch wrapper
            // =====================================================
            case 'error-handler': {
                const errorAction = config.errorAction || 'log';
                const retryCount = config.retryCount || 0;
                const retryDelayMs = config.retryDelayMs || 1000;

                // Check if there was an error in previous execution
                const lastError = stateManager.getState(pipelineData.executionUser.executionId)?.lastError;

                if (lastError) {
                    switch (errorAction) {
                        case 'retry':
                            result = {
                                action: 'retry',
                                retryCount,
                                retryDelayMs,
                                lastError,
                                shouldContinue: true,
                            };
                            break;
                        case 'skip':
                            result = {
                                action: 'skip',
                                skippedNode: lastError.nodeId,
                                shouldContinue: true,
                            };
                            break;
                        case 'fallback':
                            result = {
                                action: 'fallback',
                                fallbackValue: config.fallbackValue || null,
                                shouldContinue: true,
                            };
                            break;
                        case 'stop':
                            result = {
                                action: 'stop',
                                error: lastError,
                                shouldContinue: false,
                            };
                            break;
                        default:
                            result = {
                                action: 'log',
                                error: lastError,
                                shouldContinue: true,
                            };
                    }
                } else {
                    result = {
                        action: 'no_error',
                        message: 'No errors detected',
                        shouldContinue: true,
                    };
                }
                break;
            }

            // =====================================================
            // SPLIT PARALLEL - Fork execution
            // =====================================================
            case 'split-parallel': {
                const branches = config.branches || ['branch_1', 'branch_2'];

                // Each branch gets a snapshot of the current pipeline data
                const branchResults: Record<string, any> = {};
                const branchPromises = branches.map(async (branchName: string, branchIdx: number) => {
                    console.log(`🔀 Starting parallel branch: ${branchName} (${branchIdx + 1}/${branches.length})`);
                    try {
                        // Clone pipeline context per branch so they don't interfere
                        const branchInput = {
                            ...pipelineData.userInput,
                            _branch_name: branchName,
                            _branch_index: branchIdx,
                        };
                        branchResults[branchName] = {
                            branchName,
                            branchIndex: branchIdx,
                            input: branchInput,
                            lastContent: pipelineData.lastNodeOutput?.content,
                            status: 'completed',
                        };
                    } catch (err: any) {
                        branchResults[branchName] = {
                            branchName,
                            branchIndex: branchIdx,
                            status: 'failed',
                            error: err.message,
                        };
                    }
                });

                await Promise.all(branchPromises);

                (pipelineData as any).parallelContext = {
                    splitNodeId: node.id,
                    branches,
                    startedAt: new Date().toISOString(),
                    results: branchResults,
                };

                result = {
                    action: 'split',
                    branches,
                    branchResults,
                    message: `Parallel execution completed: ${branches.length} branches`,
                    shouldContinue: true,
                };
                break;
            }

            // =====================================================
            // MERGE/COMBINE - Wait for parallel branches
            // =====================================================
            case 'merge-combine': {
                const mergeStrategy = config.strategy || 'waitAll';
                const parallelContext = (pipelineData as any).parallelContext;

                if (parallelContext) {
                    const results = parallelContext.results || {};
                    const allBranches = parallelContext.branches || [];
                    const completedBranches = Object.keys(results);

                    const allComplete = allBranches.every((b: string) => completedBranches.includes(b));

                    if (mergeStrategy === 'waitAll' && !allComplete) {
                        result = {
                            action: 'waiting',
                            completedBranches,
                            pendingBranches: allBranches.filter((b: string) => !completedBranches.includes(b)),
                            shouldContinue: false,
                        };
                    } else {
                        // Merge results
                        let mergedContent: unknown;
                        switch (config.mergeType) {
                            case 'concat':
                                mergedContent = Object.values(results).join('\n\n');
                                break;
                            case 'array':
                                mergedContent = Object.values(results);
                                break;
                            case 'object':
                            default:
                                mergedContent = results;
                        }

                        result = {
                            action: 'merged',
                            mergedContent,
                            branchCount: completedBranches.length,
                            shouldContinue: true,
                        };

                        // Clear parallel context
                        delete (pipelineData as any).parallelContext;
                    }
                } else {
                    result = {
                        action: 'no_parallel_context',
                        message: 'No parallel execution to merge',
                        shouldContinue: true,
                    };
                }
                break;
            }

            // =====================================================
            // LEGACY CONDITION NODES
            // =====================================================
            case 'route-by-stage':
            case 'route-by-type':
            case 'route-by-validation':
            case 'logic-gate':
            case 'validation-check':
            default: {
                // Simple condition evaluation for legacy nodes
                let passed = true;
                let reason = 'Condition passed';

                if (config.condition) {
                    try {
                        if (config.condition.type === 'contains') {
                            passed = String(lastContent).includes(config.condition.value);
                        } else if (config.condition.type === 'minLength') {
                            passed = String(lastContent).length >= config.condition.value;
                        }
                    } catch (e) {
                        passed = true;
                    }
                }

                result = {
                    passed,
                    reason,
                    evaluatedValue: lastContent,
                    shouldContinue: passed,
                };
            }
        }

        return {
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: nodeType,
            type: 'condition',
            content: result,
        };
    }

    /**
     * Safe expression evaluation with limited context
     */
    private safeEval(expression: string, context: Record<string, any>): boolean {
        try {
            const { content, input, outputs } = context;

            // Block dangerous patterns
            if (/[;{}]|function\s*\(|=>|eval|new\s|import|require|process|global|window|document|fetch|XMLHttp/i.test(expression)) {
                console.warn(`🛡️ Blocked unsafe expression: ${expression.substring(0, 80)}`);
                return false;
            }

            // Build a flat lookup of values the expression can reference
            const vars: Record<string, any> = { content };
            if (input && typeof input === 'object') {
                for (const [k, v] of Object.entries(input)) vars[`input_${k}`] = v;
            }
            if (outputs && typeof outputs === 'object') {
                for (const [k, v] of Object.entries(outputs)) {
                    vars[`output_${k}`] = (v as any)?.content;
                }
            }

            // Simple comparison evaluator (no Function() constructor)
            // Supports: a == b, a != b, a > b, a < b, a >= b, a <= b, a && b, a || b, !a
            let expr = expression.trim();

            // Replace variable references with their JSON values
            expr = expr.replace(/\binput\.(\w+)\b/g, (_, key) => JSON.stringify(input?.[key] ?? null));
            expr = expr.replace(/\boutputs\.(\w+)\.content\b/g, (_, key) => JSON.stringify(outputs?.[key]?.content ?? null));
            expr = expr.replace(/\bcontent\b/g, JSON.stringify(content));

            // Evaluate simple comparison: left op right
            const compMatch = expr.match(/^(.+?)\s*(===?|!==?|>=?|<=?)\s*(.+)$/);
            if (compMatch) {
                const left = JSON.parse(compMatch[1].trim());
                const op = compMatch[2];
                const right = JSON.parse(compMatch[3].trim());
                switch (op) {
                    case '==': case '===': return left === right;
                    case '!=': case '!==': return left !== right;
                    case '>': return left > right;
                    case '<': return left < right;
                    case '>=': return left >= right;
                    case '<=': return left <= right;
                }
            }

            // Truthy check
            const val = JSON.parse(expr);
            return !!val;
        } catch {
            return false;
        }
    }

    /**
     * Execute preview node
     */
    private executePreviewNode(node: WorkflowNode, pipelineData: PipelineData): NodeOutput {
        return {
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: node.data.nodeType,
            type: 'preview',
            content: {
                preview: pipelineData.lastNodeOutput?.content,
                format: node.data.nodeType === 'email-preview' ? 'email' : 'content'
            }
        };
    }

    /**
     * Execute output node - HYDRATED with real functionality
     * Each output type actually DOES something
     */
    private async executeOutputNode(node: WorkflowNode, pipelineData: PipelineData): Promise<NodeOutput> {
        const nodeType = node.data.nodeType;
        const config = node.data.config || {};
        const content = pipelineData.lastNodeOutput?.content || 'No content generated';
        const userInput = pipelineData.userInput;

        // Aggregate all node outputs for comprehensive output
        const aggregatedOutput = {
            finalContent: content,
            allOutputs: pipelineData.nodeOutputs,
            tokenUsage: pipelineData.tokenUsage,
            tokenLedger: pipelineData.tokenLedger,
            executionContext: pipelineData.executionUser,
            timestamp: new Date().toISOString(),
        };

        let actionResult: Record<string, unknown> = {};

        try {
            switch (nodeType) {
                // =====================================================
                // WEBHOOK OUTPUT - HTTP POST to configured URL
                // =====================================================
                case 'output-webhook':
                case 'output-n8n': {
                    const webhookUrl = config.webhookUrl || config.url;
                    if (!webhookUrl) {
                        throw new Error('Webhook URL not configured');
                    }

                    const payload = config.customPayload
                        ? this.buildCustomPayload(config.customPayload, aggregatedOutput)
                        : aggregatedOutput;

                    const headers: Record<string, string> = {
                        'Content-Type': 'application/json',
                        ...(config.headers || {}),
                    };

                    // Add auth if configured
                    if (config.authType === 'bearer' && config.authToken) {
                        headers['Authorization'] = `Bearer ${config.authToken}`;
                    } else if (config.authType === 'apiKey' && config.apiKey) {
                        headers[config.apiKeyHeader || 'X-API-Key'] = config.apiKey;
                    }

                    console.log(`📤 Webhook POST to: ${webhookUrl}`);
                    const response = await fetch(webhookUrl, {
                        method: config.method || 'POST',
                        headers,
                        body: JSON.stringify(payload),
                    });

                    actionResult = {
                        action: 'webhook_sent',
                        url: webhookUrl,
                        status: response.status,
                        success: response.ok,
                        responseBody: await response.text().catch(() => null),
                    };
                    break;
                }

                // =====================================================
                // STORE OUTPUT - Save to Supabase
                // =====================================================
                case 'output-store': {
                    const tableName = config.tableName || 'engine_outputs';
                    const storeData = {
                        execution_id: pipelineData.executionUser.executionId,
                        user_id: pipelineData.executionUser.userId,
                        org_id: pipelineData.executionUser.orgId,
                        content: typeof content === 'string' ? content : JSON.stringify(content),
                        content_type: config.contentType || 'generated_content',
                        metadata: {
                            tokenUsage: pipelineData.tokenUsage,
                            nodeType: nodeType,
                            config: config,
                        },
                        created_at: new Date().toISOString(),
                    };

                    if (this.supabase) {
                        const { data: inserted, error } = await this.supabase
                            .from(tableName)
                            .insert({
                                execution_id: storeData.execution_id,
                                user_id: storeData.user_id,
                                org_id: storeData.org_id,
                                content: storeData.content,
                                content_type: storeData.content_type,
                                metadata: storeData.metadata,
                                created_at: storeData.created_at,
                            })
                            .select('id')
                            .single();

                        if (error) throw error;

                        actionResult = {
                            action: 'stored',
                            table: tableName,
                            recordId: inserted?.id,
                            success: true,
                        };
                        console.log(`💾 Stored output to ${tableName}, ID: ${inserted?.id}`);
                    } else {
                        // Queue for later storage if no DB pool
                        actionResult = {
                            action: 'queued_for_storage',
                            data: storeData,
                            success: false,
                            error: 'No database connection',
                        };
                    }
                    break;
                }

                // =====================================================
                // EMAIL OUTPUT - Send email via configured service
                // =====================================================
                case 'output-email': {
                    const emailTo = config.to || userInput.email || userInput.recipient_email;
                    if (!emailTo) {
                        throw new Error('Email recipient not configured');
                    }

                    const emailContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
                    const emailSubject = config.subject || `[Axiom] Workflow Output`;

                    // Build email payload
                    const emailPayload = {
                        to: emailTo,
                        subject: emailSubject,
                        html: config.htmlTemplate
                            ? config.htmlTemplate.replace('{{content}}', emailContent)
                            : `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                                 <h2 style="color: #333;">Workflow Complete</h2>
                                 <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
                                   ${emailContent}
                                 </div>
                                 <p style="color: #666; font-size: 12px; margin-top: 20px;">
                                   Generated by Axiom Engine
                                 </p>
                               </div>`,
                        text: emailContent.replace(/<[^>]*>/g, ''),
                    };

                    // Check for Resend API key or SMTP config
                    const resendApiKey = config.resendApiKey || process.env.RESEND_API_KEY;

                    if (resendApiKey) {
                        // Use Resend
                        const response = await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${resendApiKey}`,
                            },
                            body: JSON.stringify({
                                from: config.from || 'Axiom <noreply@axiom.engine>',
                                to: [emailTo],
                                subject: emailSubject,
                                html: emailPayload.html,
                                text: emailPayload.text,
                            }),
                        });

                        const result = await response.json() as { id?: string; error?: string };
                        actionResult = {
                            action: 'email_sent',
                            to: emailTo,
                            subject: emailSubject,
                            provider: 'resend',
                            success: response.ok,
                            messageId: result.id,
                            error: result.error,
                        };
                        console.log(`📧 Email sent to ${emailTo} via Resend`);
                    } else {
                        // Queue email for later sending
                        actionResult = {
                            action: 'email_queued',
                            to: emailTo,
                            subject: emailSubject,
                            payload: emailPayload,
                            success: false,
                            error: 'No email service configured (set RESEND_API_KEY)',
                        };
                    }
                    break;
                }

                // =====================================================
                // ANALYTICS OUTPUT - Log event to analytics table
                // =====================================================
                case 'output-analytics': {
                    const eventName = config.eventName || 'workflow_completed';
                    const eventData = {
                        event_name: eventName,
                        execution_id: pipelineData.executionUser.executionId,
                        user_id: pipelineData.executionUser.userId,
                        org_id: pipelineData.executionUser.orgId,
                        properties: {
                            tokenUsage: pipelineData.tokenUsage,
                            nodesExecuted: Object.keys(pipelineData.nodeOutputs).length,
                            duration: config.durationMs,
                            contentLength: typeof content === 'string' ? content.length : 0,
                            ...config.customProperties,
                        },
                        timestamp: new Date().toISOString(),
                    };

                    if (this.supabase) {
                        const { error } = await this.supabase
                            .from('analytics_events')
                            .insert({
                                event_name: eventData.event_name,
                                execution_id: eventData.execution_id,
                                user_id: eventData.user_id,
                                org_id: eventData.org_id,
                                properties: eventData.properties,
                                created_at: eventData.timestamp,
                            });

                        if (error) throw error;

                        actionResult = {
                            action: 'analytics_logged',
                            eventName: eventName,
                            success: true,
                        };
                        console.log(`📊 Analytics event logged: ${eventName}`);
                    } else {
                        actionResult = {
                            action: 'analytics_queued',
                            eventData,
                            success: false,
                            error: 'No database connection',
                        };
                    }
                    break;
                }

                // =====================================================
                // EXPORT OUTPUT - Generate downloadable file
                // =====================================================
                case 'output-export': {
                    const format = config.format || 'json';
                    const filename = config.filename || `output_${Date.now()}`;

                    let exportContent: string;
                    let mimeType: string;

                    switch (format) {
                        case 'json':
                            exportContent = JSON.stringify(aggregatedOutput, null, 2);
                            mimeType = 'application/json';
                            break;
                        case 'markdown':
                        case 'md':
                            exportContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
                            mimeType = 'text/markdown';
                            break;
                        case 'html':
                            exportContent = typeof content === 'string' ? content : `<pre>${JSON.stringify(content, null, 2)}</pre>`;
                            mimeType = 'text/html';
                            break;
                        case 'csv':
                            exportContent = this.convertToCSV(aggregatedOutput);
                            mimeType = 'text/csv';
                            break;
                        default:
                            exportContent = String(content);
                            mimeType = 'text/plain';
                    }

                    actionResult = {
                        action: 'export_generated',
                        format,
                        filename: `${filename}.${format}`,
                        mimeType,
                        content: exportContent,
                        size: exportContent.length,
                        success: true,
                    };
                    console.log(`📁 Export generated: ${filename}.${format} (${exportContent.length} bytes)`);
                    break;
                }

                // =====================================================
                // SCHEDULE OUTPUT - Queue for future delivery
                // =====================================================
                case 'output-schedule': {
                    const scheduleAt = config.scheduleAt || config.deliverAt;
                    const targetOutput = config.targetOutputType || 'output-email';

                    actionResult = {
                        action: 'scheduled',
                        scheduleAt,
                        targetOutputType: targetOutput,
                        payload: aggregatedOutput,
                        success: true,
                        note: 'Scheduled output requires queue processor',
                    };
                    console.log(`⏰ Output scheduled for: ${scheduleAt}`);
                    break;
                }

                default:
                    // Default: just return aggregated output
                    actionResult = {
                        action: 'passthrough',
                        success: true,
                    };
            }
        } catch (error: any) {
            console.error(`❌ Output node error: ${error.message}`);
            actionResult = {
                action: 'error',
                error: error.message,
                success: false,
            };
        }

        return {
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: nodeType,
            type: 'output',
            content: {
                finalOutput: content,
                outputType: nodeType,
                actionResult,
                metadata: {
                    totalTokens: pipelineData.tokenUsage.totalTokens,
                    totalCost: pipelineData.tokenUsage.totalCost,
                    nodesExecuted: Object.keys(pipelineData.nodeOutputs).length,
                },
            },
        };
    }

    /**
     * Build custom payload from template
     */
    private buildCustomPayload(template: Record<string, any>, data: Record<string, any>): Record<string, any> {
        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(template)) {
            if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
                const path = value.slice(2, -2).trim();
                result[key] = this.getNestedValue(data, path);
            } else if (typeof value === 'object' && value !== null) {
                result[key] = this.buildCustomPayload(value, data);
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    /**
     * Get nested value from object by path
     */
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((acc, part) => acc?.[part], obj);
    }

    /**
     * Convert object to CSV
     */
    private convertToCSV(data: Record<string, any>): string {
        // Flatten object and convert to CSV
        const flatten = (obj: any, prefix = ''): Record<string, string> => {
            const result: Record<string, string> = {};
            for (const [key, value] of Object.entries(obj)) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    Object.assign(result, flatten(value, newKey));
                } else {
                    result[newKey] = String(value);
                }
            }
            return result;
        };

        const flattened = flatten(data);
        const headers = Object.keys(flattened).join(',');
        const values = Object.values(flattened).map(v => `"${v.replace(/"/g, '""')}"`).join(',');
        return `${headers}\n${values}`;
    }

    // ========================================================================
    // PROMPT BUILDERS (Professional, Production-Grade)
    // ========================================================================

    /**
     * Get the writer persona system prompt based on writer_style selection
     */
    private getWriterPersonaPrompt(writerStyle: string): string {
        const personas: Record<string, string> = {
            'Dan Kennedy (No B.S. Direct Response)': `You are the AI embodiment of Dan Kennedy, the "Millionaire Maker."

YOUR CORE IDENTITY:
- Gruff, direct, and unapologetic. You care about RESULTS, not feelings.
- You despise "brand awareness" and "getting your name out there." You care about LEADS and SALES.
- You are the authority. You are the prize.

YOUR WRITING STYLE:
1. Use ALL CAPS for emphasis on key words.
2. Use ellipsis... to keep the reader moving fast.
3. Create a sharp divide between the "smart few" (readers) and the "ignorant herd."
4. Agitate the pain HARD before offering the cure.
5. Include multiple P.S. sections with urgency.

MANDATORY ELEMENTS:
- Start with a warning or qualification.
- Include a bold guarantee.
- Use micro-commitments (questions that force "Yes" nods).
- End with scarcity and urgency.`,

            'Frank Kern (Conversational NLP)': `You are the AI embodiment of Frank Kern, "The Guru's Guru."

YOUR CORE IDENTITY:
- Laid back, conversational, like you're emailing a friend from a surf shop.
- You use NLP patterns: embedded commands, future pacing, open loops.
- You're the "Cool Cousin" - relatable but quietly successful.

YOUR WRITING STYLE:
1. Ultra-conversational: "Hey," "So check this out," "Here's the deal."
2. Use sentence fragments. Short paragraphs.
3. Tell "Reluctant Hero" stories.
4. Create a common enemy (the "Old Way," "Fake Gurus").
5. Use future pacing: "Imagine waking up and..."

PSYCHOLOGICAL TRIGGERS:
- Confession: Admit a flaw to build trust.
- Isolation: "This isn't for everyone."
- State Induction: Put them in a feeling of success BEFORE the ask.`,

            'Gary Halbert (Raw Emotional Storytelling)': `You are the AI embodiment of Gary Halbert, the Prince of Print.

YOUR CORE IDENTITY:
- Visceral, raw, emotional. You write to the "lizard brain."
- You believe in "A-Pile" vs "B-Pile" - your content must look PERSONAL, not like an ad.
- You write like your life depends on this converting.

YOUR WRITING STYLE:
1. Visual Imagery: Don't say "fast" - say "screams down the highway like a bat out of hell."
2. Simple words. Short sentences. 10-year-old reading level.
3. Use the "If... Then..." close.
4. Share intimate details to create bonding.
5. ALWAYS include a P.S.

THE HALBERT FORMULA:
- Hook: A headline that stops traffic.
- Fact: A startling statistic.
- Story: How you discovered the secret.
- Offer: Irresistible, risk-free.
- Urgency: Act within 24 hours.`,

            'Eugene Schwartz (Mechanism-Focused)': `You are the AI embodiment of Eugene Schwartz, author of "Breakthrough Advertising."

YOUR CORE PHILOSOPHY:
- You cannot create desire; you can only CHANNEL existing desire.
- Write based on the Stage of Awareness (Unaware → Most Aware).
- Focus on the "Unique Mechanism" - the reason WHY the product works.

YOUR WRITING STYLE:
1. Headlines that resonate with hidden desires or fears.
2. Sell the MECHANISM, not the product.
3. Gradualization: Start with agreed truths, lead logically to the sale.
4. Validate their failures: "It's not your fault..."

MANDATORY STRUCTURE:
- Identify awareness level first.
- Unaware: Start with a story.
- Problem Aware: Start with pain.
- Solution Aware: Start with mechanism.
- Product Aware: Start with the deal.`,

            'David Ogilvy (Fact-Based Elegance)': `You are the AI embodiment of David Ogilvy, the Father of Advertising.

YOUR CORE IDENTITY:
- A gentleman. Impeccably dressed, well-read, respectful.
- "It is not creative unless it sells."
- "The consumer is not a moron; she is your wife."

YOUR WRITING STYLE:
1. Fact-packed: Dense with specific facts, figures, details.
2. Headlines that promise a benefit or deliver news.
3. Editorial tone: Reads like journalism, not advertising.
4. Include captions for any images.
5. Focus on "The Big Idea."

MANDATORY ELEMENTS:
- Never say "efficient" - say "30 miles per gallon."
- Every ad is a long-term brand investment.
- 80% of impact is in the headline. Spend time there.`,

            'Joseph Sugarman (Slippery Slope)': `You are the AI embodiment of Joe Sugarman, master of the "Slippery Slope."

YOUR CORE STRATEGY:
- Headline's job: Get them to read the subheadline.
- Subheadline's job: Get them to read sentence one.
- Sentence one's job: Get them to read sentence two.
- Once they slide, they cannot stop until they buy.

YOUR WRITING STYLE:
1. First sentence is SHORT and compelling. "It was a disaster."
2. Weave the product into a story of discovery.
3. Use Curiosity to create open loops.
4. Justify with logic AFTER selling on emotion.
5. Deliberately admit a flaw to build trust.`,

            'Claude Hopkins (Scientific Advertising)': `You are the AI embodiment of Claude Hopkins, pioneer of Scientific Advertising.

YOUR PHILOSOPHY:
- "Advertising is salesmanship in print."
- No humor. No fine writing. Only sales.
- Offer SERVICE, not a plea to buy.

YOUR STRATEGY (PRE-EMPTIVE ADVANTAGE):
- Claim a standard industry feature as if unique (e.g., "Steam cleaned bottles").
- Specificity: "99.44% pure," not "very pure."
- Always offer a sample or trial.

TONE:
- Serious, sincere, simple.
- You are a humble servant offering a solution.
- "The more you tell, the more you sell."`,

            'Russell Brunson (Story Selling)': `You are the AI embodiment of Russell Brunson, founder of ClickFunnels.

YOUR CORE FRAMEWORKS:
- The "Epiphany Bridge": Tell stories that create belief.
- The "Hook, Story, Offer" structure.
- The "Value Ladder": Start free, ascend to premium.

YOUR WRITING STYLE:
1. Start every piece with a hook that creates curiosity.
2. Tell your "Origin Story" or "Epiphany" story.
3. Use "Attractive Character" elements: backstory, parables, flaws.
4. Stack value until the offer is irresistible.
5. Include testimonials as mini-stories.`,

            'Alex Hormozi (Value Stacking)': `You are the AI embodiment of Alex Hormozi, author of "$100M Offers."

YOUR CORE PHILOSOPHY:
- Make offers so good, people feel stupid saying no.
- Price-to-value ratio is everything.
- Stack value until the ROI is undeniable.

YOUR WRITING STYLE:
1. Lead with the DREAM OUTCOME.
2. Stack bonuses visually. "You get X ($997 value), Y ($497 value)..."
3. Reduce perceived effort and time delay.
4. Remove all risk with a bold guarantee.
5. Use the "Grand Slam Offer" formula.

LANGUAGE:
- Direct, no-bullshit, bro-ish but professional.
- Use numbers and specifics obsessively.`,

            'Modern Expert (Balanced Best Practices)': `You are an elite Direct Response Copywriter blending classic and modern techniques.

YOUR APPROACH:
- Hook: Arrest attention immediately.
- Lead: Establish credibility and relevance.
- Body: Build desire with bullets and proof.
- Offer: Stack value, remove risk.
- CTA: Clear and directive.

YOUR STYLE:
- Conversational but authoritative.
- Use short paragraphs and bullet points.
- Tap into core desires: Status, Wealth, Health, Love.
- Focus on benefits, not features.

"You are not writing words; you are architecting a decision."`
        };

        return personas[writerStyle] || personas['Modern Expert (Balanced Best Practices)'];
    }

    /**
     * Build the main content generation prompt
     */
    private buildGenerationPrompt(pipelineData: PipelineData, config: any): string {
        const input = pipelineData.userInput;
        const previousContent = pipelineData.lastNodeOutput?.content;

        // Extract key variables from input
        const {
            campaign_goal = 'Lead Generation',
            customer_name = '',
            target_audience = 'Small Business Owners',
            industry_niche = 'General',
            customer_pain_points = '',
            customer_desires = '',
            product_service_name = 'Our Product',
            product_description = '',
            unique_mechanism = '',
            offer_price = '',
            offer_deadline = '',
            guarantee = '',
            call_to_action = 'Click here to learn more',
            content_tone = 'Professional & Authoritative',
            content_format = 'Email Sequence (3-5 emails)',
            word_count_target = 'Medium (300-600 words)',
            customer_profile_kb = '',
            brand_voice_guidelines = '',
            existing_assets = '',
        } = input;

        return `
==============================================================================
CONTENT GENERATION BRIEF
==============================================================================

CAMPAIGN GOAL: ${campaign_goal}
CONTENT FORMAT: ${content_format}
TARGET LENGTH: ${word_count_target}
CONTENT TONE: ${content_tone}

------------------------------------------------------------------------------
TARGET AUDIENCE
------------------------------------------------------------------------------
Audience Segment: ${target_audience}
Industry/Niche: ${industry_niche}
${customer_name ? `Customer Name: ${customer_name}` : ''}

PAIN POINTS (Agitate these):
${customer_pain_points || 'Not specified'}

DESIRES (Promise these):
${customer_desires || 'Not specified'}

${customer_profile_kb ? `
CUSTOMER PROFILE DATA:
${customer_profile_kb}
` : ''}

------------------------------------------------------------------------------
PRODUCT/OFFER
------------------------------------------------------------------------------
Product Name: ${product_service_name}

Description:
${product_description || 'Not specified'}

${unique_mechanism ? `
UNIQUE MECHANISM (Why it works):
${unique_mechanism}
` : ''}

${offer_price ? `Price: ${offer_price}` : ''}
${offer_deadline ? `Deadline/Scarcity: ${offer_deadline}` : ''}
${guarantee ? `Guarantee: ${guarantee}` : ''}

CALL TO ACTION: ${call_to_action}

${existing_assets ? `
------------------------------------------------------------------------------
PROOF ELEMENTS / SWIPE FILE
------------------------------------------------------------------------------
${existing_assets}
` : ''}

${brand_voice_guidelines ? `
------------------------------------------------------------------------------
BRAND VOICE RULES
------------------------------------------------------------------------------
${brand_voice_guidelines}
` : ''}

${previousContent ? `
------------------------------------------------------------------------------
PREVIOUS NODE OUTPUT (Build on this):
------------------------------------------------------------------------------
${typeof previousContent === 'string' ? previousContent.substring(0, 2000) : JSON.stringify(previousContent).substring(0, 2000)}
` : ''}

==============================================================================
YOUR TASK
==============================================================================
Generate high-converting ${content_format} content following the writer persona instructions provided in the system prompt.

Requirements:
1. Match the specified tone: ${content_tone}
2. Stay within the target length: ${word_count_target}
3. Agitate the pain points before presenting the solution
4. Highlight the unique mechanism if provided
5. Include the call to action: ${call_to_action}
6. Create urgency with the deadline if provided

DO NOT include meta-commentary. DO NOT explain what you're doing.
Just write the content as if it's ready to be sent.
`;
    }

    /**
     * Build intent analysis prompt
     */
    private buildIntentAnalysisPrompt(pipelineData: PipelineData): string {
        const input = pipelineData.userInput;

        return `
==============================================================================
INTENT ANALYSIS REQUEST
==============================================================================

Analyze the following campaign input and extract key insights:

INPUT DATA:
${JSON.stringify(input, null, 2)}

------------------------------------------------------------------------------
PROVIDE THE FOLLOWING ANALYSIS:
------------------------------------------------------------------------------

1. PRIMARY INTENT
   What is the main goal of this campaign?

2. AUDIENCE PSYCHOGRAPHICS
   Based on the target audience and pain points, what are their:
   - Core fears?
   - Deep desires?
   - Current beliefs that might block the sale?

3. EMOTIONAL TRIGGERS TO USE
   Which psychological triggers will be most effective?
   (Urgency, Social Proof, Authority, Scarcity, Fear of Missing Out, etc.)

4. OBJECTION FORECAST
   What objections will this audience likely have?
   How should we preemptively address them?

5. RECOMMENDED ANGLE
   What is the strongest angle for this campaign?
   What is the "Big Idea" that ties everything together?

6. CONTENT SEQUENCE RECOMMENDATION
   For the selected content format, what should each piece focus on?

Return your analysis in a structured format that can inform subsequent generation nodes.
`;
    }

    /**
     * Build constitution/validation prompt (LEGACY - for process nodes)
     * Now uses KB guardrails/brand rules as the Constitution
     */
    private buildConstitutionValidationPrompt(pipelineData: PipelineData, config: any): string {
        const content = pipelineData.lastNodeOutput?.content;
        const input = pipelineData.userInput;
        const kb = pipelineData.kb as any;

        // Build comprehensive rules from KB (THE constitution)
        const allRules: string[] = [];

        // 1. KB Guardrails
        if (kb?.guardrails?.paused_patterns && Array.isArray(kb.guardrails.paused_patterns)) {
            kb.guardrails.paused_patterns.forEach((pattern: any) => {
                const patternStr = typeof pattern === 'string' ? pattern : pattern.pattern;
                allRules.push(`BLOCKED: Do not include "${patternStr}"`);
            });
        }

        // 2. KB Brand compliance
        if (kb?.brand?.compliance && Array.isArray(kb.brand.compliance)) {
            allRules.push(...kb.brand.compliance);
        }

        // 3. KB Brand voice rules
        if (kb?.brand?.voice_rules && Array.isArray(kb.brand.voice_rules)) {
            allRules.push(...kb.brand.voice_rules);
        }

        // 4. Config rules (fallback)
        if (config.rules && Array.isArray(config.rules)) {
            allRules.push(...config.rules);
        }

        // Format rules or use defaults
        const rulesSection = allRules.length > 0
            ? allRules.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')
            : `
1. Content matches the specified tone: ${input.content_tone || 'Professional'}
2. Content addresses the target audience: ${input.target_audience || 'General'}
3. Pain points are properly agitated
4. Product/service benefits are clearly communicated
5. Call to action is present and clear: ${input.call_to_action || 'Not specified'}
6. No grammatical errors or typos
7. No placeholder text or incomplete sections
8. Brand voice guidelines followed: ${input.brand_voice_guidelines || 'Standard'}
9. Content length is appropriate for format: ${input.content_format || 'General'}
10. Urgency/scarcity elements included if deadline provided: ${input.offer_deadline || 'None'}
`;

        return `
==============================================================================
CONTENT VALIDATION & QUALITY CHECK
==============================================================================

CONSTITUTION SOURCE: ${kb?.brand?.brand_name_exact || 'Default'} KB
RULES ACTIVE: ${allRules.length}

CONTENT TO VALIDATE:
------------------------------------------------------------------------------
${typeof content === 'string' ? content : JSON.stringify(content)}
------------------------------------------------------------------------------

VALIDATION CRITERIA:
${rulesSection}

COMPETITORS/TOPICS TO AVOID:
${input.competitors_to_avoid || 'None specified'}

------------------------------------------------------------------------------
YOUR TASK
------------------------------------------------------------------------------
Evaluate the content against ALL criteria above.

Return a JSON object with:
{
    "score": <number 0-100>,
    "passed": <boolean>,
    "violations": [
        {"rule": "<rule description>", "issue": "<specific problem>", "suggestion": "<how to fix>"}
    ],
    "strengths": ["<what's working well>"],
    "improvements": ["<specific suggestions for improvement>"],
    "readability_score": <number>,
    "word_count": <number>
}
`;
    }

    /**
     * Build web/research prompt
     */
    private buildWebSearchPrompt(pipelineData: PipelineData): string {
        const input = pipelineData.userInput;

        return `
==============================================================================
RESEARCH REQUEST
==============================================================================

CAMPAIGN CONTEXT:
- Industry: ${input.industry_niche || 'General'}
- Audience: ${input.target_audience || 'General'}
- Product: ${input.product_service_name || 'Not specified'}

RESEARCH TOPIC:
${input.research_query || input.topic || pipelineData.lastNodeOutput?.content || 'General industry research'}

------------------------------------------------------------------------------
PROVIDE THE FOLLOWING:
------------------------------------------------------------------------------

1. INDUSTRY STATISTICS
   Relevant, recent statistics that can be used in the copy.

2. COMPETITOR LANDSCAPE
   What are competitors saying? What angles are overused?

3. TRENDING TOPICS
   What's currently trending in this niche?

4. PAIN POINT VALIDATION
   Evidence that the stated pain points are real and significant.

5. SUCCESS STORIES
   Examples of similar products/services solving this problem.

6. OBJECTION RESEARCH
   Common objections people have to this type of offer.

Provide citations and sources where possible.
`;
    }

    /**
     * Build SEO optimization prompt
     */
    private buildSEOPrompt(pipelineData: PipelineData): string {
        const content = pipelineData.lastNodeOutput?.content;
        const input = pipelineData.userInput;

        return `
==============================================================================
SEO OPTIMIZATION REQUEST
==============================================================================

CONTENT TO OPTIMIZE:
------------------------------------------------------------------------------
${typeof content === 'string' ? content : JSON.stringify(content)}
------------------------------------------------------------------------------

CONTEXT:
- Industry: ${input.industry_niche || 'General'}
- Target Audience: ${input.target_audience || 'General'}
- Primary Keyword: ${input.primary_keyword || 'Not specified'}

------------------------------------------------------------------------------
PROVIDE THE FOLLOWING:
------------------------------------------------------------------------------

1. OPTIMIZED TITLE TAG (50-60 characters)
   Include primary keyword, make it compelling.

2. META DESCRIPTION (150-160 characters)
   Include keyword, include CTA, make it click-worthy.

3. H1 RECOMMENDATION
   Single, powerful H1 with keyword.

4. H2/H3 STRUCTURE
   Recommended heading hierarchy.

5. KEYWORD INTEGRATION
   Where to naturally place keywords without stuffing.

6. INTERNAL LINKING OPPORTUNITIES
   Suggested anchor texts for internal links.

7. READABILITY IMPROVEMENTS
   Suggestions for better scanning (bullets, short paragraphs, etc.)

8. SCHEMA MARKUP RECOMMENDATION
   What structured data could enhance this content?
`;
    }

    // ========================================================================
    // CHECKPOINT & RESUME
    // ========================================================================

    private async saveCheckpointToDatabase(
        executionId: string,
        failedNodeId: string,
        pipelineData: PipelineData,
        errorMessage: string
    ): Promise<void> {
        if (!this.supabase) return;

        try {
            const { error } = await this.supabase
                .from('engine_run_logs')
                .update({
                    execution_data: {
                        checkpoint: true,
                        failedNodeId,
                        nodeOutputs: pipelineData.nodeOutputs,
                        tokenUsage: pipelineData.tokenUsage,
                        userInput: pipelineData.userInput
                    },
                    status: 'failed',
                    error_message: errorMessage
                })
                .eq('id', executionId);

            if (error) throw error;

            console.log(`💾 Checkpoint saved for execution ${executionId}`);
        } catch (error) {
            console.error('Failed to save checkpoint:', error);
        }
    }

    /**
     * Stop a running workflow
     */
    stopWorkflow(executionId: string): void {
        stateManager.stopWorkflow(executionId);
        console.log(`🛑 Workflow stop requested: ${executionId}`);
    }

    /**
     * Pause a running workflow
     */
    pauseWorkflow(executionId: string): void {
        stateManager.pauseWorkflow(executionId);
        console.log(`⏸️ Workflow pause requested: ${executionId}`);
    }

    /**
     * Resume a failed workflow from its DB checkpoint.
     * Loads the checkpoint data (nodeOutputs, tokenUsage, failedNodeId),
     * restores pipeline state, and re-executes from the failed node onward.
     */
    async resumeFromCheckpoint(
        executionId: string,
        nodes: WorkflowNode[],
        edges: WorkflowEdge[],
        progressCallback: ProgressCallback | null,
        executionUser: ExecutionContext,
        options: ExecutionOptions = {}
    ): Promise<ExecutionResult> {
        if (!this.supabase) {
            throw new Error('Cannot resume: no Supabase client');
        }

        const { data: runLog, error } = await this.supabase
            .from('engine_run_logs')
            .select('execution_data, input_data, status')
            .eq('id', executionId)
            .single();

        if (error || !runLog) {
            throw new Error(`Cannot resume: execution ${executionId} not found`);
        }

        const checkpoint = (runLog as any).execution_data;
        if (!checkpoint?.checkpoint || !checkpoint.failedNodeId) {
            throw new Error('Cannot resume: no valid checkpoint found for this execution');
        }

        console.log(`🔄 Resuming execution ${executionId} from node ${checkpoint.failedNodeId}`);

        // Restore initial input from checkpoint
        const initialInput = checkpoint.userInput || (runLog as any).input_data || {};

        // Build execution order
        const executionOrder = this.buildExecutionOrder(nodes, edges);

        // Find index of failed node
        const failedIdx = executionOrder.findIndex(n => n.id === checkpoint.failedNodeId);
        if (failedIdx === -1) {
            throw new Error(`Cannot resume: failed node ${checkpoint.failedNodeId} not found in execution order`);
        }

        // Load KB/config if engine
        let kb: Record<string, any> | null = options.preloadedKb || null;
        let engineConfig: Record<string, any> | null = options.preloadedConfig || null;
        let constitution: Record<string, any> | null = null;

        if (options.engineId && !kb) {
            const engineData = await this.loadEngineData(options.engineId);
            kb = engineData.kb;
            engineConfig = engineData.config;
            constitution = engineData.constitution;
        }

        // Rebuild pipeline state from checkpoint
        const pipelineData: PipelineData = {
            userInput: initialInput,
            nodeOutputs: checkpoint.nodeOutputs || {},
            lastNodeOutput: null,
            executionUser,
            kb,
            engineConfig,
            constitution,
            tokenUsage: checkpoint.tokenUsage || { totalTokens: 0, totalCost: 0, totalWords: 0 },
            tokenLedger: [],
        };

        // Find last content node output
        const outputValues = Object.values(pipelineData.nodeOutputs) as NodeOutput[];
        const lastContentNode = outputValues
            .filter(o => ['ai_generation', 'output', 'generator', 'resolver', 'transform'].includes(o.type))
            .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
            .pop();
        if (lastContentNode) {
            pipelineData.lastNodeOutput = lastContentNode;
        }

        // Update DB status
        await this.supabase
            .from('engine_run_logs')
            .update({ status: 'running', error_message: null })
            .eq('id', executionId);

        stateManager.updateState(executionId, { status: 'running' });

        const startTime = Date.now();

        try {
            // Resume from the failed node
            for (let i = failedIdx; i < executionOrder.length; i++) {
                const node = executionOrder[i];

                if (stateManager.isWorkflowStopped(executionId)) {
                    return {
                        success: false, executionId,
                        nodeOutputs: pipelineData.nodeOutputs,
                        lastNodeOutput: pipelineData.lastNodeOutput,
                        tokenUsage: pipelineData.tokenUsage,
                        tokenLedger: pipelineData.tokenLedger,
                        durationMs: Date.now() - startTime,
                        error: 'Workflow stopped by user',
                    };
                }

                const progress = Math.round(((i + 0.5) / executionOrder.length) * 100);
                if (progressCallback) {
                    progressCallback({
                        nodeId: node.id, nodeName: node.data.label, nodeType: node.data.nodeType,
                        progress, status: 'running', nodeIndex: i, totalNodes: executionOrder.length,
                    });
                }

                console.log(`▶️ [Resume] Executing node ${i + 1}/${executionOrder.length}: ${node.data.label}`);

                const nodeOutput = await this.executeNode(node, pipelineData, executionId);

                pipelineData.nodeOutputs[node.id] = {
                    ...nodeOutput, sequenceNumber: i + 1, executedAt: new Date().toISOString(),
                };

                if (['ai_generation', 'output', 'generator', 'resolver', 'transform', 'kb_retrieval'].includes(nodeOutput.type)) {
                    pipelineData.lastNodeOutput = pipelineData.nodeOutputs[node.id];
                }

                if (nodeOutput.type === 'condition' && nodeOutput.content?.shouldContinue === false) {
                    console.log(`⏭️ Condition halted pipeline during resume`);
                    break;
                }

                if (nodeOutput.aiMetadata) {
                    pipelineData.tokenUsage.totalTokens += nodeOutput.aiMetadata.tokens;
                    pipelineData.tokenUsage.totalCost += nodeOutput.aiMetadata.cost;
                    pipelineData.tokenLedger.push({
                        nodeId: node.id, nodeName: node.data.label,
                        tokens: nodeOutput.aiMetadata.tokens, cost: nodeOutput.aiMetadata.cost,
                        provider: nodeOutput.aiMetadata.provider, timestamp: new Date().toISOString(),
                    });
                }

                stateManager.createCheckpoint(executionId, node.id, {
                    nodeOutputs: pipelineData.nodeOutputs, tokenUsage: pipelineData.tokenUsage,
                });
            }

            console.log(`🎉 Resume completed: ${executionId}`);

            return {
                success: true, executionId,
                nodeOutputs: pipelineData.nodeOutputs,
                lastNodeOutput: pipelineData.lastNodeOutput,
                tokenUsage: pipelineData.tokenUsage,
                tokenLedger: pipelineData.tokenLedger,
                durationMs: Date.now() - startTime,
            };
        } catch (resumeError: any) {
            await this.saveCheckpointToDatabase(executionId, executionOrder[0]?.id || 'unknown', pipelineData, resumeError.message);
            throw resumeError;
        }
    }

    /**
     * Resume a paused workflow (in-memory state toggle)
     */
    resumeWorkflow(executionId: string): void {
        stateManager.resumeWorkflow(executionId);
        console.log(`▶️ Workflow resume requested: ${executionId}`);
    }

    /**
     * Get execution state
     */
    getExecutionState(executionId: string): any {
        return stateManager.getState(executionId);
    }
}

// Export singleton instance
export const workflowExecutionService = new WorkflowExecutionService();

// Initialize with Supabase client — fail hard if env vars are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
        '❌ [WorkflowExecutionProcessor] FATAL: Missing required env vars.\n' +
        `  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL: ${supabaseUrl ? '✓' : '✗ MISSING'}\n` +
        `  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✓' : '✗ MISSING'}\n` +
        'Worker will start but all DB operations will fail. Set env vars and restart.'
    )
} else {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    workflowExecutionService.initialize(supabase)
    console.log('✅ [WorkflowExecutionProcessor] Supabase client initialized')
}
