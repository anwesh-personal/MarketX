'use client';

import React, { useState, useEffect } from 'react';
import {
    Bot,
    Plus,
    Zap,
    CheckCircle,
    XCircle,
    Loader2,
    Terminal,
    X,
    Play,
    Trash2,
    Edit2,
    Save,
    RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types
interface AIProvider {
    id: string;
    provider: string;
    name: string;
    api_key: string;
    description?: string;
    is_active: boolean;
    failures: number;
    usage_count: number;
    created_at: string;
}

interface AIModel {
    id: string;
    provider: string;
    model_id: string;
    model_name: string;
    key_name?: string;
    input_cost_per_million?: number;
    output_cost_per_million?: number;
    context_window_tokens?: number;
    max_output_tokens?: number;
    supports_vision?: boolean;
    supports_function_calling?: boolean;
    is_active: boolean;
    test_passed?: boolean;
    test_error?: string;
    last_tested?: string;
}

interface ConsoleLog {
    timestamp: string;
    type: 'info' | 'success' | 'error' | 'warning';
    message: string;
}

interface DiscoveredModel {
    id: string;
    name: string;
    context_window?: number;
    input_cost?: number;
    output_cost?: number;
    supports_vision?: boolean;
    supports_function_calling?: boolean;
}

const PROVIDER_OPTIONS = [
    { value: 'openai', label: 'OpenAI', color: 'var(--color-primary)' },
    { value: 'anthropic', label: 'Anthropic', color: 'var(--color-accent)' },
    { value: 'google', label: 'Google', color: 'var(--color-info)' },
    { value: 'mistral', label: 'Mistral', color: 'var(--color-warning)' },
    { value: 'perplexity', label: 'Perplexity', color: 'var(--color-success)' },
    { value: 'xai', label: 'X.AI (Grok)', color: 'var(--color-textPrimary)' },
];

export default function AIManagementPage() {
    // State
    const [activeTab, setActiveTab] = useState<'providers' | 'discover' | 'models'>('providers');
    const [providers, setProviders] = useState<AIProvider[]>([]);
    const [models, setModels] = useState<AIModel[]>([]);
    const [discoveredModels, setDiscoveredModels] = useState<DiscoveredModel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [showConsole, setShowConsole] = useState(false);
    const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
    const [editingModel, setEditingModel] = useState<{ id: string; field: string; value: any } | null>(null);
    const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());

    // Add API Key Form
    const [showAddProvider, setShowAddProvider] = useState(false);
    const [newProvider, setNewProvider] = useState({
        provider: 'openai',
        name: '',
        api_key: '',
        description: '',
    });

    // Load data
    useEffect(() => {
        loadProviders();
        loadModels();
    }, []);

    const addConsoleLog = (message: string, type: ConsoleLog['type'] = 'info') => {
        const log: ConsoleLog = {
            timestamp: new Date().toLocaleTimeString(),
            type,
            message,
        };
        setConsoleLogs(prev => [...prev, log]);
    };

    const loadProviders = async () => {
        try {
            const res = await fetch('/api/superadmin/ai-providers');
            const data = await res.json();
            setProviders(data.providers || []);
        } catch (error: any) {
            toast.error('Failed to load providers');
            console.error(error);
        }
    };

    const loadModels = async () => {
        try {
            const res = await fetch('/api/superadmin/ai-models?is_active=true');
            const data = await res.json();
            setModels(data.models || []);
        } catch (error: any) {
            toast.error('Failed to load models');
            console.error(error);
        }
    };

    const handleAddProvider = async () => {
        if (!newProvider.name || !newProvider.api_key) {
            toast.error('Name and API key are required');
            return;
        }

        try {
            const res = await fetch('/api/superadmin/ai-providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProvider),
            });

            if (!res.ok) throw new Error('Failed to add provider');

            const data = await res.json();
            setProviders(prev => [data.provider, ...prev]);
            setShowAddProvider(false);
            setNewProvider({ provider: 'openai', name: '', api_key: '', description: '' });
            toast.success('Provider added successfully');
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDiscoverModels = async () => {
        if (!selectedProvider) {
            toast.error('Please select a provider first');
            return;
        }

        setIsLoading(true);
        addConsoleLog(`🔍 Discovering models for ${selectedProvider.name}...`, 'info');

        try {
            const res = await fetch('/api/superadmin/ai-providers/discover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: selectedProvider.provider,
                    api_key: selectedProvider.api_key,
                }),
            });

            if (!res.ok) throw new Error('Failed to discover models');

            const data = await res.json();
            setDiscoveredModels(data.models || []);
            addConsoleLog(`✅ Found ${data.count} models`, 'success');
            toast.success(`Discovered ${data.count} models`);
        } catch (error: any) {
            addConsoleLog(`❌ Error: ${error.message}`, 'error');
            toast.error('Failed to discover models');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestModel = async (model: DiscoveredModel) => {
        if (!selectedProvider) return;

        addConsoleLog(`🧪 Testing ${model.name}...`, 'info');

        try {
            const res = await fetch('/api/superadmin/ai-providers/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: selectedProvider.provider,
                    model_id: model.id,
                    api_key: selectedProvider.api_key,
                }),
            });

            const data = await res.json();

            if (data.success) {
                addConsoleLog(`✅ ${model.name}: ${data.response} (${data.duration}ms)`, 'success');

                // Save to database
                await fetch('/api/superadmin/ai-models', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        provider: selectedProvider.provider,
                        model_id: model.id,
                        model_name: model.name,
                        key_name: selectedProvider.name,
                        input_cost_per_million: model.input_cost,
                        output_cost_per_million: model.output_cost,
                        context_window_tokens: model.context_window,
                        supports_vision: model.supports_vision,
                        supports_function_calling: model.supports_function_calling,
                        is_active: true,
                        test_passed: true,
                    }),
                });

                await loadModels();
            } else {
                addConsoleLog(`❌ ${model.name}: ${data.error}`, 'error');
            }
        } catch (error: any) {
            addConsoleLog(`❌ ${model.name}: ${error.message}`, 'error');
        }
    };

    const handleTestAllModels = async () => {
        if (!selectedProvider || discoveredModels.length === 0) return;

        setIsTesting(true);
        setShowConsole(true);
        addConsoleLog(`🚀 Starting test for ${discoveredModels.length} models...`, 'info');

        for (const model of discoveredModels) {
            await handleTestModel(model);
            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        addConsoleLog(`✅ Testing complete!`, 'success');
        setIsTesting(false);
        toast.success('Testing complete');
    };

    const handleUpdateModel = async (modelId: string, updates: Partial<AIModel>) => {
        try {
            const res = await fetch('/api/superadmin/ai-models', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: modelId, ...updates }),
            });

            if (!res.ok) throw new Error('Failed to update model');

            await loadModels();
            setEditingModel(null);
            toast.success('Model updated');
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleBatchAction = async (action: 'activate' | 'deactivate' | 'delete') => {
        if (selectedModels.size === 0) {
            toast.error('No models selected');
            return;
        }

        try {
            for (const modelId of Array.from(selectedModels)) {
                if (action === 'delete') {
                    await fetch(`/api/superadmin/ai-models?id=${modelId}`, {
                        method: 'DELETE',
                    });
                } else {
                    await handleUpdateModel(modelId, {
                        is_active: action === 'activate',
                    });
                }
            }

            setSelectedModels(new Set());
            await loadModels();
            toast.success(`${action === 'delete' ? 'Deleted' : 'Updated'} ${selectedModels.size} models`);
        } catch (error: any) {
            toast.error('Batch action failed');
        }
    };

    return (
        <div className="space-y-lg">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                        AI Provider Management
                    </h1>
                    <p className="text-textSecondary">
                        Discover, test, and manage AI models across multiple providers
                    </p>
                </div>

                <button
                    onClick={() => setShowConsole(!showConsole)}
                    className="
                        flex items-center gap-xs
                        bg-surface text-textPrimary
                        border border-border
                        px-md py-sm
                        rounded-[var(--radius-md)]
                        hover:bg-surfaceHover
                        transition-all
                    "
                >
                    <Terminal className="w-5 h-5" />
                    <span>Console</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-xs border-b border-border">
                {[
                    { id: 'providers', label: 'API Keys', icon: Bot },
                    { id: 'discover', label: 'Discover Models', icon: Zap },
                    { id: 'models', label: 'Active Models', icon: CheckCircle },
                ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                flex items-center gap-xs
                                px-md py-sm
                                border-b-2 transition-all
                                ${activeTab === tab.id
                                    ? 'border-primary text-primary font-medium'
                                    : 'border-transparent text-textSecondary hover:text-textPrimary'
                                }
                            `}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="mt-lg">
                {activeTab === 'providers' && (
                    <ProvidersTab
                        providers={providers}
                        showAddProvider={showAddProvider}
                        setShowAddProvider={setShowAddProvider}
                        newProvider={newProvider}
                        setNewProvider={setNewProvider}
                        handleAddProvider={handleAddProvider}
                        onSelectProvider={setSelectedProvider}
                        selectedProvider={selectedProvider}
                    />
                )}

                {activeTab === 'discover' && (
                    <DiscoverTab
                        selectedProvider={selectedProvider}
                        discoveredModels={discoveredModels}
                        isLoading={isLoading}
                        isTesting={isTesting}
                        onDiscover={handleDiscoverModels}
                        onTestAll={handleTestAllModels}
                        onTestModel={handleTestModel}
                    />
                )}

                {activeTab === 'models' && (
                    <ModelsTab
                        models={models}
                        selectedModels={selectedModels}
                        setSelectedModels={setSelectedModels}
                        editingModel={editingModel}
                        setEditingModel={setEditingModel}
                        onUpdateModel={handleUpdateModel}
                        onBatchAction={handleBatchAction}
                    />
                )}
            </div>

            {/* Console Modal */}
            {showConsole && (
                <ConsoleModal
                    logs={consoleLogs}
                    onClose={() => setShowConsole(false)}
                    onClear={() => setConsoleLogs([])}
                />
            )}
        </div>
    );
}

// ============================================================
// PROVIDERS TAB
// ============================================================

interface ProvidersTabProps {
    providers: AIProvider[];
    showAddProvider: boolean;
    setShowAddProvider: (show: boolean) => void;
    newProvider: any;
    setNewProvider: (provider: any) => void;
    handleAddProvider: () => void;
    onSelectProvider: (provider: AIProvider | null) => void;
    selectedProvider: AIProvider | null;
}

function ProvidersTab({
    providers,
    showAddProvider,
    setShowAddProvider,
    newProvider,
    setNewProvider,
    handleAddProvider,
    onSelectProvider,
    selectedProvider,
}: ProvidersTabProps) {
    return (
        <div className="space-y-md">
            {/* Add Provider Button */}
            <div className="flex justify-end">
                <button
                    onClick={() => setShowAddProvider(true)}
                    className="
                        flex items-center gap-xs
                        bg-primary text-white
                        px-md py-sm
                        rounded-[var(--radius-md)]
                        font-medium
                        hover:opacity-90
                        hover:shadow-[var(--shadow-md)]
                        transition-all
                    "
                >
                    <Plus className="w-5 h-5" />
                    <span>Add API Key</span>
                </button>
            </div>

            {/* Add Provider Form */}
            {showAddProvider && (
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                    <h3 className="text-lg font-bold text-textPrimary mb-md">Add New API Key</h3>

                    <div className="space-y-md">
                        <div>
                            <label className="block text-sm font-medium text-textPrimary mb-xs">
                                Provider
                            </label>
                            <select
                                value={newProvider.provider}
                                onChange={(e) => setNewProvider({ ...newProvider, provider: e.target.value })}
                                className="
                                    w-full bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    px-sm py-xs
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all
                                "
                            >
                                {PROVIDER_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-textPrimary mb-xs">
                                Name (Label)
                            </label>
                            <input
                                type="text"
                                value={newProvider.name}
                                onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                                placeholder="e.g., OpenAI-Production-01"
                                className="
                                    w-full bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    px-sm py-xs
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all
                                "
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-textPrimary mb-xs">
                                API Key
                            </label>
                            <input
                                type="password"
                                value={newProvider.api_key}
                                onChange={(e) => setNewProvider({ ...newProvider, api_key: e.target.value })}
                                placeholder="sk-..."
                                className="
                                    w-full bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    px-sm py-xs
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all
                                "
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-textPrimary mb-xs">
                                Description (Optional)
                            </label>
                            <textarea
                                value={newProvider.description}
                                onChange={(e) => setNewProvider({ ...newProvider, description: e.target.value })}
                                rows={2}
                                className="
                                    w-full bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    px-sm py-xs
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all
                                "
                            />
                        </div>

                        <div className="flex justify-end gap-sm">
                            <button
                                onClick={() => setShowAddProvider(false)}
                                className="
                                    px-md py-sm
                                    text-textSecondary
                                    hover:text-textPrimary hover:bg-surfaceHover
                                    rounded-[var(--radius-md)]
                                    transition-all
                                "
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddProvider}
                                className="
                                    bg-primary text-white
                                    px-md py-sm
                                    rounded-[var(--radius-md)]
                                    hover:opacity-90
                                    transition-all
                                "
                            >
                                Add Provider
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Providers List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {providers.map((provider) => (
                    <div
                        key={provider.id}
                        onClick={() => onSelectProvider(provider)}
                        className={`
                            bg-surface border rounded-[var(--radius-lg)] p-md
                            cursor-pointer transition-all
                            ${selectedProvider?.id === provider.id
                                ? 'border-primary shadow-[var(--shadow-md)]'
                                : 'border-border hover:border-borderHover hover:shadow-[var(--shadow-sm)]'
                            }
                        `}
                    >
                        <div className="flex items-start justify-between mb-sm">
                            <div className="flex items-center gap-sm">
                                <Bot className="w-5 h-5 text-primary" />
                                <h4 className="font-bold text-textPrimary">{provider.name}</h4>
                            </div>
                            <span className="text-xs px-sm py-xs bg-primary/10 text-primary rounded-[var(--radius-sm)]">
                                {PROVIDER_OPTIONS.find(p => p.value === provider.provider)?.label}
                            </span>
                        </div>

                        {provider.description && (
                            <p className="text-sm text-textSecondary mb-sm">{provider.description}</p>
                        )}

                        <div className="flex items-center gap-md text-xs text-textTertiary">
                            <span>Used: {provider.usage_count} times</span>
                            <span>Failures: {provider.failures}</span>
                            <span className={provider.is_active ? 'text-success' : 'text-error'}>
                                {provider.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {providers.length === 0 && !showAddProvider && (
                <div className="text-center py-2xl text-textSecondary">
                    <Bot className="w-12 h-12 mx-auto mb-md opacity-50" />
                    <p>No API keys added yet</p>
                    <p className="text-sm">Click "Add API Key" to get started</p>
                </div>
            )}
        </div>
    );
}

// ============================================================
// DISCOVER TAB
// ============================================================

interface DiscoverTabProps {
    selectedProvider: AIProvider | null;
    discoveredModels: DiscoveredModel[];
    isLoading: boolean;
    isTesting: boolean;
    onDiscover: () => void;
    onTestAll: () => void;
    onTestModel: (model: DiscoveredModel) => void;
}

function DiscoverTab({
    selectedProvider,
    discoveredModels,
    isLoading,
    isTesting,
    onDiscover,
    onTestAll,
    onTestModel,
}: DiscoverTabProps) {
    if (!selectedProvider) {
        return (
            <div className="text-center py-2xl">
                <Zap className="w-12 h-12 mx-auto mb-md text-textTertiary" />
                <p className="text-textPrimary mb-xs">No Provider Selected</p>
                <p className="text-sm text-textSecondary">
                    Go to "API Keys" tab and select a provider first
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-lg">
            {/* Selected Provider Info */}
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-textSecondary mb-xs">Selected Provider</p>
                        <h3 className="text-lg font-bold text-textPrimary">{selectedProvider.name}</h3>
                    </div>
                    <button
                        onClick={onDiscover}
                        disabled={isLoading}
                        className="
                            flex items-center gap-xs
                            bg-primary text-white
                            px-md py-sm
                            rounded-[var(--radius-md)]
                            hover:opacity-90
                            disabled:opacity-50
                            transition-all
                        "
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-5 h-5" />
                        )}
                        <span>{isLoading ? 'Discovering...' : 'Discover Models'}</span>
                    </button>
                </div>
            </div>

            {/* Discovered Models */}
            {discoveredModels.length > 0 && (
                <>
                    <div className="flex justify-between items-center">
                        <p className="text-textSecondary">
                            Found {discoveredModels.length} models
                        </p>
                        <button
                            onClick={onTestAll}
                            disabled={isTesting}
                            className="
                                flex items-center gap-xs
                                bg-success text-white
                                px-md py-sm
                                rounded-[var(--radius-md)]
                                hover:opacity-90
                                disabled:opacity-50
                                transition-all
                            "
                        >
                            {isTesting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Play className="w-5 h-5" />
                            )}
                            <span>{isTesting ? 'Testing...' : 'Test All Models'}</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-sm">
                        {discoveredModels.map((model) => (
                            <div
                                key={model.id}
                                className="
                                    bg-surface border border-border
                                    rounded-[var(--radius-md)]
                                    p-md
                                    flex items-center justify-between
                                    hover:border-borderHover
                                    transition-all
                                "
                            >
                                <div className="flex-1">
                                    <h4 className="font-medium text-textPrimary">{model.name}</h4>
                                    <div className="flex items-center gap-md text-xs text-textTertiary mt-xs">
                                        {model.context_window && (
                                            <span>{model.context_window.toLocaleString()} tokens</span>
                                        )}
                                        {model.input_cost && (
                                            <span>${model.input_cost}/1M input</span>
                                        )}
                                        {model.supports_vision && (
                                            <span className="text-info">Vision ✓</span>
                                        )}
                                        {model.supports_function_calling && (
                                            <span className="text-success">Functions ✓</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onTestModel(model)}
                                    disabled={isTesting}
                                    className="
                                        px-sm py-xs
                                        bg-primary/10 text-primary
                                        rounded-[var(--radius-sm)]
                                        hover:bg-primary/20
                                        disabled:opacity-50
                                        transition-all
                                    "
                                >
                                    Test
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ============================================================
// MODELS TAB
// ============================================================

interface ModelsTabProps {
    models: AIModel[];
    selectedModels: Set<string>;
    setSelectedModels: (models: Set<string>) => void;
    editingModel: { id: string; field: string; value: any } | null;
    setEditingModel: (editing: { id: string; field: string; value: any } | null) => void;
    onUpdateModel: (id: string, updates: Partial<AIModel>) => void;
    onBatchAction: (action: 'activate' | 'deactivate' | 'delete') => void;
}

function ModelsTab({
    models,
    selectedModels,
    setSelectedModels,
    editingModel,
    setEditingModel,
    onUpdateModel,
    onBatchAction,
}: ModelsTabProps) {
    const toggleModel = (id: string) => {
        const newSet = new Set(selectedModels);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedModels(newSet);
    };

    const toggleAll = () => {
        if (selectedModels.size === models.length) {
            setSelectedModels(new Set());
        } else {
            setSelectedModels(new Set(models.map(m => m.id)));
        }
    };

    return (
        <div className="space-y-md">
            {/* Batch Actions */}
            {selectedModels.size > 0 && (
                <div className="flex items-center gap-sm bg-primary/10 border border-primary/20 rounded-[var(--radius-md)] p-sm">
                    <span className="text-sm text-primary font-medium">
                        {selectedModels.size} selected
                    </span>
                    <div className="flex-1" />
                    <button
                        onClick={() => onBatchAction('activate')}
                        className="px-sm py-xs bg-success text-white rounded-[var(--radius-sm)] text-sm hover:opacity-90"
                    >
                        Activate
                    </button>
                    <button
                        onClick={() => onBatchAction('deactivate')}
                        className="px-sm py-xs bg-warning text-white rounded-[var(--radius-sm)] text-sm hover:opacity-90"
                    >
                        Deactivate
                    </button>
                    <button
                        onClick={() => onBatchAction('delete')}
                        className="px-sm py-xs bg-error text-white rounded-[var(--radius-sm)] text-sm hover:opacity-90"
                    >
                        Delete
                    </button>
                </div>
            )}

            {/* Models Table */}
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-surfaceHover border-b border-border">
                            <tr>
                                <th className="px-sm py-xs text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedModels.size === models.length && models.length > 0}
                                        onChange={toggleAll}
                                        className="rounded border-border"
                                    />
                                </th>
                                <th className="px-sm py-xs text-left text-xs font-medium text-textSecondary">Provider</th>
                                <th className="px-sm py-xs text-left text-xs font-medium text-textSecondary">Model</th>
                                <th className="px-sm py-xs text-left text-xs font-medium text-textSecondary">Context</th>
                                <th className="px-sm py-xs text-left text-xs font-medium text-textSecondary">Input Cost</th>
                                <th className="px-sm py-xs text-left text-xs font-medium text-textSecondary">Output Cost</th>
                                <th className="px-sm py-xs text-left text-xs font-medium text-textSecondary">Status</th>
                                <th className="px-sm py-xs text-left text-xs font-medium text-textSecondary">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {models.map((model) => (
                                <tr key={model.id} className="border-b border-border hover:bg-surfaceHover">
                                    <td className="px-sm py-xs">
                                        <input
                                            type="checkbox"
                                            checked={selectedModels.has(model.id)}
                                            onChange={() => toggleModel(model.id)}
                                            className="rounded border-border"
                                        />
                                    </td>
                                    <td className="px-sm py-xs text-sm text-textPrimary">{model.provider}</td>
                                    <td className="px-sm py-xs">
                                        {editingModel?.id === model.id && editingModel.field === 'model_name' ? (
                                            <input
                                                type="text"
                                                value={editingModel.value}
                                                onChange={(e) => setEditingModel({ ...editingModel, value: e.target.value })}
                                                onBlur={() => {
                                                    onUpdateModel(model.id, { model_name: editingModel.value });
                                                }}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        onUpdateModel(model.id, { model_name: editingModel.value });
                                                    }
                                                }}
                                                autoFocus
                                                className="w-full bg-background border border-border rounded px-xs py-1 text-sm"
                                            />
                                        ) : (
                                            <span
                                                className="text-sm text-textPrimary cursor-pointer hover:text-primary"
                                                onClick={() => setEditingModel({ id: model.id, field: 'model_name', value: model.model_name })}
                                            >
                                                {model.model_name}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-sm py-xs text-sm text-textSecondary">
                                        {model.context_window_tokens?.toLocaleString() || '-'}
                                    </td>
                                    <td className="px-sm py-xs text-sm text-textSecondary">
                                        ${model.input_cost_per_million?.toFixed(4) || '-'}
                                    </td>
                                    <td className="px-sm py-xs text-sm text-textSecondary">
                                        ${model.output_cost_per_million?.toFixed(4) || '-'}
                                    </td>
                                    <td className="px-sm py-xs">
                                        {model.test_passed ? (
                                            <span className="flex items-center gap-xs text-success text-sm">
                                                <CheckCircle className="w-4 h-4" />
                                                Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-xs text-error text-sm">
                                                <XCircle className="w-4 h-4" />
                                                Failed
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-sm py-xs">
                                        <button
                                            onClick={() => onUpdateModel(model.id, { is_active: !model.is_active })}
                                            className="text-primary hover:text-primary/80 text-sm"
                                        >
                                            {model.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {models.length === 0 && (
                <div className="text-center py-2xl text-textSecondary">
                    <CheckCircle className="w-12 h-12 mx-auto mb-md opacity-50" />
                    <p>No models discovered yet</p>
                    <p className="text-sm">Use "Discover Models" tab to find and test models</p>
                </div>
            )}
        </div>
    );
}

// ============================================================
// CONSOLE MODAL
// ============================================================

interface ConsoleModalProps {
    logs: ConsoleLog[];
    onClose: () => void;
    onClear: () => void;
}

function ConsoleModal({ logs, onClose, onClear }: ConsoleModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-overlay">
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] w-full max-w-4xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-md border-b border-border">
                    <div className="flex items-center gap-sm">
                        <Terminal className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-textPrimary">Console Output</h3>
                    </div>
                    <div className="flex items-center gap-sm">
                        <button
                            onClick={onClear}
                            className="px-sm py-xs text-sm text-textSecondary hover:text-textPrimary"
                        >
                            Clear
                        </button>
                        <button
                            onClick={onClose}
                            className="p-xs hover:bg-surfaceHover rounded-[var(--radius-sm)]"
                        >
                            <X className="w-5 h-5 text-textSecondary" />
                        </button>
                    </div>
                </div>

                {/* Logs */}
                <div className="flex-1 overflow-y-auto p-md bg-background font-mono text-sm">
                    {logs.length === 0 ? (
                        <p className="text-textTertiary">No logs yet...</p>
                    ) : (
                        logs.map((log, index) => (
                            <div key={index} className="mb-xs">
                                <span className="text-textTertiary">[{log.timestamp}]</span>{' '}
                                <span className={
                                    log.type === 'success' ? 'text-success' :
                                        log.type === 'error' ? 'text-error' :
                                            log.type === 'warning' ? 'text-warning' :
                                                'text-textSecondary'
                                }>
                                    {log.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
