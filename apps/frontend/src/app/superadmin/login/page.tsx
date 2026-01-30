'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';
import { saveSession, isAuthenticated } from '@/lib/superadmin-auth';

export default function SuperadminLogin() {
    const router = useRouter();
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated()) {
            router.push('/superadmin/dashboard');
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/superadmin/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Invalid credentials');
            }

            // Store session using proper auth utility
            saveSession({
                adminId: data.admin_id,
                email: data.email,
                token: data.token,
            });

            // Redirect to dashboard
            router.push('/superadmin/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-md">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-lg">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-[var(--radius-xl)] mb-md">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-sm">
                        Superadmin Portal
                    </h1>
                    <p className="text-textSecondary">
                        Platform management & control center
                    </p>
                </div>

                {/* Login Form */}
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg shadow-[var(--shadow-lg)]">
                    <form onSubmit={handleLogin} className="space-y-md">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-textPrimary mb-xs">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={credentials.email}
                                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                className="
                  w-full
                  bg-background
                  text-textPrimary
                  border border-border
                  rounded-[var(--radius-md)]
                  px-sm py-xs
                  transition-all duration-[var(--duration-normal)]
                  focus:outline-none
                  focus:ring-2
                  focus:ring-borderFocus
                  focus:border-borderFocus
                "
                                placeholder="admin@example.com"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-textPrimary mb-xs">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                className="
                  w-full
                  bg-background
                  text-textPrimary
                  border border-border
                  rounded-[var(--radius-md)]
                  px-sm py-xs
                  transition-all duration-[var(--duration-normal)]
                  focus:outline-none
                  focus:ring-2
                  focus:ring-borderFocus
                  focus:border-borderFocus
                "
                                placeholder="••••••••"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-error/10 border border-error text-error rounded-[var(--radius-md)] p-sm text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="
                w-full
                bg-primary text-white
                font-medium
                px-md py-sm
                rounded-[var(--radius-md)]
                transition-all duration-[var(--duration-normal)]
                hover:opacity-90
                hover:shadow-[var(--shadow-md)]
                active:scale-[0.98]
                disabled:opacity-50
                disabled:cursor-not-allowed
                flex items-center justify-center gap-xs
              "
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <span>Sign In</span>
                            )}
                        </button>
                    </form>

                    {/* Security Notice */}
                    <div className="mt-lg pt-md border-t border-border">
                        <p className="text-xs text-textTertiary text-center">
                            🔒 Superadmin access is restricted and fully audited.
                            <br />
                            All actions are logged for security compliance.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-textTertiary text-sm mt-md">
                    Market Writer Platform v1.0.0
                </p>
            </div>
        </div>
    );
}
