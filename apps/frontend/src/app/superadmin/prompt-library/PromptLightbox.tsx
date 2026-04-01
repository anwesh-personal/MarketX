'use client'
import { useState, useEffect } from 'react'
import { X, Copy, Check, Edit2, Save, Loader2, Link2, Trash2, Shield, Tag, Hash, Eye, Clock, Unlink } from 'lucide-react'
import { PromptBlock, CATEGORIES, TARGET_TYPES } from './types'

interface AgentOption { id: string; name: string; type: string }

export function PromptLightbox({ block, onClose, onSave, onDelete, fetchWithAuth }: {
    block: PromptBlock
    onClose: () => void
    onSave: (id: string, updates: Partial<PromptBlock>) => Promise<void>
    onDelete: (id: string) => void
    fetchWithAuth: (url: string, opts?: RequestInit) => Promise<Response>
}) {
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editName, setEditName] = useState(block.name)
    const [editContent, setEditContent] = useState(block.content)
    const [editDesc, setEditDesc] = useState(block.description || '')
    const [copied, setCopied] = useState(false)

    // Assignment state
    const [agents, setAgents] = useState<AgentOption[]>([])
    const [assignments, setAssignments] = useState<any[]>([])
    const [selectedAgent, setSelectedAgent] = useState('')
    const [assigning, setAssigning] = useState(false)
    const [loadingAgents, setLoadingAgents] = useState(true)

    const cat = CATEGORIES.find(c => c.value === block.category)
    const wordCount = block.content.split(/\s+/).filter(Boolean).length
    const lineCount = block.content.split('\n').length

    // Load agents + assignments on mount
    useEffect(() => {
        loadAgents()
        loadAssignments()
    }, [])

    const loadAgents = async () => {
        setLoadingAgents(true)
        try {
            const res = await fetchWithAuth('/api/superadmin/agent-templates')
            if (res.ok) {
                const data = await res.json()
                const templates = (data.templates || data || []).map((t: any) => ({
                    id: t.id, name: t.name || t.slug, type: 'agent_template'
                }))
                setAgents(templates)
            }
        } catch { }
        setLoadingAgents(false)
    }

    const loadAssignments = async () => {
        try {
            const res = await fetchWithAuth(`/api/superadmin/prompt-studio/assignments?prompt_id=${block.id}`)
            if (res.ok) {
                const data = await res.json()
                setAssignments(data.assignments || [])
            }
        } catch { }
    }

    const handleSave = async () => {
        setSaving(true)
        await onSave(block.id, { name: editName, content: editContent, description: editDesc })
        setSaving(false)
        setEditing(false)
    }

    const handleAssign = async () => {
        if (!selectedAgent) return
        setAssigning(true)
        try {
            await fetchWithAuth('/api/superadmin/prompt-studio/assignments', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt_block_id: block.id,
                    target_type: 'agent_template',
                    target_id: selectedAgent,
                    priority: 0,
                }),
            })
            setSelectedAgent('')
            await loadAssignments()
        } catch { }
        setAssigning(false)
    }

    const handleUnassign = async (id: string) => {
        await fetchWithAuth(`/api/superadmin/prompt-studio/assignments?id=${id}`, { method: 'DELETE' })
        await loadAssignments()
    }

    const copyContent = () => {
        navigator.clipboard.writeText(block.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative w-full max-w-3xl max-h-[85vh] bg-surface border border-border rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}>

                {/* Header accent */}
                <div className="h-[2px]" style={{ background: 'var(--gradient-primary)' }} />

                {/* Header */}
                <div className="flex items-start gap-3 p-5 border-b border-border/60">
                    <div className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center text-xl flex-shrink-0 border border-border/60 bg-surfaceElevated">
                        {cat?.emoji || '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                        {editing ? (
                            <input value={editName} onChange={e => setEditName(e.target.value)}
                                className="input text-base font-bold w-full mb-1" />
                        ) : (
                            <h2 className="text-lg font-bold text-textPrimary">{block.name}</h2>
                        )}
                        {editing ? (
                            <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                className="input text-xs w-full" placeholder="Description..." />
                        ) : (
                            block.description && <p className="text-xs text-textSecondary mt-0.5">{block.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-textTertiary">
                            <span className="flex items-center gap-0.5"><Hash className="w-2.5 h-2.5" />v{block.version}</span>
                            <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{block.usage_count} uses</span>
                            <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{new Date(block.updated_at).toLocaleDateString()}</span>
                            <span className="font-mono">{wordCount} words · {lineCount} lines</span>
                            {block.is_system && (
                                <span className="flex items-center gap-0.5 text-info"><Shield className="w-2.5 h-2.5" />SYSTEM</span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-surfaceHover text-textTertiary">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Tags */}
                    {block.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Tag className="w-3 h-3 text-textTertiary" />
                            {block.tags.map(t => (
                                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-surfaceHover text-textSecondary border border-border/40">{t}</span>
                            ))}
                        </div>
                    )}

                    {/* Content */}
                    {editing ? (
                        <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                            rows={16} className="input text-xs font-mono resize-y w-full leading-relaxed" />
                    ) : (
                        <pre className="text-xs font-mono bg-background rounded-[var(--radius-md)] p-4 overflow-auto whitespace-pre-wrap text-textSecondary border border-border/60 leading-relaxed max-h-[40vh]">
                            {block.content}
                        </pre>
                    )}

                    {/* Assign to Agent section */}
                    <div className="border-t border-border/40 pt-4">
                        <h3 className="text-sm font-bold text-textPrimary mb-3 flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-accent" /> Assign to Agent
                        </h3>
                        <div className="flex items-center gap-2">
                            <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}
                                className="input text-sm flex-1" disabled={loadingAgents}>
                                <option value="">
                                    {loadingAgents ? 'Loading agents...' : 'Select an agent template...'}
                                </option>
                                {agents.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                            <button onClick={handleAssign} disabled={!selectedAgent || assigning}
                                className="btn btn-primary text-sm px-4 py-2 gap-1.5 disabled:opacity-50">
                                {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                                Assign
                            </button>
                        </div>

                        {/* Current assignments */}
                        {assignments.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                                <p className="text-[10px] text-textTertiary uppercase tracking-wider font-semibold">Current Assignments</p>
                                {assignments.map((a: any) => {
                                    const agentName = agents.find(ag => ag.id === a.target_id)?.name || a.target_id.slice(0, 12)
                                    return (
                                        <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] bg-surfaceHover border border-border/40">
                                            <span className="text-xs text-textPrimary font-medium">{agentName}</span>
                                            <span className="text-[10px] text-textTertiary">{a.target_type}</span>
                                            <button onClick={() => handleUnassign(a.id)}
                                                className="flex items-center gap-1 text-xs text-error hover:underline">
                                                <Unlink className="w-3 h-3" /> Remove
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer actions */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 bg-surfaceElevated/50">
                    <span className="text-[10px] font-mono text-textTertiary">slug: {block.slug}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={copyContent} className="btn btn-secondary gap-1.5 text-xs px-3 py-1.5">
                            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                        {editing ? (
                            <>
                                <button onClick={() => setEditing(false)} className="btn btn-secondary text-xs px-3 py-1.5">Cancel</button>
                                <button onClick={handleSave} disabled={saving} className="btn btn-primary gap-1.5 text-xs px-4 py-1.5">
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setEditing(true)} className="btn btn-secondary gap-1.5 text-xs px-3 py-1.5">
                                    <Edit2 className="w-3.5 h-3.5" />Edit
                                </button>
                                {!block.is_system && (
                                    <button onClick={() => { onDelete(block.id); onClose() }}
                                        className="btn btn-secondary gap-1.5 text-xs px-3 py-1.5 hover:bg-error-muted hover:text-error">
                                        <Trash2 className="w-3.5 h-3.5" />Archive
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
