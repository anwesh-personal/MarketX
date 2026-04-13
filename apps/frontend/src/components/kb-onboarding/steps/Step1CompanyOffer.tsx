'use client'

import React from 'react'
import { QuestionnaireData } from '../types'
import { KBFormConfig } from '../useKBFormConfig'
import { Field, CharCount } from '../FormPrimitives'

interface Props {
    data: QuestionnaireData
    onChange: (partial: Partial<QuestionnaireData>) => void
    formConfig: KBFormConfig
}

export default function Step1CompanyOffer({ data, onChange, formConfig }: Props) {
    return (
        <div className="space-y-6">
            {/* Row 1: Name + Website */}
            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Company Name" required>
                    <input
                        className="input w-full"
                        placeholder="e.g. Acme Corp"
                        value={data.company_name}
                        onChange={e => onChange({ company_name: e.target.value })}
                    />
                </Field>
                <Field label="Company Website" required>
                    <input
                        className="input w-full"
                        placeholder="https://yoursite.com"
                        value={data.company_website}
                        onChange={e => onChange({ company_website: e.target.value })}
                    />
                </Field>
            </div>

            {/* Row 2: One-line + Category */}
            <div className="grid sm:grid-cols-2 gap-4">
                <Field label="One-Sentence Description" required hint="How would you introduce your company in one sentence?">
                    <input
                        className="input w-full"
                        placeholder="We help B2B companies do X by Y"
                        value={data.one_sentence_description}
                        onChange={e => onChange({ one_sentence_description: e.target.value })}
                    />
                </Field>
                <Field label="Business Category" required>
                    <input
                        className="input w-full"
                        placeholder="e.g. B2B SaaS, Agency, Manufacturing"
                        value={data.business_category}
                        onChange={e => onChange({ business_category: e.target.value })}
                    />
                </Field>
            </div>

            {/* Full description */}
            <Field label="What does your company do?" required hint="Full description — go beyond the one-liner">
                <div className="relative">
                    <textarea
                        className="input w-full min-h-[100px] resize-none"
                        placeholder="We provide... Our platform helps... Companies use us to..."
                        value={data.full_description}
                        onChange={e => onChange({ full_description: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2">
                        <CharCount value={data.full_description} min={50} />
                    </div>
                </div>
            </Field>

            {/* Core product */}
            <Field label="What do you sell? Describe your core product or service in detail." required
                hint="What does the customer actually get? Features, deliverables, components.">
                <div className="relative">
                    <textarea
                        className="input w-full min-h-[100px] resize-none"
                        placeholder="Our core offering is... It includes... Customers receive..."
                        value={data.core_product_description}
                        onChange={e => onChange({ core_product_description: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2">
                        <CharCount value={data.core_product_description} min={100} />
                    </div>
                </div>
            </Field>

            {/* Problem solved */}
            <Field label="What problem does your product solve?" required
                hint="Don't say 'we help companies grow.' Say 'Companies waste $X on Y because Z. We fix that by doing W.'">
                <div className="relative">
                    <textarea
                        className="input w-full min-h-[100px] resize-none"
                        placeholder="Before us, companies struggle with... The cost of this problem is... Our solution changes this by..."
                        value={data.problem_solved}
                        onChange={e => onChange({ problem_solved: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2">
                        <CharCount value={data.problem_solved} min={100} />
                    </div>
                </div>
            </Field>

            {/* Mission */}
            <Field label="Why does your company exist?" required hint="The mission beyond making money.">
                <div className="relative">
                    <textarea
                        className="input w-full min-h-[80px] resize-none"
                        placeholder="We exist because... Our mission is..."
                        value={data.company_mission}
                        onChange={e => onChange({ company_mission: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2">
                        <CharCount value={data.company_mission} min={50} />
                    </div>
                </div>
            </Field>

            {/* Row: Pricing + Deal Size + Delivery */}
            <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Pricing Model" required>
                    <select
                        className="input w-full"
                        value={data.pricing_model}
                        onChange={e => onChange({ pricing_model: e.target.value })}
                    >
                        <option value="">Select...</option>
                        {formConfig.pricingModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </Field>
                <Field label="Typical Deal Size / ACV" required
                    hint="Even if it varies, give a range. '$5K-$15K/mo' or '$50K first year average'">
                    <input
                        className="input w-full"
                        placeholder="e.g. $5K-$15K/month"
                        value={data.typical_deal_size}
                        onChange={e => onChange({ typical_deal_size: e.target.value })}
                    />
                </Field>
                <Field label="Delivery Timeline" required>
                    <input
                        className="input w-full"
                        placeholder="e.g. 2-4 weeks"
                        value={data.delivery_timeline}
                        onChange={e => onChange({ delivery_timeline: e.target.value })}
                    />
                </Field>
            </div>

            {/* Offer components */}
            <Field label="What does your offer include? List everything the customer gets." required>
                <div className="relative">
                    <textarea
                        className="input w-full min-h-[100px] resize-none"
                        placeholder="1. Platform access&#10;2. Onboarding & training&#10;3. Dedicated account manager&#10;4. Monthly reporting..."
                        value={data.offer_components}
                        onChange={e => onChange({ offer_components: e.target.value })}
                    />
                    <div className="absolute bottom-2 right-2">
                        <CharCount value={data.offer_components} min={50} />
                    </div>
                </div>
            </Field>
        </div>
    )
}
