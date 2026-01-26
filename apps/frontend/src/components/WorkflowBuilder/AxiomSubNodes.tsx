/**
 * AXIOM SUB-NODES
 * Specialized node definitions for each category
 * Ported from Lekhika's AlchemistSubNodes.jsx
 * Uses Axiom design language
 */

'use client';

import React from 'react';
import { NodePaletteItem } from '@/services/nodePaletteService';
import { nodeStyleService } from '@/services/nodeStyleService';
import {
    Zap, Clock, Bell, Globe, Mail, Webhook, Calendar, FileInput,
    ArrowDownToLine, Upload, Database, Link, FileText, MessageSquare, Image,
    Cog, Brain, Sparkles, Wand2, Code, RefreshCw, Filter, Merge, Split,
    GitBranch, CircleDot, Route, Shuffle, AlertTriangle, CheckCircle2,
    Eye, Monitor, FileSearch, Presentation, ImageIcon, Video,
    ArrowUpFromLine, Send, Save, Download, Share2, Printer, Cloud,
    Layers, Box, Folder, Group, LayoutGrid
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface SubNodeDefinition {
    nodeId: string;
    name: string;
    description: string;
    category: string;
    icon: string;
    color: string;
    features: string[];
    capabilities: string[];
    defaultConfig: Record<string, any>;
    configSchema?: ConfigField[];
}

export interface ConfigField {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'json' | 'array';
    required?: boolean;
    default?: any;
    options?: { label: string; value: any }[];
    placeholder?: string;
    description?: string;
}

// ============================================================================
// ICON MAPPING
// ============================================================================

export const subNodeIconMap: Record<string, React.ComponentType<any>> = {
    // Triggers
    Zap, Clock, Bell, Globe, Mail, Webhook, Calendar, FileInput,
    // Inputs
    ArrowDownToLine, Upload, Database, Link, FileText, MessageSquare, Image,
    // Process
    Cog, Brain, Sparkles, Wand2, Code, RefreshCw, Filter, Merge, Split,
    // Conditions
    GitBranch, CircleDot, Route, Shuffle, AlertTriangle, CheckCircle2,
    // Preview
    Eye, Monitor, FileSearch, Presentation, ImageIcon, Video,
    // Output
    ArrowUpFromLine, Send, Save, Download, Share2, Printer, Cloud,
    // Structural
    Layers, Box, Folder, Group, LayoutGrid,
};

// ============================================================================
// SUB-NODE DEFINITIONS BY CATEGORY
// ============================================================================

// ---------- TRIGGER SUB-NODES ----------
export const triggerSubNodes: SubNodeDefinition[] = [
    {
        nodeId: 'webhook_trigger',
        name: 'Webhook Trigger',
        description: 'Receive data from external webhooks',
        category: 'trigger',
        icon: 'Webhook',
        color: 'var(--color-warning)',
        features: ['HTTP POST', 'JSON Payload', 'Authentication'],
        capabilities: ['Receives external data', 'Validates payload', 'Extracts fields'],
        defaultConfig: {},
        configSchema: [
            { key: 'endpoint', label: 'Endpoint Path', type: 'text', required: true },
            {
                key: 'authType', label: 'Authentication', type: 'select', options: [
                    { label: 'None', value: 'none' },
                    { label: 'API Key', value: 'api_key' },
                    { label: 'Bearer Token', value: 'bearer' },
                ]
            },
        ],
    },
    {
        nodeId: 'schedule_trigger',
        name: 'Schedule Trigger',
        description: 'Run workflow on a schedule',
        category: 'trigger',
        icon: 'Clock',
        color: 'var(--color-warning)',
        features: ['Cron Expression', 'Timezone', 'Recurring'],
        capabilities: ['Time-based execution', 'Cron scheduling', 'Timezone support'],
        defaultConfig: { cron: '0 9 * * *', timezone: 'UTC' },
        configSchema: [
            { key: 'cron', label: 'Cron Expression', type: 'text', required: true, placeholder: '0 9 * * *' },
            {
                key: 'timezone', label: 'Timezone', type: 'select', options: [
                    { label: 'UTC', value: 'UTC' },
                    { label: 'US/Pacific', value: 'US/Pacific' },
                    { label: 'US/Eastern', value: 'US/Eastern' },
                    { label: 'Europe/London', value: 'Europe/London' },
                ]
            },
        ],
    },
    {
        nodeId: 'email_trigger',
        name: 'Email Trigger',
        description: 'Triggered by incoming emails',
        category: 'trigger',
        icon: 'Mail',
        color: 'var(--color-warning)',
        features: ['Email Parsing', 'Attachments', 'Filters'],
        capabilities: ['Monitors inbox', 'Parses content', 'Extracts attachments'],
        defaultConfig: {},
    },
    {
        nodeId: 'api_trigger',
        name: 'API Trigger',
        description: 'Triggered by API calls',
        category: 'trigger',
        icon: 'Globe',
        color: 'var(--color-warning)',
        features: ['REST API', 'GraphQL', 'Rate Limiting'],
        capabilities: ['API endpoint', 'Request validation', 'Response handling'],
        defaultConfig: {},
    },
];

// ---------- INPUT SUB-NODES ----------
export const inputSubNodes: SubNodeDefinition[] = [
    {
        nodeId: 'text_input',
        name: 'Text Input',
        description: 'Accept text input from user or variable',
        category: 'input',
        icon: 'FileText',
        color: 'var(--color-accent)',
        features: ['Plain Text', 'Rich Text', 'Variable Support'],
        capabilities: ['User input', 'Variable binding', 'Validation'],
        defaultConfig: {},
        configSchema: [
            { key: 'label', label: 'Input Label', type: 'text', required: true },
            { key: 'placeholder', label: 'Placeholder', type: 'text' },
            { key: 'required', label: 'Required', type: 'boolean', default: false },
            { key: 'maxLength', label: 'Max Length', type: 'number' },
        ],
    },
    {
        nodeId: 'file_input',
        name: 'File Input',
        description: 'Upload and process files',
        category: 'input',
        icon: 'Upload',
        color: 'var(--color-accent)',
        features: ['File Upload', 'Multi-Format', 'Parsing'],
        capabilities: ['File upload', 'Format validation', 'Content extraction'],
        defaultConfig: { allowedTypes: ['pdf', 'docx', 'txt'] },
    },
    {
        nodeId: 'kb_input',
        name: 'Knowledge Base',
        description: 'Query knowledge base for context',
        category: 'input',
        icon: 'Brain',
        color: 'var(--color-accent)',
        features: ['RAG', 'Semantic Search', 'Context Injection'],
        capabilities: ['Knowledge retrieval', 'Semantic matching', 'Context building'],
        defaultConfig: { topK: 5, threshold: 0.7 },
        configSchema: [
            { key: 'knowledgeBaseId', label: 'Knowledge Base', type: 'select', required: true },
            { key: 'topK', label: 'Top K Results', type: 'number', default: 5 },
            { key: 'threshold', label: 'Similarity Threshold', type: 'number', default: 0.7 },
        ],
    },
    {
        nodeId: 'api_input',
        name: 'API Input',
        description: 'Fetch data from external APIs',
        category: 'input',
        icon: 'Globe',
        color: 'var(--color-accent)',
        features: ['REST', 'GraphQL', 'Authentication'],
        capabilities: ['API calls', 'Response parsing', 'Error handling'],
        defaultConfig: { method: 'GET' },
    },
    {
        nodeId: 'database_input',
        name: 'Database Query',
        description: 'Query database for data',
        category: 'input',
        icon: 'Database',
        color: 'var(--color-accent)',
        features: ['SQL', 'NoSQL', 'Prepared Statements'],
        capabilities: ['Database queries', 'Result mapping', 'Connection pooling'],
        defaultConfig: {},
    },
];

// ---------- PROCESS SUB-NODES ----------
export const processSubNodes: SubNodeDefinition[] = [
    {
        nodeId: 'ai_generate',
        name: 'AI Generate',
        description: 'Generate content using AI models',
        category: 'process',
        icon: 'Sparkles',
        color: 'var(--color-success)',
        features: ['GPT-4', 'Claude', 'Custom Prompts'],
        capabilities: ['Text generation', 'Multi-model support', 'Prompt templates'],
        defaultConfig: { model: 'gpt-4', temperature: 0.7 },
        configSchema: [
            {
                key: 'model', label: 'AI Model', type: 'select', required: true, options: [
                    { label: 'GPT-4', value: 'gpt-4' },
                    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
                    { label: 'Claude 3 Opus', value: 'claude-3-opus' },
                    { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet' },
                    { label: 'Gemini Pro', value: 'gemini-pro' },
                ]
            },
            { key: 'systemPrompt', label: 'System Prompt', type: 'textarea' },
            { key: 'temperature', label: 'Temperature', type: 'number', default: 0.7 },
            { key: 'maxTokens', label: 'Max Tokens', type: 'number', default: 2048 },
        ],
    },
    {
        nodeId: 'ai_analyze',
        name: 'AI Analyze',
        description: 'Analyze content for insights',
        category: 'process',
        icon: 'Brain',
        color: 'var(--color-success)',
        features: ['Sentiment', 'Classification', 'Extraction'],
        capabilities: ['Content analysis', 'Entity extraction', 'Classification'],
        defaultConfig: {},
    },
    {
        nodeId: 'ai_transform',
        name: 'AI Transform',
        description: 'Transform content format or style',
        category: 'process',
        icon: 'Wand2',
        color: 'var(--color-success)',
        features: ['Rewrite', 'Summarize', 'Translate'],
        capabilities: ['Style transfer', 'Format conversion', 'Localization'],
        defaultConfig: {},
    },
    {
        nodeId: 'code_execute',
        name: 'Code Execute',
        description: 'Execute custom code',
        category: 'process',
        icon: 'Code',
        color: 'var(--color-success)',
        features: ['JavaScript', 'Python', 'Sandboxed'],
        capabilities: ['Custom logic', 'Data transformation', 'API integration'],
        defaultConfig: { language: 'javascript' },
    },
    {
        nodeId: 'data_transform',
        name: 'Data Transform',
        description: 'Transform data structure',
        category: 'process',
        icon: 'RefreshCw',
        color: 'var(--color-success)',
        features: ['JSON', 'Mapping', 'Filtering'],
        capabilities: ['Data mapping', 'Field extraction', 'Aggregation'],
        defaultConfig: {},
    },
    {
        nodeId: 'filter_process',
        name: 'Filter',
        description: 'Filter data based on conditions',
        category: 'process',
        icon: 'Filter',
        color: 'var(--color-success)',
        features: ['Conditions', 'Regex', 'Operators'],
        capabilities: ['Data filtering', 'Pattern matching', 'Conditional logic'],
        defaultConfig: {},
    },
    {
        nodeId: 'merge_process',
        name: 'Merge',
        description: 'Merge multiple data streams',
        category: 'process',
        icon: 'Merge',
        color: 'var(--color-success)',
        features: ['Combine', 'Dedupe', 'Join'],
        capabilities: ['Data merging', 'Deduplication', 'Key-based joining'],
        defaultConfig: {},
    },
];

// ---------- CONDITION SUB-NODES ----------
export const conditionSubNodes: SubNodeDefinition[] = [
    {
        nodeId: 'if_condition',
        name: 'If/Else',
        description: 'Branch based on condition',
        category: 'condition',
        icon: 'GitBranch',
        color: 'var(--color-info)',
        features: ['Boolean Logic', 'Comparisons', 'Multi-Branch'],
        capabilities: ['Conditional branching', 'Multiple conditions', 'Default path'],
        defaultConfig: {},
        configSchema: [
            { key: 'condition', label: 'Condition', type: 'text', required: true, placeholder: '{{input.value}} > 10' },
        ],
    },
    {
        nodeId: 'switch_condition',
        name: 'Switch',
        description: 'Multi-way branching',
        category: 'condition',
        icon: 'Route',
        color: 'var(--color-info)',
        features: ['Multiple Cases', 'Default', 'Pattern Match'],
        capabilities: ['Multi-path routing', 'Pattern matching', 'Fallback handling'],
        defaultConfig: {},
    },
    {
        nodeId: 'loop_condition',
        name: 'Loop',
        description: 'Iterate over collection',
        category: 'condition',
        icon: 'RefreshCw',
        color: 'var(--color-info)',
        features: ['For Each', 'While', 'Parallel'],
        capabilities: ['Collection iteration', 'Parallel processing', 'Break conditions'],
        defaultConfig: {},
    },
    {
        nodeId: 'approval_condition',
        name: 'Human Approval',
        description: 'Wait for human approval',
        category: 'condition',
        icon: 'CheckCircle2',
        color: 'var(--color-info)',
        features: ['Approval Flow', 'Timeout', 'Escalation'],
        capabilities: ['Human-in-the-loop', 'Approval routing', 'Timeout handling'],
        defaultConfig: { timeout: 86400 },
    },
    {
        nodeId: 'error_condition',
        name: 'Error Handler',
        description: 'Handle errors and exceptions',
        category: 'condition',
        icon: 'AlertTriangle',
        color: 'var(--color-info)',
        features: ['Try/Catch', 'Retry', 'Fallback'],
        capabilities: ['Error catching', 'Retry logic', 'Graceful degradation'],
        defaultConfig: { retries: 3 },
    },
];

// ---------- PREVIEW SUB-NODES ----------
export const previewSubNodes: SubNodeDefinition[] = [
    {
        nodeId: 'content_preview',
        name: 'Content Preview',
        description: 'Preview generated content',
        category: 'preview',
        icon: 'Eye',
        color: 'var(--color-primary)',
        features: ['Text', 'Markdown', 'HTML'],
        capabilities: ['Content display', 'Formatting preview', 'Edit capability'],
        defaultConfig: {},
    },
    {
        nodeId: 'document_preview',
        name: 'Document Preview',
        description: 'Preview document output',
        category: 'preview',
        icon: 'FileSearch',
        color: 'var(--color-primary)',
        features: ['PDF', 'Word', 'Spreadsheet'],
        capabilities: ['Document rendering', 'Page navigation', 'Download option'],
        defaultConfig: {},
    },
    {
        nodeId: 'image_preview',
        name: 'Image Preview',
        description: 'Preview generated images',
        category: 'preview',
        icon: 'ImageIcon',
        color: 'var(--color-primary)',
        features: ['Gallery', 'Zoom', 'Compare'],
        capabilities: ['Image display', 'Side-by-side comparison', 'Selection'],
        defaultConfig: {},
    },
    {
        nodeId: 'approval_preview',
        name: 'Approval Gate',
        description: 'Approval checkpoint before continue',
        category: 'preview',
        icon: 'CheckCircle2',
        color: 'var(--color-primary)',
        features: ['Review', 'Approve/Reject', 'Comments'],
        capabilities: ['Manual approval', 'Feedback collection', 'Revision loop'],
        defaultConfig: {},
    },
];

// ---------- OUTPUT SUB-NODES ----------
export const outputSubNodes: SubNodeDefinition[] = [
    {
        nodeId: 'email_output',
        name: 'Send Email',
        description: 'Send email with results',
        category: 'output',
        icon: 'Send',
        color: 'var(--color-secondary)',
        features: ['HTML', 'Attachments', 'Templates'],
        capabilities: ['Email delivery', 'Template rendering', 'Attachment handling'],
        defaultConfig: {},
        configSchema: [
            { key: 'to', label: 'To', type: 'text', required: true },
            { key: 'subject', label: 'Subject', type: 'text', required: true },
            { key: 'template', label: 'Email Template', type: 'select' },
        ],
    },
    {
        nodeId: 'api_output',
        name: 'API Response',
        description: 'Send data to external API',
        category: 'output',
        icon: 'Globe',
        color: 'var(--color-secondary)',
        features: ['REST', 'GraphQL', 'Webhook'],
        capabilities: ['API calls', 'Webhook delivery', 'Response handling'],
        defaultConfig: { method: 'POST' },
    },
    {
        nodeId: 'database_output',
        name: 'Save to Database',
        description: 'Persist data to database',
        category: 'output',
        icon: 'Database',
        color: 'var(--color-secondary)',
        features: ['Insert', 'Update', 'Upsert'],
        capabilities: ['Data persistence', 'Conflict resolution', 'Batch operations'],
        defaultConfig: {},
    },
    {
        nodeId: 'file_output',
        name: 'Export File',
        description: 'Export results as file',
        category: 'output',
        icon: 'Download',
        color: 'var(--color-secondary)',
        features: ['PDF', 'CSV', 'JSON'],
        capabilities: ['File generation', 'Format conversion', 'Download link'],
        defaultConfig: { format: 'pdf' },
    },
    {
        nodeId: 'storage_output',
        name: 'Cloud Storage',
        description: 'Upload to cloud storage',
        category: 'output',
        icon: 'Cloud',
        color: 'var(--color-secondary)',
        features: ['S3', 'GCS', 'Azure'],
        capabilities: ['Cloud upload', 'Path management', 'Access control'],
        defaultConfig: {},
    },
    {
        nodeId: 'notification_output',
        name: 'Send Notification',
        description: 'Send push notification or alert',
        category: 'output',
        icon: 'Bell',
        color: 'var(--color-secondary)',
        features: ['Push', 'SMS', 'Slack'],
        capabilities: ['Multi-channel notifications', 'Template support', 'Scheduling'],
        defaultConfig: {},
    },
];

// ============================================================================
// ALL SUB-NODES COMBINED
// ============================================================================

export const allSubNodes: SubNodeDefinition[] = [
    ...triggerSubNodes,
    ...inputSubNodes,
    ...processSubNodes,
    ...conditionSubNodes,
    ...previewSubNodes,
    ...outputSubNodes,
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get sub-node definition by nodeId
 */
export function getSubNodeById(nodeId: string): SubNodeDefinition | undefined {
    return allSubNodes.find(node => node.nodeId === nodeId);
}

/**
 * Get sub-nodes by category
 */
export function getSubNodesByCategory(category: string): SubNodeDefinition[] {
    return allSubNodes.filter(node => node.category === category);
}

/**
 * Convert NodePaletteItem to SubNodeDefinition
 */
export function paletteItemToSubNode(item: NodePaletteItem): SubNodeDefinition {
    return {
        nodeId: item.node_id,
        name: item.name,
        description: item.description || '',
        category: item.category,
        icon: item.icon,
        color: item.color,
        features: item.features || [],
        capabilities: item.capabilities || [],
        defaultConfig: item.default_config || {},
    };
}

/**
 * Get icon component for a sub-node
 */
export function getSubNodeIcon(iconName: string): React.ComponentType<any> {
    return subNodeIconMap[iconName] || subNodeIconMap.Box;
}

/**
 * Process sub-node data for specialized handling
 * Mirrors Lekhika's processSubNodeData function
 */
export function processSubNodeData(
    nodeId: string,
    inputData: Record<string, any>,
    config: Record<string, any>
): Record<string, any> {
    const subNode = getSubNodeById(nodeId);

    if (!subNode) {
        return inputData;
    }

    // Add specialized processing based on node type
    switch (subNode.category) {
        case 'trigger':
            return {
                ...inputData,
                triggeredAt: new Date().toISOString(),
                triggerType: nodeId,
            };

        case 'input':
            return {
                ...inputData,
                inputType: nodeId,
                validated: true,
            };

        case 'process':
            return {
                ...inputData,
                processedBy: nodeId,
                processingConfig: config,
            };

        case 'condition':
            return {
                ...inputData,
                evaluatedBy: nodeId,
                conditionMet: true, // Would be determined by actual condition evaluation
            };

        case 'preview':
            return {
                ...inputData,
                previewedAt: new Date().toISOString(),
                requiresApproval: nodeId === 'approval_preview',
            };

        case 'output':
            return {
                ...inputData,
                outputType: nodeId,
                deliveredAt: new Date().toISOString(),
            };

        default:
            return inputData;
    }
}

export default allSubNodes;
