'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Bot,
    Brain,
    Check,
    ChevronDown,
    ChevronUp,
    Copy,
    Database,
    Edit3,
    Eye,
    FileText,
    Layers,
    Link2,
    Mail,
    Palette,
    PenTool,
    Play,
    Plus,
    Power,
    PowerOff,
    RefreshCw,
    Search,
    Settings,
    Sparkles,
    Target,
    Trash2,
    Wand2,
    X,
    Zap,
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

// ============================================================
// TYPES
// ============================================================

interface AgentTemplate {
    id: string
    slug: string
    name: string
    description: string | null
    avatar_emoji: string
    avatar_color: string
    category: 'writer' | 'research' | 'learning' | 'builder' | 'general'
    product_target: 'market_writer' | 'market_builder' | 'market_coach' | 'all'
    system_prompt: string
    persona_prompt: string | null
    instruction_prompt: string | null
    guardrails_prompt: string | null
    preferred_provider: string | null
    preferred_model: string | null
    temperature: number
    max_tokens: number
    tools_enabled: string[]
    skills: any[]
    has_own_kb: boolean
    kb_object_types: string[]
    kb_min_confidence: number
    max_turns: number
    requires_approval: boolean
    can_access_brain: boolean
    can_write_to_brain: boolean
    is_active: boolean
    is_system: boolean
    tier: 'basic' | 'pro' | 'enterprise'
    version: string
    created_at: string
    updated_at: string
}

interface BrainTool {
    name: string
    category: string
    description: string
    parameters: Record<string, unknown>
    handler_function: string
    min_tier: string
    requires_confirm: boolean
    is_enabled: boolean
}

// ============================================================
// CONSTANTS
// ============================================================

const CATEGORIES = [
    { value: 'writer', label: 'Writer', icon: PenTool, tone: 'primary' as const, description: 'Content creation agents' },
    { value: 'research', label: 'Research', icon: Search, tone: 'info' as const, description: 'Data gathering agents' },
    { value: 'learning', label: 'Learning', icon: Sparkles, tone: 'warning' as const, description: 'Performance optimization' },
    { value: 'builder', label: 'Builder', icon: Layers, tone: 'success' as const, description: 'Asset creation agents' },
    { value: 'general', label: 'General', icon: Bot, tone: 'accent' as const, description: 'Multi-purpose agents' },
]

const PRODUCTS = [
    { value: 'market_writer', label: 'Market Writer', icon: Mail },
    { value: 'market_builder', label: 'Market Builder', icon: Palette },
    { value: 'market_coach', label: 'Market Coach', icon: Target },
    { value: 'all', label: 'All Products', icon: Zap },
]

const TIERS = [
    { value: 'basic', label: 'Basic', tone: 'primary' as const },
    { value: 'pro', label: 'Pro', tone: 'warning' as const },
    { value: 'enterprise', label: 'Enterprise', tone: 'accent' as const },
]

const AVATAR_COLORS = [
    { value: 'primary', label: 'Primary', class: 'bg-surfaceElevated text-primary border-border' },
    { value: 'success', label: 'Success', class: 'bg-surfaceElevated text-success border-border' },
    { value: 'warning', label: 'Warning', class: 'bg-surfaceElevated text-warning border-border' },
    { value: 'accent', label: 'Accent', class: 'bg-accent/20 text-accent border-accent/30' },
    { value: 'info', label: 'Info', class: 'bg-surfaceElevated text-info border-border' },
]

const EMPTY_FORM = {
    slug: '',
    name: '',
    description: '',
    avatar_emoji: '🤖',
    avatar_color: 'primary',
    category: 'general' as const,
    product_target: 'market_writer' as const,
    system_prompt: '',
    persona_prompt: '',
    instruction_prompt: '',
    guardrails_prompt: '',
    preferred_provider: '',
    preferred_model: '',
    temperature: 0.7,
    max_tokens: 4096,
    tools_enabled: '',
    skills: '[]',
    has_own_kb: false,
    kb_object_types: '',
    kb_min_confidence: 0.6,
    max_turns: 10,
    requires_approval: false,
    can_access_brain: true,
    can_write_to_brain: false,
    is_active: true,
    tier: 'basic' as const,
}

// ============================================================
// HELPERS
// ============================================================

function getCategoryMeta(category: string) {
    return CATEGORIES.find(c => c.value === category) ?? CATEGORIES[4]
}

function getProductMeta(product: string) {
    return PRODUCTS.find(p => p.value === product) ?? PRODUCTS[3]
}

function getTierMeta(tier: string) {
    return TIERS.find(t => t.value === tier) ?? TIERS[0]
}

