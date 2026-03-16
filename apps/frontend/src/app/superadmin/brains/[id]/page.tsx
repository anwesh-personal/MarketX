'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    Brain, ArrowLeft, Save, Rocket, Shield, Sparkles, Settings2,
    Wrench, Database, ChevronDown, ChevronUp, Check, AlertCircle,
    Info, ToggleLeft, ToggleRight, Loader2, Eye, EyeOff
} from 'lucide-react'
import { BrainBackground } from '@/components/BrainBackground'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';

// ============================================================
// TYPES
// ============================================================

interface PromptLayer {
    id: string
    layer_type: 'foundation' | 'persona' | 'guardrails' | 'domain_seed'
    name: string
    content: string
    tier: string
}

interface BrainTool {
    name: string
    category: string
    description: string
    min_tier: 'basic' | 'medium' | 'enterprise'
    is_enabled: boolean
}

interface BrainTemplate {
    id: string
    name: string
    version: string
    description: string
    pricing_tier: 'echii' | 'pulz' | 'quanta'
    is_active: boolean
    is_default: boolean
    foundation_layer_id: string | null
    persona_layer_id:    string | null
    guardrails_layer_id: string | null
    default_tools:       string[]
    default_agents:      string[]
    default_rag_config:  RagConfig
    config: Record<string, unknown>
}

interface RagConfig {
    topK:            number
    minConfidence:   number
    queryExpansion:  boolean
    ftsWeight:       number
    vectorWeight:    number
}

type Tab = 'identity' | 'prompts' | 'tools' | 'rag' | 'deploy'

const TIER_MAP: Record<string, string> = { basic: 'echii', medium: 'pulz', enterprise: 'quanta' }
const TIER_LABEL: Record<string, string> = { echii: 'Basic', pulz: 'Medium', quanta: 'Enterprise' }

// ============================================================
// PAGE
// ============================================================

