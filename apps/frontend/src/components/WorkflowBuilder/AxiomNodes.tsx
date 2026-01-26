'use client';

/**
 * AXIOM NODES - PREMIUM WORKFLOW NODES
 * Based on Tommy's schema: node_palette table
 * Categories: trigger, input, process, condition, preview, output
 * Colors: primary, success, warning, error, info, accent
 */

import React, { useState, memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
    // Core icons
    Settings, Copy, Zap, Brain, Sparkles, Play, X, Trash2,
    // Trigger icons
    Webhook, Clock,
    // Resolver icons (NEW)
    Target, Tag, Compass, Layout, MousePointer,
    // Generator icons
    FileText, Layers, Mail, Reply, Share2,
    // Processor icons
    Search, Globe, TrendingUp, Lock,
    // Validator icons
    Shield, CheckCircle,
    // Condition icons
    GitBranch, Split, Shuffle,
    // Output icons
    Send, Database, BarChart3,
    // Legacy (for backward compatibility)
    Eye, Upload, RefreshCw, Download, Calendar,
} from 'lucide-react';

// ============================================================================
// TYPES - Aligned with Tommy's schema
// ============================================================================

export interface AxiomNodeData {
    id?: string;
    label: string;
    nodeType?: string;       // From Tommy's schema: the node_id like 'email-trigger'
    nodeId?: string;         // Same as nodeType, for compatibility
    description?: string;
    category?: 'trigger' | 'input' | 'process' | 'condition' | 'preview' | 'output';
    icon?: string;
    color?: string;          // Tommy's color tokens: primary, success, warning, error, info, accent
    features?: string[];
    capabilities?: string[];
    config?: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error';
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onConfigure?: (id: string) => void;
}

// ============================================================================
// ICON MAPPING - From Tommy's node_palette.icon field
// ============================================================================

const iconMap: Record<string, React.ComponentType<any>> = {
    // === TRIGGER ICONS ===
    Webhook, Clock, Play,
    // === RESOLVER ICONS (Input category) ===
    Target, Tag, Compass, Layout, MousePointer,
    // === GENERATOR ICONS (Process category) ===
    FileText, Layers, Mail, Reply, Share2,
    // === PROCESSOR ICONS (Process category) ===
    Search, Globe, TrendingUp, Lock,
    // === VALIDATOR ICONS (Condition category) ===
    Shield, CheckCircle,
    // === CONDITION ICONS ===
    GitBranch, Split, Shuffle,
    // === OUTPUT ICONS ===
    Send, Database, BarChart3,
    // === LEGACY (backward compatibility) ===
    Settings, Brain, Eye, Upload, RefreshCw, Download, Calendar, Zap, Sparkles,
};

// ============================================================================
// TOMMY'S NODE PALETTE - Mapping node_id to category and color
// Sourced directly from workflow-engine-tables.sql seed data
// ============================================================================

interface NodePaletteEntry {
    category: 'trigger' | 'input' | 'process' | 'condition' | 'preview' | 'output';
    color: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'accent';
    icon: string;
    name: string;
}

