/**
 * WORKFLOW EXECUTION PROCESSOR
 * 
 * Processes workflow execution jobs from BullMQ queue.
 * This is the worker-side implementation of workflow execution.
 * 
 * Ported from: apps/backend/src/services/workflow/workflowExecutionService.ts
 * Changes:
 * - Removed Express dependency
 * - Job data comes from BullMQ instead of HTTP request
 * - Progress updates via job.updateProgress() 
 * - Results stored in Supabase
 */

import { Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowExecutionJob {
    workflowId: string;
    executionId: string;
    input: Record<string, any>;
    userId: string;
    orgId?: string;
    tier: 'hobby' | 'pro' | 'enterprise';
    options?: {
        engineId?: string;
        preloadedKb?: Record<string, any>;
        preloadedConfig?: Record<string, any>;
    };
}

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

export interface NodeOutput {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    type: string;
    content: any;
    aiMetadata?: {
        tokens: number;
        cost: number;
        provider: string;
        model: string;
        durationMs: number;
    };
    sequenceNumber?: number;
    executedAt?: string;
}

export interface TokenLedgerEntry {
    nodeId: string;
    nodeName: string;
    tokens: number;
    cost: number;
    provider?: string;
    timestamp: string;
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

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build execution order using topological sort
 */
function buildExecutionOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
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

    // Find start nodes (no incoming edges)
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
        if (degree === 0) {
            queue.push(nodeId);
        }
    }

    // Kahn's algorithm
    const executionOrder: WorkflowNode[] = [];
    while (queue.length > 0) {
        const current = queue.shift()!;
        const node = nodeMap.get(current);
        if (node) {
            executionOrder.push(node);
            for (const neighbor of adjacency.get(current) || []) {
                inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            }
        }
    }

    return executionOrder;
}

/**
 * Count words in content
 */
