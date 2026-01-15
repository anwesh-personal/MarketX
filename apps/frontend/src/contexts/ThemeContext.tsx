'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export type ThemeVariant = 'minimalist' | 'aqua' | 'modern';
export type ThemeMode = 'light' | 'dark';
export type Theme = `${ThemeVariant}-${ThemeMode}`;

interface ThemeContextValue {
    // Current theme state
    theme: Theme;
    variant: ThemeVariant;
    mode: ThemeMode;

    // Actions
    setTheme: (theme: Theme) => Promise<void>;
    setVariant: (variant: ThemeVariant) => Promise<void>;
    setMode: (mode: ThemeMode) => Promise<void>;
    toggleMode: () => Promise<void>;

    // Loading state
    isLoading: boolean;
}

// ============================================================
// CONTEXT
// ============================================================

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ============================================================
// THEME PROVIDER
// ============================================================

interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    defaultTheme = 'minimalist-light'
}) => {
    const [theme, setThemeState] = useState<Theme>(defaultTheme);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize Supabase client
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Derive variant and mode from theme
    const [variant, mode] = theme.split('-') as [ThemeVariant, ThemeMode];

    // ============================================================
    // LOAD THEME FROM DATABASE
    // ============================================================

    useEffect(() => {
        loadUserTheme();
    }, []);

    const loadUserTheme = async () => {
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Fetch user's theme preference
                const { data, error } = await supabase
                    .from('users')
                    .select('theme_preference')
                    .eq('id', user.id)
                    .single();

                if (data?.theme_preference && !error) {
                    applyTheme(data.theme_preference as Theme);
                } else {
                    // No theme saved, apply default
                    applyTheme(defaultTheme);
                }
            } else {
                // Not logged in, check localStorage
                const savedTheme = localStorage.getItem('theme');
                if (savedTheme && isValidTheme(savedTheme)) {
                    applyTheme(savedTheme as Theme);
                } else {
                    applyTheme(defaultTheme);
                }
            }
        } catch (error) {
            console.error('Error loading theme:', error);
            applyTheme(defaultTheme);
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================================
    // APPLY THEME
    // ============================================================

    const applyTheme = (newTheme: Theme) => {
        // Set data attribute on <html> element
        document.documentElement.setAttribute('data-theme', newTheme);

        // Import theme CSS dynamically
        import(`@/styles/themes/${newTheme}.css`).catch((err) => {
            console.error(`Failed to load theme: ${newTheme}`, err);
        });

        // Save to localStorage (for non-logged-in users)
        localStorage.setItem('theme', newTheme);

        // Update state
        setThemeState(newTheme);
    };

    // ============================================================
    // SET THEME (PERSIST TO DATABASE)
    // ============================================================

    const setTheme = async (newTheme: Theme) => {
        // Apply theme immediately (optimistic update)
        applyTheme(newTheme);

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Persist to database
                const { error } = await supabase
                    .from('users')
                    .update({ theme_preference: newTheme })
                    .eq('id', user.id);

                if (error) {
                    console.error('Error saving theme:', error);
                }
            }
        } catch (error) {
            console.error('Error setting theme:', error);
        }
    };

    // ============================================================
    // SET VARIANT (KEEP CURRENT MODE)
    // ============================================================

    const setVariant = async (newVariant: ThemeVariant) => {
        const newTheme: Theme = `${newVariant}-${mode}`;
        await setTheme(newTheme);
    };

    // ============================================================
    // SET MODE (KEEP CURRENT VARIANT)
    // ============================================================

    const setMode = async (newMode: ThemeMode) => {
        const newTheme: Theme = `${variant}-${newMode}`;
        await setTheme(newTheme);
    };

    // ============================================================
    // TOGGLE MODE (DAY/NIGHT)
    // ============================================================

    const toggleMode = async () => {
        const newMode: ThemeMode = mode === 'light' ? 'dark' : 'light';
        await setMode(newMode);
    };

    // ============================================================
    // CONTEXT VALUE
    // ============================================================

    const value: ThemeContextValue = {
        theme,
        variant,
        mode,
        setTheme,
        setVariant,
        setMode,
        toggleMode,
        isLoading,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

// ============================================================
// USE THEME HOOK
// ============================================================

export const useTheme = (): ThemeContextValue => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const isValidTheme = (theme: string): theme is Theme => {
    const validThemes: Theme[] = [
        'minimalist-light',
        'minimalist-dark',
        'aqua-light',
        'aqua-dark',
        'modern-light',
        'modern-dark',
    ];
    return validThemes.includes(theme as Theme);
};
