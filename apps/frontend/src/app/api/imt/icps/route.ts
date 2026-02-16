/**
 * IMT ICP Registration API
 * Ticket #70 - Receives Ideal Customer Profile records from InMarket Traffic
 *
 * POST /api/imt/icps
 * Persists ICP for Brain content generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ICPSchema = z.object({
    id: z.string().uuid('id must be a valid UUID'),
    client_id: z.string().uuid('client_id must be a valid UUID'),
    job_id: z.string().uuid().optional(),
    campaign_name: z.string().optional(),
    segment_name: z.string().optional(),
    revenue_band_min: z.number().optional().default(0),
    revenue_band_max: z.number().optional().default(1000),
    primary_industries: z.array(z.string()).optional().default([]),
    seniority_levels: z.array(z.string()).optional().default([]),
});

export async function POST(request: NextRequest) {
    try {
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON body' },
                { status: 400 }
            );
        }

        const parsed = ICPSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const data = parsed.data;

        // Resolve client_id to org_id (client must be registered via #69)
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('client_id', data.client_id)
            .maybeSingle();

        if (orgError) {
            console.error('IMT icps: org lookup error', orgError);
            return NextResponse.json(
                { error: 'Database error' },
                { status: 500 }
            );
        }

        if (!org) {
            return NextResponse.json(
                { error: 'Client not found. Register client via POST /api/imt/clients first.' },
                { status: 400 }
            );
        }

        // Check if ICP already exists (idempotent)
        const { data: existing } = await supabase
            .from('imt_icps')
            .select('id')
            .eq('imt_icp_id', data.id)
            .maybeSingle();

        if (existing) {
            return NextResponse.json(
                { success: true, message: 'ICP already registered', icp_id: existing.id },
                { status: 201 }
            );
        }

        const { data: icp, error: insertError } = await supabase
            .from('imt_icps')
            .insert({
                imt_icp_id: data.id,
                org_id: org.id,
                client_id: data.client_id,
                job_id: data.job_id || null,
                campaign_name: data.campaign_name || null,
                segment_name: data.segment_name || null,
                revenue_band_min: data.revenue_band_min ?? 0,
                revenue_band_max: data.revenue_band_max ?? 1000,
                primary_industries: data.primary_industries ?? [],
                seniority_levels: data.seniority_levels ?? [],
            })
            .select('id')
            .single();

        if (insertError) {
            if (insertError.code === '23505') {
                return NextResponse.json(
                    { success: true, message: 'ICP already registered' },
                    { status: 201 }
                );
            }
            console.error('IMT icps: insert error', insertError);
            return NextResponse.json(
                { error: 'Database error' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { success: true, message: 'ICP registered', icp_id: icp.id },
            { status: 201 }
        );
    } catch (err) {
        console.error('IMT icps: unexpected error', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
