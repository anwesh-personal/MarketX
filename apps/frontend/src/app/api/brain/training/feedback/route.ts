import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient()

        // Mock feedback data - in production, fetch from user_feedback table
        const feedback: any[] = []

        return NextResponse.json({ feedback })
    } catch (error: any) {
        console.error('Training feedback API error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch feedback' },
            { status: 500 }
        )
    }
}
