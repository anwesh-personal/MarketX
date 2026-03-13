import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Refusing to start with insecure defaults.');
}
const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        // Get admin from Supabase
        const { data: admins, error } = await supabase
            .from('platform_admins')
            .select('*')
            .eq('email', email)
            .eq('is_active', true);

        if (error || !admins || admins.length === 0) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        const admin = admins[0];

        // Verify password
        if (!admin.password_hash) {
            return NextResponse.json(
                { error: 'Password not set for this admin' },
                { status: 401 }
            );
        }

        const isValid = await bcrypt.compare(password, admin.password_hash);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Generate JWT
        const token = jwt.sign(
            {
                adminId: admin.id,
                email: admin.email,
                type: 'superadmin',
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return NextResponse.json({
            success: true,
            admin_id: admin.id,
            email: admin.email,
            full_name: admin.full_name,
            token,
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Login failed' },
            { status: 500 }
        );
    }
}
