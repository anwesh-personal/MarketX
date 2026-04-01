'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Plus, Save, X, Loader2, AlertCircle } from 'lucide-react'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'
import { SuperadminConfirmDialog } from '@/components/SuperAdmin/surfaces'
import { PromptBlock, CATEGORIES } from './types'
import { PromptBlockCard } from './PromptBlockCard'
import { PromptLightbox } from './PromptLightbox'

export default function PromptStudioPage() {
    const { fetchWithAuth } = useSuperadminAuth()
    const [prompts, setPrompts] = useState<PromptBlock[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterCat, setFilterCat] = useState('all')
    const [showCreate, setShowCreate] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)

    // Lightbox
    const [selectedPrompt, setSelectedPrompt] = useState<PromptBlock | null>(null)

    // Create form
    const [form, setForm] = useState({
        slug: '', name: '', description: '', category: 'foundation',
        content: '', tags: '' as string,
    })

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const url = filterCat === 'all'
                ? '/api/superadmin/prompt-studio'
                : `/api/superadmin/prompt-studio?category=${filterCat}`
            const res = await fetchWithAuth(url)
            if (!res.ok) throw new Error('Failed to load prompts')
            const data = await res.json()
            setPrompts(data.prompts ?? [])
        } catch (err: any) { setError(err.message) }
        finally { setLoading(false) }
    }, [filterCat])

    useEffect(() => { load() }, [load])


    const handleCreate = async () => {
        if (!form.slug || !form.name || !form.content) return
        setSaving(true)
        try {
            const res = await fetchWithAuth('/api/superadmin/prompt-studio', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                }),
            })
            if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
            setShowCreate(false)
            setForm({ slug: '', name: '', description: '', category: 'foundation', content: '', tags: '' })
            await load()
        } catch (err: any) { setError(err.message) }
        finally { setSaving(false) }
    }

    const handleSave = async (id: string, updates: Partial<PromptBlock>) => {
        const res = await fetchWithAuth('/api/superadmin/prompt-studio', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
        })
        if (!res.ok) { const d = await res.json(); setError(d.error) }
        await load()
    }

    const handleDelete = async (id: string) => {
        await fetchWithAuth(`/api/superadmin/prompt-studio?id=${id}`, { method: 'DELETE' })
        await load()
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-textPrimary">
                        <Sparkles className="w-8 h-8 text-accent" />
                        Prompt Studio
                    </h1>
                    <p className="text-textSecondary mt-1 text-sm">
                        Craft, version, and assign prompt blocks to brains and agents.
                    </p>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="btn btn-primary rounded-xl gap-2 px-5 py-2.5 hover:scale-[var(--hover-scale)] active:scale-[var(--active-scale)] transition-transform">
                    <Plus className="w-4 h-4" /> New Prompt
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-error-muted border border-border text-error text-sm">
                    <AlertCircle className="w-4 h-4" />{error}
                    <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Category Filters */}
            <div className="flex gap-2 flex-wrap">
                <button onClick={() => setFilterCat('all')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${filterCat === 'all' ? 'bg-accent text-onAccent border-accent' : 'border-border bg-surface text-textPrimary hover:border-borderHover'}`}>
                    All ({prompts.length})
                </button>
                {CATEGORIES.map(c => (
                    <button key={c.value} onClick={() => setFilterCat(c.value)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${filterCat === c.value ? 'bg-accent text-onAccent border-accent' : 'border-border bg-surface text-textPrimary hover:border-borderHover'}`}>
                        {c.emoji} {c.label}
                    </button>
                ))}
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="rounded-[var(--radius-lg)] border-2 border-accent/30 bg-accent/5 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-lg text-textPrimary">New Prompt Block</h2>
                        <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-surfaceHover text-textSecondary">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-textPrimary">Slug *</label>
                            <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                                placeholder="email-writer-foundation" className="input font-mono text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-textPrimary">Name *</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="Email Writer — Foundation" className="input text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-textPrimary">Category *</label>
                            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input text-sm">
                                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-textPrimary">Description</label>
                            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="What does this prompt do?" className="input text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-textPrimary">Tags (comma-separated)</label>
                            <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                                placeholder="email, writer, cold-outreach" className="input text-sm" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textPrimary">Content *</label>
                        <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                            rows={10} placeholder="Write the prompt content..." className="input resize-y font-mono text-xs" />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setShowCreate(false)} className="btn btn-secondary text-sm">Cancel</button>
                        <button onClick={handleCreate} disabled={saving || !form.slug || !form.name || !form.content}
                            className="btn btn-primary gap-2 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Create Prompt
                        </button>
                    </div>
                </div>
            )}

            {/* Prompt Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
            ) : prompts.length === 0 ? (
                <div className="text-center py-16 text-textSecondary border border-dashed border-border rounded-[var(--radius-lg)] bg-surface/50">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30 text-accent" />
                    <p className="font-medium text-textPrimary mb-1">No prompt blocks yet</p>
                    <p className="text-sm">Create your first prompt block or seed the library with built-in templates.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {prompts.map(p => (
                        <div key={p.id} onClick={() => setSelectedPrompt(p)} className="cursor-pointer">
                            <PromptBlockCard block={p} />
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox Modal */}
            {selectedPrompt && (
                <PromptLightbox
                    block={selectedPrompt}
                    onClose={() => setSelectedPrompt(null)}
                    onSave={async (id, updates) => { await handleSave(id, updates); await load() }}
                    onDelete={(id) => { setDeleteId(id); setSelectedPrompt(null) }}
                    fetchWithAuth={fetchWithAuth}
                />
            )}

            <SuperadminConfirmDialog open={Boolean(deleteId)} title="Archive prompt block"
                description="This will deactivate the prompt. It can be reactivated later."
                confirmLabel="Archive" onCancel={() => setDeleteId(null)}
                onConfirm={() => { if (deleteId) handleDelete(deleteId); setDeleteId(null) }} />
        </div>
    )
}
