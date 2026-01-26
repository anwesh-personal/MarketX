'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Database, Activity, Zap, CheckCircle, XCircle, Clock,
    Pause, Play, Trash2, RefreshCw, AlertTriangle, Server,
    TrendingUp, BarChart3, HardDrive, Wifi, WifiOff,
    RotateCcw, AlertCircle, Eye, ChevronDown, ChevronUp,
    Search, Filter, Loader2, Power, Coffee
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

interface QueueStats {
    name: string
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
    total: number
    isPaused?: boolean
    recentJobs: JobInfo[]
}

interface JobInfo {
    id: string
    name: string
    state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
    timestamp: number
    processedOn?: number
    finishedOn?: number
    failedReason?: string
    data?: Record<string, any>
    progress?: number
}

interface RedisStats {
    version: string
    uptime: string
    connectedClients: string
    usedMemory: string
    totalCommands: string
    peakMemory?: string
    keyspace?: string
}

interface RedisStatus {
    connected: boolean
    redis: RedisStats
    queues: QueueStats[]
    error?: string
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
}

function formatTimestamp(ts: number): string {
    if (!ts) return 'N/A'
    return new Date(ts).toLocaleString()
}

function formatTimeAgo(ts: number): string {
    if (!ts) return 'N/A'
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function RedisManagementPage() {
    const { mode } = useTheme()
    const [status, setStatus] = useState<RedisStatus | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [selectedQueue, setSelectedQueue] = useState<string | null>(null)
    const [autoRefresh, setAutoRefresh] = useState(true)
    const [refreshInterval, setRefreshInterval] = useState(5000)
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [filterState, setFilterState] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Load status
    const loadStatus = useCallback(async (showRefreshing = true) => {
        if (showRefreshing) setIsRefreshing(true)
        try {
            const response = await fetch('/api/superadmin/redis/status')
            if (response.ok) {
                const data = await response.json()
                setStatus(data)
                setLastRefresh(new Date())
            } else {
                console.error('Failed to load status:', await response.text())
            }
        } catch (error) {
            console.error('Failed to load Redis status:', error)
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }, [])

    // Initial load
    useEffect(() => {
        loadStatus(false)
    }, [loadStatus])

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(() => loadStatus(false), refreshInterval)
        return () => clearInterval(interval)
    }, [autoRefresh, refreshInterval, loadStatus])

    // Queue actions
    const performAction = async (queueName: string, action: string) => {
        const actionLabels: Record<string, string> = {
            'pause': 'pause',
            'resume': 'resume',
            'clean-completed': 'clean completed jobs from',
            'clean-failed': 'clean failed jobs from',
            'obliterate': 'COMPLETELY RESET',
        }

        const isDestructive = ['clean-failed', 'obliterate'].includes(action)
        const confirmMessage = isDestructive
            ? `Are you sure you want to ${actionLabels[action]} the "${queueName}" queue? This cannot be undone.`
            : `${actionLabels[action].charAt(0).toUpperCase() + actionLabels[action].slice(1)} the "${queueName}" queue?`

        if (!confirm(confirmMessage)) return

        setActionLoading(`${queueName}-${action}`)
        try {
            const response = await fetch('/api/superadmin/redis/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queueName, action })
            })

            const data = await response.json()
            if (response.ok) {
                await loadStatus(false)
                // Show success notification
            } else {
                alert(`Action failed: ${data.error}`)
            }
        } catch (error: any) {
            alert(`Action failed: ${error.message}`)
        } finally {
            setActionLoading(null)
        }
    }

    // Retry failed job
    const retryJob = async (jobId: string, queueName: string) => {
        try {
            const response = await fetch(`/api/superadmin/redis/jobs/${jobId}/retry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queueName })
            })

            if (response.ok) {
                await loadStatus(false)
            } else {
                const data = await response.json()
                alert(`Retry failed: ${data.error}`)
            }
        } catch (error: any) {
            alert(`Retry failed: ${error.message}`)
        }
    }

    // Calculate totals
    const totals = status?.queues.reduce((acc, q) => ({
        waiting: acc.waiting + q.waiting,
        active: acc.active + q.active,
        completed: acc.completed + q.completed,
        failed: acc.failed + q.failed,
        delayed: acc.delayed + q.delayed,
    }), { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }) || { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }

    // Filter queues
    const filteredQueues = status?.queues.filter(q => {
        if (searchQuery && !q.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
        if (filterState === 'active' && q.active === 0) return false
        if (filterState === 'failed' && q.failed === 0) return false
        if (filterState === 'paused' && !q.isPaused) return false
        return true
    }) || []

    return (
        <div className="min-h-screen p-6 lg:p-8 space-y-8 bg-background">
            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary flex items-center gap-3">
                        <Database className="w-8 h-8 text-primary-500" />
                        Redis & Worker Management
                    </h1>
                    <p className="text-textSecondary mt-2">
                        Monitor Redis connection, manage worker queues, and track job processing
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Auto-refresh toggle */}
                    <label className="flex items-center gap-2 cursor-pointer" title="Auto-refresh every 5 seconds">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="w-4 h-4 rounded border-border accent-primary-500"
                        />
                        <span className="text-sm text-textSecondary">Auto-refresh</span>
                    </label>

                    {/* Last refresh */}
                    <span className="text-xs text-textTertiary">
                        {lastRefresh.toLocaleTimeString()}
                    </span>

                    {/* Manual refresh */}
                    <button
                        onClick={() => loadStatus(true)}
                        disabled={isRefreshing}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg",
                            "border border-border bg-surface hover:bg-surface-hover",
                            "text-textPrimary transition-all",
                            isRefreshing && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                        Refresh
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className="flex items-center justify-center py-32">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                        <p className="text-textSecondary">Connecting to Redis...</p>
                    </div>
                </div>
            ) : !status ? (
                <div className="rounded-2xl border border-border bg-surface p-12 text-center">
                    <WifiOff className="w-16 h-16 text-error mx-auto mb-6 opacity-60" />
                    <h3 className="text-xl font-bold text-textPrimary mb-2">Failed to Connect</h3>
                    <p className="text-textSecondary mb-6">Could not connect to Redis. Check your configuration.</p>
                    <button
                        onClick={() => loadStatus(true)}
                        className="px-6 py-3 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors"
                    >
                        Retry Connection
                    </button>
                </div>
            ) : (
                <>
                    {/* Connection Status Card */}
                    <section className={cn(
                        "p-6 rounded-2xl border",
                        status.connected
                            ? "border-success/30 bg-success/5"
                            : "border-error/30 bg-error/5"
                    )}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-3 rounded-xl",
                                    status.connected ? "bg-success/10" : "bg-error/10"
                                )}>
                                    {status.connected
                                        ? <Wifi className="w-6 h-6 text-success" />
                                        : <WifiOff className="w-6 h-6 text-error" />
                                    }
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-textPrimary">
                                        Redis Connection
                                    </h2>
                                    <p className="text-sm text-textSecondary">
                                        {status.connected ? 'Connected and operational' : 'Connection failed'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                                    status.connected
                                        ? "bg-success/10 text-success"
                                        : "bg-error/10 text-error"
                                )}>
                                    <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        status.connected ? "bg-success animate-pulse" : "bg-error"
                                    )} />
                                    {status.connected ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </div>

                        {status.connected && status.redis && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <StatCard
                                    icon={Server}
                                    label="Version"
                                    value={status.redis.version || 'N/A'}
                                    variant="info"
                                />
                                <StatCard
                                    icon={Clock}
                                    label="Uptime"
                                    value={formatUptime(parseInt(status.redis.uptime) || 0)}
                                    variant="success"
                                />
                                <StatCard
                                    icon={Activity}
                                    label="Clients"
                                    value={status.redis.connectedClients || '0'}
                                    variant="secondary"
                                />
                                <StatCard
                                    icon={HardDrive}
                                    label="Memory"
                                    value={status.redis.usedMemory || '0'}
                                    variant="warning"
                                />
                                <StatCard
                                    icon={TrendingUp}
                                    label="Commands"
                                    value={parseInt(status.redis.totalCommands || '0').toLocaleString()}
                                    variant="primary"
                                />
                            </div>
                        )}
                    </section>

                    {/* Queue Overview */}
                    <section>
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-textPrimary">Worker Queues</h2>
                                <p className="text-textSecondary text-sm">
                                    {status.queues.length} queues • {totals.active} active jobs • {totals.waiting} waiting
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textTertiary" />
                                    <input
                                        type="text"
                                        placeholder="Search queues..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={cn(
                                            "pl-10 pr-4 py-2 rounded-lg border border-border",
                                            "bg-surface text-textPrimary placeholder-textTertiary",
                                            "focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                        )}
                                    />
                                </div>

                                {/* Filter */}
                                <select
                                    value={filterState}
                                    onChange={(e) => setFilterState(e.target.value)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg border border-border",
                                        "bg-surface text-textPrimary",
                                        "focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                    )}
                                >
                                    <option value="all">All Queues</option>
                                    <option value="active">Has Active</option>
                                    <option value="failed">Has Failed</option>
                                    <option value="paused">Paused</option>
                                </select>
                            </div>
                        </div>

                        {/* Queue Stats Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                            <SummaryCard label="Waiting" value={totals.waiting} color="primary" />
                            <SummaryCard label="Active" value={totals.active} color="accent" />
                            <SummaryCard label="Completed" value={totals.completed} color="success" />
                            <SummaryCard label="Failed" value={totals.failed} color="error" />
                            <SummaryCard label="Delayed" value={totals.delayed} color="warning" />
                        </div>

                        {/* Queue Cards */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {filteredQueues.map((queue) => (
                                <QueueCard
                                    key={queue.name}
                                    queue={queue}
                                    onAction={performAction}
                                    onRetryJob={retryJob}
                                    onViewDetails={() => setSelectedQueue(queue.name)}
                                    isLoading={actionLoading?.startsWith(queue.name) || false}
                                />
                            ))}

                            {filteredQueues.length === 0 && (
                                <div className="col-span-full p-12 text-center border border-border rounded-xl bg-surface">
                                    <Coffee className="w-12 h-12 text-textTertiary mx-auto mb-4 opacity-50" />
                                    <p className="text-textSecondary">No queues match your filter</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Queue Detail Modal */}
                    {selectedQueue && (
                        <QueueDetailModal
                            queueName={selectedQueue}
                            queue={status.queues.find(q => q.name === selectedQueue)}
                            onClose={() => setSelectedQueue(null)}
                            onRetryJob={retryJob}
                        />
                    )}
                </>
            )}
        </div>
    )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatCardProps {
    icon: React.ElementType
    label: string
    value: string
    variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'accent'
}

function StatCard({ icon: Icon, label, value, variant }: StatCardProps) {
    const variants: Record<string, string> = {
        primary: 'bg-primary-500/10 text-primary-500 border-primary-500/20',
        secondary: 'bg-secondary-500/10 text-secondary-500 border-secondary-500/20',
        success: 'bg-success/10 text-success border-success/20',
        warning: 'bg-warning/10 text-warning border-warning/20',
        error: 'bg-error/10 text-error border-error/20',
        info: 'bg-info/10 text-info border-info/20',
        accent: 'bg-accent-500/10 text-accent-500 border-accent-500/20',
    }

    return (
        <div className={cn(
            "p-4 rounded-xl border transition-all hover:scale-[1.02]",
            variants[variant]
        )}>
            <Icon className="w-5 h-5 mb-2 opacity-80" />
            <div className="text-xs opacity-70 mb-1">{label}</div>
            <div className="text-lg font-bold">{value}</div>
        </div>
    )
}

interface SummaryCardProps {
    label: string
    value: number
    color: 'primary' | 'accent' | 'success' | 'error' | 'warning'
}

function SummaryCard({ label, value, color }: SummaryCardProps) {
    const colors: Record<string, string> = {
        primary: 'from-primary-500/10 to-primary-500/5 border-primary-500/20 text-primary-500',
        accent: 'from-accent-500/10 to-accent-500/5 border-accent-500/20 text-accent-500',
        success: 'from-success/10 to-success/5 border-success/20 text-success',
        error: 'from-error/10 to-error/5 border-error/20 text-error',
        warning: 'from-warning/10 to-warning/5 border-warning/20 text-warning',
    }

    return (
        <div className={cn(
            "p-4 rounded-xl border bg-gradient-to-br transition-all",
            colors[color]
        )}>
            <div className="text-sm opacity-70">{label}</div>
            <div className="text-2xl font-bold mt-1">{value.toLocaleString()}</div>
        </div>
    )
}

interface QueueCardProps {
    queue: QueueStats
    onAction: (queueName: string, action: string) => void
    onRetryJob: (jobId: string, queueName: string) => void
    onViewDetails: () => void
    isLoading: boolean
}

function QueueCard({ queue, onAction, onRetryJob, onViewDetails, isLoading }: QueueCardProps) {
    const [expanded, setExpanded] = useState(false)
    const totalActive = queue.waiting + queue.active + queue.failed

    const formatQueueName = (name: string) => {
        return name.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
    }

    return (
        <div className={cn(
            "rounded-xl border bg-surface transition-all",
            queue.isPaused ? "border-warning/40" : "border-border",
            "hover:border-primary-500/40 hover:shadow-lg"
        )}>
            {/* Header */}
            <div className="p-5 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-lg",
                            queue.isPaused ? "bg-warning/10" : "bg-primary-500/10"
                        )}>
                            <Zap className={cn(
                                "w-5 h-5",
                                queue.isPaused ? "text-warning" : "text-primary-500"
                            )} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-textPrimary">
                                {formatQueueName(queue.name)}
                            </h3>
                            {queue.isPaused && (
                                <span className="text-xs text-warning font-medium">Paused</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onViewDetails}
                        className="text-sm text-primary-500 hover:underline"
                    >
                        View Details →
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2 p-4">
                <div className="text-center p-3 rounded-lg bg-primary-500/10">
                    <div className="text-xs text-textSecondary">Waiting</div>
                    <div className="text-xl font-bold text-primary-500">{queue.waiting}</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-accent-500/10">
                    <div className="text-xs text-textSecondary">Active</div>
                    <div className="text-xl font-bold text-accent-500">{queue.active}</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-surface-hover">
                    <div className="text-xs text-textSecondary">Done</div>
                    <div className="text-xl font-bold text-textPrimary">{queue.completed}</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-error/10">
                    <div className="text-xs text-textSecondary">Failed</div>
                    <div className="text-xl font-bold text-error">{queue.failed}</div>
                </div>
            </div>

            {/* Progress Bar */}
            {totalActive > 0 && (
                <div className="px-4 pb-2">
                    <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden flex">
                        <div
                            className="bg-primary-500 transition-all"
                            style={{ width: `${(queue.waiting / totalActive) * 100}%` }}
                        />
                        <div
                            className="bg-accent-500 transition-all"
                            style={{ width: `${(queue.active / totalActive) * 100}%` }}
                        />
                        <div
                            className="bg-error transition-all"
                            style={{ width: `${(queue.failed / totalActive) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="p-4 pt-2 flex flex-wrap gap-2">
                {queue.isPaused ? (
                    <ActionButton
                        icon={Play}
                        label="Resume"
                        onClick={() => onAction(queue.name, 'resume')}
                        variant="success"
                        disabled={isLoading}
                    />
                ) : (
                    <ActionButton
                        icon={Pause}
                        label="Pause"
                        onClick={() => onAction(queue.name, 'pause')}
                        variant="warning"
                        disabled={isLoading}
                    />
                )}
                <ActionButton
                    icon={Trash2}
                    label="Clean Done"
                    onClick={() => onAction(queue.name, 'clean-completed')}
                    variant="secondary"
                    disabled={isLoading}
                />
                <ActionButton
                    icon={XCircle}
                    label="Clean Failed"
                    onClick={() => onAction(queue.name, 'clean-failed')}
                    variant="error"
                    disabled={isLoading}
                />
                <ActionButton
                    icon={RotateCcw}
                    label="Reset All"
                    onClick={() => onAction(queue.name, 'obliterate')}
                    variant="destructive"
                    disabled={isLoading}
                />
            </div>

            {/* Recent Failed Jobs (expandable) */}
            {queue.recentJobs.filter(j => j.state === 'failed').length > 0 && (
                <>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full px-4 py-2 flex items-center justify-between border-t border-border text-sm text-textSecondary hover:bg-surface-hover transition-colors"
                    >
                        <span>Recent Failed Jobs ({queue.recentJobs.filter(j => j.state === 'failed').length})</span>
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expanded && (
                        <div className="px-4 pb-4 space-y-2">
                            {queue.recentJobs.filter(j => j.state === 'failed').slice(0, 3).map(job => (
                                <div key={job.id} className="p-3 rounded-lg bg-error/5 border border-error/20">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-mono text-xs text-textSecondary">{job.id}</span>
                                        <button
                                            onClick={() => onRetryJob(job.id, queue.name)}
                                            className="text-xs text-primary-500 hover:underline"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                    {job.failedReason && (
                                        <p className="text-xs text-error truncate" title={job.failedReason}>
                                            {job.failedReason}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

interface ActionButtonProps {
    icon: React.ElementType
    label: string
    onClick: () => void
    variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'destructive'
    disabled?: boolean
}

function ActionButton({ icon: Icon, label, onClick, variant, disabled }: ActionButtonProps) {
    const variants: Record<string, string> = {
        primary: 'border-primary-500/40 hover:bg-primary-500/10 text-primary-500',
        secondary: 'border-border hover:bg-surface-hover text-textSecondary',
        success: 'border-success/40 hover:bg-success/10 text-success',
        warning: 'border-warning/40 hover:bg-warning/10 text-warning',
        error: 'border-error/40 hover:bg-error/10 text-error',
        destructive: 'border-error/40 hover:bg-error/10 text-error',
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                variants[variant],
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <Icon className="w-3.5 h-3.5" />
            {label}
        </button>
    )
}

interface QueueDetailModalProps {
    queueName: string
    queue?: QueueStats
    onClose: () => void
    onRetryJob: (jobId: string, queueName: string) => void
}

function QueueDetailModal({ queueName, queue, onClose, onRetryJob }: QueueDetailModalProps) {
    if (!queue) return null

    return (
        <div
            className="fixed inset-0 z-modal bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-surface rounded-2xl border border-border max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-textPrimary">
                            {queueName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </h2>
                        <p className="text-sm text-textSecondary mt-1">
                            {queue.total} total jobs
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-surface-hover text-textSecondary transition-colors"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-5 gap-2 p-4 border-b border-border">
                    <div className="text-center p-2 rounded-lg bg-primary-500/10">
                        <div className="text-2xl font-bold text-primary-500">{queue.waiting}</div>
                        <div className="text-xs text-textSecondary">Waiting</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-accent-500/10">
                        <div className="text-2xl font-bold text-accent-500">{queue.active}</div>
                        <div className="text-xs text-textSecondary">Active</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-success/10">
                        <div className="text-2xl font-bold text-success">{queue.completed}</div>
                        <div className="text-xs text-textSecondary">Completed</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-error/10">
                        <div className="text-2xl font-bold text-error">{queue.failed}</div>
                        <div className="text-xs text-textSecondary">Failed</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-warning/10">
                        <div className="text-2xl font-bold text-warning">{queue.delayed}</div>
                        <div className="text-xs text-textSecondary">Delayed</div>
                    </div>
                </div>

                {/* Recent Jobs */}
                <div className="flex-1 overflow-auto p-6">
                    <h3 className="text-lg font-semibold text-textPrimary mb-4">Recent Jobs</h3>
                    <div className="space-y-3">
                        {queue.recentJobs.length === 0 ? (
                            <p className="text-textSecondary text-center py-8">No recent jobs</p>
                        ) : (
                            queue.recentJobs.map((job) => (
                                <div
                                    key={job.id}
                                    className="p-4 rounded-lg border border-border bg-background"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono text-sm text-textPrimary">{job.id}</span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-xs font-medium",
                                            job.state === 'completed' && "bg-success/10 text-success",
                                            job.state === 'failed' && "bg-error/10 text-error",
                                            job.state === 'active' && "bg-accent-500/10 text-accent-500",
                                            job.state === 'waiting' && "bg-primary-500/10 text-primary-500",
                                            job.state === 'delayed' && "bg-warning/10 text-warning"
                                        )}>
                                            {job.state}
                                        </span>
                                    </div>
                                    <div className="text-xs text-textTertiary mb-2">
                                        Created: {formatTimeAgo(job.timestamp)}
                                        {job.finishedOn && ` • Finished: ${formatTimeAgo(job.finishedOn)}`}
                                    </div>
                                    {job.failedReason && (
                                        <p className="text-sm text-error bg-error/5 p-2 rounded mt-2">{job.failedReason}</p>
                                    )}
                                    {job.state === 'failed' && (
                                        <button
                                            onClick={() => onRetryJob(job.id, queueName)}
                                            className="mt-3 text-sm text-primary-500 hover:underline"
                                        >
                                            Retry This Job
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
