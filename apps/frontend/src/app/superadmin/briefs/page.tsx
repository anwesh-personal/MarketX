'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileText, RefreshCw, Lock, Plus, AlertCircle, Loader2, GitCompare } from 'lucide-react'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'

interface Org {
    id: string
    name: string
}

interface OptionItem {
    id: string
    name: string
}

interface Belief {
    id: string
    lane: 'champion' | 'challenger'
    status: string
    statement: string
    angle: string | null
    allocation_weight: number
}

interface BriefRow {
    id: string
    partner_id: string
    offer_id: string
    icp_id: string
    title: string | null
    hypothesis: string
    status: string
    locked_fields: Record<string, unknown> | null
    created_at: string
    beliefs: Belief[]
    competition?: {
        id: string
        allocation_champion: number
        allocation_challenger: number
        active: boolean
    } | null
}

export default function SuperadminBriefsPage() {
    const { admin, isLoading: authLoading } = useSuperadminAuth()
    const token = admin?.token

    const [briefs, setBriefs] = useState<BriefRow[]>([])
    const [orgs, setOrgs] = useState<Org[]>([])
    const [offers, setOffers] = useState<OptionItem[]>([])
    const [icps, setIcps] = useState<OptionItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)
    const [showCreate, setShowCreate] = useState(false)

    const [filterOrgId, setFilterOrgId] = useState<string>('')
    const [filterStatus, setFilterStatus] = useState<string>('')

    const [form, setForm] = useState({
        org_id: '',
        offer_id: '',
        icp_id: '',
        title: '',
        hypothesis: '',
        angle: '',
        champion_statement: '',
        challenger_statement: '',
    })

    const fetchBriefs = useCallback(async () => {
        if (!token) return
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (filterOrgId) params.set('org_id', filterOrgId)
            if (filterStatus) params.set('status', filterStatus)
            params.set('limit', '100')

            const res = await fetch(`/api/superadmin/briefs?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to load briefs')
            setBriefs(data.briefs || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [token, filterOrgId, filterStatus])

    const fetchOrgs = useCallback(async () => {
        if (!token) return
        const res = await fetch('/api/superadmin/organizations', {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        setOrgs(data.organizations || [])
    }, [token])

    const fetchOptionsForOrg = useCallback(async (orgId: string) => {
        if (!token || !orgId) return
        const res = await fetch(`/api/superadmin/briefs?mode=options&org_id=${orgId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) {
            setError(data.error || 'Failed to load offer/icp options')
            return
        }
        setOffers(data.offers || [])
        setIcps(data.icps || [])
    }, [token])

    useEffect(() => {
        if (token) {
            fetchOrgs()
            fetchBriefs()
        }
    }, [token, fetchOrgs, fetchBriefs])

    useEffect(() => {
        if (showCreate && form.org_id) {
            fetchOptionsForOrg(form.org_id)
        }
    }, [showCreate, form.org_id, fetchOptionsForOrg])

    const createBrief = async () => {
        if (!token) return
        if (!form.org_id || !form.offer_id || !form.icp_id || form.hypothesis.trim().length < 10) {
            setError('org, offer, icp and hypothesis (>=10 chars) are required')
            return
        }

        setCreating(true)
        setError(null)
        try {
            const res = await fetch('/api/superadmin/briefs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    org_id: form.org_id,
                    offer_id: form.offer_id,
                    icp_id: form.icp_id,
                    title: form.title || undefined,
                    hypothesis: form.hypothesis,
                    angle: form.angle || undefined,
                    champion_statement: form.champion_statement || undefined,
                    challenger_statement: form.challenger_statement || undefined,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to create brief')

            setShowCreate(false)
            setForm({
                org_id: '',
                offer_id: '',
                icp_id: '',
                title: '',
                hypothesis: '',
                angle: '',
                champion_statement: '',
                challenger_statement: '',
            })
            await fetchBriefs()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setCreating(false)
        }
    }

    const lockBrief = async (id: string) => {
        if (!token) return
        try {
            const res = await fetch(`/api/superadmin/briefs/${id}/lock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ reason: 'Locked from Superadmin Brief Manager' }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to lock brief')
            await fetchBriefs()
        } catch (err: any) {
            setError(err.message)
        }
    }

    const stats = useMemo(() => {
        const locked = briefs.filter((b) => Boolean((b.locked_fields || {}).immutable_after_launch)).length
        return { total: briefs.length, locked }
    }, [briefs])

    if (authLoading) {
        return <div className="p-8 text-center">Checking access...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <FileText className="w-7 h-7 text-primary" />
                        Brief Manager
                    </h1>
                    <p className="text-muted-foreground mt-1">Create, inspect, and lock MarketWriter briefs with belief competition visibility.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchBriefs}
                        className="p-2 rounded-lg border border-border hover:bg-muted"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground"
                    >
                        <Plus className="w-4 h-4" />
                        New Brief
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
                <div className="rounded-xl border border-border p-4">
                    <div className="text-sm text-muted-foreground">Total Briefs</div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                </div>
                <div className="rounded-xl border border-border p-4">
                    <div className="text-sm text-muted-foreground">Locked</div>
                    <div className="text-2xl font-bold">{stats.locked}</div>
                </div>
                <div className="rounded-xl border border-border p-4">
                    <label className="text-xs text-muted-foreground">Filter Org</label>
                    <select className="w-full mt-1 p-2 rounded border border-border bg-background text-sm" value={filterOrgId} onChange={(e) => setFilterOrgId(e.target.value)}>
                        <option value="">All</option>
                        {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                </div>
                <div className="rounded-xl border border-border p-4">
                    <label className="text-xs text-muted-foreground">Filter Status</label>
                    <select className="w-full mt-1 p-2 rounded border border-border bg-background text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">All</option>
                        <option value="active">active</option>
                        <option value="archived">archived</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
                <div className="space-y-3">
                    {briefs.map((brief) => {
                        const champion = brief.beliefs.find((b) => b.lane === 'champion')
                        const challenger = brief.beliefs.find((b) => b.lane === 'challenger')
                        const isLocked = Boolean((brief.locked_fields || {}).immutable_after_launch)
                        return (
                            <div key={brief.id} className="rounded-xl border border-border p-4 bg-background">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="font-semibold">{brief.title || 'Untitled Brief'}</div>
                                        <div className="text-xs text-muted-foreground mt-1">{brief.id}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${isLocked ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground'}`}>
                                            {isLocked ? 'Locked' : 'Draft/Active'}
                                        </span>
                                        {!isLocked && (
                                            <button
                                                onClick={() => lockBrief(brief.id)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted"
                                            >
                                                <Lock className="w-3.5 h-3.5" />
                                                Lock
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm mt-3">{brief.hypothesis}</p>
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="rounded-lg border border-border p-3">
                                        <div className="text-xs text-muted-foreground mb-1">Champion</div>
                                        <div className="text-sm">{champion?.statement || '—'}</div>
                                    </div>
                                    <div className="rounded-lg border border-border p-3">
                                        <div className="text-xs text-muted-foreground mb-1">Challenger</div>
                                        <div className="text-sm">{challenger?.statement || '—'}</div>
                                    </div>
                                </div>
                                {brief.competition && (
                                    <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
                                        <GitCompare className="w-3.5 h-3.5" />
                                        Allocation: C {brief.competition.allocation_champion} / Ch {brief.competition.allocation_challenger}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    {briefs.length === 0 && (
                        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                            No briefs yet.
                        </div>
                    )}
                </div>
            )}

            {showCreate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-background rounded-2xl border border-border max-h-[90vh] overflow-auto">
                        <div className="p-5 border-b border-border flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Create Brief</h2>
                            <button onClick={() => setShowCreate(false)} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <select className="p-2 rounded border border-border bg-background text-sm" value={form.org_id} onChange={(e) => setForm({ ...form, org_id: e.target.value, offer_id: '', icp_id: '' })}>
                                    <option value="">Select Org</option>
                                    {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                                <input className="p-2 rounded border border-border bg-background text-sm" placeholder="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <select className="p-2 rounded border border-border bg-background text-sm" value={form.offer_id} onChange={(e) => setForm({ ...form, offer_id: e.target.value })}>
                                    <option value="">Select Offer</option>
                                    {offers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                                <select className="p-2 rounded border border-border bg-background text-sm" value={form.icp_id} onChange={(e) => setForm({ ...form, icp_id: e.target.value })}>
                                    <option value="">Select ICP</option>
                                    {icps.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                            </div>
                            <input className="p-2 rounded border border-border bg-background text-sm" placeholder="Angle code (optional, e.g. problem_reframe)" value={form.angle} onChange={(e) => setForm({ ...form, angle: e.target.value })} />
                            <textarea className="w-full p-2 rounded border border-border bg-background text-sm" rows={4} placeholder="Hypothesis (required, min 10 chars)" value={form.hypothesis} onChange={(e) => setForm({ ...form, hypothesis: e.target.value })} />
                            <textarea className="w-full p-2 rounded border border-border bg-background text-sm" rows={2} placeholder="Champion statement (optional)" value={form.champion_statement} onChange={(e) => setForm({ ...form, champion_statement: e.target.value })} />
                            <textarea className="w-full p-2 rounded border border-border bg-background text-sm" rows={2} placeholder="Challenger statement (optional)" value={form.challenger_statement} onChange={(e) => setForm({ ...form, challenger_statement: e.target.value })} />
                        </div>
                        <div className="p-5 border-t border-border flex gap-2">
                            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded border border-border">Cancel</button>
                            <button onClick={createBrief} disabled={creating} className="px-4 py-2 rounded bg-primary text-primary-foreground">
                                {creating ? 'Creating...' : 'Create Brief'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
