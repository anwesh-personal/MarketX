'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeft, Eye } from 'lucide-react';

/**
 * ImpersonationBanner
 * 
 * Premium, theme-aware banner that shows when superadmin is impersonating a user.
 * Uses CSS custom properties from the active theme for harmony,
 * but uses high-contrast styling so it ALWAYS stands out.
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
    const [isHovered, setIsHovered] = useState(false);

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
        <div
            className={`
                impersonation-banner
                ${isExiting ? 'impersonation-banner--exiting' : ''}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
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
                        rgba(239, 68, 68, 0.12) 0%,
                        rgba(249, 115, 22, 0.10) 50%,
                        rgba(239, 68, 68, 0.12) 100%
                    );
                    border-bottom: 1px solid rgba(239, 68, 68, 0.25);
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
                        rgba(239, 68, 68, 0.06) 25%,
                        rgba(249, 115, 22, 0.08) 50%,
                        rgba(239, 68, 68, 0.06) 75%,
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
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid rgba(239, 68, 68, 0.35);
                    color: #f87171;
                    flex-shrink: 0;
                }

                .impersonation-banner__icon-ping {
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #ef4444;
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
                    background: var(--color-border, rgba(255,255,255,0.1));
                    opacity: 0.5;
                }

                .impersonation-banner__label {
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.15em;
                    color: #f87171;
                    text-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
                }

                .impersonation-banner__avatar {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--color-accent, #6366f1), var(--color-primary, #818cf8));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 700;
                    color: white;
                    border: 2px solid rgba(255, 255, 255, 0.15);
                    flex-shrink: 0;
                    box-shadow: 0 0 12px rgba(99, 102, 241, 0.3);
                }

                .impersonation-banner__userinfo {
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                }

                .impersonation-banner__name {
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--color-text-primary, #fff);
                    line-height: 1.2;
                }

                .impersonation-banner__email {
                    font-size: 11px;
                    color: var(--color-text-secondary, rgba(255,255,255,0.6));
                    line-height: 1.2;
                }

                .impersonation-banner__role {
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    background: rgba(239, 68, 68, 0.15);
                    color: #f87171;
                    border: 1px solid rgba(239, 68, 68, 0.25);
                }

                .impersonation-banner__btn {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 14px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 700;
                    color: white;
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(249, 115, 22, 0.2));
                    border: 1px solid rgba(239, 68, 68, 0.35);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .impersonation-banner__btn:hover {
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.4), rgba(249, 115, 22, 0.35));
                    border-color: rgba(239, 68, 68, 0.5);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
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
        </div>
    );
}