const NODE_PALETTE: Record<string, NodePaletteEntry> = {
    // =========================================================================
    // TRIGGERS (3)
    // =========================================================================
    'webhook-trigger': { category: 'trigger', color: 'warning', icon: 'Webhook', name: 'Webhook Trigger' },
    'schedule-trigger': { category: 'trigger', color: 'warning', icon: 'Clock', name: 'Schedule Trigger' },
    'manual-trigger': { category: 'trigger', color: 'info', icon: 'Play', name: 'Manual Trigger' },

    // =========================================================================
    // RESOLVERS (5) - KB lookup nodes
    // =========================================================================
    'resolve-icp': { category: 'input', color: 'info', icon: 'Target', name: 'Resolve ICP' },
    'resolve-offer': { category: 'input', color: 'info', icon: 'Tag', name: 'Resolve Offer' },
    'resolve-angle': { category: 'input', color: 'info', icon: 'Compass', name: 'Select Angle' },
    'resolve-blueprint': { category: 'input', color: 'info', icon: 'Layout', name: 'Select Blueprint' },
    'resolve-cta': { category: 'input', color: 'info', icon: 'MousePointer', name: 'Select CTA' },

    // =========================================================================
    // GENERATORS (5) - Content-specific generation
    // =========================================================================
    'generate-website-page': { category: 'process', color: 'primary', icon: 'FileText', name: 'Generate Page' },
    'generate-website-bundle': { category: 'process', color: 'primary', icon: 'Layers', name: 'Generate Website' },
    'generate-email-flow': { category: 'process', color: 'primary', icon: 'Mail', name: 'Generate Email Flow' },
    'generate-email-reply': { category: 'process', color: 'primary', icon: 'Reply', name: 'Generate Reply' },
    'generate-social-post': { category: 'process', color: 'primary', icon: 'Share2', name: 'Generate Social' },

    // =========================================================================
    // PROCESSORS (4) - Data transformation
    // =========================================================================
    'analyze-intent': { category: 'process', color: 'accent', icon: 'Search', name: 'Analyze Intent' },
    'web-search': { category: 'process', color: 'accent', icon: 'Globe', name: 'Web Research' },
    'seo-optimize': { category: 'process', color: 'accent', icon: 'TrendingUp', name: 'SEO Optimizer' },
    'add-content-locker': { category: 'process', color: 'accent', icon: 'Lock', name: 'Content Locker' },

    // =========================================================================
    // VALIDATORS (2) - Quality and compliance
    // =========================================================================
    'validate-constitution': { category: 'condition', color: 'error', icon: 'Shield', name: 'Constitution Check' },
    'validate-quality': { category: 'condition', color: 'success', icon: 'CheckCircle', name: 'Quality Gate' },

    // =========================================================================
    // CONDITIONS (3) - Branching logic
    // =========================================================================
    'route-by-stage': { category: 'condition', color: 'accent', icon: 'GitBranch', name: 'Route by Stage' },
    'route-by-validation': { category: 'condition', color: 'accent', icon: 'Split', name: 'Route by Validation' },
    'route-by-type': { category: 'condition', color: 'accent', icon: 'Shuffle', name: 'Route by Type' },

    // =========================================================================
    // OUTPUTS (3) - Terminal nodes
    // =========================================================================
    'output-webhook': { category: 'output', color: 'success', icon: 'Send', name: 'Send Webhook' },
    'output-store': { category: 'output', color: 'success', icon: 'Database', name: 'Store Content' },
    'output-analytics': { category: 'output', color: 'success', icon: 'BarChart3', name: 'Log Analytics' },

    // =========================================================================
    // LEGACY (backward compatibility with existing templates)
    // =========================================================================
    'email-trigger': { category: 'trigger', color: 'warning', icon: 'Mail', name: 'Email Received' },
    'generate-llm': { category: 'process', color: 'primary', icon: 'Brain', name: 'Generate (LLM)' },
    'retrieve-kb': { category: 'process', color: 'success', icon: 'Database', name: 'Retrieve from KB' },
    'output-n8n': { category: 'output', color: 'success', icon: 'Send', name: 'Return to n8n' },
};

// ============================================================================
// COLOR SCHEME - Tommy's Axiom color tokens mapped to actual colors
// ============================================================================

const AXIOM_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    primary: { bg: 'var(--color-surface)', border: 'var(--color-info)', text: 'var(--color-text-primary)' },    // Blue -> Info (Primary in global is neutral)
    success: { bg: 'var(--color-surface)', border: 'var(--color-success)', text: 'var(--color-text-primary)' },
    warning: { bg: 'var(--color-surface)', border: 'var(--color-warning)', text: 'var(--color-text-primary)' },
    error: { bg: 'var(--color-surface)', border: 'var(--color-error)', text: 'var(--color-text-primary)' },
    info: { bg: 'var(--color-surface)', border: 'var(--color-info)', text: 'var(--color-text-primary)' },
    accent: { bg: 'var(--color-surface)', border: 'var(--color-accent)', text: 'var(--color-text-primary)' },
};

// Category to default color mapping
const CATEGORY_DEFAULT_COLORS: Record<string, string> = {
    trigger: 'warning',
    input: 'info',
    process: 'primary',
    condition: 'accent',
    preview: 'warning',
    output: 'success',
};

// Category icons
const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
    trigger: Zap,
    input: FileText,
    process: Brain,
    condition: GitBranch,
    preview: Eye,
    output: Send,
};

// ============================================================================
// HELPER: Get node info from palette or infer
// ============================================================================

