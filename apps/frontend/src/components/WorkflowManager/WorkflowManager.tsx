'use client';

/**
 * WORKFLOW MANAGER V2
 * Premium workflow builder with ReactFlow canvas
 * 
 * - Add Node Modal with 36 categorized V2 nodes
 * - My Flows Panel INSIDE the canvas (not fixed overlay)
 * - Fetches real workflow templates from API
 * 
 * Theme-aware, ultra-awesome experience
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import './workflow-manager.css';

import {
    Plus, Folder, Save, Play, X,
    Workflow, ChevronRight, Clock, Layout,
    Search, Loader2, AlertCircle
} from 'lucide-react';

import { AddNodeModal } from './AddNodeModal';
import { V2NodeDefinition, V2_CATEGORY_META, V2_ALL_NODES } from './v2-node-definitions';
import { V2WorkflowNode } from './V2WorkflowNode';
import { superadminFetch } from '@/lib/superadmin-auth';

// ============================================================================
// TYPES
// ============================================================================

interface V2NodeData {
    label: string;
    nodeType: string;
    category: string;
    icon: React.ComponentType<any>;
    color: string;
    config: Record<string, any>;
    features: string[];
}

interface WorkflowTemplate {
    id: string;
    name: string;
    description?: string;
    category?: string;
    nodes: any[];
    edges: any[];
    created_at: string;
    updated_at: string;
}

// ============================================================================
// NODE TYPES
// ============================================================================

const nodeTypes: NodeTypes = {
    v2Node: V2WorkflowNode,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkflowManager() {
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

    // ========================================================================
    // FETCH WORKFLOWS
    // ========================================================================

    const fetchWorkflows = useCallback(async () => {
        setIsLoadingWorkflows(true);
        setWorkflowError(null);

        try {
            const response = await superadminFetch('/api/superadmin/workflows');
            if (!response.ok) {
                throw new Error('Failed to fetch workflows');
            }
            const result = await response.json();
            // API returns { success: true, data: [...], count: N }
            setWorkflows(result.data || result.templates || []);
        } catch (error: any) {
            console.error('Error fetching workflows:', error);
            setWorkflowError(error.message);
        } finally {
            setIsLoadingWorkflows(false);
        }
    }, []);

    // Fetch on mount and when panel opens
    useEffect(() => {
        if (isFlowsPanelOpen && workflows.length === 0) {
            fetchWorkflows();
        }
    }, [isFlowsPanelOpen, workflows.length, fetchWorkflows]);

    // ========================================================================
    // FLOW HANDLERS
    // ========================================================================

    // Handle edge connections
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
            },
        };

        setNodes((nds) => [...nds, newNode]);
        setHasUnsavedChanges(true);
    }, [setNodes]);

    // Load workflow from template
    const handleLoadWorkflow = useCallback((workflow: WorkflowTemplate) => {
        // Convert template nodes to V2 nodes with proper icon mapping
        const loadedNodes: Node<V2NodeData>[] = (workflow.nodes || []).map((node: any, index: number) => {
            // Find matching V2 node definition
            const v2NodeDef = V2_ALL_NODES.find(n => n.nodeType === node.data?.nodeType);

            return {
                id: node.id || `node-${index}`,
                type: 'v2Node',
                position: node.position || { x: 100 + index * 200, y: 100 },
                data: {
                    label: node.data?.label || v2NodeDef?.name || 'Unknown Node',
                    nodeType: node.data?.nodeType || 'unknown',
                    category: node.data?.category || v2NodeDef?.category || 'process',
                    icon: v2NodeDef?.icon || Workflow,
                    color: node.data?.color || v2NodeDef?.color || '#8B5CF6',
                    config: node.data?.config || {},
                    features: node.data?.features || v2NodeDef?.features || [],
                },
            };
        });

        setNodes(loadedNodes);
        setEdges(workflow.edges || []);
        setCurrentFlowId(workflow.id);
        setCurrentFlowName(workflow.name);
        setHasUnsavedChanges(false);
        setIsFlowsPanelOpen(false);
    }, [setNodes, setEdges]);

    // Create new flow
    const handleNewFlow = useCallback(() => {
        setNodes([]);
        setEdges([]);
        setCurrentFlowId(null);
        setCurrentFlowName('Untitled Flow');
        setHasUnsavedChanges(false);
        setIsFlowsPanelOpen(false);
    }, [setNodes, setEdges]);

    // Save flow
    const handleSaveFlow = useCallback(async () => {
        try {
            const payload = {
                id: currentFlowId,
                name: currentFlowName,
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.type,
                    position: n.position,
                    data: {
                        label: n.data.label,
                        nodeType: n.data.nodeType,
                        category: n.data.category,
                        color: n.data.color,
                        config: n.data.config,
                        features: n.data.features,
                    }
                })),
                edges,
            };

            const response = await superadminFetch('/api/superadmin/workflows', {
                method: currentFlowId ? 'PATCH' : 'POST',
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const saved = await response.json();
                setCurrentFlowId(saved.id);
                setHasUnsavedChanges(false);
                fetchWorkflows(); // Refresh list
            }
        } catch (error) {
            console.error('Error saving flow:', error);
        }
    }, [currentFlowId, currentFlowName, nodes, edges, fetchWorkflows]);

    // Minimap node color
    const minimapNodeColor = useCallback((node: Node) => {
        const data = node.data as V2NodeData;
        return data?.color || 'var(--color-accent)';
    }, []);

    // Filter workflows
    const filteredWorkflows = workflows.filter(w =>
        !searchQuery ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Format date
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

                    <span style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        {currentFlowName}
                        {hasUnsavedChanges && (
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: 'var(--color-warning)'
                            }} />
                        )}
                    </span>
                </div>

                <div className="wm-toolbar-right">
                    <button
                        className="wm-btn wm-btn-secondary"
                        onClick={() => setIsFlowsPanelOpen(!isFlowsPanelOpen)}
                    >
                        <Folder size={16} />
                        My Flows
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
                        disabled={!hasUnsavedChanges}
                        style={{ opacity: hasUnsavedChanges ? 1 : 0.5 }}
                    >
                        <Save size={16} />
                    </button>

                    <button
                        className="wm-btn wm-btn-ghost"
                        onClick={() => console.log('Execute')}
                        disabled={nodes.length === 0}
                        style={{ opacity: nodes.length > 0 ? 1 : 0.5 }}
                    >
                        <Play size={16} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="wm-main-content">
                {/* Flows Panel - INSIDE the canvas area */}
                {isFlowsPanelOpen && (
                    <div className="wm-flows-panel">
                        {/* Panel Header */}
                        <div className="wm-flows-panel-header">
                            <h3>My Flows</h3>
                            <button
                                className="wm-flows-panel-close"
                                onClick={() => setIsFlowsPanelOpen(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="wm-flows-panel-search">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search workflows..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* New Flow Button */}
                        <button className="wm-flows-new-btn" onClick={handleNewFlow}>
                            <Plus size={16} />
                            New Flow
                        </button>

                        {/* Flows List */}
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
                                </div>
                            ) : (
                                filteredWorkflows.map((workflow) => (
                                    <div
                                        key={workflow.id}
                                        className={`wm-flow-item ${currentFlowId === workflow.id ? 'active' : ''}`}
                                        onClick={() => handleLoadWorkflow(workflow)}
                                    >
                                        <div className="wm-flow-item-main">
                                            <h4>{workflow.name}</h4>
                                            {workflow.description && (
                                                <p>{workflow.description}</p>
                                            )}
                                            <div className="wm-flow-item-meta">
                                                <span>
                                                    <Layout size={12} />
                                                    {workflow.nodes?.length || 0} nodes
                                                </span>
                                                <span>
                                                    <Clock size={12} />
                                                    {formatDate(workflow.updated_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="wm-flow-item-arrow" />
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
                        nodeTypes={nodeTypes}
                        fitView
                        className="wm-reactflow"
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            animated: true,
                            style: { stroke: 'var(--color-accent)', strokeWidth: 2 }
                        }}
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
                                    <p>Click "Add Node" to add your first node, or load an existing flow</p>
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
        </div>
    );
}

export default WorkflowManager;
