'use client'

import React, { useState } from 'react'
import {
    Check, X, Edit3, Eye, AlertTriangle,
    Clock, Cpu, FileText, RotateCcw, History, Star,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Section {
    section_number: number
    section_title: string
    status: string
    content?: string
    reviewer_notes?: string
    generation_duration_ms?: number
    provider_used?: string
    model_used?: string
    edit_history?: Array<{ edited_by: string; edited_by_email?: string; edited_at: string; previous_content?: string; previous_length: number; new_length: number }>
    ai_grade?: {
        score: number
        verdict: string
        strengths?: string[]
        weaknesses?: string[]
        suggestion?: string
        graded_at?: string
        graded_by_model?: string
        graded_by_provider?: string
    } | null
}

interface Props {
    section: Section
    onApprove: () => void
    onReject: (notes: string) => void
    onEdit: (content: string) => void
}

export default function SectionViewer({ section, onApprove, onReject, onEdit }: Props) {
    const [mode, setMode] = useState<'view' | 'edit' | 'reject'>('view')
    const [editContent, setEditContent] = useState(section.content || '')
    const [rejectNotes, setRejectNotes] = useState('')

    // Reset mode when section changes
    React.useEffect(() => {
        setMode('view')
        setEditContent(section.content || '')
        setRejectNotes('')
    }, [section.section_number, section.content])

    const handleSaveEdit = () => {
        onEdit(editContent)
        setMode('view')
    }

    const handleReject = () => {
        if (!rejectNotes.trim()) return
        onReject(rejectNotes)
        setMode('view')
        setRejectNotes('')
    }

    const isFailed = section.status === 'failed'
    const isDraft = section.status === 'draft'
    const isApproved = section.status === 'approved'
    const isLocked = section.status === 'locked'
    const isPending = section.status === 'pending'
    const isGenerating = section.status === 'generating'

    return (
        <div className="card p-0 overflow-hidden h-full flex flex-col">
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <div>
                    <h2 className="text-base font-bold text-textPrimary">
                        Section {section.section_number}: {section.section_title}
                    </h2>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-textTertiary">
                        {section.provider_used && (
                            <span className="flex items-center gap-1">
                                <Cpu className="w-3 h-3" /> {section.provider_used}/{section.model_used}
                            </span>
                        )}
                        {section.generation_duration_ms && (
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {(section.generation_duration_ms / 1000).toFixed(1)}s
                            </span>
                        )}
                        {section.content && (
                            <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" /> {section.content.length.toLocaleString()} chars
                            </span>
                        )}
                        {section.ai_grade && (
                            <span className={`flex items-center gap-1 font-semibold ${
                                section.ai_grade.score >= 8 ? 'text-success' :
                                section.ai_grade.score >= 6 ? 'text-accent' :
                                section.ai_grade.score >= 4 ? 'text-warning' : 'text-error'
                            }`}>
                                <Star className="w-3 h-3" /> {section.ai_grade.score}/10 {section.ai_grade.verdict}
                            </span>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                    {isDraft && mode === 'view' && (
                        <>
                            <button onClick={() => setMode('edit')} className="btn btn-secondary btn-sm flex items-center gap-1">
                                <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            <button onClick={() => setMode('reject')} className="btn btn-secondary btn-sm flex items-center gap-1 text-error hover:bg-error/10">
                                <X className="w-3 h-3" /> Reject
                            </button>
                            <button onClick={onApprove} className="btn btn-sm flex items-center gap-1 bg-success/10 text-success hover:bg-success/20 border border-success/30">
                                <Check className="w-3 h-3" /> Approve
                            </button>
                        </>
                    )}
                    {mode === 'edit' && (
                        <>
                            <button onClick={() => setMode('view')} className="btn btn-ghost btn-sm">Cancel</button>
                            <button onClick={handleSaveEdit} className="btn btn-accent-gradient btn-sm flex items-center gap-1">
                                <Check className="w-3 h-3" /> Save
                            </button>
                        </>
                    )}
                    {mode === 'reject' && (
                        <>
                            <button onClick={() => setMode('view')} className="btn btn-ghost btn-sm">Cancel</button>
                            <button onClick={handleReject} disabled={!rejectNotes.trim()} className="btn btn-sm bg-error/10 text-error hover:bg-error/20 border border-error/30 flex items-center gap-1">
                                <X className="w-3 h-3" /> Confirm Reject
                            </button>
                        </>
                    )}
                    {isApproved && (
                        <span className="flex items-center gap-1.5 text-success text-sm font-medium">
                            <Check className="w-4 h-4" /> Approved
                        </span>
                    )}
                    {isLocked && (
                        <span className="flex items-center gap-1.5 text-accent text-sm font-medium">
                            🔒 Locked
                        </span>
                    )}
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-5">
                {/* Failed state */}
                {isFailed && (
                    <div className="space-y-4">
                        <div className="p-4 bg-error/5 border border-error/20 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-5 h-5 text-error" />
                                <span className="font-semibold text-error text-sm">Generation Failed</span>
                            </div>
                            <pre className="text-xs text-error/80 font-mono whitespace-pre-wrap break-all">
                                {section.reviewer_notes || 'Unknown error'}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Pending/Generating state */}
                {(isPending || isGenerating) && (
                    <div className="flex items-center justify-center h-full text-textTertiary">
                        <div className="text-center space-y-2">
                            {isGenerating ? (
                                <>
                                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="text-sm">Generating...</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-8 h-8 rounded-full bg-border mx-auto" />
                                    <p className="text-sm">Waiting for generation</p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Reject mode */}
                {mode === 'reject' && (
                    <div className="mb-4 p-4 bg-error/5 border border-error/20 rounded-xl space-y-3">
                        <div className="text-sm font-semibold text-error">Why are you rejecting this section?</div>
                        <textarea
                            className="input w-full min-h-[80px] resize-none"
                            placeholder="Describe what's wrong and what needs to change..."
                            value={rejectNotes}
                            onChange={e => setRejectNotes(e.target.value)}
                            autoFocus
                        />
                        <p className="text-[10px] text-textTertiary">
                            This feedback will be used if the section is regenerated.
                        </p>
                    </div>
                )}

                {/* Edit mode */}
                {mode === 'edit' && (
                    <textarea
                        className="input w-full min-h-[500px] resize-none font-mono text-sm"
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        autoFocus
                    />
                )}

                {/* View mode — render markdown content */}
                {mode === 'view' && section.content && !isFailed && (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-textPrimary prose-p:text-textSecondary prose-strong:text-textPrimary prose-li:text-textSecondary prose-a:text-accent">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                )}

                {/* Reviewer notes (if rejected) */}
                {section.status === 'rejected' && section.reviewer_notes && mode === 'view' && (
                    <div className="mt-4 p-3 bg-error/5 border border-error/20 rounded-xl">
                        <div className="text-xs font-semibold text-error mb-1">Rejection Reason</div>
                        <p className="text-xs text-textSecondary">{section.reviewer_notes}</p>
                    </div>
                )}
                {/* AI Grade details */}
                {section.ai_grade && mode === 'view' && (
                    <div className={`mt-4 p-3 rounded-xl border ${
                        section.ai_grade.score >= 8 ? 'bg-success/5 border-success/20' :
                        section.ai_grade.score >= 6 ? 'bg-accent/5 border-accent/20' :
                        section.ai_grade.score >= 4 ? 'bg-warning/5 border-warning/20' : 'bg-error/5 border-error/20'
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Star className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">AI Grade: {section.ai_grade.score}/10 — {section.ai_grade.verdict}</span>
                            </div>
                            {section.ai_grade.graded_at && (
                                <span className="text-[9px] text-textTertiary">
                                    {section.ai_grade.graded_by_provider}/{section.ai_grade.graded_by_model} · {new Date(section.ai_grade.graded_at).toLocaleString()}
                                </span>
                            )}
                        </div>
                        {section.ai_grade.strengths && section.ai_grade.strengths.length > 0 && (
                            <div className="mb-1.5">
                                <span className="text-[10px] font-semibold text-success uppercase tracking-wider">Strengths</span>
                                <ul className="mt-0.5 space-y-0.5">{section.ai_grade.strengths.map((s, i) => (
                                    <li key={i} className="text-xs text-textSecondary flex items-start gap-1"><span className="text-success shrink-0">✓</span> {s}</li>
                                ))}</ul>
                            </div>
                        )}
                        {section.ai_grade.weaknesses && section.ai_grade.weaknesses.length > 0 && (
                            <div className="mb-1.5">
                                <span className="text-[10px] font-semibold text-error uppercase tracking-wider">Weaknesses</span>
                                <ul className="mt-0.5 space-y-0.5">{section.ai_grade.weaknesses.map((w, i) => (
                                    <li key={i} className="text-xs text-textSecondary flex items-start gap-1"><span className="text-error shrink-0">✗</span> {w}</li>
                                ))}</ul>
                            </div>
                        )}
                        {section.ai_grade.suggestion && (
                            <div>
                                <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">Suggestion</span>
                                <p className="mt-0.5 text-xs text-textSecondary">{section.ai_grade.suggestion}</p>
                            </div>
                        )}
                    </div>
                )}
                {/* Edit history */}
                {section.edit_history && section.edit_history.length > 0 && mode === 'view' && (
                    <EditHistoryPanel history={section.edit_history} />
                )}
            </div>
        </div>
    )
}

function EditHistoryPanel({ history }: { history: Section['edit_history'] }) {
    const [open, setOpen] = useState(false)
    const [viewIdx, setViewIdx] = useState<number | null>(null)
    if (!history || history.length === 0) return null

    return (
        <div className="mt-4 border border-border/30 rounded-xl overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-textTertiary hover:bg-surfaceHover transition-colors">
                <History className="w-3 h-3" />
                <span>{history.length} edit{history.length !== 1 ? 's' : ''}</span>
                <span className="ml-auto text-[10px]">{open ? '▲' : '▼'}</span>
            </button>
            {open && (
                <div className="border-t border-border/30 divide-y divide-border/20">
                    {history.map((h, i) => (
                        <div key={i} className="px-3 py-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-textSecondary">
                                    {h.edited_by_email || h.edited_by.slice(0, 8)} · {new Date(h.edited_at).toLocaleString()}
                                </span>
                                <span className="text-textTertiary font-mono">{h.previous_length} → {h.new_length} chars</span>
                            </div>
                            {h.previous_content && (
                                <button onClick={() => setViewIdx(viewIdx === i ? null : i)} className="mt-1 text-accent text-[10px] hover:underline">
                                    {viewIdx === i ? 'Hide previous' : 'View previous content'}
                                </button>
                            )}
                            {viewIdx === i && h.previous_content && (
                                <pre className="mt-2 p-2 bg-surface rounded-lg text-[11px] text-textTertiary whitespace-pre-wrap max-h-48 overflow-y-auto">{h.previous_content}</pre>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
