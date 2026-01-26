/**
 * WORKFLOW MANAGER TYPES
 * Shared type definitions for WorkflowManager components
 * 
 * Single source of truth for all workflow types
 * 
 * @author Axiom AI
 */

import { LucideIcon } from 'lucide-react';

// ============================================================================
// NODE TYPES
// ============================================================================

/**
 * Categories for V2 workflow nodes
 */
export type V2NodeCategory =
    | 'trigger'
    | 'resolver'
    | 'generator'
    | 'validator'
    | 'output'
    | 'enricher'
    | 'transform'
    | 'utility';

/**
 * V2 Node Definition - for node palette and creation
 */
export interface V2NodeDefinition {
    id: string;
    nodeType: string;
    category: V2NodeCategory;
    name: string;
    description: string;
    icon: LucideIcon;
    color: string;
    features: string[];
    capabilities: string[];
    defaultConfig: Record<string, unknown>;
    configSchema?: ConfigField[];
}

/**
 * Config field definition for dynamic forms
 */
export interface ConfigField {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'json' | 'array';
    required?: boolean;
    default?: unknown;
    options?: { label: string; value: unknown }[];
    placeholder?: string;
    description?: string;
}

/**
 * Data attached to each workflow node in ReactFlow
 */
export interface V2NodeData {
    label: string;
    nodeType: string;
    category: string;
    icon: LucideIcon;
    color: string;
    config: Record<string, unknown>;
    features: string[];
    onConfigure?: (nodeId: string, nodeData: V2NodeData) => void;
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

/**
 * Serialized node as stored in database
 */
export interface SerializedNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
        nodeType: string;
        label: string;
        category?: string;
        config: Record<string, unknown>;
        features?: string[];
    };
}

/**
 * Serialized edge as stored in database
 */
export interface SerializedEdge {
    id: string;
    source: string;
    target: string;
    type?: string;
    animated?: boolean;
}

/**
 * Workflow template as stored in database
 */
export interface WorkflowTemplate {
    id: string;
    name: string;
    description?: string;
    status: 'draft' | 'active' | 'disabled';
    nodes: SerializedNode[];
    edges: SerializedEdge[];
    node_count?: number;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// AI CONFIG TYPES
// ============================================================================

/**
 * AI Provider from database
 */
export interface AIProvider {
    id: string;
    provider: string;
    name: string;
    is_active: boolean;
    models_discovered: string[];
}

/**
 * AI Configuration entry for a node
 */
export interface AIConfigEntry {
    id: string;
    providerId: string;
    providerName: string;
    model: string;
    temperature: number;
    maxTokens: number;
}

// ============================================================================
// CATEGORY METADATA
// ============================================================================

/**
 * Category display metadata
 */
export interface CategoryMeta {
    label: string;
    description: string;
    color: string;
    gradient: string;
}

export type CategoryMetaMap = Record<V2NodeCategory, CategoryMeta>;

// ============================================================================
// MODAL PROPS
// ============================================================================

/**
 * Props for AddNodeModal
 */
export interface AddNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddNode: (node: V2NodeDefinition) => void;
}

/**
 * Props for NodeConfigModal
 */
export interface NodeConfigModalProps {
    node: { id: string; data: V2NodeData };
    onClose: () => void;
    onSave: (nodeId: string, newLabel: string, newConfig: Record<string, unknown>) => void;
}

// ============================================================================
// CONFIG COMPONENT PROPS (Generic)
// ============================================================================

/**
 * Generic config component props
 */
export interface ConfigComponentProps<T> {
    nodeType: string;
    config: T;
    onChange: (config: T) => void;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
    field: string;
    message: string;
    type: 'error' | 'warning';
}
