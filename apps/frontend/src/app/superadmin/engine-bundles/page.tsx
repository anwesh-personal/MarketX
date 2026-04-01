'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    Package, Plus, Rocket, Brain, Workflow,
    Key, Globe, Users, Activity, Zap, X,
    ChevronDown, ChevronUp, Loader2, AlertCircle,
    Archive, RefreshCw, Shield, Building2, User,
    Copy, CheckCircle, Settings, Sliders, Trash2,
    ChevronRight, Terminal, Eye, EyeOff, Sparkles,
    Bot, Wrench, BookOpen, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'
import { EngineBundle } from '@/types/engine'

// ── Constant Data ─────────────────────────────────────────────

const AGENT_ROLES = [
    { value: 'writer',   label: 'Email Writer',     icon: '✍️', desc: 'Writes emails, sequences, nurture flows' },
    { value: 'content',  label: 'Content Generator', icon: '📝', desc: 'Blog posts, social, HTML/Tailwind templates' },
    { value: 'analyst',  label: 'Analyst',           icon: '📊', desc: 'Campaign metrics, data queries, reporting' },
    { value: 'coach',    label: 'Marketing Coach',   icon: '🎯', desc: 'Feedback loop, belief updates, optimization' },
    { value: 'generalist',label:'Generalist',        icon: '🤖', desc: 'Fallback agent for general queries' },
]

const LLM_PROVIDERS = [
    { value: 'anthropic', label: 'Anthropic', models: [
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recommended)' },
        { value: 'claude-3-5-haiku-20241022',  label: 'Claude 3.5 Haiku (Fast)' },
        { value: 'claude-3-opus-20240229',     label: 'Claude 3 Opus (Most Capable)' },
    ]},
    { value: 'openai', label: 'OpenAI', models: [
        { value: 'gpt-4o',          label: 'GPT-4o' },
        { value: 'gpt-4o-mini',     label: 'GPT-4o Mini (Fast)' },
        { value: 'gpt-4-turbo',     label: 'GPT-4 Turbo' },
        { value: 'o1-preview',      label: 'o1 Preview (Reasoning)' },
    ]},
    { value: 'google', label: 'Google', models: [
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        { value: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro (2M ctx)' },
    ]},
    { value: 'xai', label: 'xAI', models: [
        { value: 'grok-2-1212', label: 'Grok 2' },
    ]},
    { value: 'mistral', label: 'Mistral', models: [
        { value: 'mistral-large-latest', label: 'Mistral Large' },
    ]},
]

const ALL_TOOLS = [
    { value: 'write_email',      label: 'Write Email' },
    { value: 'search_kb',        label: 'Search Knowledge Base' },
    { value: 'get_icp',          label: 'Get ICP Context' },
    { value: 'get_beliefs',      label: 'Get Beliefs' },
    { value: 'get_offer',        label: 'Get Offer Details' },
    { value: 'fetch_metrics',    label: 'Fetch Campaign Metrics' },
    { value: 'update_belief',    label: 'Update Belief Score' },
    { value: 'run_sql',          label: 'Run SQL Query' },
    { value: 'render_html',      label: 'Render HTML Template' },
    { value: 'send_email',       label: 'Send Email via Provider' },
    { value: 'search_web',       label: 'Search Web (Perplexity)' },
    { value: 'create_sequence',  label: 'Create Email Sequence' },
    { value: 'analyze_open_rate',label: 'Analyze Open Rates' },
]

// ── Types ─────────────────────────────────────────────────────

interface AgentConfig {
    role: string
    name: string
    is_primary: boolean
    llm: { provider: string; model: string; temperature: number; max_tokens: number }
    prompts: { foundation: string; persona: string; domain: string; guardrails: string }
    tools: string[]
    rag: { top_k: number; min_confidence: number; strict_grounding: boolean }
    memory_enabled: boolean
    max_turns: number
}

interface BrainTemplate { id: string; name: string; pricing_tier: string }
interface WorkflowTemplate { id: string; name: string }
interface Organization { id: string; name: string; plan?: string }

interface DeployedInstance {
    id: string; name: string; org_id: string; org_name: string | null
    assigned_user_id: string | null; assigned_user_email: string | null
    brain_agent_id: string | null; workflow_template_id: string | null; workflow_name: string | null
    api_key_mode: string; status: string
    runs_today: number; runs_total: number; last_run_at: string | null
    deployed_at: string | null; api_key_preview: string | null; has_overrides: boolean
}

const defaultAgent = (): AgentConfig => ({
    role: 'writer', name: 'Email Specialist', is_primary: true,
    llm: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.7, max_tokens: 4000 },
    prompts: { foundation: '', persona: '', domain: '', guardrails: '' },
    tools: ['write_email', 'search_kb', 'get_icp', 'get_beliefs'],
    rag: { top_k: 5, min_confidence: 0.6, strict_grounding: false },
    memory_enabled: true, max_turns: 20,
})

// ── Tier / Status colours ─────────────────────────────────────

const TIER_CLS: Record<string, string> = {
    echii:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
    pulz:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
    quanta: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}
