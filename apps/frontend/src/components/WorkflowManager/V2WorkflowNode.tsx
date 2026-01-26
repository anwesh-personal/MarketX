'use client';

/**
 * V2 WORKFLOW NODE
 * Custom ReactFlow node component for V2 nodes
 * Premium design with category colors, icons, and handles
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Settings, Trash2 } from 'lucide-react';

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
    const Icon = data.icon;

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
                    <span className="v2-node-type">{data.nodeType}</span>
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

            {/* Actions (shown on hover) */}
            <div className="v2-node-actions">
                <button className="v2-node-action" title="Configure">
                    <Settings size={12} />
                </button>
                <button className="v2-node-action v2-node-action-danger" title="Delete">
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
