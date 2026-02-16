/**
 * IMT Client Registration API
 * Ticket #69 - Receives client records from InMarket Traffic
 *
 * POST /api/imt/clients
 * Creates/updates organization and links via client_id
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ClientSchema = z.object({
    id: z.string().uuid('id must be a valid UUID'),
    company_name: z.string().optional(),
    company_domain: z.string().optional(),
    address_1: z.string().optional(),
    address_2: z.string().optional(),
    city: z.string().optional(),
    state_code: z.string().optional(),
    country_code: z.string().optional(),
    zip_code: z.string().optional(),
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

        const parsed = ClientSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { id: clientId } = parsed.data;

        // Check if org already exists with this client_id
        const { data: existingOrg, error: fetchError } = await supabase
            .from('organizations')
            .select('id')
            .eq('client_id', clientId)
            .maybeSingle();

        if (fetchError) {
            console.error('IMT clients: fetch error', fetchError);
            return NextResponse.json(
                { error: 'Database error' },
                { status: 500 }
            );
        }

        const name = parsed.data.company_name?.trim() || `IMT Client ${clientId.slice(0, 8)}`;
        const slug = `imt-${clientId}`.toLowerCase();

        if (existingOrg) {
            // Already registered - idempotent success
            return NextResponse.json(
                { success: true, message: 'Client already registered', org_id: existingOrg.id },
                { status: 201 }
            );
        }

        // Create new organization with client_id
        const { data: org, error: insertError } = await supabase
            .from('organizations')
            .insert({
                name,
                slug,
                client_id: clientId,
                plan: 'free',
                status: 'active',
            })
            .select('id')
            .single();

        if (insertError) {
            if (insertError.code === '23505') {
                return NextResponse.json(
                    { error: 'Organization with this client_id or slug already exists' },
                    { status: 400 }
                );
            }
            console.error('IMT clients: insert error', insertError);
            return NextResponse.json(
                { error: 'Database error' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { success: true, message: 'Client registered', org_id: org.id },
            { status: 201 }
        );
    } catch (err) {
        console.error('IMT clients: unexpected error', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
