/**
 * Run Detail API — GET (view output), DELETE (remove run)
 * Auth: cookie-based + org ownership
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, supabaseAdmin } from '@/lib/api-auth'

interface RouteParams { params: { id: string } }

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: run, error: runError } = await supabaseAdmin
            .from('runs')
            .select('id, status, created_at, completed_at, kb_id, execution_id, triggered_by')
            .eq('id', params.id)
            .single()

        if (runError || !run) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 })
        }

        if (run.triggered_by !== ctx.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        let outputData = null
        if (run.execution_id) {
            const { data: execLog } = await supabaseAdmin
                .from('engine_run_logs')
                .select('output_data, status, started_at, completed_at, error_message')
                .eq('id', run.execution_id)
                .maybeSingle()

            outputData = execLog
        }

        return NextResponse.json({ run, execution: outputData })
    } catch (error: any) {
        console.error('Run GET error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const ctx = await getAuthContext()
        if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: run, error: checkError } = await supabaseAdmin
            .from('runs')
            .select('id, triggered_by')
            .eq('id', params.id)
            .single()

        if (checkError || !run) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 })
        }

        if (run.triggered_by !== ctx.userId) {
            return NextResponse.json({ error: 'Access denied — not your run' }, { status: 403 })
        }

        const { error } = await supabaseAdmin
            .from('runs')
            .delete()
            .eq('id', params.id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Run DELETE error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
