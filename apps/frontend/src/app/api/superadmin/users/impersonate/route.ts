import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export async function POST(request: NextRequest) {
    try {
        const { user_id } = await request.json();

        // Get admin ID from auth header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        let adminId: string;

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string };
            adminId = decoded.adminId;
        } catch {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Get target user
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*, organization:organizations(*)')
            .eq('id', user_id)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Create impersonation log
        const { data: log, error: logError } = await supabase
            .from('impersonation_logs')
            .insert({
                admin_id: adminId,
                target_user_id: user_id,
                target_org_id: user.org_id,
                started_at: new Date().toISOString(),
                ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
                user_agent: request.headers.get('user-agent'),
            })
            .select()
            .single();

        if (logError) throw logError;

        return NextResponse.json({
            success: true,
            impersonation_id: log.id,
            user: {
                id: user.id,
                email: user.email,
                org_id: user.org_id,
                org_name: user.organization.name,
            },
        });
    } catch (error) {
        console.error('Impersonation error:', error);
        return NextResponse.json({ error: 'Impersonation failed' }, { status: 500 });
    }
}
