'use client';

import React from 'react';
import { useTheme, type ThemeVariant } from '@/contexts/ThemeContext';

/**
 * ThemeSelector Component
 * Dropdown (theme variant) + Day/Night toggle
 * Positioned in top right navigation
 */
export const ThemeSelector: React.FC = () => {
    const { variant, mode, setVariant, toggleMode, isLoading } = useTheme();

    const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setVariant(e.target.value as ThemeVariant);
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-[var(--spacing-sm)]">
                <div className="w-32 h-9 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] animate-pulse" />
                <div className="w-9 h-9 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] animate-pulse" />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-[var(--spacing-sm)]">
            {/* Theme Variant Dropdown */}
            <select
                value={variant}
                onChange={handleVariantChange}
                className="
          bg-[var(--color-surface)]
          text-[var(--color-text-primary)]
          border border-[var(--color-border)]
          rounded-[var(--radius-md)]
          px-[var(--spacing-sm)]
          py-[var(--spacing-xs)]
          text-[var(--text-sm)]
          font-[var(--font-sans)]
          transition-all
          duration-[var(--duration-normal)]
          ease-[var(--easing)]
          hover:border-[var(--color-border-hover)]
          hover:bg-[var(--color-surface-hover)]
          focus:outline-none
          focus:ring-2
          focus:ring-[var(--color-border-focus)]
          focus:ring-offset-2
          focus:ring-offset-[var(--color-background)]
          cursor-pointer
        "
                aria-label="Select theme variant"
            >
                <option value="minimalist">Minimalist</option>
                <option value="aqua">Aqua</option>
                <option value="modern">Modern</option>
            </select>

            {/* Day/Night Toggle */}
            <button
                onClick={toggleMode}
                className="
          p-[var(--spacing-sm)]
          bg-[var(--color-surface)]
          border border-[var(--color-border)]
          rounded-[var(--radius-md)]
          transition-all
          duration-[var(--duration-normal)]
          ease-[var(--easing)]
          hover:bg-[var(--color-surface-hover)]
          hover:border-[var(--color-border-hover)]
          hover:shadow-[var(--shadow-sm)]
          active:scale-95
          focus:outline-none
          focus:ring-2
          focus:ring-[var(--color-border-focus)]
          focus:ring-offset-2
          focus:ring-offset-[var(--color-background)]
          cursor-pointer
        "
                aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
                {mode === 'light' ? (
                    <svg
                        className="w-5 h-5 text-[var(--color-text-primary)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                    </svg>
                ) : (
                    <svg
                        className="w-5 h-5 text-[var(--color-text-primary)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                    </svg>
                )}
            </button>
        </div>
    );
};

export default ThemeSelector;
