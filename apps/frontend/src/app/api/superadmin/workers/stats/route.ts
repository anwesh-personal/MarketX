/**
 * Worker Stats API
 * 
 * Job queue statistics and worker metrics
 * 
 * @route /api/superadmin/workers/stats
 * @author Anwesh Rath
 * @date 2026-01-16
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET - Job queue and worker statistics
 */
export async function GET(request: NextRequest) {
    try {
        // Mark dead workers first
        await supabase.rpc('mark_dead_workers')

        // Get worker counts by status
        const { data: workers } = await supabase
            .from('workers')
            .select('status')

        const total_workers = workers?.length || 0
        const active_workers = workers?.filter(w => w.status === 'active').length || 0
        const idle_workers = workers?.filter(w => w.status === 'idle').length || 0
        const dead_workers = workers?.filter(w => w.status === 'dead').length || 0

        // Get job counts by status from worker_jobs table
        const { data: jobs } = await supabase
            .from('worker_jobs')
            .select('status, created_at')

        const jobs_pending = jobs?.filter(j => j.status === 'pending').length || 0
        const jobs_running = jobs?.filter(j => j.status === 'processing' || j.status === 'running').length || 0

        // Count completed jobs today
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const jobs_completed_today = jobs?.filter(j => {
            if (j.status !== 'completed') return false
            const createdAt = new Date(j.created_at)
            return createdAt >= today
        }).length || 0

        const stats = {
            total_workers,
            active_workers,
            idle_workers,
            dead_workers,
            jobs_pending,
            jobs_running,
            jobs_completed_today
        }

        return NextResponse.json({ stats })
    } catch (error: any) {
        console.error('Error fetching worker stats:', error)

        // Return default stats on error
        const defaultStats = {
            total_workers: 0,
            active_workers: 0,
            idle_workers: 0,
            dead_workers: 0,
            jobs_pending: 0,
            jobs_running: 0,
            jobs_completed_today: 0
        }

        return NextResponse.json({ stats: defaultStats })
    }
}
