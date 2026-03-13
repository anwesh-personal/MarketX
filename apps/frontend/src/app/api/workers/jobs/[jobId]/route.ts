import { NextRequest, NextResponse } from 'next/server'
import { getJobStatus } from '@/lib/queues'
import { createClient } from '@/lib/supabase/server'

export async function GET(
    req: NextRequest,
    { params }: { params: { jobId: string } }
) {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = params
    const { searchParams } = new URL(req.url)
    const queueName = searchParams.get('queue')

    if (!queueName) {
        return NextResponse.json({ error: 'Queue name required' }, { status: 400 })
    }

    try {
        const status = await getJobStatus(queueName, jobId)

        if (!status) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        }

        return NextResponse.json(status)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
