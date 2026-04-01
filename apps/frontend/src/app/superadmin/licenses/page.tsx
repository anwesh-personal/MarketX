'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Calendar,
    DollarSign,
    Download,
    Eye,
    FileText,
    Plus,
    RefreshCw,
    Search,
    TrendingDown,
    TrendingUp,
    UserCircle2,
    Wallet,
    Waves,
    X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'
import { formatCompact } from '@/lib/utils'
import {
    SuperadminBadge,
    SuperadminButton,
    SuperadminEmptyState,
    SuperadminErrorState,
    SuperadminInputShell,
    SuperadminLoadingState,
    SuperadminMetricCard,
    SuperadminPageHero,
    SuperadminPanel,
    SuperadminToolbar,
} from '@/components/SuperAdmin/surfaces'

interface LicenseTransaction {
    id: string
    org_id: string | null
    org_name: string
    transaction_type: string
    from_tier: string | null
    to_tier: string | null
    price_usd: number | null
    quota_changes: Record<string, unknown> | null
    notes: string | null
    created_at: string
    admin_email: string
}

interface LicenseStats {
    total_transactions: number
    total_revenue: number
    upgrades_count: number
    downgrades_count: number
    active_paid_orgs: number
    mrr: number
    new_organizations: number
    average_contract_value: number
}

const FILTER_OPTIONS = [
    { value: 'all', label: 'All activity' },
    { value: 'created', label: 'New orgs' },
    { value: 'upgraded', label: 'Upgrades' },
    { value: 'downgraded', label: 'Downgrades' },
    { value: 'deleted', label: 'Deleted' },
]

function formatCurrency(value: number | null | undefined) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: value && value < 100 ? 2 : 0,
    }).format(value || 0)
}