const STATUS_CLS: Record<string, string> = {
    active:   'bg-surfaceElevated text-success border-border',
    draft:    'bg-muted/20 text-muted-foreground border-border',
    archived: 'bg-surfaceElevated text-error border-border',
}
const INST_CLS: Record<string, string> = {
    active:   'bg-surfaceElevated text-success',
    standby:  'bg-surfaceElevated text-warning',
    disabled: 'bg-muted/20 text-muted-foreground',
    error:    'bg-surfaceElevated text-error',
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function EngineBundlesPage() {
    const { fetchWithAuth } = useSuperadminAuth()
    const [bundles, setBundles]             = useState<EngineBundle[]>([])
    const [loading, setLoading]             = useState(true)
    const [error, setError]                 = useState<string | null>(null)
    const [brainTemplates, setBrainTemplates] = useState<BrainTemplate[]>([])
    const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([])
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [showCreate, setShowCreate]       = useState(false)
    const [deployTarget, setDeployTarget]   = useState<EngineBundle | null>(null)
    const [customizeTarget, setCustomizeTarget] = useState<{ bundle: EngineBundle; instance: DeployedInstance } | null>(null)
    const [expandedBundle, setExpandedBundle] = useState<string | null>(null)
    const [deployments, setDeployments]     = useState<Record<string, DeployedInstance[]>>({})
    const [loadingDeps, setLoadingDeps]     = useState<string | null>(null)

    const loadData = useCallback(async () => {
        setLoading(true); setError(null)
        try {
            const [bRes, brRes, wRes, oRes] = await Promise.all([
                fetchWithAuth('/api/superadmin/engine-bundles'),
                fetchWithAuth('/api/superadmin/brains'),
                fetchWithAuth('/api/superadmin/workflows'),
                fetchWithAuth('/api/superadmin/organizations'),
            ])
            if (bRes.ok)  setBundles((await bRes.json()).bundles || [])
            if (brRes.ok) setBrainTemplates((await brRes.json()).brains || [])
            if (wRes.ok)  setWorkflowTemplates((await wRes.json()).data || [])
            if (oRes.ok)  setOrganizations((await oRes.json()).organizations || [])
        } catch (e: any) { setError(e.message) }
        finally { setLoading(false) }
    }, [fetchWithAuth])

    useEffect(() => { loadData() }, [loadData])

    const toggleExpand = async (bundleId: string) => {
        if (expandedBundle === bundleId) { setExpandedBundle(null); return }
        setExpandedBundle(bundleId)
        if (!deployments[bundleId]) {
            setLoadingDeps(bundleId)
            const res = await fetchWithAuth(`/api/superadmin/engine-bundles/${bundleId}/deploy`)
            if (res.ok) {
                const data = await res.json()
                setDeployments(p => ({ ...p, [bundleId]: data.deployments || [] }))
            }
            setLoadingDeps(null)
        }
    }

    const handleArchive = async (bundle: EngineBundle) => {
        if (!confirm(`Archive "${bundle.name}"?`)) return
        const res = await fetchWithAuth(`/api/superadmin/engine-bundles/${bundle.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'archived' }),
        })
        if (res.ok) setBundles(p => p.map(b => b.id === bundle.id ? { ...b, status: 'archived' } : b))
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
    )

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
                            <Package className="w-6 h-6 text-accent" />
                        </div>
                        <h1 className="text-3xl font-bold font-display text-textPrimary">Engine Bundles</h1>
                    </div>
                    <p className="text-textSecondary ml-1 max-w-2xl">
                        Master blueprints — each bundle packages Brain + Agents (with LLM) + Workflow + Email Provider.
                        Deploy to an org and a full snapshot is created, API key generated, complete isolation guaranteed.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadData} className="btn btn-ghost btn-icon"><RefreshCw className="w-4 h-4" /></button>
                    <button onClick={() => setShowCreate(true)} className="btn btn-primary">
                        <Plus className="w-4 h-4" /> New Bundle
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Bundles',     value: bundles.length,                                                  icon: Package,      color: 'text-accent' },
                    { label: 'Active',             value: bundles.filter(b => b.status === 'active').length,               icon: CheckCircle,  color: 'text-success' },
                    { label: 'Total Deployments',  value: bundles.reduce((s, b) => s + (b._deployments_count ?? 0), 0),   icon: Rocket,       color: 'text-info' },
                    { label: 'Live Deployments',   value: bundles.reduce((s, b) => s + (b._active_deployments ?? 0), 0),  icon: Activity,     color: 'text-warning' },
                ].map(s => (
                    <div key={s.label} className="premium-card !p-4 flex items-center gap-4">
                        <s.icon className={`w-8 h-8 ${s.color} flex-shrink-0`} />
                        <div>
                            <p className="text-2xl font-bold text-textPrimary">{s.value}</p>
                            <p className="text-xs text-textSecondary">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {error && <ErrorBar message={error} />}

            {/* Bundle list */}
            {bundles.length === 0 ? (
                <EmptyState onNew={() => setShowCreate(true)} />
            ) : (
                <div className="space-y-3">
                    {bundles.map(bundle => (
                        <BundleCard
                            key={bundle.id}
                            bundle={bundle}
                            isExpanded={expandedBundle === bundle.id}
                            instances={deployments[bundle.id] || []}
                            loadingInstances={loadingDeps === bundle.id}
                            onToggle={() => toggleExpand(bundle.id)}
                            onDeploy={() => setDeployTarget(bundle)}
                            onArchive={() => handleArchive(bundle)}
                            onCustomize={(inst) => setCustomizeTarget({ bundle, instance: inst })}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            {showCreate && (
                <CreateBundleModal
                    brainTemplates={brainTemplates}
                    workflowTemplates={workflowTemplates}
                    onClose={() => setShowCreate(false)}
                    onCreated={b => { setBundles(p => [b, ...p]); setShowCreate(false) }}
                    fetchWithAuth={fetchWithAuth}
                />
            )}
            {deployTarget && (
                <DeployModal
                    bundle={deployTarget}
                    organizations={organizations}
                    fetchWithAuth={fetchWithAuth}
                    onClose={() => setDeployTarget(null)}
                    onDeployed={() => {
                        const id = deployTarget.id
                        setDeployTarget(null)
                        setDeployments(p => { const n = { ...p }; delete n[id]; return n })
                        setExpandedBundle(id)
                    }}
                />
            )}
            {customizeTarget && (
                <CustomizeModal
                    bundle={customizeTarget.bundle}
                    instance={customizeTarget.instance}
                    fetchWithAuth={fetchWithAuth}
                    onClose={() => setCustomizeTarget(null)}
                    onSaved={() => {
                        setCustomizeTarget(null)
                        setDeployments(p => { const n = { ...p }; delete n[customizeTarget.bundle.id]; return n })
                        setExpandedBundle(customizeTarget.bundle.id)
                    }}
                />
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// BUNDLE CARD
// ═══════════════════════════════════════════════════════════════

function BundleCard({ bundle, isExpanded, instances, loadingInstances, onToggle, onDeploy, onArchive, onCustomize }: {
    bundle: EngineBundle; isExpanded: boolean; instances: DeployedInstance[]
    loadingInstances: boolean; onToggle: () => void; onDeploy: () => void
    onArchive: () => void; onCustomize: (inst: DeployedInstance) => void
}) {
    return (
        <div className={`premium-card overflow-hidden transition-all duration-200 ${isExpanded ? 'border-accent/30' : ''}`}>
            <div className="flex items-center gap-4 p-5">
                <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-textPrimary text-lg truncate">{bundle.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TIER_CLS[bundle.tier] || ''}`}>{bundle.tier}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_CLS[bundle.status] || ''}`}>{bundle.status}</span>
                    </div>
                    <p className="text-sm text-textSecondary truncate mb-2">{bundle.description || 'No description'}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        {bundle.brain_template_name && <Pill icon={Brain} label={bundle.brain_template_name} color="text-accent-secondary" />}
                        {bundle.workflow_template_name && <Pill icon={Workflow} label={bundle.workflow_template_name} color="text-accent" />}
                        <Pill icon={Key} label={bundle.default_api_key_mode === 'byok' ? 'BYOK' : bundle.default_api_key_mode === 'hybrid' ? 'Hybrid' : 'Platform Keys'} color="text-warning" />
                    </div>
                </div>
                <div className="flex items-center gap-6 text-center flex-shrink-0">
                    <div><p className="text-xl font-bold text-textPrimary">{bundle._deployments_count ?? 0}</p><p className="text-xs text-textSecondary">Deployed</p></div>
                    <div><p className="text-xl font-bold text-success">{bundle._active_deployments ?? 0}</p><p className="text-xs text-textSecondary">Active</p></div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {bundle.status !== 'archived' && (
                        <button onClick={onDeploy} className="btn btn-primary btn-sm">
                            <Rocket className="w-4 h-4" /> Deploy
                        </button>
                    )}
                    <button onClick={onToggle} className="btn btn-ghost btn-icon btn-sm">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {bundle.status !== 'archived' && (
                        <button onClick={onArchive} className="btn btn-ghost btn-icon btn-sm text-error hover:bg-surfaceElevated">
                            <Archive className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-border/40 bg-background/30 p-4">
                    <h4 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Rocket className="w-4 h-4" /> Deployed Instances
                    </h4>
                    {loadingInstances ? (
                        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-accent animate-spin" /></div>
                    ) : instances.length === 0 ? (
                        <div className="text-center py-8 text-textTertiary">
                            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No deployments yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {instances.map(inst => (
                                <div key={inst.id} className="flex items-center gap-4 p-3 rounded-lg bg-surface border border-border">
                                    <Building2 className="w-5 h-5 text-textSecondary flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-textPrimary truncate">{inst.org_name ?? inst.org_id}</p>
                                        {(inst.workflow_name || inst.workflow_template_id) && (
                                            <p className="text-xs text-textSecondary flex items-center gap-1">
                                                <Workflow className="w-3 h-3" /> {inst.workflow_name ?? inst.workflow_template_id}
                                            </p>
                                        )}
                                        {inst.assigned_user_email && (
                                            <p className="text-xs text-textSecondary flex items-center gap-1">
                                                <User className="w-3 h-3" /> {inst.assigned_user_email}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full font-medium ${INST_CLS[inst.status] || ''}`}>{inst.status}</span>
                                        <span className="text-textSecondary flex items-center gap-1"><Key className="w-3 h-3" /> {inst.api_key_mode}</span>
                                        <span className="text-textSecondary flex items-center gap-1"><Zap className="w-3 h-3" /> {inst.runs_total}</span>
                                        {inst.has_overrides && (
                                            <span className="px-2 py-0.5 rounded-full bg-surfaceElevated text-warning flex items-center gap-1">
                                                <Sliders className="w-3 h-3" /> overrides
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => onCustomize(inst)}
                                        className="btn btn-ghost btn-sm flex items-center gap-1 text-xs"
                                        title="Customize this instance"
                                    >
                                        <Sliders className="w-3.5 h-3.5" /> Customize
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// CREATE BUNDLE MODAL
// ═══════════════════════════════════════════════════════════════

function CreateBundleModal({ brainTemplates, workflowTemplates, onClose, onCreated, fetchWithAuth }: {
    brainTemplates: BrainTemplate[]; workflowTemplates: WorkflowTemplate[]
    onClose: () => void; onCreated: (b: EngineBundle) => void
    fetchWithAuth: (url: string, o?: RequestInit) => Promise<Response>
}) {
    const [tab, setTab] = useState<'basics' | 'agents' | 'llm'>('basics')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [basics, setBasics] = useState({
        name: '', description: '', tier: 'echii' as const,
        brain_template_id: '', workflow_template_id: '',
        default_api_key_mode: 'platform' as const,
    })
    const [defaultLlm, setDefaultLlm] = useState({ provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', temperature: 0.7, max_tokens: 4000 })
    const [agents, setAgents] = useState<AgentConfig[]>([defaultAgent()])
    const [expandedAgent, setExpandedAgent] = useState<number>(0)

    const modelsForProvider = (provider: string) =>
        LLM_PROVIDERS.find(p => p.value === provider)?.models || []

    const addAgent = () => {
        const newAgent = defaultAgent()
        newAgent.role = 'generalist'
        newAgent.name = 'Support Agent'
        newAgent.is_primary = false
        setAgents(p => [...p, newAgent])
        setExpandedAgent(agents.length)
    }

    const removeAgent = (i: number) => {
        setAgents(p => p.filter((_, idx) => idx !== i))
        setExpandedAgent(Math.max(0, i - 1))
    }

    const updateAgent = (i: number, patch: Partial<AgentConfig>) =>
        setAgents(p => p.map((a, idx) => idx === i ? { ...a, ...patch } : a))

    const updateAgentLlm = (i: number, patch: Partial<AgentConfig['llm']>) =>
        setAgents(p => p.map((a, idx) => idx === i ? { ...a, llm: { ...a.llm, ...patch } } : a))

    const updateAgentPrompts = (i: number, patch: Partial<AgentConfig['prompts']>) =>
        setAgents(p => p.map((a, idx) => idx === i ? { ...a, prompts: { ...a.prompts, ...patch } } : a))

    const updateAgentRag = (i: number, patch: Partial<AgentConfig['rag']>) =>
        setAgents(p => p.map((a, idx) => idx === i ? { ...a, rag: { ...a.rag, ...patch } } : a))

    const toggleTool = (i: number, tool: string) =>
        setAgents(p => p.map((a, idx) => idx === i
            ? { ...a, tools: a.tools.includes(tool) ? a.tools.filter(t => t !== tool) : [...a.tools, tool] }
            : a
        ))

    const setPrimary = (i: number) =>
        setAgents(p => p.map((a, idx) => ({ ...a, is_primary: idx === i })))

    const handleSubmit = async () => {
        if (!basics.name.trim()) { setError('Name required'); return }
        if (!basics.workflow_template_id?.trim()) { setError('Workflow template is required. Bundle = Brain + Workflow + Agents + Config.'); return }
        setSaving(true); setError(null)
        try {
            const res = await fetchWithAuth('/api/superadmin/engine-bundles', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...basics,
                    brain_template_id: basics.brain_template_id || null,
                    workflow_template_id: basics.workflow_template_id,
                    default_llm: defaultLlm,
                    agents_config: agents,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            onCreated(data.bundle)
        } catch (e: any) { setError(e.message) }
        finally { setSaving(false) }
    }

    const TABS = [
        { id: 'basics', label: 'Basics', icon: Package },
        { id: 'llm',    label: 'Default LLM', icon: Sparkles },
        { id: 'agents', label: `Agents (${agents.length})`, icon: Bot },
    ] as const

    return (
        <div className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200" role="dialog" aria-modal="true" aria-labelledby="create-bundle-title">
            <div className="bg-background border border-border rounded-[var(--radius-lg)] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl transition-all duration-200 ease-out">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-accent/10"><Package className="w-5 h-5 text-accent" /></div>
                        <div>
                            <h2 id="create-bundle-title" className="text-xl font-bold text-textPrimary">Create Engine Bundle</h2>
                            <p className="text-sm text-textSecondary">Package Brain + Agents + Workflow together</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-icon"><X className="w-5 h-5" /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border px-6 flex-shrink-0">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${tab === t.id ? 'border-accent text-accent' : 'border-transparent text-textSecondary hover:text-textPrimary'}`}
                        >
                            <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* ── BASICS TAB ──────────────────────────── */}
                    {tab === 'basics' && (
                        <>
                            <div className="space-y-1.5">
                                <label className="label-sm">Bundle Name *</label>
                                <input value={basics.name} onChange={e => setBasics(b => ({ ...b, name: e.target.value }))} placeholder="e.g. MarketX Email Engine — Pro" className="input w-full" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="label-sm">Description</label>
                                <textarea value={basics.description} onChange={e => setBasics(b => ({ ...b, description: e.target.value }))} rows={2} className="input w-full resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="label-sm flex items-center gap-2"><Brain className="w-4 h-4 text-accent-secondary" /> Brain Template</label>
                                    <select value={basics.brain_template_id} onChange={e => setBasics(b => ({ ...b, brain_template_id: e.target.value }))} className="input w-full">
                                        <option value="">— Select —</option>
                                        {brainTemplates.map(bt => <option key={bt.id} value={bt.id}>{bt.name} ({bt.pricing_tier})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-sm flex items-center gap-2"><Workflow className="w-4 h-4 text-accent" /> Workflow *</label>
                                    <select value={basics.workflow_template_id} onChange={e => setBasics(b => ({ ...b, workflow_template_id: e.target.value }))} className="input w-full" required aria-describedby="workflow-helper">
                                        <option value="">— Select workflow (required) —</option>
                                        {workflowTemplates.map(wt => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
                                    </select>
                                    <p id="workflow-helper" className="text-xs text-textTertiary mt-1">Required. The pipeline that runs when this engine is invoked.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-sm flex items-center gap-2"><Zap className="w-4 h-4 text-warning" /> Tier</label>
                                    <select value={basics.tier} onChange={e => setBasics(b => ({ ...b, tier: e.target.value as any }))} className="input w-full">
                                        <option value="echii">Echii (Starter)</option>
                                        <option value="pulz">Pulz (Growth)</option>
                                        <option value="quanta">Quanta (Enterprise)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-sm flex items-center gap-2"><Key className="w-4 h-4 text-warning" /> API Key Strategy</label>
                                    <select value={basics.default_api_key_mode} onChange={e => setBasics(b => ({ ...b, default_api_key_mode: e.target.value as any }))} className="input w-full">
                                        <option value="platform">Platform (Axiom pays)</option>
                                        <option value="byok">BYOK (client keys)</option>
                                        <option value="hybrid">Hybrid (BYOK → platform fallback)</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── DEFAULT LLM TAB ─────────────────────── */}
                    {tab === 'llm' && (
                        <div className="space-y-5">
                            <div className="p-4 rounded-xl bg-surfaceHover border border-border text-sm text-textSecondary">
                                This is the fallback LLM used by all agents unless they specify their own. Agents inherit from this and can override individually.
                            </div>
                            <LlmPicker llm={defaultLlm} onChange={setDefaultLlm} />
                        </div>
                    )}

                    {/* ── AGENTS TAB ──────────────────────────── */}
                    {tab === 'agents' && (
                        <div className="space-y-4">
                            {agents.map((agent, i) => (
                                <AgentEditor
                                    key={i}
                                    agent={agent}
                                    index={i}
                                    isExpanded={expandedAgent === i}
                                    onToggle={() => setExpandedAgent(expandedAgent === i ? -1 : i)}
                                    onUpdate={patch => updateAgent(i, patch)}
                                    onUpdateLlm={patch => updateAgentLlm(i, patch)}
                                    onUpdatePrompts={patch => updateAgentPrompts(i, patch)}
                                    onUpdateRag={patch => updateAgentRag(i, patch)}
                                    onToggleTool={tool => toggleTool(i, tool)}
                                    onSetPrimary={() => setPrimary(i)}
                                    onRemove={agents.length > 1 ? () => removeAgent(i) : undefined}
                                />
                            ))}
                            <button onClick={addAgent} className="btn btn-ghost w-full border border-dashed border-border hover:border-accent/40">
                                <Plus className="w-4 h-4" /> Add Agent
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border flex-shrink-0">
                    {error ? <ErrorBar message={error} inline /> : <div />}
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                        {tab !== 'agents' ? (
                            <button onClick={() => setTab(tab === 'basics' ? 'llm' : 'agents')} className="btn btn-secondary">
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} className="btn btn-primary" disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                                Create Bundle
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// AGENT EDITOR (used in both Create + Customize)
// ═══════════════════════════════════════════════════════════════

function AgentEditor({ agent, index, isExpanded, onToggle, onUpdate, onUpdateLlm, onUpdatePrompts, onUpdateRag, onToggleTool, onSetPrimary, onRemove }: {
    agent: AgentConfig; index: number; isExpanded: boolean; onToggle: () => void
    onUpdate: (p: Partial<AgentConfig>) => void
    onUpdateLlm: (p: Partial<AgentConfig['llm']>) => void
    onUpdatePrompts: (p: Partial<AgentConfig['prompts']>) => void
    onUpdateRag: (p: Partial<AgentConfig['rag']>) => void
    onToggleTool: (t: string) => void
    onSetPrimary: () => void
    onRemove?: () => void
}) {
    const roleInfo = AGENT_ROLES.find(r => r.value === agent.role)
    const [promptTab, setPromptTab] = useState<'foundation' | 'persona' | 'domain' | 'guardrails'>('foundation')

    return (
        <div className={`border rounded-xl overflow-hidden transition-all ${agent.is_primary ? 'border-accent/40 bg-accent/5' : 'border-border bg-surface'}`}>
            {/* Agent header row */}
            <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={onToggle}>
                <span className="text-2xl">{roleInfo?.icon || '🤖'}</span>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-textPrimary">{agent.name || roleInfo?.label}</p>
                        {agent.is_primary && <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">Primary</span>}
                    </div>
                    <p className="text-xs text-textSecondary">{agent.llm.provider} / {agent.llm.model} · {agent.tools.length} tools</p>
                </div>
                <div className="flex items-center gap-2">
                    {!agent.is_primary && (
                        <button onClick={e => { e.stopPropagation(); onSetPrimary() }} className="text-xs text-textTertiary hover:text-accent px-2 py-1 rounded-lg hover:bg-accent/10 transition-all">
                            Set Primary
                        </button>
                    )}
                    {onRemove && (
                        <button onClick={e => { e.stopPropagation(); onRemove() }} className="btn btn-ghost btn-icon btn-sm text-error">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-textSecondary" /> : <ChevronDown className="w-4 h-4 text-textSecondary" />}
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-border/40 p-4 space-y-5">
                    {/* Role + Name */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="label-sm">Role</label>
                            <select value={agent.role} onChange={e => onUpdate({ role: e.target.value })} className="input w-full">
                                {AGENT_ROLES.map(r => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="label-sm">Agent Name</label>
                            <input value={agent.name} onChange={e => onUpdate({ name: e.target.value })} className="input w-full" />
                        </div>
                    </div>

                    {/* LLM */}
                    <div>
                        <p className="label-sm mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent" /> LLM Config</p>
                        <LlmPicker llm={agent.llm} onChange={onUpdateLlm} />
                    </div>

                    {/* Prompts */}
                    <div>
                        <p className="label-sm mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-accent-secondary" /> Prompts</p>
                        <div className="flex gap-2 mb-3">
                            {(['foundation','persona','domain','guardrails'] as const).map(pt => (
                                <button key={pt} onClick={() => setPromptTab(pt)}
                                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${promptTab === pt ? 'border-accent bg-accent/10 text-accent' : 'border-border text-textSecondary hover:border-accent/40'}`}>
                                    {pt.charAt(0).toUpperCase() + pt.slice(1)}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={agent.prompts[promptTab]}
                            onChange={e => onUpdatePrompts({ [promptTab]: e.target.value })}
                            rows={6}
                            placeholder={`Enter ${promptTab} prompt for this agent...`}
                            className="input w-full resize-none font-mono text-xs"
                        />
                    </div>

                    {/* Tools */}
                    <div>
                        <p className="label-sm mb-3 flex items-center gap-2"><Wrench className="w-4 h-4 text-green-400" /> Tools ({agent.tools.length} granted)</p>
                        <div className="grid grid-cols-2 gap-2">
                            {ALL_TOOLS.map(tool => (
                                <button
                                    key={tool.value}
                                    onClick={() => onToggleTool(tool.value)}
                                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm text-left transition-all ${agent.tools.includes(tool.value) ? 'border-borderHover bg-surface text-textPrimary' : 'border-border text-textSecondary hover:border-border-hover'}`}
                                >
                                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${agent.tools.includes(tool.value) ? 'bg-success text-white' : 'bg-surfaceHover border border-border'}`}>
                                        {agent.tools.includes(tool.value) && <CheckCircle className="w-3 h-3" />}
                                    </div>
                                    {tool.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RAG */}
                    <div>
                        <p className="label-sm mb-3 flex items-center gap-2"><Terminal className="w-4 h-4 text-accent" /> RAG Config</p>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs text-textSecondary">Top K Results</label>
                                <input type="number" min={1} max={20} value={agent.rag.top_k} onChange={e => onUpdateRag({ top_k: parseInt(e.target.value) })} className="input w-full" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-textSecondary">Min Confidence</label>
                                <input type="number" min={0} max={1} step={0.05} value={agent.rag.min_confidence} onChange={e => onUpdateRag({ min_confidence: parseFloat(e.target.value) })} className="input w-full" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-textSecondary">Strict Grounding</label>
                                <button
                                    onClick={() => onUpdateRag({ strict_grounding: !agent.rag.strict_grounding })}
                                    className={`flex items-center gap-2 w-full p-2.5 rounded-lg border transition-all ${agent.rag.strict_grounding ? 'border-accent/40 bg-accent/5 text-accent' : 'border-border text-textSecondary'}`}
                                >
                                    {agent.rag.strict_grounding ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                    {agent.rag.strict_grounding ? 'On' : 'Off'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Memory + Max turns */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs text-textSecondary">Max Turns</label>
                            <input type="number" min={1} max={50} value={agent.max_turns} onChange={e => onUpdate({ max_turns: parseInt(e.target.value) })} className="input w-full" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-textSecondary">Memory</label>
                            <button
                                onClick={() => onUpdate({ memory_enabled: !agent.memory_enabled })}
                                className={`flex items-center gap-2 w-full p-2.5 rounded-lg border transition-all ${agent.memory_enabled ? 'border-accent/40 bg-accent/5 text-accent' : 'border-border text-textSecondary'}`}
                            >
                                {agent.memory_enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                {agent.memory_enabled ? 'Enabled' : 'Disabled'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// LLM PICKER (reusable)
// ═══════════════════════════════════════════════════════════════

function LlmPicker({ llm, onChange }: {
    llm: { provider: string; model: string; temperature: number; max_tokens: number }
    onChange: (p: Partial<typeof llm>) => void
}) {
    const models = LLM_PROVIDERS.find(p => p.value === llm.provider)?.models || []
    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <label className="text-xs text-textSecondary">Provider</label>
                <select value={llm.provider} onChange={e => onChange({ provider: e.target.value, model: LLM_PROVIDERS.find(p => p.value === e.target.value)?.models[0]?.value || '' })} className="input w-full">
                    {LLM_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs text-textSecondary">Model</label>
                <select value={llm.model} onChange={e => onChange({ model: e.target.value })} className="input w-full">
                    {models.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs text-textSecondary">Temperature ({llm.temperature})</label>
                <input type="range" min={0} max={1} step={0.05} value={llm.temperature} onChange={e => onChange({ temperature: parseFloat(e.target.value) })} className="w-full accent-accent" />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs text-textSecondary">Max Tokens</label>
                <input type="number" min={256} max={128000} step={256} value={llm.max_tokens} onChange={e => onChange({ max_tokens: parseInt(e.target.value) })} className="input w-full" />
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// DEPLOY MODAL
// ═══════════════════════════════════════════════════════════════

function DeployModal({ bundle, organizations, fetchWithAuth, onClose, onDeployed }: {
    bundle: EngineBundle; organizations: Organization[]
    fetchWithAuth: (u: string, o?: RequestInit) => Promise<Response>
    onClose: () => void; onDeployed: () => void
}) {
    const [form, setForm] = useState({ org_id: '', assigned_user_id: '', api_key_mode: bundle.default_api_key_mode, byok_openai: '', byok_anthropic: '', notes: '' })
    const [orgUsers, setOrgUsers] = useState<Array<{ id: string; email: string }>>([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [deploying, setDeploying] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<{ api_key: string; engine_instance_id: string; agents_deployed: number; workflow_template_id?: string; workflow_name?: string | null } | null>(null)
    const [apiKeyCopied, setApiKeyCopied] = useState(false)
    const [showKey, setShowKey] = useState(false)

    const loadUsers = async (orgId: string) => {
        if (!orgId) { setOrgUsers([]); return }
        setLoadingUsers(true)
        const res = await fetchWithAuth(`/api/superadmin/organizations/${orgId}`)
        if (res.ok) setOrgUsers((await res.json()).users || [])
        setLoadingUsers(false)
    }

    const copyKey = () => {
        if (result?.api_key) {
            navigator.clipboard.writeText(result.api_key)
            setApiKeyCopied(true)
            setTimeout(() => setApiKeyCopied(false), 2000)
        }
    }

    const deploy = async () => {
        if (!form.org_id) { setError('Select an organization'); return }
        setDeploying(true); setError(null)
        const byokKeys: Record<string, string> = {}
        if (form.api_key_mode !== 'platform') {
            if (form.byok_openai) byokKeys.openai = form.byok_openai
            if (form.byok_anthropic) byokKeys.anthropic = form.byok_anthropic
        }
        try {
            const res = await fetchWithAuth(`/api/superadmin/engine-bundles/${bundle.id}/deploy`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    org_id: form.org_id,
                    assigned_user_id: form.assigned_user_id || null,
                    api_key_mode: form.api_key_mode,
                    byok_keys: Object.keys(byokKeys).length ? byokKeys : null,
                    deployment_notes: form.notes || null,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setResult(data)
        } catch (e: any) { setError(e.message) }
        finally { setDeploying(false) }
    }

    return (
        <div className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200" role="dialog" aria-modal="true" aria-labelledby="deploy-bundle-title">
            <div className="bg-background border border-border rounded-[var(--radius-lg)] w-full max-w-xl shadow-2xl overflow-hidden transition-all duration-200 ease-out">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-surfaceElevated"><Rocket className="w-5 h-5 text-success" aria-hidden /></div>
                        <div>
                            <h2 id="deploy-bundle-title" className="text-xl font-bold text-textPrimary">Deploy Bundle</h2>
                            <p className="text-sm text-textSecondary">{bundle.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-icon"><X className="w-5 h-5" /></button>
                </div>

                {result ? (
                    /* ── Success screen ── */
                    <div className="p-6 space-y-5">
                        <div className="flex flex-col items-center text-center pb-2">
                            <div className="w-16 h-16 rounded-full bg-surfaceElevated flex items-center justify-center mb-3">
                                <CheckCircle className="w-8 h-8 text-success" />
                            </div>
                            <h3 className="text-lg font-bold text-textPrimary">Deployed Successfully!</h3>
                            <p className="text-sm text-textSecondary mt-1">{result.agents_deployed} agent(s) cloned · Full snapshot stored · Isolation guaranteed</p>
                            {(result.workflow_name ?? result.workflow_template_id) && (
                                <p className="text-xs text-textTertiary">Workflow: <span className="font-medium text-textSecondary">{result.workflow_name ?? result.workflow_template_id}</span> (snapshotted at deploy — updates to the workflow do not affect this instance)</p>
                            )}
                        </div>

                        {/* API Key — shown ONCE */}
                        <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                            <div className="flex items-center gap-2 text-warning text-sm font-semibold">
                                <Key className="w-4 h-4" /> Engine API Key — copy now, shown once
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs font-mono bg-background border border-border rounded-lg px-3 py-2 text-textPrimary overflow-hidden">
                                    {showKey ? result.api_key : `${result.api_key.substring(0, 16)}${'•'.repeat(32)}`}
                                </code>
                                <button onClick={() => setShowKey(s => !s)} className="btn btn-ghost btn-icon btn-sm">
                                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button onClick={copyKey} className="btn btn-primary btn-sm">
                                    {apiKeyCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {apiKeyCopied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <p className="text-xs text-textTertiary">Instance ID: <code className="font-mono">{result.engine_instance_id}</code></p>
                            <p className="text-xs text-textTertiary mt-1">Copy the API key above — it&apos;s shown only once.</p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={onDeployed} className="btn btn-primary flex-1">Done</button>
                        </div>
                    </div>
                ) : (
                    /* ── Deploy form ── */
                    <div className="p-6 space-y-4">
                        {/* Bundle summary pills */}
                        <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-surfaceHover border border-border">
                            {bundle.brain_template_name && <Pill icon={Brain} label={bundle.brain_template_name} color="text-accent-secondary" />}
                            {bundle.workflow_template_name && <Pill icon={Workflow} label={bundle.workflow_template_name} color="text-accent" />}
                            <Pill icon={Key} label={bundle.default_api_key_mode} color="text-warning" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="label-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Organization *</label>
                            <select value={form.org_id} onChange={e => { setForm(f => ({ ...f, org_id: e.target.value, assigned_user_id: '' })); loadUsers(e.target.value) }} className="input w-full">
                                <option value="">— Select —</option>
                                {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>

                        {form.org_id && (
                            <div className="space-y-1.5">
                                <label className="label-sm flex items-center gap-2"><User className="w-4 h-4" /> Assign to User <span className="text-textTertiary font-normal">(optional)</span></label>
                                <select value={form.assigned_user_id} onChange={e => setForm(f => ({ ...f, assigned_user_id: e.target.value }))} className="input w-full" disabled={loadingUsers}>
                                    <option value="">Org-wide</option>
                                    {orgUsers.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="label-sm flex items-center gap-2"><Key className="w-4 h-4 text-warning" /> API Key Strategy</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['platform','byok','hybrid'] as const).map(mode => (
                                    <button key={mode} onClick={() => setForm(f => ({ ...f, api_key_mode: mode }))}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-1 ${form.api_key_mode === mode ? 'border-accent bg-accent/10 text-accent' : 'border-border text-textSecondary hover:border-accent/40'}`}>
                                        {mode === 'platform' && <><Globe className="w-4 h-4" />Platform</>}
                                        {mode === 'byok' && <><Key className="w-4 h-4" />BYOK</>}
                                        {mode === 'hybrid' && <><Shield className="w-4 h-4" />Hybrid</>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {form.api_key_mode !== 'platform' && (
                            <div className="space-y-3 p-4 rounded-xl bg-surface border border-border">
                                <p className="text-xs font-semibold text-warning flex items-center gap-2"><Key className="w-3.5 h-3.5" /> Client API Keys</p>
                                <input type="password" value={form.byok_openai} onChange={e => setForm(f => ({ ...f, byok_openai: e.target.value }))} placeholder="OpenAI Key (sk-...)" className="input w-full font-mono text-sm" />
                                <input type="password" value={form.byok_anthropic} onChange={e => setForm(f => ({ ...f, byok_anthropic: e.target.value }))} placeholder="Anthropic Key (sk-ant-...)" className="input w-full font-mono text-sm" />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="label-sm">Notes</label>
                            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="optional" className="input w-full" />
                        </div>

                        {error && <ErrorBar message={error} />}

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                            <button onClick={deploy} className="btn btn-primary" disabled={deploying || !form.org_id}>
                                {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                Deploy
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMIZE / OVERRIDE MODAL
// ═══════════════════════════════════════════════════════════════

function CustomizeModal({ bundle, instance, fetchWithAuth, onClose, onSaved }: {
    bundle: EngineBundle; instance: DeployedInstance
    fetchWithAuth: (u: string, o?: RequestInit) => Promise<Response>
    onClose: () => void; onSaved: () => void
}) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [snapshot, setSnapshot] = useState<any>(null)
    const [currentOverrides, setCurrentOverrides] = useState<any>({})
    const [draftOverrides, setDraftOverrides] = useState<any>({})
    const [reason, setReason] = useState('')
    const [activeAgentIdx, setActiveAgentIdx] = useState(0)
    const [overrideLogs, setOverrideLogs] = useState<any[]>([])

    useEffect(() => {
        const load = async () => {
            const res = await fetchWithAuth(`/api/superadmin/engine-bundles/${bundle.id}/instances/${instance.id}`)
            if (res.ok) {
                const data = await res.json()
                setSnapshot(data.snapshot || {})
                setCurrentOverrides(data.overrides || {})
                setDraftOverrides(data.overrides || {})
                setOverrideLogs(data.override_logs || [])
            }
            setLoading(false)
        }
        load()
    }, [bundle.id, instance.id, fetchWithAuth])

    const agents: AgentConfig[] = snapshot?.agents || []

    const getEffectiveAgent = (idx: number): AgentConfig => {
        const base = agents[idx] || defaultAgent()
        const agentOverrides = draftOverrides?.agents?.[base.role] || {}
        return deepMerge(base, agentOverrides)
    }

    const updateAgentOverride = (role: string, patch: Record<string, any>) => {
        setDraftOverrides((p: any) => ({
            ...p,
            agents: {
                ...(p.agents || {}),
                [role]: deepMerge((p.agents?.[role] || {}), patch),
            }
        }))
    }

    const save = async () => {
        setSaving(true); setError(null)
        try {
            const res = await fetchWithAuth(`/api/superadmin/engine-bundles/${bundle.id}/instances/${instance.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overrides: draftOverrides, reason: reason || null }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            onSaved()
        } catch (e: any) { setError(e.message) }
        finally { setSaving(false) }
    }

    if (loading) return (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
    )

    const eff = agents.length ? getEffectiveAgent(activeAgentIdx) : null

    return (
        <div className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200" role="dialog" aria-modal="true" aria-labelledby="customize-instance-title">
            <div className="bg-background border border-border rounded-[var(--radius-lg)] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl transition-all duration-200 ease-out">
                <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-surfaceElevated"><Sliders className="w-5 h-5 text-warning" aria-hidden /></div>
                        <div>
                            <h2 id="customize-instance-title" className="text-xl font-bold text-textPrimary">Customize Instance</h2>
                            <p className="text-sm text-textSecondary">{instance.org_name || instance.org_id}{instance.assigned_user_email ? ` · ${instance.assigned_user_email}` : ''}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-icon"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="p-3 rounded-xl bg-surface border border-border text-sm text-textSecondary flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
                        Overrides are applied on top of the frozen snapshot. The master bundle is never touched.
                        Brain agents for this org are synced automatically on save.
                    </div>

                    {/* Agent selector */}
                    {agents.length > 0 && (
                        <div>
                            <p className="label-sm mb-3">Select Agent to Override</p>
                            <div className="flex gap-2 flex-wrap">
                                {agents.map((a, i) => (
                                    <button key={i} onClick={() => setActiveAgentIdx(i)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${activeAgentIdx === i ? 'border-accent bg-accent/10 text-accent' : 'border-border text-textSecondary hover:border-accent/40'}`}>
                                        <Bot className="w-4 h-4" />
                                        {a.name || a.role}
                                        {(draftOverrides?.agents?.[a.role] && Object.keys(draftOverrides.agents[a.role]).length > 0) && (
                                            <span className="w-2 h-2 rounded-full bg-warning flex-shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Effective agent config override */}
                    {eff && (
                        <div className="space-y-5 border border-border rounded-xl p-5">
                            <p className="text-sm font-semibold text-textPrimary flex items-center gap-2">
                                <Bot className="w-4 h-4 text-accent" />
                                {eff.name} — {eff.role}
                                {draftOverrides?.agents?.[eff.role] && Object.keys(draftOverrides.agents[eff.role]).length > 0 && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-surfaceElevated text-warning">modified</span>
                                )}
                            </p>

                            <div>
                                <p className="label-sm mb-3">Override LLM</p>
                                <LlmPicker
                                    llm={eff.llm}
                                    onChange={patch => updateAgentOverride(eff.role, { llm: patch })}
                                />
                            </div>

                            <div>
                                <p className="label-sm mb-2">Override System Prompt (foundation)</p>
                                <textarea
                                    value={eff.prompts.foundation || ''}
                                    onChange={e => updateAgentOverride(eff.role, { prompts: { foundation: e.target.value } })}
                                    rows={4}
                                    placeholder="Leave empty to keep bundle default"
                                    className="input w-full resize-none font-mono text-xs"
                                />
                            </div>

                            <div>
                                <p className="label-sm mb-2">Override Tools</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {ALL_TOOLS.map(tool => {
                                        const granted = eff.tools.includes(tool.value)
                                        return (
                                            <button key={tool.value}
                                                onClick={() => {
                                                    const newTools = granted ? eff.tools.filter(t => t !== tool.value) : [...eff.tools, tool.value]
                                                    updateAgentOverride(eff.role, { tools: newTools })
                                                }}
                                                className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all ${granted ? 'border-borderHover bg-surface text-textPrimary' : 'border-border text-textSecondary'}`}
                                            >
                                                <div className={`w-4 h-4 rounded flex items-center justify-center ${granted ? 'bg-success text-white' : 'bg-surfaceHover border border-border'}`}>
                                                    {granted && <CheckCircle className="w-3 h-3" />}
                                                </div>
                                                {tool.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reason */}
                    <div className="space-y-1.5">
                        <label className="label-sm">Reason for override</label>
                        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Client requested GPT-4o for email writing" className="input w-full" />
                    </div>

                    {/* Override log */}
                    {overrideLogs.length > 0 && (
                        <div>
                            <p className="label-sm mb-3">Override History</p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {overrideLogs.map((log: any) => (
                                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-surfaceHover border border-border text-xs">
                                        <code className="text-accent font-mono">{log.field_path}</code>
                                        <span className="text-textTertiary">→</span>
                                        <code className="text-textPrimary font-mono">{JSON.stringify(log.new_value)}</code>
                                        {log.reason && <span className="text-textSecondary ml-auto">"{log.reason}"</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && <ErrorBar message={error} />}
                </div>

                <div className="flex items-center justify-end gap-3 p-6 border-t border-border flex-shrink-0">
                    <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                    <button onClick={save} className="btn btn-primary" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Save Overrides
                    </button>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════

function deepMerge(base: Record<string, any>, patch: Record<string, any>): Record<string, any> {
    const result = { ...base }
    for (const key of Object.keys(patch)) {
        if (patch[key] !== null && typeof patch[key] === 'object' && !Array.isArray(patch[key]) && typeof base[key] === 'object' && !Array.isArray(base[key])) {
            result[key] = deepMerge(base[key] || {}, patch[key])
        } else {
            result[key] = patch[key]
        }
    }
    return result
}

function Pill({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
    return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surfaceHover border border-border text-xs text-textSecondary">
            <Icon className={`w-3.5 h-3.5 ${color}`} /> {label}
        </span>
    )
}

function ErrorBar({ message, inline }: { message: string; inline?: boolean }) {
    return (
        <div className={`flex items-center gap-2 p-3 rounded-lg bg-surfaceElevated border border-border text-error text-sm ${inline ? '' : 'w-full'}`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {message}
        </div>
    )
}

function EmptyState({ onNew }: { onNew: () => void }) {
    return (
        <div className="premium-card flex flex-col items-center justify-center py-24 px-6 text-center border-dashed">
            <Package className="w-16 h-16 text-textTertiary mb-4" aria-hidden />
            <h3 className="text-xl font-bold text-textPrimary mb-2">No engine bundles yet</h3>
            <p className="text-textSecondary mb-4 max-w-sm">A bundle is the product you deploy: Brain + Workflow + Agents + Config.</p>
            <ol className="text-sm text-textTertiary mb-6 space-y-1.5 max-w-xs text-left list-decimal list-inside">
                <li>Create a workflow in Workflow Manager</li>
                <li>Create a bundle and attach that workflow (required)</li>
                <li>Deploy the bundle to an org</li>
            </ol>
            <button onClick={onNew} className="btn btn-primary" aria-label="Create your first bundle">
                <Plus className="w-4 h-4" /> Create first bundle
            </button>
        </div>
    )
}

