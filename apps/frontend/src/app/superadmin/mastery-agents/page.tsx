'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Bot,
    Brain,
    Check,
    ChevronDown,
    ChevronUp,
    Copy,
    Play,
    Plus,
    Power,
    PowerOff,
    RefreshCw,
    Settings,
    Shield,
    Target,
    Trash2,
    Workflow,
    X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'
import {
    SuperadminBadge,
    SuperadminButton,
    SuperadminConfirmDialog,
    SuperadminEmptyState,
    SuperadminErrorState,
    SuperadminInputShell,
    SuperadminLoadingState,
    SuperadminMetricCard,
    SuperadminPageHero,
    SuperadminPanel,
    SuperadminSegmentedControl,
    SuperadminToolbar,
} from '@/components/SuperAdmin/surfaces'

const CATEGORIES = [
    { value: 'contact', label: 'Contact', tone: 'info' as const },
    { value: 'timing', label: 'Timing', tone: 'success' as const },
    { value: 'angle', label: 'Angle', tone: 'accent' as const },
    { value: 'pacing', label: 'Pacing', tone: 'warning' as const },
    { value: 'reply', label: 'Reply', tone: 'primary' as const },
    { value: 'buying_role', label: 'Buying Role', tone: 'info' as const },
    { value: 'buyer_stage', label: 'Buyer Stage', tone: 'warning' as const },
    { value: 'uncertainty', label: 'Uncertainty', tone: 'accent' as const },
    { value: 'sequence', label: 'Sequence', tone: 'success' as const },
    { value: 'custom', label: 'Custom', tone: 'primary' as const },
]

const PIPELINE_STAGES = ['pre_send', 'post_reply', 'pre_extension', 'periodic', 'on_demand']

const CATEGORY_GRADIENTS: Record<string, string> = {
    contact: 'linear-gradient(135deg, rgba(var(--color-info-rgb), 0.35) 0%, rgba(var(--color-accent-rgb), 0.18) 50%, rgba(var(--color-info-rgb), 0.08) 100%)',
    timing: 'linear-gradient(135deg, rgba(var(--color-warning-rgb), 0.35) 0%, rgba(var(--color-accent-rgb), 0.15) 50%, rgba(var(--color-warning-rgb), 0.08) 100%)',
    angle: 'linear-gradient(135deg, rgba(148, 100, 255, 0.35) 0%, rgba(var(--color-info-rgb), 0.18) 50%, rgba(148, 100, 255, 0.08) 100%)',
    pacing: 'linear-gradient(135deg, rgba(var(--color-warning-rgb), 0.3) 0%, rgba(var(--color-error-rgb), 0.18) 50%, rgba(var(--color-warning-rgb), 0.06) 100%)',
    reply: 'linear-gradient(135deg, rgba(var(--color-info-rgb), 0.3) 0%, rgba(var(--color-accent-rgb), 0.22) 50%, rgba(var(--color-info-rgb), 0.08) 100%)',
    buying_role: 'linear-gradient(135deg, rgba(var(--color-accent-rgb), 0.35) 0%, rgba(var(--color-info-rgb), 0.18) 50%, rgba(var(--color-accent-rgb), 0.06) 100%)',
    buyer_stage: 'linear-gradient(135deg, rgba(var(--color-warning-rgb), 0.3) 0%, rgba(var(--color-success-rgb), 0.18) 50%, rgba(var(--color-warning-rgb), 0.06) 100%)',
    uncertainty: 'linear-gradient(135deg, rgba(148, 100, 255, 0.3) 0%, rgba(var(--color-error-rgb), 0.18) 50%, rgba(148, 100, 255, 0.06) 100%)',
    sequence: 'linear-gradient(135deg, rgba(var(--color-success-rgb), 0.35) 0%, rgba(var(--color-info-rgb), 0.18) 50%, rgba(var(--color-success-rgb), 0.06) 100%)',
    custom: 'linear-gradient(135deg, rgba(var(--color-accent-rgb), 0.3) 0%, rgba(var(--color-info-rgb), 0.15) 50%, rgba(var(--color-accent-rgb), 0.06) 100%)',
}

const CATEGORY_EMOJI: Record<string, string> = {
    contact: '🎯', timing: '⏱️', angle: '💬', pacing: '📡',
    reply: '👁️', buying_role: '🔑', buyer_stage: '📈',
    uncertainty: '💡', sequence: '🔗', custom: '⚙️',
}

