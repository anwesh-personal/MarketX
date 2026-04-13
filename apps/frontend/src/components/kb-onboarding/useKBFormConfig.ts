/**
 * useKBFormConfig — loads form config from DB.
 * Used by the client wizard to get dropdown options dynamically.
 * Falls back to hardcoded defaults if API fails (resilient).
 */
import { useState, useEffect } from 'react'

// Hardcoded fallbacks — only used if DB is unreachable
const FALLBACK_CONFIG: Record<string, any> = {
    dropdown_industries: ['SaaS / Software', 'FinTech', 'HealthTech', 'EdTech', 'E-Commerce', 'Agency / Consulting', 'Real Estate', 'Manufacturing', 'Professional Services', 'Cybersecurity', 'AI / ML', 'MarTech', 'HRTech', 'LegalTech', 'Insurance', 'Logistics / Supply Chain', 'Construction', 'Hospitality', 'Nonprofit', 'Government', 'Retail', 'Energy', 'Other'],
    dropdown_company_sizes: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000-5000', '5000+'],
    dropdown_revenue_ranges: ['<$1M', '$1M-$10M (SMB)', '$10M-$100M (LMM)', '$100M-$1B (MM)', '>$1B (ENT)'],
    dropdown_geographies: ['US', 'Canada', 'UK', 'EU', 'APAC', 'LATAM', 'MEA', 'Global'],
    dropdown_pricing_models: ['Subscription', 'One-time', 'Usage-based', 'Performance-based', 'Retainer', 'Custom/Hybrid'],
    dropdown_communication_styles: ['Professional', 'Conversational', 'Technical', 'Bold/Direct', 'Consultative', 'Friendly', 'Formal'],
    dropdown_cta_types: ['Book a call', 'Request a demo', 'Download a resource', 'Reply to email', 'Fill out a form', 'Other'],
    dropdown_meeting_lengths: ['15 min', '30 min', '45 min', '60 min'],
    dropdown_sales_cycle: ['<1 week', '1-4 weeks', '1-3 months', '3-6 months', '6-12 months', '12+ months'],
    dropdown_stakeholder_count: ['1', '2-3', '4-6', '7+'],
    dropdown_artifact_categories: [
        { value: 'sales_deck', label: 'Sales Decks / Pitch Decks', accept: '.pdf,.pptx,.docx,.doc' },
        { value: 'case_study', label: 'Case Studies / Success Stories', accept: '.pdf,.docx,.doc,.txt,.md' },
        { value: 'objection_handling', label: 'Objection Handling / Battlecards', accept: '.pdf,.docx,.doc,.txt,.md' },
        { value: 'competitive_positioning', label: 'Competitive Positioning Docs', accept: '.pdf,.docx,.doc,.txt,.md' },
        { value: 'call_recording', label: 'Call Recordings / Transcripts', accept: '.mp3,.wav,.m4a,.txt,.md' },
        { value: 'email_campaigns', label: 'Historical Email Campaigns', accept: '.pdf,.docx,.txt,.csv,.md' },
        { value: 'website_content', label: 'Website Content Export', accept: '.pdf,.html,.txt,.md' },
        { value: 'internal_docs', label: 'Internal Process Docs / Playbooks', accept: '.pdf,.docx,.doc,.txt,.md' },
        { value: 'crm_data', label: 'CRM Export / Pipeline Data', accept: '.csv,.xlsx,.xls' },
    ],
}

export interface KBFormConfig {
    industries: string[]
    companySizes: string[]
    revenueRanges: string[]
    geographies: string[]
    pricingModels: string[]
    communicationStyles: string[]
    ctaTypes: string[]
    meetingLengths: string[]
    salesCycleOptions: string[]
    stakeholderOptions: string[]
    artifactCategories: { value: string; label: string; accept: string }[]
    loaded: boolean
}

export function useKBFormConfig(): KBFormConfig {
    const [config, setConfig] = useState<KBFormConfig>(buildConfig(FALLBACK_CONFIG))

    useEffect(() => {
        let cancelled = false
        fetch('/api/kb/form-config')
            .then(r => r.json())
            .then(j => {
                if (!cancelled && j.success && j.config) {
                    setConfig(buildConfig(j.config))
                }
            })
            .catch(() => {
                // Silently use fallbacks — form still works
            })
        return () => { cancelled = true }
    }, [])

    return config
}

function buildConfig(raw: Record<string, any>): KBFormConfig {
    return {
        industries: raw.dropdown_industries || FALLBACK_CONFIG.dropdown_industries,
        companySizes: raw.dropdown_company_sizes || FALLBACK_CONFIG.dropdown_company_sizes,
        revenueRanges: raw.dropdown_revenue_ranges || FALLBACK_CONFIG.dropdown_revenue_ranges,
        geographies: raw.dropdown_geographies || FALLBACK_CONFIG.dropdown_geographies,
        pricingModels: raw.dropdown_pricing_models || FALLBACK_CONFIG.dropdown_pricing_models,
        communicationStyles: raw.dropdown_communication_styles || FALLBACK_CONFIG.dropdown_communication_styles,
        ctaTypes: raw.dropdown_cta_types || FALLBACK_CONFIG.dropdown_cta_types,
        meetingLengths: raw.dropdown_meeting_lengths || FALLBACK_CONFIG.dropdown_meeting_lengths,
        salesCycleOptions: raw.dropdown_sales_cycle || FALLBACK_CONFIG.dropdown_sales_cycle,
        stakeholderOptions: raw.dropdown_stakeholder_count || FALLBACK_CONFIG.dropdown_stakeholder_count,
        artifactCategories: raw.dropdown_artifact_categories || FALLBACK_CONFIG.dropdown_artifact_categories,
        loaded: true,
    }
}
