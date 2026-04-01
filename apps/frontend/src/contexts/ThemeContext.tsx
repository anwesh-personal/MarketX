'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

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

// ── Supabase persistence helpers ──────────────────────────────────────

/** Get auth headers for the theme API (superadmin JWT if present) */
function getThemeApiHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // Superadmin JWT lives in localStorage
    try {
        const saSession = window.localStorage.getItem('superadmin_session');
        if (saSession) {
            const parsed = JSON.parse(saSession);
            if (parsed?.token) {
                headers['Authorization'] = `Bearer ${parsed.token}`;
            }
        }
    } catch { /* ignore */ }
    return headers;
}

async function loadThemeFromServer(): Promise<Theme | null> {
    try {
        const res = await fetch('/api/user/theme', {
            headers: getThemeApiHeaders(),
            credentials: 'include', // sends supabase auth cookies
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.theme && isValidTheme(data.theme)) {
            return data.theme;
        }
    } catch { /* network error – fall back to localStorage */ }
    return null;
}

async function saveThemeToServer(theme: Theme): Promise<void> {
    try {
        await fetch('/api/user/theme', {
            method: 'POST',
            headers: getThemeApiHeaders(),
            credentials: 'include',
            body: JSON.stringify({ theme }),
        });
    } catch { /* silent – localStorage is the fallback */ }
}

// ── Provider ──────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [initialThemeState] = useState(getInitialThemeState);
    const [theme, setThemeState] = useState<Theme>(initialThemeState.theme);
    const [isLoading, setIsLoading] = useState(false);
    const [preferenceSource, setPreferenceSource] = useState<ThemePreferenceSource>(initialThemeState.preferenceSource);

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [variant, mode] = theme.split('-') as [ThemeVariant, ThemeMode];

    // 1) On mount: resolve theme from localStorage first (instant), then check Supabase
    useEffect(() => {
        const clientThemeState = getClientThemeState();
        setThemeState(clientThemeState.theme);
        setPreferenceSource(clientThemeState.preferenceSource);
        applyThemeToDOM(clientThemeState.theme, true);

        // Then async-load from server; if different from localStorage, update
        loadThemeFromServer().then(serverTheme => {
            if (serverTheme && serverTheme !== clientThemeState.theme) {
                // Server theme wins (the persisted preference)
                setThemeState(serverTheme);
                setPreferenceSource('explicit');
                applyThemeToDOM(serverTheme, true);
                localStorage.setItem(STORAGE_KEY, serverTheme);
            }
        });
    }, []);

    // 2) Keep DOM in sync
    useEffect(() => {
        applyThemeToDOM(theme, true);
    }, [theme]);

    // 3) System preference listener
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

    // ── setTheme: save to localStorage immediately + debounce Supabase save ──
    const setTheme = useCallback((newTheme: Theme) => {
        applyThemeToDOM(newTheme);
        setThemeState(newTheme);
        setPreferenceSource('explicit');

        // Instant: localStorage (so page-reload is instant)
        localStorage.setItem(STORAGE_KEY, newTheme);

        // Debounced: Supabase (600ms – covers rapid theme/mode toggles)
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            saveThemeToServer(newTheme);
        }, 600);
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

        // Also clear from server (set to null / remove preference)
        // We save the system-derived theme so the server knows what was last used
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveThemeToServer(systemTheme);
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
