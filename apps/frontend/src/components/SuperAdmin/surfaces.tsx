'use client'

import React from 'react'
import { AlertTriangle, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type AccentTone = 'primary' | 'info' | 'success' | 'warning' | 'accent' | 'danger'

const toneStyles: Record<AccentTone, string> = {
    primary: 'text-primary border-primary/20 bg-primary/10',
    info: 'text-info border-info/20 bg-info/10',
    success: 'text-success border-success/20 bg-success/10',
    warning: 'text-warning border-warning/20 bg-warning/10',
    accent: 'text-accent border-accent/20 bg-accent/10',
    danger: 'text-error border-error/20 bg-error/10',
}

const toneGlowStyles: Record<AccentTone, React.CSSProperties> = {
    primary: { boxShadow: '0 0 0 1px rgba(var(--color-accent-rgb), 0.08), 0 24px 80px -42px rgba(var(--color-accent-rgb), 0.38)' },
    info: { boxShadow: '0 0 0 1px rgba(var(--color-info-rgb), 0.08), 0 24px 80px -42px rgba(var(--color-info-rgb), 0.28)' },
    success: { boxShadow: '0 0 0 1px rgba(var(--color-success-rgb), 0.08), 0 24px 80px -42px rgba(var(--color-success-rgb), 0.28)' },
    warning: { boxShadow: '0 0 0 1px rgba(var(--color-warning-rgb), 0.08), 0 24px 80px -42px rgba(var(--color-warning-rgb), 0.28)' },
    accent: { boxShadow: '0 0 0 1px rgba(var(--color-accent-rgb), 0.08), 0 24px 80px -42px rgba(var(--color-accent-rgb), 0.34)' },
    danger: { boxShadow: '0 0 0 1px rgba(var(--color-error-rgb), 0.08), 0 24px 80px -42px rgba(var(--color-error-rgb), 0.28)' },
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
            className={cn(
                'relative overflow-hidden rounded-[calc(var(--radius-xl)*1.8)] border border-border/80',
                'bg-surface/80 backdrop-blur-xl'
            )}
            style={{
                boxShadow: '0 20px 80px -56px var(--color-shadow)',
                backgroundImage: `
                    radial-gradient(circle at top left, rgba(var(--color-accent-rgb), 0.14), transparent 32%),
                    radial-gradient(circle at top right, rgba(var(--color-info-rgb), 0.08), transparent 28%),
                    linear-gradient(180deg, rgba(var(--color-surface-rgb), 0.94), rgba(var(--color-background-rgb), 0.92))
                `,
            }}
        >
            <div className="pointer-events-none absolute inset-0 opacity-60">
                <div className="absolute -left-16 top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute right-10 top-0 h-32 w-32 rounded-full bg-info/10 blur-3xl" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            <div className="relative flex flex-col gap-lg px-xl py-xl lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl space-y-md">
                    <div className="inline-flex items-center gap-xs rounded-full border border-border bg-background/70 px-sm py-xs text-[11px] font-semibold uppercase tracking-[0.24em] text-textSecondary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        {eyebrow}
                    </div>
                    <div className="space-y-sm">
                        <h1 className="text-3xl font-bold tracking-tight text-textPrimary lg:text-4xl">
                            {title}
                        </h1>
                        <p className="max-w-2xl text-base leading-relaxed text-textSecondary">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>

                {actions && (
                    <div className="flex flex-wrap items-center gap-sm lg:justify-end">
                        {actions}
                    </div>
                )}
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
            className={cn(
                'group relative overflow-x-hidden rounded-[calc(var(--radius-xl)*1.6)] border border-border/80',
                'bg-surface/85 backdrop-blur-xl transition-all duration-[var(--duration-normal)]',
                'hover:-translate-y-[1px] hover:border-borderHover',
                className
            )}
            style={toneGlowStyles[tone]}
        >
            <div className={cn('pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-70', toneStyles[tone])} />
            <div className="relative flex items-start justify-between gap-md border-b border-border/70 px-lg py-md">
                <div className="space-y-xs">
                    <h2 className="text-lg font-semibold tracking-tight text-textPrimary">
                        {title}
                    </h2>
                    {description && (
                        <p className="text-sm leading-relaxed text-textSecondary">
                            {description}
                        </p>
                    )}
                </div>
                {actions && <div className="flex shrink-0 items-center gap-xs">{actions}</div>}
            </div>
            <div className="relative px-lg py-lg">{children}</div>
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
            className={cn(
                'group relative overflow-hidden rounded-[calc(var(--radius-xl)*1.4)] border border-border/80',
                'bg-surface/85 p-lg backdrop-blur-xl transition-all duration-[var(--duration-normal)]',
                'hover:-translate-y-1 hover:border-borderHover'
            )}
            style={toneGlowStyles[tone]}
        >
            <div className="pointer-events-none absolute inset-0 opacity-70">
                <div className={cn('absolute left-0 top-0 h-full w-full bg-gradient-to-br from-current/10 via-transparent to-transparent', toneStyles[tone])} />
                <div className="absolute -right-12 top-6 h-24 w-24 rounded-full bg-background/70 blur-3xl" />
            </div>

            <div className="relative space-y-md">
                <div className="flex items-start justify-between gap-sm">
                    <div className={cn('inline-flex h-11 w-11 items-center justify-center rounded-2xl border', toneStyles[tone])}>
                        <Icon className="h-5 w-5" />
                    </div>
                    {trend && (
                        <div className="rounded-full border border-border bg-background/75 px-sm py-xs text-xs font-medium text-textSecondary">
                            {trend}
                        </div>
                    )}
                </div>

                <div className="space-y-xs">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-textTertiary">
                        {label}
                    </p>
                    <p className="text-3xl font-bold tracking-tight text-textPrimary">
                        {value}
                    </p>
                    {hint && (
                        <p className="text-sm leading-relaxed text-textSecondary">
                            {hint}
                        </p>
                    )}
                </div>
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
                'relative flex flex-col gap-sm rounded-[calc(var(--radius-xl)*1.4)] border border-border/80',
                'bg-surface/80 p-md backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between',
                className
            )}
            style={{
                boxShadow: '0 16px 64px -48px var(--color-shadow)',
            }}
        >
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
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
        <div className="inline-flex flex-wrap items-center gap-xs rounded-full border border-border bg-background/75 p-1">
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
                                : 'text-textSecondary hover:bg-surface hover:text-textPrimary'
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
            'flex min-h-11 items-center gap-sm rounded-[calc(var(--radius-lg)*1.2)] border border-border/80 bg-background/75 px-md',
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
            ? 'bg-transparent text-textSecondary hover:bg-surface hover:text-textPrimary'
            : 'bg-surface text-textPrimary border border-border hover:bg-surfaceHover'

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
        <div className="flex min-h-72 flex-col items-center justify-center rounded-[calc(var(--radius-xl)*1.5)] border border-dashed border-border bg-background/70 px-lg py-xl text-center">
            <div className="mb-md inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface text-textSecondary">
                <EmptyIcon className="h-6 w-6" />
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
        <div className="rounded-[calc(var(--radius-xl)*1.5)] border border-error/20 bg-error/5 p-lg">
            <div className="flex items-start gap-md">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-error/20 bg-error/10 text-error">
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
                    <div className="absolute inset-0 rounded-full border border-border bg-surface" />
                    <div className="absolute inset-[6px] rounded-full border border-primary/20 border-t-primary animate-spin" />
                    <div className="absolute inset-[14px] rounded-full bg-primary/10 blur-md" />
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
            'inline-flex items-center gap-xs rounded-full border px-sm py-[0.35rem] text-xs font-semibold uppercase tracking-[0.16em]',
            toneStyles[tone],
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
                    className="w-full max-w-md rounded-[calc(var(--radius-xl)*1.5)] border border-border bg-surface/95 p-lg shadow-[var(--shadow-xl)] backdrop-blur-xl"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="flex items-start gap-md">
                        <div className={cn('inline-flex h-12 w-12 items-center justify-center rounded-2xl border', toneStyles[tone])}>
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