function getNodeInfo(nodeType: string | undefined, data: AxiomNodeData) {
    // Try to find in palette using nodeType or data.nodeType
    const lookupKey = nodeType || data?.nodeType || data?.nodeId || '';
    const paletteEntry = NODE_PALETTE[lookupKey];

    if (paletteEntry) {
        return {
            category: paletteEntry.category,
            colorToken: paletteEntry.color,
            colors: AXIOM_COLORS[paletteEntry.color],
            icon: iconMap[paletteEntry.icon] || CATEGORY_ICONS[paletteEntry.category],
            displayName: paletteEntry.name,
        };
    }

    // Fallback: use data.category if provided
    const category = data?.category || 'process';
    const colorToken = data?.color || CATEGORY_DEFAULT_COLORS[category] || 'primary';

    return {
        category,
        colorToken,
        colors: AXIOM_COLORS[colorToken] || AXIOM_COLORS.primary,
        icon: data?.icon && iconMap[data.icon] ? iconMap[data.icon] : CATEGORY_ICONS[category] || Brain,
        displayName: data?.label || lookupKey || 'Node',
    };
}

// ============================================================================
// AXIOM NODE COMPONENT
// ============================================================================

const AxiomNodeComponent: React.FC<NodeProps<AxiomNodeData>> = ({ data, selected, id, type }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Get node info from palette or infer
    const nodeInfo = getNodeInfo(type, data);
    const { category, colors, icon: IconComponent, displayName } = nodeInfo;

    const label = data?.label || displayName;
    const description = data?.description || `${category.charAt(0).toUpperCase() + category.slice(1)} node`;

    const handleConfigure = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Always use event-based approach for reliable communication with WorkflowBuilder
        // This avoids stale closure issues when onConfigure might reference old node arrays
        console.log('Node clicked - dispatching configure event for node:', id);
        window.dispatchEvent(new CustomEvent('node-configure', { detail: { nodeId: id } }));
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(JSON.stringify({ type, data }));
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log('Delete clicked for node:', id);
        window.dispatchEvent(new CustomEvent('node-delete', { detail: { nodeId: id } }));
    };

    // Handle style
    const handleStyle: React.CSSProperties = {
        width: 12,
        height: 12,
        background: colors.border,
        border: '2px solid var(--color-surface)',
        boxShadow: 'var(--shadow-sm)',
    };

    return (
        <div
            style={{
                transform: selected ? 'scale(1.02)' : isHovered ? 'scale(1.01)' : 'scale(1)',
                transition: 'transform 0.15s ease',
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* HANDLES - Standard 4-handle setup for node connections */}
            {/* Left = Target (receives connections) */}
            <Handle
                type="target"
                position={Position.Left}
                id="left"
                style={{ ...handleStyle, left: -6 }}
            />

            {/* Right = Source (sends connections) */}
            <Handle
                type="source"
                position={Position.Right}
                id="right"
                style={{ ...handleStyle, right: -6 }}
            />

            {/* Top = Target (receives connections from above) */}
            <Handle
                type="target"
                position={Position.Top}
                id="top"
                style={{ ...handleStyle, top: -6 }}
            />

            {/* Bottom = Source (sends connections down) */}
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom"
                style={{ ...handleStyle, bottom: -6 }}
            />

            {/* NODE BODY - Double-click to configure, single click/drag to move */}
            <div
                onDoubleClick={handleConfigure}
                style={{
                    backgroundColor: colors.bg,
                    border: `3px ${selected ? 'solid' : 'dashed'} ${colors.border}`,
                    borderRadius: 12,
                    boxShadow: selected
                        ? `0 0 0 2px ${colors.border}40, var(--shadow-xl)` // Keep 40 opacity on shadow or remove? Hex opacity won't work on var. Using standard shadow.
                        : 'var(--shadow-md)',
                    minWidth: 220,
                    maxWidth: 280,
                    cursor: 'grab',
                    overflow: 'hidden',
                }}
            >
                {/* CATEGORY HEADER */}
                <div
                    style={{
                        background: colors.border,
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '4px 12px',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                    }}
                >
                    {category}
                </div>

                {/* CONTENT */}
                <div style={{ padding: 14 }}>
                    {/* HEADER ROW */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        {/* ICON */}
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                background: colors.border,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <IconComponent style={{ width: 18, height: 18, color: 'white' }} />
                        </div>

                        {/* TITLE */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: colors.text,
                                    lineHeight: 1.2,
                                    marginBottom: 2,
                                }}
                            >
                                {label}
                            </div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: 'var(--color-text-secondary)',
                                }}
                            >
                                {type || data?.nodeType || category}
                            </div>
                        </div>

                        {/* HOVER ACTIONS */}
                        {isHovered && (
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                    onClick={handleConfigure}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 4,
                                        border: 'none',
                                        background: colors.border,
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Settings style={{ width: 12, height: 12 }} />
                                </button>
                                <button
                                    onClick={handleCopy}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 4,
                                        border: `1px solid ${colors.border}`,
                                        background: 'var(--color-surface)',
                                        color: colors.border,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Copy style={{ width: 12, height: 12 }} />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    title="Delete node"
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 4,
                                        border: 'none',
                                        background: '#EF4444',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Trash2 style={{ width: 12, height: 12 }} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* DESCRIPTION */}
                    {description && (
                        <div
                            style={{
                                fontSize: 11,
                                color: 'var(--color-text-secondary)',
                                marginTop: 10,
                                lineHeight: 1.4,
                            }}
                        >
                            {description}
                        </div>
                    )}

                    {/* FEATURES */}
                    {data?.features && data.features.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                            {data.features.slice(0, 3).map((f, i) => (
                                <span
                                    key={i}
                                    style={{
                                        padding: '2px 6px',
                                        background: 'var(--color-surface-hover)',
                                        color: 'var(--color-text-secondary)',
                                        fontSize: 9,
                                        fontWeight: 600,
                                        borderRadius: 4,
                                    }}
                                >
                                    {f}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* CONFIGURE BUTTON */}
                <div
                    style={{
                        padding: '10px 14px',
                        borderTop: `1px solid var(--color-border)`,
                        background: 'var(--color-background)',
                    }}
                >
                    <button
                        onClick={handleConfigure}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: colors.border,
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        <Settings style={{ width: 12, height: 12 }} />
                        CONFIGURE
                    </button>
                </div>

                {/* STATUS INDICATOR */}
                {data?.status && data.status !== 'idle' && (
                    <div
                        style={{
                            height: 3,
                            background:
                                data.status === 'running' ? '#3B82F6'
                                    : data.status === 'success' ? '#10B981'
                                        : '#EF4444',
                        }}
                    />
                )}
            </div>
        </div>
    );
};

// ============================================================================
// NODE TYPE FACTORY
// ============================================================================

export function createAxiomNode(category: string) {
    const NodeComponent: React.FC<NodeProps<AxiomNodeData>> = (props) => (
        <AxiomNodeComponent {...props} />
    );
    NodeComponent.displayName = `AxiomNode_${category}`;
    return memo(NodeComponent);
}

// ============================================================================
// PRE-BUILT NODE TYPES
// ============================================================================

export const TriggerNode = createAxiomNode('trigger');
export const InputNode = createAxiomNode('input');
export const ProcessNode = createAxiomNode('process');
export const ConditionNode = createAxiomNode('condition');
export const PreviewNode = createAxiomNode('preview');
export const OutputNode = createAxiomNode('output');
export const StructuralNode = createAxiomNode('structural');

// ============================================================================
// NODE TYPES MAP - INCLUDES ALL PALETTE ENTRIES
// ============================================================================

// Create specific node components for each palette entry
const paletteNodeTypes: Record<string, React.FC<NodeProps<AxiomNodeData>>> = {};
Object.keys(NODE_PALETTE).forEach(nodeId => {
    paletteNodeTypes[nodeId] = memo(AxiomNodeComponent);
});

export const axiomNodeTypes = {
    // Category types
    trigger: TriggerNode,
    input: InputNode,
    process: ProcessNode,
    condition: ConditionNode,
    preview: PreviewNode,
    output: OutputNode,
    structural: StructuralNode,
    default: memo(AxiomNodeComponent),
    // All palette node types
    ...paletteNodeTypes,
};

// ============================================================================
// EXPORTS FOR PALETTE LOOKUP
// ============================================================================

export { NODE_PALETTE, AXIOM_COLORS };

export const axiomNodeStyles = `
.react-flow__handle { transition: transform 0.15s ease; }
.react-flow__handle:hover { transform: scale(1.3) !important; }
`;

export default AxiomNodeComponent;
