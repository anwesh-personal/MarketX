'use client'

import { useState, useEffect } from 'react'
import {
    Database, Activity, Zap, CheckCircle, XCircle, Clock,
    Pause, Play, Trash2, RefreshCw, AlertTriangle, Server,
    TrendingUp, BarChart3
} from 'lucide-react'

interface QueueStats {
    name: string
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
    total: number
    recentJobs: any[]
}

interface RedisStats {
    version: string
    uptime: string
    connectedClients: string
    usedMemory: string
    totalCommands: string
}

interface RedisStatus {
    connected: boolean
    redis: RedisStats
    queues: QueueStats[]
    error?: string
}

export default function RedisManagementPage() {
    const [status, setStatus] = useState<RedisStatus | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedQueue, setSelectedQueue] = useState<string | null>(null)

    useEffect(() => {
        loadStatus()
        const interval = setInterval(loadStatus, 5000) // Refresh every 5s
        return () => clearInterval(interval)
    }, [])

    const loadStatus = async () => {
        try {
            const response = await fetch('/api/superadmin/redis/status')
            if (response.ok) {
                const data = await response.json()
                setStatus(data)
            }
        } catch (error) {
            console.error('Failed to load Redis status:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const performAction = async (queueName: string, action: string) => {
        if (!confirm(`Are you sure you want to ${action} queue ${queueName}?`)) return

        try {
            const response = await fetch('/api/superadmin/redis/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queueName, action })
            })

            if (response.ok) {
                await loadStatus()
                const data = await response.json()
                alert(data.message)
            }
        } catch (error) {
            alert('Action failed')
        }
    }

    const retryJob = async (jobId: string, queueName: string) => {
        try {
            const response = await fetch(`/api/superadmin/redis/jobs/${jobId}/retry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queueName })
            })

            if (response.ok) {
                await loadStatus()
                alert('Job queued for retry')
            }
        } catch (error) {
            alert('Retry failed')
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Database className="w-8 h-8 text-primary" />
                        Redis & Worker Management
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Monitor Redis connection and manage worker queues
                    </p>
                </div>
                <button
                    onClick={loadStatus}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            ) : !status ? (
                <div className="rounded-xl border border-border/40 bg-destructive/10 p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Failed to Load Status</h3>
                    <p className="text-muted-foreground">Could not connect to Redis</p>
                </div>
            ) : (
                <>
                    {/* Connection Status */}
                    <div className="p-6 rounded-xl border border-border/40 bg-gradient-to-br from-background to-muted/20">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Redis Connection</h2>
                            <div className="flex items-center gap-2">
                                {status.connected ? (
                                    <>
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-sm text-green-500 font-medium">Connected</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                        <span className="text-sm text-red-500 font-medium">Disconnected</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {status.connected && status.redis && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <StatCard
                                    icon={Server}
                                    label="Version"
                                    value={status.redis.version}
                                    color="blue"
                                />
                                <StatCard
                                    icon={Clock}
                                    label="Uptime"
                                    value={`${Math.floor(parseInt(status.redis.uptime) / 3600)}h`}
                                    color="green"
                                />
                                <StatCard
                                    icon={Activity}
                                    label="Clients"
                                    value={status.redis.connectedClients}
                                    color="purple"
                                />
                                <StatCard
                                    icon={BarChart3}
                                    label="Memory"
                                    value={status.redis.usedMemory}
                                    color="orange"
                                />
                                <StatCard
                                    icon={TrendingUp}
                                    label="Commands"
                                    value={parseInt(status.redis.totalCommands).toLocaleString()}
                                    color="cyan"
                                />
                            </div>
                        )}
                    </div>

                    {/* Queue Statistics */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Worker Queues</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {status.queues.map((queue) => (
                                <QueueCard
                                    key={queue.name}
                                    queue={queue}
                                    onAction={performAction}
                                    onSelect={() => setSelectedQueue(queue.name)}
                                    onRetryJob={retryJob}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Queue Details Modal */}
                    {selectedQueue && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setSelectedQueue(null)}>
                            <div className="bg-background rounded-2xl border border-border/40 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
                                onClick={(e) => e.stopPropagation()}>
                                <div className="p-6 border-b border-border/40">
                                    <h2 className="text-2xl font-bold">Queue: {selectedQueue}</h2>
                                </div>
                                <div className="p-6">
                                    {status.queues.find(q => q.name === selectedQueue)?.recentJobs.map((job: any) => (
                                        <div key={job.id} className="p-4 rounded-lg border border-border/40 mb-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-mono text-sm">{job.id}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${job.state === 'completed' ? 'bg-green-500/10 text-green-500' :
                                                        job.state === 'failed' ? 'bg-red-500/10 text-red-500' :
                                                            'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                    {job.state}
                                                </span>
                                            </div>
                                            {job.failedReason && (
                                                <p className="text-sm text-destructive mb-2">{job.failedReason}</p>
                                            )}
                                            {job.state === 'failed' && (
                                                <button
                                                    onClick={() => retryJob(job.id, selectedQueue)}
                                                    className="text-sm text-primary hover:underline"
                                                >
                                                    Retry Job
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

function StatCard({ icon: Icon, label, value, color }: any) {
    const colors = {
        blue: 'from-blue-500/10 to-cyan-500/10 text-blue-500',
        green: 'from-green-500/10 to-emerald-500/10 text-green-500',
        purple: 'from-purple-500/10 to-pink-500/10 text-purple-500',
        orange: 'from-orange-500/10 to-red-500/10 text-orange-500',
        cyan: 'from-cyan-500/10 to-blue-500/10 text-cyan-500',
    }

    return (
        <div className={`p-4 rounded-xl bg-gradient-to-br ${colors[color]} border border-border/40`}>
            <Icon className="w-5 h-5 mb-2" />
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <div className="text-lg font-bold">{value}</div>
        </div>
    )
}

function QueueCard({ queue, onAction, onSelect, onRetryJob }: any) {
    const totalJobs = queue.waiting + queue.active + queue.failed

    return (
        <div className="p-6 rounded-xl border border-border/40 bg-background hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold capitalize">{queue.name.replace('-', ' ')}</h3>
                <button
                    onClick={() => onSelect()}
                    className="text-sm text-primary hover:underline"
                >
                    View Details →
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="text-center p-2 rounded-lg bg-blue-500/10">
                    <div className="text-sm text-muted-foreground">Waiting</div>
                    <div className="text-xl font-bold text-blue-500">{queue.waiting}</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-green-500/10">
                    <div className="text-sm text-muted-foreground">Active</div>
                    <div className="text-xl font-bold text-green-500">{queue.active}</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-gray-500/10">
                    <div className="text-sm text-muted-foreground">Done</div>
                    <div className="text-xl font-bold">{queue.completed}</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-500/10">
                    <div className="text-sm text-muted-foreground">Failed</div>
                    <div className="text-xl font-bold text-red-500">{queue.failed}</div>
                </div>
            </div>

            {/* Progress Bar */}
            {totalJobs > 0 && (
                <div className="mb-4">
                    <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                        <div
                            className="bg-blue-500"
                            style={{ width: `${(queue.waiting / totalJobs) * 100}%` }}
                        />
                        <div
                            className="bg-green-500"
                            style={{ width: `${(queue.active / totalJobs) * 100}%` }}
                        />
                        <div
                            className="bg-red-500"
                            style={{ width: `${(queue.failed / totalJobs) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
                <ActionButton
                    icon={Trash2}
                    label="Clean Completed"
                    onClick={() => onAction(queue.name, 'clean-completed')}
                    variant="secondary"
                />
                <ActionButton
                    icon={Trash2}
                    label="Clean Failed"
                    onClick={() => onAction(queue.name, 'clean-failed')}
                    variant="destructive"
                />
                <ActionButton
                    icon={Pause}
                    label="Pause"
                    onClick={() => onAction(queue.name, 'pause')}
                    variant="warning"
                />
            </div>
        </div>
    )
}

function ActionButton({ icon: Icon, label, onClick, variant }: any) {
    const variants = {
        secondary: 'border-border hover:bg-muted',
        destructive: 'border-destructive/40 hover:bg-destructive/10 text-destructive',
        warning: 'border-orange-500/40 hover:bg-orange-500/10 text-orange-500',
    }

    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${variants[variant]}`}
        >
            <Icon className="w-3.5 h-3.5" />
            {label}
        </button>
    )
}
