'use client';

/**
 * WORKFLOW BUILDER
 * Main ReactFlow component for building workflows
 * Uses AxiomNodes with 4-sided handles and API integration
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    BackgroundVariant,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    MarkerType,
    Panel,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, Undo, Redo, ZoomIn, ZoomOut, Maximize, Trash2, Copy, Plus, X } from 'lucide-react';
import { axiomNodeTypes, axiomNodeStyles, AxiomNodeData } from './AxiomNodes';
import { allSubNodes, getSubNodeById, SubNodeDefinition, getSubNodesByCategory } from './AxiomSubNodes';
import { nodeStyleService } from '@/services/nodeStyleService';
import NodeConfigurationModal from './NodeConfigurationModal';
import toast from 'react-hot-toast';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowBuilderProps {
    /** Initial nodes to render */
    initialNodes?: Node[];
    /** Initial edges to render */
    initialEdges?: Edge[];
    /** Callback when workflow is saved */
    onSave?: (nodes: Node[], edges: Edge[]) => void;
    /** Callback when a node is selected */
    onNodeSelect?: (node: Node | null) => void;
    /** Callback when nodes/edges change */
    onChange?: (nodes: Node[], edges: Edge[]) => void;
    /** Whether the builder is in read-only mode */
    readOnly?: boolean;
    /** Available node palette items (from API) */
    nodePalette?: SubNodeDefinition[];
    /** Workflow template ID (if editing existing) */
    templateId?: string;
}

// ============================================================================
// DEFAULT NODES FOR EMPTY CANVAS
// ============================================================================

const defaultNodes: Node<AxiomNodeData>[] = [
    {
        id: 'start-1',
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: {
            id: 'start-1',
            nodeId: 'webhook_trigger',
            label: 'Start',
            description: 'Workflow entry point',
            category: 'trigger',
            icon: 'Zap',
            features: ['Webhook', 'API'],
        },
    },
];

const defaultEdges: Edge[] = [];

// ============================================================================
// CUSTOM MINIMAP NODE
// ============================================================================

function minimapNodeColor(node: Node) {
    const category = node.data?.category || 'structural';
    const colors: Record<string, string> = {
        trigger: '#f59e0b',
        input: '#6366f1',
        process: '#10b981',
        condition: '#3b82f6',
        preview: '#a855f7',
        output: '#ec4899',
        structural: '#9ca3af',
    };
    return colors[category] || colors.structural;
}

// ============================================================================
// NODE TYPE NORMALIZER
// Converts unknown node types (like 'retrieve-kb') to valid category types
// ============================================================================

const validNodeTypes = new Set(['trigger', 'input', 'process', 'condition', 'preview', 'output', 'structural', 'default']);

// Pattern-based category detection
function detectCategoryFromName(name: string): string | null {
    const lowered = name.toLowerCase().replace(/[-_]/g, ' ');

    // Trigger patterns
    if (/trigger|webhook|schedule|cron|event|start/i.test(name)) {
        return 'trigger';
    }

    // Input patterns
    if (/input|retrieve|fetch|get|load|read|import|upload|scrape|api.?input|kb|knowledge/i.test(name)) {
        return 'input';
    }

    // Process patterns (AI/generation/transformation)
    if (/process|generate|llm|ai|gpt|claude|gemini|write|transform|analyze|create|convert|format|summarize|translate/i.test(name)) {
        return 'process';
    }

    // Condition patterns
    if (/condition|if|switch|branch|filter|validate|check|gate|decision|route|constitution/i.test(name)) {
        return 'condition';
    }

    // Preview patterns
    if (/preview|review|display|show|view|approve|editor/i.test(name)) {
        return 'preview';
    }

    // Output patterns
    if (/output|export|send|publish|post|email|notify|store|save|write|n8n|webhook.?out/i.test(name)) {
        return 'output';
    }

    return null;
}

