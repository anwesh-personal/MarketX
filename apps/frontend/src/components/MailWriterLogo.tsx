import React from 'react';

interface MailWriterLogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function MailWriterLogo({ className = '', size = 'md' }: MailWriterLogoProps) {
    const heights = {
        sm: 'h-8',
        md: 'h-10',
        lg: 'h-12'
    };

    return (
        <div className={`flex items-center gap-2 ${heights[size]} ${className}`}>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
                MW
            </span>
            <div className="h-6 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
            <span className="text-lg font-semibold text-textPrimary">Mail Writer</span>
        </div>
    );
}
