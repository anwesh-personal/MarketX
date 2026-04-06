'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    Building2, Users, Target, Sparkles, Rocket, ArrowRight, ArrowLeft,
    Plus, X, Check, Loader2, Zap, Brain, Mail, BarChart3, Shield,
    Globe, Briefcase, MessageSquare, TrendingUp, Package, Bot,
    Lightbulb, AlertTriangle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ============================================================
// TYPES
// ============================================================

interface CompanyData {
    name: string; industry: string; website: string; description: string; size: string
}
interface ICPEntry {
    id: string; title: string; seniority: string; company_size: string
    industry: string; pain_points: string[]; goals: string[]; objections: string[]
}
interface OfferData {
    name: string; category: string; primary_promise: string; pricing_model: string
    key_differentiators: string[]; proof_points: string[]
}
interface VoiceData {
    tone: string; personality: string[]; phrases_to_use: string[]; phrases_to_avoid: string[]
    email_sign_off: string
}

export interface OnboardingState {
    completed: boolean
    percentage: number
    currentStep: number
    totalSteps: number
}

interface OnboardingModalProps {
    isOpen: boolean
    onClose: () => void
    onComplete: () => void
    userId: string
    orgId: string
    orgName: string
    initialStep?: number
}

// ============================================================
// CONSTANTS
// ============================================================

const INDUSTRIES = [
    'SaaS / Software', 'FinTech', 'HealthTech', 'EdTech', 'E-Commerce',
    'Agency / Consulting', 'Real Estate', 'Manufacturing', 'Professional Services',
    'Cybersecurity', 'AI / ML', 'MarTech', 'HRTech', 'LegalTech', 'Other'
]
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+']
const SENIORITY_LEVELS = ['C-Suite', 'VP', 'Director', 'Manager', 'Individual Contributor']
const PRICING_MODELS = [
    'Subscription (Monthly/Annual)', 'Pay-per-use', 'One-time License',
    'Freemium', 'Custom / Enterprise', 'Revenue Share'
]
const TONE_OPTIONS = [
    { value: 'professional', label: 'Professional', icon: Briefcase, desc: 'Clear, authoritative' },
    { value: 'conversational', label: 'Conversational', icon: MessageSquare, desc: 'Friendly, warm' },
    { value: 'bold', label: 'Bold & Direct', icon: Zap, desc: 'Confident, no-nonsense' },
    { value: 'consultative', label: 'Consultative', icon: Lightbulb, desc: 'Insightful, advisory' },
]
const PERSONALITY_TRAITS = [
    'Witty', 'Empathetic', 'Data-driven', 'Storyteller', 'Challenger',
    'Educator', 'Visionary', 'Pragmatic', 'Contrarian', 'Supportive'
]

const STEPS = [
    { num: 1, title: 'Your Company', icon: Building2, subtitle: 'Tell us about your business' },
    { num: 2, title: 'Your Customers', icon: Target, subtitle: 'Who are you selling to?' },
    { num: 3, title: 'Your Offer', icon: Package, subtitle: 'What do you sell?' },
    { num: 4, title: 'Your Voice', icon: MessageSquare, subtitle: 'How should we sound?' },
    { num: 5, title: 'Your System', icon: Bot, subtitle: 'See what we built for you' },
    { num: 6, title: 'Activate', icon: Rocket, subtitle: 'Feed everything to your Brain' },
]

const TOTAL_STEPS = STEPS.length

// ============================================================
// HELPER: compute % from form state
// ============================================================

