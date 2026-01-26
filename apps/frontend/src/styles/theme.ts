/**
 * AXIOM Design System - Theme Configuration
 * 
 * This is the SINGLE SOURCE OF TRUTH for all design tokens.
 * ALL components must use these values. NO hardcoded colors.
 * 
 * Philosophy:
 * - Primary (Blue): Trust, professionalism, technology
 * - Secondary (Purple): Innovation, creativity, premium  
 * - Accent (Green): Success, growth, positive actions
 * - Neutral (Gray): Content, backgrounds, text
 * 
 * @author Anwesh Rath
 * @date 2026-01-16
 */

export const theme = {
    /**
     * Color System
     * All colors follow a 50-950 scale for consistency
     */
    colors: {
        // Primary palette (Blue) - Trust, Technology, Professionalism
        primary: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9',  // Main brand color
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
            950: '#082f49'
        },

        // Secondary palette (Purple) - Innovation, Premium, Creativity
        secondary: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7',  // Secondary brand
            600: '#9333ea',
            700: '#7e22ce',
            800: '#6b21a8',
            900: '#581c87',
            950: '#3b0764'
        },

        // Accent palette (Green) - Success, Growth, Positive
        accent: {
            50: '#ecfdf5',
            100: '#d1fae5',
            200: '#a7f3d0',
            300: '#6ee7b7',
            400: '#34d399',
            500: '#10b981',  // Success/accent
            600: '#059669',
            700: '#047857',
            800: '#065f46',
            900: '#064e3b',
            950: '#022c22'
        },

        // Semantic colors (mapped from palettes)
        success: '#10b981',   // accent-500
        warning: '#f59e0b',   // amber-500
        error: '#ef4444',     // red-500
        info: '#3b82f6',      // blue-500

        // Neutral palette (Gray scale) - Backgrounds, Text, Borders
        neutral: {
            0: '#ffffff',      // Pure white
            50: '#fafafa',     // Lightest gray
            100: '#f5f5f5',
            200: '#e5e5e5',
            300: '#d4d4d4',
            400: '#a3a3a3',
            500: '#737373',    // Mid gray
            600: '#525252',
            700: '#404040',
            800: '#262626',
            900: '#171717',
            950: '#0a0a0a',    // Near black
            1000: '#000000'    // Pure black
        },

        // Gradients (for premium effects)
        gradients: {
            primary: 'linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%)',
            secondary: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
            success: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
            danger: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
            premium: 'linear-gradient(135deg, #f59e0b 0%, #f59e0b 50%, #eab308 100%)',
            dark: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
        }
    },

    /**
     * Typography System
     * Professional, readable, modern
     */
    typography: {
        fontFamily: {
            sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            mono: '"Fira Code", "JetBrains Mono", Consolas, "Courier New", monospace',
            display: '"Cal Sans", Inter, -apple-system, sans-serif'
        },

        fontSize: {
            xs: '0.75rem',      // 12px
            sm: '0.875rem',     // 14px
            base: '1rem',       // 16px (body)
            lg: '1.125rem',     // 18px
            xl: '1.25rem',      // 20px
            '2xl': '1.5rem',    // 24px
            '3xl': '1.875rem',  // 30px
            '4xl': '2.25rem',   // 36px
            '5xl': '3rem',      // 48px
            '6xl': '3.75rem',   // 60px
            '7xl': '4.5rem',    // 72px
            '8xl': '6rem',      // 96px
            '9xl': '8rem'       // 128px
        },

        fontWeight: {
            thin: 100,
            extralight: 200,
            light: 300,
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
            extrabold: 800,
            black: 900
        },

        lineHeight: {
            none: '1',
            tight: '1.25',
            snug: '1.375',
            normal: '1.5',
            relaxed: '1.625',
            loose: '2'
        },

        letterSpacing: {
            tighter: '-0.05em',
            tight: '-0.025em',
            normal: '0',
            wide: '0.025em',
            wider: '0.05em',
            widest: '0.1em'
        }
    },

    /**
     * Spacing System
     * Consistent 4px base unit
     */
    spacing: {
        px: '1px',
        0: '0',
        0.5: '0.125rem',    // 2px
        1: '0.25rem',       // 4px
        1.5: '0.375rem',    // 6px
        2: '0.5rem',        // 8px
        2.5: '0.625rem',    // 10px
        3: '0.75rem',       // 12px
        3.5: '0.875rem',    // 14px
        4: '1rem',          // 16px
        5: '1.25rem',       // 20px
        6: '1.5rem',        // 24px
        7: '1.75rem',       // 28px
        8: '2rem',          // 32px
        9: '2.25rem',       // 36px
        10: '2.5rem',       // 40px
        11: '2.75rem',      // 44px
        12: '3rem',         // 48px
        14: '3.5rem',       // 56px
        16: '4rem',         // 64px
        20: '5rem',         // 80px
        24: '6rem',         // 96px
        28: '7rem',         // 112px
        32: '8rem',         // 128px
        36: '9rem',         // 144px
        40: '10rem',        // 160px
        44: '11rem',        // 176px
        48: '12rem',        // 192px
        52: '13rem',        // 208px
        56: '14rem',        // 224px
        60: '15rem',        // 240px
        64: '16rem',        // 256px
        72: '18rem',        // 288px
        80: '20rem',        // 320px
        96: '24rem'         // 384px
    },

    /**
     * Border Radius System
     * Smooth, modern curves
     */
    borderRadius: {
        none: '0',
        sm: '0.125rem',     // 2px
        base: '0.25rem',    // 4px
        md: '0.375rem',     // 6px
        lg: '0.5rem',       // 8px
        xl: '0.75rem',      // 12px
        '2xl': '1rem',      // 16px
        '3xl': '1.5rem',    // 24px
        full: '9999px'      // Pills/circles
    },

    /**
     * Shadow System
     * Elevation and depth
     */
    shadows: {
        // Standard shadows
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '2xl': '0 35px 60px -15px rgb(0 0 0 / 0.3)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        none: 'none',

        // Colored shadows (premium effects)
        primaryGlow: '0 0 30px -5px rgba(14, 165, 233, 0.5)',
        secondaryGlow: '0 0 30px -5px rgba(168, 85, 247, 0.5)',
        accentGlow: '0 0 30px -5px rgba(16, 185, 129, 0.5)',
        dangerGlow: '0 0 30px -5px rgba(239, 68, 68, 0.5)'
    },

    /**
     * Animation System
     * Smooth, purposeful motion
     */
    animations: {
        // Transition durations
        transition: {
            fastest: '75ms cubic-bezier(0.4, 0, 0.2, 1)',
            fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
            base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
            slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
            slowest: '700ms cubic-bezier(0.4, 0, 0.2, 1)',
            spring: '500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        },

        // Easing functions
        easing: {
            linear: 'linear',
            in: 'cubic-bezier(0.4, 0, 1, 1)',
            out: 'cubic-bezier(0, 0, 0.2, 1)',
            inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
            bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        },

        // Keyframe animations
        keyframes: {
            fadeIn: {
                from: { opacity: 0 },
                to: { opacity: 1 }
            },
            fadeOut: {
                from: { opacity: 1 },
                to: { opacity: 0 }
            },
            slideUp: {
                from: { transform: 'translateY(100%)' },
                to: { transform: 'translateY(0)' }
            },
            slideDown: {
                from: { transform: 'translateY(-100%)' },
                to: { transform: 'translateY(0)' }
            },
            scaleIn: {
                from: { transform: 'scale(0.95)', opacity: 0 },
                to: { transform: 'scale(1)', opacity: 1 }
            },
            spin: {
                from: { transform: 'rotate(0deg)' },
                to: { transform: 'rotate(360deg)' }
            }
        }
    },

    /**
     * Z-Index System
     * Layering and stacking
     */
    zIndex: {
        auto: 'auto',
        base: 0,
        dropdown: 1000,
        sticky: 1010,
        fixed: 1020,
        modalBackdrop: 1030,
        modal: 1040,
        popover: 1050,
        tooltip: 1060,
        notification: 1070
    },

    /**
     * Breakpoints
     * Responsive design
     */
    breakpoints: {
        xs: '320px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px'
    }
} as const

export type Theme = typeof theme

/**
 * Type-safe theme access helper
 */
export function getThemeValue<T extends keyof Theme>(
    category: T,
    ...path: string[]
): any {
    let value: any = theme[category]
    for (const key of path) {
        value = value?.[key]
    }
    return value
}

/**
 * Export default for convenience
 */
export default theme
