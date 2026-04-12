'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Check, Lock, Loader2, RotateCcw, Zap, CheckCheck, Download } from 'lucide-react'
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
                        {canLock && <button onClick={() => act('lock')} disabled={acting} className="btn btn-accent-gradient btn-sm flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Lock KB</button>}
                        {(isLocked || sections.length > 0) && <button onClick={exportKB} className="btn btn-secondary btn-sm flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Export</button>}
                    </div>
                }
            />

            {failedSections.length > 0 && <FailureBanner failedSections={failedSections} failureReport={null} questionnaireStatus={qrStatus} />}

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
