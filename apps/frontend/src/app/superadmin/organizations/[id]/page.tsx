'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
    Building2, Users, Database, Activity, ArrowLeft, Save,
    Loader2, Trash2, Shield, Brain, Package, Mail,
} from 'lucide-react'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'

interface OrgDetail {
    id: string; name: string; slug: string; plan: string; status: string
    created_at: string; max_kbs: number; max_runs_per_month: number; max_team_members: number
    current_kbs_count: number; total_runs: number; current_team_size: number
}

const PLANS = ['hobby', 'pro', 'enterprise']

export default function OrgDetailPage() {
    const router = useRouter()
    const params = useParams()
    const { fetchWithAuth } = useSuperadminAuth()
    const [org, setOrg] = useState<OrgDetail | null>(null)
    const [users, setUsers] = useState<any[]>([])
    const [agents, setAgents] = useState<any[]>([])
    const [bundles, setBundles] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [edits, setEdits] = useState<Record<string, any>>({})

    useEffect(() => { loadOrg() }, [params.id])

    const loadOrg = async () => {
        setIsLoading(true)
        try {
            const [orgRes, usersRes, bundlesRes] = await Promise.all([
                fetchWithAuth(`/api/superadmin/organizations/${params.id}`),
                fetchWithAuth(`/api/superadmin/users`),
                fetchWithAuth(`/api/superadmin/engine-bundles`),
            ])

            const orgData = await orgRes.json()
            const usersData = await usersRes.json()
            const bundlesData = await bundlesRes.json()

            if (orgData.organization) {
                setOrg(orgData.organization)
                setEdits({
                    name: orgData.organization.name,
                    plan: orgData.organization.plan,
                    max_kbs: orgData.organization.max_kbs,
                    max_runs_per_month: orgData.organization.max_runs_per_month,
                    max_team_members: orgData.organization.max_team_members,
                })
            }

            if (usersData.users) {
                setUsers(usersData.users.filter((u: any) => u.org_id === params.id))
            }

            if (bundlesData.bundles) {
                const deployed = (bundlesData.bundles || []).filter((b: any) =>
                    b.deployments?.some((d: any) => d.org_id === params.id)
                )
                setBundles(deployed)
            }
        } catch (e) {
            console.error('Failed to load org:', e)
        }
        setIsLoading(false)
    }

    const saveChanges = async () => {
        setIsSaving(true)
        try {
            const res = await fetchWithAuth(`/api/superadmin/organizations/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(edits),
            })
            const data = await res.json()
            if (data.organization) setOrg(data.organization)
        } catch (e) {
            console.error('Save failed:', e)
        }
        setIsSaving(false)
    }

    const suspendOrg = async () => {
        if (!confirm('Suspend this organization? All users will lose access.')) return
        try {
            await fetchWithAuth(`/api/superadmin/organizations/${params.id}`, { method: 'DELETE' })
            router.push('/superadmin/organizations')
        } catch (e) {
            console.error('Suspend failed:', e)
        }
    }

    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
    }

    if (!org) {
        return <div className="text-center py-20 text-muted-foreground">Organization not found</div>
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/superadmin/organizations')} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{org.name}</h1>
                        <p className="text-sm text-muted-foreground">/{org.slug} · Created {new Date(org.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${org.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {org.status}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 uppercase">{org.plan}</span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { icon: Users, label: 'Team', value: `${org.current_team_size}/${org.max_team_members}` },
                    { icon: Database, label: 'KBs', value: `${org.current_kbs_count}/${org.max_kbs}` },
                    { icon: Activity, label: 'Total Runs', value: org.total_runs },
                    { icon: Mail, label: 'Run Quota', value: `${org.max_runs_per_month}/mo` },
                ].map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1"><s.icon className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">{s.label}</span></div>
                        <div className="text-xl font-bold">{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Edit Section */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h2 className="font-bold text-lg flex items-center gap-2"><Building2 className="w-5 h-5" /> Organization Settings</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={edits.name || ''} onChange={e => setEdits(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Plan</label>
                        <select className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={edits.plan || ''} onChange={e => setEdits(p => ({ ...p, plan: e.target.value }))}>
                            {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Max KBs</label>
                        <input type="number" className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={edits.max_kbs || 0} onChange={e => setEdits(p => ({ ...p, max_kbs: Number(e.target.value) }))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Max Runs/Month</label>
                        <input type="number" className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={edits.max_runs_per_month || 0} onChange={e => setEdits(p => ({ ...p, max_runs_per_month: Number(e.target.value) }))} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Max Team Members</label>
                        <input type="number" className="w-full px-3 py-2 rounded-lg border border-border bg-background" value={edits.max_team_members || 0} onChange={e => setEdits(p => ({ ...p, max_team_members: Number(e.target.value) }))} />
                    </div>
                </div>
                <div className="flex justify-end">
                    <button onClick={saveChanges} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                    </button>
                </div>
            </div>

            {/* Team Members */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-bold text-lg flex items-center gap-2 mb-4"><Users className="w-5 h-5" /> Team Members ({users.length})</h2>
                {users.length > 0 ? (
                    <div className="space-y-2">
                        {users.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                                <div>
                                    <div className="font-medium text-sm">{u.full_name || u.email}</div>
                                    <div className="text-xs text-muted-foreground">{u.email} · {u.role}</div>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {u.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No users in this organization</p>
                )}
            </div>

            {/* Danger Zone */}
            <div className="bg-card border border-red-500/20 rounded-xl p-6">
                <h2 className="font-bold text-lg text-red-500 flex items-center gap-2 mb-4"><Shield className="w-5 h-5" /> Danger Zone</h2>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-sm">Suspend Organization</p>
                        <p className="text-xs text-muted-foreground">All users will lose access. This can be reversed.</p>
                    </div>
                    <button onClick={suspendOrg} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        <Trash2 className="w-4 h-4" /> Suspend
                    </button>
                </div>
            </div>
        </div>
    )
}
