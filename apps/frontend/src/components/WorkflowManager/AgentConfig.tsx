/**
 * AGENT CONFIG COMPONENT
 * For workflow nodes that invoke an Agent
 * 
 * Instead of configuring raw LLM provider/model/prompt per node,
 * the user picks an Agent from the catalog. The agent already carries
 * its own prompts, personality, LLM config, tools, and brain access.
 * 
 * This component:
 * - Fetches agent templates from /api/superadmin/agent-templates
 * - Shows a searchable dropdown with agent details
 * - Allows an instruction prompt override (per-node task instructions)
 * - Supports input/output variable mapping for the pipeline
 * 
 * @author Axiom AI
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    Bot, Search, ChevronDown, AlertCircle, Loader2,
    Brain, Zap, MessageSquare, Info
} from 'lucide-react';
import { superadminFetch } from '@/lib/superadmin-auth';

// ============================================================================
// TYPES
// ============================================================================

interface AgentTemplate {
    id: string;
    name: string;
    slug: string;
    description: string;
    category: string;
    avatar_emoji: string;
    avatar_color: string;
    system_prompt: string;
    preferred_provider: string;
    preferred_model: string;
    temperature: number;
    max_tokens: number;
    tools_enabled: string[];
    can_access_brain: boolean;
    can_write_to_brain: boolean;
    is_active: boolean;
}

export interface AgentNodeConfig {
    // Which agent to invoke
    agentTemplateId: string;
    agentSlug: string;
    agentName: string;

    // Per-node instruction (appended to agent's system prompt)
    taskInstruction: string;

    // Input mapping: which variable from the pipeline feeds into this agent
    inputMode: 'previous_output' | 'user_input' | 'custom';
    customInputTemplate: string;

    // Output mapping: how the agent's output is named in the pipeline
    outputVariable: string;

    // Optional overrides (null = use agent defaults)
    temperatureOverride: number | null;
    maxTokensOverride: number | null;
}

interface AgentConfigProps {
    nodeType: string;
    config: AgentNodeConfig;
    onChange: (config: AgentNodeConfig) => void;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_AGENT_CONFIG: AgentNodeConfig = {
    agentTemplateId: '',
    agentSlug: '',
    agentName: '',
    taskInstruction: '',
    inputMode: 'previous_output',
    customInputTemplate: '',
    outputVariable: 'agentOutput',
    temperatureOverride: null,
    maxTokensOverride: null,
};

// ============================================================================
// CATEGORY DISPLAY
// ============================================================================

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
    writer: { label: 'Writers', icon: '✍️' },
    researcher: { label: 'Researchers', icon: '🔍' },
    coach: { label: 'Coaches', icon: '🎯' },
    scraper: { label: 'Scrapers', icon: '🕷️' },
    analyst: { label: 'Analysts', icon: '📊' },
    general: { label: 'General', icon: '🤖' },
};

// ============================================================================
// AGENT CONFIG COMPONENT
// ============================================================================

export function AgentConfig({ nodeType, config, onChange }: AgentConfigProps) {
    const [agents, setAgents] = useState<AgentTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showOverrides, setShowOverrides] = useState(false);

    // Fetch agent templates on mount
    useEffect(() => {
        const fetchAgents = async () => {
            try {
                setLoading(true);
                const response = await superadminFetch('/api/superadmin/agent-templates?active=true');
                if (response.ok) {
                    const data = await response.json();
                    setAgents(data.agents || data.data || []);
                } else {
                    setError('Failed to load agents');
                }
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };
        fetchAgents();
    }, []);

    // Filter agents by search
    const filteredAgents = useMemo(() => {
        if (!searchQuery.trim()) return agents;
        const q = searchQuery.toLowerCase();
        return agents.filter(a =>
            a.name.toLowerCase().includes(q) ||
            a.slug.toLowerCase().includes(q) ||
            a.description?.toLowerCase().includes(q) ||
            a.category?.toLowerCase().includes(q)
        );
    }, [agents, searchQuery]);

    // Group by category
    const groupedAgents = useMemo(() => {
        const groups: Record<string, AgentTemplate[]> = {};
        for (const agent of filteredAgents) {
            const cat = agent.category || 'general';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(agent);
        }
        return groups;
    }, [filteredAgents]);

    // Selected agent
    const selectedAgent = useMemo(() => {
        if (!config.agentTemplateId) return null;
        return agents.find(a => a.id === config.agentTemplateId) || null;
    }, [agents, config.agentTemplateId]);

    // Handle agent selection
    const handleSelectAgent = (agent: AgentTemplate) => {
        onChange({
            ...config,
            agentTemplateId: agent.id,
            agentSlug: agent.slug,
            agentName: agent.name,
        });
        setIsDropdownOpen(false);
        setSearchQuery('');
    };

    const handleConfigChange = (field: keyof AgentNodeConfig, value: unknown) => {
        onChange({ ...config, [field]: value });
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    if (loading) {
        return (
            <div className="agent-config-loading">
                <Loader2 className="spin" size={20} />
                <span>Loading agents...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="agent-config-error">
                <AlertCircle size={20} />
                <span>{error}</span>
            </div>
        );
    }

    return (
        <div className="agent-config">
            {/* Agent Selector */}
            <div className="agent-config-section">
                <label className="agent-config-label">
                    <Bot size={16} />
                    Select Agent
                </label>

                {/* Selected Agent Display */}
                {selectedAgent ? (
                    <div className="agent-config-selected" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                        <div className="agent-config-selected-info">
                            <span className="agent-config-emoji">{selectedAgent.avatar_emoji}</span>
                            <div>
                                <strong>{selectedAgent.name}</strong>
                                <span className="agent-config-slug">{selectedAgent.slug}</span>
                            </div>
                        </div>
                        <div className="agent-config-selected-meta">
                            {selectedAgent.can_access_brain && (
                                <span className="agent-config-badge brain">
                                    <Brain size={12} /> Brain
                                </span>
                            )}
                            <span className="agent-config-badge provider">
                                {selectedAgent.preferred_provider}/{selectedAgent.preferred_model}
                            </span>
                            <ChevronDown size={16} className={isDropdownOpen ? 'rotated' : ''} />
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="agent-config-select-btn"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <Bot size={18} />
                        <span>Choose an agent for this node...</span>
                        <ChevronDown size={16} />
                    </button>
                )}

                {/* Agent Dropdown */}
                {isDropdownOpen && (
                    <div className="agent-config-dropdown">
                        <div className="agent-config-search">
                            <Search size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search agents..."
                                autoFocus
                            />
                        </div>

                        <div className="agent-config-dropdown-list">
                            {Object.entries(groupedAgents).map(([category, categoryAgents]) => (
                                <div key={category} className="agent-config-group">
                                    <div className="agent-config-group-header">
                                        <span>{CATEGORY_LABELS[category]?.icon || '🤖'}</span>
                                        <span>{CATEGORY_LABELS[category]?.label || category}</span>
                                        <span className="agent-config-group-count">
                                            {categoryAgents.length}
                                        </span>
                                    </div>
                                    {categoryAgents.map(agent => (
                                        <button
                                            key={agent.id}
                                            type="button"
                                            className={`agent-config-option ${config.agentTemplateId === agent.id ? 'selected' : ''}`}
                                            onClick={() => handleSelectAgent(agent)}
                                        >
                                            <span className="agent-config-option-emoji">
                                                {agent.avatar_emoji}
                                            </span>
                                            <div className="agent-config-option-info">
                                                <strong>{agent.name}</strong>
                                                <span>{agent.description?.substring(0, 80) || agent.slug}</span>
                                            </div>
                                            <div className="agent-config-option-badges">
                                                {agent.can_access_brain && (
                                                    <span className="agent-config-mini-badge">
                                                        <Brain size={10} />
                                                    </span>
                                                )}
                                                {agent.tools_enabled?.length > 0 && (
                                                    <span className="agent-config-mini-badge">
                                                        <Zap size={10} />
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ))}

                            {filteredAgents.length === 0 && (
                                <div className="agent-config-empty">
                                    No agents found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Task Instruction (per-node override) */}
            <div className="agent-config-section">
                <label className="agent-config-label">
                    <MessageSquare size={16} />
                    Task Instruction
                    <span className="agent-config-hint">
                        What should this agent do in this specific step?
                    </span>
                </label>
                <textarea
                    className="agent-config-textarea"
                    value={config.taskInstruction}
                    onChange={(e) => handleConfigChange('taskInstruction', e.target.value)}
                    placeholder="e.g., Write 5 cold emails for {{input.product}} targeting {{previousOutput.icp}}. Use a casual, confident tone."
                    rows={4}
                />
                <div className="agent-config-vars">
                    <Info size={12} />
                    <span>Available: <code>{'{{input.fieldName}}'}</code>, <code>{'{{previousOutput}}'}</code>, <code>{'{{kb}}'}</code></span>
                </div>
            </div>

            {/* Input Mode */}
            <div className="agent-config-section">
                <label className="agent-config-label">
                    Input Source
                </label>
                <div className="agent-config-radio-group">
                    <label className="agent-config-radio">
                        <input
                            type="radio"
                            name="inputMode"
                            value="previous_output"
                            checked={config.inputMode === 'previous_output'}
                            onChange={() => handleConfigChange('inputMode', 'previous_output')}
                        />
                        <span>Previous node output</span>
                    </label>
                    <label className="agent-config-radio">
                        <input
                            type="radio"
                            name="inputMode"
                            value="user_input"
                            checked={config.inputMode === 'user_input'}
                            onChange={() => handleConfigChange('inputMode', 'user_input')}
                        />
                        <span>Workflow trigger input</span>
                    </label>
                    <label className="agent-config-radio">
                        <input
                            type="radio"
                            name="inputMode"
                            value="custom"
                            checked={config.inputMode === 'custom'}
                            onChange={() => handleConfigChange('inputMode', 'custom')}
                        />
                        <span>Custom template</span>
                    </label>
                </div>

                {config.inputMode === 'custom' && (
                    <textarea
                        className="agent-config-textarea agent-config-textarea-small"
                        value={config.customInputTemplate}
                        onChange={(e) => handleConfigChange('customInputTemplate', e.target.value)}
                        placeholder="Custom input template using {{variables}}..."
                        rows={2}
                    />
                )}
            </div>

            {/* Output Variable */}
            <div className="agent-config-section">
                <label className="agent-config-label">
                    Output Variable Name
                </label>
                <input
                    type="text"
                    className="agent-config-input"
                    value={config.outputVariable}
                    onChange={(e) => handleConfigChange('outputVariable', e.target.value)}
                    placeholder="agentOutput"
                />
                <div className="agent-config-vars">
                    <Info size={12} />
                    <span>Next nodes can reference this as <code>{`{{${config.outputVariable || 'agentOutput'}}}`}</code></span>
                </div>
            </div>

            {/* Optional Overrides */}
            <div className="agent-config-section">
                <label className="agent-config-toggle-label">
                    <input
                        type="checkbox"
                        checked={showOverrides}
                        onChange={(e) => setShowOverrides(e.target.checked)}
                    />
                    Override agent defaults for this node
                </label>

                {showOverrides && (
                    <div className="agent-config-overrides">
                        <div className="agent-config-override-row">
                            <label>Temperature</label>
                            <input
                                type="number"
                                value={config.temperatureOverride ?? selectedAgent?.temperature ?? 0.7}
                                onChange={(e) => handleConfigChange('temperatureOverride', parseFloat(e.target.value))}
                                min={0}
                                max={2}
                                step={0.1}
                            />
                        </div>
                        <div className="agent-config-override-row">
                            <label>Max Tokens</label>
                            <input
                                type="number"
                                value={config.maxTokensOverride ?? selectedAgent?.max_tokens ?? 4096}
                                onChange={(e) => handleConfigChange('maxTokensOverride', parseInt(e.target.value))}
                                min={100}
                                max={128000}
                                step={100}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Agent Info Card */}
            {selectedAgent && (
                <div className="agent-config-info-card">
                    <div className="agent-config-info-header">
                        <span>{selectedAgent.avatar_emoji}</span>
                        <strong>{selectedAgent.name}</strong>
                    </div>
                    <div className="agent-config-info-grid">
                        <div>
                            <span className="agent-config-info-label">Provider</span>
                            <span>{selectedAgent.preferred_provider}</span>
                        </div>
                        <div>
                            <span className="agent-config-info-label">Model</span>
                            <span>{selectedAgent.preferred_model}</span>
                        </div>
                        <div>
                            <span className="agent-config-info-label">Brain Access</span>
                            <span>{selectedAgent.can_access_brain ? '✅ Yes' : '❌ No'}</span>
                        </div>
                        <div>
                            <span className="agent-config-info-label">Brain Write</span>
                            <span>{selectedAgent.can_write_to_brain ? '✅ Yes' : '❌ No'}</span>
                        </div>
                        <div>
                            <span className="agent-config-info-label">Tools</span>
                            <span>{selectedAgent.tools_enabled?.length || 0}</span>
                        </div>
                        <div>
                            <span className="agent-config-info-label">Temp</span>
                            <span>{selectedAgent.temperature}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AgentConfig;
