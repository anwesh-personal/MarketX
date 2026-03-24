import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperadmin } from '@/lib/superadmin-middleware';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Send password reset email
export async function POST(request: NextRequest) {
    try {
    const admin = await getSuperadmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid superadmin token required' },
        { status: 401 }
      );
    }

        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        // Generate password reset link
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
            },
        });

        if (error) {
            console.error('Password reset error:', error);
            return NextResponse.json(
                { error: `Failed to send reset email: ${error.message}` },
                { status: 500 }
            );
        }

        console.log('✅ Password reset email sent to:', email);
        console.log('📧 Reset link (if email fails):', data.properties.action_link);

        return NextResponse.json({
            message: 'Password reset email sent successfully',
            // Include link for manual sharing if needed
            reset_link: data.properties.action_link,
        });
    } catch (error) {
        console.error('Password reset POST error:', error);
        return NextResponse.json(
            { error: 'Failed to send password reset email' },
            { status: 500 }
        );
    }
}
