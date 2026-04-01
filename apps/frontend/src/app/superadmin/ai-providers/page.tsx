'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    AlertTriangle,
    Bot,
    BrainCircuit,
    Check,
    CheckCircle2,
    ChevronRight,
    CircleDot,
    Key,
    Loader2,
    Plus,
    RefreshCw,
    Rocket,
    ShieldCheck,
    Sparkles,
    TestTube,
    Trash2,
    Wand2,
    X,
    XCircle,
    Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'
import { cn } from '@/lib/utils'
import {
    SuperadminButton,
    SuperadminConfirmDialog,
    SuperadminErrorState,
    SuperadminLoadingState,
    SuperadminPageHero,
} from '@/components/SuperAdmin/surfaces'

interface AIProvider {
    id: string
    provider: string
    name: string
    api_key: string
    description?: string | null
    is_active: boolean
    failures: number
    usage_count: number
    created_at: string
}

interface AIModel {
    id: string
    provider: string
    model_id: string
    model_name: string
    is_active: boolean
    test_passed: boolean | null
    test_error: string | null
    last_tested: string | null
    context_window_tokens: number | null
    input_cost_per_million: number | null
    output_cost_per_million: number | null
    supports_vision: boolean | null
    supports_function_calling: boolean | null
    supports_streaming: boolean | null
    is_deprecated: boolean | null
}

type ProviderTone = 'success' | 'warning' | 'info' | 'accent' | 'primary'

const PROVIDER_CATALOG: Array<{
    id: string
    name: string
    shortName: string
    tone: ProviderTone
    icon: typeof Bot
    tagline: string
}> = [
    { id: 'openai', name: 'OpenAI', shortName: 'GPT', tone: 'accent', icon: Sparkles, tagline: 'GPT-4o, o1, o3 & DALL-E' },
    { id: 'anthropic', name: 'Anthropic', shortName: 'Claude', tone: 'accent', icon: ShieldCheck, tagline: 'Claude 3.5 & Opus' },
    { id: 'google', name: 'Google', shortName: 'Gemini', tone: 'accent', icon: BrainCircuit, tagline: 'Gemini Pro & Flash' },
    { id: 'mistral', name: 'Mistral', shortName: 'Mistral', tone: 'accent', icon: Rocket, tagline: 'Large, Medium & Codestral' },
    { id: 'perplexity', name: 'Perplexity', shortName: 'Sonar', tone: 'accent', icon: Wand2, tagline: 'Sonar Large & Online' },
    { id: 'xai', name: 'xAI', shortName: 'Grok', tone: 'accent', icon: Zap, tagline: 'Grok-2 & Grok-2 Mini' },
]

// Unified tone — all providers share the theme accent. Status colors (success/error) only used for state indicators.
const TONE_MAP: Record<ProviderTone, {
    dot: string; bg: string; border: string; text: string
    glowRgb: string; iconBg: string; gradientFrom: string
}> = {
    success: {
        dot: 'bg-accent', bg: 'bg-[rgba(var(--color-accent-rgb),0.06)]', border: 'border-[rgba(var(--color-accent-rgb),0.12)]', text: 'text-accent',
        glowRgb: 'var(--color-accent-rgb)', iconBg: 'bg-[rgba(var(--color-accent-rgb),0.1)]', gradientFrom: 'from-accent/10',
    },
    warning: {
        dot: 'bg-accent', bg: 'bg-[rgba(var(--color-accent-rgb),0.06)]', border: 'border-[rgba(var(--color-accent-rgb),0.12)]', text: 'text-accent',
        glowRgb: 'var(--color-accent-rgb)', iconBg: 'bg-[rgba(var(--color-accent-rgb),0.1)]', gradientFrom: 'from-accent/10',
    },
    info: {
        dot: 'bg-accent', bg: 'bg-[rgba(var(--color-accent-rgb),0.06)]', border: 'border-[rgba(var(--color-accent-rgb),0.12)]', text: 'text-accent',
        glowRgb: 'var(--color-accent-rgb)', iconBg: 'bg-[rgba(var(--color-accent-rgb),0.1)]', gradientFrom: 'from-accent/10',
    },
    accent: {
        dot: 'bg-accent', bg: 'bg-[rgba(var(--color-accent-rgb),0.06)]', border: 'border-[rgba(var(--color-accent-rgb),0.12)]', text: 'text-accent',
        glowRgb: 'var(--color-accent-rgb)', iconBg: 'bg-[rgba(var(--color-accent-rgb),0.1)]', gradientFrom: 'from-accent/10',
    },
    primary: {
        dot: 'bg-accent', bg: 'bg-[rgba(var(--color-accent-rgb),0.06)]', border: 'border-[rgba(var(--color-accent-rgb),0.12)]', text: 'text-accent',
        glowRgb: 'var(--color-accent-rgb)', iconBg: 'bg-[rgba(var(--color-accent-rgb),0.1)]', gradientFrom: 'from-accent/10',
    },
}

