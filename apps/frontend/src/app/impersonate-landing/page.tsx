'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Impersonate Landing Page
 * 
 * When a superadmin clicks "Login as User", the tokens are stored in localStorage
 * and this page is opened in a new tab. This page:
 *   1. Reads the tokens
 *   2. Shows a sleek portal animation
 *   3. Calls supabase.auth.setSession() (in THIS tab's context)
 *   4. Stores impersonation info in sessionStorage (per-tab)
 *   5. Clears the tokens from localStorage (security)
 *   6. Redirects to /dashboard
 */
export default function ImpersonateLandingPage() {
    const router = useRouter();
    const [phase, setPhase] = useState<'entering' | 'connecting' | 'success' | 'error'>('entering');
    const [targetUser, setTargetUser] = useState<{ email: string; full_name: string } | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        handleImpersonation();
    }, []);

    const handleImpersonation = async () => {
        try {
            // 1. Read tokens from localStorage
            const raw = localStorage.getItem('impersonate_payload');
            if (!raw) {
                setPhase('error');
                setErrorMsg('No impersonation data found. Please try again from the Superadmin panel.');
                return;
            }

            const payload = JSON.parse(raw);
            const { access_token, refresh_token, user, organization, superadmin_session } = payload;

            if (!access_token || !refresh_token) {
                setPhase('error');
                setErrorMsg('Invalid impersonation tokens.');
                return;
            }

            setTargetUser(user);

            // 2. Phase: connecting
            await sleep(800);
            setPhase('connecting');

            // 3. Set the Supabase session in THIS tab
            const supabase = createClient();
            const { error } = await supabase.auth.setSession({
                access_token,
                refresh_token,
            });

            if (error) {
                setPhase('error');
                setErrorMsg(`Session swap failed: ${error.message}`);
                return;
            }

            // 4. Store impersonation metadata in sessionStorage (scoped to this tab)
            sessionStorage.setItem('impersonation_superadmin_session', superadmin_session);
            sessionStorage.setItem('impersonation_target', JSON.stringify(user));
            sessionStorage.setItem('impersonation_org', JSON.stringify(organization));

            // 5. Clear the tokens from localStorage (one-time use)
            localStorage.removeItem('impersonate_payload');

            // 6. Success phase → redirect
            await sleep(600);
            setPhase('success');
            await sleep(800);

            router.replace('/dashboard');
        } catch (err: any) {
            setPhase('error');
            setErrorMsg(err.message || 'Unexpected error during impersonation');
            localStorage.removeItem('impersonate_payload');
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center overflow-hidden">
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
                {Array.from({ length: 30 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            width: `${Math.random() * 4 + 1}px`,
                            height: `${Math.random() * 4 + 1}px`,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            background: `hsl(${220 + Math.random() * 40}, 80%, ${50 + Math.random() * 30}%)`,
                            animation: `float-particle ${3 + Math.random() * 4}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 3}s`,
                            opacity: 0.4 + Math.random() * 0.4,
                        }}
                    />
                ))}
            </div>

            {/* Radial glow */}
            <div
                className="absolute w-[600px] h-[600px] rounded-full transition-all duration-1000"
                style={{
                    background: phase === 'success'
                        ? 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)'
                        : phase === 'error'
                        ? 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
                }}
            />

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center text-center px-8">
                {/* Portal ring animation */}
                <div className="relative w-32 h-32 mb-8">
                    {/* Outer ring */}
                    <div
                        className="absolute inset-0 rounded-full border-2 transition-colors duration-500"
                        style={{
                            borderColor: phase === 'success' ? '#22c55e' : phase === 'error' ? '#ef4444' : '#6366f1',
                            animation: phase !== 'error' ? 'spin 3s linear infinite' : 'none',
                            boxShadow: phase === 'success'
                                ? '0 0 30px rgba(34,197,94,0.3), inset 0 0 30px rgba(34,197,94,0.1)'
                                : phase === 'error'
                                ? '0 0 30px rgba(239,68,68,0.3)'
                                : '0 0 30px rgba(99,102,241,0.3), inset 0 0 30px rgba(99,102,241,0.1)',
                        }}
                    />
                    {/* Inner ring */}
                    <div
                        className="absolute inset-3 rounded-full border transition-colors duration-500"
                        style={{
                            borderColor: phase === 'success' ? 'rgba(34,197,94,0.5)' : phase === 'error' ? 'rgba(239,68,68,0.5)' : 'rgba(99,102,241,0.5)',
                            animation: phase !== 'error' ? 'spin 2s linear infinite reverse' : 'none',
                        }}
                    />
                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {phase === 'success' ? (
                            <svg className="w-12 h-12 text-green-400 animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        ) : phase === 'error' ? (
                            <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center">
                                <span className="text-indigo-300 text-lg font-bold">
                                    {targetUser?.full_name?.charAt(0)?.toUpperCase() || targetUser?.email?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status text */}
                <h1 className="text-2xl font-bold text-white mb-2 transition-all duration-300">
                    {phase === 'entering' && 'Initiating Session...'}
                    {phase === 'connecting' && 'Swapping Identity...'}
                    {phase === 'success' && 'Identity Locked'}
                    {phase === 'error' && 'Session Failed'}
                </h1>

                <p className="text-gray-400 text-sm max-w-sm mb-6">
                    {phase === 'entering' && 'Generating secure impersonation session'}
                    {phase === 'connecting' && (
                        <>Logging in as <span className="text-indigo-300 font-medium">{targetUser?.full_name || targetUser?.email}</span></>
                    )}
                    {phase === 'success' && (
                        <>Redirecting to <span className="text-green-300 font-medium">{targetUser?.full_name || targetUser?.email}</span>&apos;s dashboard</>
                    )}
                    {phase === 'error' && (
                        <span className="text-red-300">{errorMsg}</span>
                    )}
                </p>

                {/* Progress dots */}
                {phase !== 'error' && phase !== 'success' && (
                    <div className="flex gap-2">
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                className="w-2 h-2 rounded-full bg-indigo-400"
                                style={{
                                    animation: 'pulse-dot 1.2s ease-in-out infinite',
                                    animationDelay: `${i * 0.2}s`,
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Error retry */}
                {phase === 'error' && (
                    <button
                        onClick={() => window.close()}
                        className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all border border-white/10"
                    >
                        Close & Try Again
                    </button>
                )}
            </div>

            {/* CSS animations */}
            <style jsx>{`
                @keyframes float-particle {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
                    50% { transform: translateY(-20px) scale(1.5); opacity: 0.8; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse-dot {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
                @keyframes scale-in {
                    from { transform: scale(0); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scale-in {
                    animation: scale-in 0.4s ease-out forwards;
                }
            `}</style>
        </div>
    );
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
