'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Settings, Save, RefreshCw, Loader2, Zap, Shield, BarChart3,
    Mail, Target, TrendingUp, AlertTriangle, ChevronDown, ChevronUp,
    Plus, Trash2, Check, X, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SuperadminConfirmDialog } from '@/components/SuperAdmin/surfaces';
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';

interface ConfigRow {
    key: string;
    value: any;
    description: string;
    updated_at?: string;
}

const CATEGORY_META: Record<string, { label: string; icon: any; description: string; color: string }> = {
    send_pacing: {
        label: 'Send Pacing',
        icon: Zap,
        description: 'Daily caps, warmup volume floors, ramp strategy — controls how fast emails go out',
        color: 'text-orange-400',
    },
    deliverability: {
        label: 'Deliverability Thresholds',
        icon: Shield,
        description: 'Bounce rates, complaint rates, reputation penalties, auto-pause triggers',
        color: 'text-red-400',
    },
    domains: {
        label: 'Domain & Satellite Limits',
        icon: Globe,
        description: 'Max domains per org, satellites per domain, warmup duration defaults',
        color: 'text-blue-400',
    },
    confidence: {
        label: 'Confidence Formula',
        icon: BarChart3,
        description: 'Weights for booked call rate, positive reply rate, reply quality, negative rate',
        color: 'text-purple-400',
    },
    allocation: {
        label: 'Allocation Engine',
        icon: TrendingUp,
        description: 'Minimum exploration floor, rebalance step size',
        color: 'text-green-400',
    },
    promotion: {
        label: 'Promotion Gates',
        icon: Target,
        description: 'Minimum sample sizes, confidence thresholds, negative-rate caps for belief promotion',
        color: 'text-cyan-400',
    },
    other: {
        label: 'Other / Custom',
        icon: Settings,
        description: 'Uncategorized platform configuration keys',
        color: 'text-gray-400',
    },
};

function extractDisplayValue(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
        if ('value' in val) return String(val.value);
        if ('weights' in val) return JSON.stringify(val.weights, null, 2);
        return JSON.stringify(val, null, 2);
    }
    return String(val);
}

function extractUnit(val: any): string {
    if (typeof val === 'object' && val?.unit) return val.unit;
    return '';
}

function extractOptions(val: any): string[] {
    if (typeof val === 'object' && Array.isArray(val?.options)) return val.options;
    return [];
}

function buildValuePayload(existing: any, newDisplayVal: string): any {
    if (typeof existing === 'object' && existing !== null && 'weights' in existing) {
        try { return { ...existing, weights: JSON.parse(newDisplayVal) }; } catch { return existing; }
    }
    if (typeof existing === 'object' && existing !== null && 'value' in existing) {
        const num = Number(newDisplayVal);
        return { ...existing, value: isNaN(num) ? newDisplayVal : num };
    }
    const num = Number(newDisplayVal);
    return isNaN(num) ? { value: newDisplayVal } : { value: num };
}

