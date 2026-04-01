'use client';

import React, { useState, useEffect } from 'react';
import {
    Server,
    Play,
    Square,
    RotateCcw,
    Trash2,
    Activity,
    Cpu,
    HardDrive,
    Clock,
    AlertCircle,
    CheckCircle,
    Loader2,
    Terminal
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Worker {
    id: number;
    name: string;
    status: 'online' | 'stopped' | 'errored';
    uptime: string;
    cpu: string;
    memory: string;
    restarts: number;
    deployment_id?: string;
    template?: string;
    type?: string;
}

interface WorkerGridProps {
    serverId: string | null;
    autoRefresh: boolean;
    refreshInterval: number;
    onRefresh: () => void;
}

export function WorkerGrid({ serverId, autoRefresh, refreshInterval, onRefresh }: WorkerGridProps) {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [stats, setStats] = useState({ total: 0, online: 0, stopped: 0, errored: 0 });
    const [system, setSystem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (serverId) {
            loadStatus();
        }
    }, [serverId]);

    useEffect(() => {
        if (autoRefresh && serverId) {
            const interval = setInterval(loadStatus, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, refreshInterval, serverId]);

    const loadStatus = async () => {
        try {
            const params = new URLSearchParams();
            let url = '/api/superadmin/vps/status';

            if (serverId === 'railway') {
                url = '/api/superadmin/workers/status';
            } else if (serverId) {
                params.append('server_id', serverId);
            }

            const response = await fetch(`${url}?${params}`);
            if (response.ok) {
                const data = await response.json();
                setWorkers(data.workers || []);
                setStats(data.stats || { total: 0, online: 0, stopped: 0, errored: 0 });
                setSystem(data.system);
                onRefresh();
            }
        } catch (error) {
            console.error('Failed to load status:', error);
            toast.error('Failed to load worker status');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: string, workerName: string) => {
        setActionLoading(workerName);
        try {
            let url = '/api/superadmin/vps/pm2';
            let body: any = {
                action,
                process_name: workerName,
                server_id: serverId,
            };

            if (serverId === 'railway') {
                url = '/api/superadmin/workers/action';
                body = {
                    action,
                    workerName,
                };
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                toast.success(`${action} successful`);
                setTimeout(loadStatus, 2000);
            } else {
                const error = await response.json();
                toast.error(error.error || `${action} failed`);
            }
        } catch (error) {
            toast.error(`Failed to ${action}`);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-success border-border bg-surface';
            case 'stopped': return 'text-textTertiary border-border bg-surface';
            case 'errored': return 'text-error border-border bg-surface';
            default: return 'text-textSecondary border-border bg-surface';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'online': return <CheckCircle className="w-5 h-5 text-success" />;
            case 'stopped': return <Square className="w-5 h-5 text-textTertiary" />;
            case 'errored': return <AlertCircle className="w-5 h-5 text-error" />;
            default: return <Server className="w-5 h-5 text-textSecondary" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-lg">
            {/* Stats Overview */}
            {system && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-md mb-lg">
                    {/* Total Workers */}
                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md">
                        <div className="flex items-center justify-between mb-xs">
                            <span className="text-sm text-textSecondary">Total Workers</span>
                            <Server className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-2xl font-bold text-textPrimary">{stats.total}</div>
                    </div>

                    {/* Online */}
                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md">
                        <div className="flex items-center justify-between mb-xs">
                            <span className="text-sm text-textSecondary">Online</span>
                            <CheckCircle className="w-4 h-4 text-success" />
                        </div>
                        <div className="text-2xl font-bold text-success">{stats.online}</div>
                    </div>

                    {/* Stopped */}
                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md">
                        <div className="flex items-center justify-between mb-xs">
                            <span className="text-sm text-textSecondary">Stopped</span>
                            <Square className="w-4 h-4 text-textTertiary" />
                        </div>
                        <div className="text-2xl font-bold text-textTertiary">{stats.stopped}</div>
                    </div>

                    {/* Errored */}
                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md">
                        <div className="flex items-center justify-between mb-xs">
                            <span className="text-sm text-textSecondary">Errors</span>
                            <AlertCircle className="w-4 h-4 text-error" />
                        </div>
                        <div className="text-2xl font-bold text-error">{stats.errored}</div>
                    </div>
                </div>
            )}

            {/* System Info */}
            {system && (
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md mb-lg">
                    <h3 className="text-sm font-semibold text-textPrimary mb-md">System Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-md text-sm">
                        <div>
                            <span className="text-textTertiary">OS:</span>
                            <span className="ml-2 text-textPrimary">{system.os?.split(' ')[0] || 'Unknown'}</span>
                        </div>
                        <div>
                            <span className="text-textTertiary">Node:</span>
                            <span className="ml-2 text-textPrimary">{system.node || 'Unknown'}</span>
                        </div>
                        <div>
                            <span className="text-textTertiary">PM2:</span>
                            <span className="ml-2 text-textPrimary">{system.pm2 || 'Unknown'}</span>
                        </div>
                        <div>
                            <span className="text-textTertiary">Uptime:</span>
                            <span className="ml-2 text-textPrimary">{system.uptime || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Worker Cards Grid */}
            {workers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-xl">
                    <Server className="w-16 h-16 text-textTertiary mb-md opacity-50" />
                    <h3 className="text-xl font-bold text-textPrimary mb-sm">No Workers Found</h3>
                    <p className="text-textSecondary">Deploy a worker to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                    {workers.map(worker => (
                        <div
                            key={worker.name}
                            className={`
                                border rounded-[var(--radius-lg)] p-md
                                transition-all hover:shadow-lg
                                ${getStatusColor(worker.status)}
                            `}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-md">
                                <div className="flex items-center gap-sm">
                                    {getStatusIcon(worker.status)}
                                    <div>
                                        <h4 className="font-semibold text-textPrimary">{worker.name}</h4>
                                        {worker.template && (
                                            <p className="text-xs text-textTertiary">{worker.template}</p>
                                        )}
                                    </div>
                                </div>
                                <span className={`
                                    text-xs font-medium px-sm py-xs rounded-[var(--radius-sm)]
                                    ${worker.status === 'online' ? 'bg-surfaceElevated text-success' :
                                        worker.status === 'stopped' ? 'bg-surface text-textTertiary' :
                                            'bg-surfaceElevated text-error'}
                                `}>
                                    {worker.status.toUpperCase()}
                                </span>
                            </div>

                            {/* Metrics */}
                            <div className="grid grid-cols-2 gap-sm mb-md text-sm">
                                <div className="flex items-center gap-xs">
                                    <Cpu className="w-3 h-3 text-textTertiary" />
                                    <span className="text-textSecondary">CPU:</span>
                                    <span className="text-textPrimary font-medium">{worker.cpu}</span>
                                </div>
                                <div className="flex items-center gap-xs">
                                    <HardDrive className="w-3 h-3 text-textTertiary" />
                                    <span className="text-textSecondary">RAM:</span>
                                    <span className="text-textPrimary font-medium">{worker.memory}</span>
                                </div>
                                <div className="flex items-center gap-xs">
                                    <Clock className="w-3 h-3 text-textTertiary" />
                                    <span className="text-textSecondary">Uptime:</span>
                                    <span className="text-textPrimary font-medium">{worker.uptime}</span>
                                </div>
                                <div className="flex items-center gap-xs">
                                    <RotateCcw className="w-3 h-3 text-textTertiary" />
                                    <span className="text-textSecondary">Restarts:</span>
                                    <span className="text-textPrimary font-medium">{worker.restarts}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-xs border-t border-border/50 pt-md">
                                {worker.status === 'stopped' ? (
                                    <button
                                        onClick={() => handleAction('start', worker.name)}
                                        disabled={actionLoading === worker.name}
                                        className="btn btn-primary btn-sm flex-1"
                                    >
                                        {actionLoading === worker.name ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <><Play className="w-3 h-3" /> Start</>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleAction('stop', worker.name)}
                                        disabled={actionLoading === worker.name}
                                        className="btn btn-secondary btn-sm flex-1"
                                    >
                                        {actionLoading === worker.name ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <><Square className="w-3 h-3" /> Stop</>
                                        )}
                                    </button>
                                )}

                                <button
                                    onClick={() => handleAction('restart', worker.name)}
                                    disabled={actionLoading === worker.name}
                                    className="btn btn-secondary btn-sm"
                                    title="Restart"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                </button>

                                <button
                                    onClick={() => {/* Open logs */ }}
                                    className="btn btn-secondary btn-sm"
                                    title="View Logs"
                                >
                                    <Terminal className="w-3 h-3" />
                                </button>

                                <button
                                    onClick={() => handleAction('delete', worker.name)}
                                    disabled={actionLoading === worker.name}
                                    className="btn btn-secondary btn-sm text-error hover:bg-surfaceElevated"
                                    title="Delete"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
