'use client'

import React, { useState, useEffect } from 'react'
import { Building2, CheckCircle, AlertTriangle, Clock, FileEdit, Loader2, ChevronRight, Lock, Search } from 'lucide-react'
import { superadminFetch } from '@/lib/superadmin-auth'
import {
    SuperadminPageHero, SuperadminPanel, SuperadminLoadingState,
    SuperadminEmptyState, SuperadminBadge, SuperadminInputShell,
} from '@/components/SuperAdmin/surfaces'
import SuperadminKBOrgReview from './SuperadminKBOrgReview'

interface OrgKBEntry {
    org_id: string
    org_name: string
    org_slug: string
    org_plan: string
    questionnaire_id: string | null
    questionnaire_status: string
    company_name: string | null
    submitted_at: string | null
    locked_at: string | null
    sections: { total: number; approved: number; failed: number; draft: number } | null
}

const STATUS_CONFIG: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'primary' }> = {
    not_started: { label: 'Not Started', tone: 'primary' },
    draft: { label: 'In Progress', tone: 'primary' },
    needs_revision: { label: 'Needs Revision', tone: 'warning' },
    ready_for_generation: { label: 'Ready to Generate', tone: 'accent' },
    generating: { label: 'Generating...', tone: 'info' },
    review: { label: 'Ready for Review', tone: 'accent' },
    generation_partial_failure: { label: 'Partial Failure', tone: 'danger' },
    generation_failed: { label: 'Failed', tone: 'danger' },
    locked: { label: 'Locked ✓', tone: 'success' },
}

export default function SuperadminKBDashboard() {
    const [loading, setLoading] = useState(true)
    const [dashboard, setDashboard] = useState<OrgKBEntry[]>([])
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [error, setError] = useState('')

    useEffect(() => { loadDashboard() }, [])

    const loadDashboard = async () => {
        try {
            setLoading(true)
            const res = await superadminFetch('/api/superadmin/kb')
            const json = await res.json()
            if (json.success) {
                setDashboard(json.dashboard || [])
            } else {
                setError(json.error || 'Failed to load')
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    // If an org is selected, show the review UI for that org
    if (selectedOrgId) {
        const org = dashboard.find(d => d.org_id === selectedOrgId)
        return (
            <SuperadminKBOrgReview
                orgId={selectedOrgId}
                orgName={org?.org_name || 'Organization'}
                questionnaireId={org?.questionnaire_id || null}
                onBack={() => { setSelectedOrgId(null); loadDashboard() }}
            />
        )
    }

    if (loading) return <SuperadminLoadingState label="Loading KB Dashboard" />

    const filtered = dashboard.filter(d =>
        d.org_name.toLowerCase().includes(search.toLowerCase()) ||
        d.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.org_slug.toLowerCase().includes(search.toLowerCase())
    )

    // Sort: actionable items first (ready_for_generation, review, partial_failure), then by name
    const actionablePriority = ['review', 'ready_for_generation', 'generation_partial_failure', 'generation_failed', 'generating', 'needs_revision']
    const sorted = [...filtered].sort((a, b) => {
        const aP = actionablePriority.indexOf(a.questionnaire_status)
        const bP = actionablePriority.indexOf(b.questionnaire_status)
        const aPri = aP >= 0 ? aP : 99
        const bPri = bP >= 0 ? bP : 99
        if (aPri !== bPri) return aPri - bPri
        return a.org_name.localeCompare(b.org_name)
    })

    const actionableCount = dashboard.filter(d => ['review', 'ready_for_generation', 'generation_partial_failure'].includes(d.questionnaire_status)).length

    return (
        <div className="space-y-6">
            <SuperadminPageHero
                eyebrow="Knowledge Base"
                title="KB Review Dashboard"
                description="View and manage Knowledge Base generation for all client organizations."
            />

            {error && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-sm text-error">{error}</div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Orgs" value={dashboard.length} />
                <StatCard label="Actionable" value={actionableCount} highlight />
                <StatCard label="Locked" value={dashboard.filter(d => d.questionnaire_status === 'locked').length} />
                <StatCard label="Not Started" value={dashboard.filter(d => d.questionnaire_status === 'not_started').length} />
            </div>

            <SuperadminPanel
                title="Organizations"
                description={`${sorted.length} organization${sorted.length !== 1 ? 's' : ''}`}
                actions={
                    <SuperadminInputShell icon={<Search className="w-4 h-4" />}>
                        <input
                            className="w-full bg-transparent text-sm text-textPrimary outline-none placeholder:text-textTertiary"
                            placeholder="Search orgs..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </SuperadminInputShell>
                }
            >
                {sorted.length === 0 ? (
                    <SuperadminEmptyState
                        icon={Building2}
                        title="No organizations found"
                        description={search ? 'Try a different search term.' : 'No organizations exist yet.'}
                    />
                ) : (
                    <div className="space-y-1">
                        {sorted.map(org => {
                            const cfg = STATUS_CONFIG[org.questionnaire_status] || STATUS_CONFIG.not_started
                            return (
                                <button
                                    key={org.org_id}
                                    onClick={() => setSelectedOrgId(org.org_id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:bg-surfaceHover group"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-surfaceElevated flex items-center justify-center shrink-0">
                                        {org.questionnaire_status === 'locked' ? (
                                            <Lock className="w-4 h-4 text-success" />
                                        ) : org.questionnaire_status === 'not_started' ? (
                                            <Building2 className="w-4 h-4 text-textTertiary" />
                                        ) : org.sections?.failed ? (
                                            <AlertTriangle className="w-4 h-4 text-error" />
                                        ) : org.questionnaire_status === 'generating' ? (
                                            <Loader2 className="w-4 h-4 text-accent animate-spin" />
                                        ) : (
                                            <FileEdit className="w-4 h-4 text-accent" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-textPrimary truncate">{org.org_name}</span>
                                            {org.company_name && org.company_name !== org.org_name && (
                                                <span className="text-xs text-textTertiary truncate">({org.company_name})</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <SuperadminBadge tone={cfg.tone}>{cfg.label}</SuperadminBadge>
                                            {org.sections && (
                                                <span className="text-[10px] text-textTertiary font-mono">
                                                    {org.sections.approved}/{org.sections.total} approved
                                                    {org.sections.failed > 0 && ` · ${org.sections.failed} failed`}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-textTertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            )
                        })}
                    </div>
                )}
            </SuperadminPanel>
        </div>
    )
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
    return (
        <div className="rounded-xl bg-surface border border-border p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-textTertiary mb-1">{label}</div>
            <div className={`text-2xl font-extrabold ${highlight && value > 0 ? 'text-accent' : 'text-textPrimary'}`}>{value}</div>
        </div>
    )
}