export default function AIProvidersPage() {
    const { fetchWithAuth } = useSuperadminAuth()
    const [providers, setProviders] = useState<AIProvider[]>([])
    const [modelsByProvider, setModelsByProvider] = useState<Record<string, AIModel[]>>({})
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
    const [addingTo, setAddingTo] = useState<string | null>(null)
    const [newKeyName, setNewKeyName] = useState('')
    const [newKeyValue, setNewKeyValue] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
    const [testingModel, setTestingModel] = useState<string | null>(null)
    const [discoveringFor, setDiscoveringFor] = useState<string | null>(null)

    const loadProviders = useCallback(async () => {
        try {
            setError(null)
            const res = await fetchWithAuth('/api/superadmin/ai-providers')
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to load providers')
            setProviders(data.providers || [])
        } catch (e: any) {
            setError(e.message)
        } finally {
            setIsLoading(false)
        }
    }, [fetchWithAuth])

    const loadModelsForProvider = useCallback(async (providerId: string) => {
        try {
            const res = await fetchWithAuth(`/api/superadmin/ai-providers/${providerId}/models`)
            const data = await res.json()
            if (res.ok && data.models) {
                setModelsByProvider(prev => ({ ...prev, [data.provider]: data.models }))
            }
        } catch { /* silent */ }
    }, [fetchWithAuth])

    useEffect(() => { loadProviders() }, [loadProviders])

    useEffect(() => {
        if (expandedProvider) {
            const keys = providers.filter(p => p.provider === expandedProvider)
            if (keys.length > 0) {
                loadModelsForProvider(keys[0].id)
            }
        }
    }, [expandedProvider, providers, loadModelsForProvider])

    const grouped = useMemo(() =>
        PROVIDER_CATALOG.map(cat => ({
            ...cat,
            keys: providers.filter(p => p.provider === cat.id),
            models: modelsByProvider[cat.id] || [],
        }))
    , [providers, modelsByProvider])

    const stats = useMemo(() => ({
        totalKeys: providers.length,
        activeKeys: providers.filter(p => p.is_active).length,
        totalModels: Object.values(modelsByProvider).flat().length,
        activeModels: Object.values(modelsByProvider).flat().filter(m => m.is_active).length,
    }), [providers, modelsByProvider])

    const handleAddKey = async (providerType: string) => {
        if (!newKeyName || !newKeyValue) { toast.error('Name and API key required'); return }
        setIsSaving(true)
        try {
            const testRes = await fetchWithAuth(`/api/superadmin/ai-providers/${providerType}/test`, {
                method: 'POST',
                body: JSON.stringify({ provider: providerType, api_key: newKeyValue }),
            })
            const testData = await testRes.json()
            if (!testRes.ok || !testData.valid) throw new Error(testData.error || 'API key rejected by provider')

            const saveRes = await fetchWithAuth('/api/superadmin/ai-providers', {
                method: 'POST',
                body: JSON.stringify({ provider: providerType, name: newKeyName, api_key: newKeyValue }),
            })
            const saved = await saveRes.json()
            if (!saveRes.ok) throw new Error(saved.error || 'Save failed')

            toast.success(testData.message || `Key saved — ${testData.models?.length || 0} models discovered`)
            setAddingTo(null); setNewKeyName(''); setNewKeyValue('')

            loadProviders()
            if (saved.provider?.id) loadModelsForProvider(saved.provider.id)
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const res = await fetchWithAuth(`/api/superadmin/ai-providers/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Delete failed')
            toast.success('Key removed')
            loadProviders()
        } catch (e: any) { toast.error(e.message) }
    }

    const handleToggle = async (id: string, active: boolean) => {
        try {
            const res = await fetchWithAuth(`/api/superadmin/ai-providers/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_active: !active }),
            })
            if (!res.ok) throw new Error('Toggle failed')
            toast.success(active ? 'Key deactivated' : 'Key activated')
            loadProviders()
        } catch (e: any) { toast.error(e.message) }
    }

    const handleTestModel = async (providerId: string, modelId: string) => {
        setTestingModel(modelId)
        try {
            const res = await fetchWithAuth('/api/superadmin/ai-models/test-model', {
                method: 'POST',
                body: JSON.stringify({ provider_id: providerId, model_id: modelId }),
            })
            const data = await res.json()
            if (data.test_passed) {
                toast.success(`${modelId} passed`)
            } else {
                toast.error(`${modelId} failed: ${data.error || 'unknown'}`)
            }
            loadModelsForProvider(providerId)
        } catch (e: any) { toast.error(e.message) }
        finally { setTestingModel(null) }
    }

    const handleRediscover = async (providerId: string) => {
        setDiscoveringFor(providerId)
        try {
            const res = await fetchWithAuth('/api/superadmin/ai-models/discover', {
                method: 'POST',
                body: JSON.stringify({ provider_id: providerId }),
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`${data.models_active}/${data.models_discovered} models active`)
                loadModelsForProvider(providerId)
            } else {
                toast.error(data.error || 'Discovery failed')
            }
        } catch (e: any) { toast.error(e.message) }
        finally { setDiscoveringFor(null) }
    }

    if (isLoading) return <SuperadminLoadingState label="Loading providers" />
    if (error && providers.length === 0) {
        return <SuperadminErrorState title="Provider load failed" description={error}
            action={<SuperadminButton icon={RefreshCw} onClick={loadProviders}>Retry</SuperadminButton>} />
    }

    return (
        <div className="space-y-xl">
            <SuperadminPageHero
                eyebrow="Inference Fabric"
                title="AI Provider Control"
                description="Manage API keys, discover models, and orchestrate your multi-provider AI infrastructure."
                actions={
                    <div className="flex items-center gap-sm">
                        <div className="flex gap-sm text-xs">
                            <span className="rounded-full border border-border bg-surfaceElevated px-sm py-xs font-semibold text-accent">
                                {stats.activeKeys} keys
                            </span>
                            <span className="rounded-full border border-border bg-surfaceElevated px-sm py-xs font-semibold text-textSecondary">
                                {stats.activeModels} models
                            </span>
                        </div>
                        <button onClick={loadProviders}
                            className="rounded-[var(--radius-lg)] border border-border bg-surface/80 p-sm text-textSecondary transition-all duration-[var(--duration-fast)] hover:border-borderHover hover:text-textPrimary hover:shadow-[var(--shadow-sm)] active:scale-95">
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>
                }
            />

            {/* Provider Card Grid */}
            <div className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-3">
                {grouped.map((prov) => (
                    <ProviderCard
                        key={prov.id}
                        provider={prov}
                        isExpanded={expandedProvider === prov.id}
                        isAdding={addingTo === prov.id}
                        isSaving={isSaving}
                        newKeyName={newKeyName}
                        newKeyValue={newKeyValue}
                        testingModel={testingModel}
                        discoveringFor={discoveringFor}
                        onToggleExpand={() => setExpandedProvider(expandedProvider === prov.id ? null : prov.id)}
                        onToggleAdding={() => { setAddingTo(addingTo === prov.id ? null : prov.id); setNewKeyName(''); setNewKeyValue('') }}
                        onKeyNameChange={setNewKeyName}
                        onKeyValueChange={setNewKeyValue}
                        onAddKey={handleAddKey}
                        onToggle={handleToggle}
                        onDelete={setPendingDeleteId}
                        onTestModel={handleTestModel}
                        onRediscover={handleRediscover}
                    />
                ))}
            </div>

            <SuperadminConfirmDialog
                open={Boolean(pendingDeleteId)}
                title="Delete provider key"
                description="This removes the credential and its control-plane entry. Discovered models are preserved but may lose test coverage."
                confirmLabel="Delete key"
                onCancel={() => setPendingDeleteId(null)}
                onConfirm={() => { if (pendingDeleteId) void handleDelete(pendingDeleteId); setPendingDeleteId(null) }}
            />
        </div>
    )
}

