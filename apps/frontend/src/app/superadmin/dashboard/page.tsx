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
                    <RefreshCw className="w-8 h-8 text-accent animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-lg">
            {/* Error banner */}
            {error && (
                <div className="rounded-[var(--radius-lg)] border border-border bg-error-muted p-md text-error">
                    <p className="font-medium">Could not load platform stats</p>
                    <p className="mt-1 text-sm opacity-90">{error}</p>
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
                        Welcome back! Here&apos;s what&apos;s happening with your platform.
                    </p>
                </div>
                <button
                    onClick={loadStats}
                    className="
                        flex items-center gap-xs
                        bg-surface text-textSecondary
                        border border-border
                        px-md py-sm
                        rounded-[var(--radius-md)]
                        hover:bg-surfaceHover hover:text-textPrimary
                        active:scale-[var(--active-scale)]
                        transition-all duration-[var(--duration-fast)]
                    "
                >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm font-medium">Refresh</span>
                </button>
            </div>

            {/* Stats Grid — unified accent glow */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                <StatCard icon={Building2} label="Active Organizations" value={stats?.active_orgs || 0} />
                <StatCard icon={Users} label="Total Users" value={stats?.total_users || 0} />
                <StatCard icon={Database} label="Knowledge Bases" value={stats?.total_kbs || 0} />
                <StatCard icon={Activity} label="Total Runs" value={stats?.total_runs || 0} />
                <StatCard
                    icon={TrendingUp}
                    label="Runs (30 Days)"
                    value={stats?.runs_last_30_days || 0}
                    trend={stats?.trends?.runs_growth}
                />
                <StatCard icon={DollarSign} label="Monthly Recurring Revenue" value={`$${(stats?.mrr_usd || 0).toLocaleString()}`} />
            </div>

            {/* Quick Actions — unified accent tinting */}
            <div className="card">
                <h2 className="text-xl font-bold text-textPrimary mb-md">
                    Quick Actions
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-sm">
                    <QuickAction href="/superadmin/organizations?action=create" icon={Building2} label="Create Organization" />
                    <QuickAction href="/superadmin/users" icon={Users} label="View All Users" />
                    <QuickAction href="/superadmin/licenses" icon={TrendingUp} label="License History" />
                    <QuickAction href="/superadmin/analytics" icon={Activity} label="Platform Analytics" />
                </div>
            </div>
        </div>
    );
}

// ── Stat Card — theme-accent only ────────────────────────────────────

function StatCard({ icon: Icon, label, value, trend }: {
    icon: any; label: string; value: number | string; trend?: number
}) {
    return (
        <div className="
            premium-card group relative overflow-hidden cursor-default
            transition-all duration-[var(--duration-normal)]
            hover:-translate-y-[var(--hover-lift)]
            hover:shadow-[0_0_0_1px_rgba(var(--color-accent-rgb),0.15),0_8px_32px_-4px_rgba(var(--color-accent-rgb),0.12)]
        ">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--color-accent-rgb),0.06),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--duration-normal)]" />

            <div className="relative">
                <div className="flex items-start justify-between mb-md">
                    <div className="
                        p-sm rounded-[var(--radius-md)]
                        bg-[rgba(var(--color-accent-rgb),0.08)] group-hover:bg-[rgba(var(--color-accent-rgb),0.14)]
                        transition-all duration-[var(--duration-normal)]
                    ">
                        <Icon className="w-6 h-6 text-accent group-hover:scale-110 transition-transform duration-[var(--duration-normal)]" />
                    </div>
                    {trend !== undefined && trend !== 0 && (
                        <div className={`flex items-center gap-xs text-sm font-medium ${trend >= 0 ? 'text-success' : 'text-error'}`}>
                            {trend >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                            <span>{trend >= 0 ? '+' : ''}{trend}%</span>
                        </div>
                    )}
                </div>
                <p className="text-sm text-textSecondary mb-xs">{label}</p>
                <p className="text-3xl font-bold text-textPrimary tracking-tight">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
            </div>
        </div>
    );
}

// ── Quick Action — theme-accent only ─────────────────────────────────

function QuickAction({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
    return (
        <Link
            href={href}
            className="
                group relative overflow-hidden
                flex items-center justify-center gap-sm
                p-md
                bg-[rgba(var(--color-accent-rgb),0.04)] border border-[rgba(var(--color-accent-rgb),0.1)]
                rounded-[var(--radius-lg)]
                hover:bg-[rgba(var(--color-accent-rgb),0.08)] hover:border-[rgba(var(--color-accent-rgb),0.2)]
                hover:scale-[var(--hover-scale)]
                active:scale-[var(--active-scale)]
                transition-all duration-[var(--duration-normal)]
            "
        >
            <Icon className="w-5 h-5 text-accent" />
            <span className="text-sm font-medium text-textPrimary">{label}</span>
        </Link>
    );
}
