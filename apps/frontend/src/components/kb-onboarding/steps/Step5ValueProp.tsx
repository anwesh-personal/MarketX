'use client'

import React from 'react'
import { QuestionnaireData } from '../types'
import { Field, CharCount, SectionHeader } from '../FormPrimitives'

interface Props {
    data: QuestionnaireData
    onChange: (partial: Partial<QuestionnaireData>) => void
}

export default function Step5ValueProp({ data, onChange }: Props) {
    return (
        <div className="space-y-6">
            <SectionHeader
                title="Value Proposition & Proof"
                description="Why buyers actually sign — not marketing language, real reasons."
            />

            <Field label="What is the REAL reason people buy from you?" required
                hint="Not what your website says. What closed customers actually tell you.">
                <div className="relative">
                    <textarea className="input w-full min-h-[100px] resize-none"
                        placeholder="'They told us they bought because...' or 'The real reason they signed was...'"
                        value={data.real_buy_reason}
                        onChange={e => onChange({ real_buy_reason: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2"><CharCount value={data.real_buy_reason} min={50} /></div>
                </div>
            </Field>

            <Field label="Measurable outcomes your customers achieve" required
                hint="Use real numbers: '34% reduction in X', 'saved $200K/yr', 'cut onboarding from 6 weeks to 3 days'">
                <div className="relative">
                    <textarea className="input w-full min-h-[100px] resize-none"
                        placeholder="1. Reduced [metric] by X%&#10;2. Saved $X per [time period]&#10;3. Achieved Y within Z months&#10;4. Eliminated [process] entirely"
                        value={data.measurable_outcomes}
                        onChange={e => onChange({ measurable_outcomes: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2"><CharCount value={data.measurable_outcomes} min={50} /></div>
                </div>
            </Field>

            <Field label="Top differentiator" required
                hint="If a buyer asks 'why you vs. everyone else?' — what's the one thing?">
                <div className="relative">
                    <textarea className="input w-full min-h-[60px] resize-none"
                        placeholder="We are the only solution that... Unlike competitors, we..."
                        value={data.top_differentiator}
                        onChange={e => onChange({ top_differentiator: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2"><CharCount value={data.top_differentiator} min={30} /></div>
                </div>
            </Field>

            <Field label="Top rejection reason" required hint="Why do deals you SHOULD win still fall apart?">
                <textarea className="input w-full min-h-[60px] resize-none"
                    placeholder="e.g. Price, timing, internal politics, 'went with the incumbent'"
                    value={data.top_rejection_reason}
                    onChange={e => onChange({ top_rejection_reason: e.target.value })}
                />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Direct competitors" required hint="Companies selling a similar solution">
                    <textarea className="input w-full min-h-[60px] resize-none"
                        placeholder="1. CompetitorA — strengths/weaknesses&#10;2. CompetitorB — strengths/weaknesses"
                        value={data.direct_competitors}
                        onChange={e => onChange({ direct_competitors: e.target.value })}
                    />
                </Field>
                <Field label="Indirect competitors" hint="Alternative approaches (do-it-themselves, spreadsheets, hiring)">
                    <textarea className="input w-full min-h-[60px] resize-none"
                        placeholder="e.g. Internal teams, Excel/manual processes, hiring consultants"
                        value={data.indirect_competitors}
                        onChange={e => onChange({ indirect_competitors: e.target.value })}
                    />
                </Field>
            </div>

            <Field label="How do you want to be perceived in the market?">
                <textarea className="input w-full min-h-[60px] resize-none"
                    placeholder="e.g. The premium, enterprise-grade solution that serious operators choose"
                    value={data.desired_perception}
                    onChange={e => onChange({ desired_perception: e.target.value })}
                />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Forbidden claims" required hint="Claims we must NEVER make in outbound">
                    <textarea className="input w-full min-h-[60px] resize-none"
                        placeholder="e.g. Never claim 100% uptime, never promise specific ROI without data, never mention competitor by name"
                        value={data.forbidden_claims}
                        onChange={e => onChange({ forbidden_claims: e.target.value })}
                    />
                </Field>
                <Field label="Required disclosures" hint="Anything that MUST be present in client-facing comms">
                    <textarea className="input w-full min-h-[60px] resize-none"
                        placeholder="e.g. 'Results may vary', regulatory disclaimers, licensing info"
                        value={data.required_disclosures}
                        onChange={e => onChange({ required_disclosures: e.target.value })}
                    />
                </Field>
            </div>
        </div>
    )
}
