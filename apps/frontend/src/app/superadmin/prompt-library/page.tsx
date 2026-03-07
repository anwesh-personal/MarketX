'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Plus, Edit2, Trash2, Save, X, Shield, AlertCircle, Check, Loader2, ChevronDown } from 'lucide-react'

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

    const load = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const url = filterType === 'all'
                ? '/api/superadmin/prompt-layers'
                : `/api/superadmin/prompt-layers?layer_type=${filterType}`
            const res = await fetch(url)
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
            const res = await fetch('/api/superadmin/prompt-layers', {
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
            const res = await fetch(`/api/superadmin/prompt-layers/${layer.id}`, {
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
        if (!confirm('Archive this prompt layer?')) return
        const res = await fetch(`/api/superadmin/prompt-layers/${id}`, { method: 'DELETE' })
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
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-primary" />
                        Prompt Library
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Reusable prompt layers. Assign them to brain templates. Changes here do NOT affect already-deployed agents.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:scale-105 transition-all font-medium"
                >
                    <Plus className="w-4 h-4" />
                    New Layer
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
            )}

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setFilterType('all')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${filterType === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}
                >
                    All Layers
                </button>
                {LAYER_TYPES.map(t => (
                    <button
                        key={t.value}
                        onClick={() => setFilterType(t.value)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${filterType === t.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-lg">New Prompt Layer</h2>
                        <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Layer Type *</label>
                            <select value={form.layer_type} onChange={e => setForm({ ...form, layer_type: e.target.value as any })} className="input-base">
                                {LAYER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Tier Availability</label>
                            <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} className="input-base">
                                {TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Name *</label>
                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., MarketX Core Foundation v1" className="input-base" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Description</label>
                        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this layer do?" className="input-base" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Content *</label>
                        <textarea
                            value={form.content}
                            onChange={e => setForm({ ...form, content: e.target.value })}
                            rows={8}
                            placeholder="Write the prompt content here..."
                            className="input-base resize-y font-mono text-xs"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm">Cancel</button>
                        <button
                            onClick={handleCreate}
                            disabled={isSaving || !form.name.trim() || !form.content.trim()}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100 text-sm font-medium"
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
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : layers.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
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
                            onDelete={handleDelete}
                        />
                    ))}
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
                }
                .input-base:focus { box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2); }
            `}</style>
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
        foundation:  'bg-blue-500/10 text-blue-600 border-blue-500/20',
        persona:     'bg-purple-500/10 text-purple-600 border-purple-500/20',
        guardrails:  'bg-amber-500/10 text-amber-600 border-amber-500/20',
        domain_seed: 'bg-green-500/10 text-green-600 border-green-500/20',
    }

    return (
        <div className="rounded-2xl border border-border/40 bg-background overflow-hidden">
            <div className="flex items-center gap-4 p-4">
                <button onClick={onToggleExpand} className="flex-1 flex items-center gap-4 text-left">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${TYPE_COLORS[layer.layer_type] ?? ''}`}>
                        {layer.layer_type.replace('_', ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{layer.name}</p>
                        {layer.description && (
                            <p className="text-xs text-muted-foreground truncate">{layer.description}</p>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">v{layer.version}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                <div className="flex items-center gap-1">
                    {isSaved && <Check className="w-4 h-4 text-green-500" />}
                    {!isEditing ? (
                        <button onClick={onEdit} className="p-2 rounded-lg hover:bg-muted transition-colors">
                            <Edit2 className="w-4 h-4" />
                        </button>
                    ) : (
                        <button onClick={onCancelEdit} className="p-2 rounded-lg hover:bg-muted transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={() => onDelete(layer.id)} className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors">
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
                                className="w-full px-3 py-2 rounded-lg border border-border text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-background font-medium"
                                placeholder="Layer name"
                            />
                            <textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                rows={10}
                                className="w-full px-3 py-2 rounded-lg border border-border text-xs outline-none focus:ring-2 focus:ring-primary/20 font-mono bg-muted/30 resize-y"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={onCancelEdit} className="px-4 py-1.5 rounded-lg border border-border hover:bg-muted text-sm transition-colors">Cancel</button>
                                <button
                                    onClick={async () => { setSaving(true); await onSave(layer, editContent, editName); setSaving(false) }}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:scale-105 transition-all disabled:opacity-60"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save (creates new version)
                                </button>
                            </div>
                        </>
                    ) : (
                        <pre className="text-xs font-mono bg-muted/30 rounded-lg p-4 overflow-auto max-h-64 whitespace-pre-wrap text-muted-foreground">
                            {layer.content}
                        </pre>
                    )}
                </div>
            )}
        </div>
    )
}
