import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface MailWriterLogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
}

export function MailWriterLogo({ className = '', size = 'md', showText = true }: MailWriterLogoProps) {
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
    const isNight = theme.endsWith('-night');

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <img
                src={isNight ? '/7.png' : '/6.png'}
                alt="Market Writer"
                style={{
                    height: `${height}px`,
                    width: 'auto',
                }}
                className="transition-all duration-300"
            />
            {showText && (
                <span className={`${textSize} font-semibold tracking-tight text-textPrimary`}>
                    Market Writer
                </span>
            )}
        </div>
    );
}
