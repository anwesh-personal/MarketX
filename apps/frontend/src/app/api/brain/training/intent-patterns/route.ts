import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient()

        const { data: patterns, error } = await supabase
            .from('intent_patterns')
            .select('*')
            .order('priority', { ascending: false })

        if (error) throw error

        return NextResponse.json({ patterns: patterns || [] })
    } catch (error: any) {
        console.error('Intent patterns API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch patterns' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const supabase = createClient()

        const { data, error } = await supabase
            .from('intent_patterns')
            .insert([{
                agent_type: body.agent_type,
                keywords: body.keywords,
                priority: body.priority,
                is_active: true
            }])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ pattern: data })
    } catch (error: any) {
        console.error('Create pattern error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create pattern' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        const supabase = createClient()

        const { data, error } = await supabase
            .from('intent_patterns')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ pattern: data })
    } catch (error: any) {
        console.error('Update pattern error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update pattern' },
            { status: 500 }
        )
    }
}
