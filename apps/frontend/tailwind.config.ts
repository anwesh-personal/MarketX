/**
 * AXIOM Tailwind Configuration
 * Extends design system from theme.ts
 * 
 * RULES:
 * - All colors come from theme.ts
 * - All spacing comes from theme.ts
 * - All shadows come from theme.ts
 * - NO hardcoded values
 * 
 * @author Anwesh Rath
 * @date 2026-01-16
 */

import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],

    theme: {
        extend: {
            /**
             * Semantic spacing aliases (theme variable-driven)
             * Enables classes like p-md, gap-xs, px-lg used across app.
             */
            spacing: {
                xs: 'var(--spacing-xs)',
                sm: 'var(--spacing-sm)',
                md: 'var(--spacing-md)',
                lg: 'var(--spacing-lg)',
                xl: 'var(--spacing-xl)',
                '2xl': 'var(--spacing-2xl)',
            },

            /**
             * Color System (from theme.ts)
             */
            colors: {
                // Primary (Blue)
                primary: {
                    50: 'rgb(var(--color-primary-50) / <alpha-value>)',
                    100: 'rgb(var(--color-primary-100) / <alpha-value>)',
                    200: 'rgb(var(--color-primary-200) / <alpha-value>)',
                    300: 'rgb(var(--color-primary-300) / <alpha-value>)',
                    400: 'rgb(var(--color-primary-400) / <alpha-value>)',
                    500: 'rgb(var(--color-primary-500) / <alpha-value>)',
                    600: 'rgb(var(--color-primary-600) / <alpha-value>)',
                    700: 'rgb(var(--color-primary-700) / <alpha-value>)',
                    800: 'rgb(var(--color-primary-800) / <alpha-value>)',
                    900: 'rgb(var(--color-primary-900) / <alpha-value>)',
                    950: 'rgb(var(--color-primary-950) / <alpha-value>)',
                },

                // Secondary (Purple)
                secondary: {
                    50: 'rgb(var(--color-secondary-50) / <alpha-value>)',
                    100: 'rgb(var(--color-secondary-100) / <alpha-value>)',
                    200: 'rgb(var(--color-secondary-200) / <alpha-value>)',
                    300: 'rgb(var(--color-secondary-300) / <alpha-value>)',
                    400: 'rgb(var(--color-secondary-400) / <alpha-value>)',
                    500: 'rgb(var(--color-secondary-500) / <alpha-value>)',
                    600: 'rgb(var(--color-secondary-600) / <alpha-value>)',
                    700: 'rgb(var(--color-secondary-700) / <alpha-value>)',
                    800: 'rgb(var(--color-secondary-800) / <alpha-value>)',
                    900: 'rgb(var(--color-secondary-900) / <alpha-value>)',
                    950: 'rgb(var(--color-secondary-950) / <alpha-value>)',
                },

                // Accent (Green)
                accent: {
                    50: 'rgb(var(--color-accent-50) / <alpha-value>)',
                    100: 'rgb(var(--color-accent-100) / <alpha-value>)',
                    200: 'rgb(var(--color-accent-200) / <alpha-value>)',
                    300: 'rgb(var(--color-accent-300) / <alpha-value>)',
                    400: 'rgb(var(--color-accent-400) / <alpha-value>)',
                    500: 'rgb(var(--color-accent-500) / <alpha-value>)',
                    600: 'rgb(var(--color-accent-600) / <alpha-value>)',
                    700: 'rgb(var(--color-accent-700) / <alpha-value>)',
                    800: 'rgb(var(--color-accent-800) / <alpha-value>)',
                    900: 'rgb(var(--color-accent-900) / <alpha-value>)',
                    950: 'rgb(var(--color-accent-950) / <alpha-value>)',
                },

                // Semantic
                success: 'rgb(var(--color-success) / <alpha-value>)',
                warning: 'rgb(var(--color-warning) / <alpha-value>)',
                error: 'rgb(var(--color-error) / <alpha-value>)',
                info: 'rgb(var(--color-info) / <alpha-value>)',

                // Neutral (Gray scale)
                neutral: {
                    0: 'rgb(var(--color-neutral-0) / <alpha-value>)',
                    50: 'rgb(var(--color-neutral-50) / <alpha-value>)',
                    100: 'rgb(var(--color-neutral-100) / <alpha-value>)',
                    200: 'rgb(var(--color-neutral-200) / <alpha-value>)',
                    300: 'rgb(var(--color-neutral-300) / <alpha-value>)',
                    400: 'rgb(var(--color-neutral-400) / <alpha-value>)',
                    500: 'rgb(var(--color-neutral-500) / <alpha-value>)',
                    600: 'rgb(var(--color-neutral-600) / <alpha-value>)',
                    700: 'rgb(var(--color-neutral-700) / <alpha-value>)',
                    800: 'rgb(var(--color-neutral-800) / <alpha-value>)',
                    900: 'rgb(var(--color-neutral-900) / <alpha-value>)',
                    950: 'rgb(var(--color-neutral-950) / <alpha-value>)',
                    1000: 'rgb(var(--color-neutral-1000) / <alpha-value>)',
                },

                // System Tokens (Theme Aware)
                background: 'var(--color-background)',
                surface: 'var(--color-surface)',
                'surface-hover': 'var(--color-surface-hover)',
                textPrimary: 'var(--color-text-primary)',
                textSecondary: 'var(--color-text-secondary)',
                textTertiary: 'var(--color-text-tertiary)',
                border: 'var(--color-border)',
                borderHover: 'var(--color-border-hover)',
                borderFocus: 'var(--color-border-focus)',
            },

            /**
             * Typography (from theme.ts)
             */
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
                mono: ['Fira Code', 'JetBrains Mono', 'Consolas', 'Courier New', 'monospace'],
                display: ['Cal Sans', 'Inter', '-apple-system', 'sans-serif'],
            },

            /**
             * Shadows (from theme.ts)
             */
            boxShadow: {
                xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                '2xl': '0 35px 60px -15px rgb(0 0 0 / 0.3)',
                inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
                none: 'none',

                // Colored glows (premium effects)
                'primary-glow': '0 0 30px -5px rgba(14, 165, 233, 0.5)',
                'secondary-glow': '0 0 30px -5px rgba(168, 85, 247, 0.5)',
                'accent-glow': '0 0 30px -5px rgba(16, 185, 129, 0.5)',
                'danger-glow': '0 0 30px -5px rgba(239, 68, 68, 0.5)',
            },

            /**
             * Border Radius (from theme.ts)
             */
            borderRadius: {
                none: '0',
                sm: '0.125rem',
                DEFAULT: '0.25rem',
                md: '0.375rem',
                lg: '0.5rem',
                xl: '0.75rem',
                '2xl': '1rem',
                '3xl': '1.5rem',
                full: '9999px',
            },

            /**
             * Animation (from theme.ts)
             */
            animation: {
                'fade-in': 'fadeIn 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                'fade-out': 'fadeOut 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                'slide-up': 'slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                'slide-down': 'slideDown 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                'scale-in': 'scaleIn 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                'spin': 'spin 1s linear infinite',
            },

            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                fadeOut: {
                    from: { opacity: '1' },
                    to: { opacity: '0' },
                },
                slideUp: {
                    from: { transform: 'translateY(100%)' },
                    to: { transform: 'translateY(0)' },
                },
                slideDown: {
                    from: { transform: 'translateY(-100%)' },
                    to: { transform: 'translateY(0)' },
                },
                scaleIn: {
                    from: { transform: 'scale(0.95)', opacity: '0' },
                    to: { transform: 'scale(1)', opacity: '1' },
                },
                spin: {
                    from: { transform: 'rotate(0deg)' },
                    to: { transform: 'rotate(360deg)' },
                },
            },

            /**
             * Transition timing (from theme.ts)
             */
            transitionDuration: {
                fastest: '75ms',
                fast: '150ms',
                DEFAULT: '300ms',
                slow: '500ms',
                slowest: '700ms',
            },

            transitionTimingFunction: {
                DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
                spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            },

            /**
             * Z-index (from theme.ts)
             */
            zIndex: {
                auto: 'auto',
                base: '0',
                dropdown: '1000',
                sticky: '1010',
                fixed: '1020',
                'modal-backdrop': '1030',
                modal: '1040',
                popover: '1050',
                tooltip: '1060',
                notification: '1070',
            },
        },
    },

    plugins: [
        // Add Tailwind plugins here if needed
    ],
}

export default config
