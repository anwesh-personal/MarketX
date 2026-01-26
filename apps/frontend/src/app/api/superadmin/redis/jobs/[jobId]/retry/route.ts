/**
 * Worker API Proxy - Job Retry
 * 
 * Proxies job retry requests to the Worker API.
 */

import { NextRequest, NextResponse } from 'next/server'

const WORKER_API_URL = process.env.WORKER_API_URL || 'http://localhost:3100'

export async function POST(
    request: NextRequest,
    { params }: { params: { jobId: string } }
) {
    try {
        const { jobId } = params
        const body = await request.json()
        const { queueName } = body

        if (!queueName) {
            return NextResponse.json(
                { error: 'Queue name is required' },
                { status: 400 }
            )
        }

        const response = await fetch(`${WORKER_API_URL}/api/jobs/${jobId}/retry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queueName }),
            signal: AbortSignal.timeout(10000),
        })

        const data = await response.json()

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || 'Retry failed' },
                { status: response.status }
            )
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('[Job Retry] Failed:', error.message)
        return NextResponse.json(
            { error: error.message || 'Worker API not reachable' },
            { status: 500 }
        )
    }
}
