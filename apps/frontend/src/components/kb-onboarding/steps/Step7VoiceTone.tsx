'use client'

import React from 'react'
import { QuestionnaireData } from '../types'
import { KBFormConfig } from '../useKBFormConfig'
import { Field, ChipSelect, SectionHeader } from '../FormPrimitives'

interface Props {
    data: QuestionnaireData
    onChange: (partial: Partial<QuestionnaireData>) => void
    formConfig: KBFormConfig
}

export default function Step7VoiceTone({ data, onChange, formConfig }: Props) {
    return (
        <div className="space-y-6">
            <SectionHeader
                title="Voice, Tone & Communication Style"
                description="How should AI-generated outbound sound? This directly controls email generation."
            />

            <Field label="Communication style (pick up to 3)" required
                hint="This determines the personality of all generated content.">
                <ChipSelect
                    options={formConfig.communicationStyles}
                    selected={data.communication_style || []}
                    onChange={v => onChange({ communication_style: v.slice(0, 3) })}
                />
            </Field>

            <Field label="Show us tone examples" required
                hint="Paste 2-3 sentences that sound like YOUR brand. This is the gold standard the AI will emulate.">
                <textarea className="input w-full min-h-[100px] resize-none"
                    placeholder="Example 1: 'We don't sugarcoat things. If your pipeline's broken, we'll tell you — and then fix it.'&#10;&#10;Example 2: 'Most companies waste 40% of their outbound budget. We think that's a solvable problem.'"
                    value={data.tone_examples}
                    onChange={e => onChange({ tone_examples: e.target.value })}
                />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Words / phrases to USE" hint="Terminology your brand uses deliberately">
                    <textarea className="input w-full min-h-[80px] resize-none"
                        placeholder="e.g. 'infrastructure', 'engineering-grade', 'owner economics', 'predictable pipeline'"
                        value={data.words_to_use}
                        onChange={e => onChange({ words_to_use: e.target.value })}
                    />
                </Field>
                <Field label="Words / phrases to AVOID" required hint="Things AI should NEVER write in your outbound">
                    <textarea className="input w-full min-h-[80px] resize-none"
                        placeholder="e.g. 'just checking in', 'touching base', 'synergy', 'utilize', 'circle back', 'low-hanging fruit'"
                        value={data.words_to_avoid}
                        onChange={e => onChange({ words_to_avoid: e.target.value })}
                    />
                </Field>
            </div>

            <Field label="How should the system respond to hostile / negative replies?" required
                hint="When a prospect replies angrily, what's the policy? This enforces compliance with Section 10 of the KB.">
                <textarea className="input w-full min-h-[80px] resize-none"
                    placeholder="e.g. 'Acknowledge their frustration, apologize for the interruption, offer to remove them immediately. Never argue. Never get defensive. Never send more than one de-escalation reply.'"
                    value={data.hostile_response_policy}
                    onChange={e => onChange({ hostile_response_policy: e.target.value })}
                />
            </Field>
        </div>
    )
}
