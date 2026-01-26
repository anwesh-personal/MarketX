/**
 * AI CONFIG COMPONENT
 * For nodes that require AI configuration
 * 
 * Features:
 * - Fetches configured AI providers from database
 * - Dynamically loads models for selected provider
 * - Supports unlimited fallback AIs
 * - No hardcoded providers or models
 * 
 * @author Axiom AI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, GripVertical, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import { superadminFetch } from '@/lib/superadmin-auth';

// ============================================================================
// TYPES
// ============================================================================

interface AIProvider {
    id: string;
    provider: string;
    name: string;
    is_active: boolean;
    models_discovered: string[];
}

interface AIConfigEntry {
    id: string;
    providerId: string;
    providerName: string;
    model: string;
    temperature: number;
    maxTokens: number;
}

interface AIConfigProps {
    config: AIConfigEntry[];
    onChange: (config: AIConfigEntry[]) => void;
    systemPromptLabel?: string;
    systemPrompt: string;
    onSystemPromptChange: (prompt: string) => void;
}

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
    const [providers, setProviders] = useState<AIProvider[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch configured AI providers on mount
    useEffect(() => {
        const fetchProviders = async () => {
            try {
                setLoadingProviders(true);
                const response = await superadminFetch('/api/superadmin/ai-providers');
                if (response.ok) {
                    const data = await response.json();
                    // Only show active providers with models
                    const activeProviders = (data.providers || []).filter(
                        (p: AIProvider) => p.is_active && p.models_discovered?.length > 0
                    );
                    setProviders(activeProviders);
                } else {
                    setError('Failed to load AI providers');
                }
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Unknown error');
            } finally {
                setLoadingProviders(false);
            }
        };
        fetchProviders();
    }, []);

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

    // Get models for a provider
    const getModelsForProvider = useCallback((providerId: string): string[] => {
        const provider = providers.find(p => p.id === providerId);
        return provider?.models_discovered || [];
    }, [providers]);

    // ========================================================================
    // RENDER
    // ========================================================================

    if (loadingProviders) {
        return (
            <div className="ai-config-loading">
                <Loader2 className="spin" size={20} />
                <span>Loading AI providers...</span>
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
    models: string[];
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

    const handleProviderChange = (providerId: string) => {
        const provider = providers.find(p => p.id === providerId);
        onUpdate({
            providerId,
            providerName: provider?.name || '',
            model: '' // Reset model when provider changes
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
                                    {p.name} ({p.provider})
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>

                {/* Model Select - Dynamically populated */}
                <div className="ai-config-field">
                    <label>Model</label>
                    <div className="ai-config-select-wrapper">
                        <select
                            value={entry.model}
                            onChange={(e) => onUpdate({ model: e.target.value })}
                            disabled={!entry.providerId}
                        >
                            <option value="">
                                {entry.providerId ? 'Select model...' : 'Select provider first'}
                            </option>
                            {models.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
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
