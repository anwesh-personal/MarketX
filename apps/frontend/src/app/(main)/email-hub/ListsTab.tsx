'use client'

import React from 'react'
import { Users, Hash, Copy, CheckCircle } from 'lucide-react'
import type { MtaList } from './types'

interface Props {
  lists: MtaList[]
  loading: boolean
}

export default function ListsTab({ lists, loading }: Props) {
  const [copied, setCopied] = React.useState<string | null>(null)

  const copyUid = (uid: string) => {
    navigator.clipboard.writeText(uid)
    setCopied(uid)
    setTimeout(() => setCopied(null), 1500)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card animate-pulse h-32" />
        ))}
      </div>
    )
  }

  if (!lists.length) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-surfaceHover flex items-center justify-center mb-3">
          <Users className="w-7 h-7 text-textTertiary" />
        </div>
        <h3 className="font-semibold text-textPrimary mb-1">No subscriber lists</h3>
        <p className="text-sm text-textSecondary max-w-xs">
          Lists will appear here once your MailWizz instance has them configured.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {lists.map((list) => (
        <div
          key={list.listUid}
          className="card group hover:border-accent/30 transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-textPrimary text-sm truncate">
                  {list.name}
                </h4>
                <div className="flex items-center gap-1 text-xs text-textTertiary">
                  <Hash className="w-3 h-3" />
                  <span className="font-mono">{list.listUid}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => copyUid(list.listUid)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-surfaceHover"
              title="Copy list UID"
            >
              {copied === list.listUid ? (
                <CheckCircle className="w-3.5 h-3.5 text-success" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-textTertiary" />
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-border/30">
            <p className="text-3xl font-bold text-textPrimary">
              {list.subscriberCount.toLocaleString()}
            </p>
            <p className="text-xs text-textSecondary mt-0.5">subscribers</p>
          </div>
        </div>
      ))}
    </div>
  )
}
