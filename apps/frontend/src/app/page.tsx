'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to superadmin login for now
        // Later: check if user is logged in, redirect to appropriate dashboard
        router.push('/superadmin/login');
    }, [router]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <Shield className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
                <h1 className="text-2xl font-bold text-textPrimary mb-2">
                    Axiom Engine
                </h1>
                <p className="text-textSecondary mb-4">
                    Redirecting to login...
                </p>
                <Loader2 className="w-6 h-6 text-primary mx-auto animate-spin" />
            </div>
        </div>
    );
}
