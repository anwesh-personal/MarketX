'use client';

import React, { useState, useEffect } from 'react';
import {
    Bot,
    Zap,
    CheckCircle,
    XCircle,
    Loader2,
    Play,
    RefreshCw,
    DollarSign,
    Eye,
    MessageSquare,
    Layers,
    Filter,
    Search,
    ToggleLeft,
    ToggleRight,
    Plus,
    Send,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';

// Types
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
    supports_streaming?: boolean;
    is_active: boolean;
    test_passed?: boolean;
    test_error?: string;
    last_tested?: string;
}

interface AIProvider {
    id: string;
    provider: string;
    name: string;
    is_active: boolean;
}

// Provider config with colors
const PROVIDER_CONFIG: Record<string, { name: string; color: string; bgColor: string }> = {
    openai: { name: 'OpenAI', color: 'text-success', bgColor: 'bg-success-muted' },
    anthropic: { name: 'Anthropic', color: 'text-warning', bgColor: 'bg-warning-muted' },
    google: { name: 'Google', color: 'text-info', bgColor: 'bg-info-muted' },
    mistral: { name: 'Mistral', color: 'text-accent', bgColor: 'bg-accent/10' },
    perplexity: { name: 'Perplexity', color: 'text-info', bgColor: 'bg-info-muted' },
    xai: { name: 'xAI', color: 'text-textSecondary', bgColor: 'bg-surfaceHover' },
};

