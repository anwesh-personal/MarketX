import { NextRequest, NextResponse } from 'next/server';
import { getSuperadmin } from '@/lib/superadmin-middleware';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to hash key
function hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
}

// Generate new key
function generateKey(): string {
    return 'ek_' + crypto.randomBytes(24).toString('hex');
}

// GET: List keys
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await getSuperadmin(req);

        const { data, error } = await supabase
            .from('engine_access_keys')
            .select('id, engine_id, key_prefix, label, created_at, expires_at, last_used_at, is_active')
            .eq('engine_id', params.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ keys: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create key
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await getSuperadmin(req);
        const body = await req.json();
        const label = body.label || 'Default Key';

        const rawKey = generateKey();
        const hashed = hashKey(rawKey);
        const prefix = rawKey.slice(0, 7); // ek_ + 4 chars

        const { data, error } = await supabase
            .from('engine_access_keys')
            .insert({
                engine_id: params.id,
                key_hash: hashed,
                key_prefix: prefix,
                label,
                created_by: body.userId // Optional: track who created it
            })
            .select()
            .single();

        if (error) throw error;

        // Return FULL key only once
        return NextResponse.json({
            key: {
                ...data,
                full_key: rawKey // IMPORTANT: Only time this is shown
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Revoke key
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await getSuperadmin(req);
        const url = new URL(req.url);
        const keyId = url.searchParams.get('key_id');

        if (!keyId) throw new Error('Key ID required');

        const { error } = await supabase
            .from('engine_access_keys')
            .delete()
            .eq('id', keyId)
            .eq('engine_id', params.id); // Security check

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
