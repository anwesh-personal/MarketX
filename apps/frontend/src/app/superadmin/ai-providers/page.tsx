'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    AlertTriangle,
    Bot,
    BrainCircuit,
    Check,
    CheckCircle2,
    ChevronDown,
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
}> = [
    { id: 'openai', name: 'OpenAI', shortName: 'GPT', tone: 'success', icon: Sparkles },
    { id: 'anthropic', name: 'Anthropic', shortName: 'Claude', tone: 'warning', icon: ShieldCheck },
    { id: 'google', name: 'Google', shortName: 'Gemini', tone: 'info', icon: BrainCircuit },
    { id: 'mistral', name: 'Mistral', shortName: 'Mistral', tone: 'accent', icon: Rocket },
    { id: 'perplexity', name: 'Perplexity', shortName: 'Sonar', tone: 'info', icon: Wand2 },
    { id: 'xai', name: 'xAI', shortName: 'Grok', tone: 'primary', icon: Zap },
]

const TONE_COLORS: Record<ProviderTone, { dot: string; bg: string; border: string; text: string; glow: string }> = {
    success: { dot: 'bg-success', bg: 'bg-success/8', border: 'border-success/15', text: 'text-success', glow: 'shadow-[0_0_20px_-4px_rgba(var(--color-success-rgb),0.3)]' },
    warning: { dot: 'bg-warning', bg: 'bg-warning/8', border: 'border-warning/15', text: 'text-warning', glow: 'shadow-[0_0_20px_-4px_rgba(var(--color-warning-rgb),0.3)]' },
    info: { dot: 'bg-info', bg: 'bg-info/8', border: 'border-info/15', text: 'text-info', glow: 'shadow-[0_0_20px_-4px_rgba(var(--color-info-rgb),0.3)]' },
    accent: { dot: 'bg-accent', bg: 'bg-accent/8', border: 'border-accent/15', text: 'text-accent', glow: 'shadow-[0_0_20px_-4px_rgba(var(--color-accent-rgb),0.3)]' },
    primary: { dot: 'bg-primary', bg: 'bg-primary/8', border: 'border-primary/15', text: 'text-primary', glow: 'shadow-[0_0_20px_-4px_rgba(var(--color-accent-rgb),0.3)]' },
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
            // Step 1: Real validation — hits provider API, fetches models, upserts to DB
            const testRes = await fetchWithAuth(`/api/superadmin/ai-providers/${providerType}/test`, {
                method: 'POST',
                body: JSON.stringify({ provider: providerType, api_key: newKeyValue }),
            })
            const testData = await testRes.json()
            if (!testRes.ok || !testData.valid) throw new Error(testData.error || 'API key rejected by provider')

            // Step 2: Save the credential (models already in DB from step 1)
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
        <div className="space-y-lg">
            {/* Hero — compact */}
            <section className="relative overflow-hidden rounded-[calc(var(--radius-xl)*1.5)] border border-border/60 bg-surface/80 px-lg py-md backdrop-blur-xl"
                style={{
                    backgroundImage: `
                        radial-gradient(ellipse at 20% 0%, rgba(var(--color-accent-rgb), 0.1), transparent 50%),
                        radial-gradient(ellipse at 80% 100%, rgba(var(--color-info-rgb), 0.06), transparent 40%)
                    `,
                }}
            >
                <div className="flex items-center justify-between gap-lg">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-textTertiary">Inference Fabric</p>
                        <h1 className="mt-xs text-2xl font-bold tracking-tight text-textPrimary">AI Provider Control</h1>
                    </div>
                    <div className="flex items-center gap-md">
                        <div className="flex gap-sm text-xs">
                            <span className="rounded-full border border-success/20 bg-success/8 px-sm py-xs text-success">{stats.activeKeys} keys</span>
                            <span className="rounded-full border border-info/20 bg-info/8 px-sm py-xs text-info">{stats.activeModels} models</span>
                        </div>
                        <button onClick={loadProviders}
                            className="rounded-lg border border-border bg-surface/80 p-sm text-textSecondary transition-all hover:border-borderHover hover:text-textPrimary hover:shadow-sm active:scale-95">
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </section>

            {/* Provider rows */}
            <div className="space-y-sm">
                {grouped.map((prov) => {
                    const Icon = prov.icon
                    const tone = TONE_COLORS[prov.tone]
                    const isExpanded = expandedProvider === prov.id
                    const hasKeys = prov.keys.length > 0
                    const activeKeys = prov.keys.filter(k => k.is_active).length
                    const activeModels = prov.models.filter(m => m.is_active).length
                    const isAdding = addingTo === prov.id

                    return (
                        <div key={prov.id}
                            className={cn(
                                'group/prov rounded-[calc(var(--radius-xl)*1.2)] border transition-all duration-300',
                                isExpanded
                                    ? `${tone.border} bg-surface/95 backdrop-blur-xl ${tone.glow}`
                                    : 'border-border/60 bg-surface/70 hover:border-border hover:bg-surface/90 hover:shadow-md',
                            )}
                            style={{ transform: isExpanded ? 'translateY(-1px)' : undefined }}
                        >
                            {/* Provider header row */}
                            <button
                                onClick={() => setExpandedProvider(isExpanded ? null : prov.id)}
                                className="flex w-full items-center gap-md px-md py-sm text-left transition-all"
                            >
                                <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-300', tone.border, tone.bg,
                                    isExpanded && 'scale-110'
                                )}>
                                    <Icon className={cn('h-4 w-4', tone.text)} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-sm">
                                        <span className="text-sm font-semibold text-textPrimary">{prov.name}</span>
                                        <span className="text-[10px] font-medium uppercase tracking-widest text-textTertiary">{prov.shortName}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-sm text-xs">
                                    {hasKeys ? (
                                        <>
                                            <span className="flex items-center gap-xxs rounded-full border border-border bg-background/60 px-sm py-xs">
                                                <span className={cn('h-1.5 w-1.5 rounded-full', activeKeys > 0 ? tone.dot : 'bg-textTertiary')} />
                                                {activeKeys}/{prov.keys.length} keys
                                            </span>
                                            {prov.models.length > 0 && (
                                                <span className="rounded-full border border-border bg-background/60 px-sm py-xs">
                                                    {activeModels}/{prov.models.length} models
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-textTertiary">No keys</span>
                                    )}
                                </div>

                                <ChevronDown className={cn(
                                    'h-4 w-4 text-textTertiary transition-transform duration-300',
                                    isExpanded && 'rotate-180'
                                )} />
                            </button>

                            {/* Expanded content */}
                            <div className={cn(
                                'grid transition-all duration-300',
                                isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                            )}>
                                <div className="overflow-hidden">
                                    <div className="space-y-sm border-t border-border/50 px-md pb-md pt-sm">

                                        {/* Keys section */}
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textTertiary">Credentials</p>
                                            <button onClick={() => { setAddingTo(isAdding ? null : prov.id); setNewKeyName(''); setNewKeyValue('') }}
                                                className={cn(
                                                    'flex items-center gap-xxs rounded-lg px-sm py-xs text-xs font-medium transition-all',
                                                    isAdding ? 'bg-error/10 text-error' : 'bg-surface hover:bg-surfaceHover text-textSecondary hover:text-textPrimary border border-border'
                                                )}>
                                                {isAdding ? <><X className="h-3 w-3" /> Cancel</> : <><Plus className="h-3 w-3" /> Add key</>}
                                            </button>
                                        </div>

                                        {/* Add key form */}
                                        {isAdding && (
                                            <div className="flex items-center gap-sm rounded-xl border border-dashed border-border bg-background/60 p-sm animate-in fade-in slide-in-from-top-1 duration-200">
                                                <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                                                    placeholder="Label" className="w-32 rounded-lg border border-border bg-surface px-sm py-xs text-xs text-textPrimary placeholder:text-textTertiary focus:outline-none focus:ring-1 focus:ring-borderFocus" />
                                                <input type="password" value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)}
                                                    placeholder="API key" className="flex-1 rounded-lg border border-border bg-surface px-sm py-xs font-mono text-xs text-textPrimary placeholder:text-textTertiary focus:outline-none focus:ring-1 focus:ring-borderFocus" />
                                                <button onClick={() => handleAddKey(prov.id)} disabled={isSaving}
                                                    className="flex items-center gap-xxs rounded-lg bg-primary px-sm py-xs text-xs font-semibold text-onPrimary transition-all hover:opacity-90 active:scale-95 disabled:opacity-50">
                                                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                                    {isSaving ? 'Testing...' : 'Validate'}
                                                </button>
                                            </div>
                                        )}

                                        {/* Key list */}
                                        {prov.keys.length === 0 ? (
                                            <p className="py-sm text-center text-xs text-textTertiary">No credentials configured for {prov.name}</p>
                                        ) : (
                                            <div className="space-y-xs">
                                                {prov.keys.map(key => (
                                                    <div key={key.id}
                                                        className={cn(
                                                            'flex items-center gap-sm rounded-lg border px-sm py-xs transition-all duration-200 hover:shadow-sm',
                                                            key.is_active ? 'border-success/15 bg-success/4' : 'border-border/60 bg-background/40'
                                                        )}>
                                                        <CircleDot className={cn('h-3 w-3 flex-shrink-0', key.is_active ? 'text-success' : 'text-textTertiary')} />
                                                        <span className="flex-1 truncate text-xs font-medium text-textPrimary">{key.name}</span>
                                                        <code className="max-w-[120px] truncate text-[10px] text-textTertiary">{key.api_key}</code>
                                                        <span className="text-[10px] text-textTertiary">{key.usage_count} uses</span>
                                                        <button onClick={() => handleToggle(key.id, key.is_active)}
                                                            className="rounded px-xs py-xxs text-[10px] font-medium text-textSecondary hover:bg-surfaceHover hover:text-textPrimary transition-all">
                                                            {key.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        <button onClick={() => setPendingDeleteId(key.id)}
                                                            className="rounded p-xxs text-textTertiary hover:bg-error/10 hover:text-error transition-all">
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Models section */}
                                        {hasKeys && (
                                            <>
                                                <div className="flex items-center justify-between pt-sm">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textTertiary">Discovered Models</p>
                                                    <button onClick={() => handleRediscover(prov.keys[0].id)} disabled={discoveringFor === prov.keys[0].id}
                                                        className="flex items-center gap-xxs rounded-lg border border-border bg-surface px-sm py-xs text-xs text-textSecondary hover:text-textPrimary hover:bg-surfaceHover transition-all disabled:opacity-50">
                                                        <RefreshCw className={cn('h-3 w-3', discoveringFor === prov.keys[0].id && 'animate-spin')} />
                                                        Rediscover
                                                    </button>
                                                </div>

                                                {prov.models.length === 0 ? (
                                                    <p className="py-sm text-center text-xs text-textTertiary">No models discovered yet. Click Rediscover to fetch models.</p>
                                                ) : (
                                                    <div className="grid grid-cols-1 gap-xs sm:grid-cols-2 xl:grid-cols-3">
                                                        {prov.models.map(model => (
                                                            <ModelCard
                                                                key={model.id}
                                                                model={model}
                                                                providerId={prov.keys[0]?.id}
                                                                tone={prov.tone}
                                                                isTesting={testingModel === model.model_id}
                                                                onTest={handleTestModel}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
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

function ModelCard({ model, providerId, tone, isTesting, onTest }: {
    model: AIModel
    providerId: string
    tone: ProviderTone
    isTesting: boolean
    onTest: (providerId: string, modelId: string) => void
}) {
    const colors = TONE_COLORS[tone]
    const passed = model.test_passed === true
    const failed = model.test_passed === false
    const untested = model.test_passed === null

    return (
        <div className={cn(
            'group/model relative rounded-lg border px-sm py-xs transition-all duration-200',
            'hover:shadow-sm hover:-translate-y-px',
            model.is_active ? `${colors.border} ${colors.bg}` : 'border-border/50 bg-background/40',
            model.is_deprecated && 'opacity-50',
        )}>
            <div className="flex items-start justify-between gap-xs">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-xs">
                        {model.is_active ? (
                            <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-success" />
                        ) : failed ? (
                            <XCircle className="h-3 w-3 flex-shrink-0 text-error" />
                        ) : (
                            <CircleDot className="h-3 w-3 flex-shrink-0 text-textTertiary" />
                        )}
                        <span className="truncate text-xs font-semibold text-textPrimary">{model.model_id}</span>
                    </div>
                    <div className="mt-xxs flex flex-wrap items-center gap-xs text-[10px] text-textTertiary">
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
                        <p className="mt-xxs truncate text-[10px] text-error" title={model.test_error}>{model.test_error}</p>
                    )}
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onTest(providerId, model.model_id) }}
                    disabled={isTesting}
                    className={cn(
                        'flex-shrink-0 rounded-md p-xs transition-all',
                        isTesting
                            ? 'text-textTertiary'
                            : 'text-textTertiary hover:bg-surface hover:text-textPrimary hover:shadow-sm active:scale-90',
                    )}
                    title="Test this model"
                >
                    {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube className="h-3.5 w-3.5" />}
                </button>
            </div>

            {model.last_tested && (
                <p className="mt-xxs text-[9px] text-textTertiary">
                    Tested {new Date(model.last_tested).toLocaleDateString()}
                </p>
            )}
        </div>
    )
}