const CATEGORY_SUBTITLE: Record<string, string> = {
    contact: 'Contact & Suppress Logic',
    timing: 'Timing & Activation Windows',
    angle: 'Belief Angle Selection',
    pacing: 'Delivery & Send Pacing',
    reply: 'Response Interpretation',
    buying_role: 'Persona & Role Detection',
    buyer_stage: 'Journey Classification',
    uncertainty: 'Uncertainty Resolution',
    sequence: 'Sequence & Continuity',
    custom: 'Custom Agent Logic',
}

const MODAL_TABS = ['overview', 'rules', 'knowledge', 'pipeline', 'test'] as const
type ModalTab = typeof MODAL_TABS[number]
const TAB_LABELS: Record<ModalTab, { icon: string; label: string }> = {
    overview: { icon: '🧠', label: 'Overview' },
    rules: { icon: '⚙️', label: 'Rules' },
    knowledge: { icon: '📚', label: 'Knowledge' },
    pipeline: { icon: '🔗', label: 'Pipeline' },
    test: { icon: '▶️', label: 'Test' },
}

interface Agent {
    id: string
    agent_key: string
    display_name: string
    description: string | null
    agent_category: string
    scope: string
    partner_id: string | null
    version: string
    is_active: boolean
    is_system: boolean
    decision_type: string
    decision_outputs: string[]
    scoring_rules: any[]
    keyword_rules: any[]
    field_rules: any[]
    kb_object_types: string[]
    kb_min_confidence: number
    kb_max_objects: number
    kb_write_enabled: boolean
    kb_write_type: string | null
    locked_constraints: Record<string, any>
    pipeline_stage: string | null
    pipeline_order: number
    fallback_output: string | null
    confidence_divisor: number
    created_at: string
}

const EMPTY_FORM = {
    agent_key: '',
    display_name: '',
    description: '',
    agent_category: 'custom',
    scope: 'global',
    decision_type: '',
    decision_outputs: '',
    scoring_rules: '[]',
    keyword_rules: '[]',
    field_rules: '[]',
    kb_object_types: '',
    kb_min_confidence: 0.2,
    kb_max_objects: 10,
    kb_write_enabled: false,
    kb_write_type: '',
    locked_constraints: '{}',
    pipeline_stage: '',
    pipeline_order: 0,
    fallback_output: '',
    confidence_divisor: 100,
    is_active: true,
}

function getCategoryMeta(category: string) {
    return CATEGORIES.find((item) => item.value === category) ?? { value: category, label: category, tone: 'primary' as const }
}

