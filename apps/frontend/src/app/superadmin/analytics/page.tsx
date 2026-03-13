'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Activity,
    BarChart3,
    Building2,
    Download,
    RefreshCw,
    Sparkles,
    TrendingUp,
    Users,
    Waves,
    Zap,
    Database,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'
import { formatCompact } from '@/lib/utils'
import {
    SuperadminBadge,
    SuperadminButton,
    SuperadminEmptyState,
    SuperadminErrorState,
    SuperadminLoadingState,
    SuperadminMetricCard,
    SuperadminPageHero,
    SuperadminPanel,
    SuperadminSegmentedControl,
    SuperadminToolbar,
} from '@/components/SuperAdmin/surfaces'

type AnalyticsRange = '24h' | '7d' | '30d' | '90d'

interface AnalyticsData {
    bucket_key: string
    period: string
    total_runs: number
    total_orgs: number
    active_users: number
    kb_uploads: number
    api_calls: number
}

interface PlatformMetrics {
    total_organizations: number
    total_users: number
    total_runs_today: number
    total_runs_this_month: number
    avg_runs_per_org: number
    most_active_org: string
    total_api_calls: number
    total_kb_uploads: number
    run_growth_percent: number
    org_activation_rate: number
}

const RANGE_OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
]

function formatPercentage(value: number) {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

export default function AnalyticsPage() {
    const { fetchWithAuth } = useSuperadminAuth()
    const [analytics, setAnalytics] = useState<AnalyticsData[]>([])
    const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
    const [timeRange, setTimeRange] = useState<AnalyticsRange>('7d')
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadData = useCallback(async (refreshing = false) => {
        if (refreshing) {
            setIsRefreshing(true)
        } else {
            setIsLoading(true)
        }

        try {
            setError(null)

            const [analyticsResponse, metricsResponse] = await Promise.all([
                fetchWithAuth(`/api/superadmin/analytics?range=${timeRange}`),
                fetchWithAuth('/api/superadmin/analytics/metrics'),
            ])

            if (!analyticsResponse.ok || !metricsResponse.ok) {
                const analyticsPayload = analyticsResponse.ok ? null : await analyticsResponse.json().catch(() => null)
                const metricsPayload = metricsResponse.ok ? null : await metricsResponse.json().catch(() => null)
                throw new Error(
                    analyticsPayload?.error ||
                    metricsPayload?.error ||
                    'Unable to load platform analytics'
                )
            }

            const [analyticsPayload, metricsPayload] = await Promise.all([
                analyticsResponse.json(),
                metricsResponse.json(),
            ])

            setAnalytics(analyticsPayload.analytics || [])
            setMetrics(metricsPayload.metrics || null)
        } catch (loadError: any) {
            console.error('Failed to load analytics:', loadError)
            setError(loadError?.message || 'Unable to load analytics')
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }, [fetchWithAuth, timeRange])

    useEffect(() => {
        loadData()
    }, [loadData])

    const totalSeriesRuns = useMemo(
        () => analytics.reduce((sum, point) => sum + point.total_runs, 0),
        [analytics]
    )
    const peakRunValue = useMemo(
        () => Math.max(...analytics.map((point) => point.total_runs), 1),
        [analytics]
    )
    const peakApiValue = useMemo(
        () => Math.max(...analytics.map((point) => point.api_calls), 1),
        [analytics]
    )
    const topActivityPoint = useMemo(
        () => [...analytics].sort((left, right) => right.total_runs - left.total_runs)[0] || null,
        [analytics]
    )

    const operationalSignals = useMemo(() => {
        if (!metrics) return []

        return [
            {
                label: 'Execution Momentum',
                value: `${formatCompact(metrics.total_runs_this_month)} monthly runs`,
                helper: `${formatPercentage(metrics.run_growth_percent)} vs prior window`,
                tone: metrics.run_growth_percent >= 0 ? 'success' as const : 'warning' as const,
                progress: Math.min(Math.max(metrics.run_growth_percent + 50, 12), 100),
            },
            {
                label: 'Platform Adoption',
                value: `${metrics.org_activation_rate.toFixed(1)}% active orgs`,
                helper: `${metrics.total_organizations} orgs on the network`,
                tone: metrics.org_activation_rate >= 60 ? 'primary' as const : 'warning' as const,
                progress: Math.max(metrics.org_activation_rate, 8),
            },
            {
                label: 'Knowledge Velocity',
                value: `${formatCompact(metrics.total_kb_uploads)} KB ingests`,
                helper: 'Fresh knowledge entering the system this month',
                tone: 'accent' as const,
                progress: Math.min((metrics.total_kb_uploads / Math.max(metrics.total_organizations || 1, 1)) * 18, 100),
            },
            {
                label: 'AI Traffic',
                value: `${formatCompact(metrics.total_api_calls)} model calls`,
                helper: 'Inference traffic observed this month',
                tone: 'info' as const,
                progress: Math.min((metrics.total_api_calls / Math.max(metrics.total_runs_this_month || 1, 1)) * 12, 100),
            },
        ]
    }, [metrics])

    const exportSnapshot = useCallback(() => {
        if (!analytics.length || !metrics) {
            toast.error('No analytics snapshot available to export')
            return
        }

        const payload = {
            exported_at: new Date().toISOString(),
            range: timeRange,
            metrics,
            analytics,
        }

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `platform-analytics-${timeRange}.json`
        anchor.click()
        URL.revokeObjectURL(url)
        toast.success('Analytics snapshot exported')
    }, [analytics, metrics, timeRange])

    if (isLoading) {
        return <SuperadminLoadingState label="Loading Analytics" />
    }

    if (error && !analytics.length && !metrics) {
        return (
            <SuperadminErrorState
                title="Analytics failed to load"
                description={error}
                action={(
                    <SuperadminButton icon={RefreshCw} onClick={() => loadData()}>
                        Retry analytics sync
                    </SuperadminButton>
                )}
            />
        )
    }

    return (
        <div className="space-y-lg">
            <SuperadminPageHero
                eyebrow="Platform Command"
                title="Analytics Command Center"
                description="A live, theme-aware observability layer for platform demand, knowledge velocity, organizational activation, and AI execution flow."
                actions={(
                    <>
                        <SuperadminButton
                            icon={RefreshCw}
                            onClick={() => loadData(true)}
                            className={isRefreshing ? 'pointer-events-none' : undefined}
                        >
                            {isRefreshing ? 'Refreshing' : 'Refresh'}
                        </SuperadminButton>
                        <SuperadminButton tone="primary" icon={Download} onClick={exportSnapshot}>
                            Export Snapshot
                        </SuperadminButton>
                    </>
                )}
            >
                <div className="flex flex-wrap items-center gap-sm">
                    <SuperadminBadge tone="success">
                        <Sparkles className="h-3.5 w-3.5" />
                        Live superadmin telemetry
                    </SuperadminBadge>
                    {metrics && (
                        <SuperadminBadge tone="primary">
                            <TrendingUp className="h-3.5 w-3.5" />
                            {formatPercentage(metrics.run_growth_percent)} execution momentum
                        </SuperadminBadge>
                    )}
                    {topActivityPoint && (
                        <SuperadminBadge tone="info">
                            <Waves className="h-3.5 w-3.5" />
                            Peak window: {topActivityPoint.period}
                        </SuperadminBadge>
                    )}
                </div>
            </SuperadminPageHero>

            <SuperadminToolbar>
                <div className="flex flex-col gap-xs">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">
                        Time window
                    </p>
                    <SuperadminSegmentedControl
                        value={timeRange}
                        onChange={setTimeRange}
                        options={RANGE_OPTIONS}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-sm text-sm text-textSecondary">
                    <span className="rounded-full border border-border bg-background/70 px-sm py-xs">
                        {analytics.length} observed intervals
                    </span>
                    <span className="rounded-full border border-border bg-background/70 px-sm py-xs">
                        {formatCompact(totalSeriesRuns)} tracked executions
                    </span>
                    {metrics && (
                        <span className="rounded-full border border-border bg-background/70 px-sm py-xs">
                            {metrics.total_runs_today} runs today
                        </span>
                    )}
                </div>
            </SuperadminToolbar>

            {metrics && (
                <div className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-3">
                    <SuperadminMetricCard
                        icon={Building2}
                        label="Organizations"
                        value={formatCompact(metrics.total_organizations)}
                        hint={`${metrics.org_activation_rate.toFixed(1)}% currently active`}
                        tone="primary"
                    />
                    <SuperadminMetricCard
                        icon={Users}
                        label="Users"
                        value={formatCompact(metrics.total_users)}
                        hint="Registered users across every organization"
                        tone="info"
                    />
                    <SuperadminMetricCard
                        icon={Zap}
                        label="Runs Today"
                        value={formatCompact(metrics.total_runs_today)}
                        hint={`${formatCompact(metrics.total_runs_this_month)} executions this month`}
                        tone="success"
                        trend={formatPercentage(metrics.run_growth_percent)}
                    />
                    <SuperadminMetricCard
                        icon={BarChart3}
                        label="Runs Per Org"
                        value={metrics.avg_runs_per_org.toFixed(1)}
                        hint="Average execution density across active orgs"
                        tone="accent"
                    />
                    <SuperadminMetricCard
                        icon={Database}
                        label="Knowledge Uploads"
                        value={formatCompact(metrics.total_kb_uploads)}
                        hint="KB ingestion events captured this month"
                        tone="warning"
                    />
                    <SuperadminMetricCard
                        icon={Activity}
                        label="AI Calls"
                        value={formatCompact(metrics.total_api_calls)}
                        hint={`Most active organization: ${metrics.most_active_org}`}
                        tone="info"
                    />
                </div>
            )}

            <div className="grid grid-cols-1 gap-md xl:grid-cols-[1.55fr_1fr]">
                <SuperadminPanel
                    title="Execution Pulse"
                    description="Every interval is rendered as a bespoke telemetry bar with layered run and API intensity, making traffic patterns easy to read at a glance."
                    tone="primary"
                >
                    {analytics.length === 0 ? (
                        <SuperadminEmptyState
                            icon={BarChart3}
                            title="No analytics windows yet"
                            description="Once execution and usage events begin flowing, this panel will render a high-fidelity pulse of platform demand."
                        />
                    ) : (
                        <div className="space-y-sm">
                            {analytics.map((point, index) => {
                                const runWidth = `${Math.max((point.total_runs / peakRunValue) * 100, point.total_runs > 0 ? 8 : 0)}%`
                                const apiWidth = `${Math.max((point.api_calls / peakApiValue) * 100, point.api_calls > 0 ? 6 : 0)}%`

                                return (
                                    <div
                                        key={point.bucket_key || `${point.period}-${index}`}
                                        className="group rounded-[calc(var(--radius-lg)*1.3)] border border-border/70 bg-background/70 p-md transition-all duration-[var(--duration-fast)] hover:border-borderHover hover:bg-background"
                                    >
                                        <div className="mb-sm flex flex-wrap items-center justify-between gap-sm">
                                            <div className="flex items-center gap-sm">
                                                <span className="text-sm font-semibold text-textPrimary">{point.period}</span>
                                                <span className="text-xs uppercase tracking-[0.18em] text-textTertiary">
                                                    {point.total_orgs} orgs active
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-xs text-xs text-textSecondary">
                                                <span className="rounded-full border border-border bg-surface px-sm py-xs">
                                                    {point.total_runs} runs
                                                </span>
                                                <span className="rounded-full border border-border bg-surface px-sm py-xs">
                                                    {point.api_calls} API
                                                </span>
                                                <span className="rounded-full border border-border bg-surface px-sm py-xs">
                                                    {point.kb_uploads} KB
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-xs">
                                            <div className="relative h-3 overflow-hidden rounded-full bg-surfaceHover">
                                                <div
                                                    className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500"
                                                    style={{ width: runWidth }}
                                                />
                                                <div
                                                    className="absolute inset-y-[3px] left-0 rounded-full bg-info/70 transition-all duration-500"
                                                    style={{ width: apiWidth }}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-xs text-xs text-textSecondary md:grid-cols-4">
                                                <span>Executions: {point.total_runs}</span>
                                                <span>Organizations: {point.total_orgs}</span>
                                                <span>Active users: {point.active_users}</span>
                                                <span>Knowledge ingests: {point.kb_uploads}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </SuperadminPanel>

                <SuperadminPanel
                    title="Operational Signals"
                    description="Derived indicators built from real data, not placeholder health bars."
                    tone="accent"
                >
                    <div className="space-y-sm">
                        {operationalSignals.map((signal) => (
                            <div
                                key={signal.label}
                                className="rounded-[calc(var(--radius-lg)*1.25)] border border-border/70 bg-background/70 p-md"
                            >
                                <div className="mb-sm flex items-start justify-between gap-md">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">
                                            {signal.label}
                                        </p>
                                        <p className="mt-xs text-base font-semibold text-textPrimary">
                                            {signal.value}
                                        </p>
                                    </div>
                                    <SuperadminBadge tone={signal.tone}>{signal.helper}</SuperadminBadge>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-surfaceHover">
                                    <div
                                        className={signal.tone === 'success'
                                            ? 'h-full rounded-full bg-success transition-all duration-500'
                                            : signal.tone === 'warning'
                                                ? 'h-full rounded-full bg-warning transition-all duration-500'
                                                : signal.tone === 'info'
                                                    ? 'h-full rounded-full bg-info transition-all duration-500'
                                                    : signal.tone === 'accent'
                                                        ? 'h-full rounded-full bg-accent transition-all duration-500'
                                                        : 'h-full rounded-full bg-primary transition-all duration-500'}
                                        style={{ width: `${Math.max(signal.progress, 8)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </SuperadminPanel>
            </div>

            <div className="grid grid-cols-1 gap-md xl:grid-cols-[1.1fr_0.9fr]">
                <SuperadminPanel
                    title="Window Ledger"
                    description="A compact ranked ledger showing which windows generated the strongest execution density."
                    tone="info"
                >
                    <div className="space-y-xs">
                        {[...analytics]
                            .sort((left, right) => right.total_runs - left.total_runs)
                            .slice(0, 6)
                            .map((point, index) => (
                                <div
                                    key={`${point.bucket_key}-ledger`}
                                    className="flex items-center justify-between gap-sm rounded-[calc(var(--radius-lg)*1.2)] border border-border/70 bg-background/70 px-md py-sm"
                                >
                                    <div className="flex items-center gap-sm">
                                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-surface text-sm font-semibold text-textPrimary">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-textPrimary">{point.period}</p>
                                            <p className="text-xs text-textSecondary">
                                                {point.total_orgs} orgs, {point.active_users} active users
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-textPrimary">{point.total_runs} runs</p>
                                        <p className="text-xs text-textSecondary">{point.api_calls} API calls</p>
                                    </div>
                                </div>
                            ))}
                    </div>
                </SuperadminPanel>

                <SuperadminPanel
                    title="Narrative Readout"
                    description="A human-readable summary of what the platform is signaling right now."
                    tone="warning"
                >
                    <div className="grid gap-sm">
                        <div className="rounded-[calc(var(--radius-lg)*1.25)] border border-border/70 bg-background/70 p-md">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">Most active organization</p>
                            <p className="mt-sm text-xl font-semibold text-textPrimary">
                                {metrics?.most_active_org || 'No activity yet'}
                            </p>
                        </div>
                        <div className="rounded-[calc(var(--radius-lg)*1.25)] border border-border/70 bg-background/70 p-md">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">Current read</p>
                            <p className="mt-sm text-sm leading-relaxed text-textSecondary">
                                {metrics
                                    ? `The platform is carrying ${formatCompact(metrics.total_runs_this_month)} executions this month across ${metrics.total_organizations} organizations, with ${formatCompact(metrics.total_api_calls)} AI calls and ${formatCompact(metrics.total_kb_uploads)} knowledge ingests shaping demand.`
                                    : 'Telemetry snapshot unavailable.'}
                            </p>
                        </div>
                        {error && (
                            <div className="rounded-[calc(var(--radius-lg)*1.25)] border border-warning/20 bg-warning/5 p-md text-sm text-textSecondary">
                                Partial refresh issue: {error}
                            </div>
                        )}
                    </div>
                </SuperadminPanel>
            </div>
        </div>
    )
}
