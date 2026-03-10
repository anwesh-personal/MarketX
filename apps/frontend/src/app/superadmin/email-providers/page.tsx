'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Mail, Plus, Settings, Trash2, Power, PowerOff, TestTube,
    Globe, Building2, ChevronDown, ChevronUp, Loader2, Check,
    AlertTriangle, X, RefreshCw, Shield, Zap, Server,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PROVIDER_TYPES = [
    { value: 'mailwizz', label: 'Mailwizz', color: 'text-blue-400' },
    { value: 'mailgun', label: 'Mailgun', color: 'text-red-400' },
    { value: 'ses', label: 'Amazon SES', color: 'text-orange-400' },
    { value: 'sendgrid', label: 'SendGrid', color: 'text-cyan-400' },
    { value: 'postmark', label: 'Postmark', color: 'text-yellow-400' },
    { value: 'sparkpost', label: 'SparkPost', color: 'text-purple-400' },
    { value: 'smtp', label: 'Custom SMTP', color: 'text-green-400' },
    { value: 'custom', label: 'Custom / Other', color: 'text-gray-400' },
] as const;

const HEALTH_BADGES: Record<string, { bg: string; text: string; label: string }> = {
    healthy: { bg: 'bg-success/20', text: 'text-success', label: 'Healthy' },
    degraded: { bg: 'bg-warning/20', text: 'text-warning', label: 'Degraded' },
    down: { bg: 'bg-danger/20', text: 'text-danger', label: 'Down' },
    unknown: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Unknown' },
};

interface Provider {
    id: string;
    partner_id: string | null;
    scope: string;
    provider_type: string;
    display_name: string;
    is_active: boolean;
    is_default: boolean;
    priority: number;
    api_base_url: string | null;
    api_key: string | null;
    smtp_host: string | null;
    smtp_port: number | null;
    smtp_encryption: string | null;
    webhook_url: string | null;
    webhook_events: string[];
    provider_settings: Record<string, any>;
    max_sends_per_day: number | null;
    max_sends_per_hour: number | null;
    max_batch_size: number;
    rate_limit_per_second: number;
    warmup_enabled: boolean;
    warmup_start_volume: number;
    warmup_increment_pct: number;
    warmup_target_days: number;
    health_status: string;
    consecutive_failures: number;
    last_health_check: string | null;
    total_sent: number;
    total_bounced: number;
    total_complained: number;
    notes: string | null;
    created_at: string;
}

interface Org {
    id: string;
    name: string;
}

const EMPTY_FORM = {
    partner_id: '',
    scope: 'organization' as const,
    provider_type: 'mailwizz',
    display_name: '',
    is_active: false,
    is_default: false,
    priority: 0,
    api_base_url: '',
    api_key: '',
    api_secret: '',
    api_token: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_encryption: 'tls',
    webhook_url: '',
    webhook_secret: '',
    webhook_events: [] as string[],
    provider_settings: {} as Record<string, any>,
    max_sends_per_day: 50000,
    max_sends_per_hour: 5000,
    max_batch_size: 500,
    rate_limit_per_second: 10,
    warmup_enabled: true,
    warmup_start_volume: 50,
    warmup_increment_pct: 20,
    warmup_target_days: 21,
    notes: '',
};

