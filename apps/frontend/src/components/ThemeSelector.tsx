'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, THEME_VARIANTS, THEME_META, type ThemeVariant } from '@/contexts/ThemeContext';

export const ThemeSelector: React.FC = () => {
    const { variant, mode, preferenceSource, setVariant, toggleMode, resetToSystem, isLoading } = useTheme();
    const [tooltipVariant, setTooltipVariant] = useState<ThemeVariant | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const handlePillHover = (v: ThemeVariant, e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setTooltipPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
        setTooltipVariant(v);
    };

    useEffect(() => {
        const handleScroll = () => setTooltipVariant(null);
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-5 h-5 rounded-full bg-border animate-pulse" />
                    ))}
                </div>
                <div className="w-px h-5 bg-border" />
                <div className="w-9 h-5 rounded-full bg-border animate-pulse" />
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex items-center gap-2.5">
            {/* Theme Variant Pills */}
            <div className="flex items-center gap-1.5">
                {THEME_VARIANTS.map((v) => {
                    const meta = THEME_META[v];
                    const isActive = variant === v;
                    const accentColor = mode === 'night' ? meta.accentNight : meta.accent;

                    return (
                        <button
                            key={v}
                            onClick={() => setVariant(v)}
                            onMouseEnter={(e) => handlePillHover(v, e)}
                            onMouseLeave={() => setTooltipVariant(null)}
                            className="relative w-5 h-5 rounded-full transition-all focus:outline-none"
                            style={{
                                background: accentColor,
                                boxShadow: isActive
                                    ? `0 0 0 2px var(--color-background), 0 0 0 4px ${accentColor}`
                                    : 'none',
                                transform: isActive ? 'scale(1.15)' : 'scale(1)',
                                transitionDuration: 'var(--duration-normal)',
                                transitionTimingFunction: 'var(--easing-smooth)',
                            }}
                            aria-label={`Switch to ${meta.label} theme`}
                            title=""
                        >
                            {isActive && (
                                <span
                                    className="absolute inset-0 rounded-full animate-ping"
                                    style={{
                                        background: accentColor,
                                        opacity: 0.3,
                                        animationDuration: '1.5s',
                                        animationIterationCount: '1',
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Separator */}
            <div className="w-px h-5 bg-border" />

            <button
                onClick={resetToSystem}
                className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all"
                style={{
                    borderColor: preferenceSource === 'system' ? 'var(--color-accent)' : 'var(--color-border)',
                    background: preferenceSource === 'system' ? 'var(--color-success-muted)' : 'var(--color-surface)',
                    color: preferenceSource === 'system' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    boxShadow: preferenceSource === 'system' ? 'var(--shadow-glow)' : 'none',
                    transitionDuration: 'var(--duration-normal)',
                    transitionTimingFunction: 'var(--easing-smooth)',
                }}
                aria-label="Use system theme preference"
            >
                Auto
            </button>

            {/* Day/Night Toggle */}
            <button
                onClick={toggleMode}
                className="relative flex items-center w-10 h-5 rounded-full transition-all focus:outline-none"
                style={{
                    background: mode === 'night'
                        ? 'linear-gradient(135deg, var(--color-surface-hover), var(--color-background))'
                        : 'linear-gradient(135deg, var(--color-accent), var(--color-surface-elevated))',
                    boxShadow: mode === 'night'
                        ? 'inset 0 1px 3px var(--color-shadow)'
                        : 'inset 0 1px 3px var(--color-glow)',
                    transitionDuration: 'var(--duration-normal)',
                    transitionTimingFunction: 'var(--easing-smooth)',
                }}
                aria-label={mode === 'day' ? 'Switch to night mode' : 'Switch to day mode'}
            >
                {/* Stars (night mode) */}
                <span
                    className="absolute transition-opacity"
                    style={{
                        opacity: mode === 'night' ? 1 : 0,
                        transitionDuration: 'var(--duration-normal)',
                    }}
                >
                    <span className="absolute w-0.5 h-0.5 rounded-full" style={{ top: 3, left: 6, background: 'var(--color-text-primary)' }} />
                    <span className="absolute w-[3px] h-[3px] rounded-full" style={{ top: 10, left: 14, background: 'var(--color-text-secondary)' }} />
                    <span className="absolute w-0.5 h-0.5 rounded-full" style={{ top: 5, left: 20, background: 'var(--color-text-tertiary)' }} />
                </span>

                {/* Thumb with sun/moon */}
                <span
                    className="absolute flex items-center justify-center w-4 h-4 rounded-full transition-all"
                    style={{
                        left: mode === 'night' ? 'calc(100% - 18px)' : '2px',
                        background: 'var(--color-surface-elevated)',
                        boxShadow: mode === 'night' ? 'var(--shadow-md)' : 'var(--shadow-glow)',
                        transitionDuration: 'var(--duration-normal)',
                        transitionTimingFunction: 'var(--easing-smooth)',
                    }}
                >
                    {mode === 'day' ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round">
                            <circle cx="12" cy="12" r="5" />
                            <line x1="12" y1="1" x2="12" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="23" />
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                            <line x1="1" y1="12" x2="3" y2="12" />
                            <line x1="21" y1="12" x2="23" y2="12" />
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                        </svg>
                    ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                    )}
                </span>
            </button>

            {/* Tooltip */}
            {tooltipVariant && (
                <div
                    className="fixed z-[9999] px-2.5 py-1.5 rounded-md text-xs font-medium pointer-events-none animate-fade-in"
                    style={{
                        left: tooltipPos.x,
                        top: tooltipPos.y,
                        transform: 'translateX(-50%)',
                        background: 'var(--color-surface-elevated)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-md)',
                    }}
                >
                    <div className="flex items-center gap-1.5">
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{
                                background: mode === 'night'
                                    ? THEME_META[tooltipVariant].accentNight
                                    : THEME_META[tooltipVariant].accent,
                            }}
                        />
                        {THEME_META[tooltipVariant].label}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThemeSelector;
