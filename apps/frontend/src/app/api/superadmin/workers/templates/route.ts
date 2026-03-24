/**
 * Worker Templates API
 * 
 * CRUD operations for worker code templates
 * 
 * @route /api/superadmin/workers/templates
 * @author Anwesh Rath
 * @date 2026-01-16
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperadmin } from '@/lib/superadmin-middleware';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET - List all worker templates
 */
export async function GET(request: NextRequest) {
    try {
    const admin = await getSuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid superadmin token required' },
        { status: 401 }
      );
    }

        const { data: templates, error } = await supabase
            .from('worker_templates')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ templates })
    } catch (error: any) {
        console.error('Error fetching templates:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

/**
 * POST - Create new worker template
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            name,
            type,
            description,
            code_template,
            config_schema,
            env_vars,
           
    const admin = await getSuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid superadmin token required' },
        { status: 401 }
      );
    }
 dependencies,
            docker_config
        } = body

        // Validate required fields
        if (!name || !type || !code_template) {
            return NextResponse.json(
                { error: 'Missing required fields: name, type, code_template' },
                { status: 400 }
            )
        }

        // Validate type
        const validTypes = ['brain', 'queue', 'api', 'custom']
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('worker_templates')
            .insert({
                name,
                type,
                description: description || null,
                code_template,
                config_schema: config_schema || {},
                env_vars: env_vars || {},
                dependencies: dependencies || {},
                docker_config: docker_config || {},
                is_active: true
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ template: data })
    } catch (error: any) {
        console.error('Error creating template:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

/**
 * PATCH - Update worker template
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json(
                { error: 'Template ID required' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('worker_templates')
            .update(updates)
            .eq('id', id)
            .select()
            .
    const admin = await getSuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid superadmin token required' },
        { status: 401 }
      );
    }
single()

        if (error) throw error

        return NextResponse.json({ template: data })
    } catch (error: any) {
        console.error('Error updating template:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}

/**
 * DELETE - Delete worker template
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'Template ID required' },
                { status: 400 }
            )
        }

        // Check if template is being used by any deployments
        const { data: deployments } = await supabase
            .from('worker_deployments')
            .select('id')
            .eq('template_id', id)
            .limit(1)

        if (deployments && deployments.length > 0) {
            return NextResponse.json(
                { error: 'Cannot delete template
    const admin = await getSuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid superadmin token required' },
        { status: 401 }
      );
    }
: it is being used by active deployments' },
                { status: 400 }
            )
        }

        const { error } = await supabase
            .from('worker_templates')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting template:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
