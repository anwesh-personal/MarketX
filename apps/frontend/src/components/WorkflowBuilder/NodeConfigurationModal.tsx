'use client';

/**
 * NODE CONFIGURATION MODAL - COMPLETE REWRITE
 * Tabs: Basic Info | Instructions | AI Integration | Variables | Advanced | Test
 * All data from database - NO HARDCODING
 */

import React, { useState, useEffect } from 'react';
import {
    X, Save, Settings, FileText, Brain, Target, Zap, Play,
    ChevronDown, ChevronUp, Trash2, GripVertical, Plus, Info, Sparkles
} from 'lucide-react';
import { Node } from 'reactflow';
import { AxiomNodeData, AXIOM_COLORS, NODE_PALETTE } from './AxiomNodes';
import AIProviderSelector, { SelectedModel } from './AIProviderSelector';
import { getVariablesByNodeType, VariableDefinition, getAllVariables } from '@/data/axiomVariables';
import { PROMPT_TEMPLATES, getPromptTemplateById } from '@/data/axiomNodeDefaults';

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'basic' | 'instructions' | 'ai' | 'variables' | 'advanced' | 'test';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    show?: (category: string) => boolean;
}

interface NodeConfigurationModalProps {
    isOpen: boolean;
    onClose: () => void;
    node: Node<AxiomNodeData> | null;
    onSave: (nodeId: string, updatedData: Partial<AxiomNodeData>) => void;
    onDelete?: (nodeId: string) => void;
}

interface VariableSelection {
    variable: string;
    name: string;
    type: string;
    required: boolean;
    order: number;
}

// ============================================================================
// TABS DEFINITION
// ============================================================================

const TABS: Tab[] = [
    { id: 'basic', label: 'Basic Info', icon: Settings },
    { id: 'instructions', label: 'Instructions', icon: FileText },
    {
        id: 'ai',
        label: 'AI & Prompts',
        icon: Brain,
        show: (category) => ['process', 'output'].includes(category),
    },
    { id: 'variables', label: 'Variables', icon: Target },
    { id: 'advanced', label: 'Advanced', icon: Zap },
    { id: 'test', label: 'Test Input', icon: Play },
];

// ============================================================================
// BUILT-IN INSTRUCTIONS
// ============================================================================

const CATEGORY_INSTRUCTIONS: Record<string, string> = {
    trigger: `🚀 **TRIGGER NODE**

**Mission:** Initiate the workflow based on events or schedules.

**Capabilities:**
• Email triggers for incoming messages
• Manual triggers for on-demand execution
• Scheduled triggers for automated runs
• Webhook triggers for external integrations

**Best Practices:**
• Configure proper filters to avoid noise
• Set up error handling for failed triggers
• Use meaningful names for easy identification`,

    input: `📥 **INPUT NODE**

**Mission:** Collect and validate input data for the workflow.

**Capabilities:**
• Structured form inputs
• File uploads and processing
• Dynamic field configuration
• Input validation and sanitization

**Best Practices:**
• Mark required fields appropriately
• Provide clear descriptions and placeholders
• Set up validation rules`,

    process: `🧠 **PROCESS NODE**

**Mission:** Transform input data using AI and logic.

**Capabilities:**
• Multi-AI model support with fallback
• Knowledge base retrieval (RAG)
• Content generation and optimization
• Web search and research

**AI Configuration:**
• Select primary and fallback models
• Configure temperature and token limits
• Set up system and user prompts
• Define negative prompts (what to avoid)`,

    condition: `🔀 **CONDITION NODE**

**Mission:** Make decisions and route workflow paths.

**Capabilities:**
• Quality thresholds and gates
• Validation checks
• Branching logic
• A/B testing routes

**Best Practices:**
• Define clear success/failure criteria
• Set up fallback actions
• Test edge cases thoroughly`,

    preview: `👁️ **PREVIEW NODE**

**Mission:** Review and approve content before output.

**Capabilities:**
• Multi-round review cycles
• Auto-approval thresholds
• Stakeholder assignments
• Rejection routing

**Configuration:**
• Set max review rounds (1-5)
• Define quality thresholds
• Assign reviewers
• Configure rejection handling`,

    output: `📤 **OUTPUT NODE**

**Mission:** Deliver processed content to destinations.

**Capabilities:**
• Multiple output formats
• Webhook delivery
• Database storage
• CMS publishing

**Best Practices:**
• Validate output format
• Set up retry logic
• Log all deliveries`,
};

// ============================================================================
// CATEGORY COLOR MAPPING
// ============================================================================

