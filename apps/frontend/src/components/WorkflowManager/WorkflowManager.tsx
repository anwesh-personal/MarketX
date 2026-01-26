'use client';

/**
 * WORKFLOW MANAGER V2
 * Premium workflow builder with ReactFlow canvas
 * Features: Add Node Modal, My Flows Sidebar, Full-screen canvas
 * 
 * Theme-aware, ultra-awesome experience
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
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
    Plus, Folder, Save, Play, Undo, Redo,
    ZoomIn, ZoomOut, Maximize, Settings,
    Workflow, Download, Upload
} from 'lucide-react';

import { AddNodeModal } from './AddNodeModal';
import { MyFlowsSidebar, SavedFlow } from './MyFlowsSidebar';
import { V2NodeDefinition, V2_CATEGORY_META } from './v2-node-definitions';
import { V2WorkflowNode } from './V2WorkflowNode';

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

// ============================================================================
// NODE TYPES
// ============================================================================

const nodeTypes: NodeTypes = {
    v2Node: V2WorkflowNode,
};

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialNodes: Node<V2NodeData>[] = [];
const initialEdges: Edge[] = [];

// Mock data for flows
const mockFlows: SavedFlow[] = [
    {
        id: '1',
        name: 'Email Reply Engine',
        description: 'Automated email reply workflow',
        category: 'Recent',
        nodeCount: 8,
        createdAt: '2026-01-25T10:00:00Z',
        updatedAt: '2026-01-26T09:30:00Z',
    },
    {
        id: '2',
        name: 'Lead Nurture Flow',
        description: '5-email nurture sequence',
        category: 'Email',
        nodeCount: 12,
        createdAt: '2026-01-20T14:00:00Z',
        updatedAt: '2026-01-24T16:45:00Z',
    },
    {
        id: '3',
        name: 'Content Generator',
        description: 'Blog + Social content pipeline',
        category: 'Content',
        nodeCount: 15,
        createdAt: '2026-01-18T09:00:00Z',
        updatedAt: '2026-01-23T11:20:00Z',
    },
];

const mockTemplates: SavedFlow[] = [
    {
        id: 't1',
        name: 'Email Reply Bundle',
        description: 'Complete email reply system',
        category: 'Email',
        nodeCount: 9,
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
        isTemplate: true,
    },
    {
        id: 't2',
        name: 'Website Page Generator',
        description: 'Landing page creation workflow',
        category: 'Website',
        nodeCount: 11,
        createdAt: '2026-01-15T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
        isTemplate: true,
    },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkflowManager() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Modal/Sidebar state
    const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);
    const [isMyFlowsOpen, setIsMyFlowsOpen] = useState(false);

    // Flow state
    const [currentFlowName, setCurrentFlowName] = useState('Untitled Flow');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

    // Select flow from sidebar
    const handleSelectFlow = useCallback((flow: SavedFlow) => {
        console.log('Selected flow:', flow);
        setCurrentFlowName(flow.name);
        setIsMyFlowsOpen(false);
        // TODO: Load flow nodes and edges from database
    }, []);

    // Create new flow
    const handleNewFlow = useCallback(() => {
        setNodes([]);
        setEdges([]);
        setCurrentFlowName('Untitled Flow');
        setHasUnsavedChanges(false);
        setIsMyFlowsOpen(false);
    }, [setNodes, setEdges]);

    // Save flow
    const handleSaveFlow = useCallback(() => {
        console.log('Saving flow:', { nodes, edges });
        setHasUnsavedChanges(false);
        // TODO: Save to database
    }, [nodes, edges]);

    // Execute flow
    const handleExecuteFlow = useCallback(() => {
        console.log('Executing flow...');
        // TODO: Call execution API
    }, []);

    // Minimap node color
    const minimapNodeColor = useCallback((node: Node) => {
        const data = node.data as V2NodeData;
        return data?.color || 'var(--color-accent)';
    }, []);

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
                        onClick={() => setIsMyFlowsOpen(true)}
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
                        onClick={handleExecuteFlow}
                        disabled={nodes.length === 0}
                        style={{ opacity: nodes.length > 0 ? 1 : 0.5 }}
                    >
                        <Play size={16} />
                    </button>
                </div>
            </div>

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
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '60px 40px',
                                marginTop: '100px',
                                background: 'var(--color-surface)',
                                border: '2px dashed var(--color-border)',
                                borderRadius: '16px',
                                textAlign: 'center',
                            }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'var(--color-glow)',
                                    borderRadius: '16px',
                                    marginBottom: '20px',
                                }}>
                                    <Workflow size={32} color="var(--color-accent)" />
                                </div>
                                <h3 style={{
                                    margin: '0 0 8px',
                                    color: 'var(--color-text-primary)',
                                    fontSize: '1.25rem'
                                }}>
                                    Start Building Your Workflow
                                </h3>
                                <p style={{
                                    margin: '0 0 24px',
                                    color: 'var(--color-text-secondary)',
                                    fontSize: '0.9375rem'
                                }}>
                                    Click "Add Node" to add your first node, or load an existing flow
                                </p>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        className="wm-btn wm-btn-primary"
                                        onClick={() => setIsAddNodeModalOpen(true)}
                                    >
                                        <Plus size={16} />
                                        Add Node
                                    </button>
                                    <button
                                        className="wm-btn wm-btn-secondary"
                                        onClick={() => setIsMyFlowsOpen(true)}
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

            {/* Add Node Modal */}
            <AddNodeModal
                isOpen={isAddNodeModalOpen}
                onClose={() => setIsAddNodeModalOpen(false)}
                onAddNode={handleAddNode}
            />

            {/* My Flows Sidebar */}
            <MyFlowsSidebar
                isOpen={isMyFlowsOpen}
                onClose={() => setIsMyFlowsOpen(false)}
                onSelectFlow={handleSelectFlow}
                onNewFlow={handleNewFlow}
                flows={mockFlows}
                templates={mockTemplates}
            />
        </div>
    );
}

export default WorkflowManager;
