import { NextRequest, NextResponse } from 'next/server'
import { queues } from '@/lib/worker-queues'

export async function POST(
    request: NextRequest,
    { params }: { params: { jobId: string } }
) {
    try {
        const { jobId } = params
        const { queueName } = await request.json()

        if (!queueName || !queues[queueName as keyof typeof queues]) {
            return NextResponse.json({ error: 'Invalid queue name' }, { status: 400 })
        }

        const queue = queues[queueName as keyof typeof queues]
        const job = await queue.getJob(jobId)

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        }

        // Retry the job
        await job.retry()

        return NextResponse.json({
            success: true,
            message: `Job ${jobId} queued for retry`
        })
    } catch (error: any) {
        console.error('Job retry failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
