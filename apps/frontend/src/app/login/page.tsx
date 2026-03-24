'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { MailWriterLogo } from '@/components/MailWriterLogo';

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-info/5 animate-gradient" />

            {/* Floating Orbs */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float-delayed" />

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md px-lg">
                <div className="card glass backdrop-blur-xl bg-surface/80 border-border/50 shadow-xl">
                    {/* Header */}
                    <div className="text-center mb-xl">
                        <div className="flex justify-center mb-md">
                            <MailWriterLogo size="lg" showText={false} />
                        </div>
                        <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                            Welcome Back
                        </h1>
                        <p className="text-textSecondary">
                            Sign in to continue to Market Writer
                        </p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-md p-md bg-error/10 border border-error/20 rounded-[var(--radius-md)] text-error text-sm">
                            {error}
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-md">
                        {/* Email Input */}
                        <div className="space-y-xs">
                            <label className="block text-sm font-medium text-textSecondary">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-textTertiary">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="
                                        w-full pl-12 pr-md py-sm
                                        bg-background text-textPrimary
                                        border border-border rounded-[var(--radius-md)]
                                        focus:outline-none focus:ring-2 focus:ring-borderFocus
                                        transition-all duration-[var(--duration-normal)]
                                        hover:border-borderHover
                                    "
                                    placeholder="you@example.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-xs">
                            <label className="block text-sm font-medium text-textSecondary">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-textTertiary">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="
                                        w-full pl-12 pr-md py-sm
                                        bg-background text-textPrimary
                                        border border-border rounded-[var(--radius-md)]
                                        focus:outline-none focus:ring-2 focus:ring-borderFocus
                                        transition-all duration-[var(--duration-normal)]
                                        hover:border-borderHover
                                    "
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="
                                w-full
                                flex items-center justify-center gap-sm
                                bg-gradient-to-r from-primary to-accent
                                text-onAccent font-semibold
                                px-lg py-sm
                                rounded-[var(--radius-md)]
                                hover:scale-[var(--hover-scale)]
                                active:scale-[var(--active-scale)]
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all duration-[var(--duration-normal)]
                                shadow-lg hover:shadow-glow-lg
                            "
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-lg pt-lg border-t border-border text-center">
                        <p className="text-sm text-textTertiary">
                            Don't have an account?{' '}
                            <a href="#" className="text-primary hover:text-accent transition-colors font-medium">
                                Contact Admin
                            </a>
                        </p>
                    </div>
                </div>

                {/* Signature */}
                <div className="mt-md text-center text-xs text-textTertiary">
                    <p className="font-mono">Built by <span className="text-primary">Anwesh Rath</span></p>
                    <p className="italic opacity-75">Chaos ☕ Coffee ⌨️ Coding</p>
                </div>
            </div>

            <style jsx>{`
                @keyframes gradient {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(10deg); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(20px) rotate(-10deg); }
                }
                .animate-gradient {
                    animation: gradient 8s ease-in-out infinite;
                }
                .animate-float {
                    animation: float 8s ease-in-out infinite;
                }
                .animate-float-delayed {
                    animation: float-delayed 10s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