function formatTierLabel(value: string | null) {
    if (!value) return 'None'
    return value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function getTransactionPresentation(type: string) {
    switch (type) {
        case 'upgraded':
            return {
                icon: TrendingUp,
                tone: 'success' as const,
                label: 'Upgrade',
            }
        case 'downgraded':
            return {
                icon: TrendingDown,
                tone: 'warning' as const,
                label: 'Downgrade',
            }
        case 'created':
            return {
                icon: Plus,
                tone: 'info' as const,
                label: 'Created',
            }
        case 'deleted':
            return {
                icon: FileText,
                tone: 'danger' as const,
                label: 'Deleted',
            }
        default:
            return {
                icon: Waves,
                tone: 'primary' as const,
                label: formatTierLabel(type),
            }
    }
}

export default function LicensesPage() {
    const { fetchWithAuth } = useSuperadminAuth()
    const [transactions, setTransactions] = useState<LicenseTransaction[]>([])
    const [stats, setStats] = useState<LicenseStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState('all')
    const [selectedTransaction, setSelectedTransaction] = useState<LicenseTransaction | null>(null)
    const [error, setError] = useState<string | null>(null)

    const loadData = useCallback(async (refreshing = false) => {
        if (refreshing) {
            setIsRefreshing(true)
        } else {
            setIsLoading(true)
        }

        try {
            setError(null)

            const [transactionsResponse, statsResponse] = await Promise.all([
                fetchWithAuth('/api/superadmin/licenses/transactions'),
                fetchWithAuth('/api/superadmin/licenses/stats'),
            ])

            if (!transactionsResponse.ok || !statsResponse.ok) {
                const transactionPayload = transactionsResponse.ok ? null : await transactionsResponse.json().catch(() => null)
                const statsPayload = statsResponse.ok ? null : await statsResponse.json().catch(() => null)
                throw new Error(
                    transactionPayload?.error ||
                    statsPayload?.error ||
                    'Unable to load license operations'
                )
            }

            const [transactionPayload, statsPayload] = await Promise.all([
                transactionsResponse.json(),
                statsResponse.json(),
            ])

            setTransactions(transactionPayload.transactions || [])
            setStats(statsPayload.stats || null)
        } catch (loadError: any) {
            console.error('Failed to load license data:', loadError)
            setError(loadError?.message || 'Unable to load license data')
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }, [fetchWithAuth])

    useEffect(() => {
        loadData()
    }, [loadData])

    const filteredTransactions = useMemo(() => {
        return transactions.filter((transaction) => {
            const haystack = [
                transaction.org_name,
                transaction.transaction_type,
                transaction.admin_email,
                transaction.from_tier || '',
                transaction.to_tier || '',
            ].join(' ').toLowerCase()

            const matchesSearch = haystack.includes(searchQuery.toLowerCase())
            const matchesFilter = filterType === 'all' || transaction.transaction_type === filterType

            return matchesSearch && matchesFilter
        })
    }, [transactions, searchQuery, filterType])

    const highlightedTransactions = useMemo(
        () => filteredTransactions.slice(0, 5),
        [filteredTransactions]
    )

    const upgradeRate = useMemo(() => {
        if (!stats) return 0
        const totalDirectional = stats.upgrades_count + stats.downgrades_count
        if (totalDirectional === 0) return 0
        return (stats.upgrades_count / totalDirectional) * 100
    }, [stats])

    const exportTransactions = useCallback(() => {
        if (!filteredTransactions.length) {
            toast.error('No transactions available to export')
            return
        }

        const rows = [
            ['Date', 'Organization', 'Type', 'From Tier', 'To Tier', 'Amount USD', 'Admin Email'],
            ...filteredTransactions.map((transaction) => [
                new Date(transaction.created_at).toISOString(),
                transaction.org_name,
                transaction.transaction_type,
                transaction.from_tier || '',
                transaction.to_tier || '',
                transaction.price_usd?.toString() || '',
                transaction.admin_email,
            ]),
        ]

        const csv = rows
            .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
            .join('\n')

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'license-operations.csv'
        anchor.click()
        URL.revokeObjectURL(url)
        toast.success('Transaction export ready')
    }, [filteredTransactions])

    if (isLoading) {
        return <SuperadminLoadingState label="Loading License Ops" />
    }

    if (error && !transactions.length && !stats) {
        return (
            <SuperadminErrorState
                title="License operations failed to load"
                description={error}
                action={(
                    <SuperadminButton icon={RefreshCw} onClick={() => loadData()}>
                        Retry sync
                    </SuperadminButton>
                )}
            />
        )
    }

    return (
        <>
            <div className="space-y-lg">
                <SuperadminPageHero
                    eyebrow="Revenue Control"
                    title="License Operations Ledger"
                    description="A bespoke operational cockpit for revenue movement, plan migration, and organization lifecycle changes across the platform."
                    actions={(
                        <>
                            <SuperadminButton icon={RefreshCw} onClick={() => loadData(true)}>
                                {isRefreshing ? 'Refreshing' : 'Refresh'}
                            </SuperadminButton>
                            <SuperadminButton tone="primary" icon={Download} onClick={exportTransactions}>
                                Export Ledger
                            </SuperadminButton>
                        </>
                    )}
                >
                    <div className="flex flex-wrap gap-sm">
                        <SuperadminBadge tone="success">
                            <DollarSign className="h-3.5 w-3.5" />
                            Revenue-aware operations
                        </SuperadminBadge>
                        {stats && (
                            <SuperadminBadge tone="primary">
                                <TrendingUp className="h-3.5 w-3.5" />
                                {upgradeRate.toFixed(0)}% upgrade win rate
                            </SuperadminBadge>
                        )}
                        <SuperadminBadge tone="info">
                            <Calendar className="h-3.5 w-3.5" />
                            {filteredTransactions.length} filtered records
                        </SuperadminBadge>
                    </div>
                </SuperadminPageHero>

                {stats && (
                    <div className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-4">
                        <SuperadminMetricCard
                            icon={DollarSign}
                            label="Revenue Captured"
                            value={formatCurrency(stats.total_revenue)}
                            hint={`${stats.total_transactions} recorded contract events`}
                            tone="success"
                        />
                        <SuperadminMetricCard
                            icon={Wallet}
                            label="Monthly Recurring"
                            value={formatCurrency(stats.mrr)}
                            hint={`${stats.active_paid_orgs} paid organizations live`}
                            tone="primary"
                        />
                        <SuperadminMetricCard
                            icon={TrendingUp}
                            label="Upgrade Pressure"
                            value={`${stats.upgrades_count}`}
                            hint={`${stats.downgrades_count} downgrades to balance against`}
                            tone="accent"
                            trend={`${upgradeRate.toFixed(0)}% win`}
                        />
                        <SuperadminMetricCard
                            icon={Plus}
                            label="New Organizations"
                            value={formatCompact(stats.new_organizations)}
                            hint={`Average contract value ${formatCurrency(stats.average_contract_value)}`}
                            tone="info"
                        />
                    </div>
                )}

                <SuperadminToolbar>
                    <div className="grid flex-1 gap-sm lg:grid-cols-[minmax(0,1fr)_220px]">
                        <SuperadminInputShell
                            icon={<Search className="h-4 w-4" />}
                        >
                            <input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search organization, type, admin, or tier"
                                className="w-full bg-transparent py-sm text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none"
                            />
                        </SuperadminInputShell>
                        <div className="rounded-[calc(var(--radius-lg)*1.2)] border border-border/80 bg-background/75 px-md">
                            <select
                                value={filterType}
                                onChange={(event) => setFilterType(event.target.value)}
                                className="h-11 w-full bg-transparent text-sm text-textPrimary focus:outline-none"
                            >
                                {FILTER_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-sm text-sm text-textSecondary">
                        <span className="rounded-full border border-border bg-background/70 px-sm py-xs">
                            {transactions.length} total records
                        </span>
                        {stats && (
                            <span className="rounded-full border border-border bg-background/70 px-sm py-xs">
                                {stats.active_paid_orgs} active paid orgs
                            </span>
                        )}
                    </div>
                </SuperadminToolbar>

                <div className="grid grid-cols-1 gap-md xl:grid-cols-[1.45fr_0.95fr]">
                    <SuperadminPanel
                        title="License Transaction Ledger"
                        description="High-detail ledger of plan movement, monetary impact, and operator attribution."
                        tone="primary"
                    >
                        {filteredTransactions.length === 0 ? (
                            <SuperadminEmptyState
                                icon={FileText}
                                title="No license activity found"
                                description={searchQuery || filterType !== 'all'
                                    ? 'Adjust your search or filter and the ledger will update instantly.'
                                    : 'As organizations upgrade, downgrade, or get provisioned, their commercial footprint will show up here.'}
                            />
                        ) : (
                            <div className="overflow-hidden rounded-[calc(var(--radius-lg)*1.3)] border border-border/70">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-border">
                                        <thead className="bg-background/80">
                                            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-textTertiary">
                                                <th className="px-md py-sm">Organization</th>
                                                <th className="px-md py-sm">Type</th>
                                                <th className="px-md py-sm">Tier Movement</th>
                                                <th className="px-md py-sm">Amount</th>
                                                <th className="px-md py-sm">Operator</th>
                                                <th className="px-md py-sm text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border bg-surface/60">
                                            {filteredTransactions.map((transaction) => {
                                                const presentation = getTransactionPresentation(transaction.transaction_type)
                                                const TransactionIcon = presentation.icon

                                                return (
                                                    <tr
                                                        key={transaction.id}
                                                        className="group transition-colors duration-[var(--duration-fast)] hover:bg-background/85"
                                                    >
                                                        <td className="px-md py-md">
                                                            <div className="space-y-xs">
                                                                <p className="text-sm font-semibold text-textPrimary">{transaction.org_name}</p>
                                                                <p className="text-xs text-textSecondary">
                                                                    {new Date(transaction.created_at).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-md py-md">
                                                            <SuperadminBadge tone={presentation.tone}>
                                                                <TransactionIcon className="h-3.5 w-3.5" />
                                                                {presentation.label}
                                                            </SuperadminBadge>
                                                        </td>
                                                        <td className="px-md py-md">
                                                            <div className="flex items-center gap-xs text-sm">
                                                                <span className="rounded-full border border-border bg-background px-sm py-xs text-textSecondary">
                                                                    {formatTierLabel(transaction.from_tier)}
                                                                </span>
                                                                <span className="text-textTertiary">→</span>
                                                                <span className="rounded-full border border-border bg-surfaceHover px-sm py-xs font-medium text-textPrimary">
                                                                    {formatTierLabel(transaction.to_tier)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-md py-md">
                                                            <span className="text-sm font-semibold text-textPrimary">
                                                                {transaction.price_usd ? formatCurrency(transaction.price_usd) : 'No charge'}
                                                            </span>
                                                        </td>
                                                        <td className="px-md py-md">
                                                            <div className="flex items-center gap-xs text-sm text-textSecondary">
                                                                <UserCircle2 className="h-4 w-4" />
                                                                <span>{transaction.admin_email}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-md py-md text-right">
                                                            <SuperadminButton
                                                                tone="ghost"
                                                                icon={Eye}
                                                                onClick={() => setSelectedTransaction(transaction)}
                                                            >
                                                                Inspect
                                                            </SuperadminButton>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </SuperadminPanel>

                    <div className="space-y-md">
                        <SuperadminPanel
                            title="Active Signals"
                            description="Fast read on the highest-signal commercial shifts inside the current filter set."
                            tone="accent"
                        >
                            <div className="space-y-sm">
                                {highlightedTransactions.length === 0 ? (
                                    <SuperadminEmptyState
                                        icon={Waves}
                                        title="No highlighted transactions"
                                        description="Once a filtered transaction set exists, the highest-signal records will surface here."
                                    />
                                ) : (
                                    highlightedTransactions.map((transaction) => {
                                        const presentation = getTransactionPresentation(transaction.transaction_type)
                                        const TransactionIcon = presentation.icon

                                        return (
                                            <button
                                                key={`${transaction.id}-signal`}
                                                type="button"
                                                onClick={() => setSelectedTransaction(transaction)}
                                                className="w-full rounded-[calc(var(--radius-lg)*1.25)] border border-border/70 bg-background/70 p-md text-left transition-all duration-[var(--duration-fast)] hover:-translate-y-px hover:border-borderHover"
                                            >
                                                <div className="mb-sm flex items-center justify-between gap-sm">
                                                    <SuperadminBadge tone={presentation.tone}>
                                                        <TransactionIcon className="h-3.5 w-3.5" />
                                                        {presentation.label}
                                                    </SuperadminBadge>
                                                    <span className="text-xs text-textTertiary">
                                                        {new Date(transaction.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-semibold text-textPrimary">
                                                    {transaction.org_name}
                                                </p>
                                                <p className="mt-xs text-sm text-textSecondary">
                                                    {formatTierLabel(transaction.from_tier)} to {formatTierLabel(transaction.to_tier)}
                                                </p>
                                                <p className="mt-sm text-xs uppercase tracking-[0.18em] text-textTertiary">
                                                    {transaction.price_usd ? formatCurrency(transaction.price_usd) : 'No direct charge logged'}
                                                </p>
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </SuperadminPanel>

                        <SuperadminPanel
                            title="Commercial Summary"
                            description="Derived from live transaction records and organization subscription state."
                            tone="warning"
                        >
                            <div className="space-y-sm">
                                <div className="rounded-[calc(var(--radius-lg)*1.25)] border border-border/70 bg-background/70 p-md">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">Current posture</p>
                                    <p className="mt-sm text-sm leading-relaxed text-textSecondary">
                                        {stats
                                            ? `The platform is carrying ${stats.active_paid_orgs} paid organizations with ${formatCurrency(stats.mrr)} in recurring monthly revenue and ${formatCurrency(stats.total_revenue)} captured across all tracked contract events.`
                                            : 'No commercial summary available.'}
                                    </p>
                                </div>
                                {error && (
                                    <div className="rounded-[calc(var(--radius-lg)*1.25)] border border-border bg-surface p-md text-sm text-textSecondary">
                                        Partial refresh issue: {error}
                                    </div>
                                )}
                            </div>
                        </SuperadminPanel>
                    </div>
                </div>
            </div>

            {selectedTransaction && (
                <div
                    className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm"
                    onClick={() => setSelectedTransaction(null)}
                >
                    <div className="absolute inset-y-0 right-0 w-full max-w-xl border-l border-border bg-surface/95 p-lg shadow-[var(--shadow-xl)] backdrop-blur-xl animate-slide-in-right">
                        <div
                            className="flex h-full flex-col"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="mb-lg flex items-start justify-between gap-md">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">
                                        Transaction detail
                                    </p>
                                    <h2 className="mt-sm text-2xl font-semibold text-textPrimary">
                                        {selectedTransaction.org_name}
                                    </h2>
                                    <p className="mt-xs text-sm text-textSecondary">
                                        {new Date(selectedTransaction.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <SuperadminButton tone="ghost" icon={X} onClick={() => setSelectedTransaction(null)}>
                                    Close
                                </SuperadminButton>
                            </div>

                            <div className="space-y-md overflow-y-auto pr-xs">
                                <div className="grid gap-sm md:grid-cols-2">
                                    <DetailCard label="Transaction Type" value={getTransactionPresentation(selectedTransaction.transaction_type).label} />
                                    <DetailCard label="Recorded Amount" value={selectedTransaction.price_usd ? formatCurrency(selectedTransaction.price_usd) : 'No charge'} />
                                    <DetailCard label="From Tier" value={formatTierLabel(selectedTransaction.from_tier)} />
                                    <DetailCard label="To Tier" value={formatTierLabel(selectedTransaction.to_tier)} />
                                </div>

                                <div className="rounded-[calc(var(--radius-lg)*1.25)] border border-border/70 bg-background/70 p-md">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">Operator</p>
                                    <p className="mt-sm text-sm text-textPrimary">{selectedTransaction.admin_email}</p>
                                </div>

                                <div className="rounded-[calc(var(--radius-lg)*1.25)] border border-border/70 bg-background/70 p-md">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">Notes</p>
                                    <p className="mt-sm text-sm leading-relaxed text-textSecondary">
                                        {selectedTransaction.notes || 'No operator note was attached to this transaction.'}
                                    </p>
                                </div>

                                <div className="rounded-[calc(var(--radius-lg)*1.25)] border border-border/70 bg-background/70 p-md">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">Quota delta</p>
                                    <pre className="mt-sm overflow-x-auto whitespace-pre-wrap break-words rounded-[var(--radius-lg)] bg-surface px-md py-sm text-xs text-textSecondary">
                                        {selectedTransaction.quota_changes
                                            ? JSON.stringify(selectedTransaction.quota_changes, null, 2)
                                            : 'No quota change payload recorded.'}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

function DetailCard({
    label,
    value,
}: {
    label: string
    value: string
}) {
    return (
        <div className="rounded-[calc(var(--radius-lg)*1.25)] border border-border/70 bg-background/70 p-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">{label}</p>
            <p className="mt-sm text-sm font-medium text-textPrimary">{value}</p>
        </div>
    )
}
