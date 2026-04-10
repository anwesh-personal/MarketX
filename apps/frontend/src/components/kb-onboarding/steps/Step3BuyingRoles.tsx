'use client'

import React from 'react'
import { Users, UserCheck, UserCog, UserX, Crown } from 'lucide-react'
import { ICPSegment } from '../types'
import { Field, SectionHeader, CharCount } from '../FormPrimitives'

interface Props {
    segments: ICPSegment[]
    onSegmentsChange: (segs: ICPSegment[]) => void
    questionnaireId: string | null
}

export default function Step3BuyingRoles({ segments, onSegmentsChange }: Props) {
    const [activeSegIdx, setActiveSegIdx] = React.useState(0)

    const updateSegment = (idx: number, partial: Partial<ICPSegment>) => {
        onSegmentsChange(segments.map((s, i) => i === idx ? { ...s, ...partial } : s))
    }

    const seg = segments[activeSegIdx]
    if (!seg) return null

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Buying Roles & Committee Architecture"
                description="Different segments may have different buying committees. Define who makes the decision for each segment."
            />

            {/* Segment tab selector */}
            {segments.length > 1 && (
                <div className="tab-group">
                    {segments.map((s, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveSegIdx(idx)}
                            className={`tab ${activeSegIdx === idx ? 'tab-active' : ''}`}
                        >
                            {s.segment_name || `Segment ${idx + 1}`}
                        </button>
                    ))}
                </div>
            )}

            {/* Buying roles for active segment */}
            <div className="space-y-5">
                {/* Economic Buyer */}
                <div className="card p-5 space-y-4 border-l-4 border-l-accent">
                    <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-accent" />
                        <h4 className="font-semibold text-textPrimary text-sm">Economic Buyer</h4>
                        <span className="text-[10px] text-textTertiary">Who approves budget?</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Title / Role" required>
                            <input className="input w-full" placeholder="e.g. CFO, VP of Finance, CEO"
                                value={seg.economic_buyer_title}
                                onChange={e => updateSegment(activeSegIdx, { economic_buyer_title: e.target.value })}
                            />
                        </Field>
                        <Field label="Their Primary Concerns" required hint="What do they care about when making this decision?">
                            <div className="relative">
                                <textarea className="input w-full min-h-[60px] resize-none"
                                    placeholder="e.g. ROI, risk mitigation, cost control, competitive advantage"
                                    value={seg.economic_buyer_concerns}
                                    onChange={e => updateSegment(activeSegIdx, { economic_buyer_concerns: e.target.value })}
                                />
                                <div className="absolute bottom-2 right-2"><CharCount value={seg.economic_buyer_concerns} min={30} /></div>
                            </div>
                        </Field>
                    </div>
                </div>

                {/* Champion */}
                <div className="card p-5 space-y-4 border-l-4 border-l-success">
                    <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-success" />
                        <h4 className="font-semibold text-textPrimary text-sm">Champion</h4>
                        <span className="text-[10px] text-textTertiary">Who pushes the deal internally?</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Title / Role" required>
                            <input className="input w-full" placeholder="e.g. VP of Operations, Director of IT"
                                value={seg.champion_title}
                                onChange={e => updateSegment(activeSegIdx, { champion_title: e.target.value })}
                            />
                        </Field>
                        <Field label="What motivates them to push?" required>
                            <div className="relative">
                                <textarea className="input w-full min-h-[60px] resize-none"
                                    placeholder="e.g. Eliminate manual work, look good to leadership, hit their own KPIs"
                                    value={seg.champion_motivations}
                                    onChange={e => updateSegment(activeSegIdx, { champion_motivations: e.target.value })}
                                />
                                <div className="absolute bottom-2 right-2"><CharCount value={seg.champion_motivations} min={30} /></div>
                            </div>
                        </Field>
                    </div>
                </div>

                {/* Operational Owner */}
                <div className="card p-5 space-y-4 border-l-4 border-l-info">
                    <div className="flex items-center gap-2">
                        <UserCog className="w-4 h-4 text-info" />
                        <h4 className="font-semibold text-textPrimary text-sm">Operational Owner</h4>
                        <span className="text-[10px] text-textTertiary">Who uses the solution daily?</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Title / Role" required>
                            <input className="input w-full" placeholder="e.g. Compliance Manager, Account Manager"
                                value={seg.operational_owner_title}
                                onChange={e => updateSegment(activeSegIdx, { operational_owner_title: e.target.value })}
                            />
                        </Field>
                        <Field label="Their Primary Concerns" required>
                            <div className="relative">
                                <textarea className="input w-full min-h-[60px] resize-none"
                                    placeholder="e.g. Ease of use, training time, integration with existing tools"
                                    value={seg.operational_owner_concerns}
                                    onChange={e => updateSegment(activeSegIdx, { operational_owner_concerns: e.target.value })}
                                />
                                <div className="absolute bottom-2 right-2"><CharCount value={seg.operational_owner_concerns} min={30} /></div>
                            </div>
                        </Field>
                    </div>
                </div>

                {/* Technical Evaluator (optional) */}
                <div className="card p-5 space-y-4 border-l-4 border-l-warning opacity-80">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-warning" />
                        <h4 className="font-semibold text-textPrimary text-sm">Technical Evaluator</h4>
                        <span className="badge text-[10px]">Optional</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Title / Role">
                            <input className="input w-full" placeholder="e.g. CTO, IT Director, Security Lead"
                                value={seg.technical_evaluator_title}
                                onChange={e => updateSegment(activeSegIdx, { technical_evaluator_title: e.target.value })}
                            />
                        </Field>
                        <Field label="What do they evaluate?">
                            <textarea className="input w-full min-h-[60px] resize-none"
                                placeholder="e.g. API security, data privacy, SOC2, integration architecture"
                                value={seg.technical_evaluator_focus}
                                onChange={e => updateSegment(activeSegIdx, { technical_evaluator_focus: e.target.value })}
                            />
                        </Field>
                    </div>
                </div>

                {/* Resistor (optional) */}
                <div className="card p-5 space-y-4 border-l-4 border-l-error opacity-80">
                    <div className="flex items-center gap-2">
                        <UserX className="w-4 h-4 text-error" />
                        <h4 className="font-semibold text-textPrimary text-sm">Resistor / Skeptic</h4>
                        <span className="badge text-[10px]">Optional</span>
                    </div>
                    <Field label="Who typically blocks or resists? Why?" hint="Understanding resistance helps the system handle objections proactively.">
                        <textarea className="input w-full min-h-[60px] resize-none"
                            placeholder="e.g. Legal team worried about data handling, incumbent vendor relationship, finance pushing to 'build it internally'"
                            value={seg.resistor_description}
                            onChange={e => updateSegment(activeSegIdx, { resistor_description: e.target.value })}
                        />
                    </Field>
                </div>
            </div>
        </div>
    )
}
