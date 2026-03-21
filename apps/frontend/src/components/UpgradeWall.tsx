'use client'

import { Lock, ArrowUpRight } from 'lucide-react'

interface UpgradeWallProps {
  feature: string
  tier: string
}

/**
 * Full-page upgrade wall shown when a member tries to access
 * a feature their plan doesn't include.
 */
export function UpgradeWall({ feature, tier }: UpgradeWallProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md space-y-md">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-surfaceHover flex items-center justify-center">
          <Lock className="w-10 h-10 text-textTertiary" />
        </div>

        <h2 className="text-2xl font-bold text-textPrimary">
          Feature Locked
        </h2>

        <p className="text-textSecondary">
          <strong className="capitalize">{feature}</strong> is not available on your{' '}
          <span className="capitalize font-semibold">{tier}</span> plan.
          Contact your account manager to upgrade.
        </p>

        <a
          href="mailto:support@marketx.io?subject=Plan Upgrade Request"
          className="inline-flex items-center gap-sm btn btn-primary"
        >
          <span>Request Upgrade</span>
          <ArrowUpRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
