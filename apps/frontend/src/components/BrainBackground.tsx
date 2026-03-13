'use client'

import { useTheme } from '@/contexts/ThemeContext'
import type { ThemeVariant } from '@/contexts/ThemeContext'

/** Map theme variant to brain image (4 variants: 12, 13, 15, brain_tactical) */
const BRAIN_IMAGES: Record<ThemeVariant, string> = {
    obsidian: '/brain_tactical.png',
    aurora: '/12.png',
    ember: '/13.png',
    arctic: '/15.png',
    velvet: '/12.png',
}

interface BrainBackgroundProps {
    /** Opacity 0–1; default 0.25 */
    opacity?: number
    /** 'float' | 'pulse' | 'none'; default 'float' */
    animation?: 'float' | 'pulse' | 'none'
    /** Optional extra class for the wrapper */
    className?: string
    /** Blend mode; default 'normal' */
    mixBlendMode?: 'normal' | 'multiply' | 'soft-light' | 'overlay'
}

export function BrainBackground({
    opacity = 0.25,
    animation = 'float',
    className = '',
    mixBlendMode = 'soft-light',
}: BrainBackgroundProps) {
    const { variant } = useTheme()
    const src = BRAIN_IMAGES[variant]

    return (
        <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
        >
            <div
                className={`absolute inset-0 bg-cover bg-center bg-no-repeat ${
                    animation === 'float'
                        ? 'animate-brain-float'
                        : animation === 'pulse'
                          ? 'animate-brain-pulse'
                          : ''
                }`}
                style={{
                    backgroundImage: `url(${src})`,
                    opacity,
                    mixBlendMode,
                }}
            />
        </div>
    )
}
