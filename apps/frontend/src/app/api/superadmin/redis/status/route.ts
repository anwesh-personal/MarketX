/**
 * Worker API Proxy
 * 
 * Proxies requests to the Worker Management API.
 * This keeps the worker URL secret and provides a consistent API for the frontend.
 */

import { NextRequest, NextResponse } from 'next/server'

// Worker API URL - set in environment
const WORKER_API_URL = process.env.WORKER_API_URL || 'http://localhost:3100'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        // Fetch Redis info and queue stats in parallel
        const [redisResponse, statsResponse] = await Promise.all([
            fetch(`${WORKER_API_URL}/api/redis`, {
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000),
            }),
            fetch(`${WORKER_API_URL}/api/stats`, {
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000),
            }),
        ])

        if (!redisResponse.ok || !statsResponse.ok) {
            throw new Error('Worker API not responding')
        }

        const redisData = await redisResponse.json()
        const statsData = await statsResponse.json()

        return NextResponse.json({
            connected: redisData.connected,
            redis: redisData.stats,
            queues: statsData.queues,
        })
    } catch (error: any) {
        console.error('[Redis Status] Failed to fetch from worker:', error.message)

        // Check if it's a timeout or connection error
        if (error.name === 'TimeoutError' || error.message.includes('fetch')) {
            return NextResponse.json({
                connected: false,
                error: 'Worker API not reachable',
                queues: [],
            })
        }

        return NextResponse.json({
            connected: false,
            error: error.message,
            queues: [],
        })
    }
}
