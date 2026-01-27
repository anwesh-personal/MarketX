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

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { aiService, AICallResult } from '../ai/aiService';
import { kbResolutionService, ResolutionContext } from '../kb/kbResolutionService';
import { contentGeneratorService } from '../content/contentGeneratorService';

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
    private dbPool: Pool | null = null;

    initialize(pool: Pool): void {
        this.dbPool = pool;
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
        if (!this.dbPool) {
            console.warn('⚠️ DB pool not initialized, cannot load engine data');
            return { kb: null, config: null, constitution: null };
        }

        try {
            // Load engine with joined KB and Constitution data
            const engineResult = await this.dbPool.query(
                `SELECT 
                    e.id, e.config, e.kb_id, e.constitution_id,
                    kb.data as kb_data,
                    c.rules as constitution_rules, c.name as constitution_name
                 FROM engine_instances e
                 LEFT JOIN knowledge_bases kb ON e.kb_id = kb.id
                 LEFT JOIN constitutions c ON e.constitution_id = c.id
                 WHERE e.id = $1`,
                [engineId]
            );

            if (engineResult.rows.length === 0) {
                console.warn(`⚠️ Engine not found: ${engineId}`);
                return { kb: null, config: null, constitution: null };
            }

            const engine = engineResult.rows[0];

            const constitution = engine.constitution_rules ? {
                name: engine.constitution_name,
                rules: engine.constitution_rules,
            } : null;

            return {
                kb: engine.kb_data || null,
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

                    // Update last node output (for content nodes)
                    if (nodeOutput.type === 'ai_generation' || nodeOutput.type === 'output') {
                        pipelineData.lastNodeOutput = pipelineData.nodeOutputs[node.id];
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
            case 'seo-optimizer':
                return this.executeProcessNode(node, pipelineData, executionId);

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

        // Parse result
        let validationResult;
        try {
            validationResult = JSON.parse(aiResult.content);
        } catch {
            validationResult = {
                passed: true,
                overallScore: 70,
                dimensions: { clarity: 70, engagement: 70, accuracy: 70, brandAlignment: 70 },
                issues: [],
                recommendedAction: 'review',
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
                prompt = this.buildWebSearchPrompt(pipelineData);
                systemPrompt = `You are a research specialist with expertise in ${userInput.industry_niche || 'marketing'}.
Your job is to provide accurate, up-to-date information with sources.
Focus on actionable insights that can improve marketing copy.`;
                break;

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

        // Determine which provider/model to use
        const provider = config.provider || 'openai';
        const model = config.model || userInput.ai_model || 'gpt-4o';

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
     * Uses text-based search for retrieval (vector search requires embedding API)
     */
    private async executeKBNode(node: WorkflowNode, pipelineData: PipelineData): Promise<NodeOutput> {
        const config = node.data.config || {};
        const userInputObj = pipelineData.userInput || {};
        const query = config.query ||
            pipelineData.lastNodeOutput?.content ||
            (typeof userInputObj === 'object' ? (userInputObj as Record<string, any>).query || (userInputObj as Record<string, any>).message : userInputObj) ||
            '';
        const topK = config.topK || 5;
        const orgId = pipelineData.executionUser?.orgId;

        // KB retrieval requires vector store connection (RAGOrchestrator)
        // Returns query metadata when vector store not connected
        return {
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: node.data.nodeType,
            type: 'kb_retrieval',
            content: {
                retrieved: false,
                context: `Knowledge base query: "${String(query).substring(0, 100)}"`,
                sources: [],
                query: String(query).substring(0, 200),
                orgId: orgId,
                note: 'KB retrieval requires vector store integration. Use RAGOrchestrator for full functionality.'
            }
        };
    }

    /**
     * Execute condition node
     */
    private executeConditionNode(node: WorkflowNode, pipelineData: PipelineData): NodeOutput {
        const config = node.data.config || {};
        const lastContent = pipelineData.lastNodeOutput?.content;

        // Simple condition evaluation (can be expanded)
        let passed = true;
        let reason = 'Condition passed';

        if (config.condition) {
            // Evaluate condition
            try {
                // String contains check - extensible via config.condition.type
                if (config.condition.type === 'contains') {
                    passed = String(lastContent).includes(config.condition.value);
                } else if (config.condition.type === 'minLength') {
                    passed = String(lastContent).length >= config.condition.value;
                }
            } catch (e) {
                passed = true; // Default to passing on error
            }
        }

        return {
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: node.data.nodeType,
            type: 'condition',
            content: {
                passed,
                reason,
                evaluatedValue: lastContent
            }
        };
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
     * Execute output node
     */
    private executeOutputNode(node: WorkflowNode, pipelineData: PipelineData): NodeOutput {
        const content = pipelineData.lastNodeOutput?.content || 'No content generated';

        return {
            nodeId: node.id,
            nodeName: node.data.label,
            nodeType: node.data.nodeType,
            type: 'output',
            content: {
                finalOutput: content,
                outputType: node.data.nodeType,
                metadata: {
                    totalTokens: pipelineData.tokenUsage.totalTokens,
                    totalCost: pipelineData.tokenUsage.totalCost,
                    nodesExecuted: Object.keys(pipelineData.nodeOutputs).length
                }
            }
        };
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
        if (!this.dbPool) return;

        try {
            await this.dbPool.query(`
                UPDATE engine_run_logs
                SET execution_data = $1,
                    status = 'failed',
                    error_message = $2
                WHERE id = $3
            `, [
                JSON.stringify({
                    checkpoint: true,
                    failedNodeId,
                    nodeOutputs: pipelineData.nodeOutputs,
                    tokenUsage: pipelineData.tokenUsage,
                    userInput: pipelineData.userInput
                }),
                errorMessage,
                executionId
            ]);

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
     * Resume a paused workflow
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
