'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users, Plus, RefreshCw, Loader2, AlertCircle, Database, Workflow } from 'lucide-react'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'

interface Org { id: string; name: string }
interface Offer { id: string; name: string }
interface IcpRow {
    id: string
    partner_id: string
    offer_id: string
    name: string
    status: string
    created_at: string
    identity_pool_count: number
    decisions: { contactNow: number; delay: number; suppress: number }
}

const SAMPLE_CANDIDATES = [
    {
        full_name: 'Sample Contact',
        email: 'sample@example.com',
        company_name: 'Sample Co',
        title: 'VP Growth',
        seniority_level: 'vp',
        buying_role: 'economic_buyer',
        country: 'us',
        industry: 'saas',
        annual_revenue: 5000000,
        identity_confidence: 0.72,
        verification_status: 'verified',
        in_market_signals: ['hiring_sdr'],
    },
]

export default function IcpManagerPage() {
    const { admin, isLoading: authLoading } = useSuperadminAuth()
    const token = admin?.token

    const [orgs, setOrgs] = useState<Org[]>([])
    const [offers, setOffers] = useState<Offer[]>([])
    const [icps, setIcps] = useState<IcpRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [selectedOrgId, setSelectedOrgId] = useState('')
    const [showCreate, setShowCreate] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [candidateJson, setCandidateJson] = useState(JSON.stringify(SAMPLE_CANDIDATES, null, 2))

    const [form, setForm] = useState({
        org_id: '',
        offer_id: '',
        name: '',
        taxonomy_segments: 'segment_a,segment_b',
        revenue_band_min: '1000000',
        revenue_band_max: '20000000',
        primary_industries: 'saas,services',
        geographies: 'us',
        seniority_levels: 'vp,director',
        buying_roles: 'economic_buyer,champion',
        in_market_signals: 'hiring_sdr,stack_change',
        required_technologies: '',
    })

    const fetchOrgs = useCallback(async () => {
        if (!token) return
        const res = await fetch('/api/superadmin/organizations', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return
        const data = await res.json()
        setOrgs(data.organizations || [])
    }, [token])

    const fetchOffers = useCallback(async (orgId: string) => {
        if (!token || !orgId) return
        const res = await fetch(`/api/superadmin/icps?mode=options&org_id=${orgId}`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return
        const data = await res.json()
        setOffers(data.offers || [])
    }, [token])

    const fetchIcps = useCallback(async () => {
        if (!token) return
        setLoading(true)
        setError(null)
        try {
            const qs = selectedOrgId ? `?org_id=${selectedOrgId}` : ''
            const res = await fetch(`/api/superadmin/icps${qs}`, { headers: { Authorization: `Bearer ${token}` } })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to load ICPs')
            setIcps(data.icps || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [token, selectedOrgId])

    useEffect(() => {
        if (token) {
            fetchOrgs()
            fetchIcps()
        }
    }, [token, fetchOrgs, fetchIcps])

    useEffect(() => {
        if (form.org_id) fetchOffers(form.org_id)
    }, [form.org_id, fetchOffers])

    const createIcp = async () => {
        if (!token) return
        if (!form.org_id || !form.offer_id || !form.name.trim()) {
            setError('org, offer and name are required')
            return
        }
        setIsSubmitting(true)
        setError(null)
        try {
            const payload = {
                org_id: form.org_id,
                offer_id: form.offer_id,
                name: form.name,
                taxonomy_segments: form.taxonomy_segments.split(',').map((s) => s.trim()).filter(Boolean),
                revenue_band_min: Number(form.revenue_band_min),
                revenue_band_max: Number(form.revenue_band_max),
                primary_industries: form.primary_industries.split(',').map((s) => s.trim()).filter(Boolean),
                geographies: form.geographies.split(',').map((s) => s.trim()).filter(Boolean),
                seniority_levels: form.seniority_levels.split(',').map((s) => s.trim()).filter(Boolean),
                buying_roles: form.buying_roles.split(',').map((s) => s.trim()).filter(Boolean),
                in_market_signals: form.in_market_signals.split(',').map((s) => s.trim()).filter(Boolean),
                required_technologies: form.required_technologies.split(',').map((s) => s.trim()).filter(Boolean),
                exclusions: { industries: [], geographies: [], company_keywords: [] },
            }

            const res = await fetch('/api/superadmin/icps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to create ICP')
            setShowCreate(false)
            await fetchIcps()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const runSource = async (icpId: string) => {
        if (!token) return
        try {
            const candidates = JSON.parse(candidateJson)
            const res = await fetch(`/api/superadmin/icps/${icpId}/source`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ source: 'manual_import', candidates }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to source identities')
            await fetchIcps()
        } catch (err: any) {
            setError(err.message || 'Invalid candidate JSON')
        }
    }

    const runDecide = async (icpId: string) => {
        if (!token) return
        try {
            const res = await fetch(`/api/superadmin/icps/${icpId}/decide`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ limit: 100, min_confidence: 0.35 }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to run contact decisions')
            await fetchIcps()
        } catch (err: any) {
            setError(err.message)
        }
    }

    const stats = useMemo(() => {
        const identities = icps.reduce((sum, i) => sum + (i.identity_pool_count || 0), 0)
        const decisions = icps.reduce((sum, i) => sum + i.decisions.contactNow + i.decisions.delay + i.decisions.suppress, 0)
        return { icps: icps.length, identities, decisions }
    }, [icps])

    if (authLoading) return <div className="p-8 text-center">Checking access...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Users className="w-7 h-7 text-primary" />
                        ICP Manager
                    </h1>
                    <p className="text-muted-foreground mt-1">Construct ICPs, source identities, and run contact decisions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchIcps} className="p-2 rounded-lg border border-border hover:bg-muted">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                        <Plus className="w-4 h-4" />
                        New ICP
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">ICPs</div><div className="text-2xl font-bold">{stats.icps}</div></div>
                <div className="rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">Identities</div><div className="text-2xl font-bold">{stats.identities}</div></div>
                <div className="rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">Decisions</div><div className="text-2xl font-bold">{stats.decisions}</div></div>
                <div className="rounded-xl border border-border p-4">
                    <label className="text-xs text-muted-foreground">Filter Org</label>
                    <select className="w-full mt-1 p-2 rounded border border-border bg-background text-sm" value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)}>
                        <option value="">All</option>
                        {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="rounded-xl border border-border p-4 bg-background">
                <label className="text-sm font-medium">Source Candidates JSON (used by "Run Sourcing")</label>
                <textarea className="w-full mt-2 p-2 rounded border border-border bg-background text-xs font-mono" rows={8} value={candidateJson} onChange={(e) => setCandidateJson(e.target.value)} />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
                <div className="space-y-3">
                    {icps.map((icp) => (
                        <div key={icp.id} className="rounded-xl border border-border p-4 bg-background">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="font-semibold">{icp.name}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{icp.id}</div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">{icp.status}</span>
                            </div>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div className="rounded-lg border border-border p-3">
                                    <div className="text-xs text-muted-foreground">Identity Pool</div>
                                    <div className="font-semibold">{icp.identity_pool_count}</div>
                                </div>
                                <div className="rounded-lg border border-border p-3">
                                    <div className="text-xs text-muted-foreground">Contact Decisions</div>
                                    <div className="font-semibold">{icp.decisions.contactNow} now / {icp.decisions.delay} delay / {icp.decisions.suppress} suppress</div>
                                </div>
                                <div className="rounded-lg border border-border p-3">
                                    <div className="text-xs text-muted-foreground">Actions</div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <button onClick={() => runSource(icp.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-border hover:bg-muted text-xs">
                                            <Database className="w-3.5 h-3.5" />
                                            Run Sourcing
                                        </button>
                                        <button onClick={() => runDecide(icp.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-border hover:bg-muted text-xs">
                                            <Workflow className="w-3.5 h-3.5" />
                                            Run Decisions
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {icps.length === 0 && <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">No ICPs found.</div>}
                </div>
            )}

            {showCreate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-background rounded-2xl border border-border max-h-[90vh] overflow-auto">
                        <div className="p-5 border-b border-border flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Create ICP</h2>
                            <button onClick={() => setShowCreate(false)} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <select className="p-2 rounded border border-border bg-background text-sm" value={form.org_id} onChange={(e) => setForm({ ...form, org_id: e.target.value, offer_id: '' })}>
                                    <option value="">Select Org</option>
                                    {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                                <select className="p-2 rounded border border-border bg-background text-sm" value={form.offer_id} onChange={(e) => setForm({ ...form, offer_id: e.target.value })}>
                                    <option value="">Select Offer</option>
                                    {offers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            </div>
                            <input className="p-2 rounded border border-border bg-background text-sm w-full" placeholder="ICP Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            <input className="p-2 rounded border border-border bg-background text-sm w-full" placeholder="Taxonomy Segments (comma separated)" value={form.taxonomy_segments} onChange={(e) => setForm({ ...form, taxonomy_segments: e.target.value })} />
                            <div className="grid grid-cols-2 gap-3">
                                <input className="p-2 rounded border border-border bg-background text-sm" placeholder="Revenue Min" value={form.revenue_band_min} onChange={(e) => setForm({ ...form, revenue_band_min: e.target.value })} />
                                <input className="p-2 rounded border border-border bg-background text-sm" placeholder="Revenue Max" value={form.revenue_band_max} onChange={(e) => setForm({ ...form, revenue_band_max: e.target.value })} />
                            </div>
                            <input className="p-2 rounded border border-border bg-background text-sm w-full" placeholder="Primary Industries (comma separated)" value={form.primary_industries} onChange={(e) => setForm({ ...form, primary_industries: e.target.value })} />
                            <input className="p-2 rounded border border-border bg-background text-sm w-full" placeholder="Geographies (comma separated)" value={form.geographies} onChange={(e) => setForm({ ...form, geographies: e.target.value })} />
                            <input className="p-2 rounded border border-border bg-background text-sm w-full" placeholder="Seniority Levels (comma separated)" value={form.seniority_levels} onChange={(e) => setForm({ ...form, seniority_levels: e.target.value })} />
                            <input className="p-2 rounded border border-border bg-background text-sm w-full" placeholder="Buying Roles (comma separated)" value={form.buying_roles} onChange={(e) => setForm({ ...form, buying_roles: e.target.value })} />
                            <input className="p-2 rounded border border-border bg-background text-sm w-full" placeholder="In-Market Signals (comma separated)" value={form.in_market_signals} onChange={(e) => setForm({ ...form, in_market_signals: e.target.value })} />
                            <input className="p-2 rounded border border-border bg-background text-sm w-full" placeholder="Required Technologies (comma separated)" value={form.required_technologies} onChange={(e) => setForm({ ...form, required_technologies: e.target.value })} />
                        </div>
                        <div className="p-5 border-t border-border flex gap-2">
                            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded border border-border">Cancel</button>
                            <button onClick={createIcp} disabled={isSubmitting} className="px-4 py-2 rounded bg-primary text-primary-foreground">
                                {isSubmitting ? 'Creating...' : 'Create ICP'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