export default function AIModelsPage() {
    const { fetchWithAuth } = useSuperadminAuth();
    const [models, setModels] = useState<AIModel[]>([]);
    const [providers, setProviders] = useState<AIProvider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTesting, setIsTesting] = useState<string | null>(null);
    const [isDiscovering, setIsDiscovering] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterProvider, setFilterProvider] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Full model list (show all available from provider)
    const [showAllModelsFor, setShowAllModelsFor] = useState<string | null>(null);
    const [allAvailableModels, setAllAvailableModels] = useState<Array<{
        model_id: string;
        model_name: string;
        description?: string;
        already_added: boolean;
        is_active: boolean;
        test_passed?: boolean;
    }>>([]);
    const [isLoadingAllModels, setIsLoadingAllModels] = useState(false);
    const [addingModelId, setAddingModelId] = useState<string | null>(null);

    // Playground Chat
    const [playgroundOpen, setPlaygroundOpen] = useState(false);
    const [playgroundModel, setPlaygroundModel] = useState<AIModel | null>(null);
    const [playgroundInput, setPlaygroundInput] = useState('');
    const [playgroundMessages, setPlaygroundMessages] = useState<Array<{
        role: 'user' | 'assistant';
        content: string;
    }>>([]);
    const [playgroundLoading, setPlaygroundLoading] = useState(false);
    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const MAX_MESSAGES = 50; // Limit message history

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [playgroundMessages, playgroundLoading]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load ALL models (not just active)
            const modelsRes = await fetchWithAuth('/api/superadmin/ai-models');
            const modelsData = await modelsRes.json();
            setModels(modelsData.models || []);

            // Load providers for discovery
            const providersRes = await fetchWithAuth('/api/superadmin/ai-providers');
            const providersData = await providersRes.json();
            setProviders(providersData.providers || []);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDiscoverModels = async (providerId: string, providerName: string) => {
        setIsDiscovering(providerId);
        try {
            const res = await fetchWithAuth('/api/superadmin/ai-models/discover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider_id: providerId }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success(`Discovered ${data.models_discovered} models from ${providerName}`);
                await loadData();
            } else {
                toast.error(data.error || 'Discovery failed');
            }
        } catch (error) {
            toast.error('Discovery failed');
        } finally {
            setIsDiscovering(null);
        }
    };

    const handleShowAllModels = async (providerId: string) => {
        if (showAllModelsFor === providerId) {
            // Toggle off
            setShowAllModelsFor(null);
            setAllAvailableModels([]);
            return;
        }

        setIsLoadingAllModels(true);
        setShowAllModelsFor(providerId);

        try {
            const res = await fetchWithAuth('/api/superadmin/ai-models/list-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider_id: providerId }),
            });
            const data = await res.json();

            if (data.success) {
                setAllAvailableModels(data.models || []);
            } else {
                toast.error(data.error || 'Failed to fetch models');
                setShowAllModelsFor(null);
            }
        } catch (error) {
            toast.error('Failed to fetch models');
            setShowAllModelsFor(null);
        } finally {
            setIsLoadingAllModels(false);
        }
    };

    const handleAddModel = async (modelId: string) => {
        if (!showAllModelsFor) return;

        setAddingModelId(modelId);

        try {
            const res = await fetchWithAuth('/api/superadmin/ai-models/add-model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider_id: showAllModelsFor,
                    model_id: modelId,
                }),
            });
            const data = await res.json();

            if (data.success) {
                if (data.is_active) {
                    toast.success(`✅ ${data.model_name} added and verified!`);
                } else {
                    toast.error(`⚠️ ${data.model_name} added but test failed: ${data.error}`);
                }
                // Refresh both the main list and the available models list
                await loadData();
                // Update the available models list to show this one as added
                setAllAvailableModels(prev => prev.map(m =>
                    m.model_id === modelId
                        ? { ...m, already_added: true, is_active: data.is_active, test_passed: data.test_passed }
                        : m
                ));
            } else {
                toast.error(data.error || 'Failed to add model');
            }
        } catch (error) {
            toast.error('Failed to add model');
        } finally {
            setAddingModelId(null);
        }
    };

    const handleTestModel = async (model: AIModel) => {
        setIsTesting(model.id);
        try {
            // Find provider with API key
            const provider = providers.find(p => p.provider === model.provider && p.is_active);
            if (!provider) {
                toast.error(`No active API key found for ${model.provider}`);
                return;
            }

            const res = await fetchWithAuth('/api/superadmin/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: model.provider,
                    model: model.model_id,
                    messages: [{ role: 'user', content: 'Say "test successful" in 3 words or less.' }],
                    max_tokens: 10,
                }),
            });

            const data = await res.json();
            const passed = res.ok && data.content;

            // Update model test status
            await fetchWithAuth('/api/superadmin/ai-models', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: model.id,
                    test_passed: passed,
                    test_error: passed ? null : (data.error || 'Test failed'),
                    last_tested: new Date().toISOString(),
                }),
            });

            toast.success(passed ? `${model.model_name} test passed!` : `${model.model_name} test failed`);
            await loadData();
        } catch (error) {
            toast.error('Test failed');
        } finally {
            setIsTesting(null);
        }
    };

    const handleToggleActive = async (model: AIModel) => {
        try {
            await fetchWithAuth('/api/superadmin/ai-models', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: model.id,
                    is_active: !model.is_active,
                }),
            });
            toast.success(`${model.model_name} ${model.is_active ? 'deactivated' : 'activated'}`);
            await loadData();
        } catch (error) {
            toast.error('Failed to update model');
        }
    };

    // Playground handlers
    const openPlayground = (model: AIModel) => {
        setPlaygroundModel(model);
        setPlaygroundMessages([]);
        setPlaygroundInput('');
        setPlaygroundOpen(true);
    };

    const closePlayground = () => {
        setPlaygroundOpen(false);
        setPlaygroundModel(null);
        setPlaygroundMessages([]);
        setPlaygroundInput('');
    };

    const sendPlaygroundMessage = async () => {
        if (!playgroundInput.trim() || !playgroundModel || playgroundLoading) return;

        const userMessage = playgroundInput.trim();
        setPlaygroundInput('');
        setPlaygroundMessages(prev => {
            const newMessages = [...prev, { role: 'user' as const, content: userMessage }];
            return newMessages.slice(-MAX_MESSAGES);
        });
        setPlaygroundLoading(true);

        try {
            const res = await fetchWithAuth('/api/superadmin/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: playgroundModel.provider,
                    model: playgroundModel.model_id,
                    messages: [...playgroundMessages, { role: 'user', content: userMessage }].slice(-10), // Send last 10 for context
                    max_tokens: 1024,
                }),
            });

            const data = await res.json();

            if (res.ok && data.content) {
                setPlaygroundMessages(prev => {
                    const newMessages = [...prev, { role: 'assistant' as const, content: data.content }];
                    return newMessages.slice(-MAX_MESSAGES);
                });
            } else {
                setPlaygroundMessages(prev => {
                    const newMessages = [...prev, { role: 'assistant' as const, content: `Error: ${data.error || 'Failed to get response'}` }];
                    return newMessages.slice(-MAX_MESSAGES);
                });
                toast.error(data.error || 'Failed to get response');
            }
        } catch (error: any) {
            setPlaygroundMessages(prev => {
                const newMessages = [...prev, { role: 'assistant' as const, content: `Error: ${error.message || 'Failed to get response'}` }];
                return newMessages.slice(-MAX_MESSAGES);
            });
            toast.error('Failed to send message');
        } finally {
            setPlaygroundLoading(false);
        }
    };

    // Filter models
    const filteredModels = models.filter(m => {
        if (searchQuery && !m.model_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !m.model_id.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        if (filterProvider !== 'all' && m.provider !== filterProvider) return false;
        if (filterStatus === 'active' && !m.is_active) return false;
        if (filterStatus === 'inactive' && m.is_active) return false;
        if (filterStatus === 'tested' && !m.test_passed) return false;
        if (filterStatus === 'untested' && m.test_passed !== undefined) return false;
        return true;
    });

    // Get unique providers from models
    const modelProviders = [...new Set(models.map(m => m.provider))];

    // Stats
    const stats = {
        total: models.length,
        active: models.filter(m => m.is_active).length,
        tested: models.filter(m => m.test_passed).length,
        providers: modelProviders.length,
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-lg">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-textPrimary mb-xs flex items-center gap-sm">
                        <Layers className="w-7 h-7 text-primary" />
                        AI Models
                    </h1>
                    <p className="text-sm text-textSecondary">
                        Manage AI models, test availability, and configure for use in workflows
                    </p>
                </div>
                <button
                    onClick={loadData}
                    className="flex items-center gap-xs px-md py-sm bg-surface border border-border rounded-lg hover:bg-surfaceHover transition-all"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
                <div className="bg-surface border border-border rounded-lg p-md">
                    <p className="text-xs text-textTertiary mb-xs">Total Models</p>
                    <p className="text-2xl font-bold text-textPrimary">{stats.total}</p>
                </div>
                <div className="bg-surface border border-success/30 rounded-lg p-md">
                    <p className="text-xs text-success mb-xs">Active</p>
                    <p className="text-2xl font-bold text-success">{stats.active}</p>
                </div>
                <div className="bg-surface border border-info/30 rounded-lg p-md">
                    <p className="text-xs text-info mb-xs">Tested & Working</p>
                    <p className="text-2xl font-bold text-info">{stats.tested}</p>
                </div>
                <div className="bg-surface border border-accent/30 rounded-lg p-md">
                    <p className="text-xs text-accent mb-xs">Providers</p>
                    <p className="text-2xl font-bold text-accent">{stats.providers}</p>
                </div>
            </div>

            {/* Discover Models Section */}
            {providers.filter(p => p.is_active).length > 0 && (
                <div className="bg-surface border border-border rounded-lg p-md">
                    <h3 className="text-sm font-semibold text-textPrimary mb-sm flex items-center gap-xs">
                        <Zap className="w-4 h-4 text-warning" />
                        Discover Models from Providers
                    </h3>
                    <div className="flex flex-wrap gap-sm">
                        {providers.filter(p => p.is_active).map(provider => {
                            const config = PROVIDER_CONFIG[provider.provider] || { name: provider.provider, color: 'text-textPrimary', bgColor: 'bg-surface' };
                            const isShowingAllForThis = showAllModelsFor === provider.id;
                            return (
                                <div key={provider.id} className="flex flex-col gap-sm">
                                    <div className="flex items-center gap-sm">
                                        <button
                                            onClick={() => handleDiscoverModels(provider.id, provider.name)}
                                            disabled={isDiscovering === provider.id}
                                            className={`flex items-center gap-xs px-sm py-xs ${config.bgColor} ${config.color} border border-current/20 rounded-lg hover:opacity-80 disabled:opacity-50 transition-all text-sm`}
                                        >
                                            {isDiscovering === provider.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Zap className="w-3 h-3" />
                                            )}
                                            Discover {config.name}
                                        </button>
                                        <button
                                            onClick={() => handleShowAllModels(provider.id)}
                                            className={`flex items-center gap-xs px-sm py-xs border rounded-lg text-sm transition-all ${isShowingAllForThis
                                                ? 'bg-primary text-textInverse border-primary'
                                                : 'bg-surface text-textSecondary border-border hover:border-primary'
                                                }`}
                                        >
                                            {isLoadingAllModels && showAllModelsFor === provider.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Layers className="w-3 h-3" />
                                            )}
                                            {isShowingAllForThis ? 'Hide All' : 'Show All Models'}
                                        </button>
                                    </div>

                                    {/* All Available Models Panel */}
                                    {isShowingAllForThis && !isLoadingAllModels && (
                                        <div className="bg-background border border-border rounded-lg p-md max-h-[400px] overflow-y-auto">
                                            <p className="text-xs text-textTertiary mb-sm">
                                                {allAvailableModels.length} models available from {config.name}. Click to add & test.
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-sm">
                                                {allAvailableModels.map(m => (
                                                    <div
                                                        key={m.model_id}
                                                        className={`p-sm border rounded-lg transition-all ${m.already_added
                                                            ? m.is_active
                                                                ? 'bg-success-muted border-success/30'
                                                                : 'bg-error-muted border-error/30'
                                                            : 'bg-surface border-border hover:border-primary'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-xs">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium text-textPrimary truncate">{m.model_name}</p>
                                                                <p className="text-xs text-textTertiary truncate">{m.model_id}</p>
                                                                {m.description && (
                                                                    <p className="text-xs text-textTertiary mt-xs truncate">{m.description}</p>
                                                                )}
                                                            </div>
                                                            {m.already_added ? (
                                                                <span className={`text-xs px-xs py-0.5 rounded ${m.is_active ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                                                                    }`}>
                                                                    {m.is_active ? 'Active' : 'Failed'}
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleAddModel(m.model_id)}
                                                                    disabled={addingModelId === m.model_id}
                                                                    className="flex items-center gap-xs px-xs py-xs bg-primary hover:bg-primary/80 text-textInverse text-xs rounded disabled:opacity-50"
                                                                >
                                                                    {addingModelId === m.model_id ? (
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                    ) : (
                                                                        <Plus className="w-3 h-3" />
                                                                    )}
                                                                    Add
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-md bg-surface border border-border rounded-lg p-md">
                <div className="flex items-center gap-xs flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-textTertiary" />
                    <input
                        type="text"
                        placeholder="Search models..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-textPrimary placeholder-textTertiary focus:outline-none"
                    />
                </div>

                <div className="flex items-center gap-xs">
                    <Filter className="w-4 h-4 text-textTertiary" />
                    <select
                        value={filterProvider}
                        onChange={(e) => setFilterProvider(e.target.value)}
                        className="bg-background border border-border rounded px-sm py-xs text-sm text-textPrimary"
                    >
                        <option value="all">All Providers</option>
                        {modelProviders.map(p => (
                            <option key={p} value={p}>{PROVIDER_CONFIG[p]?.name || p}</option>
                        ))}
                    </select>
                </div>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-background border border-border rounded px-sm py-xs text-sm text-textPrimary"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                    <option value="tested">Tested & Working</option>
                    <option value="untested">Not Yet Tested</option>
                </select>

                {(searchQuery || filterProvider !== 'all' || filterStatus !== 'all') && (
                    <button
                        onClick={() => { setSearchQuery(''); setFilterProvider('all'); setFilterStatus('all'); }}
                        className="text-xs text-primary hover:underline"
                    >
                        Clear filters
                    </button>
                )}

                <span className="text-xs text-textTertiary ml-auto">
                    Showing {filteredModels.length} of {models.length}
                </span>
            </div>

            {/* Models Table */}
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-background/50">
                        <tr>
                            <th className="text-left px-md py-sm text-xs font-semibold text-textTertiary uppercase">Model</th>
                            <th className="text-left px-md py-sm text-xs font-semibold text-textTertiary uppercase">Provider</th>
                            <th className="text-left px-md py-sm text-xs font-semibold text-textTertiary uppercase">Cost ($/1M)</th>
                            <th className="text-left px-md py-sm text-xs font-semibold text-textTertiary uppercase">Context</th>
                            <th className="text-left px-md py-sm text-xs font-semibold text-textTertiary uppercase">Capabilities</th>
                            <th className="text-left px-md py-sm text-xs font-semibold text-textTertiary uppercase">Status</th>
                            <th className="text-left px-md py-sm text-xs font-semibold text-textTertiary uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredModels.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-xl text-textSecondary">
                                    <Bot className="w-12 h-12 mx-auto mb-sm opacity-30" />
                                    <p>No models found</p>
                                    <p className="text-xs text-textTertiary mt-xs">
                                        {models.length === 0
                                            ? 'Add API keys in AI Providers, then click Discover to find models'
                                            : 'Try adjusting your filters'}
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            filteredModels.map(model => {
                                const config = PROVIDER_CONFIG[model.provider] || { name: model.provider, color: 'text-textPrimary', bgColor: 'bg-surface' };
                                return (
                                    <tr key={model.id} className={`hover:bg-surfaceHover transition-colors ${!model.is_active ? 'opacity-60' : ''}`}>
                                        <td className="px-md py-sm">
                                            <div>
                                                <p className="font-medium text-textPrimary text-sm">{model.model_name}</p>
                                                <p className="text-xs text-textTertiary font-mono">{model.model_id}</p>
                                            </div>
                                        </td>
                                        <td className="px-md py-sm">
                                            <span className={`inline-flex items-center px-xs py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                                                {config.name}
                                            </span>
                                        </td>
                                        <td className="px-md py-sm">
                                            <div className="flex items-center gap-xs text-xs">
                                                <DollarSign className="w-3 h-3 text-textTertiary" />
                                                <span className="text-textSecondary">
                                                    {model.input_cost_per_million != null ? `$${model.input_cost_per_million}` : '-'} /
                                                    {model.output_cost_per_million != null ? `$${model.output_cost_per_million}` : '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-md py-sm text-xs text-textSecondary">
                                            {model.context_window_tokens
                                                ? `${(model.context_window_tokens / 1000).toFixed(0)}K`
                                                : '-'}
                                        </td>
                                        <td className="px-md py-sm">
                                            <div className="flex items-center gap-xs">
                                                {model.supports_vision && (
                                                    <span className="text-xs text-info" title="Vision">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                                {model.supports_function_calling && (
                                                    <span className="text-xs text-accent" title="Functions">
                                                        <Zap className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                                {model.supports_streaming && (
                                                    <span className="text-xs text-info" title="Streaming">
                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-md py-sm">
                                            <div className="flex items-center gap-xs">
                                                {model.test_passed === true && (
                                                    <span title="Test passed"><CheckCircle className="w-4 h-4 text-success" /></span>
                                                )}
                                                {model.test_passed === false && (
                                                    <span title={model.test_error || 'Test failed'}><XCircle className="w-4 h-4 text-error" /></span>
                                                )}
                                                {model.is_active ? (
                                                    <span className="text-xs text-success">Active</span>
                                                ) : (
                                                    <span className="text-xs text-textTertiary">Inactive</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-md py-sm">
                                            <div className="flex items-center gap-xs">
                                                <button
                                                    onClick={() => handleTestModel(model)}
                                                    disabled={isTesting === model.id}
                                                    className="p-xs rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-all"
                                                    title="Test model"
                                                >
                                                    {isTesting === model.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Play className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => openPlayground(model)}
                                                    disabled={!model.is_active}
                                                    className="p-xs rounded bg-info-muted text-info hover:bg-info/20 disabled:opacity-50 transition-all"
                                                    title="Chat with model"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(model)}
                                                    className={`p-xs rounded transition-all ${model.is_active
                                                        ? 'bg-success/10 text-success hover:bg-success/20'
                                                        : 'bg-surface text-textTertiary hover:bg-surfaceHover'}`}
                                                    title={model.is_active ? 'Deactivate' : 'Activate'}
                                                >
                                                    {model.is_active ? (
                                                        <ToggleRight className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <ToggleLeft className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Playground Chat Modal */}
            {playgroundOpen && playgroundModel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70">
                    <div className="bg-background border border-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between p-md border-b border-border">
                            <div className="flex items-center gap-sm">
                                <Bot className="w-5 h-5 text-primary" />
                                <div>
                                    <h3 className="font-semibold text-textPrimary">{playgroundModel.model_name}</h3>
                                    <p className="text-xs text-textTertiary">{playgroundModel.provider} / {playgroundModel.model_id}</p>
                                </div>
                            </div>
                            <button
                                onClick={closePlayground}
                                className="p-xs rounded hover:bg-surface transition-all text-textTertiary hover:text-textPrimary"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-md space-y-md min-h-[300px]">
                            {playgroundMessages.length === 0 && (
                                <div className="text-center text-textTertiary py-lg">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-sm opacity-30" />
                                    <p>Start a conversation with {playgroundModel.model_name}</p>
                                    <p className="text-xs mt-xs">Type a message below to test the model</p>
                                </div>
                            )}
                            {playgroundMessages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] px-md py-sm rounded-lg ${msg.role === 'user'
                                            ? 'bg-primary text-textInverse rounded-br-none'
                                            : 'bg-surface border border-border text-textPrimary rounded-bl-none'
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                            {playgroundLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-surface border border-border px-md py-sm rounded-lg rounded-bl-none">
                                        <Loader2 className="w-4 h-4 animate-spin text-textTertiary" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-md border-t border-border">
                            <div className="flex gap-sm">
                                <input
                                    type="text"
                                    value={playgroundInput}
                                    onChange={(e) => setPlaygroundInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendPlaygroundMessage()}
                                    placeholder="Type your message..."
                                    className="flex-1 bg-surface border border-border rounded-lg px-md py-sm text-textPrimary placeholder-textTertiary focus:outline-none focus:border-primary"
                                    disabled={playgroundLoading}
                                />
                                <button
                                    onClick={sendPlaygroundMessage}
                                    disabled={!playgroundInput.trim() || playgroundLoading}
                                    className="px-md py-sm bg-primary text-textInverse rounded-lg hover:bg-primary/80 disabled:opacity-50 transition-all flex items-center gap-xs"
                                >
                                    {playgroundLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
