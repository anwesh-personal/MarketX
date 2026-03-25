'use client'
import { useState } from 'react'
import { Edit2, Trash2, Save, X, ChevronDown, Check, Loader2, Shield, Tag, Link2 } from 'lucide-react'
import { PromptBlock, CATEGORIES } from './types'

export function PromptBlockCard({ block, onSave, onDelete, onAssign }: {
    block: PromptBlock
    onSave: (id: string, updates: Partial<PromptBlock>) => Promise<void>
    onDelete: (id: string) => void
    onAssign: (id: string) => void
}) {
    const [expanded, setExpanded] = useState(false)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editName, setEditName] = useState(block.name)
    const [editContent, setEditContent] = useState(block.content)
    const [editDesc, setEditDesc] = useState(block.description || '')
    const [saved, setSaved] = useState(false)

    const cat = CATEGORIES.find(c => c.value === block.category)

    const handleSave = async () => {
        setSaving(true)
        await onSave(block.id, { name: editName, content: editContent, description: editDesc })
        setSaving(false)
        setEditing(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <div className="rounded-2xl border border-border/80 bg-surface overflow-hidden transition-all hover:border-borderHover">
            <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => !editing && setExpanded(!expanded)}>
                <span className="text-xl">{cat?.emoji || '📝'}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate text-textPrimary">{block.name}</p>
                        {block.is_system && <Shield className="w-3.5 h-3.5 text-info flex-shrink-0" />}
                        {saved && <Check className="w-4 h-4 text-success" />}
                    </div>
                    {block.description && (
                        <p className="text-xs text-textSecondary truncate">{block.description}</p>
                    )}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize
                    ${cat?.color === 'info' ? 'bg-info-muted text-info border-info/20' : ''}
                    ${cat?.color === 'accent' ? 'bg-accent/10 text-accent border-accent/20' : ''}
                    ${cat?.color === 'success' ? 'bg-success-muted text-success border-success/20' : ''}
                    ${cat?.color === 'warning' ? 'bg-warning-muted text-warning border-warning/20' : ''}
                `}>
                    {block.category}
                </span>
                {block.tags.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-textTertiary">
                        <Tag className="w-3 h-3" />{block.tags.length}
                    </span>
                )}
                <span className="text-xs text-textTertiary font-mono">v{block.version}</span>
                <ChevronDown className={`w-4 h-4 text-textTertiary transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>

            {(expanded || editing) && (
                <div className="border-t border-border/40 p-4 space-y-3">
                    {editing ? (
                        <>
                            <input value={editName} onChange={e => setEditName(e.target.value)}
                                className="input text-sm font-medium w-full" placeholder="Name" />
                            <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                className="input text-sm w-full" placeholder="Description" />
                            <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                                rows={12} className="input text-xs font-mono resize-y w-full" />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setEditing(false)} className="btn btn-secondary text-sm">Cancel</button>
                                <button onClick={handleSave} disabled={saving}
                                    className="btn btn-primary gap-2 px-4 py-1.5 rounded-lg text-sm font-medium">
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {block.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {block.tags.map(t => (
                                        <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-surfaceHover text-textSecondary">{t}</span>
                                    ))}
                                </div>
                            )}
                            <pre className="text-xs font-mono bg-background rounded-lg p-4 overflow-auto max-h-80 whitespace-pre-wrap text-textSecondary border border-border">
                                {block.content}
                            </pre>
                            <div className="flex items-center gap-2 justify-end">
                                <button onClick={() => onAssign(block.id)}
                                    className="btn btn-secondary gap-1.5 text-xs px-3 py-1.5">
                                    <Link2 className="w-3.5 h-3.5" />Assign
                                </button>
                                <button onClick={() => { setEditing(true); setExpanded(true) }}
                                    className="btn btn-secondary gap-1.5 text-xs px-3 py-1.5">
                                    <Edit2 className="w-3.5 h-3.5" />Edit
                                </button>
                                {!block.is_system && (
                                    <button onClick={() => onDelete(block.id)}
                                        className="btn btn-secondary gap-1.5 text-xs px-3 py-1.5 hover:bg-error-muted hover:text-error hover:border-error/30">
                                        <Trash2 className="w-3.5 h-3.5" />Archive
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
