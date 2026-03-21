'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Shield,
  Loader2,
  RefreshCw,
  Search,
  Check,
  X,
  Edit,
  Save,
  Building2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'

interface PortalConfig {
  id: string
  partner_id: string
  tier: 'basic' | 'medium' | 'enterprise'
  can_view_metrics: boolean
  can_chat_brain: boolean
  can_train_brain: boolean
  can_write_emails: boolean
  can_feed_brain: boolean
  can_access_flow_builder: boolean
  can_view_kb: boolean
  can_export_data: boolean
  can_manage_satellites: boolean
  can_view_agent_decisions: boolean
  max_brain_chats_per_day: number
  max_kb_uploads: number
  max_custom_flows: number
  created_at: string
  updated_at: string
  partner?: { id: string; name: string }
}

const ALL_FEATURES = [
  { key: 'can_view_metrics', label: 'View Metrics' },
  { key: 'can_chat_brain', label: 'Chat w/ Brain' },
  { key: 'can_train_brain', label: 'Train Brain' },
  { key: 'can_write_emails', label: 'Write Emails' },
  { key: 'can_feed_brain', label: 'Feed Brain' },
  { key: 'can_access_flow_builder', label: 'Flow Builder' },
  { key: 'can_view_kb', label: 'View KB' },
  { key: 'can_export_data', label: 'Export Data' },
  { key: 'can_manage_satellites', label: 'Manage Satellites' },
  { key: 'can_view_agent_decisions', label: 'View Decisions' },
] as const

const LIMITS = [
  { key: 'max_brain_chats_per_day', label: 'Daily Chats', min: 0 },
  { key: 'max_kb_uploads', label: 'KB Uploads', min: 0 },
  { key: 'max_custom_flows', label: 'Custom Flows', min: 0 },
] as const

const TIER_COLORS = {
  basic: 'bg-textTertiary/10 text-textTertiary',
  medium: 'bg-info/10 text-info',
  enterprise: 'bg-accent/10 text-accent',
}

