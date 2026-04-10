'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    BookOpen, Check, X, AlertTriangle, Loader2, Lock,
    ChevronRight, RefreshCw, Eye, Edit3, RotateCcw,
} from 'lucide-react'
import SectionViewer from './SectionViewer'
import FailureBanner from './FailureBanner'

// ─── Types ──────────────────────────────────────────────────────

interface Section {
    section_number: number
    section_title: string
    status: string
    content?: string
    reviewer_notes?: string
    generation_pass?: number
    generation_type?: string
    generation_duration_ms?: number
    provider_used?: string
    model_used?: string
    reviewed_by?: string
    reviewed_at?: string
}

interface FailedSection {
    section_number: number
    section_title: string
    error: string
}

interface Progress {
    total: number
    completed: number
    generating: number
    failed: number
    pending: number
    percentage: number
}

// ─── Status badge helper ────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { color: string; label: string }> = {
        pending: { color: 'badge', label: 'Pending' },
        generating: { color: 'badge badge-info', label: 'Generating...' },
        draft: { color: 'badge badge-warning', label: 'Draft' },
        failed: { color: 'badge badge-error', label: 'Failed' },
        approved: { color: 'badge badge-success', label: 'Approved' },
        rejected: { color: 'badge badge-error', label: 'Rejected' },
        locked: { color: 'badge badge-accent', label: 'Locked' },
    }
    const item = map[status] || map.pending
    return <span className={`${item.color} text-[10px]`}>{item.label}</span>
}

// ─── Main Component ─────────────────────────────────────────────