export default function BrainTemplatePage() {
    const { fetchWithAuth } = useSuperadminAuth();
    const params  = useParams()
    const router  = useRouter()
    const id      = params.id as string

    const [tab, setTab]             = useState<Tab>('identity')
    const [template, setTemplate]   = useState<BrainTemplate | null>(null)
    const [layers, setLayers]       = useState<PromptLayer[]>([])
    const [tools, setTools]         = useState<BrainTool[]>([])
    const [orgs, setOrgs]           = useState<Array<{ id: string; name: string }>>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving]   = useState(false)
    const [error, setError]         = useState<string | null>(null)
    const [saved, setSaved]         = useState(false)

    // Form state — identity
    const [name, setName]           = useState('')
    const [version, setVersion]     = useState('')
    const [description, setDesc]    = useState('')
    const [tier, setTier]           = useState<'echii' | 'pulz' | 'quanta'>('echii')
    const [isDefault, setIsDefault] = useState(false)

    // Form state — prompt layers
    const [foundationLayerId, setFoundationLayerId]   = useState<string>('')
    const [personaLayerId, setPersonaLayerId]         = useState<string>('')
    const [guardrailsLayerId, setGuardrailsLayerId]   = useState<string>('')
    const [previewLayer, setPreviewLayer]             = useState<PromptLayer | null>(null)

    // Form state — tools
    const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set())

    // Form state — RAG
    const [ragTopK, setRagTopK]                 = useState(8)
    const [ragMinConf, setRagMinConf]           = useState(0.65)
    const [ragQueryExp, setRagQueryExp]         = useState(true)
    const [ragFtsWeight, setRagFtsWeight]       = useState(0.3)

    // Form state — deploy
    const [deployOrgId, setDeployOrgId]         = useState('')
    const [isDeploying, setIsDeploying]         = useState(false)
    const [deployResult, setDeployResult]       = useState<string | null>(null)
    const [deployments, setDeployments]         = useState<Array<{ orgId: string; orgName: string; status: string; deployedAt: string }>>([])

    // Load everything in parallel
    const loadAll = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const [tmplRes, layersRes, toolsRes, orgsRes] = await Promise.all([
                fetchWithAuth(`/api/superadmin/brains/${id}`),
                fetchWithAuth('/api/superadmin/prompt-layers'),
                fetchWithAuth('/api/superadmin/brain-tools'),
                fetchWithAuth('/api/superadmin/organizations'),
            ])

            if (!tmplRes.ok) throw new Error('Failed to load template')

            const [tmplData, layersData, toolsData, orgsData] = await Promise.all([
                tmplRes.json(),
                layersRes.ok ? layersRes.json() : { layers: [] },
                toolsRes.ok ? toolsRes.json() : { tools: [] },
                orgsRes.ok  ? orgsRes.json()  : { organizations: [] },
            ])

            const t: BrainTemplate = tmplData.template ?? tmplData
            setTemplate(t)
            setName(t.name)
            setVersion(t.version)
            setDesc(t.description ?? '')
            setTier(t.pricing_tier)
            setIsDefault(t.is_default)
            setFoundationLayerId(t.foundation_layer_id ?? '')
            setPersonaLayerId(t.persona_layer_id ?? '')
            setGuardrailsLayerId(t.guardrails_layer_id ?? '')
            setSelectedTools(new Set(t.default_tools ?? []))

            const rc: RagConfig = t.default_rag_config ?? {}
            setRagTopK(rc.topK ?? 8)
            setRagMinConf(rc.minConfidence ?? 0.65)
            setRagQueryExp(rc.queryExpansion ?? true)
            setRagFtsWeight(rc.ftsWeight ?? 0.3)

            setLayers(layersData.layers ?? [])
            setTools(toolsData.tools ?? [])
            setOrgs(orgsData.organizations ?? [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }, [id])

    const loadDeployments = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`/api/superadmin/brains/${id}/deployments`)
            if (res.ok) {
                const data = await res.json()
                setDeployments(data.deployments ?? [])
            }
        } catch {
            setDeployments([])
        }
    }, [id])

    useEffect(() => { loadAll() }, [loadAll])
    useEffect(() => { if (tab === 'deploy') loadDeployments() }, [tab, loadDeployments])

    const handleSave = async () => {
        setIsSaving(true)
        setError(null)
        try {
            const res = await fetchWithAuth(`/api/superadmin/brains/${id}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    version,
                    description,
                    pricingTier:        tier,
                    isDefault,
                    foundationLayerId:  foundationLayerId  || null,
                    personaLayerId:     personaLayerId     || null,
                    guardrailsLayerId:  guardrailsLayerId  || null,
                    defaultTools:       Array.from(selectedTools),
                    defaultRagConfig: {
                        topK:           ragTopK,
                        minConfidence:  ragMinConf,
                        queryExpansion: ragQueryExp,
                        ftsWeight:      ragFtsWeight,
                        vectorWeight:   parseFloat((1 - ragFtsWeight).toFixed(2)),
                    },
                }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error ?? 'Save failed')
            }
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeploy = async () => {
        if (!deployOrgId) return
        setIsDeploying(true)
        setDeployResult(null)
        setError(null)
        try {
            const res = await fetchWithAuth('/api/superadmin/agents/deploy', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    org_id:      deployOrgId,
                    template_id: id,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Deployment failed')
            setDeployResult(`Agent deployed to "${data.org?.name ?? deployOrgId}". Agent ID: ${data.agent?.id}`)
            loadDeployments()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsDeploying(false)
        }
    }

    const layersByType = (type: string) => layers.filter(l => l.layer_type === type)

    const tierToolMap: Record<string, string[]> = {
        basic:      ['search_kb', 'generate_email', 'analyze_signals', 'check_belief_status', 'record_gap'],
        medium:     ['search_kb', 'generate_email', 'analyze_signals', 'check_belief_status', 'record_gap', 'get_brief_context', 'suggest_angle'],
        enterprise: tools.map(t => t.name),
    }

    const tierLabel = (t: BrainTool) => {
        const map: Record<string, string> = { basic: 'Basic', medium: 'Medium', enterprise: 'Enterprise' }
        return map[t.min_tier] ?? t.min_tier
    }

    const toggleTool = (name: string) => {
        setSelectedTools(prev => {
            const next = new Set(prev)
            next.has(name) ? next.delete(name) : next.add(name)
            return next
        })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!template) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <AlertCircle className="w-12 h-12 text-destructive" />
                <p className="text-lg font-medium">Template not found</p>
                <button onClick={() => router.back()} className="text-sm text-primary underline">Go back</button>
            </div>
        )
    }

    const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
        { id: 'identity', label: 'Identity',     icon: Brain },
        { id: 'prompts',  label: 'Prompt Stack', icon: Sparkles },
        { id: 'tools',    label: 'Tools',        icon: Wrench },
        { id: 'rag',      label: 'RAG Config',   icon: Database },
        { id: 'deploy',   label: 'Deploy',       icon: Rocket },
    ]

    return (
        <div className="relative max-w-5xl mx-auto space-y-6 min-h-[60vh]">
            <BrainBackground opacity={0.2} animation="pulse" mixBlendMode="soft-light" />
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/superadmin/brains')}
                        className="p-2 rounded-xl hover:bg-muted transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Brain className="w-6 h-6 text-primary" />
                            {template.name}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            v{template.version} · {TIER_LABEL[template.pricing_tier] ?? template.pricing_tier}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100 font-medium"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saved ? (
                        <Check className="w-4 h-4" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saved ? 'Saved' : isSaving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted rounded-xl border border-border/40">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                            tab === t.id
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <t.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Identity Tab ── */}
            {tab === 'identity' && (
                <div className="space-y-6 rounded-2xl border border-border/40 bg-background p-6">
                    <h2 className="text-lg font-semibold">Template Identity</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Template Name *">
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="input-base"
                                placeholder="e.g., MarketX Core Brain"
                            />
                        </FormField>
                        <FormField label="Version *">
                            <input
                                value={version}
                                onChange={e => setVersion(e.target.value)}
                                className="input-base"
                                placeholder="1.0.0"
                            />
                        </FormField>
                    </div>

                    <FormField label="Description">
                        <textarea
                            value={description}
                            onChange={e => setDesc(e.target.value)}
                            rows={3}
                            className="input-base resize-none"
                            placeholder="What does this brain template do?"
                        />
                    </FormField>

                    <FormField label="Pricing Tier">
                        <div className="grid grid-cols-3 gap-3">
                            {(['echii', 'pulz', 'quanta'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTier(t)}
                                    className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all text-sm font-medium ${
                                        tier === t
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border hover:border-primary/40'
                                    }`}
                                >
                                    <span className="capitalize font-bold">{t}</span>
                                    <span className="text-xs opacity-60">{TIER_LABEL[t]}</span>
                                </button>
                            ))}
                        </div>
                    </FormField>

                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <button
                            onClick={() => setIsDefault(!isDefault)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${isDefault ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-surface rounded-full shadow transition-transform ${isDefault ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <div>
                            <p className="text-sm font-medium">Default Template</p>
                            <p className="text-xs text-muted-foreground">New orgs without a brain assignment use this template</p>
                        </div>
                    </label>
                </div>
            )}

            {/* ── Prompts Tab ── */}
            {tab === 'prompts' && (
                <div className="space-y-6">
                    <div className="rounded-xl border border-warning/30 bg-warning-muted p-4 flex gap-3 text-sm">
                        <Shield className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-warning">Prompt Stack Rules</p>
                            <p className="text-muted-foreground mt-0.5">
                                Foundation and Guardrails are locked from clients — they're copied at deploy time.
                                Domain prompt is editable by org admins. Persona is visible to clients but not editable.
                            </p>
                        </div>
                    </div>

                    {/* Each layer */}
                    {([
                        { key: 'foundation', label: 'Foundation Prompt', desc: 'What the agent IS — core role and capabilities', locked: true, stateKey: foundationLayerId, setter: setFoundationLayerId },
                        { key: 'persona',    label: 'Persona Prompt',    desc: 'Name, personality, communication style', locked: false, stateKey: personaLayerId, setter: setPersonaLayerId },
                        { key: 'guardrails', label: 'Guardrails Prompt', desc: 'Hard rules that override everything — always last', locked: true, stateKey: guardrailsLayerId, setter: setGuardrailsLayerId },
                    ] as const).map(layer => (
                        <div key={layer.key} className="rounded-2xl border border-border/40 bg-background overflow-hidden">
                            <div className="flex items-center justify-between p-5 border-b border-border/40">
                                <div className="flex items-center gap-3">
                                    {layer.locked ? (
                                        <Shield className="w-5 h-5 text-warning" />
                                    ) : (
                                        <Sparkles className="w-5 h-5 text-primary" />
                                    )}
                                    <div>
                                        <p className="font-semibold text-sm">{layer.label}</p>
                                        <p className="text-xs text-muted-foreground">{layer.desc}</p>
                                    </div>
                                </div>
                                {layer.locked && (
                                    <span className="text-xs bg-warning-muted text-warning border border-warning/20 px-2 py-0.5 rounded-full font-medium">
                                        Locked from clients
                                    </span>
                                )}
                            </div>
                            <div className="p-5 space-y-3">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Select Layer from Library
                                </label>
                                <select
                                    value={layer.stateKey}
                                    onChange={e => layer.setter(e.target.value)}
                                    className="input-base"
                                >
                                    <option value="">— Not assigned —</option>
                                    {layersByType(layer.key).map(l => (
                                        <option key={l.id} value={l.id}>
                                            {l.name}
                                        </option>
                                    ))}
                                </select>
                                {layer.stateKey && (
                                    <button
                                        onClick={() => {
                                            const found = layers.find(l => l.id === layer.stateKey)
                                            setPreviewLayer(previewLayer?.id === layer.stateKey ? null : (found ?? null))
                                        }}
                                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                                    >
                                        {previewLayer?.id === layer.stateKey ? (
                                            <><EyeOff className="w-3 h-3" /> Hide preview</>
                                        ) : (
                                            <><Eye className="w-3 h-3" /> Preview content</>
                                        )}
                                    </button>
                                )}
                                {previewLayer?.id === layer.stateKey && (
                                    <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto max-h-48 whitespace-pre-wrap text-muted-foreground font-mono">
                                        {previewLayer.content}
                                    </pre>
                                )}
                                {layersByType(layer.key).length === 0 && (
                                    <p className="text-xs text-muted-foreground italic">
                                        No {layer.key} layers in the library yet.{' '}
                                        <a href="/superadmin/prompt-library" className="text-primary underline">Create one</a>.
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Tools Tab ── */}
            {tab === 'tools' && (
                <div className="space-y-4 rounded-2xl border border-border/40 bg-background p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Default Tools</h2>
                        <span className="text-sm text-muted-foreground">{selectedTools.size} of {tools.length} selected</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        These tools are granted to agents deployed from this template.
                        Clients cannot change this — only superadmin can modify tool grants.
                    </p>

                    <div className="space-y-2">
                        {(['retrieval', 'generation', 'analysis', 'action'] as const).map(cat => {
                            const catTools = tools.filter(t => t.category === cat)
                            if (catTools.length === 0) return null
                            return (
                                <div key={cat}>
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 mt-4">{cat}</p>
                                    <div className="space-y-2">
                                        {catTools.map(tool => {
                                            const active = selectedTools.has(tool.name)
                                            const disabled = !tool.is_enabled
                                            return (
                                                <button
                                                    key={tool.name}
                                                    onClick={() => !disabled && toggleTool(tool.name)}
                                                    disabled={disabled}
                                                    className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                                                        disabled
                                                            ? 'opacity-40 cursor-not-allowed border-border'
                                                            : active
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-border hover:border-primary/40'
                                                    }`}
                                                >
                                                    <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                        active ? 'bg-primary border-primary' : 'border-border'
                                                    }`}>
                                                        {active && <Check className="w-3 h-3 text-textInverse" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-mono text-sm font-semibold">{tool.name}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                                tool.min_tier === 'basic'      ? 'bg-info-muted text-info' :
                                                                tool.min_tier === 'medium'     ? 'bg-accent/10 text-accent' :
                                                                'bg-warning-muted text-warning'
                                                            }`}>
                                                                {tierLabel(tool)}+
                                                            </span>
                                                            {disabled && <span className="text-xs text-muted-foreground">(disabled in registry)</span>}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tool.description}</p>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── RAG Config Tab ── */}
            {tab === 'rag' && (
                <div className="space-y-6 rounded-2xl border border-border/40 bg-background p-6">
                    <h2 className="text-lg font-semibold">RAG Configuration</h2>
                    <p className="text-sm text-muted-foreground">
                        These settings control how the Brain retrieves knowledge. Applied to all agents deployed from this template.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <SliderField
                            label="Top K Results"
                            description="Number of KB chunks retrieved per query"
                            value={ragTopK}
                            min={1} max={20} step={1}
                            onChange={setRagTopK}
                            display={v => `${v} chunks`}
                        />
                        <SliderField
                            label="Min Confidence"
                            description="Below this score, a knowledge gap is recorded"
                            value={ragMinConf}
                            min={0.3} max={0.95} step={0.05}
                            onChange={setRagMinConf}
                            display={v => `${(v * 100).toFixed(0)}%`}
                        />
                        <SliderField
                            label="FTS Weight"
                            description={`Keyword search weight. Vector weight = ${(1 - ragFtsWeight).toFixed(2)}`}
                            value={ragFtsWeight}
                            min={0.1} max={0.9} step={0.1}
                            onChange={v => setRagFtsWeight(parseFloat(v.toFixed(1)))}
                            display={v => `${(v * 100).toFixed(0)}% FTS / ${((1 - v) * 100).toFixed(0)}% Vector`}
                        />
                    </div>

                    <ToggleField
                        label="Query Expansion"
                        description="Use LLM to generate alternative phrasings before retrieval (improves recall, adds latency)"
                        value={ragQueryExp}
                        onChange={setRagQueryExp}
                    />
                </div>
            )}

            {/* ── Deploy Tab ── */}
            {tab === 'deploy' && (
                <div className="space-y-6 rounded-2xl border border-border/40 bg-background p-6">
                    <div className="flex items-center gap-3">
                        <Rocket className="w-6 h-6 text-primary" />
                        <h2 className="text-lg font-semibold">Deploy to Organisation</h2>
                    </div>

                    {deployments.length > 0 && (
                        <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                            <p className="text-sm font-semibold mb-2">Active deployments ({deployments.length})</p>
                            <ul className="space-y-1.5 text-sm text-muted-foreground">
                                {deployments.map(d => (
                                    <li key={d.orgId} className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                                        <span className="font-medium text-foreground">{d.orgName}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{d.status}</span>
                                        <span className="text-xs">{d.deployedAt ? new Date(d.deployedAt).toLocaleDateString() : ''}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm space-y-1">
                        <p className="font-semibold">What deployment does:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Creates a <code className="text-xs bg-muted px-1 py-0.5 rounded">brain_agents</code> row — the live agent for this org</li>
                            <li>Copies prompt layers as text (template changes won't affect it later)</li>
                            <li>Creates 6 default KB sections for the org</li>
                            <li>Agent starts in <code className="text-xs bg-muted px-1 py-0.5 rounded">configuring</code> status until KB is trained</li>
                        </ul>
                    </div>

                    <FormField label="Select Organisation">
                        <select
                            value={deployOrgId}
                            onChange={e => setDeployOrgId(e.target.value)}
                            className="input-base"
                        >
                            <option value="">— Choose an organisation —</option>
                            {orgs.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </select>
                    </FormField>

                    {deployResult && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-success-muted border border-success/30 text-success text-sm">
                            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            {deployResult}
                        </div>
                    )}

                    <button
                        onClick={handleDeploy}
                        disabled={!deployOrgId || isDeploying}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100 font-medium"
                    >
                        {isDeploying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Rocket className="w-4 h-4" />
                        )}
                        {isDeploying ? 'Deploying…' : 'Deploy Agent'}
                    </button>
                </div>
            )}

            <style jsx>{`
                .input-base {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border-radius: 0.5rem;
                    border: 1px solid hsl(var(--border));
                    background: hsl(var(--background));
                    font-size: 0.875rem;
                    outline: none;
                    transition: box-shadow 0.15s;
                }
                .input-base:focus {
                    box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
                }
            `}</style>
        </div>
    )
}

// ── Small Helpers ──────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">{label}</label>
            {children}
        </div>
    )
}

function SliderField({ label, description, value, min, max, step, onChange, display }: {
    label: string; description: string; value: number; min: number; max: number; step: number;
    onChange: (v: number) => void; display: (v: number) => string
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{label}</label>
                <span className="text-sm font-mono text-primary">{display(value)}</span>
            </div>
            <input
                type="range"
                min={min} max={max} step={step}
                value={value}
                onChange={e => onChange(parseFloat(e.target.value))}
                className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
    )
}

function ToggleField({ label, description, value, onChange }: {
    label: string; description: string; value: boolean; onChange: (v: boolean) => void
}) {
    return (
        <label className="flex items-start gap-4 cursor-pointer select-none">
            <button
                onClick={() => onChange(!value)}
                className={`relative mt-0.5 w-11 h-6 rounded-full flex-shrink-0 transition-colors ${value ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
                <span className={`absolute top-1 w-4 h-4 bg-surface rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
        </label>
    )
}