export function computeOnboardingPercentage(
    company: CompanyData, icps: ICPEntry[], offer: OfferData, voice: VoiceData
): number {
    let filled = 0
    let total = 4

    if (company.name && company.industry && company.description) filled++
    if (icps.some(i => i.title && i.seniority && i.pain_points.some(p => p.trim()))) filled++
    if (offer.name && offer.primary_promise) filled++
    if (voice.tone) filled++

    return Math.round((filled / total) * 100)
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OnboardingModal({ isOpen, onClose, onComplete, userId, orgId, orgName, initialStep }: OnboardingModalProps) {
    const supabase = createClient()
    const [step, setStep] = useState(initialStep || 1)
    const [isCompleting, setIsCompleting] = useState(false)
    const [sampleEmail, setSampleEmail] = useState('')
    const [aiGenerated, setAiGenerated] = useState(false)
    const [error, setError] = useState('')
    const [assignedBundle, setAssignedBundle] = useState<any>(null)
    const [assignedAgents, setAssignedAgents] = useState<any[]>([])

    const [company, setCompany] = useState<CompanyData>({ name: orgName || '', industry: '', website: '', description: '', size: '' })
    const [icps, setIcps] = useState<ICPEntry[]>([{
        id: crypto.randomUUID(), title: '', seniority: '', company_size: '',
        industry: '', pain_points: [''], goals: [''], objections: ['']
    }])
    const [offer, setOffer] = useState<OfferData>({
        name: '', category: '', primary_promise: '', pricing_model: '',
        key_differentiators: [''], proof_points: ['']
    })
    const [voice, setVoice] = useState<VoiceData>({
        tone: '', personality: [], phrases_to_use: [''], phrases_to_avoid: [''], email_sign_off: ''
    })

    // Load existing session on mount
    useEffect(() => {
        if (!isOpen || !userId) return
        loadSession()
    }, [isOpen, userId])

    const loadSession = async () => {
        const { data: session } = await supabase
            .from('onboarding_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'in_progress')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (session) {
            if (session.company_data && Object.keys(session.company_data).length > 0) setCompany(session.company_data as CompanyData)
            if (session.icp_data && (session.icp_data as any[]).length > 0) setIcps(session.icp_data as ICPEntry[])
            if (session.offer_data && Object.keys(session.offer_data).length > 0) setOffer(session.offer_data as OfferData)
            if (session.voice_data && Object.keys(session.voice_data).length > 0) setVoice(session.voice_data as VoiceData)
            if (session.current_step) setStep(session.current_step)
        }

        // Load assigned bundle + agents
        if (orgId) {
            const { data: instances } = await supabase
                .from('engine_instances')
                .select('id, name, snapshot, status, bundle_id')
                .eq('org_id', orgId)
                .eq('status', 'active')
                .limit(1)

            if (instances?.length) setAssignedBundle(instances[0])

            const { data: agents } = await supabase
                .from('brain_agents')
                .select('id, name, avatar_emoji, tier, status, tools_granted, preferred_provider, preferred_model')
                .eq('org_id', orgId)

            if (agents) setAssignedAgents(agents)
        }
    }

    const saveProgress = useCallback(async (currentStep: number) => {
        if (!userId || !orgId) return
        await supabase.from('onboarding_sessions').upsert({
            user_id: userId, org_id: orgId, status: 'in_progress',
            current_step: currentStep,
            company_data: company, icp_data: icps, offer_data: offer, voice_data: voice,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }).then(() => {})
    }, [userId, orgId, company, icps, offer, voice])

    const nextStep = async () => {
        if (step < TOTAL_STEPS) {
            const next = step + 1
            setStep(next)
            await saveProgress(next)
        }
    }
    const prevStep = () => { if (step > 1) setStep(step - 1) }

    const canProceed = (): boolean => {
        switch (step) {
            case 1: return !!(company.name && company.industry && company.description)
            case 2: return icps.some(icp => !!(icp.title && icp.seniority && icp.pain_points.some(p => p.trim())))
            case 3: return !!(offer.name && offer.primary_promise)
            case 4: return !!voice.tone
            case 5: return true
            default: return true
        }
    }

    const completeOnboarding = async () => {
        setIsCompleting(true)
        setError('')
        try {
            const res = await fetch('/api/onboarding/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company, icps, offer, voice })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed')
            if (data.sample_email) setSampleEmail(data.sample_email)
            if (data.ai_generated) setAiGenerated(true)
            setTimeout(() => onComplete(), 4000)
        } catch (e: any) {
            setError(e.message)
            setIsCompleting(false)
        }
    }

    // Array helpers
    const addToArr = (setter: Function, path: string, current: any) => {
        setter((prev: any) => {
            const c = structuredClone(prev)
            if (Array.isArray(c) && current) { const i = c.findIndex((x: any) => x.id === current.id); if (i >= 0) c[i][path] = [...c[i][path], '']; return c }
            c[path] = [...c[path], '']; return c
        })
    }
    const rmFromArr = (setter: Function, path: string, index: number, current?: any) => {
        setter((prev: any) => {
            const c = structuredClone(prev)
            if (Array.isArray(c) && current) { const i = c.findIndex((x: any) => x.id === current.id); if (i >= 0) c[i][path].splice(index, 1); return c }
            c[path].splice(index, 1); return c
        })
    }
    const updateArr = (setter: Function, path: string, index: number, value: string, current?: any) => {
        setter((prev: any) => {
            const c = structuredClone(prev)
            if (Array.isArray(c) && current) { const i = c.findIndex((x: any) => x.id === current.id); if (i >= 0) c[i][path][index] = value; return c }
            c[path][index] = value; return c
        })
    }

    if (!isOpen) return null

    const pct = computeOnboardingPercentage(company, icps, offer, voice)

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-overlay backdrop-blur-md" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-surface border border-border rounded-[var(--radius-lg)] shadow-xl flex flex-col overflow-hidden animate-scale-in">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                            {React.createElement(STEPS[step - 1].icon, { className: 'w-4 h-4 text-white' })}
                        </div>
                        <div>
                            <h2 className="font-bold text-textPrimary text-lg leading-tight">{STEPS[step - 1].title}</h2>
                            <p className="text-xs text-textTertiary">{STEPS[step - 1].subtitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Progress */}
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="flex gap-1">
                                {STEPS.map(s => (
                                    <div key={s.num} className={`h-1.5 rounded-full transition-all duration-500 ${s.num <= step ? 'bg-accent w-6' : 'bg-border w-3'}`} />
                                ))}
                            </div>
                            <span className="text-xs text-textTertiary font-mono">{step}/{TOTAL_STEPS}</span>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surfaceHover text-textTertiary hover:text-textPrimary transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body (scrollable) */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {error && (
                        <div className="mb-4 p-3 bg-surfaceElevated border border-border rounded-xl text-error text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                    )}

                    {/* STEP 1: Company */}
                    {step === 1 && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Company Name *">
                                    <input className="input w-full" placeholder="e.g. Acme Corp" value={company.name} onChange={e => setCompany(p => ({ ...p, name: e.target.value }))} />
                                </Field>
                                <Field label="Industry *">
                                    <select className="input w-full" value={company.industry} onChange={e => setCompany(p => ({ ...p, industry: e.target.value }))}>
                                        <option value="">Select industry</option>
                                        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                                    </select>
                                </Field>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Website">
                                    <input className="input w-full" placeholder="https://yoursite.com" value={company.website} onChange={e => setCompany(p => ({ ...p, website: e.target.value }))} />
                                </Field>
                                <Field label="Company Size">
                                    <div className="flex gap-2 flex-wrap">
                                        {COMPANY_SIZES.map(s => (
                                            <button key={s} onClick={() => setCompany(p => ({ ...p, size: s }))}
                                                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${company.size === s ? 'bg-accent/10 border-accent text-accent' : 'border-border text-textSecondary hover:border-borderHover'}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </Field>
                            </div>
                            <Field label="About your business *" hint="What does your company do? What problem do you solve?">
                                <textarea className="input w-full min-h-[100px] resize-none" placeholder="We help B2B SaaS companies reduce churn by..."
                                    value={company.description} onChange={e => setCompany(p => ({ ...p, description: e.target.value }))} />
                            </Field>
                        </div>
                    )}

                    {/* STEP 2: ICPs */}
                    {step === 2 && (
                        <div className="space-y-5 animate-fade-in">
                            {icps.map((icp, idx) => (
                                <div key={icp.id} className="card p-5 space-y-4 border-border/60">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-textPrimary flex items-center gap-2">
                                            <Target className="w-4 h-4 text-accent" /> ICP #{idx + 1}
                                        </h3>
                                        {icps.length > 1 && (
                                            <button onClick={() => setIcps(p => p.filter((_, i) => i !== idx))} className="text-textTertiary hover:text-error"><X className="w-4 h-4" /></button>
                                        )}
                                    </div>
                                    <div className="grid sm:grid-cols-3 gap-3">
                                        <Field label="Job Title *">
                                            <input className="input w-full" placeholder="VP of Engineering" value={icp.title}
                                                onChange={e => setIcps(p => p.map((x, i) => i === idx ? { ...x, title: e.target.value } : x))} />
                                        </Field>
                                        <Field label="Seniority *">
                                            <select className="input w-full" value={icp.seniority} onChange={e => setIcps(p => p.map((x, i) => i === idx ? { ...x, seniority: e.target.value } : x))}>
                                                <option value="">Select</option>
                                                {SENIORITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Target Co. Size">
                                            <select className="input w-full" value={icp.company_size} onChange={e => setIcps(p => p.map((x, i) => i === idx ? { ...x, company_size: e.target.value } : x))}>
                                                <option value="">Any</option>
                                                {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </Field>
                                    </div>
                                    <ArrField label="Pain Points *" items={icp.pain_points} placeholder="e.g. Losing deals to competitors"
                                        onChange={(i, v) => updateArr(setIcps, 'pain_points', i, v, icp)}
                                        onAdd={() => addToArr(setIcps, 'pain_points', icp)}
                                        onRemove={i => rmFromArr(setIcps, 'pain_points', i, icp)} />
                                    <ArrField label="Goals" items={icp.goals} placeholder="e.g. Reduce onboarding time"
                                        onChange={(i, v) => updateArr(setIcps, 'goals', i, v, icp)}
                                        onAdd={() => addToArr(setIcps, 'goals', icp)}
                                        onRemove={i => rmFromArr(setIcps, 'goals', i, icp)} />
                                </div>
                            ))}
                            <button onClick={() => setIcps(p => [...p, { id: crypto.randomUUID(), title: '', seniority: '', company_size: '', industry: '', pain_points: [''], goals: [''], objections: [''] }])}
                                className="btn btn-secondary w-full flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" /> Add Another ICP
                            </button>
                        </div>
                    )}

                    {/* STEP 3: Offer */}
                    {step === 3 && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Offer Name *">
                                    <input className="input w-full" placeholder="Predictive Churn Platform" value={offer.name} onChange={e => setOffer(p => ({ ...p, name: e.target.value }))} />
                                </Field>
                                <Field label="Pricing Model">
                                    <select className="input w-full" value={offer.pricing_model} onChange={e => setOffer(p => ({ ...p, pricing_model: e.target.value }))}>
                                        <option value="">Select</option>
                                        {PRICING_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </Field>
                            </div>
                            <Field label="Primary Promise *" hint="One sentence — what transformation do you deliver?">
                                <textarea className="input w-full min-h-[70px] resize-none" placeholder="We help you identify and save 40% of at-risk accounts..."
                                    value={offer.primary_promise} onChange={e => setOffer(p => ({ ...p, primary_promise: e.target.value }))} />
                            </Field>
                            <ArrField label="Key Differentiators" items={offer.key_differentiators} placeholder="e.g. Only platform using behavioral signals"
                                onChange={(i, v) => updateArr(setOffer, 'key_differentiators', i, v)}
                                onAdd={() => addToArr(setOffer, 'key_differentiators', null)}
                                onRemove={i => rmFromArr(setOffer, 'key_differentiators', i)} />
                            <ArrField label="Proof Points" items={offer.proof_points} placeholder="e.g. Helped Stripe reduce churn by 34%"
                                onChange={(i, v) => updateArr(setOffer, 'proof_points', i, v)}
                                onAdd={() => addToArr(setOffer, 'proof_points', null)}
                                onRemove={i => rmFromArr(setOffer, 'proof_points', i)} />
                        </div>
                    )}

                    {/* STEP 4: Voice */}
                    {step === 4 && (
                        <div className="space-y-5 animate-fade-in">
                            <Field label="Tone of Voice *">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {TONE_OPTIONS.map(t => (
                                        <button key={t.value} onClick={() => setVoice(p => ({ ...p, tone: t.value }))}
                                            className={`p-3 rounded-xl border text-left transition-all hover:-translate-y-0.5 ${voice.tone === t.value
                                                ? 'bg-accent/10 border-accent shadow-sm' : 'border-border hover:border-borderHover bg-surface'}`}>
                                            {React.createElement(t.icon, { className: `w-4 h-4 mb-1.5 ${voice.tone === t.value ? 'text-accent' : 'text-textTertiary'}` })}
                                            <div className={`text-sm font-semibold ${voice.tone === t.value ? 'text-accent' : 'text-textPrimary'}`}>{t.label}</div>
                                            <div className="text-[11px] text-textTertiary">{t.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </Field>
                            <Field label="Personality (pick up to 3)">
                                <div className="flex flex-wrap gap-2">
                                    {PERSONALITY_TRAITS.map(t => (
                                        <button key={t} onClick={() => setVoice(p => ({
                                            ...p, personality: p.personality.includes(t)
                                                ? p.personality.filter(x => x !== t)
                                                : p.personality.length < 3 ? [...p.personality, t] : p.personality
                                        }))} className={`px-3 py-1 rounded-full text-xs border transition-all ${voice.personality.includes(t) ? 'bg-accent/10 border-accent text-accent' : 'border-border text-textSecondary hover:border-borderHover'}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </Field>
                            <Field label="Email Sign-off">
                                <input className="input w-full" placeholder="Best, [Name]" value={voice.email_sign_off} onChange={e => setVoice(p => ({ ...p, email_sign_off: e.target.value }))} />
                            </Field>
                        </div>
                    )}

                    {/* STEP 5: Activate */}
                    {/* STEP 5: Your System */}
                    {step === 5 && (
                        <div className="space-y-5 animate-fade-in">
                            {assignedBundle && (
                                <div className="card p-5 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                                            <Package className="w-5 h-5 text-accent" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-textPrimary">{assignedBundle.name || 'MarketX Engine'}</h3>
                                            <p className="text-xs text-textTertiary">Your assigned engine bundle</p>
                                        </div>
                                        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-surfaceElevated text-success border border-border">Active</span>
                                    </div>
                                </div>
                            )}

                            {assignedAgents.length > 0 ? (
                                <div>
                                    <h3 className="font-semibold text-textPrimary mb-3 flex items-center gap-2 text-sm">
                                        <Bot className="w-4 h-4 text-accent" /> Your AI Agents
                                    </h3>
                                    <div className="grid gap-3">
                                        {assignedAgents.map(agent => (
                                            <div key={agent.id} className="card p-4 flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-base">{agent.avatar_emoji || '🤖'}</div>
                                                <div className="flex-grow">
                                                    <div className="font-semibold text-textPrimary text-sm">{agent.name}</div>
                                                    <div className="text-xs text-textTertiary">{agent.tier} · {agent.preferred_provider || 'default'} · {(agent.tools_granted || []).length} tools</div>
                                                </div>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${agent.status === 'active' ? 'bg-surfaceElevated text-success' : 'bg-surface text-textTertiary'}`}>{agent.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="card p-6 text-center">
                                    <Bot className="w-8 h-8 text-textTertiary mx-auto mb-2" />
                                    <p className="text-sm text-textSecondary">Your admin is setting up your agents. They'll appear here once deployed.</p>
                                </div>
                            )}

                            {!assignedBundle && assignedAgents.length === 0 && (
                                <div className="card p-5 border-border bg-surface text-center">
                                    <p className="text-sm text-textSecondary">No engine bundle deployed to your organization yet. Your admin needs to deploy one from the Superadmin panel.</p>
                                </div>
                            )}

                            <div className="text-xs text-textTertiary text-center mt-2">
                                Your Brain will use these agents and tools to write emails, analyze signals, and learn from your campaigns.
                            </div>
                        </div>
                    )}

                    {/* STEP 6: Activate */}
                    {step === 6 && (
                        <div className="animate-fade-in">
                            {!isCompleting && !sampleEmail && (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-[var(--radius-lg)] bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                                        <Sparkles className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-xl font-bold text-textPrimary mb-2">Ready to Activate Your Brain?</h2>
                                    <p className="text-sm text-textSecondary max-w-md mx-auto mb-6">
                                        We'll create your Knowledge Base, set up ICPs, configure your brand voice, and generate a sample email.
                                    </p>
                                    <div className="max-w-xs mx-auto space-y-2 text-left mb-6">
                                        {['Knowledge Base from company info', 'ICP profiles in the system', 'Brand voice & constitution rules', 'Brain domain knowledge', 'Sample email generation'].map(item => (
                                            <div key={item} className="flex items-center gap-2 text-sm text-textSecondary">
                                                <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-accent" /></div>
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={completeOnboarding}
                                        className="btn btn-accent-gradient px-8 py-3 rounded-xl shadow-lg text-base">
                                        <Rocket className="w-5 h-5" /> Activate My Brain
                                    </button>
                                </div>
                            )}
                            {isCompleting && !sampleEmail && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-[var(--radius-lg)] bg-gradient-to-br from-accent to-primary flex items-center justify-center animate-pulse">
                                        <Brain className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-xl font-bold text-textPrimary mb-4">Initializing Your Brain...</h2>
                                    <div className="max-w-xs mx-auto space-y-2">
                                        <PLine label="Creating Knowledge Base" done />
                                        <PLine label="Setting up ICPs" done />
                                        <PLine label="Configuring Brand Voice" done />
                                        <PLine label="Teaching your Brain" active />
                                        <PLine label="Generating sample email" />
                                    </div>
                                </div>
                            )}
                            {sampleEmail && (
                                <div className="py-4">
                                    <div className="text-center mb-6">
                                        <div className="w-14 h-14 mx-auto mb-3 rounded-[var(--radius-lg)] bg-gradient-to-br from-success to-accent flex items-center justify-center">
                                            <Check className="w-7 h-7 text-white" />
                                        </div>
                                        <h2 className="text-xl font-bold text-textPrimary mb-1">Your Brain is Ready!</h2>
                                        <p className="text-sm text-textSecondary">Here's a sample using everything you taught it:</p>
                                    </div>
                                    <div className="card p-5 border-border bg-gradient-to-br from-success/5 to-transparent">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Mail className="w-4 h-4 text-success" />
                                            <span className="text-sm font-semibold text-success">{aiGenerated ? 'AI-Generated Email' : 'Sample Email (Template)'}</span>
                                            {!aiGenerated && <span className="text-[10px] px-2 py-0.5 rounded-full bg-surfaceElevated text-warning border border-border">No AI provider configured yet</span>}
                                        </div>
                                        <div className="text-sm text-textSecondary whitespace-pre-wrap leading-relaxed">{sampleEmail}</div>
                                    </div>
                                    <div className="text-center mt-4">
                                        <p className="text-xs text-textTertiary">Closing in a moment...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step < 6 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 shrink-0 bg-surface">
                        {step > 1 ? (
                            <button onClick={prevStep} className="btn btn-ghost text-sm flex items-center gap-1.5 text-textSecondary">
                                <ArrowLeft className="w-3.5 h-3.5" /> Back
                            </button>
                        ) : (
                            <button onClick={onClose} className="btn btn-ghost text-sm text-textTertiary">Skip for now</button>
                        )}
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-textTertiary">{pct}% complete</span>
                            {step < 5 ? (
                                <button onClick={nextStep} disabled={!canProceed()}
                                    className="btn btn-accent-gradient px-5 py-2 rounded-xl shadow-md">
                                    Continue <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <button onClick={nextStep}
                                    className="btn btn-accent-gradient px-5 py-2 rounded-xl shadow-md">
                                    <Sparkles className="w-3.5 h-3.5" /> Activate Brain
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-textSecondary">{label}</label>
            {hint && <p className="text-xs text-textTertiary">{hint}</p>}
            {children}
        </div>
    )
}

function ArrField({ label, items, placeholder, onChange, onAdd, onRemove }: {
    label: string; items: string[]; placeholder: string
    onChange: (i: number, v: string) => void; onAdd: () => void; onRemove: (i: number) => void
}) {
    return (
        <Field label={label}>
            <div className="space-y-2">
                {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                        <input className="input flex-grow" placeholder={placeholder} value={item} onChange={e => onChange(idx, e.target.value)} />
                        {items.length > 1 && <button onClick={() => onRemove(idx)} className="p-2 text-textTertiary hover:text-error rounded-lg hover:bg-surfaceElevated"><X className="w-3.5 h-3.5" /></button>}
                    </div>
                ))}
                <button onClick={onAdd} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 py-0.5"><Plus className="w-3 h-3" /> Add</button>
            </div>
        </Field>
    )
}

function PLine({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
    return (
        <div className="flex items-center gap-2.5 text-sm">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-surfaceElevated' : active ? 'bg-accent/20 animate-pulse' : 'bg-surface border border-border'}`}>
                {done ? <Check className="w-3 h-3 text-success" /> : active ? <Loader2 className="w-3 h-3 text-accent animate-spin" /> : <div className="w-1 h-1 rounded-full bg-border" />}
            </div>
            <span className={done ? 'text-textPrimary' : active ? 'text-accent' : 'text-textTertiary'}>{label}</span>
        </div>
    )
}
