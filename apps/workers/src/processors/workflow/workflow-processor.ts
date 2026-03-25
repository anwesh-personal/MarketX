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
import { getSupabaseConfig } from '../../config/supabase';
import { aiService, AICallResult } from '../../utils/ai-service';

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

const { url: supabaseUrl, serviceKey: supabaseServiceKey } = getSupabaseConfig();
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
            case 'ai': {
                // Build prompt from node config
                const config = node.data?.config || {};
                const promptTemplate = config.prompt || config.promptTemplate || '';
                const systemPrompt = config.systemPrompt || '';
                const provider = config.provider || 'openai';
                const model = config.model;
                const temperature = config.temperature;
                const maxTokens = config.maxTokens;

                // Resolve variables in prompt template
                let resolvedPrompt = promptTemplate;

                // Replace {{input}} with user input
                if (pipelineData.userInput) {
                    for (const [key, value] of Object.entries(pipelineData.userInput)) {
                        const placeholder = new RegExp(`\\{\\{\\s*input\\.${key}\\s*\\}\\}`, 'g');
                        resolvedPrompt = resolvedPrompt.replace(placeholder, String(value));
                    }
                    resolvedPrompt = resolvedPrompt.replace(/\{\{\s*input\s*\}\}/g, JSON.stringify(pipelineData.userInput));
                }

                // Replace {{previousOutput}} or {{nodeOutputs}}
                if (Object.keys(pipelineData.nodeOutputs).length > 0) {
                    const lastOutput = Object.values(pipelineData.nodeOutputs).pop();
                    resolvedPrompt = resolvedPrompt.replace(
                        /\{\{\s*previousOutput\s*\}\}/g,
                        JSON.stringify(lastOutput?.content)
                    );
                }

                // Replace {{kb}} with knowledge base data
                if (pipelineData.kb) {
                    resolvedPrompt = resolvedPrompt.replace(
                        /\{\{\s*kb\s*\}\}/g,
                        JSON.stringify(pipelineData.kb)
                    );
                }

                if (!resolvedPrompt.trim()) {
                    throw new Error(`AI node "${nodeName}" has no prompt configured`);
                }

                console.log(`    📝 Prompt: ${resolvedPrompt.substring(0, 100)}...`);

                // Call AI service
                const aiResult: AICallResult = await aiService.call(resolvedPrompt, {
                    provider,
                    model,
                    temperature,
                    maxTokens,
                    systemPrompt: systemPrompt || undefined,
                    tier: job.data.tier,
                });

                content = {
                    text: aiResult.content,
                    generated: true,
                    provider: aiResult.provider,
                    model: aiResult.model,
                };

                aiMetadata = {
                    tokens: aiResult.tokens.total,
                    cost: aiResult.cost,
                    provider: aiResult.provider,
                    model: aiResult.model,
                    durationMs: aiResult.durationMs,
                };

                console.log(`    ✓ AI generated ${aiResult.tokens.total} tokens`);
                break;
            }

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

            default: {
                // ── AGENT NODE HANDLER ──────────────────────────────
                // Any nodeType starting with 'agent-' invokes an org_agent
                if (nodeType.startsWith('agent-')) {
                    const agentConfig = node.data?.config || {};
                    const agentSlug = agentConfig.agentSlug || nodeType.replace('agent-', '');
                    const taskInstruction = agentConfig.taskInstruction || '';
                    const inputMode = agentConfig.inputMode || 'previous_output';
                    const customInputTemplate = agentConfig.customInputTemplate || '';
                    const temperatureOverride = agentConfig.temperatureOverride;
                    const maxTokensOverride = agentConfig.maxTokensOverride;

                    const orgId = job.data.orgId;
                    if (!orgId) {
                        throw new Error(`Agent node "${nodeName}" requires an org context (orgId).`);
                    }

                    console.log(`    🤖 Agent node: loading org_agent "${agentSlug}" for org ${orgId}`);

                    // 1. Load org_agent by slug + org_id
                    const { data: orgAgent, error: orgAgentErr } = await supabase
                        .from('org_agents')
                        .select('*, brain_agents(*)')
                        .eq('org_id', orgId)
                        .eq('slug', agentSlug)
                        .eq('is_active', true)
                        .maybeSingle();

                    if (orgAgentErr || !orgAgent) {
                        // Fallback: try agent_templates directly (for workflows that haven't been deployed yet)
                        console.warn(`    ⚠ org_agent "${agentSlug}" not found for org ${orgId}, trying agent_templates...`);
                        const { data: templateAgent } = await supabase
                            .from('agent_templates')
                            .select('*')
                            .eq('slug', agentSlug)
                            .eq('is_active', true)
                            .maybeSingle();

                        if (!templateAgent) {
                            throw new Error(`Agent "${agentSlug}" not found in org_agents or agent_templates`);
                        }

                        // Use template agent's config directly
                        const systemPromptParts = [
                            templateAgent.system_prompt,
                            templateAgent.persona_prompt,
                            templateAgent.guardrails_prompt,
                            taskInstruction ? `\n\n### TASK INSTRUCTION FOR THIS STEP:\n${taskInstruction}` : '',
                        ].filter(Boolean);

                        let userPrompt = '';
                        if (inputMode === 'previous_output') {
                            const lastOutput = Object.values(pipelineData.nodeOutputs).pop();
                            userPrompt = lastOutput?.content ? JSON.stringify(lastOutput.content) : JSON.stringify(pipelineData.userInput);
                        } else if (inputMode === 'user_input') {
                            userPrompt = JSON.stringify(pipelineData.userInput);
                        } else if (inputMode === 'custom' && customInputTemplate) {
                            userPrompt = customInputTemplate;
                            // Resolve variables
                            if (pipelineData.userInput) {
                                for (const [key, value] of Object.entries(pipelineData.userInput)) {
                                    userPrompt = userPrompt.replace(new RegExp(`\\{\\{\\s*input\\.${key}\\s*\\}\\}`, 'g'), String(value));
                                }
                            }
                            if (Object.keys(pipelineData.nodeOutputs).length > 0) {
                                const lastOutput = Object.values(pipelineData.nodeOutputs).pop();
                                userPrompt = userPrompt.replace(/\{\{\s*previousOutput\s*\}\}/g, JSON.stringify(lastOutput?.content));
                            }
                        }

                        const agentAiResult = await aiService.call(userPrompt, {
                            provider: templateAgent.preferred_provider || 'anthropic',
                            model: templateAgent.preferred_model || undefined,
                            temperature: temperatureOverride ?? templateAgent.temperature ?? 0.7,
                            maxTokens: maxTokensOverride ?? templateAgent.max_tokens ?? 4096,
                            systemPrompt: systemPromptParts.join('\n\n'),
                            tier: job.data.tier,
                        });

                        content = {
                            text: agentAiResult.content,
                            agentSlug,
                            agentSource: 'agent_template',
                            generated: true,
                            provider: agentAiResult.provider,
                            model: agentAiResult.model,
                        };

                        aiMetadata = {
                            tokens: agentAiResult.tokens.total,
                            cost: agentAiResult.cost,
                            provider: agentAiResult.provider,
                            model: agentAiResult.model,
                            durationMs: agentAiResult.durationMs,
                        };

                        console.log(`    ✓ Agent "${agentSlug}" (template) generated ${agentAiResult.tokens.total} tokens`);
                        break;
                    }

                    // 2. Build combined system prompt: brain context + agent prompts + task instruction
                    const brainAgent = (orgAgent as any).brain_agents;

                    const systemPromptParts = [
                        // Brain personality and domain knowledge (if brain is linked)
                        brainAgent?.foundation_prompt ? `### BRAIN FOUNDATION:\n${brainAgent.foundation_prompt}` : '',
                        brainAgent?.persona_prompt ? `### BRAIN PERSONA:\n${brainAgent.persona_prompt}` : '',
                        brainAgent?.domain_prompt ? `### BRAIN DOMAIN KNOWLEDGE:\n${brainAgent.domain_prompt}` : '',
                        
                        // Agent's own prompts (override/specialize the brain)
                        orgAgent.system_prompt ? `### AGENT SYSTEM PROMPT:\n${orgAgent.system_prompt}` : '',
                        orgAgent.persona_prompt ? `### AGENT PERSONA:\n${orgAgent.persona_prompt}` : '',
                        orgAgent.instruction_prompt ? `### AGENT INSTRUCTIONS:\n${orgAgent.instruction_prompt}` : '',
                        
                        // Guardrails (brain + agent combined)
                        brainAgent?.guardrails_prompt ? `### GUARDRAILS:\n${brainAgent.guardrails_prompt}` : '',
                        orgAgent.guardrails_prompt ? `### AGENT GUARDRAILS:\n${orgAgent.guardrails_prompt}` : '',
                        
                        // Per-node task instruction
                        taskInstruction ? `### TASK INSTRUCTION FOR THIS STEP:\n${taskInstruction}` : '',
                    ].filter(Boolean);

                    // 3. Load agent-specific KB (if agent has own KB)
                    let agentKbContext = '';
                    if (orgAgent.has_own_kb) {
                        const { data: kbEntries } = await supabase
                            .from('org_agent_kb')
                            .select('title, content')
                            .eq('org_agent_id', orgAgent.id)
                            .eq('is_active', true)
                            .order('priority', { ascending: false })
                            .limit(10);

                        if (kbEntries && kbEntries.length > 0) {
                            agentKbContext = '\n\n### AGENT KNOWLEDGE BASE:\n' +
                                kbEntries.map(e => `[${e.title}]\n${e.content}`).join('\n\n');
                            systemPromptParts.push(agentKbContext);
                        }
                    }

                    // 4. Add brain KB context if available
                    if (pipelineData.kb && orgAgent.can_access_brain) {
                        systemPromptParts.push(`### BRAIN KNOWLEDGE BASE:\n${JSON.stringify(pipelineData.kb)}`);
                    }

                    // 5. Build user prompt based on input mode
                    let userPrompt = '';
                    if (inputMode === 'previous_output') {
                        const lastOutput = Object.values(pipelineData.nodeOutputs).pop();
                        userPrompt = lastOutput?.content
                            ? (typeof lastOutput.content === 'string' ? lastOutput.content : JSON.stringify(lastOutput.content))
                            : JSON.stringify(pipelineData.userInput);
                    } else if (inputMode === 'user_input') {
                        userPrompt = JSON.stringify(pipelineData.userInput);
                    } else if (inputMode === 'custom' && customInputTemplate) {
                        userPrompt = customInputTemplate;
                        // Resolve {{input.X}} variables
                        if (pipelineData.userInput) {
                            for (const [key, value] of Object.entries(pipelineData.userInput)) {
                                userPrompt = userPrompt.replace(
                                    new RegExp(`\\{\\{\\s*input\\.${key}\\s*\\}\\}`, 'g'),
                                    String(value)
                                );
                            }
                            userPrompt = userPrompt.replace(/\{\{\s*input\s*\}\}/g, JSON.stringify(pipelineData.userInput));
                        }
                        // Resolve {{previousOutput}}
                        if (Object.keys(pipelineData.nodeOutputs).length > 0) {
                            const lastOutput = Object.values(pipelineData.nodeOutputs).pop();
                            userPrompt = userPrompt.replace(
                                /\{\{\s*previousOutput\s*\}\}/g,
                                typeof lastOutput?.content === 'string' ? lastOutput.content : JSON.stringify(lastOutput?.content)
                            );
                        }
                        // Resolve {{kb}}
                        if (pipelineData.kb) {
                            userPrompt = userPrompt.replace(
                                /\{\{\s*kb\s*\}\}/g,
                                JSON.stringify(pipelineData.kb)
                            );
                        }
                    }

                    if (!userPrompt.trim()) {
                        userPrompt = 'Execute your task based on the system instructions and available context.';
                    }

                    console.log(`    📝 Agent "${agentSlug}" prompt: ${userPrompt.substring(0, 100)}...`);
                    console.log(`    🧠 System prompt parts: ${systemPromptParts.length}, Brain: ${!!brainAgent}, KB: ${orgAgent.has_own_kb}`);

                    // 6. Resolve provider — agent preferred > brain preferred > platform default
                    const agentProvider = orgAgent.preferred_provider || brainAgent?.preferred_provider || 'anthropic';
                    const agentModel = orgAgent.preferred_model || brainAgent?.preferred_model || undefined;

                    // 7. Call AI via existing aiService (uses org's API keys via engine context)
                    const agentAiResult: AICallResult = await aiService.call(userPrompt, {
                        provider: agentProvider,
                        model: agentModel,
                        temperature: temperatureOverride ?? orgAgent.temperature ?? 0.7,
                        maxTokens: maxTokensOverride ?? orgAgent.max_tokens ?? 4096,
                        systemPrompt: systemPromptParts.join('\n\n'),
                        tier: job.data.tier,
                        engineContext: job.data.options?.engineId ? {
                            engineId: job.data.options.engineId,
                            orgId,
                        } : undefined,
                    });

                    content = {
                        text: agentAiResult.content,
                        agentSlug,
                        agentId: orgAgent.id,
                        agentSource: 'org_agent',
                        brainAgentId: brainAgent?.id || null,
                        generated: true,
                        provider: agentAiResult.provider,
                        model: agentAiResult.model,
                    };

                    aiMetadata = {
                        tokens: agentAiResult.tokens.total,
                        cost: agentAiResult.cost,
                        provider: agentAiResult.provider,
                        model: agentAiResult.model,
                        durationMs: agentAiResult.durationMs,
                    };

                    console.log(`    ✓ Agent "${agentSlug}" generated ${agentAiResult.tokens.total} tokens ($${agentAiResult.cost.toFixed(6)})`);
                    break;
                }

                // Truly unhandled node type
                content = {
                    nodeType,
                    message: `Unhandled node type: ${nodeType}`,
                    config: node.data?.config,
                };
            }
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
