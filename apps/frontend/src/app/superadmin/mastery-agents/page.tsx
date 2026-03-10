'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Bot, Plus, Settings, Trash2, Power, PowerOff, Play,
    ChevronDown, ChevronUp, Loader2, Check, X, RefreshCw,
    Shield, Zap, Brain, GitBranch, Clock, Target,
    Copy, Code, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
    { value: 'contact', label: 'Contact', color: 'text-blue-400' },
    { value: 'timing', label: 'Timing', color: 'text-green-400' },
    { value: 'angle', label: 'Angle', color: 'text-purple-400' },
    { value: 'pacing', label: 'Pacing', color: 'text-orange-400' },
    { value: 'reply', label: 'Reply', color: 'text-cyan-400' },
    { value: 'buying_role', label: 'Buying Role', color: 'text-pink-400' },
    { value: 'buyer_stage', label: 'Buyer Stage', color: 'text-yellow-400' },
    { value: 'uncertainty', label: 'Uncertainty', color: 'text-red-400' },
    { value: 'sequence', label: 'Sequence', color: 'text-indigo-400' },
    { value: 'custom', label: 'Custom', color: 'text-gray-400' },
];

const PIPELINE_STAGES = ['pre_send', 'post_reply', 'pre_extension', 'periodic', 'on_demand'];

interface Agent {
    id: string; agent_key: string; display_name: string; description: string | null;
    agent_category: string; scope: string; partner_id: string | null;
    version: string; is_active: boolean; is_system: boolean;
    decision_type: string; decision_outputs: string[];
    scoring_rules: any[]; keyword_rules: any[]; field_rules: any[];
    kb_object_types: string[]; kb_min_confidence: number; kb_max_objects: number;
    kb_write_enabled: boolean; kb_write_type: string | null;
    locked_constraints: Record<string, any>;
    pipeline_stage: string | null; pipeline_order: number;
    fallback_output: string | null; confidence_divisor: number;
    created_at: string;
}

