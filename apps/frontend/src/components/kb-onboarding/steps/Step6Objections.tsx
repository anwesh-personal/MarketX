'use client'

import React from 'react'
import { QuestionnaireData } from '../types'
import { Field, CharCount, SectionHeader } from '../FormPrimitives'

interface Props {
    data: QuestionnaireData
    onChange: (partial: Partial<QuestionnaireData>) => void
}

export default function Step6Objections({ data, onChange }: Props) {
    return (
        <div className="space-y-6">
            <SectionHeader
                title="Objections & Friction"
                description="Everything that slows, stops, or kills your deals."
            />

            <Field label="List your top objections (minimum 5)" required
                hint="What do prospects say when they push back? List each objection on a new line.">
                <div className="relative">
                    <textarea className="input w-full min-h-[120px] resize-none"
                        placeholder="1. 'It's too expensive'&#10;2. 'We already have something that works'&#10;3. 'We don't have time to implement right now'&#10;4. 'I need to check with my team'&#10;5. 'How is this different from X?'"
                        value={data.top_objections}
                        onChange={e => onChange({ top_objections: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2"><CharCount value={data.top_objections} min={100} /></div>
                </div>
            </Field>

            <Field label="How do you handle each objection?" required
                hint="Match each objection above with your best response. This trains the AI to reply correctly.">
                <div className="relative">
                    <textarea className="input w-full min-h-[120px] resize-none"
                        placeholder="1. Price → 'The cost of NOT doing this is $X/month in lost...'&#10;2. Incumbent → 'What if we could do everything they do plus...'&#10;3. Timing → 'What changes in 3 months? The problem only gets worse...'"
                        value={data.objection_responses}
                        onChange={e => onChange({ objection_responses: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2"><CharCount value={data.objection_responses} min={100} /></div>
                </div>
            </Field>

            <Field label="Switching worries" hint="What concerns do prospects have about switching FROM their current approach?">
                <textarea className="input w-full min-h-[80px] resize-none"
                    placeholder="e.g. Data migration headache, team retraining, sunk cost in current tool, vendor lock-in fears"
                    value={data.switching_worries}
                    onChange={e => onChange({ switching_worries: e.target.value })}
                />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Economic concerns" hint="Price, ROI, budget objections">
                    <textarea className="input w-full min-h-[80px] resize-none"
                        placeholder="e.g. 'Need to justify to CFO', 'budget already allocated', 'need to see ROI proof first'"
                        value={data.economic_concerns}
                        onChange={e => onChange({ economic_concerns: e.target.value })}
                    />
                </Field>
                <Field label="Trust concerns" hint="Why don't they trust you yet?">
                    <textarea className="input w-full min-h-[80px] resize-none"
                        placeholder="e.g. 'Never heard of you', 'too small/new', 'how do I know this works in my industry?'"
                        value={data.trust_concerns}
                        onChange={e => onChange({ trust_concerns: e.target.value })}
                    />
                </Field>
            </div>

            <Field label="What misconceptions exist about your category?" hint="Things prospects wrongly believe about solutions like yours.">
                <textarea className="input w-full min-h-[80px] resize-none"
                    placeholder="e.g. 'AI will replace our team', 'All tools in this space are the same', 'We tried something similar and it failed'"
                    value={data.category_misconceptions}
                    onChange={e => onChange({ category_misconceptions: e.target.value })}
                />
            </Field>

            <Field label="Competitor claims you need to counter" hint="What do competitors say about your space that you need to proactively address?">
                <textarea className="input w-full min-h-[80px] resize-none"
                    placeholder="e.g. CompetitorA claims they have 'the best AI' — here's why that's misleading..."
                    value={data.competitor_claims_to_counter}
                    onChange={e => onChange({ competitor_claims_to_counter: e.target.value })}
                />
            </Field>
        </div>
    )
}
