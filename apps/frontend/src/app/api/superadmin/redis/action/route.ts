import { NextRequest, NextResponse } from 'next/server'
import { queues } from '../../../../../../workers/src/config/queues'

export async function POST(request: NextRequest) {
    try {
        const { queueName, action } = await request.json()

        if (!queueName || !queues[queueName as keyof typeof queues]) {
            return NextResponse.json({ error: 'Invalid queue name' }, { status: 400 })
        }

        const queue = queues[queueName as keyof typeof queues]

        switch (action) {
            case 'pause':
                await queue.pause()
                return NextResponse.json({ success: true, message: `Queue ${queueName} paused` })

            case 'resume':
                await queue.resume()
                return NextResponse.json({ success: true, message: `Queue ${queueName} resumed` })

            case 'clean-completed':
                await queue.clean(0, 100, 'completed')
                return NextResponse.json({ success: true, message: 'Completed jobs cleaned' })

            case 'clean-failed':
                await queue.clean(0, 100, 'failed')
                return NextResponse.json({ success: true, message: 'Failed jobs cleaned' })

            case 'obliterate':
                await queue.obliterate()
                return NextResponse.json({ success: true, message: `Queue ${queueName} cleared completely` })

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }
    } catch (error: any) {
        console.error('Queue action failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