export default function EmailProvidersPage() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState<string | null>(null);
    const [filterScope, setFilterScope] = useState<string>('all');

    const loadProviders = useCallback(async () => {
        try {
            const res = await fetch('/api/superadmin/providers');
            const data = await res.json();
            if (data.providers) setProviders(data.providers);
        } catch { toast.error('Failed to load providers'); }
        finally { setLoading(false); }
    }, []);

    const loadOrgs = useCallback(async () => {
        try {
            const res = await fetch('/api/superadmin/organizations');
            const data = await res.json();
            if (data.organizations) setOrgs(data.organizations);
        } catch { /* orgs optional */ }
    }, []);

    useEffect(() => { loadProviders(); loadOrgs(); }, [loadProviders, loadOrgs]);

    const handleSubmit = async () => {
        if (!form.display_name || !form.provider_type) {
            toast.error('Display name and provider type are required');
            return;
        }
        if (form.scope === 'organization' && !form.partner_id) {
            toast.error('Organization is required for org-scoped providers');
            return;
        }

        setSaving(true);
        try {
            const payload: any = { ...form };
            if (form.scope === 'global') payload.partner_id = null;
            if (!payload.api_base_url) payload.api_base_url = null;
            if (!payload.api_key) payload.api_key = null;
            if (!payload.api_secret) payload.api_secret = null;
            if (!payload.api_token) payload.api_token = null;
            if (!payload.webhook_url) payload.webhook_url = null;
            if (!payload.webhook_secret) payload.webhook_secret = null;
            if (!payload.smtp_host) payload.smtp_host = null;
            if (!payload.notes) payload.notes = null;

            const url = editingId ? `/api/superadmin/providers/${editingId}` : '/api/superadmin/providers';
            const method = editingId ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');

            toast.success(editingId ? 'Provider updated' : 'Provider created');
            setShowForm(false);
            setEditingId(null);
            setForm(EMPTY_FORM);
            loadProviders();
        } catch (err: any) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    const handleTest = async (id: string) => {
        setTesting(id);
        try {
            const res = await fetch(`/api/superadmin/providers/${id}/test`, { method: 'POST' });
            const data = await res.json();
            if (data.test_result?.success) {
                toast.success(`Connection OK (${data.test_result.latency_ms}ms)`);
            } else {
                toast.error(`Test failed: ${data.test_result?.message ?? 'Unknown error'}`);
            }
            loadProviders();
        } catch { toast.error('Test request failed'); }
        finally { setTesting(null); }
    };

    const handleToggleActive = async (p: Provider) => {
        try {
            const res = await fetch(`/api/superadmin/providers/${p.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !p.is_active }),
            });
            if (!res.ok) throw new Error('Toggle failed');
            toast.success(p.is_active ? 'Provider deactivated' : 'Provider activated');
            loadProviders();
        } catch { toast.error('Failed to toggle provider'); }
    };

    const handleDelete = async (p: Provider) => {
        if (!confirm(`Delete provider "${p.display_name}"? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/superadmin/providers/${p.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Delete failed');
            toast.success('Provider deleted');
            loadProviders();
        } catch (err: any) { toast.error(err.message); }
    };

    const startEdit = (p: Provider) => {
        setForm({
            partner_id: p.partner_id ?? '',
            scope: p.scope as any,
            provider_type: p.provider_type,
            display_name: p.display_name,
            is_active: p.is_active,
            is_default: p.is_default,
            priority: p.priority,
            api_base_url: p.api_base_url ?? '',
            api_key: '',
            api_secret: '',
            api_token: '',
            smtp_host: p.smtp_host ?? '',
            smtp_port: p.smtp_port ?? 587,
            smtp_username: '',
            smtp_password: '',
            smtp_encryption: p.smtp_encryption ?? 'tls',
            webhook_url: p.webhook_url ?? '',
            webhook_secret: '',
            webhook_events: p.webhook_events ?? [],
            provider_settings: p.provider_settings ?? {},
            max_sends_per_day: p.max_sends_per_day ?? 50000,
            max_sends_per_hour: p.max_sends_per_hour ?? 5000,
            max_batch_size: p.max_batch_size,
            rate_limit_per_second: p.rate_limit_per_second,
            warmup_enabled: p.warmup_enabled,
            warmup_start_volume: p.warmup_start_volume,
            warmup_increment_pct: p.warmup_increment_pct,
            warmup_target_days: p.warmup_target_days,
            notes: p.notes ?? '',
        });
        setEditingId(p.id);
        setShowForm(true);
    };

    const filteredProviders = filterScope === 'all'
        ? providers
        : providers.filter(p => p.scope === filterScope);

    const getProviderMeta = (type: string) =>
        PROVIDER_TYPES.find(t => t.value === type) ?? { value: type, label: type, color: 'text-gray-400' };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-lg">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">Email Provider Management</h1>
                    <p className="text-textSecondary">Configure and manage email sending providers per organization or globally</p>
                </div>
                <div className="flex items-center gap-sm">
                    <button onClick={loadProviders} className="flex items-center gap-xs bg-surface border border-border text-textSecondary px-md py-sm rounded-[var(--radius-md)] hover:text-textPrimary transition-all">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                    <button
                        onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }}
                        className="flex items-center gap-xs bg-primary text-white px-md py-sm rounded-[var(--radius-md)] font-medium hover:opacity-90 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add Provider
                    </button>
                </div>
            </div>

            {/* Scope Filter */}
            <div className="flex items-center gap-xs">
                {['all', 'global', 'organization'].map(s => (
                    <button key={s} onClick={() => setFilterScope(s)}
                        className={`px-md py-xs rounded-[var(--radius-md)] text-sm font-medium transition-all ${
                            filterScope === s
                                ? 'bg-primary text-white'
                                : 'bg-surface border border-border text-textSecondary hover:text-textPrimary'
                        }`}
                    >
                        {s === 'all' ? 'All' : s === 'global' ? 'Global' : 'Per-Org'}
                    </button>
                ))}
                <span className="text-xs text-textSecondary ml-sm">{filteredProviders.length} provider(s)</span>
            </div>

            {/* Provider List */}
            <div className="space-y-sm">
                {filteredProviders.length === 0 ? (
                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-xl text-center">
                        <Mail className="w-12 h-12 text-textSecondary mx-auto mb-md opacity-50" />
                        <p className="text-textSecondary">No email providers configured yet</p>
                    </div>
                ) : (
                    filteredProviders.map(p => {
                        const meta = getProviderMeta(p.provider_type);
                        const health = HEALTH_BADGES[p.health_status] ?? HEALTH_BADGES.unknown;
                        const isExpanded = expandedId === p.id;

                        return (
                            <div key={p.id} className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
                                <div className="flex items-center justify-between px-lg py-md cursor-pointer hover:bg-background/50 transition-all"
                                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                                >
                                    <div className="flex items-center gap-md">
                                        <div className={`w-3 h-3 rounded-full ${p.is_active ? 'bg-success' : 'bg-gray-500'}`} />
                                        <div>
                                            <div className="flex items-center gap-sm">
                                                <span className="font-semibold text-textPrimary">{p.display_name}</span>
                                                <span className={`text-xs font-mono ${meta.color}`}>{meta.label}</span>
                                                {p.is_default && <span className="text-xs bg-primary/20 text-primary px-xs rounded">Default</span>}
                                            </div>
                                            <div className="flex items-center gap-md text-xs text-textSecondary mt-xs">
                                                {p.scope === 'global'
                                                    ? <span className="flex items-center gap-xxs"><Globe className="w-3 h-3" /> Global</span>
                                                    : <span className="flex items-center gap-xxs"><Building2 className="w-3 h-3" /> Org: {p.partner_id?.slice(0, 8)}...</span>
                                                }
                                                <span>Priority: {p.priority}</span>
                                                <span>Sent: {p.total_sent.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-sm">
                                        <span className={`px-xs py-xxs rounded-full text-xs font-medium ${health.bg} ${health.text}`}>
                                            {health.label}
                                        </span>
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-textSecondary" /> : <ChevronDown className="w-4 h-4 text-textSecondary" />}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-border px-lg py-md space-y-md">
                                        {/* Stats Row */}
                                        <div className="grid grid-cols-4 gap-md">
                                            <div className="bg-background rounded-[var(--radius-md)] p-sm">
                                                <div className="text-xs text-textSecondary">Max/Day</div>
                                                <div className="text-lg font-bold text-textPrimary">{p.max_sends_per_day?.toLocaleString() ?? '∞'}</div>
                                            </div>
                                            <div className="bg-background rounded-[var(--radius-md)] p-sm">
                                                <div className="text-xs text-textSecondary">Max/Hour</div>
                                                <div className="text-lg font-bold text-textPrimary">{p.max_sends_per_hour?.toLocaleString() ?? '∞'}</div>
                                            </div>
                                            <div className="bg-background rounded-[var(--radius-md)] p-sm">
                                                <div className="text-xs text-textSecondary">Bounced</div>
                                                <div className="text-lg font-bold text-danger">{p.total_bounced.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-background rounded-[var(--radius-md)] p-sm">
                                                <div className="text-xs text-textSecondary">Complaints</div>
                                                <div className="text-lg font-bold text-warning">{p.total_complained.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        {/* Warmup Config */}
                                        <div className="bg-background rounded-[var(--radius-md)] p-sm">
                                            <div className="text-xs text-textSecondary mb-xs font-medium">Warmup Configuration</div>
                                            <div className="flex items-center gap-lg text-sm">
                                                <span>Enabled: <strong className={p.warmup_enabled ? 'text-success' : 'text-gray-400'}>{p.warmup_enabled ? 'Yes' : 'No'}</strong></span>
                                                <span>Start Volume: <strong>{p.warmup_start_volume}</strong></span>
                                                <span>Increment: <strong>{p.warmup_increment_pct}%/day</strong></span>
                                                <span>Target Days: <strong>{p.warmup_target_days}</strong></span>
                                            </div>
                                        </div>

                                        {/* Connection Info */}
                                        <div className="bg-background rounded-[var(--radius-md)] p-sm">
                                            <div className="text-xs text-textSecondary mb-xs font-medium">Connection</div>
                                            <div className="text-sm text-textPrimary space-y-xxs">
                                                {p.api_base_url && <div>API URL: <code className="text-xs bg-black/20 px-xs rounded">{p.api_base_url}</code></div>}
                                                {p.api_key && <div>API Key: <code className="text-xs bg-black/20 px-xs rounded">{p.api_key}</code></div>}
                                                {p.smtp_host && <div>SMTP: <code className="text-xs bg-black/20 px-xs rounded">{p.smtp_host}:{p.smtp_port} ({p.smtp_encryption})</code></div>}
                                                {p.webhook_url && <div>Webhook: <code className="text-xs bg-black/20 px-xs rounded">{p.webhook_url}</code></div>}
                                                {p.last_health_check && <div className="text-xs text-textSecondary">Last check: {new Date(p.last_health_check).toLocaleString()}</div>}
                                            </div>
                                        </div>

                                        {p.notes && (
                                            <div className="text-xs text-textSecondary bg-background rounded-[var(--radius-md)] p-sm">
                                                <strong>Notes:</strong> {p.notes}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center gap-sm pt-sm border-t border-border">
                                            <button onClick={(e) => { e.stopPropagation(); handleTest(p.id); }}
                                                disabled={testing === p.id}
                                                className="flex items-center gap-xs bg-info/20 text-info px-md py-xs rounded-[var(--radius-md)] text-sm font-medium hover:bg-info/30 disabled:opacity-50 transition-all"
                                            >
                                                {testing === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" />}
                                                Test Connection
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); startEdit(p); }}
                                                className="flex items-center gap-xs bg-surface border border-border text-textSecondary px-md py-xs rounded-[var(--radius-md)] text-sm hover:text-textPrimary transition-all"
                                            >
                                                <Settings className="w-3.5 h-3.5" /> Edit
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleToggleActive(p); }}
                                                className={`flex items-center gap-xs px-md py-xs rounded-[var(--radius-md)] text-sm font-medium transition-all ${
                                                    p.is_active ? 'bg-warning/20 text-warning hover:bg-warning/30' : 'bg-success/20 text-success hover:bg-success/30'
                                                }`}
                                            >
                                                {p.is_active ? <><PowerOff className="w-3.5 h-3.5" /> Deactivate</> : <><Power className="w-3.5 h-3.5" /> Activate</>}
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                                                className="flex items-center gap-xs bg-danger/20 text-danger px-md py-xs rounded-[var(--radius-md)] text-sm hover:bg-danger/30 transition-all ml-auto"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create/Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-[5vh] overflow-y-auto">
                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] w-full max-w-3xl mx-md mb-lg shadow-2xl">
                        <div className="flex items-center justify-between px-lg py-md border-b border-border">
                            <h2 className="text-xl font-bold text-textPrimary">
                                {editingId ? 'Edit Provider' : 'Add Email Provider'}
                            </h2>
                            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                                className="text-textSecondary hover:text-textPrimary transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-lg py-md space-y-lg max-h-[70vh] overflow-y-auto">
                            {/* Basic Info */}
                            <section className="space-y-md">
                                <h3 className="text-md font-semibold text-textPrimary flex items-center gap-sm"><Server className="w-4 h-4 text-primary" /> Basic Configuration</h3>
                                <div className="grid grid-cols-2 gap-md">
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">Display Name *</label>
                                        <input type="text" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })}
                                            placeholder="e.g. Production Mailwizz"
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">Provider Type *</label>
                                        <select value={form.provider_type} onChange={e => setForm({ ...form, provider_type: e.target.value })}
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus">
                                            {PROVIDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">Scope</label>
                                        <select value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value as any })}
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus">
                                            <option value="organization">Organization-specific</option>
                                            <option value="global">Global (platform-wide)</option>
                                        </select>
                                    </div>
                                    {form.scope === 'organization' && (
                                        <div>
                                            <label className="block text-sm font-medium text-textPrimary mb-xs">Organization *</label>
                                            <select value={form.partner_id} onChange={e => setForm({ ...form, partner_id: e.target.value })}
                                                className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus">
                                                <option value="">Select organization...</option>
                                                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">Priority (higher = preferred)</label>
                                        <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                    <div className="flex items-center gap-lg pt-md">
                                        <label className="flex items-center gap-xs text-sm text-textPrimary">
                                            <input type="checkbox" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} className="rounded border-border" />
                                            Default Provider
                                        </label>
                                        <label className="flex items-center gap-xs text-sm text-textPrimary">
                                            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded border-border" />
                                            Active
                                        </label>
                                    </div>
                                </div>
                            </section>

                            {/* API Credentials */}
                            <section className="space-y-md">
                                <h3 className="text-md font-semibold text-textPrimary flex items-center gap-sm"><Shield className="w-4 h-4 text-warning" /> API Credentials</h3>
                                <div className="grid grid-cols-2 gap-md">
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">API Base URL</label>
                                        <input type="url" value={form.api_base_url} onChange={e => setForm({ ...form, api_base_url: e.target.value })}
                                            placeholder="https://api.mailwizz.example.com/v1"
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">API Key</label>
                                        <input type="password" value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })}
                                            placeholder={editingId ? '(leave blank to keep existing)' : 'Enter API key'}
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">API Secret</label>
                                        <input type="password" value={form.api_secret} onChange={e => setForm({ ...form, api_secret: e.target.value })}
                                            placeholder={editingId ? '(leave blank to keep existing)' : ''}
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">API Token / Bearer</label>
                                        <input type="password" value={form.api_token} onChange={e => setForm({ ...form, api_token: e.target.value })}
                                            placeholder={editingId ? '(leave blank to keep existing)' : ''}
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                </div>
                            </section>

                            {/* SMTP (conditional) */}
                            {(form.provider_type === 'smtp' || form.provider_type === 'custom') && (
                                <section className="space-y-md">
                                    <h3 className="text-md font-semibold text-textPrimary flex items-center gap-sm"><Mail className="w-4 h-4 text-info" /> SMTP Configuration</h3>
                                    <div className="grid grid-cols-2 gap-md">
                                        <div>
                                            <label className="block text-sm font-medium text-textPrimary mb-xs">SMTP Host</label>
                                            <input type="text" value={form.smtp_host} onChange={e => setForm({ ...form, smtp_host: e.target.value })}
                                                className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-sm">
                                            <div>
                                                <label className="block text-sm font-medium text-textPrimary mb-xs">Port</label>
                                                <input type="number" value={form.smtp_port} onChange={e => setForm({ ...form, smtp_port: parseInt(e.target.value) || 587 })}
                                                    className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-textPrimary mb-xs">Encryption</label>
                                                <select value={form.smtp_encryption} onChange={e => setForm({ ...form, smtp_encryption: e.target.value })}
                                                    className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus">
                                                    <option value="tls">TLS</option>
                                                    <option value="ssl">SSL</option>
                                                    <option value="starttls">STARTTLS</option>
                                                    <option value="none">None</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-textPrimary mb-xs">Username</label>
                                            <input type="text" value={form.smtp_username} onChange={e => setForm({ ...form, smtp_username: e.target.value })}
                                                className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-textPrimary mb-xs">Password</label>
                                            <input type="password" value={form.smtp_password} onChange={e => setForm({ ...form, smtp_password: e.target.value })}
                                                className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Webhook */}
                            <section className="space-y-md">
                                <h3 className="text-md font-semibold text-textPrimary flex items-center gap-sm"><Zap className="w-4 h-4 text-accent" /> Webhook Configuration</h3>
                                <div className="grid grid-cols-2 gap-md">
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">Webhook URL (for this provider to call back)</label>
                                        <input type="url" value={form.webhook_url} onChange={e => setForm({ ...form, webhook_url: e.target.value })}
                                            placeholder="https://your-app.com/api/webhooks/email/mailwizz"
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">Webhook Secret</label>
                                        <input type="password" value={form.webhook_secret} onChange={e => setForm({ ...form, webhook_secret: e.target.value })}
                                            placeholder={editingId ? '(leave blank to keep existing)' : ''}
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                </div>
                            </section>

                            {/* Operational Limits */}
                            <section className="space-y-md">
                                <h3 className="text-md font-semibold text-textPrimary flex items-center gap-sm"><Zap className="w-4 h-4 text-danger" /> Operational Limits</h3>
                                <div className="grid grid-cols-2 gap-md">
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">Max Sends / Day</label>
                                        <input type="number" value={form.max_sends_per_day} onChange={e => setForm({ ...form, max_sends_per_day: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">Max Sends / Hour</label>
                                        <input type="number" value={form.max_sends_per_hour} onChange={e => setForm({ ...form, max_sends_per_hour: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">Max Batch Size</label>
                                        <input type="number" value={form.max_batch_size} onChange={e => setForm({ ...form, max_batch_size: parseInt(e.target.value) || 500 })}
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">Rate Limit / Second</label>
                                        <input type="number" value={form.rate_limit_per_second} onChange={e => setForm({ ...form, rate_limit_per_second: parseInt(e.target.value) || 10 })}
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                </div>
                            </section>

                            {/* Warmup */}
                            <section className="space-y-md">
                                <h3 className="text-md font-semibold text-textPrimary flex items-center gap-sm"><RefreshCw className="w-4 h-4 text-success" /> Warmup Configuration</h3>
                                <div className="grid grid-cols-2 gap-md">
                                    <div className="col-span-2">
                                        <label className="flex items-center gap-xs text-sm text-textPrimary">
                                            <input type="checkbox" checked={form.warmup_enabled} onChange={e => setForm({ ...form, warmup_enabled: e.target.checked })} className="rounded border-border" />
                                            Enable warmup ramp for new satellites using this provider
                                        </label>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">Start Volume (emails/day)</label>
                                        <input type="number" value={form.warmup_start_volume} onChange={e => setForm({ ...form, warmup_start_volume: parseInt(e.target.value) || 50 })}
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">Daily Increment (%)</label>
                                        <input type="number" value={form.warmup_increment_pct} onChange={e => setForm({ ...form, warmup_increment_pct: parseInt(e.target.value) || 20 })}
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-textPrimary mb-xs">Target Days</label>
                                        <input type="number" value={form.warmup_target_days} onChange={e => setForm({ ...form, warmup_target_days: parseInt(e.target.value) || 21 })}
                                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                    </div>
                                </div>
                            </section>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-textPrimary mb-xs">Notes</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                                    className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus resize-none" />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-sm px-lg py-md border-t border-border">
                            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                                className="px-lg py-sm text-textSecondary hover:text-textPrimary transition-all">Cancel</button>
                            <button onClick={handleSubmit} disabled={saving}
                                className="flex items-center gap-xs bg-primary text-white px-lg py-sm rounded-[var(--radius-md)] font-medium hover:opacity-90 disabled:opacity-50 transition-all">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {editingId ? 'Update Provider' : 'Create Provider'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
