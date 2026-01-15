'use client'

import { useState, useEffect } from 'react'
import {
    Bot, Plus, Key, Trash2, ToggleLeft, ToggleRight,
    Save, X, AlertTriangle, CheckCircle, Loader2,
    Eye, EyeOff, RefreshCw, Settings
} from 'lucide-react'
import toast from 'react-hot-toast'

interface AIProvider {
    id: string
    provider: string
    name: string
    api_key: string
    description?: string
    is_active: boolean
    failures: number
    usage_count: number
    created_at: string
}

const PROVIDERS = [
    { id: 'openai', name: 'OpenAI', color: 'from-green-500/10 to-emerald-500/10 text-green-500' },
    { id: 'anthropic', name: 'Anthropic', color: 'from-orange-500/10 to-red-500/10 text-orange-500' },
    { id: 'google', name: 'Google Gemini', color: 'from-blue-500/10 to-cyan-500/10 text-blue-500' },
    { id: 'mistral', name: 'Mistral AI', color: 'from-purple-500/10 to-pink-500/10 text-purple-500' },
    { id: 'perplexity', name: 'Perplexity', color: 'from-cyan-500/10 to-blue-500/10 text-cyan-500' },
    { id: 'xai', name: 'X.AI (Grok)', color: 'from-gray-500/10 to-slate-500/10 text-gray-500' },
]

export default function AIProvidersPage() {
    const [providers, setProviders] = useState<AIProvider[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [addingTo, setAddingTo] = useState<string | null>(null)
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())

    const [newKey, setNewKey] = useState({
        name: '',
        api_key: '',
        description: '',
    })

    useEffect(() => {
        loadProviders()
    }, [])

    const loadProviders = async () => {
        try {
            const res = await fetch('/api/superadmin/ai-providers')
            const data = await res.json()
            setProviders(data.providers || [])
        } catch (error) {
            toast.error('Failed to load providers')
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddKey = async (providerType: string) => {
        if (!newKey.name || !newKey.api_key) {
            toast.error('Name and API key are required')
            return
        }

        try {
            const res = await fetch('/api/superadmin/ai-providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: providerType,
                    ...newKey,
                }),
            })

            if (!res.ok) throw new Error('Failed to add key')

            toast.success('API key added successfully')
            setNewKey({ name: '', api_key: '', description: '' })
            setAddingTo(null)
            loadProviders()
        } catch (error) {
            toast.error('Failed to add API key')
        }
    }

    const handleToggleActive = async (providerId: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/superadmin/ai-providers/${providerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus }),
            })

            if (!res.ok) throw new Error('Failed to update')

            toast.success(currentStatus ? 'Key deactivated' : 'Key activated')
            loadProviders()
        } catch (error) {
            toast.error('Failed to update key status')
        }
    }

    const handleDelete = async (providerId: string) => {
        if (!confirm('Are you sure you want to delete this API key?')) return

        try {
            const res = await fetch(`/api/superadmin/ai-providers/${providerId}`, {
                method: 'DELETE',
            })

            if (!res.ok) throw new Error('Failed to delete')

            toast.success('API key deleted')
            loadProviders()
        } catch (error) {
            toast.error('Failed to delete key')
        }
    }

    const toggleKeyVisibility = (keyId: string) => {
        const newSet = new Set(revealedKeys)
        if (newSet.has(keyId)) {
            newSet.delete(keyId)
        } else {
            newSet.add(keyId)
        }
        setRevealedKeys(newSet)
    }

    const maskKey = (key: string) => {
        if (key.length <= 8) return '••••••••'
        return `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}`
    }

    const groupedProviders = PROVIDERS.map(provider => ({
        ...provider,
        keys: providers.filter(p => p.provider === provider.id),
    }))

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Bot className="w-8 h-8 text-primary" />
                        AI Provider Management
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manage multiple API keys per provider with automatic failover
                    </p>
                </div>
                <button
                    onClick={loadProviders}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {groupedProviders.map((provider) => (
                        <ProviderCard
                            key={provider.id}
                            provider={provider}
                            addingTo={addingTo}
                            setAddingTo={setAddingTo}
                            newKey={newKey}
                            setNewKey={setNewKey}
                            onAddKey={handleAddKey}
                            onToggleActive={handleToggleActive}
                            onDelete={handleDelete}
                            revealedKeys={revealedKeys}
                            toggleKeyVisibility={toggleKeyVisibility}
                            maskKey={maskKey}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function ProviderCard({
    provider,
    addingTo,
    setAddingTo,
    newKey,
    setNewKey,
    onAddKey,
    onToggleActive,
    onDelete,
    revealedKeys,
    toggleKeyVisibility,
    maskKey,
}: any) {
    const activeKeys = provider.keys.filter((k: AIProvider) => k.is_active).length
    const totalKeys = provider.keys.length

    return (
        <div className="rounded-xl border border-border/40 bg-background overflow-hidden">
            {/* Header */}
            <div className={`p-6 bg-gradient-to-br ${provider.color} border-b border-border/40`}>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold">{provider.name}</h3>
                    <button
                        onClick={() => setAddingTo(addingTo === provider.id ? null : provider.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/80 hover:bg-background transition-colors text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Key
                    </button>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <span>
                        <strong>{activeKeys}</strong> active
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span>
                        <strong>{totalKeys}</strong> total keys
                    </span>
                </div>
            </div>

            {/* Add Key Form */}
            {addingTo === provider.id && (
                <div className="p-4 bg-muted/20 border-b border-border/40">
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Key name (e.g., 'Production Key 1')"
                            value={newKey.name}
                            onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                        />
                        <input
                            type="password"
                            placeholder="API Key"
                            value={newKey.api_key}
                            onChange={(e) => setNewKey({ ...newKey, api_key: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono text-sm"
                        />
                        <input
                            type="text"
                            placeholder="Description (optional)"
                            value={newKey.description}
                            onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => onAddKey(provider.id)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                            >
                                <Save className="w-4 h-4" />
                                Save Key
                            </button>
                            <button
                                onClick={() => {
                                    setAddingTo(null)
                                    setNewKey({ name: '', api_key: '', description: '' })
                                }}
                                className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Keys List */}
            <div className="p-4">
                {provider.keys.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No API keys configured</p>
                        <p className="text-sm mt-1">Add your first key to get started</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {provider.keys.map((key: AIProvider) => (
                            <div
                                key={key.id}
                                className={`p-4 rounded-lg border ${key.is_active
                                        ? 'border-green-500/40 bg-green-500/5'
                                        : 'border-border/40 bg-muted/20'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold">{key.name}</h4>
                                            {key.is_active ? (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                                            )}
                                        </div>
                                        {key.description && (
                                            <p className="text-sm text-muted-foreground">{key.description}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onToggleActive(key.id, key.is_active)}
                                            className="p-1.5 rounded hover:bg-muted transition-colors"
                                            title={key.is_active ? 'Deactivate' : 'Activate'}
                                        >
                                            {key.is_active ? (
                                                <ToggleRight className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => onDelete(key.id)}
                                            className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-3">
                                    <code className="flex-1 px-3 py-1.5 rounded bg-background border border-border font-mono text-xs">
                                        {revealedKeys.has(key.id) ? key.api_key : maskKey(key.api_key)}
                                    </code>
                                    <button
                                        onClick={() => toggleKeyVisibility(key.id)}
                                        className="p-1.5 rounded hover:bg-muted transition-colors"
                                    >
                                        {revealedKeys.has(key.id) ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                    <span>Used: {key.usage_count} times</span>
                                    {key.failures > 0 && (
                                        <span className="text-destructive">Failures: {key.failures}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
