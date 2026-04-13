'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Check, Lock, Loader2, RotateCcw, Zap, CheckCheck, Download, Star, Brain } from 'lucide-react'
import { superadminFetch } from '@/lib/superadmin-auth'
import { SuperadminPageHero, SuperadminBadge } from '@/components/SuperAdmin/surfaces'
import SectionViewer from '@/components/kb-review/SectionViewer'
import FailureBanner from '@/components/kb-review/FailureBanner'

interface Props {
    orgId: string
    orgName: string
    questionnaireId: string | null
    onBack: () => void
}

export default function SuperadminKBOrgReview({ orgId, orgName, questionnaireId, onBack }: Props) {
    const [qrId, setQrId] = useState(questionnaireId)
    const [qrStatus, setQrStatus] = useState('')
    const [sections, setSections] = useState<any[]>([])
    const [selected, setSelected] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [acting, setActing] = useState(false)
    const [grading, setGrading] = useState(false)
    const [gradeReport, setGradeReport] = useState<any>(null)
    const [deploying, setDeploying] = useState(false)
    const [deployResult, setDeployResult] = useState<any>(null)

    const load = useCallback(async () => {
        const res = await superadminFetch(`/api/superadmin/kb?org_id=${orgId}`)
        const j = await res.json()
        if (j.success && j.questionnaire) {
            setQrId(j.questionnaire.id)
            setQrStatus(j.questionnaire.status)
            setSections(j.sections || [])
            if (selected === null && j.sections?.length) {
                const first = j.sections.find((s: any) => s.status === 'draft') || j.sections[0]
                setSelected(first.section_number)
            }
        }
        setLoading(false)
    }, [orgId, selected])

    useEffect(() => { load() }, [load])

    // Poll while generating
    useEffect(() => {
        if (qrStatus === 'generating') {
            const iv = setInterval(load, 5000)
            return () => clearInterval(iv)
        }
    }, [qrStatus, load])

    const act = async (action: string, extra: Record<string, any> = {}) => {
        if (!qrId) return
        setActing(true)
        try {
            await superadminFetch('/api/superadmin/kb/sections', {
                method: 'POST',
                body: JSON.stringify({ org_id: orgId, questionnaire_id: qrId, action, ...extra }),
            })
            await load()
        } catch (e) { console.error(e) }
        setActing(false)
    }

    const sectionAct = async (sectionNumber: number, action: string, extra: Record<string, any> = {}) => {
        if (!qrId) return
        setActing(true)
        try {
            await superadminFetch('/api/superadmin/kb/sections', {
                method: 'PUT',
                body: JSON.stringify({ org_id: orgId, questionnaire_id: qrId, section_number: sectionNumber, action, ...extra }),
            })
            await load()
        } catch (e) { console.error(e) }
        setActing(false)
    }

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>

    const active = sections.find(s => s.section_number === selected)
    const approvedCount = sections.filter(s => s.status === 'approved' || s.status === 'locked').length
    const draftCount = sections.filter(s => s.status === 'draft' || s.status === 'rejected').length
    const failedCount = sections.filter(s => s.status === 'failed').length
    const canLock = sections.length > 0 && sections.every(s => s.status === 'approved' || s.status === 'locked')
    const isLocked = qrStatus === 'locked'
    const canGenerate = ['ready_for_generation', 'generation_partial_failure', 'generation_failed'].includes(qrStatus)
    const failedSections = sections.filter(s => s.status === 'failed').map(s => ({ section_number: s.section_number, section_title: s.section_title, error: s.reviewer_notes || 'Unknown' }))

    // Progress estimation
    const completedWithTime = sections.filter(s => s.generation_duration_ms && ['draft', 'approved', 'locked'].includes(s.status))
    const avgMs = completedWithTime.length > 0 ? completedWithTime.reduce((sum: number, s: any) => sum + s.generation_duration_ms, 0) / completedWithTime.length : 0
    const pendingCount = sections.filter(s => s.status === 'pending' || s.status === 'generating').length
    const etaMinutes = avgMs > 0 && pendingCount > 0 ? Math.ceil((avgMs * pendingCount) / 60000) : 0

    const exportKB = async () => {
        if (!qrId) return
        const res = await superadminFetch(`/api/superadmin/kb/export?org_id=${orgId}&questionnaire_id=${qrId}`)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${orgName.replace(/[^a-zA-Z0-9]/g, '_')}_KB.md`
        a.click()
        URL.revokeObjectURL(url)
    }

    const gradeKB = async () => {
        setGrading(true)
        try {
            const res = await superadminFetch('/api/superadmin/kb/grade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ org_id: orgId, questionnaire_id: qrId, mode: 'output' }),
            })
            const j = await res.json()
            if (j.success) {
                setGradeReport(j.report)
                await load() // Reload sections to pick up stored ai_grade
            } else {
                console.error('Grading failed:', j.error)
            }
        } catch (e: any) {
            console.error('Grade error:', e)
        } finally {
            setGrading(false)
        }
    }

    return (
        <div className="space-y-4">
            <SuperadminPageHero
                eyebrow="Knowledge Base Review"
                title={orgName}
                description={`Questionnaire: ${qrStatus} · ${approvedCount}/${sections.length} approved${failedCount > 0 ? ` · ${failedCount} failed` : ''}`}
                actions={
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="btn btn-ghost btn-sm flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
                        {canGenerate && <button onClick={() => act('generate')} disabled={acting} className="btn btn-secondary btn-sm flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Generate</button>}
                        {draftCount > 0 && <button onClick={() => act('bulk_approve')} disabled={acting} className="btn btn-secondary btn-sm flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5" /> Approve All ({draftCount})</button>}
                        {failedCount > 0 && <button onClick={() => act('regenerate_sections', { section_numbers: sections.filter(s => s.status === 'failed').map(s => s.section_number) })} disabled={acting} className="btn btn-secondary btn-sm flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Retry Failed</button>}
                        {sections.some(s => ['draft', 'approved', 'locked'].includes(s.status)) && (
                            <button onClick={gradeKB} disabled={grading} className="btn btn-secondary btn-sm flex items-center gap-1">
                                {grading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                                {grading ? 'Grading...' : 'AI Grade'}
                            </button>
                        )}
                        {canLock && <button onClick={() => act('lock')} disabled={acting} className="btn btn-accent-gradient btn-sm flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Lock KB</button>}
                        {isLocked && (
                            <button onClick={async () => {
                                setDeploying(true)
                                try {
                                    const res = await superadminFetch('/api/superadmin/kb/deploy', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ org_id: orgId, questionnaire_id: qrId }),
                                    })
                                    const j = await res.json()
                                    if (j.success) setDeployResult(j.results)
                                    else console.error('Deploy failed:', j.error)
                                } catch (e: any) { console.error('Deploy error:', e) }
                                finally { setDeploying(false) }
                            }} disabled={deploying} className="btn btn-sm flex items-center gap-1 bg-accent/10 text-accent hover:bg-accent/20 border border-accent/30">
                                {deploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                                {deploying ? 'Deploying...' : 'Deploy to Brain'}
                            </button>
                        )}
                        {(isLocked || sections.length > 0) && <button onClick={exportKB} className="btn btn-secondary btn-sm flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Export</button>}
                    </div>
                }
            />

            {failedSections.length > 0 && <FailureBanner failedSections={failedSections} failureReport={null} questionnaireStatus={qrStatus} />}

            {/* Deploy result banner */}
            {deployResult && (
                <div className="card p-4 border border-accent/30 bg-accent/5">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-accent" />
                            <span className="text-sm font-bold text-accent">Brain Deployment Complete</span>
                        </div>
                        <button onClick={() => setDeployResult(null)} className="text-xs text-textTertiary hover:text-textPrimary">Dismiss</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {deployResult.icp && (
                            <div className="bg-surface/50 rounded-lg p-2">
                                <div className="text-textTertiary">ICPs</div>
                                <div className="font-bold">{deployResult.icp.created} created, {deployResult.icp.updated} updated</div>
                            </div>
                        )}
                        {deployResult.offer && (
                            <div className="bg-surface/50 rounded-lg p-2">
                                <div className="text-textTertiary">Offer</div>
                                <div className="font-bold">{deployResult.offer.action}</div>
                            </div>
                        )}
                        {deployResult.beliefs && (
                            <div className="bg-surface/50 rounded-lg p-2">
                                <div className="text-textTertiary">Beliefs</div>
                                <div className="font-bold">{deployResult.beliefs.created} generated</div>
                            </div>
                        )}
                        {deployResult.kb && (
                            <div className="bg-surface/50 rounded-lg p-2">
                                <div className="text-textTertiary">KB Docs</div>
                                <div className="font-bold">{deployResult.kb.documents_created} docs, {deployResult.kb.sections_created} sections</div>
                            </div>
                        )}
                    </div>
                    {deployResult.domain && (
                        <div className="mt-2 text-xs text-textTertiary">
                            Domain prompt ({deployResult.domain.domain_prompt_length} chars) deployed to {deployResult.domain.agents_updated} agent(s)
                        </div>
                    )}
                </div>
            )}

            {/* Progress bar */}
            {sections.length > 0 && (
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-border rounded-full overflow-hidden flex">
                        <div className="bg-success h-full transition-all" style={{ width: `${(approvedCount / sections.length) * 100}%` }} />
                        <div className="bg-accent h-full transition-all" style={{ width: `${(draftCount / sections.length) * 100}%` }} />
                        {failedCount > 0 && <div className="bg-error h-full transition-all" style={{ width: `${(failedCount / sections.length) * 100}%` }} />}
                    </div>
                    <span className="text-xs font-mono text-textTertiary whitespace-nowrap">
                        {approvedCount} approved · {draftCount} draft{failedCount > 0 ? ` · ${failedCount} failed` : ''}
                        {etaMinutes > 0 && ` · ~${etaMinutes}min remaining`}
                    </span>
                </div>
            )}

            {/* Grade report summary */}
            {gradeReport && (
                <div className={`card p-4 border ${
                    gradeReport.overall_score >= 8 ? 'border-success/30 bg-success/5' :
                    gradeReport.overall_score >= 6 ? 'border-accent/30 bg-accent/5' :
                    gradeReport.overall_score >= 4 ? 'border-warning/30 bg-warning/5' : 'border-error/30 bg-error/5'
                }`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4" />
                            <span className="text-sm font-bold">AI Grade Report: {gradeReport.overall_score}/10 — {gradeReport.overall_verdict}</span>
                        </div>
                        <button onClick={() => setGradeReport(null)} className="text-xs text-textTertiary hover:text-textPrimary">Dismiss</button>
                    </div>
                    {gradeReport.summary && <p className="text-xs text-textSecondary mb-2">{gradeReport.summary}</p>}
                    {gradeReport.critical_gaps?.length > 0 && (
                        <div className="mb-2">
                            <span className="text-[10px] font-semibold text-error uppercase tracking-wider">Critical Gaps</span>
                            <ul className="mt-0.5 space-y-0.5">{gradeReport.critical_gaps.map((g: string, i: number) => (
                                <li key={i} className="text-xs text-textSecondary">• {g}</li>
                            ))}</ul>
                        </div>
                    )}
                    {gradeReport.top_improvements?.length > 0 && (
                        <div>
                            <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">Top Improvements</span>
                            <ol className="mt-0.5 space-y-0.5">{gradeReport.top_improvements.map((t: string, i: number) => (
                                <li key={i} className="text-xs text-textSecondary">{i + 1}. {t}</li>
                            ))}</ol>
                        </div>
                    )}
                </div>
            )}

            {/* Two-panel layout */}
            <div className="flex gap-4" style={{ height: 'calc(100vh - 340px)' }}>
                {/* Section list */}
                <div className="w-64 shrink-0 overflow-y-auto space-y-1 pr-1">
                    {sections.map(s => (
                        <button key={s.section_number} onClick={() => setSelected(s.section_number)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all ${selected === s.section_number ? 'bg-accent/10 border border-accent/30' : s.status === 'failed' ? 'bg-error/5 hover:bg-error/10' : 'hover:bg-surfaceHover'}`}>
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[9px] font-bold ${s.status === 'approved' || s.status === 'locked' ? 'bg-success/10 text-success' : s.status === 'failed' ? 'bg-error/10 text-error' : s.status === 'draft' ? 'bg-accent/10 text-accent' : s.status === 'generating' ? 'bg-info/10 text-info' : 'bg-surface text-textTertiary'}`}>
                                {s.status === 'approved' || s.status === 'locked' ? <Check className="w-3 h-3" /> : s.status === 'generating' ? <Loader2 className="w-3 h-3 animate-spin" /> : s.section_number}
                            </div>
                            <span className="text-xs text-textPrimary truncate flex-1">{s.section_title}</span>
                            {s.ai_grade && (
                                <span className={`text-[9px] font-bold shrink-0 ${
                                    s.ai_grade.score >= 8 ? 'text-success' :
                                    s.ai_grade.score >= 6 ? 'text-accent' :
                                    s.ai_grade.score >= 4 ? 'text-warning' : 'text-error'
                                }`}>{s.ai_grade.score}</span>
                            )}
                        </button>
                    ))}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 overflow-y-auto">
                    {active ? (
                        <SectionViewer
                            section={active}
                            onApprove={() => sectionAct(active.section_number, 'approve')}
                            onReject={(notes) => sectionAct(active.section_number, 'reject', { reviewer_notes: notes })}
                            onEdit={(content) => sectionAct(active.section_number, 'edit', { content })}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-textTertiary text-sm">
                            {sections.length === 0 ? (qrId ? 'No sections generated yet. Click Generate to start.' : 'No questionnaire found for this organization.') : 'Select a section to review'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
