'use client';

/**
 * AI PROVIDER SELECTOR
 * Reusable component for selecting AI providers and models
 * Fetches data from the database - NO HARDCODING
 */

import React, { useState, useEffect } from 'react';
import { Brain, Plus, X, ChevronDown, ChevronRight, Loader2, AlertCircle, Check } from 'lucide-react';
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';

// ============================================================================
// TYPES
// ============================================================================

export interface AIProvider {
    id: string;
    name: string;
    display_name: string;
    provider_type: string;
    is_active: boolean;
    models?: AIModel[];
}

export interface AIModel {
    id: string;
    key_name: string;
    model_id: string;
    model_name: string;
    description?: string;
    context_window?: number;
    input_cost_per_million?: number;
    output_cost_per_million?: number;
    is_active: boolean;
}

export interface SelectedModel {
    providerId: string;
    providerName: string;
    modelId: string;
    modelName: string;
    isPrimary: boolean;
    isFallback: boolean;
    temperature?: number;
    maxTokens?: number;
}

interface AIProviderSelectorProps {
    selectedModels: SelectedModel[];
    onChange: (models: SelectedModel[]) => void;
    maxModels?: number;
    showCosts?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AIProviderSelector({
    selectedModels,
    onChange,
    maxModels = 4,
    showCosts = true,
}: AIProviderSelectorProps) {
    const { fetchWithAuth } = useSuperadminAuth();

    const [providers, setProviders] = useState<AIProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

    // Fetch providers and models
    useEffect(() => {
        async function loadProviders() {
            setLoading(true);
            setError(null);

            try {
                // Use the existing ai-providers endpoint
                const response = await fetchWithAuth('/api/superadmin/ai-providers');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load providers');
                }

                // Transform the response to match our expected format
                // The API returns { providers: [...] } where each provider has:
                // id, provider (type), name, api_key, description, is_active, 
                // failures, usage_count, created_at, models_discovered
                const transformedProviders = (data.providers || []).map((p: any) => ({
                    id: p.id,
                    name: p.provider, // Use 'provider' as the name/type
                    display_name: p.name, // Use 'name' as display name
                    provider_type: p.provider,
                    is_active: p.is_active,
                    // Get models from models_discovered JSONB column
                    models: (p.models_discovered || []).map((m: any, idx: number) => ({
                        id: `${p.id}-model-${idx}`,
                        key_name: p.provider,
                        model_id: typeof m === 'string' ? m : (m.id || m.model_id),
                        model_name: typeof m === 'string' ? m : (m.name || m.id || m.model_id),
                        is_active: true,
                    })),
                }));

                setProviders(transformedProviders);
            } catch (err: any) {
                console.error('Failed to load AI providers:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadProviders();
    }, [fetchWithAuth]);

    // Add model to selection
    const addModel = (provider: AIProvider, model: AIModel) => {
        if (selectedModels.length >= maxModels) {
            alert(`Maximum ${maxModels} models allowed`);
            return;
        }

        const isAlreadySelected = selectedModels.some(
            m => m.providerId === provider.id && m.modelId === model.model_id
        );

        if (isAlreadySelected) {
            return;
        }

        const newModel: SelectedModel = {
            providerId: provider.id,
            providerName: provider.name,
            modelId: model.model_id,
            modelName: model.model_name,
            isPrimary: selectedModels.length === 0, // First model is primary
            isFallback: false,
        };

        onChange([...selectedModels, newModel]);
        setExpandedProvider(null);
    };

    // Remove model from selection
    const removeModel = (index: number) => {
        const newModels = selectedModels.filter((_, i) => i !== index);

        // Ensure at least one primary if we have models
        if (newModels.length > 0 && !newModels.some(m => m.isPrimary)) {
            newModels[0].isPrimary = true;
        }

        onChange(newModels);
    };

    // Toggle primary status
    const togglePrimary = (index: number) => {
        const newModels = selectedModels.map((m, i) => ({
            ...m,
            isPrimary: i === index,
        }));
        onChange(newModels);
    };

    // Toggle fallback status
    const toggleFallback = (index: number) => {
        const newModels = selectedModels.map((m, i) => ({
            ...m,
            isFallback: i === index ? !m.isFallback : m.isFallback,
        }));
        onChange(newModels);
    };

    // Get provider type color
    const getProviderColor = (type: string) => {
        const colors: Record<string, string> = {
            openai: '#10B981',     // Green
            anthropic: '#8B5CF6',  // Purple
            google: '#3B82F6',     // Blue
            mistral: '#F97316',    // Orange
            groq: '#EF4444',       // Red
            perplexity: '#06B6D4', // Cyan
        };
        return colors[type] || '#6B7280';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading AI providers...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-8 text-red-400">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* SELECTED MODELS */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                    Selected AI Models ({selectedModels.length}/{maxModels})
                </label>

                {selectedModels.length > 0 ? (
                    <div className="space-y-2">
                        {selectedModels.map((model, index) => (
                            <div
                                key={`${model.providerId}-${model.modelId}`}
                                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: `${getProviderColor(model.providerName)}20` }}
                                    >
                                        <Brain className="w-5 h-5" style={{ color: getProviderColor(model.providerName) }} />
                                    </div>
                                    <div>
                                        <div className="font-medium text-white flex items-center gap-2">
                                            {model.modelName}
                                            {model.isPrimary && (
                                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                                    Primary
                                                </span>
                                            )}
                                            {model.isFallback && (
                                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                                                    Fallback
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-400 capitalize">{model.providerName}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!model.isPrimary && (
                                        <button
                                            onClick={() => togglePrimary(index)}
                                            className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                                        >
                                            Set Primary
                                        </button>
                                    )}
                                    {!model.isPrimary && (
                                        <button
                                            onClick={() => toggleFallback(index)}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${model.isFallback
                                                ? 'bg-amber-500/20 text-amber-400'
                                                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                                }`}
                                        >
                                            Fallback
                                        </button>
                                    )}
                                    <button
                                        onClick={() => removeModel(index)}
                                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-gray-800/50 rounded-lg border border-dashed border-gray-600">
                        <Brain className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400">No models selected</p>
                        <p className="text-xs text-gray-500">Select a provider below to add models</p>
                    </div>
                )}
            </div>

            {/* PROVIDER SELECTION */}
            {selectedModels.length < maxModels && (
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                        Add AI Models
                    </label>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {providers.map(provider => (
                            <div key={provider.id} className="relative">
                                <button
                                    onClick={() => setExpandedProvider(
                                        expandedProvider === provider.id ? null : provider.id
                                    )}
                                    className={`w-full p-3 text-left rounded-lg border-2 transition-all duration-200 ${expandedProvider === provider.id
                                        ? 'border-primary bg-primary/10'
                                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded flex items-center justify-center"
                                                style={{ backgroundColor: `${getProviderColor(provider.name)}20` }}
                                            >
                                                <Brain className="w-3 h-3" style={{ color: getProviderColor(provider.name) }} />
                                            </div>
                                            <span className="font-medium text-white text-sm">
                                                {provider.display_name || provider.name}
                                            </span>
                                        </div>
                                        {expandedProvider === provider.id ? (
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        {provider.models?.length || 0} models
                                    </div>
                                </button>

                                {/* MODELS DROPDOWN */}
                                {expandedProvider === provider.id && provider.models && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                                        {provider.models.length > 0 ? (
                                            provider.models.map(model => {
                                                const isSelected = selectedModels.some(
                                                    m => m.providerId === provider.id && m.modelId === model.model_id
                                                );

                                                return (
                                                    <button
                                                        key={model.id}
                                                        onClick={() => !isSelected && addModel(provider, model)}
                                                        disabled={isSelected}
                                                        className={`w-full p-3 text-left border-b border-gray-700 last:border-b-0 transition-colors ${isSelected
                                                            ? 'bg-gray-700/50 cursor-not-allowed'
                                                            : 'hover:bg-gray-700'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="font-medium text-white text-sm">
                                                                {model.model_name}
                                                            </div>
                                                            {isSelected && (
                                                                <Check className="w-4 h-4 text-green-400" />
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-1">
                                                            {model.description || model.model_id}
                                                        </div>
                                                        {showCosts && model.input_cost_per_million && (
                                                            <div className="text-xs text-green-400 mt-1">
                                                                ${model.input_cost_per_million.toFixed(2)}/1M input •
                                                                ${model.output_cost_per_million?.toFixed(2) || '?'}/1M output
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="p-3 text-center text-gray-400 text-sm">
                                                No models available
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {providers.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No AI providers configured</p>
                            <p className="text-xs">Add providers in the AI Providers section</p>
                        </div>
                    )}
                </div>
            )}

            {/* HINT */}
            <div className="text-xs text-gray-500">
                💡 Select a primary model and optionally add fallback models for reliability.
                Fallback models are used when the primary fails.
            </div>
        </div>
    );
}
