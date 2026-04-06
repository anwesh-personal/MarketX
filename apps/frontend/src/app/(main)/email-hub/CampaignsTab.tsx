'use client'

import React from 'react'
import {
  Send, Eye, MousePointerClick, MessageSquare,
  AlertTriangle, TrendingUp, Clock,
} from 'lucide-react'
import type { Campaign } from './types'
import { STATUS_COLORS } from './types'

interface Props {
  campaigns: Campaign[]
  loading: boolean
}

export default function CampaignsTab({ campaigns, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="card animate-pulse h-24" />
        ))}
      </div>
    )
  }

  if (!campaigns.length) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-surfaceHover flex items-center justify-center mb-3">
          <Send className="w-7 h-7 text-textTertiary" />
        </div>
        <h3 className="font-semibold text-textPrimary mb-1">No campaigns yet</h3>
        <p className="text-sm text-textSecondary max-w-xs">
          Campaigns dispatched through MailWizz will appear here with real-time stats.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {campaigns.map((c) => {
        const sc = STATUS_COLORS[c.status] || STATUS_COLORS.draft
        const s = c.stats

        return (
          <div
            key={c.campaignUid}
            className="card !p-0 overflow-hidden hover:border-accent/20 transition-all"
          >
            {/* Header */}
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-semibold text-textPrimary text-sm truncate">
                    {c.name}
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-textTertiary">
                  {c.list && (
                    <span>List: {c.list.name || c.list.list_uid}</span>
                  )}
                  {c.sendAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(c.sendAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  )}
                  <span className="font-mono text-textTertiary/60">
                    {c.campaignUid}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats row */}
            {s && (
              <div className="border-t border-border/40 px-5 py-3 grid grid-cols-5 gap-3">
                <Metric
                  icon={TrendingUp}
                  label="Sent"
                  value={s.sent.toLocaleString()}
                  color="text-accent"
                />
                <Metric
                  icon={Eye}
                  label="Opens"
                  value={`${(s.openRate * 100).toFixed(1)}%`}
                  sub={`${s.uniqueOpens} unique`}
                  color="text-info"
                />
                <Metric
                  icon={MousePointerClick}
                  label="Clicks"
                  value={`${(s.clickRate * 100).toFixed(1)}%`}
                  sub={`${s.uniqueClicks} unique`}
                  color="text-success"
                />
                <Metric
                  icon={MessageSquare}
                  label="Replies"
                  value={s.replies.toLocaleString()}
                  sub={`${(s.replyRate * 100).toFixed(1)}%`}
                  color="text-warning"
                />
                <Metric
                  icon={AlertTriangle}
                  label="Bounces"
                  value={s.bounces.toLocaleString()}
                  sub={`${(s.bounceRate * 100).toFixed(1)}%`}
                  color={s.bounceRate > 0.03 ? 'text-error' : 'text-textTertiary'}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Metric({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string
  sub?: string; color: string
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] uppercase tracking-wider text-textTertiary">
          {label}
        </span>
      </div>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-textTertiary">{sub}</p>}
    </div>
  )
}
