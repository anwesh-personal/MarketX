import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperadmin } from '@/lib/superadmin-middleware';
import { getTransactionalEmailService } from '@/services/email/TransactionalEmailService';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Generate password reset link + send via configured provider
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

        // Generate password reset link via Supabase Auth
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
                { error: `Failed to generate reset link: ${error.message}` },
                { status: 500 }
            );
        }

        const resetLink = data.properties.action_link;

        // Send via configured system email provider (if available)
        const txEmail = getTransactionalEmailService();
        const sendResult = await txEmail.send('password_reset', email, {
            email,
            reset_link: resetLink,
            expiry_hours: '24',
        }, { sentBy: admin.id });

        // Always return the link as fallback (for manual sharing)
        return NextResponse.json({
            message: sendResult.success
                ? 'Password reset email sent successfully'
                : 'Reset link generated (email delivery may have failed)',
            reset_link: resetLink,
            email_sent: sendResult.success,
            email_error: sendResult.error || null,
        });
    } catch (error) {
        console.error('Password reset POST error:', error);
        return NextResponse.json(
            { error: 'Failed to send password reset email' },
            { status: 500 }
        );
    }
}
