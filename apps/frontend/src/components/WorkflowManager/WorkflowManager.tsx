'use client';

/**
 * WORKFLOW MANAGER V2
 * Premium workflow builder with ReactFlow canvas
 * 
 * Features:
 * - Full CRUD for workflows from /api/superadmin/workflows
 * - V2 node system with proper icon mapping
 * - Working node actions (configure, delete)
 * - Execute workflow integration
 * - Add Node modal with 36 categorized nodes
 * - Flows panel inside canvas (not overlay)
 * 
 * @author Axiom AI
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    BackgroundVariant,
    NodeTypes,
    Panel,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './workflow-manager.css';

import {
    Plus, Folder, Save, Play, X, Trash2,
    Workflow, ChevronRight, Clock, Layout,
    Search, Loader2, AlertCircle, Check
} from 'lucide-react';

import { AddNodeModal } from './AddNodeModal';
import { V2NodeDefinition, V2_ALL_NODES, V2_CATEGORY_META } from './v2-node-definitions';
import { V2WorkflowNode } from './V2WorkflowNode';
import { superadminFetch } from '@/lib/superadmin-auth';
import toast from 'react-hot-toast';

// ============================================================================
// TYPES - Import from shared types file
// ============================================================================

import type {
    V2NodeData,
    WorkflowTemplate,
    SerializedNode,
    SerializedEdge,
    NodeConfigModalProps,
    AIConfigEntry
} from './types';

// ============================================================================
// NODE TYPES REGISTRY
// ============================================================================

const nodeTypes: NodeTypes = {
    v2Node: V2WorkflowNode,
};

// ============================================================================
// NODE TYPE MAPPER
// Maps stored nodeType strings to V2NodeDefinition with icons
// ============================================================================

function mapNodeFromDB(dbNode: SerializedNode, onConfigure?: (nodeId: string, nodeData: V2NodeData) => void): Node<V2NodeData> {
    const nodeType = dbNode.data?.nodeType || 'unknown';

    // Find matching V2 node definition
    const v2Def = V2_ALL_NODES.find(n => n.nodeType === nodeType);

    // Get category metadata for color fallback
    const categoryMeta = v2Def
        ? V2_CATEGORY_META[v2Def.category]
        : null;

    return {
        id: dbNode.id,
        type: 'v2Node', // Always use our custom node type
        position: dbNode.position || { x: 100, y: 100 },
        data: {
            label: dbNode.data?.label || v2Def?.name || nodeType,
            nodeType: nodeType,
            category: dbNode.data?.category || v2Def?.category || 'process',
            icon: v2Def?.icon || Workflow, // Map to actual icon component
            color: v2Def?.color || categoryMeta?.color || '#8B5CF6',
            config: dbNode.data?.config || v2Def?.defaultConfig || {},
            features: dbNode.data?.features || v2Def?.features || [],
            onConfigure, // Pass callback for configuration
        },
    };
}

function serializeNodeForDB(node: Node<V2NodeData>): SerializedNode {
    return {
        id: node.id,
        type: 'v2Node',
        position: node.position,
        data: {
            label: node.data.label,
            nodeType: node.data.nodeType,
            category: node.data.category,
            config: node.data.config,
            features: node.data.features,
            // Note: icon and onConfigure are NOT serialized
        },
    };
}

/** Detect if the workflow graph has a directed cycle (invalid for execution). */
function graphHasCycle(nodes: Node<V2NodeData>[], edges: Edge[]): boolean {
    const idSet = new Set(nodes.map(n => n.id));
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
        if (idSet.has(e.source) && idSet.has(e.target)) {
            adj.get(e.source)!.push(e.target);
        }
    }
    const visiting = new Set<string>();
    const visited = new Set<string>();
    function dfs(id: string): boolean {
        if (visited.has(id)) return false;
        if (visiting.has(id)) return true;
        visiting.add(id);
        for (const to of adj.get(id)!) {
            if (dfs(to)) return true;
        }
        visiting.delete(id);
        visited.add(id);
        return false;
    }
    for (const id of nodes.map(n => n.id)) {
        if (!visited.has(id) && dfs(id)) return true;
    }
    return false;
}

// ============================================================================
// NODE CONFIGURATION MODAL (Inline V2 Version)
// ============================================================================

// Generator nodes - use GeneratorConfig (which includes AIConfig)
const GENERATOR_NODES = [
    'generate-email-reply',
    'generate-email-flow',
    'generate-website-page',
    'generate-website-bundle',
    'generate-social-post',
];

// Validator nodes - use ValidatorConfig (which includes AIConfig)
const VALIDATOR_NODES = [
    'validate-quality',
    'validate-constitution',
    'analyze-intent',
];

// Other AI nodes that use AIConfig directly (not generators or validators)
const AI_REQUIRED_NODES = [
    'enrich-web-search',
    'transform-personalize',
    // Legacy AI nodes
    'generate-llm'
];

