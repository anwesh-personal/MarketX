/**
 * NODE SCHEMAS INDEX
 * Central export for all node type schemas
 * 
 * These Zod schemas define the input/output contracts for each node type
 * used in workflow execution.
 */

// Re-export all schemas
export * from './trigger.schemas';
export * from './resolver.schemas';
export * from './generator.schemas';
export * from './processor.schemas';
export * from './validator.schemas';
export * from './condition.schemas';
export * from './output.schemas';

// Node Categories
export const NODE_CATEGORIES = {
    TRIGGER: 'trigger',
    RESOLVER: 'resolver',
    GENERATOR: 'generator',
    PROCESSOR: 'processor',
    VALIDATOR: 'validator',
    CONDITION: 'condition',
    OUTPUT: 'output',
} as const;

export type NodeCategory = typeof NODE_CATEGORIES[keyof typeof NODE_CATEGORIES];
