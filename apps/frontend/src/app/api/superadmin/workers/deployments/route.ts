/**
 * Worker Deployments API
 * 
 * Manage worker deployments to servers
 * 
 * @route /api/superadmin/workers/deployments
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
 * GET - List all worker deployments
 */
export async function GET(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request)
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: deployments, error } = await supabase
            .from('worker_deployments')
            .select(`
        *,
        template:worker_templates(*)
      `)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ deployments })
    } catch (error: any) {
        console.error('Error fetching deployments:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

/**
 * POST - Create new worker deployment
 */
export async function POST(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request)
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const {
            template_id,
            name,
            description,
            server_ip,
            port,
            ssh_user,
            ssh_key_encrypted,
            env_config,
            worker_config,
            auto_restart,
            max_memory,
            concurrency
        } = body

        // Validate required fields
        if (!template_id || !name || !server_ip || !port) {
            return NextResponse.json(
                { error: 'Missing required fields: template_id, name, server_ip, port' },
                { status: 400 }
            )
        }

        // Validate port
        if (port < 1 || port > 65535) {
            return NextResponse.json(
                { error: 'Port must be between 1 and 65535' },
                { status: 400 }
            )
        }

        // Check if template exists
        const { data: template } = await supabase
            .from('worker_templates')
            .select('id')
            .eq('id', template_id)
            .single()

        if (!template) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            )
        }

        const { data, error } = await supabase
            .from('worker_deployments')
            .insert({
                template_id,
                name,
                description: description || null,
                server_ip,
                port,
                ssh_user: ssh_user || null,
                ssh_key_encrypted: ssh_key_encrypted || null,
                env_config: env_config || {},
                worker_config: worker_config || {},
                status: 'stopped',
                auto_restart: auto_restart ?? true,
                max_memory: max_memory || '2G',
                concurrency: concurrency || 1
            })
            .select(`
        *,
        template:worker_templates(*)
      `)
            .single()

        if (error) throw error

        return NextResponse.json({ deployment: data })
    } catch (error: any) {
        console.error('Error creating deployment:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

/**
 * PATCH - Update worker deployment
 */
export async function PATCH(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request)
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Deployment ID required' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('worker_deployments')
            .update(updates)
            .eq('id', id)
            .select(`
        *,
        template:worker_templates(*)
      `)
            .single()

        if (error) throw error

        return NextResponse.json({ deployment: data })
    } catch (error: any) {
        console.error('Error updating deployment:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

/**
 * DELETE - Delete worker deployment
 */
export async function DELETE(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request)
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Deployment ID required' },
                { status: 400 }
            )
        }

        // Check if deployment is running
        const { data: deployment } = await supabase
            .from('worker_deployments')
            .select('status')
            .eq('id', id)
            .single()

        if (deployment && deployment.status === 'running') {
            return NextResponse.json(
                { error: 'Cannot delete running deployment. Stop it first.' },
                { status: 400 }
            )
        }

        const { error } = await supabase
            .from('worker_deployments')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting deployment:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
