'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    Building2, Target, Users, Briefcase, TrendingUp, Shield,
    MessageSquare, Link2, Upload, ArrowRight, ArrowLeft,
    Check, Loader2, AlertTriangle, Lock,
} from 'lucide-react'
import { QuestionnaireData, ICPSegment, ArtifactUpload, StepDef, emptyQuestionnaire, emptySegment } from './types'
import { STEP_COLUMNS } from '@/lib/kb-section-registry'
import Step1CompanyOffer from './steps/Step1CompanyOffer'
import Step2ICPSegments from './steps/Step2ICPSegments'
import Step3BuyingRoles from './steps/Step3BuyingRoles'
import Step4SalesProcess from './steps/Step4SalesProcess'
import Step5ValueProp from './steps/Step5ValueProp'
import Step6Objections from './steps/Step6Objections'
import Step7VoiceTone from './steps/Step7VoiceTone'
import Step8Conversion from './steps/Step8Conversion'
import Step9Artifacts from './steps/Step9Artifacts'

// ─── Step definitions ───────────────────────────────────────────
const STEPS: StepDef[] = [
    { num: 1, title: 'Company & Offer', subtitle: 'Who you are and what you sell', icon: Building2 },
    { num: 2, title: 'ICP Segments', subtitle: 'Who you target', icon: Target },
    { num: 3, title: 'Buying Roles', subtitle: 'Who makes the decision', icon: Users },
    { num: 4, title: 'Sales Process', subtitle: 'How you close deals', icon: Briefcase },
    { num: 5, title: 'Value & Proof', subtitle: 'Why they buy and proof it works', icon: TrendingUp },
    { num: 6, title: 'Objections', subtitle: 'What stops them from buying', icon: Shield },
    { num: 7, title: 'Voice & Tone', subtitle: 'How we should sound', icon: MessageSquare },
    { num: 8, title: 'Conversion', subtitle: 'Where conversations convert', icon: Link2 },
    { num: 9, title: 'Materials', subtitle: 'Supporting documents', icon: Upload },
]

