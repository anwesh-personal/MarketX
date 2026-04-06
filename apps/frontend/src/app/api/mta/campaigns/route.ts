/**
 * GET /api/mta/campaigns
 * Fetches campaign list + stats from the org's MailWizz instance.
 * Auth: Supabase session (any authenticated user)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMailWizzContext } from '../_shared'

export async function GET(req: NextRequest) {
  const result = await getMailWizzContext(req)
  if (!result.ok) return result.response

  const { adapter, gate } = result.ctx

  try {
    const res = await adapter.mwGet('/campaigns', { per_page: '50' })
    const records = res.data?.records || []

    // For each campaign, get stats
    const campaigns = await Promise.all(
      records.slice(0, 20).map(async (c: any) => {
        const uid = c.campaign_uid
        let stats = null
        try {
          stats = await adapter.getCampaignStats(uid)
        } catch { /* stats unavailable */ }
        return {
          campaignUid: uid,
          name: c.name,
          status: c.status,
          type: c.type,
          list: c.list,
          sendAt: c.send_at,
          stats,
        }
      })
    )

    return NextResponse.json({ campaigns, orgId: gate.orgId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