function normalizeNodes(nodes: Node[]): Node[] {
    if (!nodes || !Array.isArray(nodes)) return [];

    return nodes.map(node => {
        // Ensure draggable is always set to true
        let normalizedNode = { ...node, draggable: true, selectable: true };

        // If type is already valid, ensure data.category is set
        if (validNodeTypes.has(node.type || '')) {
            if (!node.data?.category) {
                return {
                    ...normalizedNode,
                    data: {
                        ...node.data,
                        category: node.type,
                    }
                };
            }
            return normalizedNode;
        }

        // Try to determine type from node data.category
        if (node.data?.category && validNodeTypes.has(node.data.category)) {
            return { ...normalizedNode, type: node.data.category };
        }

        // Try to find the sub-node definition to get the category
        const subNode = getSubNodeById(node.type || '') || getSubNodeById(node.data?.nodeId || '');
        if (subNode) {
            return {
                ...normalizedNode,
                type: subNode.category,
                data: {
                    ...node.data,
                    nodeId: subNode.nodeId,
                    category: subNode.category,
                }
            };
        }

        // Pattern-based detection from node type or nodeId
        const nameToCheck = node.type || node.data?.nodeId || node.data?.label || '';
        const detectedCategory = detectCategoryFromName(nameToCheck);

        if (detectedCategory) {
            console.log(`Detected category "${detectedCategory}" for node "${nameToCheck}"`);
            return {
                ...normalizedNode,
                type: detectedCategory,
                data: {
                    ...node.data,
                    category: detectedCategory,
                }
            };
        }

        // Final fallback to 'structural' (neutral gray)
        console.warn(`Unknown node type "${node.type}", falling back to 'structural'`);
        return {
            ...normalizedNode,
            type: 'structural',
            data: {
                ...node.data,
                category: 'structural',
            }
        };
    });
}

// ============================================================================
// WORKFLOW BUILDER COMPONENT
// ============================================================================