function getAvatarColorClass(color: string) {
    return AVATAR_COLORS.find(c => c.value === color)?.class ?? AVATAR_COLORS[0].class
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AgentTemplatesPage() {
    const { fetchWithAuth } = useSuperadminAuth()
    const [agents, setAgents] = useState<AgentTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [editingAgent, setEditingAgent] = useState<AgentTemplate | null>(null)
    const [saving, setSaving] = useState(false)
    const [filterCategory, setFilterCategory] = useState('all')
    const [filterProduct, setFilterProduct] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [form, setForm] = useState(EMPTY_FORM)
    const [pendingDeleteAgent, setPendingDeleteAgent] = useState<AgentTemplate | null>(null)
    const [viewingAgent, setViewingAgent] = useState<AgentTemplate | null>(null)
    const [brainTools, setBrainTools] = useState<BrainTool[]>([])
    const [toolsLoading, setToolsLoading] = useState(false)
    const [toolTogglingName, setToolTogglingName] = useState<string | null>(null)

    // --------------------------------------------------------
    // DATA LOADING
    // --------------------------------------------------------

    const load = useCallback(async (refreshing = false) => {
        if (refreshing) setIsRefreshing(true)
        else setLoading(true)

        try {
            setError(null)
            const response = await fetchWithAuth('/api/superadmin/agent-templates')
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to load agent templates')
            setAgents(data.agents ?? [])
        } catch (loadError: any) {
            console.error(loadError)
            setError(loadError?.message || 'Failed to load agent templates')
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }, [fetchWithAuth])

    const loadBrainTools = useCallback(async () => {
        setToolsLoading(true)
        try {
            const response = await fetchWithAuth('/api/superadmin/brain-tools')
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to load tools')
            setBrainTools(data.tools ?? [])
        } catch (e) {
            console.error(e)
            toast.error('Failed to load tool registry')
        } finally {
            setToolsLoading(false)
        }
    }, [fetchWithAuth])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        loadBrainTools()
    }, [loadBrainTools])

    const handleToolToggle = async (name: string, currentEnabled: boolean) => {
        setToolTogglingName(name)
        try {
            const response = await fetchWithAuth('/api/superadmin/brain-tools', {
                method: 'PATCH',
                body: JSON.stringify({ name, is_enabled: !currentEnabled }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to update tool')
            setBrainTools(prev => prev.map(t => t.name === name ? { ...t, is_enabled: !currentEnabled } : t))
            toast.success(currentEnabled ? 'Tool disabled' : 'Tool enabled')
        } catch (e: any) {
            toast.error(e?.message || 'Failed to update tool')
        } finally {
            setToolTogglingName(null)
        }
    }

    // --------------------------------------------------------
    // FORM HANDLERS
    // --------------------------------------------------------

    const resetForm = () => {
        setForm(EMPTY_FORM)
        setEditingAgent(null)
    }

    const openCreate = () => {
        resetForm()
        setShowForm(true)
    }

    const startEdit = (agent: AgentTemplate) => {
        setForm({
            slug: agent.slug,
            name: agent.name,
            description: agent.description ?? '',
            avatar_emoji: agent.avatar_emoji,
            avatar_color: agent.avatar_color,
            category: agent.category,
            product_target: agent.product_target,
            system_prompt: agent.system_prompt,
            persona_prompt: agent.persona_prompt ?? '',
            instruction_prompt: agent.instruction_prompt ?? '',
            guardrails_prompt: agent.guardrails_prompt ?? '',
            preferred_provider: agent.preferred_provider ?? '',
            preferred_model: agent.preferred_model ?? '',
            temperature: agent.temperature,
            max_tokens: agent.max_tokens,
            tools_enabled: agent.tools_enabled.join(', '),
            skills: JSON.stringify(agent.skills, null, 2),
            has_own_kb: agent.has_own_kb,
            kb_object_types: agent.kb_object_types.join(', '),
            kb_min_confidence: agent.kb_min_confidence,
            max_turns: agent.max_turns,
            requires_approval: agent.requires_approval,
            can_access_brain: agent.can_access_brain,
            can_write_to_brain: agent.can_write_to_brain,
            is_active: agent.is_active,
            tier: agent.tier,
        })
        setEditingAgent(agent)
        setShowForm(true)
    }

    const handleSubmit = async () => {
        setSaving(true)
        try {
            let skills
            try {
                skills = JSON.parse(form.skills)
            } catch {
                throw new Error('Invalid skills JSON')
            }

            const payload: any = {
                name: form.name,
                description: form.description || null,
                avatar_emoji: form.avatar_emoji,
                avatar_color: form.avatar_color,
                category: form.category,
                product_target: form.product_target,
                system_prompt: form.system_prompt,
                persona_prompt: form.persona_prompt || null,
                instruction_prompt: form.instruction_prompt || null,
                guardrails_prompt: form.guardrails_prompt || null,
                preferred_provider: form.preferred_provider || null,
                preferred_model: form.preferred_model || null,
                temperature: form.temperature,
                max_tokens: form.max_tokens,
                tools_enabled: form.tools_enabled.split(',').map(t => t.trim()).filter(Boolean),
                skills,
                has_own_kb: form.has_own_kb,
                kb_object_types: form.kb_object_types.split(',').map(t => t.trim()).filter(Boolean),
                kb_min_confidence: form.kb_min_confidence,
                max_turns: form.max_turns,
                requires_approval: form.requires_approval,
                can_access_brain: form.can_access_brain,
                can_write_to_brain: form.can_write_to_brain,
                is_active: form.is_active,
                tier: form.tier,
            }

            if (!editingAgent) {
                payload.slug = form.slug
            }

            const url = editingAgent
                ? `/api/superadmin/agent-templates/${editingAgent.id}`
                : '/api/superadmin/agent-templates'

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

    const handleToggle = async (agent: AgentTemplate) => {
        try {
            const response = await fetchWithAuth(`/api/superadmin/agent-templates/${agent.id}`, {
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

    const handleDelete = async (agent: AgentTemplate) => {
        try {
            const response = await fetchWithAuth(`/api/superadmin/agent-templates/${agent.id}`, {
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

    const handleDuplicate = (agent: AgentTemplate) => {
        setForm({
            slug: `${agent.slug}-copy`,
            name: `${agent.name} (Copy)`,
            description: agent.description ?? '',
            avatar_emoji: agent.avatar_emoji,
            avatar_color: agent.avatar_color,
            category: agent.category,
            product_target: agent.product_target,
            system_prompt: agent.system_prompt,
            persona_prompt: agent.persona_prompt ?? '',
            instruction_prompt: agent.instruction_prompt ?? '',
            guardrails_prompt: agent.guardrails_prompt ?? '',
            preferred_provider: agent.preferred_provider ?? '',
            preferred_model: agent.preferred_model ?? '',
            temperature: agent.temperature,
            max_tokens: agent.max_tokens,
            tools_enabled: agent.tools_enabled.join(', '),
            skills: JSON.stringify(agent.skills, null, 2),
            has_own_kb: agent.has_own_kb,
            kb_object_types: agent.kb_object_types.join(', '),
            kb_min_confidence: agent.kb_min_confidence,
            max_turns: agent.max_turns,
            requires_approval: agent.requires_approval,
            can_access_brain: agent.can_access_brain,
            can_write_to_brain: agent.can_write_to_brain,
            is_active: true,
            tier: agent.tier,
        })
        setEditingAgent(null)
        setShowForm(true)
    }

    // --------------------------------------------------------
    // FILTERING
    // --------------------------------------------------------

    const filteredAgents = useMemo(() => {
        return agents.filter(agent => {
            if (filterCategory !== 'all' && agent.category !== filterCategory) return false
            if (filterProduct !== 'all' && agent.product_target !== filterProduct && agent.product_target !== 'all') return false
            if (searchQuery) {
                const q = searchQuery.toLowerCase()
                return (
                    agent.name.toLowerCase().includes(q) ||
                    agent.slug.toLowerCase().includes(q) ||
                    agent.description?.toLowerCase().includes(q)
                )
            }
            return true
        })
    }, [agents, filterCategory, filterProduct, searchQuery])

    const summary = useMemo(() => ({
        total: agents.length,
        active: agents.filter(a => a.is_active).length,
        system: agents.filter(a => a.is_system).length,
        byCategory: CATEGORIES.reduce((acc, cat) => {
            acc[cat.value] = agents.filter(a => a.category === cat.value).length
            return acc
        }, {} as Record<string, number>),
    }), [agents])

    // --------------------------------------------------------
    // RENDER
    // --------------------------------------------------------

    if (loading) {
        return <SuperadminLoadingState label="Loading Agent Templates" />
    }

    if (error && agents.length === 0) {
        return (
            <SuperadminErrorState
                title="Agent templates failed to load"
                description={error}
                action={<SuperadminButton icon={RefreshCw} onClick={() => load()}>Retry</SuperadminButton>}
            />
        )
    }

    return (
        <>
            <div className="space-y-lg">
                {/* Hero Section */}
                <SuperadminPageHero
                    eyebrow="Agent Library"
                    title="Brain Agent Templates"
                    description="Define reusable AI agents with specialized skills, knowledge bases, and capabilities. Assign agents to Brains, and they automatically become available to all organizations using that Brain."
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
                        <SuperadminBadge tone="primary"><Bot className="h-3.5 w-3.5" /> {summary.total} agent templates</SuperadminBadge>
                        <SuperadminBadge tone="success"><Check className="h-3.5 w-3.5" /> {summary.active} active</SuperadminBadge>
                        <SuperadminBadge tone="warning"><Sparkles className="h-3.5 w-3.5" /> {summary.system} system agents</SuperadminBadge>
                    </div>
                </SuperadminPageHero>

                {/* Metrics */}
                <div className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-5">
                    {CATEGORIES.map(cat => {
                        const Icon = cat.icon
                        return (
                            <SuperadminMetricCard
                                key={cat.value}
                                icon={Icon}
                                label={cat.label}
                                value={String(summary.byCategory[cat.value] || 0)}
                                hint={cat.description}
                                tone={cat.tone}
                            />
                        )
                    })}
                </div>

                {/* Toolbar */}
                <SuperadminToolbar>
                    <div className="flex flex-col gap-sm lg:flex-row lg:items-center">
                        <div className="flex flex-col gap-xs">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">Category</p>
                            <SuperadminSegmentedControl
                                value={filterCategory}
                                onChange={setFilterCategory}
                                options={[
                                    { value: 'all', label: `All ${agents.length}` },
                                    ...CATEGORIES.map(cat => ({
                                        value: cat.value,
                                        label: `${cat.label} ${summary.byCategory[cat.value] || 0}`,
                                    })),
                                ]}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-sm">
                        <SuperadminInputShell icon={<Search className="h-4 w-4" />}>
                            <input
                                type="text"
                                placeholder="Search agents..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent py-sm text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none"
                            />
                        </SuperadminInputShell>
                    </div>
                </SuperadminToolbar>

                {/* Agent Grid */}
                <SuperadminPanel
                    title="Agent Registry"
                    description="Click any agent card to expand and view full configuration, skills, and actions."
                    tone="primary"
                >
                    {filteredAgents.length === 0 ? (
                        <SuperadminEmptyState
                            icon={Bot}
                            title="No agents found"
                            description={searchQuery ? 'Try adjusting your search or filters.' : 'Create your first agent template to get started.'}
                            action={!searchQuery && <SuperadminButton tone="primary" icon={Plus} onClick={openCreate}>Create Agent</SuperadminButton>}
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-3">
                            {filteredAgents.map(agent => {
                                const category = getCategoryMeta(agent.category)
                                const product = getProductMeta(agent.product_target)
                                const tier = getTierMeta(agent.tier)
                                const isExpanded = expandedId === agent.id
                                const CategoryIcon = category.icon
                                const ProductIcon = product.icon

                                return (
                                    <div
                                        key={agent.id}
                                        className={`
                                            rounded-[calc(var(--radius-xl)*1.3)] border border-border/70 
                                            bg-background/70 backdrop-blur-sm
                                            transition-all duration-[var(--duration-fast)]
                                            hover:border-borderHover hover:shadow-[var(--shadow-md)]
                                            ${isExpanded ? 'col-span-full' : ''}
                                        `}
                                    >
                                        {/* Card Header */}
                                        <button
                                            type="button"
                                            onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                                            className="flex w-full items-start gap-md p-lg text-left"
                                        >
                                            {/* Avatar */}
                                            <div className={`
                                                flex h-14 w-14 shrink-0 items-center justify-center
                                                rounded-[var(--radius-lg)] border text-2xl
                                                ${getAvatarColorClass(agent.avatar_color)}
                                            `}>
                                                {agent.avatar_emoji}
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-sm">
                                                    <div>
                                                        <h3 className="text-base font-semibold text-textPrimary">{agent.name}</h3>
                                                        <code className="text-xs text-textTertiary">{agent.slug}</code>
                                                    </div>
                                                    <div className={`h-2.5 w-2.5 rounded-full ${agent.is_active ? 'bg-success' : 'bg-warning'}`} />
                                                </div>

                                                {agent.description && (
                                                    <p className="mt-sm line-clamp-2 text-sm text-textSecondary">
                                                        {agent.description}
                                                    </p>
                                                )}

                                                <div className="mt-md flex flex-wrap items-center gap-xs">
                                                    <SuperadminBadge tone={category.tone}>
                                                        <CategoryIcon className="h-3 w-3" /> {category.label}
                                                    </SuperadminBadge>
                                                    <SuperadminBadge tone="info">
                                                        <ProductIcon className="h-3 w-3" /> {product.label}
                                                    </SuperadminBadge>
                                                    <SuperadminBadge tone={tier.tone}>{tier.label}</SuperadminBadge>
                                                    {agent.is_system && <SuperadminBadge tone="warning">System</SuperadminBadge>}
                                                </div>
                                            </div>

                                            {/* Expand Icon */}
                                            {isExpanded ? (
                                                <ChevronUp className="h-5 w-5 shrink-0 text-textSecondary" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 shrink-0 text-textSecondary" />
                                            )}
                                        </button>

                                        {/* Expanded Content */}
                                        {isExpanded && (
                                            <div className="border-t border-border/70 p-lg">
                                                <div className="grid grid-cols-1 gap-lg xl:grid-cols-[1.5fr_1fr]">
                                                    {/* Left Column - Details */}
                                                    <div className="space-y-md">
                                                        {/* Prompts Preview */}
                                                        <div className="space-y-sm">
                                                            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-textTertiary">System Prompt</h4>
                                                            <div className="max-h-32 overflow-y-auto rounded-[var(--radius-lg)] border border-border/70 bg-surface p-sm">
                                                                <p className="whitespace-pre-wrap text-sm text-textSecondary">
                                                                    {agent.system_prompt || 'No system prompt defined'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Skills */}
                                                        {agent.skills && agent.skills.length > 0 && (
                                                            <div className="space-y-sm">
                                                                <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-textTertiary">Skills</h4>
                                                                <div className="flex flex-wrap gap-xs">
                                                                    {agent.skills.map((skill: any, idx: number) => (
                                                                        <div
                                                                            key={idx}
                                                                            className="rounded-[var(--radius-lg)] border border-border/70 bg-surface px-sm py-xs"
                                                                        >
                                                                            <p className="text-sm font-medium text-textPrimary">{skill.name || skill.slug}</p>
                                                                            {skill.description && (
                                                                                <p className="text-xs text-textSecondary">{skill.description}</p>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Tools */}
                                                        {agent.tools_enabled.length > 0 && (
                                                            <div className="space-y-sm">
                                                                <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-textTertiary">Tools Enabled</h4>
                                                                <div className="flex flex-wrap gap-xs">
                                                                    {agent.tools_enabled.map(tool => (
                                                                        <SuperadminBadge key={tool} tone="info">{tool}</SuperadminBadge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Config Stats */}
                                                        <div className="grid grid-cols-2 gap-sm md:grid-cols-4">
                                                            <MiniStat label="Temperature" value={agent.temperature.toFixed(2)} />
                                                            <MiniStat label="Max Tokens" value={agent.max_tokens.toLocaleString()} />
                                                            <MiniStat label="Max Turns" value={String(agent.max_turns)} />
                                                            <MiniStat label="KB Confidence" value={`${(agent.kb_min_confidence * 100).toFixed(0)}%`} />
                                                        </div>
                                                    </div>

                                                    {/* Right Column - Capabilities & Actions */}
                                                    <div className="space-y-md">
                                                        {/* Capabilities */}
                                                        <div className="rounded-[calc(var(--radius-lg)*1.2)] border border-border/70 bg-surface p-md">
                                                            <h4 className="mb-sm text-xs font-semibold uppercase tracking-[0.18em] text-textTertiary">Capabilities</h4>
                                                            <div className="space-y-xs">
                                                                <CapabilityRow label="Has Own KB" enabled={agent.has_own_kb} />
                                                                <CapabilityRow label="Can Access Brain" enabled={agent.can_access_brain} />
                                                                <CapabilityRow label="Can Write to Brain" enabled={agent.can_write_to_brain} />
                                                                <CapabilityRow label="Requires Approval" enabled={agent.requires_approval} />
                                                            </div>
                                                        </div>

                                                        {/* Provider Info */}
                                                        {(agent.preferred_provider || agent.preferred_model) && (
                                                            <div className="rounded-[calc(var(--radius-lg)*1.2)] border border-border/70 bg-surface p-md">
                                                                <h4 className="mb-sm text-xs font-semibold uppercase tracking-[0.18em] text-textTertiary">Preferred LLM</h4>
                                                                {agent.preferred_provider && (
                                                                    <p className="text-sm text-textSecondary">Provider: <span className="text-textPrimary">{agent.preferred_provider}</span></p>
                                                                )}
                                                                {agent.preferred_model && (
                                                                    <p className="text-sm text-textSecondary">Model: <span className="text-textPrimary">{agent.preferred_model}</span></p>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Actions */}
                                                        <div className="flex flex-wrap gap-sm">
                                                            <SuperadminButton icon={Edit3} onClick={() => startEdit(agent)}>Edit</SuperadminButton>
                                                            <SuperadminButton icon={Copy} onClick={() => handleDuplicate(agent)}>Duplicate</SuperadminButton>
                                                            <SuperadminButton onClick={() => handleToggle(agent)}>
                                                                {agent.is_active ? <><PowerOff className="h-4 w-4" /> Deactivate</> : <><Power className="h-4 w-4" /> Activate</>}
                                                            </SuperadminButton>
                                                            {!agent.is_system && (
                                                                <SuperadminButton icon={Trash2} onClick={() => setPendingDeleteAgent(agent)}>Delete</SuperadminButton>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </SuperadminPanel>

                {/* Tool Registry */}
                <SuperadminPanel
                    title="Tool Registry"
                    description="Brain tools available to agents. Toggle enable/disable; disabled tools are not returned to the LLM. Below: which agents use each tool."
                    tone="accent"
                >
                    {toolsLoading ? (
                        <div className="flex items-center justify-center py-12 text-textTertiary">
                            <RefreshCw className="h-6 w-6 animate-spin" />
                        </div>
                    ) : brainTools.length === 0 ? (
                        <SuperadminEmptyState
                            icon={Settings}
                            title="No tools loaded"
                            description="Brain tools will appear here once the registry is seeded."
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-3">
                            {brainTools.map(tool => {
                                const agentsUsing = agents.filter(a => (a.tools_enabled || []).includes(tool.name))
                                const isToggling = toolTogglingName === tool.name
                                return (
                                    <div
                                        key={tool.name}
                                        className={`rounded-xl border p-md transition-colors ${
                                            tool.is_enabled ? 'border-border bg-background/70' : 'border-border/50 bg-surface/50 opacity-80'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-sm">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-semibold text-textPrimary">{tool.name}</span>
                                                    <span className="rounded px-1.5 py-0.5 text-xs font-medium text-textTertiary bg-surface">{tool.category}</span>
                                                    {tool.min_tier && <span className="text-xs text-textTertiary">min: {tool.min_tier}</span>}
                                                </div>
                                                <p className="mt-1 line-clamp-2 text-xs text-textSecondary">{tool.description}</p>
                                                <p className="mt-1 text-xs text-textTertiary">Handler: <code className="font-mono">{tool.handler_function}</code></p>
                                                {tool.requires_confirm && (
                                                    <span className="mt-1 inline-block text-xs text-warning">Requires confirm</span>
                                                )}
                                                {agentsUsing.length > 0 && (
                                                    <p className="mt-2 text-xs text-textTertiary">
                                                        Used by: {agentsUsing.map(a => a.name).join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleToolToggle(tool.name, tool.is_enabled)}
                                                disabled={isToggling}
                                                className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
                                                    tool.is_enabled
                                                        ? 'border-borderHover bg-surfaceElevated text-success hover:bg-surfaceHover'
                                                        : 'border-border bg-surface text-textTertiary hover:bg-surfaceHover'
                                                }`}
                                            >
                                                {isToggling ? <RefreshCw className="h-3 w-3 animate-spin inline" /> : tool.is_enabled ? 'On' : 'Off'}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </SuperadminPanel>

                {error && (
                    <SuperadminErrorState
                        title="Partial sync issue"
                        description={error}
                        action={<SuperadminButton icon={RefreshCw} onClick={() => load(true)}>Retry</SuperadminButton>}
                    />
                )}
            </div>

            {/* Create/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm" onClick={() => { setShowForm(false); resetForm() }}>
                    <div className="absolute inset-y-0 right-0 w-full max-w-4xl border-l border-border bg-surface/95 shadow-[var(--shadow-xl)] backdrop-blur-xl animate-slide-in-right">
                        <div className="flex h-full flex-col" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-border px-lg py-md">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">Agent Composer</p>
                                    <h2 className="mt-xs text-xl font-semibold text-textPrimary">
                                        {editingAgent ? `Edit ${editingAgent.name}` : 'Create New Agent'}
                                    </h2>
                                </div>
                                <SuperadminButton tone="ghost" icon={X} onClick={() => { setShowForm(false); resetForm() }}>
                                    Close
                                </SuperadminButton>
                            </div>

                            {/* Form Content */}
                            <div className="flex-1 space-y-md overflow-y-auto px-lg py-md">
                                {/* Identity Section */}
                                <FormSection title="Identity">
                                    <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                                        <ComposerField label="Slug (unique identifier)">
                                            <input
                                                disabled={!!editingAgent}
                                                value={form.slug}
                                                onChange={e => setForm({ ...form, slug: e.target.value })}
                                                placeholder="email-writer"
                                                className="w-full bg-transparent py-sm font-mono text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none disabled:opacity-50"
                                            />
                                        </ComposerField>
                                        <ComposerField label="Display Name">
                                            <input
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                                placeholder="Email Writer"
                                                className="w-full bg-transparent py-sm text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none"
                                            />
                                        </ComposerField>
                                    </div>

                                    <div className="grid grid-cols-1 gap-md md:grid-cols-3">
                                        <ComposerField label="Avatar Emoji">
                                            <input
                                                value={form.avatar_emoji}
                                                onChange={e => setForm({ ...form, avatar_emoji: e.target.value })}
                                                className="w-full bg-transparent py-sm text-2xl focus:outline-none"
                                            />
                                        </ComposerField>
                                        <ComposerField label="Avatar Color">
                                            <select
                                                value={form.avatar_color}
                                                onChange={e => setForm({ ...form, avatar_color: e.target.value })}
                                                className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none"
                                            >
                                                {AVATAR_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                            </select>
                                        </ComposerField>
                                        <ComposerField label="Tier">
                                            <select
                                                value={form.tier}
                                                onChange={e => setForm({ ...form, tier: e.target.value as any })}
                                                className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none"
                                            >
                                                {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </ComposerField>
                                    </div>

                                    <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                                        <ComposerField label="Category">
                                            <select
                                                value={form.category}
                                                onChange={e => setForm({ ...form, category: e.target.value as any })}
                                                className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none"
                                            >
                                                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                            </select>
                                        </ComposerField>
                                        <ComposerField label="Product Target">
                                            <select
                                                value={form.product_target}
                                                onChange={e => setForm({ ...form, product_target: e.target.value as any })}
                                                className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none"
                                            >
                                                {PRODUCTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                            </select>
                                        </ComposerField>
                                    </div>

                                    <ComposerTextarea
                                        label="Description"
                                        value={form.description}
                                        onChange={v => setForm({ ...form, description: v })}
                                        rows={3}
                                        placeholder="What does this agent do?"
                                    />
                                </FormSection>

                                {/* Prompts Section */}
                                <FormSection title="Prompts">
                                    <ComposerTextarea
                                        label="System Prompt"
                                        value={form.system_prompt}
                                        onChange={v => setForm({ ...form, system_prompt: v })}
                                        rows={6}
                                        placeholder="You are an expert..."
                                    />
                                    <ComposerTextarea
                                        label="Persona Prompt"
                                        value={form.persona_prompt}
                                        onChange={v => setForm({ ...form, persona_prompt: v })}
                                        rows={4}
                                        placeholder="Your personality and voice..."
                                    />
                                    <ComposerTextarea
                                        label="Instruction Prompt"
                                        value={form.instruction_prompt}
                                        onChange={v => setForm({ ...form, instruction_prompt: v })}
                                        rows={6}
                                        placeholder="Step-by-step instructions..."
                                    />
                                    <ComposerTextarea
                                        label="Guardrails Prompt"
                                        value={form.guardrails_prompt}
                                        onChange={v => setForm({ ...form, guardrails_prompt: v })}
                                        rows={4}
                                        placeholder="What the agent should NOT do..."
                                    />
                                </FormSection>

                                {/* LLM Configuration */}
                                <FormSection title="LLM Configuration">
                                    <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                                        <ComposerField label="Preferred Provider">
                                            <input
                                                value={form.preferred_provider}
                                                onChange={e => setForm({ ...form, preferred_provider: e.target.value })}
                                                placeholder="openai, anthropic, etc."
                                                className="w-full bg-transparent py-sm text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none"
                                            />
                                        </ComposerField>
                                        <ComposerField label="Preferred Model">
                                            <input
                                                value={form.preferred_model}
                                                onChange={e => setForm({ ...form, preferred_model: e.target.value })}
                                                placeholder="gpt-4o, claude-3-5-sonnet, etc."
                                                className="w-full bg-transparent py-sm text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none"
                                            />
                                        </ComposerField>
                                    </div>

                                    <div className="grid grid-cols-1 gap-md md:grid-cols-3">
                                        <ComposerField label="Temperature">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="2"
                                                value={form.temperature}
                                                onChange={e => setForm({ ...form, temperature: parseFloat(e.target.value || '0.7') })}
                                                className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none"
                                            />
                                        </ComposerField>
                                        <ComposerField label="Max Tokens">
                                            <input
                                                type="number"
                                                value={form.max_tokens}
                                                onChange={e => setForm({ ...form, max_tokens: parseInt(e.target.value || '4096', 10) })}
                                                className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none"
                                            />
                                        </ComposerField>
                                        <ComposerField label="Max Turns">
                                            <input
                                                type="number"
                                                value={form.max_turns}
                                                onChange={e => setForm({ ...form, max_turns: parseInt(e.target.value || '10', 10) })}
                                                className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none"
                                            />
                                        </ComposerField>
                                    </div>
                                </FormSection>

                                {/* Tools & Skills */}
                                <FormSection title="Tools & Skills">
                                    <ComposerField label="Tools Enabled">
                                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                                            {brainTools.filter(t => t.is_enabled).map(tool => {
                                                const selected = form.tools_enabled.split(',').map(s => s.trim()).filter(Boolean)
                                                const checked = selected.includes(tool.name)
                                                return (
                                                    <label key={tool.name} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => {
                                                                const next = checked
                                                                    ? selected.filter(n => n !== tool.name)
                                                                    : [...selected, tool.name]
                                                                setForm({ ...form, tools_enabled: next.join(', ') })
                                                            }}
                                                            className="rounded border-border text-primary focus:ring-borderFocus"
                                                        />
                                                        <span className="text-sm text-textPrimary font-mono">{tool.name}</span>
                                                    </label>
                                                )
                                            })}
                                            {brainTools.filter(t => t.is_enabled).length === 0 && (
                                                <span className="text-sm text-textTertiary">No enabled tools in registry.</span>
                                            )}
                                        </div>
                                    </ComposerField>
                                    <ComposerTextarea
                                        label="Skills JSON"
                                        value={form.skills}
                                        onChange={v => setForm({ ...form, skills: v })}
                                        rows={6}
                                        placeholder='[{"slug": "cold-outreach", "name": "Cold Outreach", "description": "..."}]'
                                    />
                                </FormSection>

                                {/* Knowledge Base */}
                                <FormSection title="Knowledge Base">
                                    <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                                        <ComposerField label="KB Object Types (comma-separated)">
                                            <input
                                                value={form.kb_object_types}
                                                onChange={e => setForm({ ...form, kb_object_types: e.target.value })}
                                                placeholder="email_template, best_practice"
                                                className="w-full bg-transparent py-sm text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none"
                                            />
                                        </ComposerField>
                                        <ComposerField label="KB Min Confidence">
                                            <input
                                                type="number"
                                                step="0.05"
                                                min="0"
                                                max="1"
                                                value={form.kb_min_confidence}
                                                onChange={e => setForm({ ...form, kb_min_confidence: parseFloat(e.target.value || '0.6') })}
                                                className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none"
                                            />
                                        </ComposerField>
                                    </div>
                                </FormSection>

                                {/* Capabilities */}
                                <FormSection title="Capabilities">
                                    <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
                                        <ToggleRow title="Agent Active" checked={form.is_active} onChange={v => setForm({ ...form, is_active: v })} />
                                        <ToggleRow title="Has Own KB" checked={form.has_own_kb} onChange={v => setForm({ ...form, has_own_kb: v })} />
                                        <ToggleRow title="Can Access Brain" checked={form.can_access_brain} onChange={v => setForm({ ...form, can_access_brain: v })} />
                                        <ToggleRow title="Can Write to Brain" checked={form.can_write_to_brain} onChange={v => setForm({ ...form, can_write_to_brain: v })} />
                                        <ToggleRow title="Requires Approval" checked={form.requires_approval} onChange={v => setForm({ ...form, requires_approval: v })} />
                                    </div>
                                </FormSection>
                            </div>

                            {/* Footer */}
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

            {/* Delete Confirmation */}
            <SuperadminConfirmDialog
                open={Boolean(pendingDeleteAgent)}
                title="Delete agent template"
                description={`This will permanently remove "${pendingDeleteAgent?.name || 'this agent'}" and all its configuration. This action cannot be undone.`}
                confirmLabel="Delete Agent"
                onCancel={() => setPendingDeleteAgent(null)}
                onConfirm={() => {
                    if (pendingDeleteAgent) void handleDelete(pendingDeleteAgent)
                    setPendingDeleteAgent(null)
                }}
            />
        </>
    )
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[calc(var(--radius-lg)*1.1)] border border-border/70 bg-surface p-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-textTertiary">{label}</p>
            <p className="mt-xs text-sm font-semibold text-textPrimary">{value}</p>
        </div>
    )
}

function CapabilityRow({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <div className="flex items-center justify-between py-xs">
            <span className="text-sm text-textSecondary">{label}</span>
            <div className={`h-2 w-2 rounded-full ${enabled ? 'bg-success' : 'bg-textTertiary'}`} />
        </div>
    )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-md rounded-[calc(var(--radius-xl)*1.3)] border border-border/70 bg-background/50 p-md">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-textTertiary">{title}</h3>
            {children}
        </div>
    )
}

function ComposerField({ label, children }: { label: string; children: React.ReactNode }) {
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
    placeholder,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    rows: number
    placeholder?: string
}) {
    return (
        <div className="rounded-[calc(var(--radius-lg)*1.2)] border border-border/70 bg-background/70 p-md">
            <p className="mb-sm text-xs font-semibold uppercase tracking-[0.18em] text-textTertiary">{label}</p>
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                rows={rows}
                placeholder={placeholder}
                className="w-full resize-none rounded-[var(--radius-lg)] border border-border bg-surface px-sm py-sm font-mono text-xs text-textPrimary placeholder:text-textTertiary focus:outline-none focus:ring-2 focus:ring-borderFocus"
            />
        </div>
    )
}

function ToggleRow({
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
