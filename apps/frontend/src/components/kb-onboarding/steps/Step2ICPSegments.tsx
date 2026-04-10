'use client'

import React from 'react'
import { Target, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { QuestionnaireData, ICPSegment, INDUSTRIES, COMPANY_SIZES, REVENUE_RANGES, GEOGRAPHIES, emptySegment } from '../types'
import { Field, ChipSelect, CharCount, SectionHeader } from '../FormPrimitives'

interface Props {
    data: QuestionnaireData
    onChange: (partial: Partial<QuestionnaireData>) => void
    segments: ICPSegment[]
    onSegmentsChange: (segs: ICPSegment[]) => void
    questionnaireId: string | null
}

export default function Step2ICPSegments({ data, onChange, segments, onSegmentsChange, questionnaireId }: Props) {
    const [expandedIdx, setExpandedIdx] = React.useState(0)

    const addSegment = () => {
        onSegmentsChange([...segments, emptySegment()])
        setExpandedIdx(segments.length)
    }

    const removeSegment = (idx: number) => {
        if (segments.length <= 1) return
        const next = segments.filter((_, i) => i !== idx)
        onSegmentsChange(next)
        setExpandedIdx(Math.min(expandedIdx, next.length - 1))
    }

    const updateSegment = (idx: number, partial: Partial<ICPSegment>) => {
        onSegmentsChange(segments.map((s, i) => i === idx ? { ...s, ...partial } : s))
    }

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Define Your ICP Segments"
                description="Add one segment per distinct buyer profile. Different segments get different messaging."
            />

            {/* Segment cards */}
            {segments.map((seg, idx) => (
                <div key={idx} className="card p-0 overflow-hidden">
                    {/* Segment header (collapsible) */}
                    <button
                        onClick={() => setExpandedIdx(expandedIdx === idx ? -1 : idx)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surfaceHover/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                                <Target className="w-4 h-4 text-accent" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-textPrimary text-sm">
                                    {seg.segment_name || `Segment ${idx + 1}`}
                                </div>
                                <div className="text-[10px] text-textTertiary">
                                    {seg.target_industries.length} industries · {seg.company_size.length} sizes · {seg.geographies.length} geos
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {segments.length > 1 && (
                                <button
                                    onClick={e => { e.stopPropagation(); removeSegment(idx) }}
                                    className="p-1.5 rounded-lg hover:bg-error/10 text-textTertiary hover:text-error transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {expandedIdx === idx ? <ChevronUp className="w-4 h-4 text-textTertiary" /> : <ChevronDown className="w-4 h-4 text-textTertiary" />}
                        </div>
                    </button>

                    {/* Expanded content */}
                    {expandedIdx === idx && (
                        <div className="px-5 pb-5 space-y-5 border-t border-border/50 pt-4">
                            <Field label="Segment Name" required hint="Internal label, e.g. 'Enterprise Healthcare' or 'Mid-Market SaaS'">
                                <input
                                    className="input w-full"
                                    placeholder="e.g. Enterprise Healthcare"
                                    value={seg.segment_name}
                                    onChange={e => updateSegment(idx, { segment_name: e.target.value })}
                                />
                            </Field>

                            <Field label="Target Industries" required>
                                <ChipSelect options={INDUSTRIES} selected={seg.target_industries}
                                    onChange={v => updateSegment(idx, { target_industries: v })} allowCustom />
                            </Field>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Company Size (Headcount)" required>
                                    <ChipSelect options={COMPANY_SIZES} selected={seg.company_size}
                                        onChange={v => updateSegment(idx, { company_size: v })} />
                                </Field>
                                <Field label="Revenue Range" required>
                                    <ChipSelect options={REVENUE_RANGES} selected={seg.revenue_range}
                                        onChange={v => updateSegment(idx, { revenue_range: v })} />
                                </Field>
                            </div>

                            <Field label="Target Geographies" required>
                                <ChipSelect options={GEOGRAPHIES} selected={seg.geographies}
                                    onChange={v => updateSegment(idx, { geographies: v })} allowCustom />
                            </Field>

                            <Field label="Pain Points" required hint="What specific problems does this segment experience? Be detailed — min 50 chars.">
                                <div className="relative">
                                    <textarea className="input w-full min-h-[80px] resize-none"
                                        placeholder="1. Spending too much on manual compliance&#10;2. Can't scale operations without adding headcount&#10;3. Losing deals because onboarding takes too long"
                                        value={seg.pain_points}
                                        onChange={e => updateSegment(idx, { pain_points: e.target.value })}
                                    />
                                    <div className="absolute bottom-2 right-2"><CharCount value={seg.pain_points} min={50} /></div>
                                </div>
                            </Field>

                            <Field label="Buying Triggers" required hint="What triggers this segment to start looking for a solution?">
                                <div className="relative">
                                    <textarea className="input w-full min-h-[80px] resize-none"
                                        placeholder="e.g. Failed an audit, new regulation, leadership change, rapid growth, competitor pressure"
                                        value={seg.buying_triggers}
                                        onChange={e => updateSegment(idx, { buying_triggers: e.target.value })}
                                    />
                                    <div className="absolute bottom-2 right-2"><CharCount value={seg.buying_triggers} min={50} /></div>
                                </div>
                            </Field>

                            <Field label="Decision Criteria" required hint="How does this segment evaluate solutions?">
                                <textarea className="input w-full min-h-[60px] resize-none"
                                    placeholder="e.g. ROI proof, integration ease, vendor stability, industry expertise"
                                    value={seg.decision_criteria}
                                    onChange={e => updateSegment(idx, { decision_criteria: e.target.value })}
                                />
                            </Field>

                            <Field label="Exclusions" hint="Any companies or sub-segments you explicitly DON'T want?">
                                <textarea className="input w-full min-h-[50px] resize-none"
                                    placeholder="e.g. Companies under 20 employees, startups with no revenue, specific competitors' clients"
                                    value={seg.exclusions}
                                    onChange={e => updateSegment(idx, { exclusions: e.target.value })}
                                />
                            </Field>
                        </div>
                    )}
                </div>
            ))}

            {/* Add segment button */}
            <button onClick={addSegment} className="btn btn-secondary w-full flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Another ICP Segment
            </button>

            {/* Global ICP fields */}
            <div className="card p-5 space-y-5">
                <SectionHeader title="Global Adoption Conditions" description="These apply across all segments" />

                <Field label="What conditions must be true for a company to say yes?" required>
                    <div className="relative">
                        <textarea className="input w-full min-h-[80px] resize-none"
                            placeholder="e.g. They have budget allocated, executive sponsorship, immediate pain, and no active contract with competitor"
                            value={data.adoption_conditions}
                            onChange={e => onChange({ adoption_conditions: e.target.value })}
                        />
                        <div className="absolute bottom-2 right-2"><CharCount value={data.adoption_conditions} min={50} /></div>
                    </div>
                </Field>

                <Field label="What typically stops companies from buying?" required>
                    <textarea className="input w-full min-h-[60px] resize-none"
                        placeholder="e.g. Internal politics, budget freeze, 'we'll build it ourselves' mentality"
                        value={data.common_blockers}
                        onChange={e => onChange({ common_blockers: e.target.value })}
                    />
                </Field>

                <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Strongest environments">
                        <textarea className="input w-full min-h-[60px] resize-none" placeholder="Environments where your solution thrives"
                            value={data.strongest_environments}
                            onChange={e => onChange({ strongest_environments: e.target.value })} />
                    </Field>
                    <Field label="Poor fit environments">
                        <textarea className="input w-full min-h-[60px] resize-none" placeholder="Environments that are a poor fit"
                            value={data.poorest_fit_environments}
                            onChange={e => onChange({ poorest_fit_environments: e.target.value })} />
                    </Field>
                </div>

                <Field label="Client prerequisites" hint="What capabilities must the client already have?">
                    <textarea className="input w-full min-h-[50px] resize-none"
                        placeholder="e.g. Existing CRM, dedicated ops team, minimum data volume"
                        value={data.client_prerequisites}
                        onChange={e => onChange({ client_prerequisites: e.target.value })} />
                </Field>
            </div>
        </div>
    )
}
