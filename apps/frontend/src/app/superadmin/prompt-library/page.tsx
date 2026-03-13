'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Plus, Edit2, Trash2, Save, X, Shield, AlertCircle, Check, Loader2, ChevronDown } from 'lucide-react'
import { SuperadminConfirmDialog } from '@/components/SuperAdmin/surfaces'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'

interface PromptLayer {
    id: string
    layer_type: 'foundation' | 'persona' | 'guardrails' | 'domain_seed'
    name: string
    description?: string
    content: string
    version: number
    tier: string
    is_active: boolean
    created_at: string
}

const LAYER_TYPES = [
    { value: 'foundation',   label: 'Foundation',   icon: Shield,   desc: 'Core role and capabilities — locked from clients' },
    { value: 'persona',      label: 'Persona',      icon: Sparkles, desc: 'Name, personality, communication style' },
    { value: 'guardrails',   label: 'Guardrails',   icon: Shield,   desc: 'Hard rules that override everything — locked from clients' },
    { value: 'domain_seed',  label: 'Domain Seed',  icon: Sparkles, desc: 'Starter domain context filled during onboarding' },
]

const TIER_OPTIONS = [
    { value: 'all',        label: 'All Tiers' },
    { value: 'basic',      label: 'Basic+' },
    { value: 'medium',     label: 'Medium+' },
    { value: 'enterprise', label: 'Enterprise' },
]

