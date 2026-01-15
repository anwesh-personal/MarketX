import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient()

        const { data: agents, error } = await supabase
            .from('agents')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ agents })
    } catch (error: any) {
        console.error('Agents API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch agents' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'Agent ID required' }, { status: 400 })
        }

        const supabase = createClient()

        const { data, error } = await supabase
            .from('agents')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ agent: data })
    } catch (error: any) {
        console.error('Update agent error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update agent' },
            { status: 500 }
        )
    }
}
