'use client';

import React, { useState, useEffect } from 'react';
import {
    Server,
    Activity,
    Cpu,
    HardDrive,
    Zap,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
    RefreshCw,
} from 'lucide-react';

interface Worker {
    id: string;
    worker_type: string;
    hostname: string;
    pid: number;
    last_heartbeat: string;
    status: 'active' | 'idle' | 'dead';
    created_at: string;
}

interface WorkerStats {
    total_workers: number;
    active_workers: number;
    idle_workers: number;
    dead_workers: number;
    jobs_pending: number;
    jobs_running: number;
    jobs_completed_today: number;
}

export default function WorkersPage() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [stats, setStats] = useState<WorkerStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        loadData();

        if (autoRefresh) {
            const interval = setInterval(loadData, 5000); // Refresh every 5s
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const loadData = async () => {
        try {
            // Load workers
            const workersRes = await fetch('/api/superadmin/workers');
            const workersData = await workersRes.json();
            setWorkers(workersData.workers || []);

            // Load stats
            const statsRes = await fetch('/api/superadmin/workers/stats');
            const statsData = await statsRes.json();
            setStats(statsData.stats || null);
        } catch (error) {
            console.error('Failed to load worker data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-success/10 text-success border-success/20';
            case 'idle': return 'bg-warning/10 text-warning border-warning/20';
            case 'dead': return 'bg-error/10 text-error border-error/20';
            default: return 'bg-surfaceHover text-textSecondary border-border';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle className="w-4 h-4" />;
            case 'idle': return <Clock className="w-4 h-4" />;
            case 'dead': return <XCircle className="w-4 h-4" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    const getWorkerTypeIcon = (type: string) => {
        if (type.includes('writer')) return <Zap className="w-5 h-5 text-primary" />;
        if (type.includes('learning')) return <Activity className="w-5 h-5 text-info" />;
        if (type.includes('analytics')) return <Activity className="w-5 h-5 text-accent" />;
        return <Server className="w-5 h-5 text-textSecondary" />;
    };

    const getHeartbeatStatus = (lastHeartbeat: string) => {
        const now = new Date().getTime();
        const heartbeat = new Date(lastHeartbeat).getTime();
        const diff = (now - heartbeat) / 1000; // seconds

        if (diff < 30) return { text: 'Just now', color: 'text-success' };
        if (diff < 60) return { text: `${Math.floor(diff)}s ago`, color: 'text-success' };
        if (diff < 300) return { text: `${Math.floor(diff / 60)}m ago`, color: 'text-warning' };
        return { text: `${Math.floor(diff / 60)}m ago`, color: 'text-error' };
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-lg">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                        Worker Management
                    </h1>
                    <p className="text-textSecondary">
                        Monitor background workers and job processing
                    </p>
                </div>

                <div className="flex items-center gap-sm">
                    {/* Auto-refresh toggle */}
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`
                            flex items-center gap-xs
                            px-md py-sm
                            rounded-[var(--radius-md)]
                            font-medium text-sm
                            transition-all
                            ${autoRefresh
                                ? 'bg-success/10 text-success border border-success/20'
                                : 'bg-surface text-textSecondary border border-border hover:bg-surfaceHover'
                            }
                        `}
                    >
                        <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                        <span>Auto-refresh {autoRefresh ? 'ON' : 'OFF'}</span>
                    </button>

                    {/* Manual refresh */}
                    <button
                        onClick={loadData}
                        className="
                            flex items-center gap-xs
                            bg-primary text-white
                            px-md py-sm
                            rounded-[var(--radius-md)]
                            hover:opacity-90
                            transition-all
                        "
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Refresh Now</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                        <div className="flex items-center justify-between mb-sm">
                            <p className="text-sm text-textSecondary">Total Workers</p>
                            <Server className="w5 h-5 text-textTertiary" />
                        </div>
                        <p className="text-3xl font-bold text-textPrimary">
                            {stats.total_workers}
                        </p>
                        <div className="flex items-center gap-md mt-sm text-xs">
                            <span className="text-success">{stats.active_workers} active</span>
                            <span className="text-warning">{stats.idle_workers} idle</span>
                            <span className="text-error">{stats.dead_workers} dead</span>
                        </div>
                    </div>

                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                        <div className="flex items-center justify-between mb-sm">
                            <p className="text-sm text-textSecondary">Jobs Pending</p>
                            <Clock className="w-5 h-5 text-warning" />
                        </div>
                        <p className="text-3xl font-bold text-warning">
                            {stats.jobs_pending}
                        </p>
                        <p className="text-xs text-textTertiary mt-sm">
                            Waiting in queue
                        </p>
                    </div>

                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                        <div className="flex items-center justify-between mb-sm">
                            <p className="text-sm text-textSecondary">Jobs Running</p>
                            <Activity className="w-5 h-5 text-info" />
                        </div>
                        <p className="text-3xl font-bold text-info">
                            {stats.jobs_running}
                        </p>
                        <p className="text-xs text-textTertiary mt-sm">
                            Currently processing
                        </p>
                    </div>

                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                        <div className="flex items-center justify-between mb-sm">
                            <p className="text-sm text-textSecondary">Completed Today</p>
                            <CheckCircle className="w-5 h-5 text-success" />
                        </div>
                        <p className="text-3xl font-bold text-success">
                            {stats.jobs_completed_today}
                        </p>
                        <p className="text-xs text-textTertiary mt-sm">
                            Since midnight
                        </p>
                    </div>
                </div>
            )}

            {/* Workers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
                {workers.map((worker) => {
                    const heartbeat = getHeartbeatStatus(worker.last_heartbeat);

                    return (
                        <div
                            key={worker.id}
                            className="
                                bg-surface border border-border
                                rounded-[var(--radius-lg)]
                                p-lg
                                hover:shadow-[var(--shadow-md)]
                                transition-all
                            "
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-md">
                                <div className="flex items-center gap-sm">
                                    {getWorkerTypeIcon(worker.worker_type)}
                                    <div>
                                        <h3 className="font-bold text-textPrimary">
                                            {worker.worker_type}
                                        </h3>
                                        <p className="text-xs text-textSecondary">
                                            {worker.hostname}
                                        </p>
                                    </div>
                                </div>

                                <span className={`
                                    inline-flex items-center gap-xs
                                    px-sm py-xs
                                    text-xs font-medium
                                    rounded-[var(--radius-sm)]
                                    border
                                    ${getStatusColor(worker.status)}
                                `}>
                                    {getStatusIcon(worker.status)}
                                    {worker.status}
                                </span>
                            </div>

                            {/* Details */}
                            <div className="space-y-sm">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-textSecondary flex items-center gap-xs">
                                        <Cpu className="w-4 h-4" />
                                        Process ID
                                    </span>
                                    <span className="text-textPrimary font-mono">{worker.pid}</span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-textSecondary flex items-center gap-xs">
                                        <Activity className="w-4 h-4" />
                                        Last Heartbeat
                                    </span>
                                    <span className={`font-medium ${heartbeat.color}`}>
                                        {heartbeat.text}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-textSecondary flex items-center gap-xs">
                                        <Clock className="w-4 h-4" />
                                        Started
                                    </span>
                                    <span className="text-textPrimary">
                                        {new Date(worker.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {workers.length === 0 && (
                <div className="text-center py-2xl">
                    <Server className="w-12 h-12 mx-auto mb-md text-textTertiary opacity-50" />
                    <p className="text-textPrimary mb-xs">No workers running</p>
                    <p className="text-sm text-textSecondary">
                        Start workers to process jobs
                    </p>
                </div>
            )}
        </div>
    );
}