export default function PromptLibraryPage() {
    const { fetchWithAuth } = useSuperadminAuth()
    const [layers, setLayers]               = useState<PromptLayer[]>([])
    const [isLoading, setIsLoading]         = useState(true)
    const [error, setError]                 = useState<string | null>(null)
    const [filterType, setFilterType]       = useState<string>('all')
    const [showCreate, setShowCreate]       = useState(false)
    const [editingId, setEditingId]         = useState<string | null>(null)
    const [expandedId, setExpandedId]       = useState<string | null>(null)

    // Create form
    const [form, setForm] = useState({
        layer_type: 'foundation' as PromptLayer['layer_type'],
        name:        '',
        description: '',
        content:     '',
        tier:        'all',
    })
    const [isSaving, setIsSaving] = useState(false)
    const [savedId, setSavedId]   = useState<string | null>(null)
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

    const load = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const url = filterType === 'all'
                ? '/api/superadmin/prompt-layers'
                : `/api/superadmin/prompt-layers?layer_type=${filterType}`
            const res = await fetchWithAuth(url)
            if (!res.ok) throw new Error('Failed to load layers')
            const data = await res.json()
            setLayers(data.layers ?? [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }, [filterType])

    useEffect(() => { load() }, [load])

    const handleCreate = async () => {
        if (!form.name.trim() || !form.content.trim()) return
        setIsSaving(true)
        setError(null)
        try {
            const res = await fetchWithAuth('/api/superadmin/prompt-layers', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Create failed')
            setShowCreate(false)
            setForm({ layer_type: 'foundation', name: '', description: '', content: '', tier: 'all' })
            await load()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveEdit = async (layer: PromptLayer, newContent: string, newName: string) => {
        setIsSaving(true)
        try {
            const res = await fetchWithAuth(`/api/superadmin/prompt-layers/${layer.id}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ name: newName, content: newContent }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Save failed')
            setSavedId(layer.id)
            setTimeout(() => setSavedId(null), 2000)
            setEditingId(null)
            await load()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        const res = await fetchWithAuth(`/api/superadmin/prompt-layers/${id}`, { method: 'DELETE' })
        if (res.ok) load()
    }

    const layersByType: Record<string, PromptLayer[]> = {}
    for (const l of layers) {
        const g = filterType === 'all' ? l.layer_type : filterType
        if (!layersByType[g]) layersByType[g] = []
        layersByType[g].push(l)
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-textPrimary">
                        <Sparkles className="w-8 h-8 text-accent" />
                        Prompt Library
                    </h1>
                    <p className="text-textSecondary mt-1 text-sm">
                        Reusable prompt layers. Assign them to brain templates. Changes here do NOT affect already-deployed agents.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="btn btn-primary rounded-xl gap-2 px-5 py-2.5 hover:scale-[var(--hover-scale)] active:scale-[var(--active-scale)] transition-transform duration-[var(--duration-normal)]"
                >
                    <Plus className="w-4 h-4" />
                    New Layer
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-error-muted border border-error/30 text-error text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
            )}

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setFilterType('all')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${filterType === 'all' ? 'bg-accent text-onAccent border-accent' : 'border-border bg-surface text-textPrimary hover:border-borderHover hover:bg-surfaceHover'}`}
                >
                    All Layers
                </button>
                {LAYER_TYPES.map(t => (
                    <button
                        key={t.value}
                        onClick={() => setFilterType(t.value)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${filterType === t.value ? 'bg-accent text-onAccent border-accent' : 'border-border bg-surface text-textPrimary hover:border-borderHover hover:bg-surfaceHover'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="rounded-2xl border-2 border-accent/30 bg-accent/5 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-lg text-textPrimary">New Prompt Layer</h2>
                        <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-surfaceHover transition-colors text-textSecondary">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-textPrimary">Layer Type *</label>
                            <select value={form.layer_type} onChange={e => setForm({ ...form, layer_type: e.target.value as any })} className="input">
                                {LAYER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-textPrimary">Tier Availability</label>
                            <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} className="input">
                                {TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textPrimary">Name *</label>
                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., MarketX Core Foundation v1" className="input" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textPrimary">Description</label>
                        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this layer do?" className="input" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textPrimary">Content *</label>
                        <textarea
                            value={form.content}
                            onChange={e => setForm({ ...form, content: e.target.value })}
                            rows={8}
                            placeholder="Write the prompt content here..."
                            className="input resize-y font-mono text-xs"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setShowCreate(false)} className="btn btn-secondary text-sm">Cancel</button>
                        <button
                            onClick={handleCreate}
                            disabled={isSaving || !form.name.trim() || !form.content.trim()}
                            className="btn btn-primary gap-2 px-5 py-2 rounded-lg hover:scale-[var(--hover-scale)] active:scale-[var(--active-scale)] transition-transform disabled:opacity-60 disabled:hover:scale-100 text-sm font-medium"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Create Layer
                        </button>
                    </div>
                </div>
            )}

            {/* Layer list */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
            ) : layers.length === 0 ? (
                <div className="text-center py-16 text-textSecondary">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30 text-accent" />
                    <p>No prompt layers yet. Create your first one.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {layers.map(layer => (
                        <LayerCard
                            key={layer.id}
                            layer={layer}
                            isExpanded={expandedId === layer.id}
                            isEditing={editingId === layer.id}
                            isSaved={savedId === layer.id}
                            onToggleExpand={() => setExpandedId(expandedId === layer.id ? null : layer.id)}
                            onEdit={() => setEditingId(layer.id)}
                            onCancelEdit={() => setEditingId(null)}
                            onSave={handleSaveEdit}
                            onDelete={(id) => setPendingDeleteId(id)}
                        />
                    ))}
                </div>
            )}

            <SuperadminConfirmDialog
                open={Boolean(pendingDeleteId)}
                title="Archive prompt layer"
                description="This will archive the prompt layer. It will no longer be available for new brain templates."
                confirmLabel="Archive"
                onCancel={() => setPendingDeleteId(null)}
                onConfirm={() => {
                    if (pendingDeleteId) void handleDelete(pendingDeleteId);
                    setPendingDeleteId(null);
                }}
            />
        </div>
    )
}

function LayerCard({ layer, isExpanded, isEditing, isSaved, onToggleExpand, onEdit, onCancelEdit, onSave, onDelete }: {
    layer: PromptLayer
    isExpanded: boolean
    isEditing: boolean
    isSaved: boolean
    onToggleExpand: () => void
    onEdit: () => void
    onCancelEdit: () => void
    onSave: (layer: PromptLayer, content: string, name: string) => Promise<void>
    onDelete: (id: string) => Promise<void>
}) {
    const [editName, setEditName]       = useState(layer.name)
    const [editContent, setEditContent] = useState(layer.content)
    const [saving, setSaving]           = useState(false)

    const TYPE_COLORS: Record<string, string> = {
        foundation:  'bg-info-muted text-info border-info/20',
        persona:     'bg-accent/10 text-accent border-accent/20',
        guardrails:  'bg-warning-muted text-warning border-warning/20',
        domain_seed: 'bg-success-muted text-success border-success/20',
    }

    return (
        <div className="parallax-depth rounded-2xl border border-border/80 bg-surface overflow-hidden">
            <div className="flex items-center gap-4 p-4">
                <button onClick={onToggleExpand} className="flex-1 flex items-center gap-4 text-left">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${TYPE_COLORS[layer.layer_type] ?? ''}`}>
                        {layer.layer_type.replace('_', ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{layer.name}</p>
                        {layer.description && (
                            <p className="text-xs text-textSecondary truncate">{layer.description}</p>
                        )}
                    </div>
                    <span className="text-xs text-textSecondary font-mono">v{layer.version}</span>
                    <ChevronDown className={`w-4 h-4 text-textTertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                <div className="flex items-center gap-1">
                    {isSaved && <Check className="w-4 h-4 text-success" />}
                    {!isEditing ? (
                        <button onClick={onEdit} className="p-2 rounded-lg hover:bg-surfaceHover transition-colors text-textSecondary">
                            <Edit2 className="w-4 h-4" />
                        </button>
                    ) : (
                        <button onClick={onCancelEdit} className="p-2 rounded-lg hover:bg-surfaceHover transition-colors text-textSecondary">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={() => onDelete(layer.id)} className="p-2 rounded-lg hover:bg-error-muted hover:text-error transition-colors text-textSecondary">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {(isExpanded || isEditing) && (
                <div className="border-t border-border/40 p-4 space-y-3">
                    {isEditing ? (
                        <>
                            <input
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="input text-sm font-medium"
                                placeholder="Layer name"
                            />
                            <textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                rows={10}
                                className="input text-xs font-mono bg-surface resize-y"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={onCancelEdit} className="btn btn-secondary text-sm">Cancel</button>
                                <button
                                    onClick={async () => { setSaving(true); await onSave(layer, editContent, editName); setSaving(false) }}
                                    disabled={saving}
                                    className="btn btn-primary gap-2 px-4 py-1.5 rounded-lg text-sm font-medium hover:scale-[var(--hover-scale)] disabled:opacity-60"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save (creates new version)
                                </button>
                            </div>
                        </>
                    ) : (
                        <pre className="text-xs font-mono bg-surface rounded-lg p-4 overflow-auto max-h-64 whitespace-pre-wrap text-textSecondary border border-border">
                            {layer.content}
                        </pre>
                    )}
                </div>
            )}
        </div>
    )
}
