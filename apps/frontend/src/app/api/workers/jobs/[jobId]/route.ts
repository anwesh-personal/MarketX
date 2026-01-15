import { NextRequest, NextResponse } from 'next/server'
import { getJobStatus } from '@/lib/queues'

export async function GET(
    req: NextRequest,
    { params }: { params: { jobId: string } }
) {
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