function countWords(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Execute a single node
 */
async function executeNode(
    node: WorkflowNode,
    pipelineData: {
        userInput: Record<string, any>;
        nodeOutputs: Record<string, NodeOutput>;
        kb: Record<string, any> | null;
        engineConfig: Record<string, any> | null;
    },
    job: Job<WorkflowExecutionJob>
): Promise<NodeOutput> {
    const nodeType = node.data?.nodeType || node.type || 'unknown';
    const nodeName = node.data?.label || node.id;
    const startTime = Date.now();

    console.log(`  ▶ Executing node: ${nodeName} (${nodeType})`);

    let content: any = null;
    let aiMetadata: NodeOutput['aiMetadata'] | undefined;

    try {
        switch (nodeType) {
            case 'trigger':
            case 'start':
                content = { triggered: true, timestamp: new Date().toISOString() };
                break;

            case 'input':
            case 'user_input':
                content = pipelineData.userInput;
                break;

            case 'ai_generation':
            case 'llm':
            case 'ai':
                // TODO: Integrate with AI service
                // For now, placeholder that acknowledges the node
                content = {
                    placeholder: true,
                    message: 'AI generation node - integrate with aiService',
                    config: node.data?.config,
                };
                aiMetadata = {
                    tokens: 0,
                    cost: 0,
                    provider: 'pending',
                    model: 'pending',
                    durationMs: Date.now() - startTime,
                };
                break;

            case 'output':
            case 'end':
                // Collect all previous outputs
                content = {
                    summary: Object.values(pipelineData.nodeOutputs).map(o => ({
                        node: o.nodeName,
                        content: o.content,
                    })),
                };
                break;

            case 'condition':
            case 'branch':
                // Evaluate condition (simplified)
                content = {
                    evaluated: true,
                    condition: node.data?.config?.condition,
                    result: true, // Default to true branch
                };
                break;

            case 'transform':
            case 'mapper':
                // Transform data (simplified)
                content = {
                    transformed: true,
                    input: pipelineData.nodeOutputs,
                    config: node.data?.config,
                };
                break;

            default:
                content = {
                    nodeType,
                    message: `Unhandled node type: ${nodeType}`,
                    config: node.data?.config,
                };
        }
    } catch (error: any) {
        console.error(`  ✗ Node ${nodeName} failed:`, error.message);
        throw error;
    }

    const durationMs = Date.now() - startTime;

    return {
        nodeId: node.id,
        nodeName,
        nodeType,
        type: nodeType,
        content,
        aiMetadata,
        executedAt: new Date().toISOString(),
    };
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

export async function processWorkflowExecution(job: Job<WorkflowExecutionJob>): Promise<ExecutionResult> {
    const { workflowId, executionId, input, userId, orgId, tier, options } = job.data;
    const startTime = Date.now();

    console.log(`\n🔧 ========================================`);
    console.log(`   WORKFLOW EXECUTION: ${executionId}`);
    console.log(`   Workflow: ${workflowId}`);
    console.log(`   User: ${userId} (${tier})`);
    console.log(`========================================\n`);

    // Update job progress
    await job.updateProgress({ status: 'starting', percentage: 0 });

    try {
        // 1. Fetch workflow from database
        const { data: workflow, error: fetchError } = await supabase
            .from('workflow_templates')
            .select('*')
            .eq('id', workflowId)
            .single();

        if (fetchError || !workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        const nodes: WorkflowNode[] = workflow.nodes || [];
        const edges: WorkflowEdge[] = workflow.edges || [];

        if (nodes.length === 0) {
            throw new Error('Workflow has no nodes');
        }

        console.log(`📊 Loaded workflow: ${workflow.name}`);
        console.log(`   Nodes: ${nodes.length}, Edges: ${edges.length}`);

        // 2. Build execution order
        const executionOrder = buildExecutionOrder(nodes, edges);
        console.log(`📋 Execution order: ${executionOrder.map(n => n.data?.label || n.id).join(' → ')}`);

        // 3. Initialize pipeline data
        const pipelineData = {
            userInput: input,
            nodeOutputs: {} as Record<string, NodeOutput>,
            kb: options?.preloadedKb || null,
            engineConfig: options?.preloadedConfig || null,
        };

        const tokenUsage = {
            totalTokens: 0,
            totalCost: 0,
            totalWords: 0,
        };
        const tokenLedger: TokenLedgerEntry[] = [];

        // 4. Execute nodes in order
        for (let i = 0; i < executionOrder.length; i++) {
            const node = executionOrder[i];
            const progress = Math.round(((i + 1) / executionOrder.length) * 100);

            await job.updateProgress({
                status: 'running',
                percentage: progress,
                currentNode: node.data?.label || node.id,
                nodeIndex: i,
                totalNodes: executionOrder.length,
            });

            const output = await executeNode(node, pipelineData, job);
            pipelineData.nodeOutputs[node.id] = output;

            // Track tokens if AI node
            if (output.aiMetadata) {
                tokenUsage.totalTokens += output.aiMetadata.tokens;
                tokenUsage.totalCost += output.aiMetadata.cost;
                tokenLedger.push({
                    nodeId: node.id,
                    nodeName: output.nodeName,
                    tokens: output.aiMetadata.tokens,
                    cost: output.aiMetadata.cost,
                    provider: output.aiMetadata.provider,
                    timestamp: output.executedAt || new Date().toISOString(),
                });
            }

            // Count words in content
            if (typeof output.content === 'string') {
                tokenUsage.totalWords += countWords(output.content);
            } else if (output.content?.text) {
                tokenUsage.totalWords += countWords(output.content.text);
            }

            console.log(`  ✓ Node ${i + 1}/${executionOrder.length}: ${output.nodeName}`);
        }

        // 5. Determine last output
        const lastNode = executionOrder[executionOrder.length - 1];
        const lastNodeOutput = pipelineData.nodeOutputs[lastNode.id] || null;

        // 6. Log execution to database
        const durationMs = Date.now() - startTime;

        const { error: logError } = await supabase
            .from('engine_run_logs')
            .insert({
                id: executionId,
                workflow_id: workflowId,
                engine_id: options?.engineId || null,
                user_id: userId,
                org_id: orgId || null,
                input,
                node_outputs: pipelineData.nodeOutputs,
                status: 'completed',
                total_tokens: tokenUsage.totalTokens,
                total_cost: tokenUsage.totalCost,
                total_words: tokenUsage.totalWords,
                duration_ms: durationMs,
                created_at: new Date().toISOString(),
            });

        if (logError) {
            console.warn('⚠️ Failed to log execution:', logError.message);
        }

        // 7. Build result
        const result: ExecutionResult = {
            success: true,
            executionId,
            nodeOutputs: pipelineData.nodeOutputs,
            lastNodeOutput,
            tokenUsage,
            tokenLedger,
            durationMs,
        };

        console.log(`\n✅ Workflow completed in ${durationMs}ms`);
        console.log(`   Nodes executed: ${executionOrder.length}`);
        console.log(`   Total tokens: ${tokenUsage.totalTokens}`);

        await job.updateProgress({ status: 'completed', percentage: 100 });

        return result;

    } catch (error: any) {
        const durationMs = Date.now() - startTime;

        console.error(`\n❌ Workflow failed: ${error.message}`);

        // Log failed execution
        await supabase
            .from('engine_run_logs')
            .insert({
                id: executionId,
                workflow_id: workflowId,
                engine_id: options?.engineId || null,
                user_id: userId,
                org_id: orgId || null,
                input,
                status: 'failed',
                error: error.message,
                duration_ms: durationMs,
                created_at: new Date().toISOString(),
            });

        await job.updateProgress({ status: 'failed', error: error.message });

        return {
            success: false,
            executionId,
            nodeOutputs: {},
            lastNodeOutput: null,
            tokenUsage: { totalTokens: 0, totalCost: 0, totalWords: 0 },
            tokenLedger: [],
            durationMs,
            error: error.message,
        };
    }
}