export default function KBReviewEditor() {
    const [loading, setLoading] = useState(true)
    const [questionnaireId, setQuestionnaireId] = useState<string | null>(null)
    const [questionnaireStatus, setQuestionnaireStatus] = useState('')
    const [progress, setProgress] = useState<Progress | null>(null)
    const [sections, setSections] = useState<Section[]>([])
    const [failedSections, setFailedSections] = useState<FailedSection[]>([])
    const [failureReport, setFailureReport] = useState<any>(null)
    const [selectedSection, setSelectedSection] = useState<number | null>(null)
    const [polling, setPolling] = useState(false)

    // ─── Load questionnaire ID first ────────────────────────────
    useEffect(() => {
        loadQuestionnaireId()
    }, [])

    const loadQuestionnaireId = async () => {
        try {
            const res = await fetch('/api/kb/onboarding')
            const json = await res.json()
            if (json.success && json.questionnaire?.id) {
                setQuestionnaireId(json.questionnaire.id)
                setQuestionnaireStatus(json.questionnaire.status)
            }
        } catch (e) {
            console.error('Failed to load questionnaire:', e)
        } finally {
            setLoading(false)
        }
    }

    // ─── Poll progress when we have a questionnaire ─────────────
    const pollProgress = useCallback(async () => {
        if (!questionnaireId) return
        try {
            const res = await fetch(`/api/kb/onboarding/generate?questionnaire_id=${questionnaireId}`)
            const json = await res.json()
            if (json.success) {
                setQuestionnaireStatus(json.questionnaire_status)
                setProgress(json.progress)
                setSections(json.sections || [])
                setFailedSections(json.failed_sections || [])
                setFailureReport(json.failure_report || null)

                // Auto-select first section if none selected
                if (selectedSection === null && json.sections?.length > 0) {
                    const firstDraft = json.sections.find((s: Section) => s.status === 'draft')
                    const firstFailed = json.sections.find((s: Section) => s.status === 'failed')
                    setSelectedSection((firstDraft || firstFailed || json.sections[0]).section_number)
                }
            }
        } catch (e) {
            console.error('Poll failed:', e)
        }
    }, [questionnaireId, selectedSection])

    useEffect(() => {
        if (questionnaireId) {
            pollProgress()
            // Poll every 5s while generating
            if (['generating'].includes(questionnaireStatus)) {
                setPolling(true)
                const interval = setInterval(pollProgress, 5000)
                return () => { clearInterval(interval); setPolling(false) }
            }
        }
    }, [questionnaireId, questionnaireStatus, pollProgress])

    // ─── Section actions ────────────────────────────────────────
    const approveSection = async (sectionNumber: number) => {
        try {
            await fetch('/api/kb/onboarding/sections', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionnaire_id: questionnaireId,
                    section_number: sectionNumber,
                    action: 'approve',
                }),
            })
            await pollProgress()
        } catch (e) {
            console.error('Approve failed:', e)
        }
    }

    const rejectSection = async (sectionNumber: number, notes: string) => {
        try {
            await fetch('/api/kb/onboarding/sections', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionnaire_id: questionnaireId,
                    section_number: sectionNumber,
                    action: 'reject',
                    reviewer_notes: notes,
                }),
            })
            await pollProgress()
        } catch (e) {
            console.error('Reject failed:', e)
        }
    }

    const editSection = async (sectionNumber: number, content: string) => {
        try {
            await fetch('/api/kb/onboarding/sections', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionnaire_id: questionnaireId,
                    section_number: sectionNumber,
                    action: 'edit',
                    content,
                }),
            })
            await pollProgress()
        } catch (e) {
            console.error('Edit failed:', e)
        }
    }

    const lockKB = async () => {
        const allApproved = sections.every(s => s.status === 'approved' || s.status === 'locked')
        if (!allApproved) return

        try {
            await fetch('/api/kb/onboarding/sections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionnaire_id: questionnaireId,
                    action: 'lock',
                }),
            })
            await pollProgress()
        } catch (e) {
            console.error('Lock failed:', e)
        }
    }

    const retryGeneration = async () => {
        if (!questionnaireId) return
        try {
            await fetch('/api/kb/onboarding/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionnaire_id: questionnaireId }),
            })
            setQuestionnaireStatus('generating')
        } catch (e) {
            console.error('Retry failed:', e)
        }
    }

    // ─── Loading state ──────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
        )
    }

    if (!questionnaireId) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center space-y-3">
                    <BookOpen className="w-10 h-10 text-textTertiary mx-auto opacity-50" />
                    <p className="text-textSecondary">No questionnaire found.</p>
                    <a href="/kb-onboarding" className="btn btn-accent-gradient">Start KB Builder</a>
                </div>
            </div>
        )
    }

    const activeSection = sections.find(s => s.section_number === selectedSection)
    const approvedCount = sections.filter(s => s.status === 'approved' || s.status === 'locked').length
    const canLock = sections.length > 0 && sections.every(s => s.status === 'approved' || s.status === 'locked')

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-textPrimary">Knowledge Base Review</h1>
                        <p className="text-xs text-textTertiary">
                            {approvedCount}/{sections.length} approved
                            {polling && <span className="ml-2 text-info">● Live</span>}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {['generation_partial_failure', 'generation_failed'].includes(questionnaireStatus) && (
                        <button onClick={retryGeneration} className="btn btn-secondary text-sm flex items-center gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5" /> Retry Generation
                        </button>
                    )}
                    {canLock && (
                        <button onClick={lockKB} className="btn btn-accent-gradient px-5 py-2 flex items-center gap-2">
                            <Lock className="w-4 h-4" /> Lock KB
                        </button>
                    )}
                </div>
            </div>

            {/* Failure banner */}
            {(failedSections.length > 0 || failureReport) && (
                <FailureBanner
                    failedSections={failedSections}
                    failureReport={failureReport}
                    questionnaireStatus={questionnaireStatus}
                />
            )}

            {/* Progress bar */}
            {progress && (
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-2 bg-border rounded-full overflow-hidden flex">
                        <div className="bg-success h-full transition-all" style={{ width: `${(approvedCount / Math.max(sections.length, 1)) * 100}%` }} />
                        <div className="bg-accent h-full transition-all" style={{ width: `${((progress.completed - approvedCount) / Math.max(sections.length, 1)) * 100}%` }} />
                        {progress.failed > 0 && (
                            <div className="bg-error h-full transition-all" style={{ width: `${(progress.failed / Math.max(sections.length, 1)) * 100}%` }} />
                        )}
                    </div>
                    <span className="text-xs font-mono text-textTertiary whitespace-nowrap">
                        {progress.completed} done · {progress.failed > 0 ? `${progress.failed} failed · ` : ''}{progress.generating > 0 ? `${progress.generating} generating` : ''}
                    </span>
                </div>
            )}

            {/* Two-panel layout */}
            <div className="flex gap-4 flex-1 min-h-0">
                {/* Section list */}
                <div className="w-72 shrink-0 overflow-y-auto space-y-1 pr-1">
                    {sections.map(s => (
                        <button
                            key={s.section_number}
                            onClick={() => setSelectedSection(s.section_number)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                                selectedSection === s.section_number
                                    ? 'bg-accent/10 border border-accent/30'
                                    : s.status === 'failed'
                                    ? 'bg-error/5 hover:bg-error/10 border border-error/10'
                                    : 'hover:bg-surfaceHover'
                            }`}
                        >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                s.status === 'approved' || s.status === 'locked' ? 'bg-success/10 text-success' :
                                s.status === 'failed' ? 'bg-error/10 text-error' :
                                s.status === 'draft' ? 'bg-accent/10 text-accent' :
                                s.status === 'generating' ? 'bg-info/10 text-info' :
                                'bg-surface border border-border text-textTertiary'
                            }`}>
                                {s.status === 'approved' || s.status === 'locked' ? <Check className="w-3 h-3" /> :
                                 s.status === 'failed' ? <X className="w-3 h-3" /> :
                                 s.status === 'generating' ? <Loader2 className="w-3 h-3 animate-spin" /> :
                                 s.section_number}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-textPrimary truncate">{s.section_title}</div>
                                <StatusBadge status={s.status} />
                            </div>
                            <ChevronRight className="w-3 h-3 text-textTertiary shrink-0" />
                        </button>
                    ))}
                </div>

                {/* Content viewer */}
                <div className="flex-1 min-w-0 overflow-y-auto">
                    {activeSection ? (
                        <SectionViewer
                            section={activeSection}
                            onApprove={() => approveSection(activeSection.section_number)}
                            onReject={(notes) => rejectSection(activeSection.section_number, notes)}
                            onEdit={(content) => editSection(activeSection.section_number, content)}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-textTertiary text-sm">
                            Select a section to review
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
