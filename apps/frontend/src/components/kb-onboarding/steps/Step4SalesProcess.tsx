'use client'

import React from 'react'
import { QuestionnaireData, SALES_CYCLE_OPTIONS, STAKEHOLDER_OPTIONS } from '../types'
import { Field, CharCount, SectionHeader } from '../FormPrimitives'

interface Props {
    data: QuestionnaireData
    onChange: (partial: Partial<QuestionnaireData>) => void
}

export default function Step4SalesProcess({ data, onChange }: Props) {
    return (
        <div className="space-y-6">
            <SectionHeader
                title="Sales Process & Qualification"
                description="How deals actually move through your pipeline"
            />

            <Field label="Walk us through your sales process step by step" required
                hint="From first touch to signed deal. Include the stages, who's involved at each stage, and what happens.">
                <div className="relative">
                    <textarea className="input w-full min-h-[120px] resize-none"
                        placeholder="1. Cold outreach → discovery call (SDR)&#10;2. Qualification call → demo (AE)&#10;3. Technical validation (SE)&#10;4. Proposal & negotiation (AE + VP)&#10;5. Legal review → signed contract"
                        value={data.sales_process_steps}
                        onChange={e => onChange({ sales_process_steps: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2"><CharCount value={data.sales_process_steps} min={100} /></div>
                </div>
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Typical Sales Cycle" required>
                    <div className="flex flex-wrap gap-2">
                        {SALES_CYCLE_OPTIONS.map(opt => (
                            <button key={opt} type="button" onClick={() => onChange({ sales_cycle_length: opt })}
                                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${data.sales_cycle_length === opt ? 'bg-accent/10 border-accent text-accent font-medium' : 'border-border text-textSecondary hover:border-borderHover'}`}>
                                {opt}
                            </button>
                        ))}
                    </div>
                </Field>
                <Field label="Typical # of Stakeholders" required>
                    <div className="flex flex-wrap gap-2">
                        {STAKEHOLDER_OPTIONS.map(opt => (
                            <button key={opt} type="button" onClick={() => onChange({ stakeholder_count: opt })}
                                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${data.stakeholder_count === opt ? 'bg-accent/10 border-accent text-accent font-medium' : 'border-border text-textSecondary hover:border-borderHover'}`}>
                                {opt}
                            </button>
                        ))}
                    </div>
                </Field>
            </div>

            <Field label="How do you know a lead is qualified? What criteria must they meet?" required
                hint="Be specific. 'They have budget' is too vague. 'They have a confirmed Q1 budget of $50K+ for compliance tools' is good.">
                <div className="relative">
                    <textarea className="input w-full min-h-[80px] resize-none"
                        placeholder="1. Budget confirmed for this quarter&#10;2. Decision-maker identified&#10;3. Current solution failing or absent&#10;4. Timeline within 3 months"
                        value={data.qualification_criteria}
                        onChange={e => onChange({ qualification_criteria: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2"><CharCount value={data.qualification_criteria} min={50} /></div>
                </div>
            </Field>

            <Field label="When do you disqualify a lead?" required
                hint="What signals tell you this will NEVER close?">
                <div className="relative">
                    <textarea className="input w-full min-h-[60px] resize-none"
                        placeholder="e.g. No budget, wrong industry, fewer than 10 employees, actively building in-house"
                        value={data.disqualification_criteria}
                        onChange={e => onChange({ disqualification_criteria: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2"><CharCount value={data.disqualification_criteria} min={30} /></div>
                </div>
            </Field>

            <Field label="Sales team capacity" hint="How many AEs? Avg deal load? This calibrates AI output volume.">
                <input className="input w-full" placeholder="e.g. 3 AEs, each handling 20-30 deals at once"
                    value={data.sales_team_capacity}
                    onChange={e => onChange({ sales_team_capacity: e.target.value })} />
            </Field>

            <Field label="Describe your best-ever closed deal" hint="The one you'd clone if you could. What made it perfect?">
                <div className="relative">
                    <textarea className="input w-full min-h-[100px] resize-none"
                        placeholder="Company X came to us because... The champion was... They signed in X weeks because... The deal was worth $X because..."
                        value={data.winning_deal_example}
                        onChange={e => onChange({ winning_deal_example: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2"><CharCount value={data.winning_deal_example} min={100} /></div>
                </div>
            </Field>
        </div>
    )
}
