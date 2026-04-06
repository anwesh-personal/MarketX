/**
 * GET /api/mta/lists
 * Fetches subscriber lists from the org's MailWizz instance.
 * Auth: Supabase session (any authenticated user)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMailWizzContext } from '../_shared'

export async function GET(req: NextRequest) {
  const result = await getMailWizzContext(req)
  if (!result.ok) return result.response

  const { adapter, gate } = result.ctx

  if (typeof adapter.getLists !== 'function') {
    return NextResponse.json({ error: 'Adapter does not support list fetching' }, { status: 501 })
  }

  try {
    const lists = await adapter.getLists()
    return NextResponse.json({ lists, orgId: gate.orgId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
