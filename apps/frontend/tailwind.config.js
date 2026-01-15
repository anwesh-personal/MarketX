/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            // ===== THEME-AWARE COLORS =====
            colors: {
                // Core colors
                primary: 'var(--color-primary)',
                secondary: 'var(--color-secondary)',
                accent: 'var(--color-accent)',

                // Backgrounds
                background: 'var(--color-background)',
                surface: 'var(--color-surface)',
                surfaceHover: 'var(--color-surface-hover)',

                // Text
                textPrimary: 'var(--color-text-primary)',
                textSecondary: 'var(--color-text-secondary)',
                textTertiary: 'var(--color-text-tertiary)',

                // Borders
                border: 'var(--color-border)',
                borderHover: 'var(--color-border-hover)',
                borderFocus: 'var(--color-border-focus)',

                // States
                success: 'var(--color-success)',
                warning: 'var(--color-warning)',
                error: 'var(--color-error)',
                info: 'var(--color-info)',

                // Functional
                overlay: 'var(--color-overlay)',
                shadow: 'var(--color-shadow)',
            },

            // ===== THEME-AWARE SPACING =====
            spacing: {
                xs: 'var(--spacing-xs)',
                sm: 'var(--spacing-sm)',
                md: 'var(--spacing-md)',
                lg: 'var(--spacing-lg)',
                xl: 'var(--spacing-xl)',
                '2xl': 'var(--spacing-2xl)',
            },

            // ===== THEME-AWARE FONTS =====
            fontFamily: {
                sans: 'var(--font-sans)',
                mono: 'var(--font-mono)',
                display: 'var(--font-display)',
            },

            // ===== THEME-AWARE FONT SIZES =====
            fontSize: {
                xs: 'var(--text-xs)',
                sm: 'var(--text-sm)',
                base: 'var(--text-base)',
                lg: 'var(--text-lg)',
                xl: 'var(--text-xl)',
                '2xl': 'var(--text-2xl)',
                '3xl': 'var(--text-3xl)',
                '4xl': 'var(--text-4xl)',
            },

            // ===== THEME-AWARE BORDER RADIUS =====
            borderRadius: {
                sm: 'var(--radius-sm)',
                md: 'var(--radius-md)',
                lg: 'var(--radius-lg)',
                xl: 'var(--radius-xl)',
                full: 'var(--radius-full)',
            },

            // ===== THEME-AWARE BOX SHADOWS =====
            boxShadow: {
                sm: 'var(--shadow-sm)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
                xl: 'var(--shadow-xl)',
            },

            // ===== THEME-AWARE ANIMATIONS =====
            transitionDuration: {
                fast: 'var(--duration-fast)',
                normal: 'var(--duration-normal)',
                slow: 'var(--duration-slow)',
            },

            transitionTimingFunction: {
                theme: 'var(--easing)',
            },
        },
    },
    plugins: [],
}
