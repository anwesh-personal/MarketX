/**
 * SATELLITE DAILY RESET CRON
 * ==========================
 * POST /api/cron/satellite-reset
 *
 * Resets current_daily_sent to 0 for all active satellites.
 * Called once per day at midnight UTC by an external scheduler
 * (Railway Cron, Vercel Cron, GitHub Actions, etc.)
 *
 * Auth: Bearer token matching CRON_SECRET env var.
 * If CRON_SECRET is not set, this endpoint is disabled (returns 503).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // ── Auth: cron secret ───────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured — cron endpoint disabled' },
      { status: 503 },
    )
  }

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Invalid cron secret' }, { status: 401 })
  }

  // ── Reset ───────────────────────────────────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await supabase
    .from('sending_satellites')
    .update({ current_daily_sent: 0 })
    .eq('is_active', true)
    .select('id')

  if (error) {
    console.error('[cron/satellite-reset] Failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const count = data?.length ?? 0
  console.log(`[cron/satellite-reset] Reset ${count} satellite daily counters`)

  return NextResponse.json({
    success: true,
    satellitesReset: count,
    resetAt: new Date().toISOString(),
  })
}
