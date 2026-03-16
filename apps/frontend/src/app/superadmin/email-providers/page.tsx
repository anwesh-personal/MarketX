'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
    Mail, Plus, Settings, Trash2, Power, PowerOff, TestTube,
    Globe, Building2, ChevronDown, ChevronUp, Loader2, Check,
    AlertTriangle, X, RefreshCw, Shield, Zap, Server,
    GripVertical, Copy, CheckCircle, ExternalLink, Eye, EyeOff,
    Activity, Send, ArrowUpDown, Wifi, WifiOff, Info,
} from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import toast from 'react-hot-toast'
import { SuperadminConfirmDialog } from '@/components/SuperAdmin/surfaces'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'

// ── Provider metadata ──────────────────────────────────────────

interface ProviderMeta {
    value: string; label: string; color: string; bg: string; icon: string
    category: 'autoresponder' | 'smtp_relay'
    capabilities: { send: boolean; bulk: boolean; webhooks: boolean; stats: boolean; replies: boolean }
    description: string
}

const PROVIDERS: ProviderMeta[] = [
    { value: 'mailwizz', label: 'MailWizz', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: '📬', category: 'autoresponder', capabilities: { send: true, bulk: true, webhooks: true, stats: true, replies: true }, description: 'Campaign manager & autoresponder' },
    { value: 'mailgun', label: 'Mailgun', color: 'text-red-400', bg: 'bg-red-500/10', icon: '🔫', category: 'smtp_relay', capabilities: { send: true, bulk: true, webhooks: true, stats: true, replies: false }, description: 'Transactional & bulk email API' },
    { value: 'ses', label: 'Amazon SES', color: 'text-orange-400', bg: 'bg-orange-500/10', icon: '☁️', category: 'smtp_relay', capabilities: { send: true, bulk: true, webhooks: true, stats: false, replies: false }, description: 'AWS managed email delivery' },
    { value: 'sendgrid', label: 'SendGrid', color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: '⚡', category: 'smtp_relay', capabilities: { send: true, bulk: true, webhooks: true, stats: true, replies: false }, description: 'Twilio email platform' },
    { value: 'postmark', label: 'Postmark', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: '📮', category: 'smtp_relay', capabilities: { send: true, bulk: true, webhooks: true, stats: true, replies: true }, description: 'Transactional with inbound reply' },
    { value: 'sparkpost', label: 'SparkPost', color: 'text-purple-400', bg: 'bg-purple-500/10', icon: '✨', category: 'smtp_relay', capabilities: { send: true, bulk: true, webhooks: true, stats: true, replies: false }, description: 'Enterprise email delivery' },
    { value: 'smtp', label: 'Generic SMTP', color: 'text-green-400', bg: 'bg-green-500/10', icon: '🔧', category: 'smtp_relay', capabilities: { send: true, bulk: false, webhooks: false, stats: false, replies: false }, description: 'Any SMTP server (Postfix, PowerMTA, etc.)' },
    { value: 'custom', label: 'Custom', color: 'text-textTertiary', bg: 'bg-surface', icon: '🔌', category: 'smtp_relay', capabilities: { send: true, bulk: false, webhooks: false, stats: false, replies: false }, description: 'Custom integration' },
]

const getMeta = (type: string) => PROVIDERS.find(p => p.value === type) ?? PROVIDERS[PROVIDERS.length - 1]

const HEALTH: Record<string, { bg: string; text: string; label: string; dot: string }> = {
    healthy:  { bg: 'bg-success/10', text: 'text-success', label: 'Healthy', dot: 'bg-success' },
    degraded: { bg: 'bg-warning/10', text: 'text-warning', label: 'Degraded', dot: 'bg-warning' },
    down:     { bg: 'bg-error/10', text: 'text-error', label: 'Down', dot: 'bg-error' },
    unknown:  { bg: 'bg-surface', text: 'text-textTertiary', label: 'Unknown', dot: 'bg-textTertiary' },
}

// ── Types ──────────────────────────────────────────────────────

