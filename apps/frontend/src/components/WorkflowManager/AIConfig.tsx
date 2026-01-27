/**
 * AI CONFIG COMPONENT
 * For nodes that require AI configuration
 * 
 * Features:
 * - Fetches models from ai_model_metadata (single source of truth)
 * - Groups models by provider
 * - Supports unlimited fallback AIs with cost estimation
 * - No hardcoded providers or models
 * 
 * @author Axiom AI
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, GripVertical, AlertCircle, Loader2, ChevronDown, DollarSign } from 'lucide-react';
import { superadminFetch } from '@/lib/superadmin-auth';

// ============================================================================
// TYPES
// ============================================================================

// Model from ai_model_metadata table
interface AIModel {
    id: string;
    provider: string;
    model_id: string;
    model_name: string;
    input_cost_per_million?: number;
    output_cost_per_million?: number;
    context_window_tokens?: number;
    max_output_tokens?: number;
    is_active: boolean;
}

// Derived provider from models
interface AIProvider {
    id: string;
    provider: string;
    name: string;
    models: AIModel[];
}

interface AIConfigEntry {
    id: string;
    providerId: string;
    providerName: string;
    model: string;
    modelName?: string;
    temperature: number;
    maxTokens: number;
    estimatedCost?: { input: number; output: number };
}

interface AIConfigProps {
    config: AIConfigEntry[];
    onChange: (config: AIConfigEntry[]) => void;
    systemPromptLabel?: string;
    systemPrompt: string;
    onSystemPromptChange: (prompt: string) => void;
}

// Provider display config
const PROVIDER_DISPLAY: Record<string, { name: string; icon: string }> = {
    openai: { name: 'OpenAI', icon: '🤖' },
    anthropic: { name: 'Anthropic', icon: '🧠' },
    google: { name: 'Google', icon: '✨' },
    mistral: { name: 'Mistral', icon: '⚡' },
    perplexity: { name: 'Perplexity', icon: '🔍' },
    xai: { name: 'xAI', icon: '🚀' }
};

// ============================================================================
// HELPER - Generate unique ID
// ============================================================================

const generateId = () => `ai-${Date.now()}-${Math.random().toString(36).substring(7)}`;

// ============================================================================
// AI CONFIG COMPONENT
// ============================================================================

export function AIConfig({
    config,
    onChange,
    systemPromptLabel = 'System Instructions',
    systemPrompt,
    onSystemPromptChange
}: AIConfigProps) {
    const [allModels, setAllModels] = useState<AIModel[]>([]);
    const [loadingModels, setLoadingModels] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch models from ai_model_metadata on mount
    // Uses public API endpoint (not superadmin) so workflow editor can access
    useEffect(() => {
        const fetchModels = async () => {
            try {
                setLoadingModels(true);
                // Use public endpoint - fetches only active, tested models
                const response = await fetch('/api/ai-models');
                if (response.ok) {
                    const data = await response.json();
                    setAllModels(data.models || []);
                } else {
                    setError('Failed to load AI models');
                }
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Unknown error');
            } finally {
                setLoadingModels(false);
            }
        };
        fetchModels();
    }, []);

    // Group models by provider
    const providers = useMemo((): AIProvider[] => {
        const grouped: Record<string, AIModel[]> = {};
        for (const model of allModels) {
            if (!grouped[model.provider]) {
                grouped[model.provider] = [];
            }
            grouped[model.provider].push(model);
        }

        return Object.entries(grouped).map(([provider, models]) => ({
            id: provider,
            provider,
            name: PROVIDER_DISPLAY[provider]?.name || provider,
            models
        }));
    }, [allModels]);

    // Add new AI entry
    const addAIEntry = useCallback(() => {
        const newEntry: AIConfigEntry = {
            id: generateId(),
            providerId: '',
            providerName: '',
            model: '',
            temperature: 0.7,
            maxTokens: 2048
        };
        onChange([...config, newEntry]);
    }, [config, onChange]);

    // Remove AI entry
    const removeAIEntry = useCallback((id: string) => {
        onChange(config.filter(c => c.id !== id));
    }, [config, onChange]);

    // Update AI entry
    const updateEntry = useCallback((id: string, updates: Partial<AIConfigEntry>) => {
        onChange(config.map(c => c.id === id ? { ...c, ...updates } : c));
    }, [config, onChange]);

    // Get models for a provider - returns full model objects with cost info
    const getModelsForProvider = useCallback((providerId: string): AIModel[] => {
        const provider = providers.find(p => p.id === providerId);
        if (!provider) return [];
        return provider.models;
    }, [providers]);

    // Get full model info for cost display
    const getModelInfo = useCallback((providerId: string, modelId: string): AIModel | undefined => {
        const provider = providers.find(p => p.id === providerId);
        return provider?.models.find(m => m.model_id === modelId);
    }, [providers]);

    // ========================================================================
    // RENDER
    // ========================================================================

    if (loadingModels) {
        return (
            <div className="ai-config-loading">
                <Loader2 className="spin" size={20} />
                <span>Loading AI models...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ai-config-error">
                <AlertCircle size={20} />
                <span>{error}</span>
            </div>
        );
    }

    if (providers.length === 0) {
        return (
            <div className="ai-config-empty">
                <AlertCircle size={20} />
                <div>
                    <strong>No AI Providers Configured</strong>
                    <p>Add AI providers in Settings → AI Providers before using AI nodes.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ai-config">
            {/* System Prompt */}
            <div className="ai-config-section">
                <label className="ai-config-label">{systemPromptLabel}</label>
                <textarea
                    className="ai-config-prompt"
                    value={systemPrompt}
                    onChange={(e) => onSystemPromptChange(e.target.value)}
                    placeholder="Enter system instructions for the AI..."
                    rows={4}
                />
            </div>

            {/* AI Providers */}
            <div className="ai-config-section">
                <div className="ai-config-header">
                    <label className="ai-config-label">
                        AI Models
                        <span className="ai-config-hint">First is primary, rest are fallbacks</span>
                    </label>
                    <button
                        type="button"
                        className="ai-config-add-btn"
                        onClick={addAIEntry}
                    >
                        <Plus size={16} />
                        Add AI
                    </button>
                </div>

                {config.length === 0 && (
                    <div className="ai-config-empty-list">
                        Click "Add AI" to configure an AI model for this node
                    </div>
                )}

                <div className="ai-config-list">
                    {config.map((entry, index) => (
                        <AIConfigEntryRow
                            key={entry.id}
                            entry={entry}
                            index={index}
                            providers={providers}
                            models={getModelsForProvider(entry.providerId)}
                            onUpdate={(updates) => updateEntry(entry.id, updates)}
                            onRemove={() => removeAIEntry(entry.id)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// AI ENTRY ROW COMPONENT
// ============================================================================

interface AIConfigEntryRowProps {
    entry: AIConfigEntry;
    index: number;
    providers: AIProvider[];
    models: AIModel[];
    onUpdate: (updates: Partial<AIConfigEntry>) => void;
    onRemove: () => void;
}

function AIConfigEntryRow({
    entry,
    index,
    providers,
    models,
    onUpdate,
    onRemove
}: AIConfigEntryRowProps) {
    const isPrimary = index === 0;

    // Get selected model info for cost display
    const selectedModel = models.find(m => m.model_id === entry.model);

    const handleProviderChange = (providerId: string) => {
        const provider = providers.find(p => p.id === providerId);
        onUpdate({
            providerId,
            providerName: provider?.name || '',
            model: '' // Reset model when provider changes
        });
    };

    const handleModelChange = (modelId: string) => {
        const model = models.find(m => m.model_id === modelId);
        onUpdate({
            model: modelId,
            modelName: model?.model_name,
            estimatedCost: model ? {
                input: model.input_cost_per_million || 0,
                output: model.output_cost_per_million || 0
            } : undefined
        });
    };

    return (
        <div className={`ai-config-entry ${isPrimary ? 'primary' : 'fallback'}`}>
            <div className="ai-config-entry-badge">
                {isPrimary ? 'Primary' : `Fallback ${index}`}
            </div>

            <div className="ai-config-entry-fields">
                {/* Provider Select */}
                <div className="ai-config-field">
                    <label>Provider</label>
                    <div className="ai-config-select-wrapper">
                        <select
                            value={entry.providerId}
                            onChange={(e) => handleProviderChange(e.target.value)}
                        >
                            <option value="">Select provider...</option>
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>

                {/* Model Select - With cost info */}
                <div className="ai-config-field">
                    <label>Model</label>
                    <div className="ai-config-select-wrapper">
                        <select
                            value={entry.model}
                            onChange={(e) => handleModelChange(e.target.value)}
                            disabled={!entry.providerId}
                        >
                            <option value="">
                                {entry.providerId ? 'Select model...' : 'Select provider first'}
                            </option>
                            {models.map(m => (
                                <option key={m.model_id} value={m.model_id}>
                                    {m.model_name} (${m.input_cost_per_million?.toFixed(2) || 0}/${m.output_cost_per_million?.toFixed(2) || 0} per M)
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                    {selectedModel && (
                        <div className="ai-config-cost-hint">
                            <DollarSign size={12} />
                            <span>
                                ${selectedModel.input_cost_per_million?.toFixed(2)}/M in,
                                ${selectedModel.output_cost_per_million?.toFixed(2)}/M out
                            </span>
                        </div>
                    )}
                </div>

                {/* Temperature */}
                <div className="ai-config-field ai-config-field-small">
                    <label>Temperature</label>
                    <input
                        type="number"
                        value={entry.temperature}
                        onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) || 0.7 })}
                        min={0}
                        max={2}
                        step={0.1}
                    />
                </div>

                {/* Max Tokens */}
                <div className="ai-config-field ai-config-field-small">
                    <label>Max Tokens</label>
                    <input
                        type="number"
                        value={entry.maxTokens}
                        onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) || 2048 })}
                        min={100}
                        max={128000}
                        step={100}
                    />
                </div>
            </div>

            {/* Remove Button */}
            <button
                type="button"
                className="ai-config-remove-btn"
                onClick={onRemove}
                title="Remove this AI"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}

export default AIConfig;
