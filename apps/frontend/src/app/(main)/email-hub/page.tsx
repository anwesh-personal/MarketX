'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Mail, RefreshCw, Users, Send,
  TrendingUp, AlertCircle,
} from 'lucide-react'
import type { MtaList, Campaign, DeliveryServer, TabId } from './types'
import { TABS } from './types'
import ListsTab from './ListsTab'
import CampaignsTab from './CampaignsTab'
import ServersTab from './ServersTab'

export default function EmailHubPage() {
  const [tab, setTab] = useState<TabId>('lists')
  const [lists, setLists] = useState<MtaList[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [servers, setServers] = useState<DeliveryServer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    // Type-safe helper: returns true only when the fetch succeeded with 2xx
    const isOk = (r: PromiseSettledResult<Response>): r is PromiseFulfilledResult<Response> =>
      r.status === 'fulfilled' && r.value.ok

    try {
      const [listsRes, campsRes, serversRes] = await Promise.allSettled([
        fetch('/api/mta/lists'),
        fetch('/api/mta/campaigns'),
        fetch('/api/mta/delivery-servers'),
      ])

      if (isOk(listsRes)) {
        const d = await listsRes.value.json()
        setLists(d.lists || [])
      }
      if (isOk(campsRes)) {
        const d = await campsRes.value.json()
        setCampaigns(d.campaigns || [])
      }
      if (isOk(serversRes)) {
        const d = await serversRes.value.json()
        setServers(d.servers || [])
      }

      // If ALL three failed, surface an error
      if (!isOk(listsRes) && !isOk(campsRes) && !isOk(serversRes)) {
        setError('Unable to connect to your MTA. Check provider config.')
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Aggregate stats
  const totalSubs = lists.reduce((s, l) => s + l.subscriberCount, 0)
  const totalSent = campaigns.reduce((s, c) => s + (c.stats?.sent || 0), 0)
  const ACTIVE_STATUSES = new Set(['sending', 'sent', 'pending-sending'])
  const activeCamps = campaigns.filter(c => ACTIVE_STATUSES.has(c.status)).length

  // Tab badge counts — single source of truth
  const tabCounts: Record<TabId, number> = {
    lists: lists.length,
    campaigns: campaigns.length,
    servers: servers.length,
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
              <Mail className="w-6 h-6 text-accent" />
            </div>
            <h1 className="text-3xl font-bold font-display text-textPrimary tracking-tight">
              Email Hub
            </h1>
          </div>
          <p className="text-textSecondary">
            Your MTA lists, campaigns, and delivery infrastructure at a glance.
          </p>
        </div>
        <button
          onClick={() => fetchAll(true)}
          disabled={refreshing}
          className="btn btn-ghost btn-sm flex items-center gap-2 self-start"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card border-error/30 bg-error/5 flex items-center gap-3 !py-3">
          <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Lists', value: lists.length, icon: Users, color: 'text-accent' },
          { label: 'Subscribers', value: totalSubs.toLocaleString(), icon: TrendingUp, color: 'text-info' },
          { label: 'Active Campaigns', value: activeCamps, icon: Send, color: 'text-success' },
          { label: 'Total Sent', value: totalSent.toLocaleString(), icon: Mail, color: 'text-warning' },
        ].map(s => (
          <div key={s.label} className="stat-card group flex items-center gap-4">
            <div className="stat-card-icon group-hover:shadow-glow transition-shadow">
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-textSecondary">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              tab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-textSecondary hover:text-textPrimary'
            }`}
          >
            <span>{t.emoji}</span> {t.label}
            {tabCounts[t.id] > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                {tabCounts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'lists' && <ListsTab lists={lists} loading={loading} />}
      {tab === 'campaigns' && <CampaignsTab campaigns={campaigns} loading={loading} />}
      {tab === 'servers' && <ServersTab servers={servers} loading={loading} />}
    </div>
  )
}