function WorkflowBuilderInner({
    initialNodes = defaultNodes,
    initialEdges = defaultEdges,
    onSave,
    onNodeSelect,
    onChange,
    readOnly = false,
    nodePalette = allSubNodes,
}: WorkflowBuilderProps) {
    // Normalize nodes to ensure valid types for ReactFlow
    const normalizedInitialNodes = useMemo(() => normalizeNodes(initialNodes), [initialNodes]);

    const [nodes, setNodes, onNodesChange] = useNodesState(normalizedInitialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [configModalNode, setConfigModalNode] = useState<Node | null>(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isDirty, setIsDirty] = useState(false);
    const [showAddNodeModal, setShowAddNodeModal] = useState(false);

    // Update nodes when initialNodes prop changes (e.g., selecting different workflow)
    useEffect(() => {
        const normalized = normalizeNodes(initialNodes);
        setNodes(normalized);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    // Inject CSS styles
    useEffect(() => {
        const styleId = 'axiom-node-styles';
        if (!document.getElementById(styleId)) {
            const styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.textContent = axiomNodeStyles;
            document.head.appendChild(styleEl);
        }
    }, []);

    // Listen for node-configure events from node components
    // Use a ref to avoid stale closure issues
    const nodesRef = React.useRef(nodes);
    nodesRef.current = nodes;

    useEffect(() => {
        const handleNodeConfigureEvent = (e: CustomEvent<{ nodeId: string }>) => {
            const nodeId = e.detail.nodeId;
            console.log('Received node-configure event for node:', nodeId);
            console.log('Current nodes:', nodesRef.current.map(n => n.id));

            const node = nodesRef.current.find((n) => n.id === nodeId);
            if (node) {
                console.log('Found node, opening config modal:', node.data?.label);
                setConfigModalNode(node);
                setIsConfigModalOpen(true);
            } else {
                console.warn('Node not found in current nodes array:', nodeId);
            }
        };

        window.addEventListener('node-configure', handleNodeConfigureEvent as EventListener);
        return () => {
            window.removeEventListener('node-configure', handleNodeConfigureEvent as EventListener);
        };
    }, []); // Empty deps - using ref for nodes

    // Listen for node-delete events from node components
    useEffect(() => {
        const handleNodeDeleteEvent = (e: CustomEvent<{ nodeId: string }>) => {
            const nodeId = e.detail.nodeId;
            console.log('Received node-delete event for node:', nodeId);
            setNodes((nds) => nds.filter((n) => n.id !== nodeId));
            setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
            toast.success('Node deleted');
        };

        window.addEventListener('node-delete', handleNodeDeleteEvent as EventListener);
        return () => {
            window.removeEventListener('node-delete', handleNodeDeleteEvent as EventListener);
        };
    }, [setNodes, setEdges]);

    // Track changes
    useEffect(() => {
        onChange?.(nodes, edges);
        setIsDirty(true);
    }, [nodes, edges, onChange]);

    // Node action handlers
    const handleNodeDelete = useCallback(
        (nodeId: string) => {
            setNodes((nds) => nds.filter((n) => n.id !== nodeId));
            setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
        },
        [setNodes, setEdges]
    );

    const handleNodeDuplicate = useCallback(
        (nodeId: string) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (!node) return;

            const newNode: Node<AxiomNodeData> = {
                ...node,
                id: `${node.data.nodeId}-${Date.now()}`,
                position: {
                    x: node.position.x + 50,
                    y: node.position.y + 50,
                },
                data: {
                    ...node.data,
                    id: `${node.data.nodeId}-${Date.now()}`,
                    onDelete: handleNodeDelete,
                    onDuplicate: handleNodeDuplicate,
                    onConfigure: handleNodeConfigure,
                },
            };

            setNodes((nds) => [...nds, newNode]);
        },
        [nodes, setNodes]
    );

    const handleNodeConfigure = useCallback((nodeId: string) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
            setConfigModalNode(node);
            setIsConfigModalOpen(true);
        }
    }, [nodes]);

    // Handle node configuration update from modal
    const handleNodeUpdate = useCallback((nodeId: string, updatedData: Partial<AxiomNodeData>) => {
        setNodes((nds) =>
            nds.map((n) =>
                n.id === nodeId
                    ? { ...n, data: { ...n.data, ...updatedData } }
                    : n
            )
        );
        setIsConfigModalOpen(false);
        setConfigModalNode(null);
    }, [setNodes]);

    // Add node from modal palette (click-to-add, bypasses drag-drop issues)
    // Use a counter ref to stagger positions and avoid overlap
    const nodeCountRef = React.useRef(0);

    const addNodeFromPalette = useCallback((subNode: SubNodeDefinition) => {
        if (readOnly) return;

        // Calculate position - spread nodes out based on count to avoid overlap
        nodeCountRef.current += 1;
        const count = nodeCountRef.current;
        const baseX = 200 + (count % 4) * 320; // 4 columns, 320px apart
        const baseY = 100 + Math.floor(count / 4) * 200; // rows 200px apart

        const position = {
            x: baseX + Math.random() * 40 - 20, // ±20px jitter
            y: baseY + Math.random() * 40 - 20,
        };

        const newNode: Node<AxiomNodeData> = {
            id: `${subNode.nodeId}-${Date.now()}`,
            type: subNode.category,
            position,
            draggable: true,
            selectable: true,
            data: {
                id: `${subNode.nodeId}-${Date.now()}`,
                nodeId: subNode.nodeId,
                label: subNode.name,
                description: subNode.description,
                category: subNode.category as AxiomNodeData['category'],
                icon: subNode.icon,
                features: subNode.features,
                capabilities: subNode.capabilities,
                config: { ...subNode.defaultConfig },
            },
        };

        setNodes((nds: Node[]) => [...nds, newNode]);
        setShowAddNodeModal(false);
        toast.success(`Added "${subNode.name}" node`);
    }, [readOnly, setNodes, handleNodeDelete, handleNodeDuplicate, handleNodeConfigure]);

    // Listen for add-node-from-palette events from sidebar
    useEffect(() => {
        const handleAddFromPalette = (e: CustomEvent<SubNodeDefinition>) => {
            addNodeFromPalette(e.detail);
        };
        window.addEventListener('add-node-from-palette', handleAddFromPalette as EventListener);
        return () => {
            window.removeEventListener('add-node-from-palette', handleAddFromPalette as EventListener);
        };
    }, [addNodeFromPalette]);

    // Connection handler
    const onConnect = useCallback(
        (params: Connection) => {
            if (readOnly) return;

            const sourceNode = nodes.find((n) => n.id === params.source);
            const sourceCategory = sourceNode?.data?.category || 'structural';
            const edgeStyle = nodeStyleService.getEdgeStyles(sourceCategory, 'process');

            setEdges((eds: Edge[]) =>
                addEdge(
                    {
                        ...params,
                        animated: edgeStyle.animated,
                        style: { stroke: edgeStyle.stroke, strokeWidth: edgeStyle.strokeWidth },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: edgeStyle.stroke,
                        },
                    },
                    eds
                )
            );
        },
        [readOnly, nodes, setEdges]
    );

    // State for selected edge
    const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

    // Click handlers
    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            setSelectedNode(node);
            setSelectedEdge(null); // Clear edge selection when node is clicked
            onNodeSelect?.(node);
        },
        [onNodeSelect]
    );

    const onEdgeClick = useCallback(
        (_: React.MouseEvent, edge: Edge) => {
            setSelectedEdge(edge);
            setSelectedNode(null); // Clear node selection when edge is clicked
        },
        []
    );

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
        setSelectedEdge(null);
        onNodeSelect?.(null);
    }, [onNodeSelect]);

    // Drag & Drop handlers
    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            if (readOnly) return;

            let nodeData = event.dataTransfer.getData('application/json');
            if (!nodeData) {
                nodeData = event.dataTransfer.getData('text/plain');
            }
            if (!nodeData) return;

            try {
                const parsedData = JSON.parse(nodeData) as {
                    nodeId: string;
                    category: string;
                };

                const subNode = getSubNodeById(parsedData.nodeId) ||
                    nodePalette.find((n) => n.nodeId === parsedData.nodeId);

                if (!subNode) return;

                const reactFlowBounds = event.currentTarget.getBoundingClientRect();
                const position = {
                    x: event.clientX - reactFlowBounds.left - 140,
                    y: event.clientY - reactFlowBounds.top - 40,
                };

                const newNode: Node<AxiomNodeData> = {
                    id: `${subNode.nodeId}-${Date.now()}`,
                    type: subNode.category,
                    position,
                    draggable: true, // Explicitly allow dragging
                    selected: true,  // Select immediately for feedback
                    dragHandle: '.custom-drag-handle', // Optional: if we want specific handle, but let's default to whole node for now

                    data: {
                        id: `${subNode.nodeId}-${Date.now()}`,
                        nodeId: subNode.nodeId,
                        label: subNode.name,
                        description: subNode.description,
                        category: subNode.category as AxiomNodeData['category'],
                        icon: subNode.icon,
                        features: subNode.features,
                        capabilities: subNode.capabilities,
                        config: { ...subNode.defaultConfig },
                        onDelete: handleNodeDelete,
                        onDuplicate: handleNodeDuplicate,
                        onConfigure: handleNodeConfigure,
                    },
                };

                setNodes((nds: Node[]) => [...nds, newNode]);
            } catch (e) {
                console.error('Failed to parse dropped node data:', e);
            }
        },
        [readOnly, nodePalette, setNodes, handleNodeDelete, handleNodeDuplicate, handleNodeConfigure]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    // Toolbar actions
    const handleSave = useCallback(() => {
        onSave?.(nodes, edges);
        setIsDirty(false);
    }, [nodes, edges, onSave]);

    // Listen for external save trigger from parent component
    useEffect(() => {
        const handleExternalSave = () => handleSave();
        window.addEventListener('workflow-save', handleExternalSave);
        return () => window.removeEventListener('workflow-save', handleExternalSave);
    }, [handleSave]);

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setNodes(prevState.nodes);
            setEdges(prevState.edges);
            setHistoryIndex(historyIndex - 1);
        }
    }, [history, historyIndex, setNodes, setEdges]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setNodes(nextState.nodes);
            setEdges(nextState.edges);
            setHistoryIndex(historyIndex + 1);
        }
    }, [history, historyIndex, setNodes, setEdges]);

    const handleDeleteSelected = useCallback(() => {
        if (readOnly) return;

        if (selectedNode) {
            handleNodeDelete(selectedNode.id);
            setSelectedNode(null);
            toast.success('Node deleted');
        } else if (selectedEdge) {
            setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
            setSelectedEdge(null);
            toast.success('Connection deleted');
        }
    }, [readOnly, selectedNode, selectedEdge, handleNodeDelete, setEdges]);

    // Keyboard handler for Delete/Backspace
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (readOnly) return;

            // Don't trigger if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                handleDeleteSelected();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [readOnly, handleDeleteSelected]);

    const handleDuplicateSelected = useCallback(() => {
        if (selectedNode) {
            handleNodeDuplicate(selectedNode.id);
        }
    }, [selectedNode, handleNodeDuplicate]);

    // Memoize node types with handlers
    const enhancedNodeTypes = useMemo(() => axiomNodeTypes, []);

    return (
        <div className="workflow-builder-container" style={{ width: '100%', height: '100%' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={readOnly ? undefined : onNodesChange}
                onEdgesChange={readOnly ? undefined : onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onNodeDoubleClick={(_, node) => handleNodeConfigure(node.id)}
                onPaneClick={onPaneClick}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={enhancedNodeTypes}
                nodesDraggable={!readOnly}
                nodesConnectable={!readOnly}
                elementsSelectable={!readOnly}
                deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
                selectionKeyCode={['Shift']}
                multiSelectionKeyCode={['Meta', 'Control']}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                proOptions={{ hideAttribution: true }}
                snapToGrid
                snapGrid={[20, 20]}
                className="axiom-workflow-canvas"
                style={{
                    background: 'var(--color-background)',
                }}
            >
                {/* Background Grid */}
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="var(--color-border)"
                />

                {/* Controls */}
                <Controls
                    showInteractive={false}
                    style={{
                        background: 'var(--color-surface)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-md)',
                    }}
                />

                {/* MiniMap */}
                <MiniMap
                    nodeColor={minimapNodeColor}
                    maskColor="rgba(0, 0, 0, 0.6)"
                    style={{
                        background: 'var(--color-surface)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                    }}
                />

                {/* Toolbar Panel */}
                {!readOnly && (
                    <Panel position="top-right" className="workflow-toolbar">
                        <div
                            style={{
                                display: 'flex',
                                gap: 'var(--spacing-2)',
                                padding: 'var(--spacing-2)',
                                background: 'var(--color-surface)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: 'var(--shadow-md)',
                            }}
                        >
                            <button
                                onClick={handleSave}
                                title="Save Workflow"
                                className="workflow-toolbar-btn"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '36px',
                                    height: '36px',
                                    background: isDirty ? 'var(--color-primary)' : 'transparent',
                                    color: isDirty ? 'white' : 'var(--text-secondary)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Save size={18} />
                            </button>
                            <div style={{ width: '1px', background: 'var(--border-primary)' }} />
                            <button
                                onClick={handleUndo}
                                title="Undo"
                                disabled={historyIndex <= 0}
                                className="workflow-toolbar-btn"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '36px',
                                    height: '36px',
                                    background: 'transparent',
                                    color: historyIndex <= 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Undo size={18} />
                            </button>
                            <button
                                onClick={handleRedo}
                                title="Redo"
                                disabled={historyIndex >= history.length - 1}
                                className="workflow-toolbar-btn"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '36px',
                                    height: '36px',
                                    background: 'transparent',
                                    color: historyIndex >= history.length - 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Redo size={18} />
                            </button>
                            <div style={{ width: '1px', background: 'var(--border-primary)' }} />
                            <button
                                onClick={handleDuplicateSelected}
                                title="Duplicate Selected"
                                disabled={!selectedNode}
                                className="workflow-toolbar-btn"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '36px',
                                    height: '36px',
                                    background: 'transparent',
                                    color: !selectedNode ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: !selectedNode ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Copy size={18} />
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                title="Delete Selected"
                                disabled={!selectedNode}
                                className="workflow-toolbar-btn"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '36px',
                                    height: '36px',
                                    background: 'transparent',
                                    color: !selectedNode ? 'var(--text-tertiary)' : 'var(--color-error)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: !selectedNode ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </Panel>
                )}

                {/* Status Panel */}
                <Panel position="bottom-left">
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-3)',
                            padding: 'var(--spacing-2) var(--spacing-3)',
                            background: 'var(--glass-bg)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-tertiary)',
                        }}
                    >
                        <span>{nodes.length} nodes</span>
                        <span>•</span>
                        <span>{edges.length} connections</span>
                        {isDirty && (
                            <>
                                <span>•</span>
                                <span style={{ color: 'var(--color-warning)' }}>Unsaved changes</span>
                            </>
                        )}
                    </div>
                </Panel>
            </ReactFlow>

            {/* Node Configuration Modal */}
            <NodeConfigurationModal
                isOpen={isConfigModalOpen}
                onClose={() => {
                    setIsConfigModalOpen(false);
                    setConfigModalNode(null);
                }}
                node={configModalNode}
                onSave={handleNodeUpdate}
            />

            {/* Floating Add Node Button */}
            {!readOnly && (
                <button
                    onClick={() => setShowAddNodeModal(true)}
                    className="fixed bottom-8 right-8 flex items-center gap-2 px-5 py-3 
                               bg-gradient-to-r from-purple-600 to-violet-600 text-white 
                               font-semibold rounded-full shadow-2xl shadow-purple-500/40
                               hover:shadow-purple-500/60 hover:scale-105 
                               transition-all duration-300 z-40"
                    title="Add new node to canvas"
                >
                    <Plus size={20} />
                    <span>Add Node</span>
                </button>
            )}

            {/* Add Node Modal - Lekhika Pattern */}
            {showAddNodeModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setShowAddNodeModal(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[80vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        style={{ animation: 'modalSlideIn 0.3s ease-out' }}
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Plus className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Add Node</h2>
                                    <p className="text-sm text-white/80">Click on a node type to add it to your workflow</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddNodeModal(false)}
                                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Modal Content - Node Categories */}
                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
                            <div className="space-y-6">
                                {/* Trigger Nodes */}
                                <div>
                                    <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                        Triggers
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {getSubNodesByCategory('trigger').map((node) => (
                                            <button
                                                key={node.nodeId}
                                                onClick={() => addNodeFromPalette(node)}
                                                className="flex flex-col items-start p-4 bg-amber-50 dark:bg-amber-900/20 
                                                           rounded-xl border-2 border-transparent hover:border-amber-400 
                                                           transition-all duration-200 group text-left"
                                            >
                                                <span className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-amber-600">{node.name}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{node.description}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Input Nodes */}
                                <div>
                                    <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        Inputs
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {getSubNodesByCategory('input').map((node) => (
                                            <button
                                                key={node.nodeId}
                                                onClick={() => addNodeFromPalette(node)}
                                                className="flex flex-col items-start p-4 bg-blue-50 dark:bg-blue-900/20 
                                                           rounded-xl border-2 border-transparent hover:border-blue-400 
                                                           transition-all duration-200 group text-left"
                                            >
                                                <span className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-blue-600">{node.name}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{node.description}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Process Nodes (AI) */}
                                <div>
                                    <h3 className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                                        AI Processing
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {getSubNodesByCategory('process').map((node) => (
                                            <button
                                                key={node.nodeId}
                                                onClick={() => addNodeFromPalette(node)}
                                                className="flex flex-col items-start p-4 bg-purple-50 dark:bg-purple-900/20 
                                                           rounded-xl border-2 border-transparent hover:border-purple-400 
                                                           transition-all duration-200 group text-left"
                                            >
                                                <span className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-purple-600">{node.name}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{node.description}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Condition Nodes */}
                                <div>
                                    <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        Conditions & Logic
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {getSubNodesByCategory('condition').map((node) => (
                                            <button
                                                key={node.nodeId}
                                                onClick={() => addNodeFromPalette(node)}
                                                className="flex flex-col items-start p-4 bg-emerald-50 dark:bg-emerald-900/20 
                                                           rounded-xl border-2 border-transparent hover:border-emerald-400 
                                                           transition-all duration-200 group text-left"
                                            >
                                                <span className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-emerald-600">{node.name}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{node.description}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Preview Nodes */}
                                <div>
                                    <h3 className="text-sm font-bold text-yellow-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                        Preview & Review
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {getSubNodesByCategory('preview').map((node) => (
                                            <button
                                                key={node.nodeId}
                                                onClick={() => addNodeFromPalette(node)}
                                                className="flex flex-col items-start p-4 bg-yellow-50 dark:bg-yellow-900/20 
                                                           rounded-xl border-2 border-transparent hover:border-yellow-400 
                                                           transition-all duration-200 group text-left"
                                            >
                                                <span className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-yellow-600">{node.name}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{node.description}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Output Nodes */}
                                <div>
                                    <h3 className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                                        Outputs & Delivery
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {getSubNodesByCategory('output').map((node) => (
                                            <button
                                                key={node.nodeId}
                                                onClick={() => addNodeFromPalette(node)}
                                                className="flex flex-col items-start p-4 bg-rose-50 dark:bg-rose-900/20 
                                                           rounded-xl border-2 border-transparent hover:border-rose-400 
                                                           transition-all duration-200 group text-left"
                                            >
                                                <span className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-rose-600">{node.name}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{node.description}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Animation Styles */}
            <style>{`
                @keyframes modalSlideIn {
                    from {
                        transform: scale(0.95) translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1) translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}

// ============================================================================
// WRAPPER WITH PROVIDER
// ============================================================================

export default function WorkflowBuilder(props: WorkflowBuilderProps) {
    return (
        <ReactFlowProvider>
            <WorkflowBuilderInner {...props} />
        </ReactFlowProvider>
    );
}
