import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface MailWriterLogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function MailWriterLogo({ className = '', size = 'md' }: MailWriterLogoProps) {
    const { theme } = useTheme();

    const heights = {
        sm: 40,
        md: 52,
        lg: 64
    };

    const textSizes = {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl'
    };

    const height = heights[size];
    const textSize = textSizes[size];
    const isDark = theme.includes('dark');

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <img
                src={isDark ? '/1.png' : '/2.png'}
                alt="Market Writer"
                style={{
                    height: `${height}px`,
                    width: 'auto',
                    filter: isDark ? 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.3))' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                }}
                className="transition-all duration-300"
            />
            <span className={`${textSize} font-semibold tracking-tight text-textPrimary`}>
                Market Writer
            </span>
        </div>
    );
}