function ProviderCard({
    provider,
    isExpanded,
    isAdding,
    isSaving,
    newKeyName,
    newKeyValue,
    testingModel,
    discoveringFor,
    onToggleExpand,
    onToggleAdding,
    onKeyNameChange,
    onKeyValueChange,
    onAddKey,
    onToggle,
    onDelete,
    onTestModel,
    onRediscover,
}: {
    provider: {
        id: string; name: string; shortName: string; tone: ProviderTone
        icon: typeof Bot; tagline: string
        keys: AIProvider[]; models: AIModel[]
    }
    isExpanded: boolean
    isAdding: boolean
    isSaving: boolean
    newKeyName: string
    newKeyValue: string
    testingModel: string | null
    discoveringFor: string | null
    onToggleExpand: () => void
    onToggleAdding: () => void
    onKeyNameChange: (v: string) => void
    onKeyValueChange: (v: string) => void
    onAddKey: (providerType: string) => void
    onToggle: (id: string, active: boolean) => void
    onDelete: (id: string) => void
    onTestModel: (providerId: string, modelId: string) => void
    onRediscover: (providerId: string) => void
}) {
    const Icon = provider.icon
    const tone = TONE_MAP[provider.tone]
    const hasKeys = provider.keys.length > 0
    const activeKeys = provider.keys.filter(k => k.is_active).length
    const activeModels = provider.models.filter(m => m.is_active).length

    return (
        <div
            className={cn(
                'group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border transition-all duration-[var(--duration-normal)]',
                isExpanded
                    ? 'md:col-span-2 xl:col-span-3 border-borderHover bg-surface/90 backdrop-blur-xl'
                    : 'border-border/60 bg-surface/70 backdrop-blur-lg hover:border-borderHover hover:-translate-y-[2px]',
            )}
            style={{
                boxShadow: isExpanded
                    ? `0 0 0 1px rgba(${tone.glowRgb}, 0.08), 0 24px 80px -20px rgba(${tone.glowRgb}, 0.22)`
                    : `0 8px 40px -24px var(--color-shadow)`,
            }}
        >
            {/* Top gradient accent line */}
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                    background: `linear-gradient(90deg, transparent 10%, rgba(${tone.glowRgb}, 0.5) 50%, transparent 90%)`,
                }}
            />

            {/* Background gradient orb */}
            <div
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-15 blur-3xl transition-opacity duration-[var(--duration-slow)] group-hover:opacity-30"
                style={{ background: `rgba(${tone.glowRgb}, 0.15)` }}
            />

            {/* Card Header — always visible */}
            <button
                onClick={onToggleExpand}
                className="relative flex items-start gap-lg px-lg py-lg text-left transition-all"
            >
                {/* Icon */}
                <div className={cn(
                    'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surfaceElevated transition-all duration-[var(--duration-normal)]',
                    isExpanded && 'scale-105 border-borderHover shadow-[var(--shadow-glow)]',
                )}>
                    <Icon className="h-5 w-5 text-accent" />
                </div>

                {/* Provider info */}
                <div className="min-w-0 flex-1 space-y-xs">
                    <div className="flex items-center gap-sm">
                        <h3 className="text-lg font-bold tracking-tight text-textPrimary">{provider.name}</h3>
                        <span className="rounded-full border border-border bg-background/60 px-sm py-xxs text-[10px] font-bold uppercase tracking-[0.2em] text-textTertiary">
                            {provider.shortName}
                        </span>
                    </div>
                    <p className="text-sm text-textSecondary">{provider.tagline}</p>

                    {/* Status badges */}
                    <div className="flex flex-wrap items-center gap-xs pt-xs">
                        {hasKeys ? (
                            <>
                                <span className={cn(
                                    'inline-flex items-center gap-xxs rounded-full border px-sm py-xxs text-xs font-semibold',
                                    activeKeys > 0
                                        ? 'border-border bg-surfaceElevated text-accent'
                                        : 'border-border bg-background/60 text-textTertiary',
                                )}>
                                    <span className={cn('h-1.5 w-1.5 rounded-full', activeKeys > 0 ? 'bg-success' : 'bg-textTertiary')} />
                                    {activeKeys}/{provider.keys.length} keys
                                </span>
                                {provider.models.length > 0 && (
                                    <span className="inline-flex items-center gap-xxs rounded-full border border-border bg-background/60 px-sm py-xxs text-xs font-semibold text-textSecondary">
                                        {activeModels}/{provider.models.length} models
                                    </span>
                                )}
                            </>
                        ) : (
                            <span className="inline-flex items-center gap-xxs rounded-full border border-border/50 bg-background/40 px-sm py-xxs text-xs text-textTertiary">
                                <Key className="h-3 w-3" />
                                No keys configured
                            </span>
                        )}
                    </div>
                </div>

                {/* Expand arrow */}
                <div className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/60 text-textTertiary transition-all duration-[var(--duration-normal)]',
                    isExpanded && 'rotate-90 border-borderHover text-textPrimary',
                )}>
                    <ChevronRight className="h-4 w-4" />
                </div>
            </button>

            {/* Expanded Detail Section */}
            <div className={cn(
                'grid transition-all duration-[var(--duration-normal)]',
                isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}>
                <div className="overflow-hidden">
                    <div className="space-y-lg border-t border-border/50 px-lg pb-lg pt-lg">

                        {/* Credentials Section */}
                        <div className="space-y-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-textTertiary">Credentials</p>
                                <button onClick={(e) => { e.stopPropagation(); onToggleAdding() }}
                                    className={cn(
                                        'flex items-center gap-xxs rounded-[var(--radius-lg)] px-sm py-xs text-xs font-medium transition-all duration-[var(--duration-fast)]',
                                        isAdding
                                            ? 'bg-surfaceElevated text-error hover:bg-surfaceElevated'
                                            : 'border border-border bg-surface text-textSecondary hover:bg-surfaceHover hover:text-textPrimary',
                                    )}>
                                    {isAdding ? <><X className="h-3 w-3" /> Cancel</> : <><Plus className="h-3 w-3" /> Add key</>}
                                </button>
                            </div>

                            {/* Add key form */}
                            {isAdding && (
                                <div className="flex flex-col gap-sm rounded-[var(--radius-xl)] border border-dashed border-border bg-background/60 p-md animate-in fade-in slide-in-from-top-1 duration-200 sm:flex-row sm:items-center">
                                    <input value={newKeyName} onChange={e => onKeyNameChange(e.target.value)}
                                        placeholder="Label"
                                        className="w-full rounded-[var(--radius-lg)] border border-border bg-surface px-sm py-xs text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none focus:ring-1 focus:ring-borderFocus sm:w-40" />
                                    <input type="password" value={newKeyValue} onChange={e => onKeyValueChange(e.target.value)}
                                        placeholder="sk-... or API key"
                                        className="flex-1 rounded-[var(--radius-lg)] border border-border bg-surface px-sm py-xs font-mono text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none focus:ring-1 focus:ring-borderFocus" />
                                    <button onClick={() => onAddKey(provider.id)} disabled={isSaving}
                                        className="flex items-center justify-center gap-xxs rounded-[var(--radius-lg)] bg-primary px-md py-xs text-sm font-semibold text-onPrimary transition-all duration-[var(--duration-fast)] hover:opacity-90 active:scale-95 disabled:opacity-50">
                                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        {isSaving ? 'Validating...' : 'Validate & Save'}
                                    </button>
                                </div>
                            )}

                            {/* Key list */}
                            {provider.keys.length === 0 ? (
                                <p className="py-md text-center text-sm text-textTertiary">
                                    No credentials configured for {provider.name}. Add a key to get started.
                                </p>
                            ) : (
                                <div className="space-y-xs">
                                    {provider.keys.map(key => (
                                        <div key={key.id}
                                            className={cn(
                                                'flex flex-wrap items-center gap-sm rounded-[var(--radius-lg)] border px-md py-sm transition-all duration-[var(--duration-fast)]',
                                                key.is_active
                                                    ? 'border-border bg-surfaceElevated hover:bg-surfaceHover'
                                                    : 'border-border/60 bg-background/40 hover:bg-background/60',
                                            )}>
                                            <CircleDot className={cn('h-3.5 w-3.5 flex-shrink-0', key.is_active ? 'text-success' : 'text-textTertiary')} />
                                            <span className="flex-1 truncate text-sm font-semibold text-textPrimary">{key.name}</span>
                                            <code className="max-w-[140px] truncate rounded-[var(--radius-sm)] bg-background/60 px-xs py-xxs text-[11px] text-textTertiary">{key.api_key}</code>
                                            <span className="text-xs text-textTertiary">{key.usage_count} uses</span>
                                            <button onClick={() => onToggle(key.id, key.is_active)}
                                                className="rounded-[var(--radius-md)] px-sm py-xxs text-xs font-medium text-textSecondary transition-all hover:bg-surfaceHover hover:text-textPrimary">
                                                {key.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button onClick={() => onDelete(key.id)}
                                                className="rounded-[var(--radius-md)] p-xs text-textTertiary transition-all hover:bg-surfaceElevated hover:text-error">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Models Section */}
                        {hasKeys && (
                            <div className="space-y-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-textTertiary">Discovered Models</p>
                                    <button onClick={() => onRediscover(provider.keys[0].id)} disabled={discoveringFor === provider.keys[0].id}
                                        className="flex items-center gap-xxs rounded-[var(--radius-lg)] border border-border bg-surface px-sm py-xs text-xs font-medium text-textSecondary transition-all hover:bg-surfaceHover hover:text-textPrimary disabled:opacity-50">
                                        <RefreshCw className={cn('h-3 w-3', discoveringFor === provider.keys[0].id && 'animate-spin')} />
                                        Rediscover
                                    </button>
                                </div>

                                {provider.models.length === 0 ? (
                                    <p className="py-md text-center text-sm text-textTertiary">
                                        No models discovered yet. Click Rediscover to fetch available models.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                        {provider.models.map(model => (
                                            <ModelCard
                                                key={model.id}
                                                model={model}
                                                providerId={provider.keys[0]?.id}
                                                tone={provider.tone}
                                                isTesting={testingModel === model.model_id}
                                                onTest={onTestModel}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function ModelCard({ model, providerId, tone, isTesting, onTest }: {
    model: AIModel
    providerId: string
    tone: ProviderTone
    isTesting: boolean
    onTest: (providerId: string, modelId: string) => void
}) {
    const colors = TONE_MAP[tone]
    const passed = model.test_passed === true
    const failed = model.test_passed === false

    return (
        <div className={cn(
            'group/model relative overflow-hidden rounded-[var(--radius-lg)] border px-md py-sm transition-all duration-[var(--duration-fast)]',
            'hover:-translate-y-px hover:shadow-[var(--shadow-sm)] hover:border-borderHover',
            model.is_active ? 'border-border bg-surfaceElevated' : 'border-border/50 bg-background/40',
            model.is_deprecated && 'opacity-50',
        )}>
            <div className="flex items-start justify-between gap-xs">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-xs">
                        {model.is_active ? (
                            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-success" />
                        ) : failed ? (
                            <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-error" />
                        ) : (
                            <CircleDot className="h-3.5 w-3.5 flex-shrink-0 text-textTertiary" />
                        )}
                        <span className="truncate text-xs font-bold text-textPrimary">{model.model_id}</span>
                    </div>
                    <div className="mt-xs flex flex-wrap items-center gap-xs text-[10px] text-textTertiary">
                        {model.context_window_tokens && (
                            <span>{(model.context_window_tokens / 1000).toFixed(0)}k ctx</span>
                        )}
                        {model.input_cost_per_million != null && model.input_cost_per_million > 0 && (
                            <span>${model.input_cost_per_million}/M in</span>
                        )}
                        {model.supports_vision && <span className="text-info">vision</span>}
                        {model.supports_function_calling && <span className="text-accent">tools</span>}
                    </div>
                    {failed && model.test_error && (
                        <p className="mt-xs truncate text-[10px] text-error" title={model.test_error}>{model.test_error}</p>
                    )}
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onTest(providerId, model.model_id) }}
                    disabled={isTesting}
                    className={cn(
                        'flex-shrink-0 rounded-[var(--radius-md)] p-xs transition-all',
                        isTesting
                            ? 'text-textTertiary'
                            : 'text-textTertiary hover:bg-surface hover:text-textPrimary hover:shadow-[var(--shadow-sm)] active:scale-90',
                    )}
                    title="Test this model"
                >
                    {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube className="h-3.5 w-3.5" />}
                </button>
            </div>

            {model.last_tested && (
                <p className="mt-xs text-[9px] text-textTertiary">
                    Tested {new Date(model.last_tested).toLocaleDateString()}
                </p>
            )}
        </div>
    )
}