interface Provider {
    id: string; partner_id: string | null; scope: string; provider_type: string
    display_name: string; is_active: boolean; is_default: boolean; priority: number
    api_base_url: string | null; api_key: string | null
    smtp_host: string | null; smtp_port: number | null; smtp_encryption: string | null
    webhook_url: string | null; webhook_events: string[]
    provider_settings: Record<string, unknown>
    max_sends_per_day: number | null; max_sends_per_hour: number | null
    max_batch_size: number; rate_limit_per_second: number
    warmup_enabled: boolean; warmup_start_volume: number
    warmup_increment_pct: number; warmup_target_days: number
    health_status: string; consecutive_failures: number
    last_health_check: string | null
    total_sent: number; total_bounced: number; total_complained: number
    notes: string | null; created_at: string
}
interface Org { id: string; name: string }

// ── Defaults ───────────────────────────────────────────────────

const EMPTY_FORM = {
    partner_id: '', scope: 'organization' as const, provider_type: 'mailwizz',
    display_name: '', is_active: false, is_default: false, priority: 0,
    api_base_url: '', api_key: '', api_secret: '', api_token: '',
    smtp_host: '', smtp_port: 587, smtp_username: '', smtp_password: '', smtp_encryption: 'tls',
    webhook_url: '', webhook_secret: '', webhook_events: [] as string[],
    provider_settings: {} as Record<string, unknown>,
    max_sends_per_day: 50000, max_sends_per_hour: 5000,
    max_batch_size: 500, rate_limit_per_second: 10,
    warmup_enabled: true, warmup_start_volume: 50,
    warmup_increment_pct: 20, warmup_target_days: 21,
    notes: '',
}

// ═════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════

