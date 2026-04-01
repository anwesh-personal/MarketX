/**
 * Worker API Proxy - Queue Actions
 * 
 * Proxies queue actions (pause, resume, clean, etc.) to the Worker API.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSuperadmin } from '@/lib/superadmin-middleware';
import { requireEnv } from '@/lib/require-env';

const WORKER_API_URL = requireEnv('WORKER_API_URL')

export async function POST(request: NextRequest) {
    try {
    const admin = await getSuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid superadmin token required' },
        { status: 401 }
      );
    }

        const body = await request.json()
        const { queueName, action } = body

        if (!queueName || !action) {
            return NextResponse.json(
                { error: 'Queue name and action are required' },
                { status: 400 }
            )
        }

        const response = await fetch(`${WORKER_API_URL}/api/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queueName, action }),
            signal: AbortSignal.timeout(10000),
        })

        const data = await response.json()

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || 'Action failed' },
                { status: response.status }
            )
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('[Queue Action] Failed:', error.message)
        return NextResponse.json(
            { error: error.message || 'Worker API not reachable' },
            { status: 500 }
        )
    }
}
