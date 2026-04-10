'use client'

import React from 'react'
import { QuestionnaireData, CTA_TYPES, MEETING_LENGTHS } from '../types'
import { Field, SectionHeader } from '../FormPrimitives'

interface Props {
    data: QuestionnaireData
    onChange: (partial: Partial<QuestionnaireData>) => void
}

export default function Step8Conversion({ data, onChange }: Props) {
    return (
        <div className="space-y-6">
            <SectionHeader
                title="Conversion Infrastructure"
                description="Where conversations convert — CTAs, booking links, landing pages."
            />

            <Field label="Primary CTA Type" required hint="What's the main action you want prospects to take?">
                <div className="flex flex-wrap gap-2">
                    {CTA_TYPES.map(opt => (
                        <button key={opt} type="button" onClick={() => onChange({ primary_cta_type: opt })}
                            className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${data.primary_cta_type === opt ? 'bg-accent/10 border-accent text-accent font-medium' : 'border-border text-textSecondary hover:border-borderHover'}`}>
                            {opt}
                        </button>
                    ))}
                </div>
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Booking / Calendar URL" required hint="e.g. Calendly, HubSpot meetings, or custom booking page">
                    <input className="input w-full" placeholder="https://calendly.com/yourname"
                        value={data.booking_url}
                        onChange={e => onChange({ booking_url: e.target.value })}
                    />
                </Field>
                <Field label="Who takes the meetings?" required>
                    <input className="input w-full" placeholder="e.g. John Smith, AE Team, SDR Team"
                        value={data.meeting_owner}
                        onChange={e => onChange({ meeting_owner: e.target.value })}
                    />
                </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Meeting Length" required>
                    <div className="flex flex-wrap gap-2">
                        {MEETING_LENGTHS.map(opt => (
                            <button key={opt} type="button" onClick={() => onChange({ meeting_length: opt })}
                                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${data.meeting_length === opt ? 'bg-accent/10 border-accent text-accent font-medium' : 'border-border text-textSecondary hover:border-borderHover'}`}>
                                {opt}
                            </button>
                        ))}
                    </div>
                </Field>
                <Field label="Landing Page URL" hint="Main landing page for outbound traffic">
                    <input className="input w-full" placeholder="https://yoursite.com/demo"
                        value={data.landing_page_url}
                        onChange={e => onChange({ landing_page_url: e.target.value })}
                    />
                </Field>
            </div>

            <Field label="Secondary CTAs" hint="Other conversion actions the AI can use (watch a video, download a guide, etc.)">
                <textarea className="input w-full min-h-[60px] resize-none"
                    placeholder="1. Download our ROI calculator → [url]&#10;2. Watch the 2-min demo → [url]&#10;3. Read the case study → [url]"
                    value={data.secondary_ctas}
                    onChange={e => onChange({ secondary_ctas: e.target.value })}
                />
            </Field>

            <Field label="Pre-meeting info" hint="What should the prospect know before the first meeting? This goes in meeting confirmation emails.">
                <textarea className="input w-full min-h-[60px] resize-none"
                    placeholder="e.g. Please have your current metrics ready. We'll walk through a 15-min ROI analysis."
                    value={data.pre_meeting_info}
                    onChange={e => onChange({ pre_meeting_info: e.target.value })}
                />
            </Field>
        </div>
    )
}
