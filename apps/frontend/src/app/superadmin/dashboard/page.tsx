'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Building2,
    Users,
    Database,
    TrendingUp,
    DollarSign,
    Activity,
    ArrowUp,
    ArrowDown,
    RefreshCw,
} from 'lucide-react';

interface PlatformStats {
    active_orgs: number;
    total_users: number;
    total_kbs: number;
    total_runs: number;
    runs_last_30_days: number;
    runs_this_month: number;
    mrr_usd: number;
}

export default function SuperadminDashboard() {
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const session = localStorage.getItem('superadmin_session');
            if (!session) return;

            const { token } = JSON.parse(session);

            const response = await fetch('/api/superadmin/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Failed to load stats');

            const data = await response.json();
            setStats(data.stats);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="loading">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-lg">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                        Platform Dashboard
                    </h1>
                    <p className="text-textSecondary">
                        Welcome back! Here's what's happening with your platform.
                    </p>
                </div>
                <button
                    onClick={loadStats}
                    className="
                        flex items-center gap-xs
                        bg-surfaceHover text-textPrimary
                        border border-border
                        px-md py-sm
                        rounded-[var(--radius-md)]
                        hover:bg-surface hover:scale-[var(--hover-scale)]
                        active:scale-[var(--active-scale)]
                        transition-all duration-[var(--duration-fast)]
                    "
                >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm font-medium">Refresh</span>
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {/* Active Organizations Card */}
                <div className="card group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-slow)]" />

                    <div className="relative">
                        <div className="flex items-start justify-between mb-md">
                            <div className="p-sm rounded-[var(--radius-md)] bg-primary/10">
                                <Building2 className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                        <p className="text-sm text-textSecondary mb-xs">Active Organizations</p>
                        <p className="text-3xl font-bold text-textPrimary">
                            {stats?.active_orgs || 0}
                        </p>
                    </div>
                </div>

                {/* Total Users Card */}
                <div className="card group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-info/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-slow)]" />

                    <div className="relative">
                        <div className="flex items-start justify-between mb-md">
                            <div className="p-sm rounded-[var(--radius-md)] bg-info/10">
                                <Users className="w-6 h-6 text-info" />
                            </div>
                        </div>
                        <p className="text-sm text-textSecondary mb-xs">Total Users</p>
                        <p className="text-3xl font-bold text-textPrimary">
                            {stats?.total_users || 0}
                        </p>
                    </div>
                </div>

                {/* Knowledge Bases Card */}
                <div className="card group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-slow)]" />

                    <div className="relative">
                        <div className="flex items-start justify-between mb-md">
                            <div className="p-sm rounded-[var(--radius-md)] bg-success/10">
                                <Database className="w-6 h-6 text-success" />
                            </div>
                        </div>
                        <p className="text-sm text-textSecondary mb-xs">Knowledge Bases</p>
                        <p className="text-3xl font-bold text-textPrimary">
                            {stats?.total_kbs || 0}
                        </p>
                    </div>
                </div>

                {/* Total Runs Card */}
                <div className="card group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-slow)]" />

                    <div className="relative">
                        <div className="flex items-start justify-between mb-md">
                            <div className="p-sm rounded-[var(--radius-md)] bg-accent/10">
                                <Activity className="w-6 h-6 text-accent" />
                            </div>
                        </div>
                        <p className="text-sm text-textSecondary mb-xs">Total Runs</p>
                        <p className="text-3xl font-bold text-textPrimary">
                            {stats?.total_runs || 0}
                        </p>
                    </div>
                </div>

                {/* Runs (30 Days) Card */}
                <div className="card group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-slow)]" />

                    <div className="relative">
                        <div className="flex items-start justify-between mb-md">
                            <div className="p-sm rounded-[var(--radius-md)] bg-warning/10">
                                <TrendingUp className="w-6 h-6 text-warning" />
                            </div>
                            <div className="flex items-center gap-xs text-sm font-medium text-success">
                                <ArrowUp className="w-4 h-4" />
                                <span>+12%</span>
                            </div>
                        </div>
                        <p className="text-sm text-textSecondary mb-xs">Runs (30 Days)</p>
                        <p className="text-3xl font-bold text-textPrimary">
                            {stats?.runs_last_30_days || 0}
                        </p>
                    </div>
                </div>

                {/* Monthly Revenue Card */}
                <div className="card group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-slow)]" />

                    <div className="relative">
                        <div className="flex items-start justify-between mb-md">
                            <div className="p-sm rounded-[var(--radius-md)] bg-success/10">
                                <DollarSign className="w-6 h-6 text-success" />
                            </div>
                            <div className="flex items-center gap-xs text-sm font-medium text-success">
                                <ArrowUp className="w-4 h-4" />
                                <span>+8%</span>
                            </div>
                        </div>
                        <p className="text-sm text-textSecondary mb-xs">Monthly Recurring Revenue</p>
                        <p className="text-3xl font-bold text-textPrimary">
                            ${(stats?.mrr_usd || 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h2 className="text-xl font-bold text-textPrimary mb-md">
                    Quick Actions
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-sm">
                    <Link
                        href="/superadmin/organizations?action=create"
                        className="
                            group relative overflow-hidden
                            flex items-center justify-center gap-sm
                            p-md
                            bg-primary/5 border border-primary/20
                            rounded-[var(--radius-lg)]
                            hover:bg-primary/10 hover:border-primary/40
                            hover:scale-[var(--hover-scale)]
                            active:scale-[var(--active-scale)]
                            transition-all duration-[var(--duration-normal)]
                        "
                    >
                        <Building2 className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium text-textPrimary">Create Organization</span>
                    </Link>

                    <Link
                        href="/superadmin/users"
                        className="
                            group relative overflow-hidden
                            flex items-center justify-center gap-sm
                            p-md
                            bg-info/5 border border-info/20
                            rounded-[var(--radius-lg)]
                            hover:bg-info/10 hover:border-info/40
                            hover:scale-[var(--hover-scale)]
                            active:scale-[var(--active-scale)]
                            transition-all duration-[var(--duration-normal)]
                        "
                    >
                        <Users className="w-5 h-5 text-info" />
                        <span className="text-sm font-medium text-textPrimary">View All Users</span>
                    </Link>

                    <Link
                        href="/superadmin/licenses"
                        className="
                            group relative overflow-hidden
                            flex items-center justify-center gap-sm
                            p-md
                            bg-success/5 border border-success/20
                            rounded-[var(--radius-lg)]
                            hover:bg-success/10 hover:border-success/40
                            hover:scale-[var(--hover-scale)]
                            active:scale-[var(--active-scale)]
                            transition-all duration-[var(--duration-normal)]
                        "
                    >
                        <TrendingUp className="w-5 h-5 text-success" />
                        <span className="text-sm font-medium text-textPrimary">License History</span>
                    </Link>

                    <Link
                        href="/superadmin/analytics"
                        className="
                            group relative overflow-hidden
                            flex items-center justify-center gap-sm
                            p-md
                            bg-accent/5 border border-accent/20
                            rounded-[var(--radius-lg)]
                            hover:bg-accent/10 hover:border-accent/40
                            hover:scale-[var(--hover-scale)]
                            active:scale-[var(--active-scale)]
                            transition-all duration-[var(--duration-normal)]
                        "
                    >
                        <Activity className="w-5 h-5 text-accent" />
                        <span className="text-sm font-medium text-textPrimary">Platform Analytics</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
