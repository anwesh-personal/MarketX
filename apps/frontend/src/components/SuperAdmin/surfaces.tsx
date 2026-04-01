'use client'

import React from 'react'
import { AlertTriangle, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type AccentTone = 'primary' | 'info' | 'success' | 'warning' | 'accent' | 'danger'

/* Text colors — accent for primary visual tones, semantic colors only for status */
const toneText: Record<AccentTone, string> = {
    primary: 'text-accent',
    info: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
    accent: 'text-accent',
    danger: 'text-error',
}

const toneBg: Record<AccentTone, string> = {
    primary: 'bg-surfaceElevated',
    info: 'bg-surfaceElevated',
    success: 'bg-success-muted',
    warning: 'bg-warning-muted',
    accent: 'bg-surfaceElevated',
    danger: 'bg-error-muted',
}

/* Used where we still want the full combo (legacy compat) */
const toneStyles: Record<AccentTone, string> = {
    primary: 'text-accent border-border bg-surfaceElevated',
    info: 'text-accent border-border bg-surfaceElevated',
    success: 'text-success border-border bg-surfaceElevated',
    warning: 'text-warning border-border bg-surfaceElevated',
    accent: 'text-accent border-border bg-surfaceElevated',
    danger: 'text-error border-border bg-surfaceElevated',
}

const toneGlowStyles: Record<AccentTone, React.CSSProperties> = {
    primary: { boxShadow: '0 0 0 1px var(--color-border-hover), 0 16px 48px -32px var(--color-shadow)' },
    info: { boxShadow: '0 0 0 1px var(--color-border-hover), 0 16px 48px -32px var(--color-shadow)' },
    success: { boxShadow: '0 0 0 1px var(--color-border-hover), 0 16px 48px -32px var(--color-shadow)' },
    warning: { boxShadow: '0 0 0 1px var(--color-border-hover), 0 16px 48px -32px var(--color-shadow)' },
    accent: { boxShadow: '0 0 0 1px var(--color-border-hover), 0 16px 48px -32px var(--color-shadow)' },
    danger: { boxShadow: '0 0 0 1px var(--color-border-hover), 0 16px 48px -32px var(--color-shadow)' },
}

export function SuperadminPageHero({
    eyebrow,
    title,
    description,
    actions,
    children,
}: {
    eyebrow: string
    title: string
    description: string
    actions?: React.ReactNode
    children?: React.ReactNode
}) {
    return (
        <section
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '22px 26px',
                borderRadius: 16,
                background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-elevated) 100%)',
                border: '1px solid var(--color-border-hover)',
                boxShadow: '0 0 40px var(--color-glow), inset 0 1px 0 rgba(255,255,255,0.03)',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <div style={{ position: 'absolute', top: 0, right: 0, width: 300, height: 200, background: 'radial-gradient(circle, var(--color-glow), transparent 70%)', opacity: 0.6, pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)', boxShadow: '0 0 8px var(--color-glow)' }} />
                            {eyebrow}
                        </span>
                        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', margin: 0 }}>
                            {title}
                        </h1>
                        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 600, lineHeight: 1.5 }}>
                            {description}
                        </p>
                    </div>
                    {actions && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {actions}
                        </div>
                    )}
                </div>
                {children}
            </div>
        </section>
    )
}

export function SuperadminPanel({
    title,
    description,
    actions,
    tone = 'primary',
    children,
    className,
}: {
    title: string
    description?: string
    actions?: React.ReactNode
    tone?: AccentTone
    children: React.ReactNode
    className?: string
}) {
    return (
        <section
            className={cn(className)}
            style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 16,
                overflow: 'hidden',
                transition: 'border-color 200ms ease, box-shadow 200ms ease',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
                        {title}
                    </h2>
                    {description && (
                        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                            {description}
                        </p>
                    )}
                </div>
                {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{actions}</div>}
            </div>
            <div style={{ padding: 20 }}>{children}</div>
        </section>
    )
}

export function SuperadminMetricCard({
    icon: Icon,
    label,
    value,
    hint,
    tone = 'primary',
    trend,
}: {
    icon: LucideIcon
    label: string
    value: string
    hint?: string
    tone?: AccentTone
    trend?: React.ReactNode
}) {
    return (
        <article
            style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 14,
                padding: '18px 20px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 200ms ease, transform 200ms ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Icon style={{ width: 18, height: 18, color: 'var(--color-accent)', opacity: 0.8 }} />
                {trend && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', background: 'var(--color-surface-elevated)', padding: '2px 8px', borderRadius: 6 }}>
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                    {label}
                </p>
                <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', lineHeight: 1 }}>
                    {value}
                </p>
                {hint && (
                    <p style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', marginTop: 6 }}>
                        {hint}
                    </p>
                )}
            </div>
        </article>
    )
}

export function SuperadminToolbar({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                'relative flex flex-col gap-sm rounded-[calc(var(--radius-xl)*1.4)]',
                'bg-surface/25 p-md backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between',
                className
            )}
        >
            <div className="relative flex w-full flex-col gap-sm lg:flex-row lg:items-center lg:justify-between">
                {children}
            </div>
        </div>
    )
}

