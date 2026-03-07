/**
 * IMT Email Reply Request API
 * Phase 4 - Option B: Webhook/Callback
 *
 * POST /api/imt/email/reply-request
 *
 * Payload: client_id, icp_id, email_body, universal_person?, callback_url?
 *
 * Option B: If callback_url provided, MW POSTs reply to it when ready.
 * Returns job_id for tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const getRedisConfig = () => {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
        const url = new URL(redisUrl);
        return {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
        };
    }
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
    };
};

const ReplyRequestSchema = z.object({
    client_id: z.string().uuid(),
    icp_id: z.string().uuid(),
    email_body: z.string().min(1).max(50000),
    email_subject: z.string().max(500).optional(),
    sender: z.string().max(500).optional(),
    universal_person: z.record(z.unknown()).optional(),
    callback_url: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
    try {
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const parsed = ReplyRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { client_id, icp_id, email_body, email_subject, sender, universal_person, callback_url } = parsed.data;

        // Resolve client_id -> org
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('client_id', client_id)
            .maybeSingle();

        if (orgError) {
            console.error('IMT reply-request: org lookup error', orgError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!org) {
            return NextResponse.json(
                { error: 'Client not found. Register via POST /api/imt/clients first.' },
                { status: 404 }
            );
        }

        // Verify ICP exists for this client
        const { data: icp, error: icpError } = await supabase
            .from('imt_icps')
            .select('id')
            .eq('imt_icp_id', icp_id)
            .eq('client_id', client_id)
            .maybeSingle();

        if (icpError) {
            console.error('IMT reply-request: ICP lookup error', icpError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!icp) {
            return NextResponse.json(
                { error: 'ICP not found for this client' },
                { status: 404 }
            );
        }

        const job_id = randomUUID();

        // Queue job
        const queue = new Queue('imt-email-reply', {
            connection: getRedisConfig(),
        });

        await queue.add(
            'imt-email-reply',
            {
                job_id,
                client_id,
                icp_id,
                org_id: org.id,
                email_body,
                email_subject,
                sender,
                universal_person,
                callback_url,
            },
            { jobId: job_id }
        );

        await queue.close();

        return NextResponse.json({
            success: true,
            job_id,
            status: 'queued',
            message: callback_url
                ? 'Reply will be POSTed to callback_url when ready.'
                : 'Job queued. Poll GET /api/imt/email/reply-status/:job_id for result.',
        });
    } catch (err) {
        console.error('IMT reply-request: unexpected error', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
