'use client';

import React, { createContext, useContext, useState, useLayoutEffect, useEffect } from 'react';

// Types
export type ThemeVariant = 'minimalist' | 'aqua' | 'modern';
export type ThemeMode = 'light' | 'dark';
export type Theme = `${ThemeVariant}-${ThemeMode}`;

interface ThemeContextType {
    theme: Theme;
    variant: ThemeVariant;
    mode: ThemeMode;
    setTheme: (theme: Theme) => void;
    setVariant: (variant: ThemeVariant) => void;
    setMode: (mode: ThemeMode) => void;
    toggleMode: () => void;
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('minimalist-light');
    const [isLoading, setIsLoading] = useState(true);

    // Parse variant and mode from theme
    const [variant, mode] = theme.split('-') as [ThemeVariant, ThemeMode];

    // Initialize theme from localStorage (runs once on mount)
    useEffect(() => {
        const saved = localStorage.getItem('theme') as Theme;
        if (saved && isValidTheme(saved)) {
            applyTheme(saved, true); // Skip transition on initial load
        }
        setIsLoading(false);
    }, []);

    // Apply theme: update DOM and localStorage
    function applyTheme(newTheme: Theme, skipTransition = false) {
        const html = document.documentElement;

        // Temporarily disable transitions for instant theme change
        if (skipTransition) {
            html.classList.add('theme-transitioning');
        }

        // Set theme attribute
        html.setAttribute('data-theme', newTheme);

        // Save to localStorage
        localStorage.setItem('theme', newTheme);

        // Update React state
        setThemeState(newTheme);

        // Re-enable transitions after a tick
        if (skipTransition) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    html.classList.remove('theme-transitioning');
                });
            });
        }
    }

    // Setters
    function setTheme(newTheme: Theme) {
        applyTheme(newTheme, true);
    }

    function setVariant(newVariant: ThemeVariant) {
        applyTheme(`${newVariant}-${mode}`, true);
    }

    function setMode(newMode: ThemeMode) {
        applyTheme(`${variant}-${newMode}`, true);
    }

    function toggleMode() {
        setMode(mode === 'light' ? 'dark' : 'light');
    }

    return (
        <ThemeContext.Provider
            value={{
                theme,
                variant,
                mode,
                setTheme,
                setVariant,
                setMode,
                toggleMode,
                isLoading,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
}

// Validation
function isValidTheme(theme: string): theme is Theme {
    return /^(minimalist|aqua|modern)-(light|dark)$/.test(theme);
}
