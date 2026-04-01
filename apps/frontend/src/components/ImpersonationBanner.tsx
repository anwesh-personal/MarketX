'use client';

import React, { useState, useEffect } from 'react';
import { Eye, ArrowLeft } from 'lucide-react';

/**
 * ImpersonationBanner
 * 
 * Premium, TRULY theme-aware banner. Uses only CSS custom properties
 * from globals.css (--color-error, --color-error-rgb, --color-text-primary, etc.)
 * so it adapts to every theme (obsidian, aurora, ember, arctic, velvet × day/night).
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
                sessionStorage.removeItem('impersonation_target');
            }
        }
    }, []);

    if (!target) return null;

    const handleReturn = async () => {
        setIsExiting(true);

        sessionStorage.removeItem('impersonation_superadmin_session');
        sessionStorage.removeItem('impersonation_target');
        sessionStorage.removeItem('impersonation_org');

        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        await supabase.auth.signOut();

        setTimeout(() => {
            window.close();
            window.location.href = '/superadmin/users';
        }, 300);
    };

    const initials = (target.full_name || target.email)
        .split(' ')
        .map(w => w.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');

    return (
        <>
            <div
                className={`
                    impersonation-banner
                    ${isExiting ? 'impersonation-banner--exiting' : ''}
                `}
            >
                {/* Animated shimmer */}
                <div className="impersonation-banner__shimmer" />

                {/* Left section */}
                <div className="impersonation-banner__left">
                    {/* Pulsing eye icon */}
                    <div className="impersonation-banner__icon">
                        <Eye className="w-5 h-5" />
                        <div className="impersonation-banner__icon-ping" />
                    </div>

                    <div className="impersonation-banner__divider" />

                    {/* IMPERSONATING label */}
                    <span className="impersonation-banner__label">
                        IMPERSONATING
                    </span>

                    <div className="impersonation-banner__divider" />

                    {/* Avatar */}
                    <div className="impersonation-banner__avatar">
                        {initials}
                    </div>

                    {/* User info */}
                    <div className="impersonation-banner__userinfo">
                        <span className="impersonation-banner__name">
                            {target.full_name || 'Unnamed User'}
                        </span>
                        <span className="impersonation-banner__email">
                            {target.email}
                        </span>
                    </div>

                    {/* Role badge */}
                    <span className="impersonation-banner__role">
                        {target.role.toUpperCase()}
                    </span>
                </div>

                {/* Right section */}
                <button
                    onClick={handleReturn}
                    disabled={isExiting}
                    className="impersonation-banner__btn"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Return to Superadmin</span>
                    <span className="sm:hidden">Exit</span>
                </button>
            </div>

            <style jsx>{`
                .impersonation-banner {
                    position: relative;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    padding: 10px 20px;
                    background: linear-gradient(
                        135deg,
                        rgba(var(--color-error-rgb), 0.12) 0%,
                        rgba(var(--color-warning-rgb), 0.08) 50%,
                        rgba(var(--color-error-rgb), 0.12) 100%
                    );
                    border-bottom: 1px solid rgba(var(--color-error-rgb), 0.25);
                    backdrop-filter: blur(12px);
                    z-index: 9999;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }

                .impersonation-banner--exiting {
                    opacity: 0;
                    transform: translateY(-100%);
                }

                .impersonation-banner__shimmer {
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 200%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        rgba(var(--color-error-rgb), 0.06) 25%,
                        rgba(var(--color-warning-rgb), 0.08) 50%,
                        rgba(var(--color-error-rgb), 0.06) 75%,
                        transparent 100%
                    );
                    animation: shimmer 4s ease-in-out infinite;
                }

                @keyframes shimmer {
                    0% { transform: translateX(-50%); }
                    100% { transform: translateX(50%); }
                }

                .impersonation-banner__left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    position: relative;
                    z-index: 1;
                }

                .impersonation-banner__icon {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: rgba(var(--color-error-rgb), 0.2);
                    border: 1px solid rgba(var(--color-error-rgb), 0.35);
                    color: var(--color-error);
                    flex-shrink: 0;
                }

                .impersonation-banner__icon-ping {
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--color-error);
                    animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                }

                @keyframes ping {
                    75%, 100% {
                        transform: scale(2);
                        opacity: 0;
                    }
                }

                .impersonation-banner__divider {
                    width: 1px;
                    height: 20px;
                    background: var(--color-border);
                    opacity: 0.5;
                }

                .impersonation-banner__label {
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.15em;
                    color: var(--color-error);
                    text-shadow: 0 0 20px rgba(var(--color-error-rgb), 0.4);
                }

                .impersonation-banner__avatar {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background: var(--gradient-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--color-on-accent);
                    border: 2px solid rgba(var(--color-accent-rgb), 0.3);
                    flex-shrink: 0;
                    box-shadow: 0 0 12px rgba(var(--color-accent-rgb), 0.3);
                }

                .impersonation-banner__userinfo {
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                }

                .impersonation-banner__name {
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--color-text-primary);
                    line-height: 1.2;
                }

                .impersonation-banner__email {
                    font-size: 11px;
                    color: var(--color-text-secondary);
                    line-height: 1.2;
                }

                .impersonation-banner__role {
                    padding: 3px 8px;
                    border-radius: var(--radius-sm, 4px);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    background: rgba(var(--color-error-rgb), 0.15);
                    color: var(--color-error);
                    border: 1px solid rgba(var(--color-error-rgb), 0.25);
                }

                .impersonation-banner__btn {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 14px;
                    border-radius: var(--radius-md, 8px);
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--color-text-primary);
                    background: linear-gradient(
                        135deg,
                        rgba(var(--color-error-rgb), 0.15),
                        rgba(var(--color-warning-rgb), 0.12)
                    );
                    border: 1px solid rgba(var(--color-error-rgb), 0.3);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .impersonation-banner__btn:hover {
                    background: linear-gradient(
                        135deg,
                        rgba(var(--color-error-rgb), 0.3),
                        rgba(var(--color-warning-rgb), 0.25)
                    );
                    border-color: rgba(var(--color-error-rgb), 0.5);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(var(--color-error-rgb), 0.2);
                }

                .impersonation-banner__btn:active {
                    transform: translateY(0);
                }

                .impersonation-banner__btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                @media (max-width: 768px) {
                    .impersonation-banner__email,
                    .impersonation-banner__divider,
                    .impersonation-banner__label {
                        display: none;
                    }
                    .impersonation-banner {
                        padding: 8px 12px;
                    }
                }
            `}</style>
        </>
    );
}
