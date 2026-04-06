'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Server, RefreshCw, Users, Globe, AlertCircle,
  Building2, Wifi, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'

interface OrgOverview {
  orgId: string
  orgName: string
  scope: string
  baseUrl: string
  lists: { listUid: string; name: string; subscriberCount: number }[]
  deliveryServers: { id: number; name: string }[]
  error: string | null
}

export default function MtaOverviewPage() {
  const { fetchWithAuth } = useSuperadminAuth()
  const [data, setData] = useState<OrgOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithAuth('/api/superadmin/mta/overview')
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || `Server returned ${res.status}`)
      }
      setData(json.overview || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load MTA overview')
    } finally {
      setLoading(false)
    }
  }, [fetchWithAuth])

  useEffect(() => { load() }, [load])

  const totalLists = data.reduce((s, o) => s + o.lists.length, 0)
  const totalSubs = data.reduce(
    (s, o) => s + o.lists.reduce((a, l) => a + l.subscriberCount, 0), 0
  )
  const totalServers = data.reduce((s, o) => s + o.deliveryServers.length, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
              <Server className="w-6 h-6 text-accent" />
            </div>
            <h1 className="text-3xl font-bold font-display text-textPrimary">
              MTA Overview
            </h1>
          </div>
          <p className="text-textSecondary ml-1 max-w-2xl">
            Cross-org view of MailWizz instances — lists, subscribers, and delivery servers.
          </p>
        </div>
        <button onClick={load} className="btn btn-ghost btn-icon">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="premium-card border-error/30 bg-error/5 flex items-center gap-3 !py-3">
          <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
          <p className="text-sm text-error flex-1">{error}</p>
          <button onClick={load} className="btn btn-ghost btn-sm text-error hover:bg-error/10">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Orgs Connected', value: data.length, icon: Building2, color: 'text-accent' },
          { label: 'Total Lists', value: totalLists, icon: Users, color: 'text-info' },
          { label: 'Total Subscribers', value: totalSubs.toLocaleString(), icon: Globe, color: 'text-success' },
          { label: 'Delivery Servers', value: totalServers, icon: Server, color: 'text-warning' },
        ].map(s => (
          <div key={s.label} className="premium-card !p-4 flex items-center gap-4">
            <s.icon className={`w-8 h-8 ${s.color} flex-shrink-0`} />
            <div>
              <p className="text-2xl font-bold text-textPrimary">{s.value}</p>
              <p className="text-xs text-textSecondary">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Org cards */}
      {!data.length ? (
        <div className="premium-card flex flex-col items-center justify-center py-20 text-center border-dashed">
          <Server className="w-16 h-16 text-textTertiary mb-4" />
          <h3 className="text-xl font-bold text-textPrimary mb-2">No MailWizz instances</h3>
          <p className="text-textSecondary max-w-sm">
            Configure a MailWizz provider in Email Providers to see data here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((org) => {
            const isOpen = expanded === org.orgId
            const subs = org.lists.reduce((a, l) => a + l.subscriberCount, 0)
            return (
              <div key={org.orgId} className="premium-card !p-0 overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : org.orgId)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-surfaceHover/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-textPrimary truncate">{org.orgName}</h3>
                    <div className="flex items-center gap-3 text-xs text-textTertiary">
                      <span>{org.lists.length} list{org.lists.length !== 1 ? 's' : ''}</span>
                      <span>{subs.toLocaleString()} subs</span>
                      <span>{org.deliveryServers.length} server{org.deliveryServers.length !== 1 ? 's' : ''}</span>
                      {org.scope === 'global' && (
                        <span className="flex items-center gap-1 text-accent">
                          <Globe className="w-3 h-3" /> Global
                        </span>
                      )}
                    </div>
                  </div>
                  {org.error && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surfaceElevated text-error flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Error
                    </span>
                  )}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-textTertiary" /> : <ChevronDown className="w-4 h-4 text-textTertiary" />}
                </button>

                {/* Expanded */}
                {isOpen && (
                  <div className="border-t border-border/40 px-5 py-4 space-y-4">
                    {org.error && (
                      <div className="p-3 rounded-lg bg-error/5 border border-error/20 text-sm text-error flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {org.error}
                      </div>
                    )}

                    {/* Lists */}
                    <div>
                      <h4 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" /> Lists
                      </h4>
                      {org.lists.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {org.lists.map(l => (
                            <div key={l.listUid} className="bg-background rounded-lg p-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-textPrimary">{l.name}</p>
                                <p className="text-[10px] font-mono text-textTertiary">{l.listUid}</p>
                              </div>
                              <span className="text-sm font-bold text-accent">{l.subscriberCount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-textTertiary">No lists found</p>
                      )}
                    </div>

                    {/* Delivery Servers */}
                    <div>
                      <h4 className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Server className="w-3.5 h-3.5" /> Delivery Servers
                      </h4>
                      {org.deliveryServers.length ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {org.deliveryServers.map(s => (
                            <div key={s.id} className="bg-background rounded-lg p-3 flex items-center gap-3">
                              <Wifi className="w-3.5 h-3.5 text-success" />
                              <div>
                                <p className="text-sm font-medium text-textPrimary">{s.name}</p>
                                <p className="text-[10px] font-mono text-textTertiary">ID: {s.id}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-textTertiary">No delivery servers found</p>
                      )}
                    </div>

                    <p className="text-[10px] text-textTertiary pt-1">
                      Base URL: <code className="bg-surface px-1.5 py-0.5 rounded font-mono">{org.baseUrl}</code>
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
