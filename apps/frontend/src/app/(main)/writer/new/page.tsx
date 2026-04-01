'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Zap, ArrowRight, Loader2, AlertCircle, Target, Package,
    Mail, Sparkles, ChevronDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface ICP {
    id: string
    name: string
    criteria: any
    status: string
}

interface Offer {
    id: string
    name: string
    primary_promise: string
    category: string
}

// Fallbacks only used if /api/writer/config fails
const FALLBACK_ANGLES = [
    { value: 'problem_reframe', label: 'Problem Reframe', desc: 'Challenge how they see the problem' },
    { value: 'social_proof', label: 'Social Proof', desc: 'Show who else solved this' },
    { value: 'direct_value', label: 'Direct Value', desc: 'Lead with the outcome' },
    { value: 'curiosity_gap', label: 'Curiosity Gap', desc: 'Tease an insight they\'re missing' },
    { value: 'contrarian', label: 'Contrarian', desc: 'Challenge conventional wisdom' },
]

const FALLBACK_GOALS = [
    { value: 'MEANINGFUL_REPLY', label: 'Get a Reply', desc: 'Optimize for conversation starters' },
    { value: 'BOOK_CALL', label: 'Book a Call', desc: 'Drive to calendar booking' },
    { value: 'EDUCATE', label: 'Educate', desc: 'Build awareness and trust first' },
]

const FALLBACK_EMAIL_COUNTS = [3, 5, 7, 10]