export default function KBOnboardingWizard() {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [questionnaireId, setQuestionnaireId] = useState<string | null>(null)
    const [data, setData] = useState<QuestionnaireData>(emptyQuestionnaire())
    const [segments, setSegments] = useState<ICPSegment[]>([emptySegment()])
    const [artifacts, setArtifacts] = useState<ArtifactUpload[]>([])

    // ─── Load or create questionnaire on mount ──────────────────
    useEffect(() => { loadQuestionnaire() }, [])

    const loadQuestionnaire = async () => {
        try {
            const res = await fetch('/api/kb/onboarding')
            const json = await res.json()

            if (json.success && json.questionnaire) {
                setQuestionnaireId(json.questionnaire.id)
                setData({ ...emptyQuestionnaire(), ...json.questionnaire })
                setStep(json.questionnaire.current_step || 1)
                if (json.segments?.length > 0) setSegments(json.segments)
                if (json.artifacts?.length > 0) setArtifacts(json.artifacts)
            } else {
                // Create new questionnaire
                const createRes = await fetch('/api/kb/onboarding', { method: 'POST' })
                const createJson = await createRes.json()
                if (createJson.success) {
                    setQuestionnaireId(createJson.questionnaire.id)
                }
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    // ─── Auto-save current step ─────────────────────────────────
    const saveStep = useCallback(async (stepNum: number) => {
        if (!questionnaireId) return
        setSaving(true)
        try {
            const columns = STEP_COLUMNS[stepNum]
            if (columns && columns.length > 0) {
                const stepData: Record<string, any> = {}
                for (const col of columns) {
                    if (col in data) {
                        stepData[col] = (data as any)[col]
                    }
                }
                await fetch('/api/kb/onboarding', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        questionnaire_id: questionnaireId,
                        step: stepNum,
                        data: stepData,
                    }),
                })
            }
        } catch (e) {
            console.error('Auto-save failed:', e)
        } finally {
            setSaving(false)
        }
    }, [questionnaireId, data])

    // ─── Navigation ─────────────────────────────────────────────
    const goNext = async () => {
        await saveStep(step)
        if (step < 9) {
            setStep(step + 1)
        } else {
            // Step 9: Submit & trigger constraint validation
            await submitQuestionnaire()
        }
    }

    const submitQuestionnaire = async () => {
        if (!questionnaireId) return
        setSaving(true)
        setError('')
        try {
            const res = await fetch('/api/kb/onboarding/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionnaire_id: questionnaireId }),
            })
            const json = await res.json()

            if (json.success && json.status === 'ready_for_generation') {
                setError('')
                setSubmitted(true)
            } else if (json.success && json.status === 'needs_revision') {
                setError(`Validation failed: ${json.failed_count} constraint(s) need attention. Review the flagged fields.`)
            } else {
                setError(json.error || 'Validation failed')
            }
        } catch (e: any) {
            setError(e.message || 'Submission failed')
        } finally {
            setSaving(false)
        }
    }

    const goPrev = () => {
        if (step > 1) setStep(step - 1)
    }

    const goToStep = (num: number) => {
        if (num >= 1 && num <= 9) setStep(num)
    }

    // ─── Data updater ───────────────────────────────────────────
    const updateData = useCallback((partial: Partial<QuestionnaireData>) => {
        setData(prev => ({ ...prev, ...partial }))
    }, [])

    // ─── Render loading ─────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
                    <p className="text-sm text-textSecondary">Loading questionnaire...</p>
                </div>
            </div>
        )
    }

    // ─── Submitted success state ─────────────────────────────────
    if (submitted) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center space-y-5 max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
                        <Check className="w-8 h-8 text-success" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-textPrimary mb-2">Questionnaire Submitted</h2>
                        <p className="text-sm text-textSecondary leading-relaxed">
                            Your Knowledge Base questionnaire has been submitted successfully.
                            Our team will review your responses, generate your personalized KB sections,
                            and notify you when it's ready.
                        </p>
                    </div>
                    <div className="pt-2">
                        <a href="/dashboard" className="btn btn-accent-gradient px-6 py-2.5 rounded-xl">
                            Return to Dashboard
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    // ─── Render ─────────────────────────────────────────────────
    const currentStep = STEPS[step - 1]
    const StepIcon = currentStep.icon

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                        <StepIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-textPrimary">
                            Knowledge Base Builder
                        </h1>
                        <p className="text-xs text-textTertiary">
                            Step {step} of 9 — {currentStep.title}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {saving && (
                        <span className="flex items-center gap-1.5 text-xs text-textTertiary">
                            <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                        </span>
                    )}
                    <span className="text-xs font-mono text-textTertiary">
                        {Math.round((step / 9) * 100)}%
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1 mb-6">
                {STEPS.map(s => (
                    <button
                        key={s.num}
                        onClick={() => goToStep(s.num)}
                        className={`h-1.5 rounded-full transition-all duration-500 flex-1 ${
                            s.num < step ? 'bg-success' :
                            s.num === step ? 'bg-accent' :
                            'bg-border'
                        }`}
                        title={s.title}
                    />
                ))}
            </div>

            {/* Step sidebar labels */}
            <div className="flex gap-6 flex-1 min-h-0">
                {/* Left: Step nav */}
                <div className="hidden xl:flex flex-col gap-1 w-56 shrink-0">
                    {STEPS.map(s => {
                        const Icon = s.icon
                        const isActive = s.num === step
                        const isDone = s.num < step
                        return (
                            <button
                                key={s.num}
                                onClick={() => goToStep(s.num)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                    isActive ? 'bg-accent/10 border border-accent/30' :
                                    isDone ? 'bg-surface hover:bg-surfaceHover' :
                                    'hover:bg-surfaceHover'
                                }`}
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    isActive ? 'bg-accent text-white' :
                                    isDone ? 'bg-success/10 text-success' :
                                    'bg-surface border border-border text-textTertiary'
                                }`}>
                                    {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                                </div>
                                <div className="min-w-0">
                                    <div className={`text-sm font-medium truncate ${isActive ? 'text-accent' : isDone ? 'text-textPrimary' : 'text-textSecondary'}`}>
                                        {s.title}
                                    </div>
                                    <div className="text-[10px] text-textTertiary truncate">{s.subtitle}</div>
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Right: Step content */}
                <div className="flex-1 min-w-0 overflow-y-auto pr-1">
                    {error && (
                        <div className="mb-4 p-3 bg-error/5 border border-error/20 rounded-xl text-error text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                    )}

                    <div className="animate-fade-in">
                        {step === 1 && <Step1CompanyOffer data={data} onChange={updateData} />}
                        {step === 2 && <Step2ICPSegments data={data} onChange={updateData} segments={segments} onSegmentsChange={setSegments} questionnaireId={questionnaireId} />}
                        {step === 3 && <Step3BuyingRoles segments={segments} onSegmentsChange={setSegments} questionnaireId={questionnaireId} />}
                        {step === 4 && <Step4SalesProcess data={data} onChange={updateData} />}
                        {step === 5 && <Step5ValueProp data={data} onChange={updateData} />}
                        {step === 6 && <Step6Objections data={data} onChange={updateData} />}
                        {step === 7 && <Step7VoiceTone data={data} onChange={updateData} />}
                        {step === 8 && <Step8Conversion data={data} onChange={updateData} />}
                        {step === 9 && <Step9Artifacts artifacts={artifacts} onArtifactsChange={setArtifacts} questionnaireId={questionnaireId} />}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
                {step > 1 ? (
                    <button onClick={goPrev} className="btn btn-ghost text-sm flex items-center gap-1.5 text-textSecondary">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                ) : (
                    <div />
                )}

                <button
                    onClick={goNext}
                    disabled={saving}
                    className="btn btn-accent-gradient px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2"
                >
                    {step === 9 ? (
                        <>
                            <Lock className="w-4 h-4" /> Submit & Validate
                        </>
                    ) : (
                        <>
                            Save & Continue <ArrowRight className="w-3.5 h-3.5" />
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
