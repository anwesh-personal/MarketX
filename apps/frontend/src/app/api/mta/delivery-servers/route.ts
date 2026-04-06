/**
 * GET /api/mta/delivery-servers
 * Fetches delivery servers from the org's MailWizz instance.
 * Auth: Supabase session (any authenticated user with can_view_metrics)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMailWizzContext } from '../_shared'

export async function GET(req: NextRequest) {
  const result = await getMailWizzContext(req)
  if (!result.ok) return result.response

  const { adapter, gate } = result.ctx

  if (typeof adapter.getDeliveryServers !== 'function') {
    return NextResponse.json({ error: 'Adapter does not support delivery server listing' }, { status: 501 })
  }

  try {
    const servers = await adapter.getDeliveryServers()
    return NextResponse.json({ servers, orgId: gate.orgId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
