import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { requireSuperadmin } from '@/lib/superadmin-middleware';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        await requireSuperadmin(request);
        const body = await request.json();
        const { email, full_name, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const { data: existing } = await supabase
            .from('platform_admins')
            .select('email')
            .eq('email', email)
            .single();

        if (existing) {
            return NextResponse.json(
                { error: 'Superadmin with this email already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert new superadmin
        const { data, error } = await supabase
            .from('platform_admins')
            .insert({
                email,
                full_name: full_name || null,
                password_hash,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating superadmin:', error);
            return NextResponse.json(
                { error: 'Failed to create superadmin' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            admin: {
                id: data.id,
                email: data.email,
                full_name: data.full_name,
                is_active: data.is_active,
                created_at: data.created_at
            }
        });

    } catch (error: any) {
        console.error('Error in create superadmin:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        await requireSuperadmin(request);
        const { data, error } = await supabase
            .from('platform_admins')
            .select('id, email, full_name, is_active, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching superadmins:', error);
            return NextResponse.json(
                { error: 'Failed to fetch superadmins' },
                { status: 500 }
            );
        }

        return NextResponse.json({ admins: data || [] });

    } catch (error: any) {
        console.error('Error in get superadmins:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