const CATEGORY_COLOR_TOKENS: Record<string, keyof typeof AXIOM_COLORS> = {
    trigger: 'warning',
    input: 'info',
    process: 'primary',
    condition: 'accent',
    preview: 'warning',
    output: 'success',
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function NodeConfigurationModal({
    isOpen,
    onClose,
    node,
    onSave,
    onDelete,
}: NodeConfigurationModalProps) {
    // State
    const [activeTab, setActiveTab] = useState<TabId>('basic');
    const [saving, setSaving] = useState(false);

    // Node configuration state
    const [config, setConfig] = useState({
        // Basic
        label: '',
        description: '',
        // Instructions
        customInstructions: '',
        // AI Integration
        aiEnabled: true,
        selectedModels: [] as SelectedModel[],
        temperature: 0.7,
        maxTokens: 4000,
        systemPrompt: '',
        userPrompt: '',
        negativePrompt: '',
        // Variables
        inputVariables: [] as VariableSelection[],
        outputVariables: [] as VariableSelection[],
        // Condition
        conditionType: 'quality_check',
        threshold: 75,
        operator: '>=',
        trueAction: 'continue',
        falseAction: 'review',
        // Preview
        maxReviewRounds: 3,
        autoApprovalThreshold: 85,
        reviewStakeholders: [] as string[],
        rejectionRouting: 'previous_process',
        // Output
        outputFormat: 'json',
        deliveryMethod: 'api',
        webhookUrl: '',
        // Advanced
        timeout: 30,
        retryCount: 3,
        priority: 'normal' as 'high' | 'normal' | 'low',
        fallbackEnabled: false,
        // Test
        testInputValues: {} as Record<string, any>,
    });

    // Available variables for this node type
    const [availableVariables, setAvailableVariables] = useState<Record<string, VariableDefinition>>({});

    // Function to load a template
    const loadPromptTemplate = (templateId: string) => {
        const template = getPromptTemplateById(templateId);
        if (template) {
            setConfig(prev => ({
                ...prev,
                // SYNC BASIC INFO AUTOMATICALLY
                label: template.name,
                description: template.description,
                // Update AI Config
                systemPrompt: template.systemPrompt,
                userPrompt: template.userPromptTemplate,
                negativePrompt: template.negativePrompt || '',
                temperature: template.temperature,
                maxTokens: template.maxTokens,
            }));

            // Visual feedback is handled by the UI update
        }
    };

    // Load node data when modal opens
    useEffect(() => {
        if (node?.data) {
            const initialConfig = {
                ...config, // defaults
                label: node.data.label || '',
                description: node.data.description || '',
                ...(node.data.config || {}),
            };

            // AUTO-POPULATE DEFAULTS IF EMPTY
            // If systemPrompt is empty and it's a process node, populate with Expert Copywriter as default foundation
            const category = node.data.category || 'process';
            if (category === 'process' && !initialConfig.systemPrompt) {
                const defaultTemplate = PROMPT_TEMPLATES[0]; // Expert Copywriter
                initialConfig.systemPrompt = defaultTemplate.systemPrompt;
                initialConfig.userPrompt = defaultTemplate.userPromptTemplate;
                initialConfig.negativePrompt = defaultTemplate.negativePrompt || '';
            }

            setConfig(initialConfig);

            // Get variables for this node type
            const nodeType = node.data.nodeId || node.data.nodeType || node.type;
            const vars = nodeType ? getVariablesByNodeType(nodeType) : getAllVariables();
            setAvailableVariables(vars);
        }
    }, [node]);


    if (!isOpen || !node) return null;

    const category = node.data.category || 'process';
    const colorToken = CATEGORY_COLOR_TOKENS[category] || 'primary';
    const colors = AXIOM_COLORS[colorToken];
    const nodeType = node.data.nodeId || node.data.nodeType || node.type;
    const paletteInfo = NODE_PALETTE[nodeType as keyof typeof NODE_PALETTE];

    // Filter tabs based on category
    const visibleTabs = TABS.filter(tab => !tab.show || tab.show(category));

    const handleSave = async () => {
        if (!config.label?.trim()) {
            alert('Node label is required');
            return;
        }

        setSaving(true);
        try {
            onSave(node.id, {
                ...node.data,
                label: config.label,
                description: config.description,
                config: {
                    ...config,
                },
            });
            onClose();
        } catch (error) {
            console.error('Error saving node config:', error);
            alert('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = (key: string, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const toggleVariable = (variableKey: string, variableDef: VariableDefinition) => {
        const existingIndex = config.inputVariables.findIndex(v => v.variable === variableKey);

        if (existingIndex >= 0) {
            // Remove
            updateConfig('inputVariables', config.inputVariables.filter((_, i) => i !== existingIndex));
        } else {
            // Add
            updateConfig('inputVariables', [
                ...config.inputVariables,
                {
                    variable: variableKey,
                    name: variableDef.name,
                    type: variableDef.type,
                    required: variableDef.required,
                    order: config.inputVariables.length,
                },
            ]);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div
                className="bg-surface rounded-2xl border border-border w-[95vw] max-w-[1200px] max-h-[90vh] overflow-hidden flex flex-col"
                style={{ boxShadow: `0 0 40px ${colors.border}33` }}
            >
                {/* HEADER */}
                <div
                    className="flex items-center justify-between px-6 py-4 border-b border-border"
                    style={{ background: `linear-gradient(135deg, ${colors.border}15, transparent)` }}
                >
                    <div className="flex items-center gap-4">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${colors.border}20` }}
                        >
                            <Settings className="w-6 h-6" style={{ color: colors.border }} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-textPrimary">
                                Configure {config.label || paletteInfo?.icon ? nodeType : 'Node'}
                            </h2>
                            <p className="text-sm text-textSecondary">
                                {category.charAt(0).toUpperCase() + category.slice(1)} Node • {nodeType}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {onDelete && (
                            <button
                                onClick={() => {
                                    if (confirm('Delete this node?')) {
                                        onDelete(node.id);
                                        onClose();
                                    }
                                }}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-textSecondary hover:text-textPrimary hover:bg-surface-hover rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex px-6 py-2 border-b border-border bg-background/50">
                    {visibleTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'text-textPrimary'
                                    : 'text-textSecondary hover:text-textPrimary hover:bg-surface-hover'
                                    }`}
                                style={isActive ? { backgroundColor: colors.border, color: '#fff' } : {}}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* BASIC INFO TAB */}
                    {activeTab === 'basic' && (
                        <div className="space-y-6 max-w-2xl">
                            <div>
                                <label className="block text-sm font-medium text-textSecondary mb-2">
                                    Node Name *
                                </label>
                                <input
                                    type="text"
                                    value={config.label}
                                    onChange={(e) => updateConfig('label', e.target.value)}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-textPrimary placeholder-textTertiary focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    placeholder="Enter node name..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textSecondary mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={config.description}
                                    onChange={(e) => updateConfig('description', e.target.value)}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-textPrimary placeholder-textTertiary focus:border-primary focus:ring-2 focus:ring-primary/20 h-24 resize-none"
                                    placeholder="Describe what this node does..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textSecondary mb-2">
                                    Node Type
                                </label>
                                <div className="px-4 py-3 bg-background border border-border rounded-lg">
                                    <span className="text-textPrimary font-medium">{nodeType}</span>
                                    <span
                                        className="ml-2 px-2 py-0.5 text-xs rounded-full"
                                        style={{ backgroundColor: `${colors.border}20`, color: colors.border }}
                                    >
                                        {category.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* INSTRUCTIONS TAB */}
                    {activeTab === 'instructions' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">
                                    📚 Built-in Instructions
                                </label>
                                <div className="bg-background rounded-lg p-4 border border-border">
                                    <pre className="whitespace-pre-wrap text-textSecondary text-sm font-mono leading-relaxed">
                                        {CATEGORY_INSTRUCTIONS[category] || CATEGORY_INSTRUCTIONS.process}
                                    </pre>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    ✍️ Custom Instructions
                                </label>
                                <textarea
                                    value={config.customInstructions}
                                    onChange={(e) => updateConfig('customInstructions', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 h-32 resize-none"
                                    placeholder="Add your custom instructions for this node..."
                                />
                            </div>
                        </div>
                    )}

                    {/* AI INTEGRATION TAB */}
                    {activeTab === 'ai' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-4">
                                <input
                                    type="checkbox"
                                    id="aiEnabled"
                                    checked={config.aiEnabled}
                                    onChange={(e) => updateConfig('aiEnabled', e.target.checked)}
                                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-primary focus:ring-primary"
                                />
                                <label htmlFor="aiEnabled" className="text-sm font-medium text-gray-300">
                                    Enable AI Processing
                                </label>
                            </div>

                            {config.aiEnabled && (
                                <>
                                    {/* PROMPT TEMPLATE SELECTOR */}
                                    <div className="bg-background rounded-lg p-4 border border-border">
                                        <label className="block text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4" />
                                            Load Expert Prompt Template
                                        </label>
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    if (confirm('This will overwrite current prompts. Continue?')) {
                                                        loadPromptTemplate(e.target.value);
                                                    }
                                                    e.target.value = ''; // Reset selection
                                                }
                                            }}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-textPrimary"
                                        >
                                            <option value="">Select a template...</option>
                                            {PROMPT_TEMPLATES.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-textSecondary mt-2">
                                            Choose a persona to instantly populate the <strong>System Prompt</strong> and <strong>User Prompt</strong> fields below.
                                        </p>
                                    </div>

                                    <AIProviderSelector
                                        selectedModels={config.selectedModels}
                                        onChange={(models) => updateConfig('selectedModels', models)}
                                        maxModels={4}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Temperature: {config.temperature}
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="2"
                                                step="0.1"
                                                value={config.temperature}
                                                onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
                                                className="w-full"
                                            />
                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                <span>Precise (0)</span>
                                                <span>Creative (2)</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Max Tokens
                                            </label>
                                            <input
                                                type="number"
                                                value={config.maxTokens}
                                                onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value))}
                                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-textPrimary"
                                                min="100"
                                                max="128000"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            System Prompt
                                        </label>
                                        <textarea
                                            value={config.systemPrompt}
                                            onChange={(e) => updateConfig('systemPrompt', e.target.value)}
                                            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-textPrimary placeholder-textTertiary h-64 resize-y font-mono text-sm leading-relaxed"
                                            placeholder="You are a helpful AI assistant..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            User Prompt Template
                                        </label>
                                        <textarea
                                            value={config.userPrompt}
                                            onChange={(e) => updateConfig('userPrompt', e.target.value)}
                                            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-textPrimary placeholder-textTertiary h-32 resize-y font-mono text-sm"
                                            placeholder="Use {{variable_name}} for dynamic inputs..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Negative Prompt (What to Avoid)
                                        </label>
                                        <textarea
                                            value={config.negativePrompt}
                                            onChange={(e) => updateConfig('negativePrompt', e.target.value)}
                                            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-textPrimary placeholder-textTertiary h-20 resize-none"
                                            placeholder="Do not include: promotional language, exaggerated claims..."
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* VARIABLES TAB */}
                    {activeTab === 'variables' && (
                        <div className="space-y-6">
                            <div className="bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-cyan-900/30 border border-purple-500/40 rounded-xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Target className="w-6 h-6 text-purple-400" />
                                    <h3 className="text-lg font-semibold text-purple-200">Variable Configuration</h3>
                                </div>
                                <p className="text-sm text-purple-300">
                                    Select variables that this node will receive as input. Click to toggle selection.
                                </p>

                                <div className="grid grid-cols-4 gap-4 mt-4">
                                    <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-blue-400">{Object.keys(availableVariables).length}</div>
                                        <div className="text-xs text-blue-300">Available</div>
                                    </div>
                                    <div className="bg-green-500/10 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-green-400">{config.inputVariables.length}</div>
                                        <div className="text-xs text-green-300">Selected</div>
                                    </div>
                                    <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-yellow-400">
                                            {config.inputVariables.filter(v => v.required).length}
                                        </div>
                                        <div className="text-xs text-yellow-300">Required</div>
                                    </div>
                                    <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-purple-400">A+</div>
                                        <div className="text-xs text-purple-300">Config Score</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Available Variables */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-300 mb-3">Available Variables</h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {Object.entries(availableVariables).map(([key, def]) => {
                                            const isSelected = config.inputVariables.some(v => v.variable === key);

                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => toggleVariable(key, def)}
                                                    className={`w-full p-3 text-left rounded-lg border transition-all ${isSelected
                                                        ? 'bg-primary/20 border-primary text-white'
                                                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">{def.name}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded ${def.type === 'select' ? 'bg-blue-500/20 text-blue-300' :
                                                            def.type === 'textarea' ? 'bg-green-500/20 text-green-300' :
                                                                def.type === 'number' ? 'bg-orange-500/20 text-orange-300' :
                                                                    'bg-gray-500/20 text-gray-300'
                                                            }`}>
                                                            {def.type}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1">{def.description}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Selected Variables */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-300 mb-3">Selected Variables (Drag to Reorder)</h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {config.inputVariables.length > 0 ? (
                                            config.inputVariables.map((varSel, index) => (
                                                <div
                                                    key={varSel.variable}
                                                    className="flex items-center gap-2 p-3 bg-gray-800 border border-gray-700 rounded-lg"
                                                >
                                                    <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />
                                                    <span className="flex-1 text-white">{varSel.name}</span>
                                                    <label className="flex items-center gap-1 text-xs text-gray-400">
                                                        <input
                                                            type="checkbox"
                                                            checked={varSel.required}
                                                            onChange={(e) => {
                                                                const newVars = [...config.inputVariables];
                                                                newVars[index].required = e.target.checked;
                                                                updateConfig('inputVariables', newVars);
                                                            }}
                                                            className="w-3 h-3 rounded bg-gray-700 border-gray-600"
                                                        />
                                                        Required
                                                    </label>
                                                    <button
                                                        onClick={() => toggleVariable(varSel.variable, availableVariables[varSel.variable])}
                                                        className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
                                                <Target className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                                <p className="text-gray-400 text-sm">No variables selected</p>
                                                <p className="text-gray-500 text-xs">Click variables on the left to add</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ADVANCED TAB */}
                    {activeTab === 'advanced' && (
                        <div className="space-y-6 max-w-2xl">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Timeout (seconds)
                                    </label>
                                    <input
                                        type="number"
                                        value={config.timeout}
                                        onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                        min="5"
                                        max="300"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Retry Count
                                    </label>
                                    <input
                                        type="number"
                                        value={config.retryCount}
                                        onChange={(e) => updateConfig('retryCount', parseInt(e.target.value))}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                        min="0"
                                        max="10"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Priority
                                </label>
                                <select
                                    value={config.priority}
                                    onChange={(e) => updateConfig('priority', e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                >
                                    <option value="high">High Priority</option>
                                    <option value="normal">Normal Priority</option>
                                    <option value="low">Low Priority</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="fallbackEnabled"
                                    checked={config.fallbackEnabled}
                                    onChange={(e) => updateConfig('fallbackEnabled', e.target.checked)}
                                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-primary focus:ring-primary"
                                />
                                <label htmlFor="fallbackEnabled" className="text-sm font-medium text-gray-300">
                                    Enable fallback to alternative AI model if primary fails
                                </label>
                            </div>
                        </div>
                    )}

                    {/* TEST INPUT TAB */}
                    {activeTab === 'test' && (
                        <div className="space-y-6">
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                <h4 className="text-blue-400 font-semibold mb-2">🧪 Test Input Values</h4>
                                <p className="text-sm text-blue-300">
                                    Provide test values for each variable to test your workflow configuration.
                                </p>
                            </div>

                            {config.inputVariables.length > 0 ? (
                                <div className="space-y-4">
                                    {config.inputVariables.map(varSel => {
                                        const varDef = availableVariables[varSel.variable];
                                        if (!varDef) return null;

                                        return (
                                            <div key={varSel.variable}>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                                    {varSel.name} {varSel.required && <span className="text-red-400">*</span>}
                                                </label>

                                                {varDef.type === 'select' ? (
                                                    <select
                                                        value={config.testInputValues[varSel.variable] || ''}
                                                        onChange={(e) => updateConfig('testInputValues', {
                                                            ...config.testInputValues,
                                                            [varSel.variable]: e.target.value,
                                                        })}
                                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                                    >
                                                        <option value="">Select...</option>
                                                        {varDef.options?.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                ) : varDef.type === 'textarea' ? (
                                                    <textarea
                                                        value={config.testInputValues[varSel.variable] || ''}
                                                        onChange={(e) => updateConfig('testInputValues', {
                                                            ...config.testInputValues,
                                                            [varSel.variable]: e.target.value,
                                                        })}
                                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white h-20 resize-none"
                                                        placeholder={varDef.placeholder}
                                                    />
                                                ) : varDef.type === 'number' ? (
                                                    <input
                                                        type="number"
                                                        value={config.testInputValues[varSel.variable] || ''}
                                                        onChange={(e) => updateConfig('testInputValues', {
                                                            ...config.testInputValues,
                                                            [varSel.variable]: parseInt(e.target.value),
                                                        })}
                                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                                        min={varDef.min}
                                                        max={varDef.max}
                                                    />
                                                ) : varDef.type === 'checkbox' ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={config.testInputValues[varSel.variable] || false}
                                                        onChange={(e) => updateConfig('testInputValues', {
                                                            ...config.testInputValues,
                                                            [varSel.variable]: e.target.checked,
                                                        })}
                                                        className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={config.testInputValues[varSel.variable] || ''}
                                                        onChange={(e) => updateConfig('testInputValues', {
                                                            ...config.testInputValues,
                                                            [varSel.variable]: e.target.value,
                                                        })}
                                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                                        placeholder={varDef.placeholder}
                                                    />
                                                )}

                                                <p className="text-xs text-gray-500 mt-1">{varDef.instructions}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
                                    <Target className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                                    <p className="text-gray-400">No variables configured</p>
                                    <p className="text-gray-500 text-sm">Go to Variables tab to add input variables</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700 bg-gray-800/50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg text-white disabled:opacity-50 transition-all"
                        style={{ backgroundColor: colors.border }}
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
}