export default function PortalTiersPage() {
  const { fetchWithAuth } = useSuperadminAuth()
  const [configs, setConfigs] = useState<PortalConfig[]>([])
  const [byTier, setByTier] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<Partial<PortalConfig>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/superadmin/portal-tiers')
      const data = await res.json()
      if (data.configs) setConfigs(data.configs)
      if (data.by_tier) setByTier(data.by_tier)
    } catch {
      toast.error('Failed to load portal configs')
    } finally {
      setLoading(false)
    }
  }, [fetchWithAuth])

  useEffect(() => {
    void load()
  }, [load])

  const startEdit = (c: PortalConfig) => {
    setEditingId(c.id)
    setEditState({ ...c })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditState({})
  }

  const handleSave = async (partnerId: string) => {
    setSaving(true)
    try {
      const res = await fetchWithAuth('/api/superadmin/portal-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editState, partner_id: partnerId }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Portal config updated')
      setEditingId(null)
      void load()
    } catch {
      toast.error('Failed to update config')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFeature = (f: keyof PortalConfig) => {
    setEditState((prev) => ({ ...prev, [f]: !prev[f] }))
  }

  const handleLimitChange = (f: keyof PortalConfig, val: string) => {
    const num = parseInt(val, 10)
    setEditState((prev) => ({ ...prev, [f]: isNaN(num) ? 0 : num }))
  }

  const filtered = configs.filter((c) => {
    const q = search.toLowerCase()
    return (
      (c.partner?.name || '').toLowerCase().includes(q) ||
      c.partner_id.toLowerCase().includes(q) ||
      c.tier.toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary mb-xs">
            Portal Access & Feature Tiers
          </h1>
          <p className="text-textSecondary">
            Manage per-organization feature flags and usage limits. Overrides default basic tier if configured here.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-xs bg-surface border border-border text-textSecondary px-md py-sm rounded-[var(--radius-md)] hover:text-textPrimary transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Reload
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md flex items-center gap-md">
          <div className="p-sm bg-primary/10 rounded-full text-primary">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-textPrimary">{configs.length}</div>
            <div className="text-xs text-textSecondary uppercase">Orgs w/ Custom Tier</div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md flex items-center gap-md">
          <div className="p-sm bg-textTertiary/10 rounded-full text-textTertiary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-textPrimary">{byTier.basic || 0}</div>
            <div className="text-xs text-textSecondary uppercase">Basic Configs</div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md flex items-center gap-md">
          <div className="p-sm bg-info/10 rounded-full text-info">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-textPrimary">{byTier.medium || 0}</div>
            <div className="text-xs text-textSecondary uppercase">Medium Configs</div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md flex items-center gap-md">
          <div className="p-sm bg-accent/10 rounded-full text-accent">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-textPrimary">{byTier.enterprise || 0}</div>
            <div className="text-xs text-textSecondary uppercase">Enterprise Configs</div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md">
        <div className="relative w-full sm:w-96 mb-md">
          <Search className="absolute left-sm top-1/2 -translate-y-1/2 w-5 h-5 text-textTertiary" />
          <input
            type="text"
            placeholder="Search by org name, ID, or tier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background text-textPrimary border border-border rounded-[var(--radius-md)] pl-10 pr-sm py-xs transition-all focus:outline-none focus:ring-2 focus:ring-borderFocus"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-sm px-md font-semibold text-textSecondary text-xs uppercase">Organization</th>
                <th className="py-sm px-md font-semibold text-textSecondary text-xs uppercase">Tier</th>
                <th className="py-sm px-md font-semibold text-textSecondary text-xs uppercase">Features Granted</th>
                <th className="py-sm px-md font-semibold text-textSecondary text-xs uppercase">Limits</th>
                <th className="py-sm px-md font-semibold text-textSecondary text-xs uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const isEditing = editingId === c.id
                const grantedFeatures = ALL_FEATURES.filter((f) => c[f.key as keyof PortalConfig])

                return (
                  <React.Fragment key={c.id}>
                    <tr className={`border-b border-border/50 ${isEditing ? 'bg-primary/5' : 'hover:bg-background/50'} transition-colors`}>
                      <td className="py-md px-md align-top">
                        <div className="font-medium text-textPrimary">{c.partner?.name || 'Unknown'}</div>
                        <div className="text-xs text-textSecondary font-mono mt-0.5">{c.partner_id}</div>
                      </td>
                      <td className="py-md px-md align-top">
                        {isEditing ? (
                          <select
                            value={editState.tier}
                            onChange={(e) => setEditState({ ...editState, tier: e.target.value as any })}
                            className="bg-background text-textPrimary border border-border rounded px-xs py-1 text-sm focus:outline-none focus:border-primary"
                          >
                            <option value="basic">Basic</option>
                            <option value="medium">Medium</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 text-xs font-medium uppercase rounded-full ${TIER_COLORS[c.tier] || TIER_COLORS.basic}`}>
                            {c.tier}
                          </span>
                        )}
                      </td>
                      <td className="py-md px-md align-top">
                        {isEditing ? (
                          <div className="flex flex-col gap-1.5 min-w-[300px]">
                            {ALL_FEATURES.reduce((rows, f, i) => {
                              if (i % 2 === 0) rows.push(ALL_FEATURES.slice(i, i + 2))
                              return rows
                            }, [] as any[]).map((pair, rowIndex) => (
                              <div key={rowIndex} className="flex items-center gap-4">
                                {pair.map((f: any) => (
                                  <label key={f.key} className="flex items-center gap-2 cursor-pointer w-1/2">
                                    <input
                                      type="checkbox"
                                      className="rounded border-border text-primary focus:ring-primary/50 focus:ring-offset-0 bg-background"
                                      checked={Boolean(editState[f.key as keyof PortalConfig])}
                                      onChange={() => handleToggleFeature(f.key as keyof PortalConfig)}
                                    />
                                    <span className="text-xs text-textSecondary">{f.label}</span>
                                  </label>
                                ))}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex gap-1 flex-wrap max-w-sm">
                            {grantedFeatures.length === 0 ? (
                              <span className="text-xs text-textTertiary italic">None</span>
                            ) : (
                              grantedFeatures.map((f) => (
                                <span key={f.key} className="px-1.5 py-0.5 bg-background border border-border text-textSecondary rounded text-[10px] whitespace-nowrap">
                                  {f.label}
                                </span>
                              ))
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-md px-md align-top">
                        {isEditing ? (
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            {LIMITS.map((l) => (
                              <div key={l.key} className="flex items-center justify-between gap-2">
                                <span className="text-xs text-textSecondary">{l.label}:</span>
                                <input
                                  type="number"
                                  min={l.min}
                                  value={editState[l.key as keyof PortalConfig] as number}
                                  onChange={(e) => handleLimitChange(l.key as keyof PortalConfig, e.target.value)}
                                  className="w-16 bg-background text-textPrimary border border-border rounded px-xs py-0.5 text-xs focus:outline-none focus:border-primary text-right"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {LIMITS.map((l) => (
                              <div key={l.key} className="flex items-center gap-2 text-xs">
                                <span className="text-textTertiary">{l.label}:</span>
                                <span className="text-textPrimary font-mono">{c[l.key as keyof PortalConfig] as number}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-md px-md align-top text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="p-1.5 text-textTertiary hover:text-textPrimary hover:bg-background rounded transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSave(c.partner_id)}
                              disabled={saving}
                              className="p-1.5 bg-primary text-textOnPrimary rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              <span className="text-xs font-medium pr-0.5">Save</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(c)}
                            className="inline-flex p-1.5 text-textTertiary hover:text-textPrimary hover:bg-background border border-transparent hover:border-border rounded transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-2xl text-center text-textTertiary">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No tier configurations found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