export default function MasteryAgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [saving, setSaving] = useState(false);
    const [filterCat, setFilterCat] = useState('all');
    const [testingId, setTestingId] = useState<string | null>(null);
    const [testInput, setTestInput] = useState('{}');
    const [testResult, setTestResult] = useState<any>(null);

    const [form, setForm] = useState({
        agent_key: '', display_name: '', description: '',
        agent_category: 'custom' as string, scope: 'global' as string,
        decision_type: '', decision_outputs: '',
        scoring_rules: '[]', keyword_rules: '[]', field_rules: '[]',
        kb_object_types: '', kb_min_confidence: 0.2, kb_max_objects: 10,
        kb_write_enabled: false, kb_write_type: '',
        locked_constraints: '{}',
        pipeline_stage: '' as string, pipeline_order: 0,
        fallback_output: '', confidence_divisor: 100,
        is_active: true,
    });

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/superadmin/mastery-agents');
            const data = await res.json();
            setAgents(data.agents ?? []);
        } catch { toast.error('Failed to load agents'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const resetForm = () => setForm({
        agent_key: '', display_name: '', description: '',
        agent_category: 'custom', scope: 'global',
        decision_type: '', decision_outputs: '',
        scoring_rules: '[]', keyword_rules: '[]', field_rules: '[]',
        kb_object_types: '', kb_min_confidence: 0.2, kb_max_objects: 10,
        kb_write_enabled: false, kb_write_type: '',
        locked_constraints: '{}',
        pipeline_stage: '', pipeline_order: 0,
        fallback_output: '', confidence_divisor: 100,
        is_active: true,
    });

    const startEdit = (a: Agent) => {
        setForm({
            agent_key: a.agent_key, display_name: a.display_name, description: a.description ?? '',
            agent_category: a.agent_category, scope: a.scope,
            decision_type: a.decision_type, decision_outputs: a.decision_outputs.join(', '),
            scoring_rules: JSON.stringify(a.scoring_rules, null, 2),
            keyword_rules: JSON.stringify(a.keyword_rules, null, 2),
            field_rules: JSON.stringify(a.field_rules, null, 2),
            kb_object_types: a.kb_object_types.join(', '),
            kb_min_confidence: a.kb_min_confidence, kb_max_objects: a.kb_max_objects,
            kb_write_enabled: a.kb_write_enabled, kb_write_type: a.kb_write_type ?? '',
            locked_constraints: JSON.stringify(a.locked_constraints, null, 2),
            pipeline_stage: a.pipeline_stage ?? '', pipeline_order: a.pipeline_order,
            fallback_output: a.fallback_output ?? '', confidence_divisor: a.confidence_divisor,
            is_active: a.is_active,
        });
        setEditingAgent(a);
        setShowForm(true);
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            let sr, kr, fr, lc;
            try { sr = JSON.parse(form.scoring_rules) } catch { toast.error('Invalid scoring_rules JSON'); setSaving(false); return }
            try { kr = JSON.parse(form.keyword_rules) } catch { toast.error('Invalid keyword_rules JSON'); setSaving(false); return }
            try { fr = JSON.parse(form.field_rules) } catch { toast.error('Invalid field_rules JSON'); setSaving(false); return }
            try { lc = JSON.parse(form.locked_constraints) } catch { toast.error('Invalid locked_constraints JSON'); setSaving(false); return }

            const payload: any = {
                display_name: form.display_name,
                description: form.description || null,
                agent_category: form.agent_category,
                is_active: form.is_active,
                decision_type: form.decision_type,
                decision_outputs: form.decision_outputs.split(',').map(s => s.trim()).filter(Boolean),
                scoring_rules: sr,
                keyword_rules: kr,
                field_rules: fr,
                kb_object_types: form.kb_object_types.split(',').map(s => s.trim()).filter(Boolean),
                kb_min_confidence: form.kb_min_confidence,
                kb_max_objects: form.kb_max_objects,
                kb_write_enabled: form.kb_write_enabled,
                kb_write_type: form.kb_write_type || null,
                locked_constraints: lc,
                pipeline_stage: form.pipeline_stage || null,
                pipeline_order: form.pipeline_order,
                fallback_output: form.fallback_output || null,
                confidence_divisor: form.confidence_divisor,
            };

            if (!editingAgent) {
                payload.agent_key = form.agent_key;
                payload.scope = form.scope;
            }

            const url = editingAgent ? `/api/superadmin/mastery-agents/${editingAgent.id}` : '/api/superadmin/mastery-agents';
            const method = editingAgent ? 'PATCH' : 'POST';

            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(editingAgent ? 'Agent updated' : 'Agent created');
            setShowForm(false); setEditingAgent(null); resetForm(); load();
        } catch (err: any) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    const handleToggle = async (a: Agent) => {
        const res = await fetch(`/api/superadmin/mastery-agents/${a.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !a.is_active }),
        });
        if (res.ok) { toast.success(a.is_active ? 'Deactivated' : 'Activated'); load(); }
    };

    const handleDelete = async (a: Agent) => {
        if (!confirm(`Delete "${a.display_name}"?`)) return;
        const res = await fetch(`/api/superadmin/mastery-agents/${a.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) { toast.success('Deleted'); load(); } else toast.error(data.error);
    };

    const handleDuplicate = (a: Agent) => {
        setForm({
            agent_key: `${a.agent_key}_copy`, display_name: `${a.display_name} (Copy)`,
            description: a.description ?? '', agent_category: a.agent_category, scope: 'organization',
            decision_type: a.decision_type, decision_outputs: a.decision_outputs.join(', '),
            scoring_rules: JSON.stringify(a.scoring_rules, null, 2),
            keyword_rules: JSON.stringify(a.keyword_rules, null, 2),
            field_rules: JSON.stringify(a.field_rules, null, 2),
            kb_object_types: a.kb_object_types.join(', '),
            kb_min_confidence: a.kb_min_confidence, kb_max_objects: a.kb_max_objects,
            kb_write_enabled: a.kb_write_enabled, kb_write_type: a.kb_write_type ?? '',
            locked_constraints: JSON.stringify(a.locked_constraints, null, 2),
            pipeline_stage: a.pipeline_stage ?? '', pipeline_order: a.pipeline_order,
            fallback_output: a.fallback_output ?? '', confidence_divisor: a.confidence_divisor,
            is_active: true,
        });
        setEditingAgent(null);
        setShowForm(true);
    };

    const handleTest = async (agentKey: string) => {
        try {
            const inp = JSON.parse(testInput);
            const res = await fetch('/api/agents/execute', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agent_type: agentKey, input: inp }),
            });
            const data = await res.json();
            setTestResult(data);
            if (data.success) toast.success(`Decision: ${data.result?.decision}`);
            else toast.error(data.error || 'Test failed');
        } catch (err: any) { toast.error(`Parse error: ${err.message}`); }
    };

    const filtered = filterCat === 'all' ? agents : agents.filter(a => a.agent_category === filterCat);
    const getCatMeta = (cat: string) => CATEGORIES.find(c => c.value === cat) ?? { value: cat, label: cat, color: 'text-gray-400' };

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

    return (
        <div className="space-y-lg">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">Mastery Agent Manager</h1>
                    <p className="text-textSecondary">Create, configure, and manage all decision-making agents</p>
                </div>
                <div className="flex items-center gap-sm">
                    <button onClick={load} className="flex items-center gap-xs bg-surface border border-border text-textSecondary px-md py-sm rounded-[var(--radius-md)] hover:text-textPrimary transition-all">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                    <button onClick={() => { resetForm(); setEditingAgent(null); setShowForm(true); }}
                        className="flex items-center gap-xs bg-primary text-white px-md py-sm rounded-[var(--radius-md)] font-medium hover:opacity-90 transition-all">
                        <Plus className="w-4 h-4" /> New Agent
                    </button>
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-xs">
                <button onClick={() => setFilterCat('all')} className={`px-md py-xs rounded-[var(--radius-md)] text-sm font-medium transition-all ${filterCat === 'all' ? 'bg-primary text-white' : 'bg-surface border border-border text-textSecondary'}`}>All ({agents.length})</button>
                {CATEGORIES.map(c => {
                    const count = agents.filter(a => a.agent_category === c.value).length;
                    if (count === 0) return null;
                    return (
                        <button key={c.value} onClick={() => setFilterCat(filterCat === c.value ? 'all' : c.value)}
                            className={`px-md py-xs rounded-[var(--radius-md)] text-sm font-medium transition-all ${filterCat === c.value ? 'bg-primary text-white' : 'bg-surface border border-border text-textSecondary'}`}>
                            {c.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Agent Cards */}
            <div className="space-y-sm">
                {filtered.map(a => {
                    const cat = getCatMeta(a.agent_category);
                    const isExpanded = expandedId === a.id;
                    return (
                        <div key={a.id} className="bg-surface border border-border rounded-[var(--radius-lg)] overflow-hidden">
                            <div className="flex items-center justify-between px-lg py-md cursor-pointer hover:bg-background/50 transition-all"
                                onClick={() => setExpandedId(isExpanded ? null : a.id)}>
                                <div className="flex items-center gap-md">
                                    <div className={`w-3 h-3 rounded-full ${a.is_active ? 'bg-success' : 'bg-gray-500'}`} />
                                    <Bot className={`w-5 h-5 ${cat.color}`} />
                                    <div>
                                        <div className="flex items-center gap-sm">
                                            <span className="font-semibold text-textPrimary">{a.display_name}</span>
                                            <code className="text-xs text-textSecondary bg-background px-xs rounded">{a.agent_key}</code>
                                            {a.is_system && <span className="text-xs bg-warning/20 text-warning px-xs rounded">System</span>}
                                        </div>
                                        <div className="flex items-center gap-md text-xs text-textSecondary mt-xxs">
                                            <span className={cat.color}>{cat.label}</span>
                                            <span>v{a.version}</span>
                                            {a.pipeline_stage && <span>Pipeline: {a.pipeline_stage} (#{a.pipeline_order})</span>}
                                            <span>{a.scoring_rules.length}R {a.keyword_rules.length}K {a.field_rules.length}F</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-sm">
                                    <span className="text-xs text-textSecondary">{a.decision_outputs.length} outputs</span>
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-textSecondary" /> : <ChevronDown className="w-4 h-4 text-textSecondary" />}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-border px-lg py-md space-y-md">
                                    {a.description && <p className="text-sm text-textSecondary">{a.description}</p>}

                                    <div className="grid grid-cols-3 gap-sm">
                                        <div className="bg-background rounded-[var(--radius-md)] p-sm">
                                            <div className="text-xs text-textSecondary">Decision Type</div>
                                            <div className="text-sm font-medium text-textPrimary">{a.decision_type}</div>
                                        </div>
                                        <div className="bg-background rounded-[var(--radius-md)] p-sm">
                                            <div className="text-xs text-textSecondary">Outputs</div>
                                            <div className="flex flex-wrap gap-xxs mt-xxs">
                                                {a.decision_outputs.map(o => <span key={o} className="text-xs bg-primary/10 text-primary px-xs rounded">{o}</span>)}
                                            </div>
                                        </div>
                                        <div className="bg-background rounded-[var(--radius-md)] p-sm">
                                            <div className="text-xs text-textSecondary">KB Types</div>
                                            <div className="text-sm text-textPrimary">{a.kb_object_types.join(', ') || 'None'}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-sm text-xs">
                                        <div className="bg-background rounded-[var(--radius-md)] p-sm">
                                            <span className="text-textSecondary">Scoring Rules:</span> <strong className="text-textPrimary">{a.scoring_rules.length}</strong>
                                        </div>
                                        <div className="bg-background rounded-[var(--radius-md)] p-sm">
                                            <span className="text-textSecondary">Keyword Rules:</span> <strong className="text-textPrimary">{a.keyword_rules.length}</strong>
                                        </div>
                                        <div className="bg-background rounded-[var(--radius-md)] p-sm">
                                            <span className="text-textSecondary">Field Mappings:</span> <strong className="text-textPrimary">{a.field_rules.length}</strong>
                                        </div>
                                    </div>

                                    {/* Test Panel */}
                                    {testingId === a.id && (
                                        <div className="bg-background rounded-[var(--radius-md)] p-md space-y-sm border border-border">
                                            <div className="text-sm font-medium text-textPrimary flex items-center gap-xs"><Play className="w-4 h-4 text-success" /> Test Agent</div>
                                            <textarea value={testInput} onChange={e => setTestInput(e.target.value)} rows={4}
                                                className="w-full bg-surface text-textPrimary border border-border rounded-[var(--radius-sm)] px-sm py-xs text-xs font-mono focus:outline-none focus:ring-1 focus:ring-borderFocus resize-none"
                                                placeholder='{"replyText": "I am interested, let me know more"}' />
                                            <button onClick={() => handleTest(a.agent_key)}
                                                className="flex items-center gap-xs bg-success/20 text-success px-md py-xs rounded-[var(--radius-md)] text-sm font-medium hover:bg-success/30 transition-all">
                                                <Play className="w-3.5 h-3.5" /> Run Test
                                            </button>
                                            {testResult && (
                                                <pre className="text-xs text-textSecondary bg-surface p-sm rounded overflow-auto max-h-48">{JSON.stringify(testResult, null, 2)}</pre>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-sm pt-sm border-t border-border">
                                        <button onClick={(e) => { e.stopPropagation(); setTestingId(testingId === a.id ? null : a.id); setTestResult(null); }}
                                            className="flex items-center gap-xs bg-info/20 text-info px-md py-xs rounded-[var(--radius-md)] text-sm font-medium hover:bg-info/30 transition-all">
                                            <Play className="w-3.5 h-3.5" /> Test
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); startEdit(a); }}
                                            className="flex items-center gap-xs bg-surface border border-border text-textSecondary px-md py-xs rounded-[var(--radius-md)] text-sm hover:text-textPrimary transition-all">
                                            <Settings className="w-3.5 h-3.5" /> Edit
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDuplicate(a); }}
                                            className="flex items-center gap-xs bg-surface border border-border text-textSecondary px-md py-xs rounded-[var(--radius-md)] text-sm hover:text-textPrimary transition-all">
                                            <Copy className="w-3.5 h-3.5" /> Duplicate
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleToggle(a); }}
                                            className={`flex items-center gap-xs px-md py-xs rounded-[var(--radius-md)] text-sm font-medium transition-all ${a.is_active ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                                            {a.is_active ? <><PowerOff className="w-3.5 h-3.5" /> Deactivate</> : <><Power className="w-3.5 h-3.5" /> Activate</>}
                                        </button>
                                        {!a.is_system && (
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(a); }}
                                                className="flex items-center gap-xs bg-danger/20 text-danger px-md py-xs rounded-[var(--radius-md)] text-sm hover:bg-danger/30 transition-all ml-auto">
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Create/Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-[3vh] overflow-y-auto">
                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] w-full max-w-4xl mx-md mb-lg shadow-2xl">
                        <div className="flex items-center justify-between px-lg py-md border-b border-border">
                            <h2 className="text-xl font-bold text-textPrimary">{editingAgent ? `Edit: ${editingAgent.display_name}` : 'Create New Agent'}</h2>
                            <button onClick={() => { setShowForm(false); setEditingAgent(null); resetForm(); }} className="text-textSecondary hover:text-textPrimary"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="px-lg py-md space-y-md max-h-[75vh] overflow-y-auto">
                            {/* Identity */}
                            <div className="grid grid-cols-2 gap-md">
                                <div>
                                    <label className="block text-sm font-medium text-textPrimary mb-xs">Agent Key *</label>
                                    <input type="text" value={form.agent_key} onChange={e => setForm({ ...form, agent_key: e.target.value })}
                                        disabled={!!editingAgent} placeholder="my_custom_agent"
                                        className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus disabled:opacity-50 font-mono text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textPrimary mb-xs">Display Name *</label>
                                    <input type="text" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })}
                                        className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textPrimary mb-xs">Category</label>
                                    <select value={form.agent_category} onChange={e => setForm({ ...form, agent_category: e.target.value })}
                                        className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs">
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textPrimary mb-xs">Pipeline Stage</label>
                                    <select value={form.pipeline_stage} onChange={e => setForm({ ...form, pipeline_stage: e.target.value })}
                                        className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs">
                                        <option value="">None (on-demand)</option>
                                        {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textPrimary mb-xs">Description</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                                    className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus resize-none" />
                            </div>

                            {/* Decision Config */}
                            <div className="grid grid-cols-2 gap-md">
                                <div>
                                    <label className="block text-sm font-medium text-textPrimary mb-xs">Decision Type *</label>
                                    <input type="text" value={form.decision_type} onChange={e => setForm({ ...form, decision_type: e.target.value })}
                                        placeholder="contact_eligibility" className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus font-mono text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textPrimary mb-xs">Decision Outputs * (comma-separated)</label>
                                    <input type="text" value={form.decision_outputs} onChange={e => setForm({ ...form, decision_outputs: e.target.value })}
                                        placeholder="CONTACT_NOW, DELAY, SUPPRESS" className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus" />
                                </div>
                            </div>

                            {/* Rules (JSON editors) */}
                            <div>
                                <label className="block text-sm font-medium text-textPrimary mb-xs flex items-center gap-xs"><Code className="w-4 h-4 text-orange-400" /> Scoring Rules (JSON)</label>
                                <textarea value={form.scoring_rules} onChange={e => setForm({ ...form, scoring_rules: e.target.value })} rows={6}
                                    className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs font-mono text-xs focus:outline-none focus:ring-2 focus:ring-borderFocus resize-none" />
                                <p className="text-xs text-textSecondary mt-xxs">Format: [{`{"name","condition":{"field","op","value"},"action":"boost|penalize|set","target","value","reasoning_template"}`}]</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textPrimary mb-xs flex items-center gap-xs"><Code className="w-4 h-4 text-cyan-400" /> Keyword Rules (JSON)</label>
                                <textarea value={form.keyword_rules} onChange={e => setForm({ ...form, keyword_rules: e.target.value })} rows={4}
                                    className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs font-mono text-xs focus:outline-none focus:ring-2 focus:ring-borderFocus resize-none" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textPrimary mb-xs flex items-center gap-xs"><Code className="w-4 h-4 text-green-400" /> Field Mapping Rules (JSON)</label>
                                <textarea value={form.field_rules} onChange={e => setForm({ ...form, field_rules: e.target.value })} rows={4}
                                    className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs font-mono text-xs focus:outline-none focus:ring-2 focus:ring-borderFocus resize-none" />
                            </div>

                            {/* KB Config */}
                            <div className="grid grid-cols-3 gap-md">
                                <div>
                                    <label className="block text-sm font-medium text-textPrimary mb-xs">KB Object Types</label>
                                    <input type="text" value={form.kb_object_types} onChange={e => setForm({ ...form, kb_object_types: e.target.value })}
                                        placeholder="contact_pattern, timing_pattern" className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs focus:outline-none focus:ring-2 focus:ring-borderFocus text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textPrimary mb-xs">Min Confidence</label>
                                    <input type="number" step="0.1" value={form.kb_min_confidence} onChange={e => setForm({ ...form, kb_min_confidence: parseFloat(e.target.value) })}
                                        className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textPrimary mb-xs">Confidence Divisor</label>
                                    <input type="number" value={form.confidence_divisor} onChange={e => setForm({ ...form, confidence_divisor: parseInt(e.target.value) })}
                                        className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] px-sm py-xs" />
                                </div>
                            </div>

                            <div className="flex items-center gap-lg">
                                <label className="flex items-center gap-xs text-sm text-textPrimary">
                                    <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded border-border" />
                                    Active
                                </label>
                                <label className="flex items-center gap-xs text-sm text-textPrimary">
                                    <input type="checkbox" checked={form.kb_write_enabled} onChange={e => setForm({ ...form, kb_write_enabled: e.target.checked })} className="rounded border-border" />
                                    KB Write Enabled
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-sm px-lg py-md border-t border-border">
                            <button onClick={() => { setShowForm(false); setEditingAgent(null); resetForm(); }}
                                className="px-lg py-sm text-textSecondary hover:text-textPrimary transition-all">Cancel</button>
                            <button onClick={handleSubmit} disabled={saving}
                                className="flex items-center gap-xs bg-primary text-white px-lg py-sm rounded-[var(--radius-md)] font-medium hover:opacity-90 disabled:opacity-50 transition-all">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {editingAgent ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