export default function PlatformConfigPage() {
    const { fetchWithAuth } = useSuperadminAuth();
    const [grouped, setGrouped] = useState<Record<string, ConfigRow[]>>({});
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetchWithAuth('/api/superadmin/platform-config');
            const data = await res.json();
            if (data.grouped) setGrouped(data.grouped);
            if (data.categories) setCategories(data.categories);
            setExpandedCats(new Set(data.categories ?? []));
        } catch { toast.error('Failed to load platform config'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleEditChange = (key: string, val: string) => {
        setEdits(prev => ({ ...prev, [key]: val }));
    };

    const handleSaveOne = async (cfg: ConfigRow) => {
        const displayVal = edits[cfg.key];
        if (displayVal === undefined) return;

        setSaving(true);
        try {
            const payload = buildValuePayload(cfg.value, displayVal);
            const res = await fetchWithAuth('/api/superadmin/platform-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: cfg.key, value: payload, description: cfg.description }),
            });
            if (!res.ok) throw new Error('Save failed');
            toast.success(`${cfg.key} updated`);
            setEdits(prev => { const n = { ...prev }; delete n[cfg.key]; return n; });
            load();
        } catch { toast.error('Failed to save'); }
        finally { setSaving(false); }
    };

    const handleSaveAll = async () => {
        const keys = Object.keys(edits);
        if (keys.length === 0) { toast('No changes to save'); return; }

        setSaving(true);
        try {
            const allConfigs = Object.values(grouped).flat();
            const configs = keys.map(k => {
                const existing = allConfigs.find(c => c.key === k);
                return {
                    key: k,
                    value: buildValuePayload(existing?.value, edits[k]),
                    description: existing?.description ?? k,
                };
            });

            const res = await fetchWithAuth('/api/superadmin/platform-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ configs }),
            });
            if (!res.ok) throw new Error('Bulk save failed');
            toast.success(`${keys.length} config(s) updated`);
            setEdits({});
            load();
        } catch { toast.error('Failed to save'); }
        finally { setSaving(false); }
    };

    const handleAddCustom = async () => {
        if (!newKey) { toast.error('Key is required'); return; }
        setSaving(true);
        try {
            const num = Number(newValue);
            const val = isNaN(num) ? { value: newValue } : { value: num };
            const res = await fetchWithAuth('/api/superadmin/platform-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: newKey, value: val, description: newDesc || newKey }),
            });
            if (!res.ok) throw new Error('Creation failed');
            toast.success(`Config "${newKey}" created`);
            setNewKey(''); setNewValue(''); setNewDesc('');
            load();
        } catch { toast.error('Failed to create config'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (key: string) => {
        try {
            const res = await fetchWithAuth(`/api/superadmin/platform-config?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Delete failed');
            toast.success(`${key} deleted`);
            load();
        } catch (err: any) { toast.error(err.message); }
    };

    const toggleCat = (cat: string) => {
        setExpandedCats(prev => {
            const next = new Set(prev);
            next.has(cat) ? next.delete(cat) : next.add(cat);
            return next;
        });
    };

    const dirtyCount = Object.keys(edits).length;

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
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">Platform Configuration</h1>
                    <p className="text-textSecondary">Every operational threshold, limit, and formula weight — controlled from here</p>
                </div>
                <div className="flex items-center gap-sm">
                    <button onClick={load} className="flex items-center gap-xs bg-surface border border-border text-textSecondary px-md py-sm rounded-[var(--radius-md)] hover:text-textPrimary transition-all">
                        <RefreshCw className="w-4 h-4" /> Reload
                    </button>
                    {dirtyCount > 0 && (
                        <button onClick={handleSaveAll} disabled={saving}
                            className="btn btn-primary gap-xs px-md py-sm rounded-[var(--radius-md)] font-medium disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save All ({dirtyCount})
                        </button>
                    )}
                </div>
            </div>

            {dirtyCount > 0 && (
                <div className="bg-warning/10 border border-warning/30 rounded-[var(--radius-md)] px-md py-sm flex items-center gap-sm">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-sm text-warning">{dirtyCount} unsaved change(s). Click &quot;Save All&quot; or save individual configs.</span>
                </div>
            )}

            {/* Category Sections */}
            <div className="space-y-sm">
                {[...categories, ...(grouped.other?.length ? ['other'] : [])].map(cat => {
                    const meta = CATEGORY_META[cat] ?? CATEGORY_META.other;
                    const Icon = meta.icon;
                    const configs = grouped[cat] ?? [];
                    const isExpanded = expandedCats.has(cat);

                    return (
                        <div key={cat} className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
                            <button onClick={() => toggleCat(cat)}
                                className="w-full flex items-center justify-between px-lg py-md hover:bg-background/50 transition-all text-left">
                                <div className="flex items-center gap-md">
                                    <Icon className={`w-5 h-5 ${meta.color}`} />
                                    <div>
                                        <div className="font-semibold text-textPrimary">{meta.label}</div>
                                        <div className="text-xs text-textSecondary">{meta.description}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-sm">
                                    <span className="text-xs text-textSecondary">{configs.length} key(s)</span>
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-textSecondary" /> : <ChevronDown className="w-4 h-4 text-textSecondary" />}
                                </div>
                            </button>

                            {isExpanded && configs.length > 0 && (
                                <div className="border-t border-border">
                                    <table className="w-full">
                                        <thead className="bg-background">
                                            <tr>
                                                <th className="text-left px-lg py-sm text-xs font-semibold text-textSecondary uppercase w-1/3">Key</th>
                                                <th className="text-left px-md py-sm text-xs font-semibold text-textSecondary uppercase w-1/4">Value</th>
                                                <th className="text-left px-md py-sm text-xs font-semibold text-textSecondary uppercase">Unit</th>
                                                <th className="text-left px-md py-sm text-xs font-semibold text-textSecondary uppercase">Description</th>
                                                <th className="text-right px-lg py-sm text-xs font-semibold text-textSecondary uppercase w-24">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {configs.map(cfg => {
                                                const display = extractDisplayValue(cfg.value);
                                                const unit = extractUnit(cfg.value);
                                                const options = extractOptions(cfg.value);
                                                const currentEdit = edits[cfg.key];
                                                const isDirty = currentEdit !== undefined && currentEdit !== display;
                                                const isMultiline = display.includes('\n');

                                                return (
                                                    <tr key={cfg.key} className={`border-t border-border ${isDirty ? 'bg-primary/5' : 'hover:bg-background/50'}`}>
                                                        <td className="px-lg py-sm">
                                                            <code className="text-xs text-textPrimary font-mono">{cfg.key}</code>
                                                        </td>
                                                        <td className="px-md py-sm">
                                                            {options.length > 0 ? (
                                                                <select
                                                                    value={currentEdit ?? display}
                                                                    onChange={e => handleEditChange(cfg.key, e.target.value)}
                                                                    className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-sm)] px-xs py-xxs text-sm focus:outline-none focus:ring-1 focus:ring-borderFocus"
                                                                >
                                                                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                                                                </select>
                                                            ) : isMultiline ? (
                                                                <textarea
                                                                    value={currentEdit ?? display}
                                                                    onChange={e => handleEditChange(cfg.key, e.target.value)}
                                                                    rows={3}
                                                                    className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-sm)] px-xs py-xxs text-xs font-mono focus:outline-none focus:ring-1 focus:ring-borderFocus resize-none"
                                                                />
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={currentEdit ?? display}
                                                                    onChange={e => handleEditChange(cfg.key, e.target.value)}
                                                                    className={`w-full bg-background text-textPrimary border rounded-[var(--radius-sm)] px-xs py-xxs text-sm focus:outline-none focus:ring-1 focus:ring-borderFocus ${
                                                                        isDirty ? 'border-primary' : 'border-border'
                                                                    }`}
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-md py-sm text-xs text-textSecondary">{unit}</td>
                                                        <td className="px-md py-sm text-xs text-textSecondary">{cfg.description}</td>
                                                        <td className="px-lg py-sm text-right">
                                                            <div className="flex items-center justify-end gap-xs">
                                                                {isDirty && (
                                                                    <button onClick={() => handleSaveOne(cfg)} disabled={saving}
                                                                        className="p-xs bg-success/20 text-success rounded hover:bg-success/30 transition-all" title="Save this config">
                                                                        <Check className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                                {isDirty && (
                                                                    <button onClick={() => setEdits(prev => { const n = { ...prev }; delete n[cfg.key]; return n; })}
                                                                        className="p-xs bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/30 transition-all" title="Discard">
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                                <button onClick={() => setPendingDeleteKey(cfg.key)}
                                                                    className="p-xs text-danger/50 hover:text-danger hover:bg-danger/10 rounded transition-all" title="Delete">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add Custom Config */}
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg space-y-md">
                <h3 className="text-md font-semibold text-textPrimary flex items-center gap-sm">
                    <Plus className="w-4 h-4 text-primary" /> Add Custom Config Key
                </h3>
                <div className="grid grid-cols-3 gap-md">
                    <div>
                        <label className="block text-sm font-medium text-textPrimary mb-xs">Key *</label>
                        <input type="text" value={newKey} onChange={e => setNewKey(e.target.value)}
                            placeholder="my_custom_threshold"
                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-textPrimary mb-xs">Value *</label>
                        <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)}
                            placeholder="0.05 or some string"
                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-textPrimary mb-xs">Description</label>
                        <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                            placeholder="What this config controls"
                            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                    </div>
                </div>
                <button onClick={handleAddCustom} disabled={saving || !newKey}
                    className="btn btn-primary gap-xs px-md py-sm rounded-[var(--radius-md)] font-medium disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Config
                </button>
            </div>

            <SuperadminConfirmDialog
                open={Boolean(pendingDeleteKey)}
                title="Delete config key"
                description={`This will permanently remove "${pendingDeleteKey}" from platform configuration. This cannot be undone.`}
                confirmLabel="Delete"
                onCancel={() => setPendingDeleteKey(null)}
                onConfirm={() => {
                    if (pendingDeleteKey) void handleDelete(pendingDeleteKey);
                    setPendingDeleteKey(null);
                }}
            />
        </div>
    );
}