export function SuperadminSegmentedControl<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T
    onChange: (value: T) => void
    options: Array<{ value: T; label: string }>
}) {
    return (
        <div className="inline-flex flex-wrap items-center gap-xs rounded-full bg-background/40 p-1">
            {options.map((option) => {
                const isActive = option.value === value

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'rounded-full px-md py-xs text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-[var(--duration-fast)]',
                            isActive
                                ? 'bg-primary text-textInverse shadow-[var(--shadow-md)]'
                                : 'text-textSecondary hover:bg-surface/50 hover:text-textPrimary'
                        )}
                    >
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}

export function SuperadminInputShell({
    icon,
    children,
    className,
}: {
    icon?: React.ReactNode
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn(
            'flex min-h-11 items-center gap-sm rounded-[calc(var(--radius-lg)*1.2)] border border-border/30 bg-background/40 px-md',
            'transition-all duration-[var(--duration-fast)] focus-within:border-borderFocus focus-within:shadow-[var(--shadow-glow)]',
            className
        )}>
            {icon && <span className="text-textTertiary">{icon}</span>}
            <div className="flex-1">{children}</div>
        </div>
    )
}

export function SuperadminButton({
    icon: Icon,
    children,
    tone = 'secondary',
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon?: LucideIcon
    tone?: 'primary' | 'secondary' | 'ghost'
}) {
    const toneClassName = tone === 'primary'
        ? 'bg-primary text-textInverse hover:opacity-90'
        : tone === 'ghost'
            ? 'bg-transparent text-textSecondary hover:bg-surface/40 hover:text-textPrimary'
            : 'bg-surface/50 text-textPrimary border border-border/30 hover:bg-surface/70'

    return (
        <button
            type="button"
            className={cn(
                'inline-flex items-center justify-center gap-xs rounded-[calc(var(--radius-lg)*1.2)] px-md py-sm text-sm font-medium',
                'transition-all duration-[var(--duration-fast)] hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50',
                toneClassName,
                className
            )}
            {...props}
        >
            {Icon && <Icon className="h-4 w-4" />}
            {children}
        </button>
    )
}

export function SuperadminEmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon?: LucideIcon
    title: string
    description: string
    action?: React.ReactNode
}) {
    const EmptyIcon = Icon || AlertTriangle

    return (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-[var(--radius-xl)] bg-surface/15 px-lg py-xl text-center">
            <div className="mb-md text-textTertiary opacity-60">
                <EmptyIcon className="h-8 w-8" />
            </div>
            <div className="max-w-md space-y-sm">
                <h3 className="text-lg font-semibold text-textPrimary">{title}</h3>
                <p className="text-sm leading-relaxed text-textSecondary">{description}</p>
            </div>
            {action && <div className="mt-lg">{action}</div>}
        </div>
    )
}

export function SuperadminErrorState({
    title,
    description,
    action,
}: {
    title: string
    description: string
    action?: React.ReactNode
}) {
    return (
        <div className="rounded-[var(--radius-xl)] bg-surface p-lg">
            <div className="flex items-start gap-md">
                <div className="text-error opacity-70">
                    <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-xs">
                    <h3 className="text-base font-semibold text-textPrimary">{title}</h3>
                    <p className="text-sm leading-relaxed text-textSecondary">{description}</p>
                    {action && <div className="pt-sm">{action}</div>}
                </div>
            </div>
        </div>
    )
}

export function SuperadminLoadingState({
    label,
}: {
    label: string
}) {
    return (
        <div className="flex min-h-[26rem] items-center justify-center">
            <div className="flex flex-col items-center gap-md">
                <div className="relative h-14 w-14">
                    <div className="absolute inset-0 rounded-full bg-surface/30" />
                    <div className="absolute inset-[6px] rounded-full border border-border border-t-primary animate-spin" />
                    <div className="absolute inset-[14px] rounded-full bg-surfaceElevated blur-md" />
                </div>
                <p className="text-sm font-medium tracking-[0.18em] uppercase text-textSecondary">
                    {label}
                </p>
            </div>
        </div>
    )
}

export function SuperadminBadge({
    children,
    tone = 'primary',
    className,
}: {
    children: React.ReactNode
    tone?: AccentTone
    className?: string
}) {
    return (
        <span className={cn(
            'inline-flex items-center gap-xs rounded-full px-sm py-[0.35rem] text-xs font-semibold uppercase tracking-[0.16em]',
            toneText[tone],
            toneBg[tone],
            className
        )}>
            {children}
        </span>
    )
}

export function SuperadminConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    tone = 'danger',
}: {
    open: boolean
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
    onCancel: () => void
    tone?: AccentTone
}) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm" onClick={onCancel}>
            <div className="flex min-h-full items-center justify-center p-lg">
                <div
                    className="w-full max-w-md rounded-[var(--radius-xl)] border border-border/30 bg-surface/90 p-lg shadow-[var(--shadow-xl)] backdrop-blur-xl"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="flex items-start gap-md">
                        <div className={cn('opacity-70', toneText[tone])}>
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-textPrimary">{title}</h3>
                            <p className="mt-sm text-sm leading-relaxed text-textSecondary">{description}</p>
                        </div>
                    </div>
                    <div className="mt-lg flex justify-end gap-sm">
                        <SuperadminButton tone="ghost" onClick={onCancel}>
                            {cancelLabel}
                        </SuperadminButton>
                        <SuperadminButton tone="primary" onClick={onConfirm}>
                            {confirmLabel}
                        </SuperadminButton>
                    </div>
                </div>
            </div>
        </div>
    )
}