export default function NewRunPage() {
    const router = useRouter()
    const supabase = createClient()
    const [icps, setIcps] = useState<ICP[]>([])
    const [offers, setOffers] = useState<Offer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [orgId, setOrgId] = useState('')
    const [angleClasses, setAngleClasses] = useState(FALLBACK_ANGLES)
    const [flowGoals, setFlowGoals] = useState(FALLBACK_GOALS)
    const [emailCountOptions, setEmailCountOptions] = useState(FALLBACK_EMAIL_COUNTS)

    const [form, setForm] = useState({
        icp_id: '',
        offer_id: '',
        angle_class: 'problem_reframe',
        email_count: 5,
        flow_goal: 'MEANINGFUL_REPLY',
        prompt: '',
    })

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data: userData } = await supabase
            .from('users')
            .select('org_id')
            .eq('id', user.id)
            .single()

        if (!userData?.org_id) { setIsLoading(false); return }
        setOrgId(userData.org_id)

        // Load engine config + ICPs + offers in parallel
        const [icpRes, offerRes, configRes] = await Promise.all([
            supabase.from('icp').select('id, name, criteria, status').eq('partner_id', userData.org_id).eq('status', 'active'),
            supabase.from('offer').select('id, name, primary_promise, category').eq('partner_id', userData.org_id).eq('status', 'active'),
            fetch('/api/writer/config').then(r => r.json()).catch(() => null),
        ])

        setIcps(icpRes.data || [])
        setOffers(offerRes.data || [])

        // Apply engine config if available
        if (configRes?.config) {
            const cfg = configRes.config
            if (cfg.angleClasses?.length) {
                setAngleClasses(cfg.angleClasses)
                setForm(f => ({ ...f, angle_class: cfg.angleClasses[0].value }))
            }
            if (cfg.flowGoals?.length) {
                setFlowGoals(cfg.flowGoals)
                setForm(f => ({ ...f, flow_goal: cfg.flowGoals[0].value }))
            }
            if (cfg.emailCountOptions?.length) setEmailCountOptions(cfg.emailCountOptions)
        }

        if (icpRes.data?.length) setForm(f => ({ ...f, icp_id: icpRes.data![0].id }))
        if (offerRes.data?.length) setForm(f => ({ ...f, offer_id: offerRes.data![0].id }))

        setIsLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!form.icp_id) {
            toast.error('Please select a target customer (ICP)')
            return
        }

        setIsSubmitting(true)

        try {
            const res = await fetch('/api/writer/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    icp_id: form.icp_id,
                    offer_id: form.offer_id || undefined,
                    prompt: form.prompt,
                    settings: {
                        angle_class: form.angle_class,
                        email_count: form.email_count,
                        flow_goal: form.flow_goal,
                    },
                }),
            })

            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Failed to start run')

            toast.success('Email generation queued. Track it on Writer Studio.')
            router.push(data.executionId ? `/writer?execution=${data.executionId}` : '/writer')
        } catch (error: any) {
            console.error('Failed to create run:', error)
            toast.error(error.message || 'Failed to create run')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }

    const noICPs = icps.length === 0

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-display font-bold text-textPrimary mb-1">Generate Emails</h1>
                <p className="text-textSecondary">Your Brain will craft personalized emails using your ICPs, offers, and brand voice.</p>
            </div>

            {noICPs && (
                <div className="card p-6 border-border bg-surface flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-textPrimary mb-1">No ICPs configured yet</h3>
                        <p className="text-sm text-textSecondary mb-3">
                            Your Brain needs at least one ICP (Ideal Customer Profile) to write targeted emails.
                            Complete onboarding or ask your admin to set up ICPs.
                        </p>
                        <button onClick={() => router.push('/dashboard')} className="btn btn-sm btn-primary">
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Target Customer */}
                <div className="card p-6">
                    <h2 className="text-lg font-bold text-textPrimary mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-accent" /> Target Customer
                    </h2>
                    {icps.length > 0 ? (
                        <div className="grid gap-3">
                            {icps.map(icp => (
                                <label key={icp.id}
                                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:-translate-y-0.5 ${
                                        form.icp_id === icp.id
                                            ? 'border-accent bg-accent/5 shadow-sm'
                                            : 'border-border hover:border-borderHover'
                                    }`}>
                                    <input type="radio" name="icp" value={icp.id} checked={form.icp_id === icp.id}
                                        onChange={() => setForm(f => ({ ...f, icp_id: icp.id }))}
                                        className="sr-only" />
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        form.icp_id === icp.id ? 'border-accent' : 'border-border'
                                    }`}>
                                        {form.icp_id === icp.id && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-textPrimary text-sm">{icp.name}</div>
                                        {icp.criteria?.pain_points?.length > 0 && (
                                            <div className="text-xs text-textTertiary mt-0.5">
                                                Pains: {icp.criteria.pain_points.slice(0, 2).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    ) : null}
                </div>

                {/* Offer (if available) */}
                {offers.length > 0 && (
                    <div className="card p-6">
                        <h2 className="text-lg font-bold text-textPrimary mb-4 flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue" /> Offer
                        </h2>
                        <select className="input w-full" value={form.offer_id}
                            onChange={e => setForm(f => ({ ...f, offer_id: e.target.value }))}>
                            {offers.map(o => (
                                <option key={o.id} value={o.id}>{o.name} — {o.primary_promise?.slice(0, 60)}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Email Config */}
                <div className="card p-6">
                    <h2 className="text-lg font-bold text-textPrimary mb-4 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-info" /> Email Configuration
                    </h2>
                    <div className="space-y-5">
                        {/* Angle */}
                        <div>
                            <label className="block text-sm font-semibold text-textPrimary mb-2">Messaging Angle</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {angleClasses.map(a => (
                                    <button key={a.value} type="button"
                                        onClick={() => setForm(f => ({ ...f, angle_class: a.value }))}
                                        className={`p-3 rounded-xl border text-left transition-all text-sm ${
                                            form.angle_class === a.value
                                                ? 'border-accent bg-accent/5'
                                                : 'border-border hover:border-borderHover'
                                        }`}>
                                        <div className={`font-semibold ${form.angle_class === a.value ? 'text-accent' : 'text-textPrimary'}`}>{a.label}</div>
                                        <div className="text-xs text-textTertiary">{a.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {/* Email Count */}
                            <div>
                                <label className="block text-sm font-semibold text-textPrimary mb-2">Emails in Sequence</label>
                                <select className="input w-full" value={form.email_count}
                                    onChange={e => setForm(f => ({ ...f, email_count: Number(e.target.value) }))}>
                                    {emailCountOptions.map(n => <option key={n} value={n}>{n} emails</option>)}
                                </select>
                            </div>

                            {/* Flow Goal */}
                            <div>
                                <label className="block text-sm font-semibold text-textPrimary mb-2">Campaign Goal</label>
                                <select className="input w-full" value={form.flow_goal}
                                    onChange={e => setForm(f => ({ ...f, flow_goal: e.target.value }))}>
                                    {flowGoals.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Custom instructions */}
                        <div>
                            <label className="block text-sm font-semibold text-textPrimary mb-2">
                                Additional Instructions <span className="text-textTertiary font-normal">(optional)</span>
                            </label>
                            <textarea className="input w-full min-h-[100px] resize-none" value={form.prompt}
                                onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                                placeholder="e.g. Focus on the pricing angle, mention our recent case study with Stripe..." />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
                    <button type="button" onClick={() => router.push('/writer')} disabled={isSubmitting}
                        className="px-6 py-2.5 text-textSecondary font-semibold hover:bg-surfaceHover rounded-xl transition-all">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting || noICPs}
                        className="btn btn-primary font-semibold px-6 py-2.5 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                        {isSubmitting ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
                        ) : (
                            <><Sparkles className="w-5 h-5" /> Generate Emails <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
