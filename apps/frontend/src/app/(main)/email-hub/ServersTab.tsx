'use client'

import React from 'react'
import { Server } from 'lucide-react'
import type { DeliveryServer } from './types'

interface Props {
  servers: DeliveryServer[]
  loading: boolean
}

export default function ServersTab({ servers, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card animate-pulse h-24" />
        ))}
      </div>
    )
  }

  if (!servers.length) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-surfaceHover flex items-center justify-center mb-3">
          <Server className="w-7 h-7 text-textTertiary" />
        </div>
        <h3 className="font-semibold text-textPrimary mb-1">No delivery servers</h3>
        <p className="text-sm text-textSecondary max-w-xs">
          Delivery servers configured in MailWizz will be mirrored here for visibility.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {servers.map((srv) => (
        <div
          key={srv.id}
          className="card group hover:border-accent/30 transition-all duration-200"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-surfaceElevated flex items-center justify-center">
              <Server className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-textPrimary text-sm truncate">
                {srv.name}
              </h4>
              <p className="text-xs text-textTertiary font-mono">
                Server ID: {srv.id}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