export default function MasteryAgentsPage() {
    const { fetchWithAuth } = useSuperadminAuth()
    const [agents, setAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
    const [saving, setSaving] = useState(false)
    const [filterCat, setFilterCat] = useState('all')
    const [testingId, setTestingId] = useState<string | null>(null)
    const [testInput, setTestInput] = useState('{}')
    const [testResult, setTestResult] = useState<any>(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [pendingDeleteAgent, setPendingDeleteAgent] = useState<Agent | null>(null)
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
    const [activeTab, setActiveTab] = useState<ModalTab>('overview')

    const load = useCallback(async (refreshing = false) => {
        if (refreshing) setIsRefreshing(true)
        else setLoading(true)

        try {
            setError(null)
            const response = await fetchWithAuth('/api/superadmin/mastery-agents')
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to load mastery agents')
            setAgents(data.agents ?? [])
        } catch (loadError: any) {
            console.error(loadError)
            setError(loadError?.message || 'Failed to load mastery agents')
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }, [fetchWithAuth])

    useEffect(() => {
        load()
    }, [load])

    const resetForm = () => {
        setForm(EMPTY_FORM)
        setEditingAgent(null)
    }

    const openCreate = () => {
        resetForm()
        setShowForm(true)
    }

    const startEdit = (agent: Agent) => {
        setForm({
            agent_key: agent.agent_key,
            display_name: agent.display_name,
            description: agent.description ?? '',
            agent_category: agent.agent_category,
            scope: agent.scope,
            decision_type: agent.decision_type,
            decision_outputs: agent.decision_outputs.join(', '),
            scoring_rules: JSON.stringify(agent.scoring_rules, null, 2),
            keyword_rules: JSON.stringify(agent.keyword_rules, null, 2),
            field_rules: JSON.stringify(agent.field_rules, null, 2),
            kb_object_types: agent.kb_object_types.join(', '),
            kb_min_confidence: agent.kb_min_confidence,
            kb_max_objects: agent.kb_max_objects,
            kb_write_enabled: agent.kb_write_enabled,
            kb_write_type: agent.kb_write_type ?? '',
            locked_constraints: JSON.stringify(agent.locked_constraints, null, 2),
            pipeline_stage: agent.pipeline_stage ?? '',
            pipeline_order: agent.pipeline_order,
            fallback_output: agent.fallback_output ?? '',
            confidence_divisor: agent.confidence_divisor,
            is_active: agent.is_active,
        })
        setEditingAgent(agent)
        setShowForm(true)
    }

    const handleSubmit = async () => {
        setSaving(true)
        try {
            let scoringRules
            let keywordRules
            let fieldRules
            let lockedConstraints

            try { scoringRules = JSON.parse(form.scoring_rules) } catch { throw new Error('Invalid scoring rules JSON') }
            try { keywordRules = JSON.parse(form.keyword_rules) } catch { throw new Error('Invalid keyword rules JSON') }
            try { fieldRules = JSON.parse(form.field_rules) } catch { throw new Error('Invalid field rules JSON') }
            try { lockedConstraints = JSON.parse(form.locked_constraints) } catch { throw new Error('Invalid locked constraints JSON') }

            const payload: any = {
                display_name: form.display_name,
                description: form.description || null,
                agent_category: form.agent_category,
                is_active: form.is_active,
                decision_type: form.decision_type,
                decision_outputs: form.decision_outputs.split(',').map((value) => value.trim()).filter(Boolean),
                scoring_rules: scoringRules,
                keyword_rules: keywordRules,
                field_rules: fieldRules,
                kb_object_types: form.kb_object_types.split(',').map((value) => value.trim()).filter(Boolean),
                kb_min_confidence: form.kb_min_confidence,
                kb_max_objects: form.kb_max_objects,
                kb_write_enabled: form.kb_write_enabled,
                kb_write_type: form.kb_write_type || null,
                locked_constraints: lockedConstraints,
                pipeline_stage: form.pipeline_stage || null,
                pipeline_order: form.pipeline_order,
                fallback_output: form.fallback_output || null,
                confidence_divisor: form.confidence_divisor,
            }

            if (!editingAgent) {
                payload.agent_key = form.agent_key
                payload.scope = form.scope
            }

            const url = editingAgent
                ? `/api/superadmin/mastery-agents/${editingAgent.id}`
                : '/api/superadmin/mastery-agents'

            const response = await fetchWithAuth(url, {
                method: editingAgent ? 'PATCH' : 'POST',
                body: JSON.stringify(payload),
            })
            const data = await response.json()

            if (!response.ok) throw new Error(data.error || 'Failed to save agent')

            toast.success(editingAgent ? 'Agent updated' : 'Agent created')
            setShowForm(false)
            resetForm()
            load(true)
        } catch (submitError: any) {
            toast.error(submitError?.message || 'Failed to save agent')
        } finally {
            setSaving(false)
        }
    }

    const handleToggle = async (agent: Agent) => {
        try {
            const response = await fetchWithAuth(`/api/superadmin/mastery-agents/${agent.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_active: !agent.is_active }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to update agent')
            toast.success(agent.is_active ? 'Agent deactivated' : 'Agent activated')
            load(true)
        } catch (toggleError: any) {
            toast.error(toggleError?.message || 'Failed to update agent')
        }
    }

    const handleDelete = async (agent: Agent) => {
        try {
            const response = await fetchWithAuth(`/api/superadmin/mastery-agents/${agent.id}`, {
                method: 'DELETE',
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to delete agent')
            toast.success('Agent deleted')
            load(true)
        } catch (deleteError: any) {
            toast.error(deleteError?.message || 'Failed to delete agent')
        }
    }

    const handleDuplicate = (agent: Agent) => {
        setForm({
            agent_key: `${agent.agent_key}_copy`,
            display_name: `${agent.display_name} (Copy)`,
            description: agent.description ?? '',
            agent_category: agent.agent_category,
            scope: 'organization',
            decision_type: agent.decision_type,
            decision_outputs: agent.decision_outputs.join(', '),
            scoring_rules: JSON.stringify(agent.scoring_rules, null, 2),
            keyword_rules: JSON.stringify(agent.keyword_rules, null, 2),
            field_rules: JSON.stringify(agent.field_rules, null, 2),
            kb_object_types: agent.kb_object_types.join(', '),
            kb_min_confidence: agent.kb_min_confidence,
            kb_max_objects: agent.kb_max_objects,
            kb_write_enabled: agent.kb_write_enabled,
            kb_write_type: agent.kb_write_type ?? '',
            locked_constraints: JSON.stringify(agent.locked_constraints, null, 2),
            pipeline_stage: agent.pipeline_stage ?? '',
            pipeline_order: agent.pipeline_order,
            fallback_output: agent.fallback_output ?? '',
            confidence_divisor: agent.confidence_divisor,
            is_active: true,
        })
        setEditingAgent(null)
        setShowForm(true)
    }

    const handleTest = async (agentKey: string) => {
        try {
            const parsedInput = JSON.parse(testInput)
            const response = await fetchWithAuth('/api/agents/execute', {
                method: 'POST',
                body: JSON.stringify({
                    agent_type: agentKey,
                    input: parsedInput,
                }),
            })
            const data = await response.json()
            setTestResult(data)

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Test failed')
            }

            toast.success(`Decision: ${data.result?.decision || 'completed'}`)
        } catch (testError: any) {
            toast.error(testError?.message || 'Unable to test agent')
        }
    }

    const filteredAgents = filterCat === 'all'
        ? agents
        : agents.filter((agent) => agent.agent_category === filterCat)

    const summary = useMemo(() => ({
        active: agents.filter((agent) => agent.is_active).length,
        system: agents.filter((agent) => agent.is_system).length,
        pipelineBound: agents.filter((agent) => agent.pipeline_stage).length,
    }), [agents])

    if (loading) {
        return <SuperadminLoadingState label="Loading Agents" />
    }

    if (error && agents.length === 0) {
        return (
            <SuperadminErrorState
                title="Mastery agents failed to load"
                description={error}
                action={<SuperadminButton icon={RefreshCw} onClick={() => load()}>Retry agent sync</SuperadminButton>}
            />
        )
    }

    return (
        <>
            <div className="space-y-lg">
                {/* Compact Hero */}
                <SuperadminPageHero
                    eyebrow="Decision Layer"
                    title="Mastery Agent Manager"
                    description="Shape the platform's decision-making fabric with bespoke agent definitions, pipeline hooks, test execution, and governance-aware editing."
                    actions={(
                        <>
                            <SuperadminButton icon={RefreshCw} onClick={() => load(true)}>
                                {isRefreshing ? 'Refreshing' : 'Refresh'}
                            </SuperadminButton>
                            <SuperadminButton tone="primary" icon={Plus} onClick={openCreate}>
                                New Agent
                            </SuperadminButton>
                        </>
                    )}
                >
                    <div className="flex flex-wrap gap-sm">
                        <SuperadminBadge tone="primary"><Brain className="h-3.5 w-3.5" /> {agents.length} agents</SuperadminBadge>
                        <SuperadminBadge tone="success"><Check className="h-3.5 w-3.5" /> {summary.active} active</SuperadminBadge>
                        <SuperadminBadge tone="warning"><Workflow className="h-3.5 w-3.5" /> {summary.pipelineBound} pipeline-bound</SuperadminBadge>
                    </div>
                </SuperadminPageHero>

                {/* Category Filter */}
                <div className="flex items-center gap-md">
                    <SuperadminSegmentedControl
                        value={filterCat}
                        onChange={setFilterCat}
                        options={[
                            { value: 'all', label: `All ${agents.length}` },
                            ...CATEGORIES.filter((c) => agents.some((a) => a.agent_category === c.value))
                                .map((c) => ({
                                    value: c.value,
                                    label: `${c.label} ${agents.filter((a) => a.agent_category === c.value).length}`,
                                })),
                        ]}
                    />
                </div>

                {/* Agent Grid */}
                {filteredAgents.length === 0 ? (
                    <SuperadminEmptyState
                        icon={Bot}
                        title="No agents in this slice"
                        description="Adjust the category lens or create a new agent definition."
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredAgents.map((agent) => {
                            const category = getCategoryMeta(agent.agent_category)
                            const emoji = CATEGORY_EMOJI[agent.agent_category] || '⚙️'
                            const subtitle = CATEGORY_SUBTITLE[agent.agent_category] || agent.description || category.label
                            return (
                                <button
                                    key={agent.id}
                                    type="button"
                                    onClick={() => { setSelectedAgent(agent); setActiveTab('overview'); setTestResult(null) }}
                                    className="group relative overflow-hidden rounded-[var(--radius-xl)] bg-surface border border-border text-left transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[var(--shadow-card-hover)] focus:outline-none cursor-pointer"
                                >
                                    {/* Image area — gradient placeholder */}
                                    <div
                                        className="relative h-44 w-full overflow-hidden"
                                        style={{ background: CATEGORY_GRADIENTS[agent.agent_category] || CATEGORY_GRADIENTS.custom }}
                                    >
                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-5xl opacity-50 drop-shadow-lg transition-transform duration-300 group-hover:scale-110">{emoji}</span>
                                        </div>
                                        <div className="absolute right-2.5 top-2.5">
                                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: 'var(--color-surface-elevated)', backdropFilter: 'blur(8px)' }}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${agent.is_active ? 'bg-success' : 'bg-warning'}`} style={agent.is_active ? { boxShadow: '0 0 6px var(--color-success)' } : {}} />
                                                <span className="text-white">{agent.is_active ? 'Ready' : 'Paused'}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card body */}
                                    <div style={{ padding: '6px 18px 18px' }} className="flex flex-col gap-2.5">
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>{emoji} {agent.display_name}</div>
                                            <div style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)', marginTop: 3, lineHeight: 1.4 }}>{subtitle}</div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'var(--color-glow)', color: 'var(--color-accent)', border: '1px solid rgba(var(--color-accent-rgb), 0.2)' }}>
                                                {agent.scoring_rules.length} rules
                                            </span>
                                            <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'var(--color-surface-elevated)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}>
                                                {agent.decision_outputs.length} outputs
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}


                {/* Agent Detail Modal */}
                {selectedAgent && (
                    <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm" onClick={() => setSelectedAgent(null)}>
                        <div className="flex min-h-full items-center justify-center p-lg">
                            <div
                                className="w-full max-w-2xl rounded-[var(--radius-xl)] border border-border/30 bg-surface/90 shadow-[var(--shadow-xl)] backdrop-blur-xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header — gradient hero */}
                                <div className="relative overflow-hidden rounded-t-[calc(var(--radius-xl)*1.5)]" style={{ background: CATEGORY_GRADIENTS[selectedAgent.agent_category] || CATEGORY_GRADIENTS.custom }}>
                                    <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 25% 35%, var(--color-accent) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface/60 to-transparent" />
                                    <div className="relative flex items-center justify-between px-lg py-lg">
                                        <div className="flex items-center gap-md">
                                            <span className="text-4xl drop-shadow-sm">{CATEGORY_EMOJI[selectedAgent.agent_category] || '⚙️'}</span>
                                            <div>
                                                <h2 className="text-lg font-extrabold text-textPrimary uppercase tracking-wider">{selectedAgent.display_name}</h2>
                                                <p className="text-xs text-textSecondary font-medium mt-0.5">{selectedAgent.description || getCategoryMeta(selectedAgent.agent_category).label}</p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setSelectedAgent(null)} className="rounded-full p-1.5 text-textTertiary hover:bg-surface/50 hover:text-textPrimary transition-colors backdrop-blur-sm">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex items-center gap-xs border-b border-border/30 px-lg">
                                    {MODAL_TABS.map((tab) => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setActiveTab(tab)}
                                            className={`flex items-center gap-xs px-sm py-sm text-xs font-semibold transition-colors border-b-2 ${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-textTertiary hover:text-textSecondary'}`}
                                        >
                                            <span>{TAB_LABELS[tab].icon}</span>
                                            <span>{TAB_LABELS[tab].label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Content */}
                                <div className="max-h-[60vh] overflow-y-auto px-lg py-md space-y-md">
                                    {activeTab === 'overview' && (
                                        <>
                                            {selectedAgent.description && (
                                                <ModalSection icon="💬" title="Description">
                                                    <p className="text-sm leading-relaxed text-textSecondary">{selectedAgent.description}</p>
                                                </ModalSection>
                                            )}
                                            <ModalSection icon="🎯" title="Decision">
                                                <div className="grid grid-cols-2 gap-sm">
                                                    <MiniStat label="Type" value={selectedAgent.decision_type || 'Unspecified'} />
                                                    <MiniStat label="Confidence Divisor" value={String(selectedAgent.confidence_divisor)} />
                                                </div>
                                                <div className="mt-sm flex flex-wrap gap-xs">
                                                    {selectedAgent.decision_outputs.map((o) => (
                                                        <SuperadminBadge key={o} tone="primary">{o}</SuperadminBadge>
                                                    ))}
                                                </div>
                                            </ModalSection>
                                            <ModalSection icon="📊" title="Status">
                                                <div className="grid grid-cols-3 gap-sm">
                                                    <MiniStat label="Version" value={`v${selectedAgent.version}`} />
                                                    <MiniStat label="Scope" value={selectedAgent.scope} />
                                                    <MiniStat label="Category" value={getCategoryMeta(selectedAgent.agent_category).label} />
                                                </div>
                                            </ModalSection>
                                        </>
                                    )}

                                    {activeTab === 'rules' && (
                                        <>
                                            <ModalSection icon="📏" title="Scoring Rules">
                                                <pre className="overflow-auto rounded-[var(--radius-lg)] bg-background/50 px-sm py-sm font-mono text-xs text-textSecondary max-h-48">{JSON.stringify(selectedAgent.scoring_rules, null, 2)}</pre>
                                            </ModalSection>
                                            <ModalSection icon="🔑" title="Keyword Rules">
                                                <pre className="overflow-auto rounded-[var(--radius-lg)] bg-background/50 px-sm py-sm font-mono text-xs text-textSecondary max-h-48">{JSON.stringify(selectedAgent.keyword_rules, null, 2)}</pre>
                                            </ModalSection>
                                            <ModalSection icon="📋" title="Field Rules">
                                                <pre className="overflow-auto rounded-[var(--radius-lg)] bg-background/50 px-sm py-sm font-mono text-xs text-textSecondary max-h-48">{JSON.stringify(selectedAgent.field_rules, null, 2)}</pre>
                                            </ModalSection>
                                        </>
                                    )}

                                    {activeTab === 'knowledge' && (
                                        <>
                                            <ModalSection icon="📚" title="Knowledge Base Config">
                                                <div className="grid grid-cols-2 gap-sm">
                                                    <MiniStat label="Object Types" value={selectedAgent.kb_object_types.join(', ') || 'None'} />
                                                    <MiniStat label="Min Confidence" value={String(selectedAgent.kb_min_confidence)} />
                                                    <MiniStat label="Max Objects" value={String(selectedAgent.kb_max_objects)} />
                                                    <MiniStat label="Write Enabled" value={selectedAgent.kb_write_enabled ? 'Yes' : 'No'} />
                                                </div>
                                            </ModalSection>
                                            <ModalSection icon="🔒" title="Locked Constraints">
                                                <pre className="overflow-auto rounded-[var(--radius-lg)] bg-background/50 px-sm py-sm font-mono text-xs text-textSecondary max-h-48">{JSON.stringify(selectedAgent.locked_constraints, null, 2)}</pre>
                                            </ModalSection>
                                        </>
                                    )}

                                    {activeTab === 'pipeline' && (
                                        <ModalSection icon="🔗" title="Pipeline Configuration">
                                            <div className="grid grid-cols-2 gap-sm">
                                                <MiniStat label="Stage" value={selectedAgent.pipeline_stage || 'Not assigned'} />
                                                <MiniStat label="Order" value={String(selectedAgent.pipeline_order)} />
                                                <MiniStat label="Fallback Output" value={selectedAgent.fallback_output || 'None'} />
                                                <MiniStat label="System Agent" value={selectedAgent.is_system ? 'Yes' : 'No'} />
                                            </div>
                                        </ModalSection>
                                    )}

                                    {activeTab === 'test' && (
                                        <ModalSection icon="▶️" title="Test Console">
                                            <textarea
                                                value={testInput}
                                                onChange={(e) => setTestInput(e.target.value)}
                                                rows={5}
                                                className="w-full resize-none rounded-[var(--radius-lg)] border border-border/30 bg-background/50 px-sm py-sm font-mono text-xs text-textPrimary focus:outline-none focus:ring-2 focus:ring-borderFocus"
                                                placeholder='{"contact": {...}}'
                                            />
                                            <SuperadminButton tone="primary" icon={Play} onClick={() => handleTest(selectedAgent.agent_key)} className="mt-sm">
                                                Run Test
                                            </SuperadminButton>
                                            {testResult && (
                                                <pre className="mt-sm overflow-auto rounded-[var(--radius-lg)] bg-background/50 px-sm py-sm font-mono text-xs text-textSecondary max-h-48">{JSON.stringify(testResult, null, 2)}</pre>
                                            )}
                                        </ModalSection>
                                    )}
                                </div>

                                {/* Modal Actions */}
                                <div className="flex items-center justify-between border-t border-border/30 px-lg py-md">
                                    <div className="flex flex-wrap gap-xs">
                                        <SuperadminButton icon={Settings} onClick={() => { setSelectedAgent(null); startEdit(selectedAgent) }}>Edit</SuperadminButton>
                                        <SuperadminButton icon={Copy} onClick={() => { setSelectedAgent(null); handleDuplicate(selectedAgent) }}>Duplicate</SuperadminButton>
                                        <SuperadminButton onClick={() => handleToggle(selectedAgent)}>
                                            {selectedAgent.is_active ? <><PowerOff className="h-4 w-4" />Deactivate</> : <><Power className="h-4 w-4" />Activate</>}
                                        </SuperadminButton>
                                    </div>
                                    {!selectedAgent.is_system && (
                                        <SuperadminButton icon={Trash2} onClick={() => { setSelectedAgent(null); setPendingDeleteAgent(selectedAgent) }}>Delete</SuperadminButton>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <SuperadminErrorState
                        title="Partial mastery sync issue"
                        description={error}
                        action={<SuperadminButton icon={RefreshCw} onClick={() => load(true)}>Retry refresh</SuperadminButton>}
                    />
                )}
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm" onClick={() => { setShowForm(false); resetForm() }}>
                    <div className="absolute inset-y-0 right-0 w-full max-w-4xl border-l border-border bg-surface/95 shadow-[var(--shadow-xl)] backdrop-blur-xl animate-slide-in-right">
                        <div className="flex h-full flex-col" onClick={(event) => event.stopPropagation()}>
                            <div className="flex items-center justify-between border-b border-border px-lg py-md">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">Agent Composer</p>
                                    <h2 className="mt-xs text-xl font-semibold text-textPrimary">
                                        {editingAgent ? `Edit ${editingAgent.display_name}` : 'Create New Agent'}
                                    </h2>
                                </div>
                                <SuperadminButton tone="ghost" icon={X} onClick={() => { setShowForm(false); resetForm() }}>
                                    Close
                                </SuperadminButton>
                            </div>

                            <div className="flex-1 space-y-md overflow-y-auto px-lg py-md">
                                <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                                    <ComposerField label="Agent Key">
                                        <input
                                            disabled={!!editingAgent}
                                            value={form.agent_key}
                                            onChange={(event) => setForm({ ...form, agent_key: event.target.value })}
                                            placeholder="my_custom_agent"
                                            className="w-full bg-transparent py-sm font-mono text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none disabled:opacity-50"
                                        />
                                    </ComposerField>
                                    <ComposerField label="Display Name">
                                        <input
                                            value={form.display_name}
                                            onChange={(event) => setForm({ ...form, display_name: event.target.value })}
                                            className="w-full bg-transparent py-sm text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none"
                                        />
                                    </ComposerField>
                                    <ComposerField label="Category">
                                        <select value={form.agent_category} onChange={(event) => setForm({ ...form, agent_category: event.target.value })} className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none">
                                            {CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                                        </select>
                                    </ComposerField>
                                    <ComposerField label="Pipeline Stage">
                                        <select value={form.pipeline_stage} onChange={(event) => setForm({ ...form, pipeline_stage: event.target.value })} className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none">
                                            <option value="">None</option>
                                            {PIPELINE_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                                        </select>
                                    </ComposerField>
                                </div>

                                <ComposerTextarea label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} rows={3} />

                                <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                                    <ComposerField label="Decision Type">
                                        <input value={form.decision_type} onChange={(event) => setForm({ ...form, decision_type: event.target.value })} className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none" />
                                    </ComposerField>
                                    <ComposerField label="Decision Outputs">
                                        <input value={form.decision_outputs} onChange={(event) => setForm({ ...form, decision_outputs: event.target.value })} placeholder="CONTACT_NOW, DELAY, SUPPRESS" className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none" />
                                    </ComposerField>
                                </div>

                                <div className="grid grid-cols-1 gap-md md:grid-cols-3">
                                    <ComposerField label="KB Object Types">
                                        <input value={form.kb_object_types} onChange={(event) => setForm({ ...form, kb_object_types: event.target.value })} placeholder="contact_pattern, timing_pattern" className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none" />
                                    </ComposerField>
                                    <ComposerField label="Min Confidence">
                                        <input type="number" step="0.1" value={form.kb_min_confidence} onChange={(event) => setForm({ ...form, kb_min_confidence: parseFloat(event.target.value || '0') })} className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none" />
                                    </ComposerField>
                                    <ComposerField label="Confidence Divisor">
                                        <input type="number" value={form.confidence_divisor} onChange={(event) => setForm({ ...form, confidence_divisor: parseInt(event.target.value || '0', 10) })} className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none" />
                                    </ComposerField>
                                </div>

                                <ComposerTextarea label="Scoring Rules JSON" value={form.scoring_rules} onChange={(value) => setForm({ ...form, scoring_rules: value })} rows={6} />
                                <ComposerTextarea label="Keyword Rules JSON" value={form.keyword_rules} onChange={(value) => setForm({ ...form, keyword_rules: value })} rows={4} />
                                <ComposerTextarea label="Field Rules JSON" value={form.field_rules} onChange={(value) => setForm({ ...form, field_rules: value })} rows={4} />
                                <ComposerTextarea label="Locked Constraints JSON" value={form.locked_constraints} onChange={(value) => setForm({ ...form, locked_constraints: value })} rows={4} />

                                <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
                                    <ToggleComposerRow title="Agent Active" checked={form.is_active} onChange={(value) => setForm({ ...form, is_active: value })} />
                                    <ToggleComposerRow title="KB Write Enabled" checked={form.kb_write_enabled} onChange={(value) => setForm({ ...form, kb_write_enabled: value })} />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-sm border-t border-border px-lg py-md">
                                <SuperadminButton tone="ghost" onClick={() => { setShowForm(false); resetForm() }}>
                                    Cancel
                                </SuperadminButton>
                                <SuperadminButton tone="primary" icon={saving ? RefreshCw : Check} onClick={handleSubmit} disabled={saving}>
                                    {saving ? 'Saving' : editingAgent ? 'Update Agent' : 'Create Agent'}
                                </SuperadminButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <SuperadminConfirmDialog
                open={Boolean(pendingDeleteAgent)}
                title="Delete mastery agent"
                description={`This will permanently remove ${pendingDeleteAgent?.display_name || 'this agent'} and its decision configuration.`}
                confirmLabel="Delete agent"
                onCancel={() => setPendingDeleteAgent(null)}
                onConfirm={() => {
                    if (pendingDeleteAgent) void handleDelete(pendingDeleteAgent)
                    setPendingDeleteAgent(null)
                }}
            />
        </>
    )
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[calc(var(--radius-lg)*1.1)] bg-surface/30 p-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-textTertiary">{label}</p>
            <p className="mt-xs text-sm font-semibold text-textPrimary">{value}</p>
        </div>
    )
}

function ComposerField({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <div className="rounded-[calc(var(--radius-lg)*1.2)] border border-border/70 bg-background/70 px-md">
            <p className="pt-sm text-xs font-semibold uppercase tracking-[0.18em] text-textTertiary">{label}</p>
            {children}
        </div>
    )
}

function ComposerTextarea({
    label,
    value,
    onChange,
    rows,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    rows: number
}) {
    return (
        <div className="rounded-[calc(var(--radius-lg)*1.2)] border border-border/70 bg-background/70 p-md">
            <p className="mb-sm text-xs font-semibold uppercase tracking-[0.18em] text-textTertiary">{label}</p>
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                rows={rows}
                className="w-full resize-none rounded-[var(--radius-lg)] border border-border bg-surface px-sm py-sm font-mono text-xs text-textPrimary focus:outline-none focus:ring-2 focus:ring-borderFocus"
            />
        </div>
    )
}

function ToggleComposerRow({
    title,
    checked,
    onChange,
}: {
    title: string
    checked: boolean
    onChange: (value: boolean) => void
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between rounded-[calc(var(--radius-lg)*1.2)] border border-border/70 bg-background/70 px-md py-md text-left"
        >
            <span className="text-sm font-medium text-textPrimary">{title}</span>
            <div className={`inline-flex h-6 w-11 rounded-full border p-1 transition-all ${checked ? 'border-primary bg-surfaceElevated' : 'border-border bg-surface'}`}>
                <div className={`h-4 w-4 rounded-full transition-all ${checked ? 'translate-x-5 bg-primary' : 'translate-x-0 bg-textTertiary'}`} />
            </div>
        </button>
    )
}
 

function ModalSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-sm">
            <p className="flex items-center gap-xs text-xs font-bold uppercase tracking-[0.2em] text-accent">
                <span>{icon}</span> {title}
            </p>
            <div>{children}</div>
        </div>
    )
}