// Node types that are resolvers
const RESOLVER_NODES = [
    'resolve-icp',
    'resolve-offer',
    'resolve-angle',
    'resolve-blueprint',
    'resolve-cta'
];

// Node types that are triggers
const TRIGGER_NODES = [
    'trigger-webhook',
    'trigger-schedule',
    'trigger-manual',
    'trigger-email-inbound'
];

// Output nodes - use OutputConfig
const OUTPUT_NODES = [
    'output-webhook',
    'output-store',
    'output-email',
    'output-analytics'
];

// Enricher nodes - use EnricherConfig
const ENRICHER_NODES = [
    'enrich-web-search',
    'enrich-linkedin',
    'enrich-crm',
    'enrich-email-validation'
];

// Transform nodes - use TransformConfig
const TRANSFORM_NODES = [
    'transform-locker',
    'transform-format',
    'transform-personalize'
];

// Utility nodes - use UtilityConfig
const UTILITY_NODES = [
    'condition-if-else',
    'condition-switch',
    'loop-foreach',
    'merge-combine',
    'delay-wait',
    'human-review',
    'error-handler',
    'split-parallel'
];

function NodeConfigModal({ node, onClose, onSave }: NodeConfigModalProps) {
    const [label, setLabel] = useState(node.data.label);

    // AI Config state - use AIConfigEntry[] type from types.ts
    const [aiConfig, setAiConfig] = useState<AIConfigEntry[]>(
        (node.data.config?.aiConfig as AIConfigEntry[]) || []
    );
    const [systemPrompt, setSystemPrompt] = useState<string>(
        (node.data.config?.systemPrompt as string) || ''
    );

    // Type-safe config state for each category
    // Using Record<string, unknown> for flexibility while maintaining type safety
    type ConfigState = Record<string, unknown>;

    // Resolver Config state
    const [resolverConfig, setResolverConfig] = useState<ConfigState>(() => {
        const config = node.data.config || {};
        const { aiConfig: _, systemPrompt: __, ...rest } = config as Record<string, unknown>;
        return rest;
    });

    // Trigger Config state
    const [triggerConfig, setTriggerConfig] = useState<ConfigState>(() => {
        return (node.data.config || {}) as ConfigState;
    });

    // Generator Config state
    const [generatorConfig, setGeneratorConfig] = useState<ConfigState>(() => {
        return (node.data.config || {}) as ConfigState;
    });

    // Validator Config state
    const [validatorConfig, setValidatorConfig] = useState<ConfigState>(() => {
        return (node.data.config || {}) as ConfigState;
    });

    // Output Config state
    const [outputConfig, setOutputConfig] = useState<ConfigState>(() => {
        return (node.data.config || {}) as ConfigState;
    });

    // Enricher Config state
    const [enricherConfig, setEnricherConfig] = useState<ConfigState>(() => {
        return (node.data.config || {}) as ConfigState;
    });

    // Transform Config state
    const [transformConfig, setTransformConfig] = useState<ConfigState>(() => {
        return (node.data.config || {}) as ConfigState;
    });

    // Utility Config state
    const [utilityConfig, setUtilityConfig] = useState<ConfigState>(() => {
        return (node.data.config || {}) as ConfigState;
    });

    // Other config (for non-AI, non-resolver, non-trigger fields) - shown as JSON
    const [showAdvancedJson, setShowAdvancedJson] = useState(false);
    const [otherConfigJson, setOtherConfigJson] = useState(() => {
        const config = node.data.config || {};
        const { aiConfig: _, systemPrompt: __, selectionMode: ___, fallbackBehavior: ____, cacheResults: _____, ...rest } = config as Record<string, unknown>;
        return JSON.stringify(rest, null, 2);
    });
    const [jsonError, setJsonError] = useState<string | null>(null);

    const v2Def = V2_ALL_NODES.find(n => n.nodeType === node.data.nodeType);
    const Icon = node.data.icon || Workflow;
    const isGenerator = GENERATOR_NODES.includes(node.data.nodeType);
    const isValidator = VALIDATOR_NODES.includes(node.data.nodeType);
    const isOutput = OUTPUT_NODES.includes(node.data.nodeType);
    const isEnricher = ENRICHER_NODES.includes(node.data.nodeType);
    const isTransform = TRANSFORM_NODES.includes(node.data.nodeType);
    const isUtility = UTILITY_NODES.includes(node.data.nodeType);
    const requiresAI = AI_REQUIRED_NODES.includes(node.data.nodeType);
    const isResolver = RESOLVER_NODES.includes(node.data.nodeType);
    const isTrigger = TRIGGER_NODES.includes(node.data.nodeType);

    const handleSave = () => {
        try {
            let finalConfig: Record<string, any>;

            if (isGenerator) {
                // Generator node - use full generator config
                const parsedAdvanced = showAdvancedJson ? JSON.parse(otherConfigJson) : {};
                finalConfig = {
                    ...parsedAdvanced,
                    ...generatorConfig
                };
            } else if (isValidator) {
                // Validator node - use validator config
                const parsedAdvanced = showAdvancedJson ? JSON.parse(otherConfigJson) : {};
                finalConfig = {
                    ...parsedAdvanced,
                    ...validatorConfig
                };
            } else if (requiresAI) {
                // AI node - merge AI config with other config
                const parsedOther = JSON.parse(otherConfigJson);
                finalConfig = {
                    ...parsedOther,
                    aiConfig,
                    systemPrompt
                };
            } else if (isResolver) {
                // Resolver node - merge resolver config with advanced JSON
                const parsedAdvanced = showAdvancedJson ? JSON.parse(otherConfigJson) : {};
                finalConfig = {
                    ...parsedAdvanced,
                    ...resolverConfig
                };
            } else if (isTrigger) {
                // Trigger node - use trigger config with advanced JSON
                const parsedAdvanced = showAdvancedJson ? JSON.parse(otherConfigJson) : {};
                finalConfig = {
                    ...parsedAdvanced,
                    ...triggerConfig
                };
            } else if (isOutput) {
                // Output node - use output config
                const parsedAdvanced = showAdvancedJson ? JSON.parse(otherConfigJson) : {};
                finalConfig = {
                    ...parsedAdvanced,
                    ...outputConfig
                };
            } else if (isEnricher) {
                // Enricher node - use enricher config
                const parsedAdvanced = showAdvancedJson ? JSON.parse(otherConfigJson) : {};
                finalConfig = {
                    ...parsedAdvanced,
                    ...enricherConfig
                };
            } else if (isTransform) {
                // Transform node - use transform config
                const parsedAdvanced = showAdvancedJson ? JSON.parse(otherConfigJson) : {};
                finalConfig = {
                    ...parsedAdvanced,
                    ...transformConfig
                };
            } else if (isUtility) {
                // Utility node - use utility config
                const parsedAdvanced = showAdvancedJson ? JSON.parse(otherConfigJson) : {};
                finalConfig = {
                    ...parsedAdvanced,
                    ...utilityConfig
                };
            } else {
                // Other nodes - just parse the JSON
                finalConfig = JSON.parse(otherConfigJson);
            }

            onSave(node.id, label, finalConfig);
        } catch (e) {
            setJsonError('Invalid JSON format');
        }
    };

    return (
        <div className="wm-config-modal-backdrop" onClick={onClose}>
            <div className={`wm-config-modal ${(isGenerator || isValidator || isOutput || isEnricher || isTransform || isUtility || requiresAI || isResolver || isTrigger) ? 'wm-config-modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="wm-config-modal-header">
                    <div className="wm-config-modal-title">
                        <div
                            className="wm-config-modal-icon"
                            style={{ background: node.data.color }}
                        >
                            <Icon size={20} color="white" />
                        </div>
                        <div>
                            <h3>Configure Node</h3>
                            <span className="wm-config-modal-type">{v2Def?.name || node.data.nodeType}</span>
                        </div>
                    </div>
                    <button className="wm-config-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="wm-config-modal-body">
                    {/* Description */}
                    {v2Def?.description && (
                        <p className="wm-config-modal-description">{v2Def.description}</p>
                    )}

                    {/* Label */}
                    <div className="wm-config-field">
                        <label>Node Label</label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Enter node label..."
                        />
                    </div>

                    {/* Features */}
                    {v2Def?.features && v2Def.features.length > 0 && (
                        <div className="wm-config-features">
                            <label>Capabilities</label>
                            <div className="wm-config-features-list">
                                {v2Def.features.map((f, i) => (
                                    <span key={i} className="wm-config-feature-tag">{f}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Generator Config Section - Full config for generators */}
                    {isGenerator && (
                        <div className="wm-config-generator-section">
                            <GeneratorConfig
                                nodeType={node.data.nodeType}
                                config={generatorConfig as any}
                                onChange={(newConfig) => setGeneratorConfig(newConfig as unknown as ConfigState)}
                            />
                        </div>
                    )}

                    {/* Validator Config Section - Full config for validators */}
                    {isValidator && (
                        <div className="wm-config-validator-section">
                            <ValidatorConfig
                                nodeType={node.data.nodeType}
                                config={validatorConfig as any}
                                onChange={(newConfig) => setValidatorConfig(newConfig as unknown as ConfigState)}
                            />
                        </div>
                    )}

                    {/* AI Config Section - Only for non-generator, non-validator AI nodes */}
                    {requiresAI && (
                        <div className="wm-config-ai-section">
                            <AIConfig
                                config={aiConfig}
                                onChange={setAiConfig}
                                systemPrompt={systemPrompt}
                                onSystemPromptChange={setSystemPrompt}
                                systemPromptLabel={
                                    node.data.nodeType.includes('generate') ? 'Generation Instructions' :
                                        node.data.nodeType.includes('analyze') ? 'Analysis Instructions' :
                                            node.data.nodeType.includes('validate') ? 'Validation Criteria' :
                                                'System Instructions'
                                }
                            />
                        </div>
                    )}

                    {/* Resolver Config Section - Only for resolver nodes */}
                    {isResolver && (
                        <div className="wm-config-resolver-section">
                            <ResolverConfig
                                nodeType={node.data.nodeType}
                                config={resolverConfig as any}
                                onChange={(newConfig) => setResolverConfig(newConfig as unknown as ConfigState)}
                            />
                        </div>
                    )}

                    {/* Trigger Config Section - Only for trigger nodes */}
                    {isTrigger && (
                        <div className="wm-config-trigger-section">
                            <TriggerConfig
                                nodeType={node.data.nodeType}
                                config={triggerConfig as any}
                                onChange={(newConfig) => setTriggerConfig(newConfig as unknown as ConfigState)}
                            />
                        </div>
                    )}

                    {/* Output Config Section - Only for output nodes */}
                    {isOutput && (
                        <div className="wm-config-output-section">
                            <OutputConfig
                                nodeType={node.data.nodeType}
                                config={outputConfig as any}
                                onChange={(newConfig) => setOutputConfig(newConfig as unknown as ConfigState)}
                            />
                        </div>
                    )}

                    {/* Enricher Config Section - Only for enricher nodes */}
                    {isEnricher && (
                        <div className="wm-config-enricher-section">
                            <EnricherConfig
                                nodeType={node.data.nodeType}
                                config={enricherConfig as any}
                                onChange={(newConfig) => setEnricherConfig(newConfig as unknown as ConfigState)}
                            />
                        </div>
                    )}

                    {/* Transform Config Section - Only for transform nodes */}
                    {isTransform && (
                        <div className="wm-config-transform-section">
                            <TransformConfig
                                nodeType={node.data.nodeType}
                                config={transformConfig as any}
                                onChange={(newConfig) => setTransformConfig(newConfig as unknown as ConfigState)}
                            />
                        </div>
                    )}

                    {/* Utility Config Section - Only for utility nodes */}
                    {isUtility && (
                        <div className="wm-config-utility-section">
                            <UtilityConfig
                                nodeType={node.data.nodeType}
                                config={utilityConfig as any}
                                onChange={(newConfig) => setUtilityConfig(newConfig as unknown as ConfigState)}
                            />
                        </div>
                    )}

                    {/* Advanced JSON Toggle for specialized nodes */}
                    {(isGenerator || isValidator || isOutput || isEnricher || isTransform || isUtility || isResolver || isTrigger) && (
                        <div className="wm-config-field">
                            <label className="wm-config-toggle-label">
                                <input
                                    type="checkbox"
                                    checked={showAdvancedJson}
                                    onChange={(e) => setShowAdvancedJson(e.target.checked)}
                                />
                                Show Advanced JSON Config
                            </label>
                        </div>
                    )}

                    {/* Other Config JSON - Show for AI nodes, regular nodes, or advanced mode */}
                    {(!isGenerator && !isValidator && !isOutput && !isEnricher && !isTransform && !isUtility && !isResolver && !isTrigger || showAdvancedJson || requiresAI) && (
                        <div className="wm-config-field">
                            <label>{(isGenerator || isValidator || isOutput || isEnricher || isTransform || isUtility || isResolver || isTrigger) ? 'Advanced Configuration (JSON)' : 'Additional Configuration (JSON)'}</label>
                            <textarea
                                value={otherConfigJson}
                                onChange={(e) => {
                                    setOtherConfigJson(e.target.value);
                                    setJsonError(null);
                                }}
                                rows={requiresAI || isGenerator || isValidator || isOutput || isEnricher || isTransform || isUtility || isResolver || isTrigger ? 4 : 8}
                                spellCheck={false}
                                className={jsonError ? 'error' : ''}
                            />
                            {jsonError && <span className="wm-config-error">{jsonError}</span>}
                        </div>
                    )}
                </div>

                <div className="wm-config-modal-footer">
                    <button className="wm-btn wm-btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="wm-btn wm-btn-primary" onClick={handleSave}>
                        <Save size={16} />
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}

// Import config components
import { AIConfig } from './AIConfig';
import { ResolverConfig } from './ResolverConfig';
import { TriggerConfig } from './TriggerConfig';
import { GeneratorConfig } from './GeneratorConfig';
import { ValidatorConfig } from './ValidatorConfig';
import { OutputConfig } from './OutputConfig';
import { EnricherConfig } from './EnricherConfig';
import { TransformConfig } from './TransformConfig';
import { UtilityConfig } from './UtilityConfig';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function WorkflowManagerInner() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Modal/Panel state
    const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);
    const [isFlowsPanelOpen, setIsFlowsPanelOpen] = useState(false);

    // Flow state
    const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
    const [currentFlowName, setCurrentFlowName] = useState('Untitled Flow');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Data state
    const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
    const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
    const [workflowError, setWorkflowError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Operation state
    const [isSaving, setIsSaving] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Execution result modal: show status/output after run
    const [executionModal, setExecutionModal] = useState<{ executionId: string } | null>(null);
    const [executionResult, setExecutionResult] = useState<{
        status: string;
        output?: unknown;
        error?: string;
        durationMs?: number;
        tokensUsed?: number;
        cost?: number;
    } | null>(null);

    // Node Configuration state
    const [configuringNode, setConfiguringNode] = useState<{
        id: string;
        data: V2NodeData;
    } | null>(null);

    // ========================================================================
    // FETCH WORKFLOWS
    // ========================================================================

    const fetchWorkflows = useCallback(async () => {
        setIsLoadingWorkflows(true);
        setWorkflowError(null);

        try {
            const response = await superadminFetch('/api/superadmin/workflows');
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }
            const result = await response.json();
            setWorkflows(result.data || []);
        } catch (error: unknown) {
            console.error('Error fetching workflows:', error);
            setWorkflowError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setIsLoadingWorkflows(false);
        }
    }, []);

    // Fetch on mount
    useEffect(() => {
        fetchWorkflows();
    }, [fetchWorkflows]);

    // Callback for node configuration (passed to nodes via data)
    const handleNodeConfigureRequest = useCallback((nodeId: string, nodeData: V2NodeData) => {
        setConfiguringNode({
            id: nodeId,
            data: nodeData,
        });
    }, []);

    // Legacy: Listen for node configure events from V2WorkflowNode (backwards compatibility)
    useEffect(() => {
        const handleConfigureEvent = (e: CustomEvent<{ nodeId: string; nodeData: V2NodeData }>) => {
            setConfiguringNode({
                id: e.detail.nodeId,
                data: e.detail.nodeData,
            });
        };

        window.addEventListener('nodeConfigureRequest', handleConfigureEvent as EventListener);
        return () => {
            window.removeEventListener('nodeConfigureRequest', handleConfigureEvent as EventListener);
        };
    }, []);

    // ========================================================================
    // NODE/EDGE HANDLERS
    // ========================================================================

    const onConnect = useCallback((connection: Connection) => {
        setEdges((eds) => addEdge({
            ...connection,
            type: 'smoothstep',
            animated: true,
            style: { stroke: 'var(--color-accent)', strokeWidth: 2 }
        }, eds));
        setHasUnsavedChanges(true);
    }, [setEdges]);

    // Add node from modal
    const handleAddNode = useCallback((nodeDef: V2NodeDefinition) => {
        const newNode: Node<V2NodeData> = {
            id: `node-${Date.now()}`,
            type: 'v2Node',
            position: {
                x: Math.random() * 400 + 100,
                y: Math.random() * 300 + 100,
            },
            data: {
                label: nodeDef.name,
                nodeType: nodeDef.nodeType,
                category: nodeDef.category,
                icon: nodeDef.icon,
                color: nodeDef.color,
                config: nodeDef.defaultConfig,
                features: nodeDef.features,
                onConfigure: handleNodeConfigureRequest, // Pass callback
            },
        };

        setNodes((nds) => [...nds, newNode]);
        setHasUnsavedChanges(true);
    }, [setNodes, handleNodeConfigureRequest]);

    // Delete node
    const handleDeleteNode = useCallback((nodeId: string) => {
        setNodes((nds) => nds.filter(n => n.id !== nodeId));
        setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
        setHasUnsavedChanges(true);
    }, [setNodes, setEdges]);

    // Save node configuration
    const handleSaveNodeConfig = useCallback((nodeId: string, newLabel: string, newConfig: Record<string, unknown>) => {
        setNodes((nds) => nds.map(n => {
            if (n.id === nodeId) {
                return {
                    ...n,
                    data: {
                        ...n.data,
                        label: newLabel,
                        config: newConfig,
                    }
                };
            }
            return n;
        }));
        setHasUnsavedChanges(true);
        setConfiguringNode(null);
    }, [setNodes]);

    // ========================================================================
    // WORKFLOW OPERATIONS
    // ========================================================================

    // Load workflow
    const handleLoadWorkflow = useCallback((workflow: WorkflowTemplate) => {
        const loadedNodes = (workflow.nodes || []).map(node => mapNodeFromDB(node, handleNodeConfigureRequest));
        const loadedEdges = (workflow.edges || []).map((edge: SerializedEdge) => ({
            ...edge,
            type: edge.type || 'smoothstep',
            animated: edge.animated !== false,
            style: { stroke: 'var(--color-accent)', strokeWidth: 2 }
        }));

        setNodes(loadedNodes);
        setEdges(loadedEdges);
        setCurrentFlowId(workflow.id);
        setCurrentFlowName(workflow.name);
        setHasUnsavedChanges(false);
        setIsFlowsPanelOpen(false);
    }, [setNodes, setEdges, handleNodeConfigureRequest]);

    // New workflow
    const handleNewFlow = useCallback(() => {
        setNodes([]);
        setEdges([]);
        setCurrentFlowId(null);
        setCurrentFlowName('Untitled Flow');
        setHasUnsavedChanges(false);
        setIsFlowsPanelOpen(false);
    }, [setNodes, setEdges]);

    // Save workflow
    const handleSaveFlow = useCallback(async () => {
        if (isSaving) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const serializedNodes = nodes.map(serializeNodeForDB);

            const payload = {
                id: currentFlowId,
                name: currentFlowName,
                description: '',
                status: 'active',
                nodes: serializedNodes,
                edges: edges.map(e => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    type: e.type || 'smoothstep',
                    animated: true,
                })),
            };

            const response = await superadminFetch('/api/superadmin/workflows', {
                method: currentFlowId ? 'PATCH' : 'POST',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to save workflow');
            }

            const result = await response.json();

            if (result.data?.id) {
                setCurrentFlowId(result.data.id);
            }

            setHasUnsavedChanges(false);
            setSaveSuccess(true);
            fetchWorkflows();

            // Clear success indicator after 2s
            setTimeout(() => setSaveSuccess(false), 2000);

        } catch (error: unknown) {
            console.error('Save error:', error);
            toast.error('Failed to save workflow: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsSaving(false);
        }
    }, [currentFlowId, currentFlowName, nodes, edges, isSaving, fetchWorkflows]);

    // Poll execution status when modal is open
    const executionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        if (!executionModal?.executionId) return;

        const poll = async () => {
            try {
                const res = await superadminFetch(`/api/superadmin/workflows/executions/${executionModal.executionId}`);
                if (!res.ok) return;
                const data = await res.json();
                setExecutionResult({
                    status: data.status,
                    output: data.output,
                    error: data.error,
                    durationMs: data.durationMs,
                    tokensUsed: data.tokensUsed,
                    cost: data.cost,
                });
                if (data.status === 'completed' || data.status === 'failed') {
                    if (executionPollRef.current) {
                        clearInterval(executionPollRef.current);
                        executionPollRef.current = null;
                    }
                }
            } catch {
                // ignore poll errors
            }
        };

        poll();
        executionPollRef.current = setInterval(poll, 2000);
        return () => {
            if (executionPollRef.current) {
                clearInterval(executionPollRef.current);
                executionPollRef.current = null;
            }
        };
    }, [executionModal?.executionId]);

    // Execute workflow
    const handleExecuteFlow = useCallback(async () => {
        if (!currentFlowId || isExecuting) return;

        // Require saved workflow before execution
        if (hasUnsavedChanges) {
            toast.error('Please save your workflow before executing.');
            return;
        }

        // Block execution if graph has a cycle
        if (graphHasCycle(nodes, edges)) {
            toast.error('Workflow contains a cycle. Remove cycles before executing.');
            return;
        }

        setIsExecuting(true);
        setExecutionModal(null);
        setExecutionResult(null);
        const loadingToast = toast.loading('Executing workflow...');

        try {
            const response = await superadminFetch(`/api/superadmin/workflows/${currentFlowId}/execute`, {
                method: 'POST',
                body: JSON.stringify({ input: {} }),
            });

            const result = await response.json();

            if (response.ok && result.success && result.executionId) {
                toast.success('Execution queued. Watch status below.', { id: loadingToast, duration: 3000 });
                setExecutionModal({ executionId: result.executionId });
                setExecutionResult({ status: 'started' });
            } else if (response.ok && result.success) {
                toast.success('Workflow executed successfully.', { id: loadingToast, duration: 5000 });
            } else if (response.status === 503) {
                toast.error(
                    'Execution service unavailable. Ensure Redis and workers are running.',
                    { id: loadingToast, duration: 8000 }
                );
            } else if (response.status === 404) {
                toast.error('Workflow not found.', { id: loadingToast });
            } else if (response.status === 400) {
                toast.error(result.message || 'Invalid workflow configuration.', { id: loadingToast });
            } else {
                toast.error(result.error || 'Execution failed.', { id: loadingToast });
            }
        } catch (error: unknown) {
            console.error('Execution error:', error);
            toast.error('Failed to execute workflow: ' + (error instanceof Error ? error.message : 'Unknown error'), { id: loadingToast });
        } finally {
            setIsExecuting(false);
        }
    }, [currentFlowId, isExecuting, hasUnsavedChanges, nodes, edges]);

    // Delete workflow
    const handleDeleteWorkflow = useCallback(async (workflowId: string) => {
        if (!confirm('Delete this workflow? This cannot be undone.')) return;

        try {
            const response = await superadminFetch(`/api/superadmin/workflows?id=${workflowId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchWorkflows();
                if (currentFlowId === workflowId) {
                    handleNewFlow();
                }
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    }, [currentFlowId, fetchWorkflows, handleNewFlow]);

    // ========================================================================
    // MINIMAP
    // ========================================================================

    const minimapNodeColor = useCallback((node: Node) => {
        const data = node.data as V2NodeData;
        return data?.color || '#8B5CF6';
    }, []);

    // ========================================================================
    // FILTER WORKFLOWS
    // ========================================================================

    const filteredWorkflows = workflows.filter(w =>
        !searchQuery ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="workflow-manager">
            {/* Top Toolbar */}
            <div className="wm-toolbar">
                <div className="wm-toolbar-left">
                    <div className="wm-toolbar-title">
                        <div className="wm-toolbar-title-icon">
                            <Workflow size={18} />
                        </div>
                        <h1>Workflow Manager</h1>
                    </div>

                    <div className="wm-toolbar-divider" />

                    <input
                        type="text"
                        className="wm-flow-name-input"
                        value={currentFlowName}
                        onChange={(e) => {
                            setCurrentFlowName(e.target.value);
                            setHasUnsavedChanges(true);
                        }}
                        placeholder="Flow name..."
                    />

                    {hasUnsavedChanges && (
                        <span className="wm-unsaved-indicator" title="Unsaved changes" />
                    )}
                </div>

                <div className="wm-toolbar-right">
                    <button
                        className="wm-btn wm-btn-secondary"
                        onClick={() => setIsFlowsPanelOpen(!isFlowsPanelOpen)}
                    >
                        <Folder size={16} />
                        My Flows
                        <span className="wm-btn-badge">{workflows.length}</span>
                    </button>

                    <button
                        className="wm-btn wm-btn-primary"
                        onClick={() => setIsAddNodeModalOpen(true)}
                    >
                        <Plus size={16} />
                        Add Node
                    </button>

                    <div className="wm-toolbar-divider" />

                    <button
                        className="wm-btn wm-btn-ghost"
                        onClick={handleSaveFlow}
                        disabled={isSaving || !hasUnsavedChanges}
                        title="Save workflow"
                    >
                        {isSaving ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : saveSuccess ? (
                            <Check size={16} color="#10B981" />
                        ) : (
                            <Save size={16} />
                        )}
                    </button>

                    <button
                        className="wm-btn wm-btn-ghost"
                        onClick={handleExecuteFlow}
                        disabled={isExecuting || nodes.length === 0 || !currentFlowId}
                        title={currentFlowId ? "Execute workflow" : "Save first to execute"}
                    >
                        {isExecuting ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Play size={16} />
                        )}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="wm-main-content">
                {/* Flows Panel */}
                {isFlowsPanelOpen && (
                    <div className="wm-flows-panel">
                        <div className="wm-flows-panel-header">
                            <h3>My Flows</h3>
                            <button
                                className="wm-flows-panel-close"
                                onClick={() => setIsFlowsPanelOpen(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="wm-flows-panel-search">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search workflows..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <button className="wm-flows-new-btn" onClick={handleNewFlow}>
                            <Plus size={16} />
                            New Flow
                        </button>

                        <div className="wm-flows-list">
                            {isLoadingWorkflows ? (
                                <div className="wm-flows-loading">
                                    <Loader2 className="animate-spin" size={24} />
                                    <span>Loading workflows...</span>
                                </div>
                            ) : workflowError ? (
                                <div className="wm-flows-error">
                                    <AlertCircle size={24} />
                                    <span>{workflowError}</span>
                                    <button onClick={fetchWorkflows}>Retry</button>
                                </div>
                            ) : filteredWorkflows.length === 0 ? (
                                <div className="wm-flows-empty">
                                    <Folder size={32} />
                                    <span>No workflows found</span>
                                    <p>Create your first workflow or run the V2 migration</p>
                                </div>
                            ) : (
                                filteredWorkflows.map((workflow) => (
                                    <div
                                        key={workflow.id}
                                        className={`wm-flow-item ${currentFlowId === workflow.id ? 'active' : ''}`}
                                    >
                                        <div
                                            className="wm-flow-item-main"
                                            onClick={() => handleLoadWorkflow(workflow)}
                                        >
                                            <h4>{workflow.name}</h4>
                                            {workflow.description && (
                                                <p>{workflow.description}</p>
                                            )}
                                            <div className="wm-flow-item-meta">
                                                <span>
                                                    <Layout size={12} />
                                                    {workflow.node_count || workflow.nodes?.length || 0} nodes
                                                </span>
                                                <span>
                                                    <Clock size={12} />
                                                    {formatDate(workflow.updated_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="wm-flow-item-actions">
                                            <button
                                                className="wm-flow-item-action"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteWorkflow(workflow.id);
                                                }}
                                                title="Delete workflow"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ReactFlow Canvas */}
                <div className="wm-canvas-container" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodesDelete={(deleted) => {
                            deleted.forEach(n => handleDeleteNode(n.id));
                        }}
                        nodeTypes={nodeTypes}
                        fitView
                        className="wm-reactflow"
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            animated: true,
                            style: { stroke: 'var(--color-accent)', strokeWidth: 2 }
                        }}
                        deleteKeyCode="Delete"
                    >
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={20}
                            size={1}
                            color="var(--color-border)"
                        />
                        <Controls
                            showInteractive={false}
                            style={{
                                background: 'var(--color-surface)',
                                borderColor: 'var(--color-border)'
                            }}
                        />
                        <MiniMap
                            nodeColor={minimapNodeColor}
                            maskColor="rgba(0, 0, 0, 0.2)"
                            style={{
                                background: 'var(--color-surface)',
                            }}
                        />

                        {/* Empty State */}
                        {nodes.length === 0 && (
                            <Panel position="top-center">
                                <div className="wm-empty-state">
                                    <div className="wm-empty-icon">
                                        <Workflow size={32} />
                                    </div>
                                    <h3>Start Building Your Workflow</h3>
                                    <p>Click "Add Node" to add nodes, or load an existing workflow</p>
                                    <div className="wm-empty-actions">
                                        <button
                                            className="wm-btn wm-btn-primary"
                                            onClick={() => setIsAddNodeModalOpen(true)}
                                        >
                                            <Plus size={16} />
                                            Add Node
                                        </button>
                                        <button
                                            className="wm-btn wm-btn-secondary"
                                            onClick={() => setIsFlowsPanelOpen(true)}
                                        >
                                            <Folder size={16} />
                                            Load Flow
                                        </button>
                                    </div>
                                </div>
                            </Panel>
                        )}
                    </ReactFlow>
                </div>
            </div>

            {/* Add Node Modal */}
            <AddNodeModal
                isOpen={isAddNodeModalOpen}
                onClose={() => setIsAddNodeModalOpen(false)}
                onAddNode={handleAddNode}
            />

            {/* Node Configuration Modal */}
            {configuringNode && (
                <NodeConfigModal
                    node={configuringNode}
                    onClose={() => setConfiguringNode(null)}
                    onSave={handleSaveNodeConfig}
                />
            )}

            {/* Execution Result Modal */}
            {executionModal && (
                <div className="wm-execution-modal-overlay" onClick={() => setExecutionModal(null)} role="dialog" aria-modal="true" aria-labelledby="execution-modal-title">
                    <div className="wm-execution-modal" onClick={e => e.stopPropagation()}>
                        <div className="wm-execution-modal-header">
                            <h3 id="execution-modal-title">Execution status</h3>
                            <button type="button" className="wm-execution-modal-close" onClick={() => setExecutionModal(null)} aria-label="Close execution status">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="wm-execution-modal-body">
                            <div className="wm-execution-id">
                                ID: <code>{executionModal.executionId}</code>
                            </div>
                            {executionResult && (
                                <>
                                    <div className="wm-execution-status-row" aria-live="polite" aria-atomic="true">
                                        <span className="wm-execution-status-label">Status</span>
                                        <span className={`wm-execution-status-badge wm-execution-status-${executionResult.status}`} title={`Execution ${executionResult.status}`}>
                                            {executionResult.status}
                                        </span>
                                    </div>
                                    {(executionResult.durationMs != null || executionResult.tokensUsed != null || executionResult.cost != null) && (
                                        <div className="wm-execution-meta">
                                            {executionResult.durationMs != null && <span>Duration: {(executionResult.durationMs / 1000).toFixed(2)}s</span>}
                                            {executionResult.tokensUsed != null && <span>Tokens: {executionResult.tokensUsed}</span>}
                                            {executionResult.cost != null && <span>Cost: ${Number(executionResult.cost).toFixed(4)}</span>}
                                        </div>
                                    )}
                                    {executionResult.error && (
                                        <div className="wm-execution-error">
                                            <strong>Error</strong>
                                            <pre>{executionResult.error}</pre>
                                        </div>
                                    )}
                                    {executionResult.output !== undefined && executionResult.output !== null && executionResult.status === 'completed' && (
                                        <div className="wm-execution-output">
                                            <strong>Output</strong>
                                            <pre>{typeof executionResult.output === 'string' ? executionResult.output : JSON.stringify(executionResult.output, null, 2)}</pre>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// WRAPPER WITH PROVIDER + ERROR BOUNDARY
// ============================================================================

import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

function WorkflowErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <div className="wm-error-fallback">
            <div className="wm-error-content">
                <AlertCircle className="wm-error-icon" />
                <h2>Something went wrong</h2>
                <p className="wm-error-message">{error instanceof Error ? error.message : String(error)}</p>
                <button
                    onClick={resetErrorBoundary}
                    className="wm-error-button"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}

export function WorkflowManager() {
    return (
        <ErrorBoundary
            FallbackComponent={WorkflowErrorFallback}
            onReset={() => window.location.reload()}
            onError={(error: unknown, info: React.ErrorInfo) => {
                console.error('WorkflowManager Error:', error);
                console.error('Component Stack:', info.componentStack);
            }}
        >
            <ReactFlowProvider>
                <WorkflowManagerInner />
            </ReactFlowProvider>
        </ErrorBoundary>
    );
}

export default WorkflowManager;
