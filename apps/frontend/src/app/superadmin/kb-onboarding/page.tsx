'use client'

import React, { useState } from 'react'
import { Eye, ArrowLeft, ArrowRight } from 'lucide-react'
import { useKBFormConfig } from '@/components/kb-onboarding/useKBFormConfig'
import { emptyQuestionnaire, emptySegment } from '@/components/kb-onboarding/types'
import {
    SuperadminPageHero,
} from '@/components/SuperAdmin/surfaces'
import Step1CompanyOffer from '@/components/kb-onboarding/steps/Step1CompanyOffer'
import Step2ICPSegments from '@/components/kb-onboarding/steps/Step2ICPSegments'
import Step3BuyingRoles from '@/components/kb-onboarding/steps/Step3BuyingRoles'
import Step4SalesProcess from '@/components/kb-onboarding/steps/Step4SalesProcess'
import Step5ValueProp from '@/components/kb-onboarding/steps/Step5ValueProp'
import Step6Objections from '@/components/kb-onboarding/steps/Step6Objections'
import Step7VoiceTone from '@/components/kb-onboarding/steps/Step7VoiceTone'
import Step8Conversion from '@/components/kb-onboarding/steps/Step8Conversion'
import Step9Artifacts from '@/components/kb-onboarding/steps/Step9Artifacts'

const STEP_LABELS = [
    'Company & Offer', 'ICP Segments', 'Buying Roles', 'Sales Process',
    'Value & Proof', 'Objections', 'Voice & Tone', 'Conversion', 'Materials',
]

export default function SuperadminKBPreviewPage() {
    const formConfig = useKBFormConfig()
    const [step, setStep] = useState(1)
    const [data, setData] = useState(emptyQuestionnaire())
    const [segments, setSegments] = useState([emptySegment()])
    const noop = () => {}

    return (
        <div className="space-y-4">
            <SuperadminPageHero
                eyebrow="Knowledge Base"
                title="Form Preview"
                description="Preview exactly what clients see when filling out the KB onboarding wizard. Data entered here is NOT saved."
            />

            {/* Preview banner */}
            <div className="p-3 bg-accent/10 border border-accent/20 rounded-xl text-sm text-accent flex items-center gap-2">
                <Eye className="w-4 h-4 shrink-0" />
                <span><strong>Preview Mode</strong> — This is a read-only preview. Nothing is saved. Edit dropdowns in <a href="/superadmin/kb-form-config" className="underline font-semibold">Form Config</a>.</span>
            </div>

            {/* Step tabs */}
            <div className="flex flex-wrap gap-1">
                {STEP_LABELS.map((label, i) => (
                    <button
                        key={i}
                        onClick={() => setStep(i + 1)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            step === i + 1
                                ? 'bg-accent text-white'
                                : 'bg-surface border border-border text-textSecondary hover:border-borderHover'
                        }`}
                    >
                        {i + 1}. {label}
                    </button>
                ))}
            </div>

            {/* Step content */}
            <div className="card p-6 border border-border/50">
                <div className="animate-fade-in">
                    {step === 1 && <Step1CompanyOffer data={data} onChange={p => setData(d => ({...d, ...p}))} formConfig={formConfig} />}
                    {step === 2 && <Step2ICPSegments data={data} onChange={p => setData(d => ({...d, ...p}))} segments={segments} onSegmentsChange={setSegments} questionnaireId={null} formConfig={formConfig} />}
                    {step === 3 && <Step3BuyingRoles segments={segments} onSegmentsChange={setSegments} questionnaireId={null} />}
                    {step === 4 && <Step4SalesProcess data={data} onChange={p => setData(d => ({...d, ...p}))} formConfig={formConfig} />}
                    {step === 5 && <Step5ValueProp data={data} onChange={p => setData(d => ({...d, ...p}))} />}
                    {step === 6 && <Step6Objections data={data} onChange={p => setData(d => ({...d, ...p}))} />}
                    {step === 7 && <Step7VoiceTone data={data} onChange={p => setData(d => ({...d, ...p}))} formConfig={formConfig} />}
                    {step === 8 && <Step8Conversion data={data} onChange={p => setData(d => ({...d, ...p}))} formConfig={formConfig} />}
                    {step === 9 && <Step9Artifacts artifacts={[]} onArtifactsChange={noop} questionnaireId={null} formConfig={formConfig} />}
                </div>
            </div>

            {/* Nav */}
            <div className="flex justify-between">
                <button disabled={step === 1} onClick={() => setStep(s => s - 1)} className="btn btn-ghost text-sm flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button disabled={step === 9} onClick={() => setStep(s => s + 1)} className="btn btn-secondary text-sm flex items-center gap-1">
                    Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    )
}
