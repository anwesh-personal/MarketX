/**
 * Workers API - List Active Worker Instances
 * 
 * Returns running worker instances with heartbeat status
 * 
 * @route /api/superadmin/workers
 * @author Anwesh Rath
 * @date 2026-01-16
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET - List all active worker instances
 */
export async function GET(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request)
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Mark dead workers first
        await supabase.rpc('mark_dead_workers')

        // Fetch workers
        const { data: workers, error } = await supabase
            .from('workers')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ workers: workers || [] })
    } catch (error: any) {
        console.error('Error fetching workers:', error)
        return NextResponse.json(
            { error: error.message, workers: [] },
            { status: 500 }
        )
    }
}

/**
 * POST - Register new worker instance (heartbeat registration)
 */
export async function POST(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request)
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { worker_type, hostname, pid, deployment_id, metadata } = body

        // Validate required fields
        if (!worker_type || !hostname) {
            return NextResponse.json(
                { error: 'Missing required fields: worker_type, hostname' },
                { status: 400 }
            )
        }

        // Validate worker type
        const validTypes = ['writer', 'learning', 'analytics', 'brain', 'queue', 'custom']
        if (!validTypes.includes(worker_type)) {
            return NextResponse.json(
                { error: `Invalid worker_type. Must be one of: ${validTypes.join(', ')}` },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('workers')
            .insert({
                worker_type,
                hostname,
                pid: pid || null,
                deployment_id: deployment_id || null,
                metadata: metadata || {},
                status: 'idle',
                last_heartbeat: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ worker: data })
    } catch (error: any) {
        console.error('Error registering worker:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

/**
 * PATCH - Update worker heartbeat
 */
export async function PATCH(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request)
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { id, status } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Worker ID required' },
                { status: 400 }
            )
        }

        const updates: any = {
            last_heartbeat: new Date().toISOString()
        }

        if (status) {
            const validStatuses = ['active', 'idle', 'dead']
            if (!validStatuses.includes(status)) {
                return NextResponse.json(
                    { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                    { status: 400 }
                )
            }
            updates.status = status
        }

        const { data, error } = await supabase
            .from('workers')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ worker: data })
    } catch (error: any) {
        console.error('Error updating worker heartbeat:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

/**
 * DELETE - Unregister worker
 */
export async function DELETE(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request)
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Worker ID required' },
                { status: 400 }
            )
        }

        const { error } = await supabase
            .from('workers')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error unregistering worker:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
