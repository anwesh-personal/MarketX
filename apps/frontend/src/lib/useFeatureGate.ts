/**
 * useFeatureGate — client-side feature gating hook
 *
 * Fetches the current user's portal config (tier + feature flags)
 * and provides a check function. Pages use this to block access
 * when a feature is disabled for their plan.
 *
 * Usage:
 *   const { allowed, loading, tier } = useFeatureGate('can_chat_brain')
 *   if (!allowed && !loading) return <UpgradeWall />
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

interface PortalFeatures {
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
}

interface PortalConfig {
  tier: string
  features: PortalFeatures
  partner_id: string
}

// Module-level cache so we don't re-fetch on every page nav
let _cachedConfig: PortalConfig | null = null
let _cacheTs = 0
const CACHE_TTL = 60_000 // 1 minute

export function useFeatureGate(featureKey: keyof PortalFeatures) {
  const [config, setConfig] = useState<PortalConfig | null>(_cachedConfig)
  const [loading, setLoading] = useState(!_cachedConfig)

  useEffect(() => {
    if (_cachedConfig && Date.now() - _cacheTs < CACHE_TTL) {
      setConfig(_cachedConfig)
      setLoading(false)
      return
    }

    let cancelled = false

    fetch('/api/portal/config')
      .then((r) => r.json())
      .then((data: PortalConfig) => {
        if (cancelled) return
        _cachedConfig = data
        _cacheTs = Date.now()
        setConfig(data)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        // Network error — don't lock the user out. Default to enterprise-open.
        const fallback: PortalConfig = {
          tier: 'enterprise',
          features: {
            can_view_metrics: true,
            can_chat_brain: true,
            can_train_brain: true,
            can_write_emails: true,
            can_feed_brain: true,
            can_access_flow_builder: true,
            can_view_kb: true,
            can_export_data: true,
            can_manage_satellites: true,
            can_view_agent_decisions: true,
            max_brain_chats_per_day: 999,
            max_kb_uploads: 100,
            max_custom_flows: 50,
          },
          partner_id: '',
        }
        setConfig(fallback)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // If config loaded: use it. If still loading: allow (no flash of UpgradeWall).
  const allowed = config ? Boolean(config.features[featureKey]) : true
  const tier = config?.tier ?? 'enterprise'

  return { allowed, loading, tier, features: config?.features ?? null }
}

/**
 * Invalidate the cached config (call after a plan upgrade, for example)
 */
export function invalidateFeatureCache() {
  _cachedConfig = null
  _cacheTs = 0
}
