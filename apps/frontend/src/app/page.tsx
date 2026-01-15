'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to user login
        router.push('/login');
    }, [router]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
                <p className="text-textSecondary mt-md">Redirecting...</p>
            </div>
        </div>
    );
}
