/**
 * WORKFLOW MANAGER V2 EXPORTS
 */

// Main components
export { WorkflowManager } from './WorkflowManager';
export { AddNodeModal } from './AddNodeModal';
export { V2WorkflowNode } from './V2WorkflowNode';

// Config components
export { AIConfig } from './AIConfig';
export { ResolverConfig } from './ResolverConfig';
export { TriggerConfig } from './TriggerConfig';
export { GeneratorConfig } from './GeneratorConfig';
export { ValidatorConfig } from './ValidatorConfig';
export { OutputConfig } from './OutputConfig';
export { EnricherConfig } from './EnricherConfig';
export { TransformConfig } from './TransformConfig';
export { UtilityConfig } from './UtilityConfig';

// Node definitions
export * from './v2-node-definitions';

// Types - export all shared types
export type {
    V2NodeData,
    V2NodeDefinition,
    V2NodeCategory,
    WorkflowTemplate,
    SerializedNode,
    SerializedEdge,
    AIProvider,
    AIConfigEntry,
    ConfigField,
    CategoryMeta,
    AddNodeModalProps,
    NodeConfigModalProps,
    ConfigComponentProps,
    ValidationResult,
    ValidationError,
} from './types';