export default function EmailProvidersPage() {
    const { fetchWithAuth } = useSuperadminAuth()
    const [providers, setProviders] = useState<Provider[]>([])
    const [orgs, setOrgs] = useState<Org[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState<string | null>(null)
    const [filterScope, setFilterScope] = useState<string>('all')
    const [pendingDelete, setPendingDelete] = useState<Provider | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
    const [webhookCopied, setWebhookCopied] = useState<string | null>(null)

    const loadProviders = useCallback(async () => {
        try {
            const res = await fetchWithAuth('/api/superadmin/providers')
            const data = await res.json()
            if (data.providers) setProviders(data.providers)
        } catch { toast.error('Failed to load providers') }
        finally { setLoading(false) }
    }, [fetchWithAuth])

    const loadOrgs = useCallback(async () => {
        try {
            const res = await fetchWithAuth('/api/superadmin/organizations')
            const data = await res.json()
            if (data.organizations) setOrgs(data.organizations)
        } catch { /* optional */ }
    }, [fetchWithAuth])

    useEffect(() => { loadProviders(); loadOrgs() }, [loadProviders, loadOrgs])

    const filtered = useMemo(() =>
        filterScope === 'all' ? providers : providers.filter(p => p.scope === filterScope),
    [providers, filterScope])

    // ── Actions ──────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!form.display_name || !form.provider_type) { toast.error('Name and type required'); return }
        if (form.scope === 'organization' && !form.partner_id) { toast.error('Select organization'); return }
        setSaving(true)
        try {
            const payload: Record<string, unknown> = { ...form }
            if (form.scope === 'global') payload.partner_id = null
            ;['api_base_url','api_key','api_secret','api_token','webhook_url','webhook_secret','smtp_host','notes'].forEach(k => {
                if (!payload[k]) payload[k] = null
            })
            const url = editingId ? `/api/superadmin/providers/${editingId}` : '/api/superadmin/providers'
            const res = await fetchWithAuth(url, { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed')
            toast.success(editingId ? 'Provider updated' : 'Provider created')
            setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); loadProviders()
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Save failed') }
        finally { setSaving(false) }
    }

    const handleTest = async (id: string) => {
        setTesting(id)
        try {
            const res = await fetchWithAuth(`/api/superadmin/providers/${id}/test`, { method: 'POST' })
            const data = await res.json()
            data.test_result?.success
                ? toast.success(`Connection OK (${data.test_result.latency_ms}ms)`)
                : toast.error(`Test failed: ${data.test_result?.message ?? 'Unknown'}`)
            loadProviders()
        } catch { toast.error('Test request failed') }
        finally { setTesting(null) }
    }

    const handleToggle = async (p: Provider) => {
        try {
            const res = await fetchWithAuth(`/api/superadmin/providers/${p.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !p.is_active }),
            })
            if (!res.ok) throw new Error()
            toast.success(p.is_active ? 'Deactivated' : 'Activated')
            loadProviders()
        } catch { toast.error('Toggle failed') }
    }

    const handleDelete = async (p: Provider) => {
        try {
            const res = await fetchWithAuth(`/api/superadmin/providers/${p.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success('Deleted'); loadProviders()
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Delete failed') }
    }

    const handlePriorityReorder = async (newOrder: Provider[]) => {
        setProviders(newOrder)
        for (let i = 0; i < newOrder.length; i++) {
            const p = newOrder[i]
            const newPriority = newOrder.length - i
            if (p.priority !== newPriority) {
                await fetchWithAuth(`/api/superadmin/providers/${p.id}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ priority: newPriority }),
                })
            }
        }
    }

    const startEdit = (p: Provider) => {
        setForm({
            partner_id: p.partner_id ?? '', scope: p.scope as 'organization' | 'global',
            provider_type: p.provider_type, display_name: p.display_name,
            is_active: p.is_active, is_default: p.is_default, priority: p.priority,
            api_base_url: p.api_base_url ?? '', api_key: '', api_secret: '', api_token: '',
            smtp_host: p.smtp_host ?? '', smtp_port: p.smtp_port ?? 587,
            smtp_username: '', smtp_password: '', smtp_encryption: p.smtp_encryption ?? 'tls',
            webhook_url: p.webhook_url ?? '', webhook_secret: '',
            webhook_events: p.webhook_events ?? [],
            provider_settings: p.provider_settings ?? {},
            max_sends_per_day: p.max_sends_per_day ?? 50000,
            max_sends_per_hour: p.max_sends_per_hour ?? 5000,
            max_batch_size: p.max_batch_size, rate_limit_per_second: p.rate_limit_per_second,
            warmup_enabled: p.warmup_enabled, warmup_start_volume: p.warmup_start_volume,
            warmup_increment_pct: p.warmup_increment_pct, warmup_target_days: p.warmup_target_days,
            notes: p.notes ?? '',
        })
        setEditingId(p.id); setShowForm(true)
    }

    const copyWebhookUrl = (type: string) => {
        const url = `${window.location.origin}/api/webhooks/email/${type}`
        navigator.clipboard.writeText(url)
        setWebhookCopied(type)
        setTimeout(() => setWebhookCopied(null), 2000)
    }

    // ── Stats ────────────────────────────────────────────────────

    const stats = useMemo(() => ({
        total: providers.length,
        active: providers.filter(p => p.is_active).length,
        healthy: providers.filter(p => p.health_status === 'healthy').length,
        totalSent: providers.reduce((s, p) => s + p.total_sent, 0),
    }), [providers])

    // ── Render ───────────────────────────────────────────────────

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
                            <Mail className="w-6 h-6 text-accent" />
                        </div>
                        <h1 className="text-3xl font-bold font-display text-textPrimary">Email Providers</h1>
                    </div>
                    <p className="text-textSecondary ml-1 max-w-2xl">
                        Configure MTA connections. Drag to set priority. Market Writer automatically uses the highest-priority active provider per org.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadProviders} className="btn btn-ghost btn-icon" aria-label="Refresh"><RefreshCw className="w-4 h-4" /></button>
                    <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }} className="btn btn-primary">
                        <Plus className="w-4 h-4" /> Add Provider
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, icon: Server, color: 'text-accent' },
                    { label: 'Active', value: stats.active, icon: Activity, color: 'text-success' },
                    { label: 'Healthy', value: stats.healthy, icon: Wifi, color: 'text-info' },
                    { label: 'Emails Sent', value: stats.totalSent.toLocaleString(), icon: Send, color: 'text-warning' },
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

            {/* Scope filter */}
            <div className="flex items-center gap-2">
                {['all', 'global', 'organization'].map(s => (
                    <button key={s} onClick={() => setFilterScope(s)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filterScope === s ? 'bg-accent text-onAccent' : 'bg-surface border border-border text-textSecondary hover:text-textPrimary hover:border-borderHover'}`}>
                        {s === 'all' ? `All (${providers.length})` : s === 'global' ? 'Global' : 'Per-Org'}
                    </button>
                ))}
                <div className="flex-1" />
                <span className="text-xs text-textTertiary flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5" /> Drag to reorder priority
                </span>
            </div>

            {/* Provider list — drag-to-reorder */}
            {filtered.length === 0 ? (
                <EmptyState onAdd={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }} />
            ) : (
                <Reorder.Group axis="y" values={filtered} onReorder={handlePriorityReorder} className="space-y-3">
                    {filtered.map(p => (
                        <ProviderCard
                            key={p.id}
                            provider={p}
                            isExpanded={expandedId === p.id}
                            onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
                            isTesting={testing === p.id}
                            onTest={() => handleTest(p.id)}
                            onToggleActive={() => handleToggle(p)}
                            onEdit={() => startEdit(p)}
                            onDelete={() => setPendingDelete(p)}
                            onCopyWebhook={() => copyWebhookUrl(p.provider_type)}
                            webhookCopied={webhookCopied === p.provider_type}
                            showSecrets={showSecrets[p.id] ?? false}
                            onToggleSecrets={() => setShowSecrets(s => ({ ...s, [p.id]: !s[p.id] }))}
                        />
                    ))}
                </Reorder.Group>
            )}

            {/* Quick-add gallery */}
            <div>
                <h3 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Supported Providers
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PROVIDERS.map(pm => {
                        const existing = providers.find(p => p.provider_type === pm.value)
                        return (
                            <button
                                key={pm.value}
                                onClick={() => {
                                    if (!existing) {
                                        setForm({ ...EMPTY_FORM, provider_type: pm.value, display_name: pm.label })
                                        setEditingId(null)
                                        setShowForm(true)
                                    }
                                }}
                                className={`p-4 rounded-xl border text-left transition-all group ${existing ? 'border-success/30 bg-success/5 cursor-default' : 'border-border hover:border-accent/40 hover:bg-accent/5 cursor-pointer'}`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">{pm.icon}</span>
                                    <div>
                                        <p className={`font-semibold ${pm.color}`}>{pm.label}</p>
                                        <p className="text-xs text-textTertiary">{pm.category === 'autoresponder' ? 'Autoresponder' : 'SMTP Relay'}</p>
                                    </div>
                                    {existing && <CheckCircle className="w-4 h-4 text-success ml-auto" />}
                                </div>
                                <p className="text-xs text-textSecondary mb-2">{pm.description}</p>
                                <div className="flex flex-wrap gap-1">
                                    {pm.capabilities.send && <Badge label="Send" />}
                                    {pm.capabilities.bulk && <Badge label="Bulk" />}
                                    {pm.capabilities.webhooks && <Badge label="Webhooks" />}
                                    {pm.capabilities.stats && <Badge label="Stats" />}
                                    {pm.capabilities.replies && <Badge label="Replies" active />}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showForm && (
                    <ProviderFormModal
                        form={form} setForm={setForm}
                        editingId={editingId} saving={saving}
                        orgs={orgs}
                        onSubmit={handleSubmit}
                        onClose={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM) }}
                    />
                )}
            </AnimatePresence>

            {/* Delete confirm */}
            <SuperadminConfirmDialog
                open={Boolean(pendingDelete)}
                title="Delete email provider"
                description={`Permanently remove "${pendingDelete?.display_name || ''}"? This cannot be undone.`}
                confirmLabel="Delete provider"
                onCancel={() => setPendingDelete(null)}
                onConfirm={() => { if (pendingDelete) handleDelete(pendingDelete); setPendingDelete(null) }}
            />
        </div>
    )
}

// ═════════════════════════════════════════════════════════════════
// PROVIDER CARD (draggable)
// ═════════════════════════════════════════════════════════════════

function ProviderCard({ provider: p, isExpanded, onToggleExpand, isTesting, onTest, onToggleActive, onEdit, onDelete, onCopyWebhook, webhookCopied, showSecrets, onToggleSecrets }: {
    provider: Provider; isExpanded: boolean; onToggleExpand: () => void
    isTesting: boolean; onTest: () => void; onToggleActive: () => void
    onEdit: () => void; onDelete: () => void; onCopyWebhook: () => void
    webhookCopied: boolean; showSecrets: boolean; onToggleSecrets: () => void
}) {
    const meta = getMeta(p.provider_type)
    const health = HEALTH[p.health_status] ?? HEALTH.unknown
    const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/email/${p.provider_type}` : ''
    const bounceRate = p.total_sent > 0 ? ((p.total_bounced / p.total_sent) * 100).toFixed(2) : '0'

    return (
        <Reorder.Item value={p} className="list-none">
            <div className={`premium-card !p-0 overflow-hidden transition-all duration-200 ${p.is_active ? 'border-success/20' : 'opacity-80'} ${isExpanded ? 'border-accent/30' : ''}`}>
                {/* Header row */}
                <div className="flex items-center gap-3 px-5 py-4">
                    {/* Drag handle */}
                    <div className="cursor-grab active:cursor-grabbing text-textTertiary hover:text-textSecondary transition-colors" title="Drag to reorder priority">
                        <GripVertical className="w-5 h-5" />
                    </div>

                    {/* Provider icon + info */}
                    <div className={`w-10 h-10 rounded-lg ${meta.bg} flex items-center justify-center text-xl flex-shrink-0`}>
                        {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-textPrimary truncate">{p.display_name}</span>
                            <span className={`text-xs font-mono ${meta.color}`}>{meta.label}</span>
                            {p.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-semibold uppercase">Default</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-textTertiary">
                            {p.scope === 'global'
                                ? <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Global</span>
                                : <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {p.partner_id?.slice(0, 8)}...</span>}
                            <span className="flex items-center gap-1"><Send className="w-3 h-3" /> {p.total_sent.toLocaleString()} sent</span>
                            <span>Priority: {p.priority}</span>
                        </div>
                    </div>

                    {/* Status indicators */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${health.bg} ${health.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
                            {health.label}
                        </span>
                        <button onClick={e => { e.stopPropagation(); onToggleActive() }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${p.is_active ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-surface border border-border text-textTertiary hover:text-textPrimary'}`}
                            title={p.is_active ? 'Click to deactivate' : 'Click to activate'}>
                            {p.is_active ? <><Power className="w-3 h-3" /> Active</> : <><PowerOff className="w-3 h-3" /> Off</>}
                        </button>
                    </div>

                    {/* Expand */}
                    <button onClick={onToggleExpand} className="btn btn-ghost btn-icon btn-sm">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>

                {/* Expanded panel */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                            className="border-t border-border/40 overflow-hidden">
                            <div className="px-5 py-4 space-y-4">
                                {/* Metrics row */}
                                <div className="grid grid-cols-5 gap-3">
                                    {[
                                        { label: 'Sent', value: p.total_sent.toLocaleString(), color: 'text-accent' },
                                        { label: 'Bounced', value: p.total_bounced.toLocaleString(), color: 'text-error' },
                                        { label: 'Complaints', value: p.total_complained.toLocaleString(), color: 'text-warning' },
                                        { label: 'Bounce Rate', value: `${bounceRate}%`, color: Number(bounceRate) > 3 ? 'text-error' : 'text-success' },
                                        { label: 'Max/Day', value: p.max_sends_per_day?.toLocaleString() ?? '∞', color: 'text-textSecondary' },
                                    ].map(m => (
                                        <div key={m.label} className="bg-background rounded-lg p-3 text-center">
                                            <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                                            <p className="text-[10px] text-textTertiary uppercase tracking-wider">{m.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Connection info */}
                                <div className="bg-background rounded-lg p-3 space-y-1.5 text-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">Connection</span>
                                        <button onClick={onToggleSecrets} className="text-xs text-textTertiary hover:text-textPrimary flex items-center gap-1 transition-colors">
                                            {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            {showSecrets ? 'Hide' : 'Show'} secrets
                                        </button>
                                    </div>
                                    {p.api_base_url && <div className="text-textSecondary">API: <code className="text-xs bg-surface px-1.5 py-0.5 rounded font-mono">{p.api_base_url}</code></div>}
                                    {p.api_key && <div className="text-textSecondary">Key: <code className="text-xs bg-surface px-1.5 py-0.5 rounded font-mono">{showSecrets ? p.api_key : '••••••••'}</code></div>}
                                    {p.smtp_host && <div className="text-textSecondary">SMTP: <code className="text-xs bg-surface px-1.5 py-0.5 rounded font-mono">{p.smtp_host}:{p.smtp_port} ({p.smtp_encryption})</code></div>}
                                    {p.last_health_check && <div className="text-textTertiary text-xs">Last check: {new Date(p.last_health_check).toLocaleString()}</div>}
                                </div>

                                {/* Webhook URL (auto-generated, one-click copy) */}
                                {getMeta(p.provider_type).capabilities.webhooks && (
                                    <div className="bg-background rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">Webhook URL</span>
                                            <span className="text-[10px] text-textTertiary">Point your provider here to receive events</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 text-xs font-mono bg-surface border border-border rounded-lg px-3 py-2 text-textPrimary truncate">{webhookUrl}</code>
                                            <button onClick={onCopyWebhook} className="btn btn-ghost btn-sm flex items-center gap-1 text-xs flex-shrink-0">
                                                {webhookCopied ? <><CheckCircle className="w-3.5 h-3.5 text-success" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Warmup */}
                                <div className="flex items-center gap-4 text-xs text-textTertiary bg-background rounded-lg p-3">
                                    <span className="font-semibold text-textSecondary">Warmup:</span>
                                    <span>{p.warmup_enabled ? '✓ Enabled' : '✗ Disabled'}</span>
                                    <span>Start: {p.warmup_start_volume}/day</span>
                                    <span>+{p.warmup_increment_pct}%/day</span>
                                    <span>Target: {p.warmup_target_days} days</span>
                                </div>

                                {p.notes && <div className="text-xs text-textTertiary bg-background rounded-lg p-3"><strong>Notes:</strong> {p.notes}</div>}

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-1">
                                    <button onClick={onTest} disabled={isTesting}
                                        className="btn btn-sm flex items-center gap-1 bg-info/10 text-info hover:bg-info/20 transition-all disabled:opacity-50">
                                        {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" />}
                                        Test Connection
                                    </button>
                                    <button onClick={onEdit} className="btn btn-ghost btn-sm flex items-center gap-1">
                                        <Settings className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    <div className="flex-1" />
                                    <button onClick={onDelete} className="btn btn-ghost btn-sm text-error hover:bg-error/10 flex items-center gap-1">
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Reorder.Item>
    )
}

// ═════════════════════════════════════════════════════════════════
// FORM MODAL
// ═════════════════════════════════════════════════════════════════

function ProviderFormModal({ form, setForm, editingId, saving, orgs, onSubmit, onClose }: {
    form: typeof EMPTY_FORM; setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>
    editingId: string | null; saving: boolean; orgs: Org[]
    onSubmit: () => void; onClose: () => void
}) {
    const meta = getMeta(form.provider_type)
    const [tab, setTab] = useState<'basics' | 'credentials' | 'limits'>('basics')
    const needsSmtp = form.provider_type === 'smtp' || form.provider_type === 'custom'

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog" aria-modal="true">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{meta.icon}</span>
                        <div>
                            <h2 className="text-xl font-bold text-textPrimary">{editingId ? 'Edit' : 'Add'} Email Provider</h2>
                            <p className="text-sm text-textSecondary">{meta.label} — {meta.description}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-icon"><X className="w-5 h-5" /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border px-6 flex-shrink-0">
                    {([
                        { id: 'basics', label: 'Basics', icon: Server },
                        { id: 'credentials', label: 'Credentials', icon: Shield },
                        { id: 'limits', label: 'Limits & Warmup', icon: Zap },
                    ] as const).map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${tab === t.id ? 'border-accent text-accent' : 'border-transparent text-textSecondary hover:text-textPrimary'}`}>
                            <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {tab === 'basics' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="label-sm">Display Name *</label>
                                    <input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="e.g. Production MailWizz" className="input w-full" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-sm">Provider Type *</label>
                                    <select value={form.provider_type} onChange={e => setForm(f => ({ ...f, provider_type: e.target.value }))} className="input w-full">
                                        {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="label-sm">Scope</label>
                                    <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value as 'organization' | 'global' }))} className="input w-full">
                                        <option value="organization">Per Organization</option>
                                        <option value="global">Global (all orgs)</option>
                                    </select>
                                </div>
                                {form.scope === 'organization' && (
                                    <div className="space-y-1.5">
                                        <label className="label-sm">Organization *</label>
                                        <select value={form.partner_id} onChange={e => setForm(f => ({ ...f, partner_id: e.target.value }))} className="input w-full">
                                            <option value="">Select...</option>
                                            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="label-sm">Priority (higher = preferred)</label>
                                    <input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} className="input w-full" />
                                </div>
                                <div className="flex items-center gap-6 pt-6">
                                    <label className="flex items-center gap-2 text-sm text-textPrimary cursor-pointer">
                                        <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded border-border" />
                                        Active
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-textPrimary cursor-pointer">
                                        <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} className="rounded border-border" />
                                        Default
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="label-sm">Notes</label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="input w-full resize-none" />
                            </div>
                        </>
                    )}

                    {tab === 'credentials' && (
                        <>
                            <div className="p-3 rounded-xl bg-info/5 border border-info/20 text-sm text-textSecondary flex items-start gap-2">
                                <Info className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
                                {editingId ? 'Leave fields blank to keep existing secrets.' : 'Enter credentials for this provider.'}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="label-sm">API Base URL</label>
                                    <input type="url" value={form.api_base_url} onChange={e => setForm(f => ({ ...f, api_base_url: e.target.value }))} placeholder="https://api.provider.com/v1" className="input w-full font-mono text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-sm">API Key</label>
                                    <input type="password" value={form.api_key} onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} placeholder={editingId ? '(unchanged)' : 'Enter key'} className="input w-full font-mono text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-sm">API Secret</label>
                                    <input type="password" value={form.api_secret} onChange={e => setForm(f => ({ ...f, api_secret: e.target.value }))} placeholder={editingId ? '(unchanged)' : ''} className="input w-full font-mono text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-sm">API Token / Bearer</label>
                                    <input type="password" value={form.api_token} onChange={e => setForm(f => ({ ...f, api_token: e.target.value }))} placeholder={editingId ? '(unchanged)' : ''} className="input w-full font-mono text-sm" />
                                </div>
                            </div>

                            {needsSmtp && (
                                <>
                                    <h4 className="text-sm font-semibold text-textPrimary flex items-center gap-2 pt-2"><Mail className="w-4 h-4 text-accent" /> SMTP</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="label-sm">Host</label>
                                            <input value={form.smtp_host} onChange={e => setForm(f => ({ ...f, smtp_host: e.target.value }))} placeholder="smtp.example.com" className="input w-full font-mono text-sm" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="label-sm">Port</label>
                                                <input type="number" value={form.smtp_port} onChange={e => setForm(f => ({ ...f, smtp_port: parseInt(e.target.value) || 587 }))} className="input w-full" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="label-sm">Encryption</label>
                                                <select value={form.smtp_encryption} onChange={e => setForm(f => ({ ...f, smtp_encryption: e.target.value }))} className="input w-full">
                                                    <option value="tls">TLS</option><option value="ssl">SSL</option><option value="starttls">STARTTLS</option><option value="none">None</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="label-sm">Username</label>
                                            <input value={form.smtp_username} onChange={e => setForm(f => ({ ...f, smtp_username: e.target.value }))} className="input w-full font-mono text-sm" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="label-sm">Password</label>
                                            <input type="password" value={form.smtp_password} onChange={e => setForm(f => ({ ...f, smtp_password: e.target.value }))} className="input w-full font-mono text-sm" />
                                        </div>
                                    </div>
                                </>
                            )}

                            <h4 className="text-sm font-semibold text-textPrimary flex items-center gap-2 pt-2"><Zap className="w-4 h-4 text-warning" /> Webhook</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="label-sm">Webhook URL</label>
                                    <input type="url" value={form.webhook_url} onChange={e => setForm(f => ({ ...f, webhook_url: e.target.value }))} placeholder={`https://your-app.com/api/webhooks/email/${form.provider_type}`} className="input w-full font-mono text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-sm">Webhook Secret</label>
                                    <input type="password" value={form.webhook_secret} onChange={e => setForm(f => ({ ...f, webhook_secret: e.target.value }))} placeholder={editingId ? '(unchanged)' : ''} className="input w-full font-mono text-sm" />
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'limits' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="label-sm">Max Sends / Day</label>
                                    <input type="number" value={form.max_sends_per_day} onChange={e => setForm(f => ({ ...f, max_sends_per_day: parseInt(e.target.value) || 0 }))} className="input w-full" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-sm">Max Sends / Hour</label>
                                    <input type="number" value={form.max_sends_per_hour} onChange={e => setForm(f => ({ ...f, max_sends_per_hour: parseInt(e.target.value) || 0 }))} className="input w-full" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-sm">Max Batch Size</label>
                                    <input type="number" value={form.max_batch_size} onChange={e => setForm(f => ({ ...f, max_batch_size: parseInt(e.target.value) || 500 }))} className="input w-full" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="label-sm">Rate Limit / Second</label>
                                    <input type="number" value={form.rate_limit_per_second} onChange={e => setForm(f => ({ ...f, rate_limit_per_second: parseInt(e.target.value) || 10 }))} className="input w-full" />
                                </div>
                            </div>

                            <h4 className="text-sm font-semibold text-textPrimary flex items-center gap-2 pt-2"><RefreshCw className="w-4 h-4 text-success" /> Warmup</h4>
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-sm text-textPrimary cursor-pointer">
                                    <input type="checkbox" checked={form.warmup_enabled} onChange={e => setForm(f => ({ ...f, warmup_enabled: e.target.checked }))} className="rounded border-border" />
                                    Enable warmup ramp for new satellites
                                </label>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="label-sm">Start Volume</label>
                                        <input type="number" value={form.warmup_start_volume} onChange={e => setForm(f => ({ ...f, warmup_start_volume: parseInt(e.target.value) || 50 }))} className="input w-full" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="label-sm">Daily Increment %</label>
                                        <input type="number" value={form.warmup_increment_pct} onChange={e => setForm(f => ({ ...f, warmup_increment_pct: parseInt(e.target.value) || 20 }))} className="input w-full" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="label-sm">Target Days</label>
                                        <input type="number" value={form.warmup_target_days} onChange={e => setForm(f => ({ ...f, warmup_target_days: parseInt(e.target.value) || 21 }))} className="input w-full" />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border flex-shrink-0">
                    <div />
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                        <button onClick={onSubmit} className="btn btn-primary" disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {editingId ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}

// ═════════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═════════════════════════════════════════════════════════════════

function Badge({ label, active }: { label: string; active?: boolean }) {
    return (
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${active ? 'bg-success/10 text-success' : 'bg-surface text-textTertiary'}`}>
            {label}
        </span>
    )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="premium-card flex flex-col items-center justify-center py-20 text-center border-dashed">
            <Mail className="w-16 h-16 text-textTertiary mb-4" aria-hidden />
            <h3 className="text-xl font-bold text-textPrimary mb-2">No email providers configured</h3>
            <p className="text-textSecondary mb-4 max-w-sm">Add a provider to start sending emails. Market Writer needs at least one active provider to deliver campaigns.</p>
            <button onClick={onAdd} className="btn btn-primary"><Plus className="w-4 h-4" /> Add first provider</button>
        </div>
    )
}
