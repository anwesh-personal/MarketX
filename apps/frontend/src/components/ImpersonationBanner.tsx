'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, ArrowLeft } from 'lucide-react';

/**
 * ImpersonationBanner
 * 
 * Shows a persistent banner at the top of the main app layout when the superadmin
 * is impersonating a user. Displays the impersonated user's info and provides
 * a "Return to Superadmin" action.
 *
 * SessionStorage keys (per-tab, set by impersonate-landing):
 *   impersonation_superadmin_session — original superadmin localStorage session
 *   impersonation_target — { email, full_name, role, id }
 *   impersonation_org — { id, name, slug, plan }
 */

interface ImpersonationTarget {
    id: string;
    email: string;
    full_name: string;
    role: string;
}

export function ImpersonationBanner() {
    const [target, setTarget] = useState<ImpersonationTarget | null>(null);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const stored = sessionStorage.getItem('impersonation_target');
        if (stored) {
            try {
                setTarget(JSON.parse(stored));
            } catch {
                // Invalid data, clear it
                sessionStorage.removeItem('impersonation_target');
            }
        }
    }, []);

    if (!target) return null;

    const handleReturn = async () => {
        setIsExiting(true);

        // Clear impersonation state
        sessionStorage.removeItem('impersonation_superadmin_session');
        sessionStorage.removeItem('impersonation_target');
        sessionStorage.removeItem('impersonation_org');

        // Sign out the impersonated session
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        await supabase.auth.signOut();

        // Close this tab — user returns to superadmin panel in the original tab
        setTimeout(() => {
            window.close();
            // Fallback: if window.close doesn't work (some browsers block it)
            window.location.href = '/superadmin/users';
        }, 300);
    };

    const initials = (target.full_name || target.email)
        .split(' ')
        .map(w => w.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');

    return (
        <div
            className={`
                w-full px-4 py-2 flex items-center justify-between gap-4
                bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-amber-500/90
                text-white text-sm font-medium
                shadow-lg shadow-amber-500/20
                backdrop-blur-sm
                transition-all duration-300
                ${isExiting ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'}
            `}
            style={{ zIndex: 9999 }}
        >
            {/* Left: Shield icon + info */}
            <div className="flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 animate-pulse" />

                <span className="hidden sm:inline text-white/80">Impersonating:</span>

                {/* User avatar */}
                <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[10px] font-bold">
                    {initials}
                </div>

                {/* User info */}
                <div className="flex items-center gap-2">
                    <span className="font-semibold">{target.full_name || 'Unnamed User'}</span>
                    <span className="text-white/60 hidden md:inline">({target.email})</span>
                    <span className="px-1.5 py-0.5 bg-white/15 rounded text-[10px] uppercase tracking-wider font-bold">
                        {target.role}
                    </span>
                </div>
            </div>

            {/* Right: Return button */}
            <button
                onClick={handleReturn}
                disabled={isExiting}
                className="
                    flex items-center gap-1.5 px-3 py-1
                    bg-white/15 hover:bg-white/25
                    border border-white/20
                    rounded-md
                    text-xs font-semibold
                    transition-all
                    hover:scale-105 active:scale-95
                    disabled:opacity-50
                "
            >
                <ArrowLeft className="w-3 h-3" />
                <span className="hidden sm:inline">Return to Superadmin</span>
                <span className="sm:hidden">Exit</span>
            </button>
        </div>
    );
}
