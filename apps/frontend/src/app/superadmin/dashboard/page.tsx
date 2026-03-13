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
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';

interface PlatformStats {
    active_orgs: number;
    total_users: number;
    total_kbs: number;
    total_runs: number;
    runs_last_30_days: number;
    runs_this_month: number;
    mrr_usd: number;
    trends?: {
        runs_growth: number;
    };
}

export default function SuperadminDashboard() {
    const { fetchWithAuth } = useSuperadminAuth();
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setError(null);
        try {
            const response = await fetchWithAuth('/api/superadmin/stats');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || `Failed to load stats (${response.status})`);
            }
            setStats(data.stats ?? null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load stats';
            console.error('Dashboard loadStats error:', err);
            setError(message);
            setStats(null);
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
            {/* Error banner - so you know why everything is empty */}
            {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-md text-destructive">
                    <p className="font-medium">Could not load platform stats</p>
                    <p className="mt-1 text-sm opacity-90">{error}</p>
                    <p className="mt-2 text-sm">
                        If you ran migrations on a different database (e.g. local Postgres), the app reads from Supabase. Use the same DB: set <code className="bg-black/10 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-black/10 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> to the project where you ran migrations, or run migrations in your Supabase project.
                    </p>
                    <button type="button" onClick={loadStats} className="mt-2 text-sm underline hover:no-underline">Try again</button>
                </div>
            )}

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
                <div className="
                    card group relative overflow-hidden cursor-pointer
                    transition-all duration-300 ease-out
                    hover:scale-105 hover:-translate-y-1
                    border border-border
                    shadow-sm
                    hover:shadow-[0_0_0_1px_var(--color-primary),0_8px_32px_-4px_var(--color-primary),0_0_64px_-16px_var(--color-primary)]
                    hover:border-primary/60
                ">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="relative">
                        <div className="flex items-start justify-between mb-md">
                            <div className="
                                p-sm rounded-[var(--radius-md)] 
                                bg-primary/10 group-hover:bg-primary/20
                                transition-all duration-300
                                group-hover:shadow-[0_0_20px_var(--color-primary)]
                            ">
                                <Building2 className="w-6 h-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                            </div>
                        </div>
                        <p className="text-sm text-textSecondary mb-xs group-hover:text-primary transition-colors duration-300">Active Organizations</p>
                        <p className="text-3xl font-bold text-textPrimary group-hover:text-primary transition-colors duration-300">
                            {stats?.active_orgs || 0}
                        </p>
                    </div>
                </div>

                {/* Total Users Card */}
                <div className="
                    card group relative overflow-hidden cursor-pointer
                    transition-all duration-300 ease-out
                    hover:scale-105 hover:-translate-y-1
                    border border-border
                    shadow-sm
                    hover:shadow-[0_0_0_1px_var(--color-info),0_8px_32px_-4px_var(--color-info),0_0_64px_-16px_var(--color-info)]
                    hover:border-info/60
                ">
                    <div className="absolute inset-0 bg-gradient-to-br from-info/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="relative">
                        <div className="flex items-start justify-between mb-md">
                            <div className="
                                p-sm rounded-[var(--radius-md)] 
                                bg-info/10 group-hover:bg-info/20
                                transition-all duration-300
                                group-hover:shadow-[0_0_20px_var(--color-info)]
                            ">
                                <Users className="w-6 h-6 text-info group-hover:scale-110 transition-transform duration-300" />
                            </div>
                        </div>
                        <p className="text-sm text-textSecondary mb-xs group-hover:text-info transition-colors duration-300">Total Users</p>
                        <p className="text-3xl font-bold text-textPrimary group-hover:text-info transition-colors duration-300">
                            {stats?.total_users || 0}
                        </p>
                    </div>
                </div>

                {/* Knowledge Bases Card */}
                <div className="
                    card group relative overflow-hidden cursor-pointer
                    transition-all duration-300 ease-out
                    hover:scale-105 hover:-translate-y-1
                    border border-border
                    shadow-sm
                    hover:shadow-[0_0_0_1px_var(--color-success),0_8px_32px_-4px_var(--color-success),0_0_64px_-16px_var(--color-success)]
                    hover:border-success/60
                ">
                    <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)]" />
                    <div className="absolute inset-0 bg-success/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)]" />

                    <div className="relative">
                        <div className="flex items-start justify-between mb-md">
                            <div className="
                                p-sm rounded-[var(--radius-md)] 
                                bg-success/10 group-hover:bg-success/20
                                transition-colors duration-[var(--duration-normal)]
                            ">
                                <Database className="w-6 h-6 text-success group-hover:scale-110 transition-transform duration-[var(--duration-normal)]" />
                            </div>
                        </div>
                        <p className="text-sm text-textSecondary mb-xs group-hover:text-success transition-colors duration-[var(--duration-normal)]">Knowledge Bases</p>
                        <p className="text-3xl font-bold text-textPrimary group-hover:text-success transition-colors duration-[var(--duration-normal)]">
                            {stats?.total_kbs || 0}
                        </p>
                    </div>
                </div>

                {/* Total Runs Card */}
                <div className="
                    card group relative overflow-hidden cursor-pointer
                    transition-all duration-300 ease-out
                    hover:scale-105 hover:-translate-y-1
                    border border-border
                    shadow-sm
                    hover:shadow-[0_0_0_1px_var(--color-accent),0_8px_32px_-4px_var(--color-accent),0_0_64px_-16px_var(--color-accent)]
                    hover:border-accent/60
                ">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)]" />
                    <div className="absolute inset-0 bg-accent/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)]" />

                    <div className="relative">
                        <div className="flex items-start justify-between mb-md">
                            <div className="
                                p-sm rounded-[var(--radius-md)] 
                                bg-accent/10 group-hover:bg-accent/20
                                transition-colors duration-[var(--duration-normal)]
                            ">
                                <Activity className="w-6 h-6 text-accent group-hover:scale-110 transition-transform duration-[var(--duration-normal)]" />
                            </div>
                        </div>
                        <p className="text-sm text-textSecondary mb-xs group-hover:text-accent transition-colors duration-[var(--duration-normal)]">Total Runs</p>
                        <p className="text-3xl font-bold text-textPrimary group-hover:text-accent transition-colors duration-[var(--duration-normal)]">
                            {stats?.total_runs || 0}
                        </p>
                    </div>
                </div>

                {/* Runs (30 Days) Card */}
                <div className="
                    card group relative overflow-hidden cursor-pointer
                    transition-all duration-300 ease-out
                    hover:scale-105 hover:-translate-y-1
                    border border-border
                    shadow-sm
                    hover:shadow-[0_0_0_1px_var(--color-warning),0_8px_32px_-4px_var(--color-warning),0_0_64px_-16px_var(--color-warning)]
                    hover:border-warning/60
                ">
                    <div className="absolute inset-0 bg-gradient-to-br from-warning/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)]" />
                    <div className="absolute inset-0 bg-warning/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)]" />

                    <div className="relative">
                        <div className="flex items-start justify-between mb-md">
                            <div className="
                                p-sm rounded-[var(--radius-md)] 
                                bg-warning/10 group-hover:bg-warning/20
                                transition-colors duration-[var(--duration-normal)]
                            ">
                                <TrendingUp className="w-6 h-6 text-warning group-hover:scale-110 transition-transform duration-[var(--duration-normal)]" />
                            </div>
                            {stats?.trends?.runs_growth !== undefined && stats.trends.runs_growth !== 0 && (
                                <div className={`flex items-center gap-xs text-sm font-medium ${stats.trends.runs_growth >= 0 ? 'text-success' : 'text-error'}`}>
                                    {stats.trends.runs_growth >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                                    <span>{stats.trends.runs_growth >= 0 ? '+' : ''}{stats.trends.runs_growth}%</span>
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-textSecondary mb-xs group-hover:text-warning transition-colors duration-[var(--duration-normal)]">Runs (30 Days)</p>
                        <p className="text-3xl font-bold text-textPrimary group-hover:text-warning transition-colors duration-[var(--duration-normal)]">
                            {stats?.runs_last_30_days || 0}
                        </p>
                    </div>
                </div>

                {/* Monthly Revenue Card */}
                <div className="
                    card group relative overflow-hidden cursor-pointer
                    transition-all duration-300 ease-out
                    hover:scale-105 hover:-translate-y-1
                    border border-border
                    shadow-sm
                    hover:shadow-[0_0_0_1px_var(--color-success),0_8px_32px_-4px_var(--color-success),0_0_64px_-16px_var(--color-success)]
                    hover:border-success/60
                ">
                    <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)]" />
                    <div className="absolute inset-0 bg-success/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)]" />

                    <div className="relative">
                        <div className="flex items-start justify-between mb-md">
                            <div className="
                                p-sm rounded-[var(--radius-md)] 
                                bg-success/10 group-hover:bg-success/20
                                transition-colors duration-[var(--duration-normal)]
                            ">
                                <DollarSign className="w-6 h-6 text-success group-hover:scale-110 transition-transform duration-[var(--duration-normal)]" />
                            </div>
                        </div>
                        <p className="text-sm text-textSecondary mb-xs group-hover:text-success transition-colors duration-[var(--duration-normal)]">Monthly Recurring Revenue</p>
                        <p className="text-3xl font-bold text-textPrimary group-hover:text-success transition-colors duration-[var(--duration-normal)]">
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
