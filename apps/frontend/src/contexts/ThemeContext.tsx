'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeVariant = 'obsidian' | 'aurora' | 'ember' | 'arctic' | 'velvet';
export type ThemeMode = 'day' | 'night';
export type Theme = `${ThemeVariant}-${ThemeMode}`;
export type ThemePreferenceSource = 'system' | 'explicit';

export const THEME_VARIANTS: ThemeVariant[] = ['obsidian', 'aurora', 'ember', 'arctic', 'velvet'];

export const THEME_META: Record<ThemeVariant, { label: string; accent: string; accentNight: string }> = {
    obsidian: { label: 'Obsidian', accent: '#C9A84C', accentNight: '#C9A84C' },
    aurora:   { label: 'Aurora',   accent: '#00D4FF', accentNight: '#00D4FF' },
    ember:    { label: 'Ember',    accent: '#C75C2E', accentNight: '#E06030' },
    arctic:   { label: 'Arctic',   accent: '#2B6CB0', accentNight: '#4299E1' },
    velvet:   { label: 'Velvet',   accent: '#D4477A', accentNight: '#E85A8A' },
};

const STORAGE_KEY = 'marketx-theme';
const DEFAULT_THEME: Theme = 'arctic-day';

interface ThemeContextType {
    theme: Theme;
    variant: ThemeVariant;
    mode: ThemeMode;
    preferenceSource: ThemePreferenceSource;
    setTheme: (theme: Theme) => void;
    setVariant: (variant: ThemeVariant) => void;
    setMode: (mode: ThemeMode) => void;
    toggleMode: () => void;
    resetToSystem: () => void;
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function isValidTheme(value: string): value is Theme {
    return /^(obsidian|aurora|ember|arctic|velvet)-(day|night)$/.test(value);
}

function getSystemPreference(): ThemeMode {
    if (typeof window === 'undefined') return 'day';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
}

function getDomTheme(): Theme | null {
    if (typeof document === 'undefined') return null;

    const domTheme = document.documentElement.getAttribute('data-theme');
    return domTheme && isValidTheme(domTheme) ? domTheme : null;
}

function getInitialThemeState(): { theme: Theme; preferenceSource: ThemePreferenceSource } {
    // IMPORTANT:
    // Keep initial render deterministic across SSR and hydration.
    // Client-specific preference resolution happens after mount.
    return { theme: DEFAULT_THEME, preferenceSource: 'system' };
}

function getClientThemeState(): { theme: Theme; preferenceSource: ThemePreferenceSource } {
    if (typeof window === 'undefined') {
        return { theme: DEFAULT_THEME, preferenceSource: 'system' };
    }

    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (savedTheme && isValidTheme(savedTheme)) {
        return { theme: savedTheme, preferenceSource: 'explicit' };
    }

    const domTheme = getDomTheme();
    if (domTheme) {
        return { theme: domTheme, preferenceSource: 'system' };
    }

    return {
        theme: `arctic-${getSystemPreference()}`,
        preferenceSource: 'system',
    };
}

function applyThemeToDOM(theme: Theme, skipTransition = false) {
    const html = document.documentElement;

    if (skipTransition) {
        html.classList.add('theme-transitioning');
    }

    html.setAttribute('data-theme', theme);

    if (skipTransition) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                html.classList.remove('theme-transitioning');
            });
        });
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [initialThemeState] = useState(getInitialThemeState);
    const [theme, setThemeState] = useState<Theme>(initialThemeState.theme);
    const [isLoading, setIsLoading] = useState(false);
    const [preferenceSource, setPreferenceSource] = useState<ThemePreferenceSource>(initialThemeState.preferenceSource);

    const [variant, mode] = theme.split('-') as [ThemeVariant, ThemeMode];

    useEffect(() => {
        const clientThemeState = getClientThemeState();
        setThemeState(clientThemeState.theme);
        setPreferenceSource(clientThemeState.preferenceSource);
        applyThemeToDOM(clientThemeState.theme, true);
    }, []);

    useEffect(() => {
        applyThemeToDOM(theme, true);
    }, [theme]);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            if (preferenceSource === 'system') {
                const newMode: ThemeMode = e.matches ? 'night' : 'day';
                const newTheme: Theme = `${variant}-${newMode}`;
                applyThemeToDOM(newTheme, true);
                setThemeState(newTheme);
            }
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [preferenceSource, variant]);

    const setTheme = useCallback((newTheme: Theme) => {
        applyThemeToDOM(newTheme);
        setThemeState(newTheme);
        setPreferenceSource('explicit');
        localStorage.setItem(STORAGE_KEY, newTheme);
    }, []);

    const setVariant = useCallback((newVariant: ThemeVariant) => {
        const newTheme: Theme = `${newVariant}-${mode}`;
        setTheme(newTheme);
    }, [mode, setTheme]);

    const setMode = useCallback((newMode: ThemeMode) => {
        const newTheme: Theme = `${variant}-${newMode}`;
        setTheme(newTheme);
    }, [variant, setTheme]);

    const toggleMode = useCallback(() => {
        setMode(mode === 'day' ? 'night' : 'day');
    }, [mode, setMode]);

    const resetToSystem = useCallback(() => {
        const systemMode = getSystemPreference();
        const systemTheme: Theme = `${variant}-${systemMode}`;

        localStorage.removeItem(STORAGE_KEY);
        applyThemeToDOM(systemTheme, true);
        setThemeState(systemTheme);
        setPreferenceSource('system');
    }, [variant]);

    return (
        <ThemeContext.Provider
            value={{ theme, variant, mode, preferenceSource, setTheme, setVariant, setMode, toggleMode, resetToSystem, isLoading }}
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
