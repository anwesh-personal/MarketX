'use client'

import React, { useState } from 'react'
import { FileText, Edit3, Power, PowerOff, Eye, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Template } from './page'

interface Props {
    templates: Template[]
    onEdit: (t: Template) => void
    fetchWithAuth: (url: string, opts?: RequestInit) => Promise<Response>
    onRefresh: () => void
}

export function TemplateList({ templates, onEdit, fetchWithAuth, onRefresh }: Props) {
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [toggling, setToggling] = useState<string | null>(null)

    const toggleActive = async (t: Template) => {
        setToggling(t.id)
        try {
            const res = await fetchWithAuth(`/api/superadmin/system-email/templates/${t.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !t.is_active }),
            })
            if (!res.ok) throw new Error()
            toast.success(t.is_active ? 'Template deactivated' : 'Template activated')
            onRefresh()
        } catch { toast.error('Toggle failed') }
        finally { setToggling(null) }
    }

    if (templates.length === 0) {
        return (
            <div className="premium-card flex flex-col items-center justify-center py-16 text-center border-dashed">
                <FileText className="w-12 h-12 text-textTertiary mb-4" />
                <h3 className="text-lg font-bold text-textPrimary mb-2">No templates found</h3>
                <p className="text-textSecondary text-sm">Run the database migration to seed default templates.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {templates.map(t => {
                const isExpanded = expandedId === t.id
                return (
                    <div key={t.id} className={`premium-card !p-0 overflow-hidden transition-all ${t.is_active ? '' : 'opacity-60'}`}>
                        <div className="flex items-center gap-4 px-5 py-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${t.is_active ? 'bg-accent/10' : 'bg-surface'}`}>
                                <FileText className={`w-5 h-5 ${t.is_active ? 'text-accent' : 'text-textTertiary'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-bold text-textPrimary">{t.name}</span>
                                    <code className="text-xs text-textTertiary bg-surface px-1.5 py-0.5 rounded font-mono">{t.slug}</code>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${t.category === 'system' ? 'bg-accent/10 text-accent' : 'bg-surface text-textTertiary'}`}>
                                        {t.category}
                                    </span>
                                </div>
                                <p className="text-xs text-textTertiary truncate">{t.description || t.subject}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => toggleActive(t)}
                                    disabled={toggling === t.id}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${t.is_active ? 'bg-surfaceElevated text-success hover:bg-surfaceElevated' : 'bg-surface border border-border text-textTertiary hover:text-textPrimary'}`}
                                >
                                    {toggling === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : t.is_active ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                                    {t.is_active ? 'Active' : 'Inactive'}
                                </button>
                                <button onClick={() => onEdit(t)} className="btn btn-ghost btn-sm flex items-center gap-1">
                                    <Edit3 className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button onClick={() => setExpandedId(isExpanded ? null : t.id)} className="btn btn-ghost btn-icon btn-sm">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-border/40 px-5 py-4 space-y-4">
                                <div>
                                    <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Subject</p>
                                    <code className="text-sm text-textPrimary bg-surface px-3 py-1.5 rounded-lg inline-block">{t.subject}</code>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Variables</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(t.variables || []).map(v => (
                                            <span key={v.name} className={`text-xs px-2 py-1 rounded-lg font-mono ${v.required ? 'bg-surfaceElevated text-warning border border-border' : 'bg-surface text-textTertiary border border-border'}`}>
                                                {'{{' + v.name + '}}'}{v.required && ' *'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Preview</p>
                                    <div className="rounded-lg border border-border overflow-hidden max-h-64 overflow-y-auto">
                                        <iframe
                                            srcDoc={t.html_body}
                                            className="w-full h-48 bg-white"
                                            sandbox=""
                                            title={`Preview: ${t.name}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
