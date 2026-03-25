'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Plus, Save, X, Loader2, AlertCircle, Link2 } from 'lucide-react'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'
import { SuperadminConfirmDialog } from '@/components/SuperAdmin/surfaces'
import { PromptBlock, CATEGORIES, TARGET_TYPES } from './types'
import { PromptBlockCard } from './PromptBlockCard'

export default function PromptStudioPage() {
    const { fetchWithAuth } = useSuperadminAuth()
    const [prompts, setPrompts] = useState<PromptBlock[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterCat, setFilterCat] = useState('all')
    const [showCreate, setShowCreate] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)

    // Assignment modal
    const [assignPromptId, setAssignPromptId] = useState<string | null>(null)
    const [assignTargetType, setAssignTargetType] = useState('agent_template')
    const [assignTargetId, setAssignTargetId] = useState('')
    const [assignPriority, setAssignPriority] = useState(0)
    const [assigning, setAssigning] = useState(false)
    const [assignments, setAssignments] = useState<any[]>([])

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

    const loadAssignments = async (promptId: string) => {
        const res = await fetchWithAuth(`/api/superadmin/prompt-studio/assignments?prompt_id=${promptId}`)
        if (res.ok) {
            const data = await res.json()
            setAssignments(data.assignments ?? [])
        }
    }

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

    const handleAssign = async () => {
        if (!assignPromptId || !assignTargetId) return
        setAssigning(true)
        try {
            const res = await fetchWithAuth('/api/superadmin/prompt-studio/assignments', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt_block_id: assignPromptId,
                    target_type: assignTargetType,
                    target_id: assignTargetId,
                    priority: assignPriority,
                }),
            })
            if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
            await loadAssignments(assignPromptId)
        } catch (err: any) { setError(err.message) }
        finally { setAssigning(false) }
    }

    const handleUnassign = async (assignmentId: string) => {
        await fetchWithAuth(`/api/superadmin/prompt-studio/assignments?id=${assignmentId}`, { method: 'DELETE' })
        if (assignPromptId) await loadAssignments(assignPromptId)
    }

    const openAssign = (promptId: string) => {
        setAssignPromptId(promptId)
        setAssignTargetId('')
        loadAssignments(promptId)
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
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-error-muted border border-error/30 text-error text-sm">
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
                <div className="rounded-2xl border-2 border-accent/30 bg-accent/5 p-6 space-y-4">
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

            {/* Prompt List */}
            {loading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
            ) : prompts.length === 0 ? (
                <div className="text-center py-16 text-textSecondary">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30 text-accent" />
                    <p>No prompt blocks yet. Create your first one.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {prompts.map(p => (
                        <PromptBlockCard key={p.id} block={p}
                            onSave={handleSave} onDelete={setDeleteId} onAssign={openAssign} />
                    ))}
                </div>
            )}

            {/* Assignment Modal */}
            {assignPromptId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAssignPromptId(null)}>
                    <div className="bg-surface rounded-2xl border border-border max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-lg text-textPrimary flex items-center gap-2">
                                <Link2 className="w-5 h-5 text-accent" /> Assign Prompt
                            </h2>
                            <button onClick={() => setAssignPromptId(null)} className="p-1 rounded-lg hover:bg-surfaceHover text-textSecondary">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-textPrimary">Target Type</label>
                                <select value={assignTargetType} onChange={e => setAssignTargetType(e.target.value)} className="input text-sm">
                                    {TARGET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-textPrimary">Priority</label>
                                <input type="number" value={assignPriority} onChange={e => setAssignPriority(Number(e.target.value))}
                                    className="input text-sm" min={0} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-textPrimary">Target ID (UUID)</label>
                            <input value={assignTargetId} onChange={e => setAssignTargetId(e.target.value)}
                                placeholder="Paste the brain_agent, org_agent, or template UUID" className="input text-sm font-mono" />
                        </div>
                        <button onClick={handleAssign} disabled={assigning || !assignTargetId}
                            className="btn btn-primary w-full gap-2 text-sm disabled:opacity-50">
                            {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                            Assign
                        </button>

                        {assignments.length > 0 && (
                            <div className="space-y-2 border-t border-border pt-4">
                                <h3 className="text-sm font-semibold text-textPrimary">Current Assignments</h3>
                                {assignments.map((a: any) => (
                                    <div key={a.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-surfaceHover">
                                        <span className="font-mono text-textSecondary">{a.target_type} → {a.target_id.slice(0, 8)}...</span>
                                        <button onClick={() => handleUnassign(a.id)} className="text-error hover:underline">Remove</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <SuperadminConfirmDialog open={Boolean(deleteId)} title="Archive prompt block"
                description="This will deactivate the prompt. It can be reactivated later."
                confirmLabel="Archive" onCancel={() => setDeleteId(null)}
                onConfirm={() => { if (deleteId) handleDelete(deleteId); setDeleteId(null) }} />
        </div>
    )
}
