'use client';

/**
 * V2 WORKFLOW NODE
 * Custom ReactFlow node component for V2 nodes
 * 
 * Features:
 * - Premium design with category colors and icons
 * - Working Configure and Delete buttons
 * - Emits events for parent component handling
 * - Proper handle positioning
 * 
 * @author Axiom AI
 */

import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { Settings, Trash2, GripVertical } from 'lucide-react';

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
// COMPONENT
// ============================================================================

function V2WorkflowNodeComponent({
    id,
    data,
    selected
}: NodeProps<V2NodeData>) {
    const { deleteElements } = useReactFlow();
    const Icon = data.icon;

    // Handle delete
    const handleDelete = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        deleteElements({ nodes: [{ id }] });
    }, [id, deleteElements]);

    // Handle configure (emit custom event for parent)
    const handleConfigure = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        // Dispatch custom event for parent component
        window.dispatchEvent(new CustomEvent('nodeConfigureRequest', {
            detail: { nodeId: id, nodeData: data }
        }));
    }, [id, data]);

    return (
        <div
            className={`v2-workflow-node ${selected ? 'selected' : ''}`}
            style={{
                '--node-color': data.color,
            } as React.CSSProperties}
        >
            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                className="v2-node-handle v2-node-handle-input"
            />

            {/* Drag Handle Indicator */}
            <div className="v2-node-drag-handle">
                <GripVertical size={12} />
            </div>

            {/* Node Content */}
            <div className="v2-node-header">
                <div
                    className="v2-node-icon"
                    style={{ background: data.color }}
                >
                    {Icon && <Icon size={16} color="white" />}
                </div>
                <div className="v2-node-info">
                    <span className="v2-node-label">{data.label}</span>
                    <span className="v2-node-type">{data.category}</span>
                </div>
            </div>

            {/* Features */}
            {data.features && data.features.length > 0 && (
                <div className="v2-node-features">
                    {data.features.slice(0, 2).map((feature, i) => (
                        <span key={i} className="v2-node-feature">{feature}</span>
                    ))}
                </div>
            )}

            {/* Actions - Always visible when selected, show on hover otherwise */}
            <div className="v2-node-actions">
                <button
                    className="v2-node-action"
                    title="Configure node"
                    onClick={handleConfigure}
                >
                    <Settings size={12} />
                </button>
                <button
                    className="v2-node-action v2-node-action-danger"
                    title="Delete node"
                    onClick={handleDelete}
                >
                    <Trash2 size={12} />
                </button>
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                className="v2-node-handle v2-node-handle-output"
            />
        </div>
    );
}

export const V2WorkflowNode = memo(V2WorkflowNodeComponent);
export default V2WorkflowNode;
