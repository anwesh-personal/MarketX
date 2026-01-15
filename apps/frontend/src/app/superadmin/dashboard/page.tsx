'use client';

import React, { useState, useEffect } from 'react';
import {
    Building2,
    Users,
    Database,
    TrendingUp,
    DollarSign,
    Activity,
    ArrowUp,
    ArrowDown,
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

    const statCards = [
        {
            title: 'Active Organizations',
            value: stats?.active_orgs || 0,
            icon: Building2,
            color: 'text-primary',
            bgColor: 'bg-primary/10',
        },
        {
            title: 'Total Users',
            value: stats?.total_users || 0,
            icon: Users,
            color: 'text-info',
            bgColor: 'bg-info/10',
        },
        {
            title: 'Knowledge Bases',
            value: stats?.total_kbs || 0,
            icon: Database,
            color: 'text-success',
            bgColor: 'bg-success/10',
        },
        {
            title: 'Total Runs',
            value: stats?.total_runs || 0,
            icon: Activity,
            color: 'text-secondary',
            bgColor: 'bg-secondary/10',
        },
        {
            title: 'Runs (30 Days)',
            value: stats?.runs_last_30_days || 0,
            icon: TrendingUp,
            color: 'text-accent',
            bgColor: 'bg-accent/10',
            change: '+12%',
            changeType: 'positive',
        },
        {
            title: 'Monthly Recurring Revenue',
            value: `$${(stats?.mrr_usd || 0).toLocaleString()}`,
            icon: DollarSign,
            color: 'text-success',
            bgColor: 'bg-success/10',
            change: '+8%',
            changeType: 'positive',
        },
    ];

    if (isLoading) {
        return (
            <div className="space-y-lg">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-textPrimary">Dashboard</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className="bg-surface border border-border rounded-[var(--radius-lg)] p-md h-32 animate-pulse"
                        />
                    ))}
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
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={card.title}
                            className="
                bg-surface
                border border-border
                rounded-[var(--radius-lg)]
                p-md
                shadow-[var(--shadow-sm)]
                hover:shadow-[var(--shadow-md)]
                transition-all duration-[var(--duration-normal)]
                group
              "
                        >
                            <div className="flex items-start justify-between mb-md">
                                <div className={`p-sm rounded-[var(--radius-md)] ${card.bgColor}`}>
                                    <Icon className={`w-6 h-6 ${card.color}`} />
                                </div>
                                {card.change && (
                                    <div
                                        className={`
                      flex items-center gap-xs text-sm font-medium
                      ${card.changeType === 'positive' ? 'text-success' : 'text-error'}
                    `}
                                    >
                                        {card.changeType === 'positive' ? (
                                            <ArrowUp className="w-4 h-4" />
                                        ) : (
                                            <ArrowDown className="w-4 h-4" />
                                        )}
                                        <span>{card.change}</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <p className="text-textSecondary text-sm mb-xs">
                                    {card.title}
                                </p>
                                <p className="text-textPrimary text-2xl font-bold">
                                    {card.value}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                <h2 className="text-xl font-bold text-textPrimary mb-md">
                    Quick Actions
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-sm">
                    <a
                        href="/superadmin/organizations?action=create"
                        className="
              flex items-center gap-sm
              bg-background
              border border-border
              rounded-[var(--radius-md)]
              p-sm
              hover:bg-surfaceHover
              hover:border-borderHover
              transition-all
              group
            "
                    >
                        <div className="p-xs rounded-[var(--radius-sm)] bg-primary/10">
                            <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-textPrimary font-medium">Create Organization</span>
                    </a>

                    <a
                        href="/superadmin/users"
                        className="
              flex items-center gap-sm
              bg-background
              border border-border
              rounded-[var(--radius-md)]
              p-sm
              hover:bg-surfaceHover
              hover:border-borderHover
              transition-all
            "
                    >
                        <div className="p-xs rounded-[var(--radius-sm)] bg-info/10">
                            <Users className="w-5 h-5 text-info" />
                        </div>
                        <span className="text-textPrimary font-medium">View All Users</span>
                    </a>

                    <a
                        href="/superadmin/licenses/transactions"
                        className="
              flex items-center gap-sm
              bg-background
              border border-border
              rounded-[var(--radius-md)]
              p-sm
              hover:bg-surfaceHover
              hover:border-borderHover
              transition-all
            "
                    >
                        <div className="p-xs rounded-[var(--radius-sm)] bg-success/10">
                            <TrendingUp className="w-5 h-5 text-success" />
                        </div>
                        <span className="text-textPrimary font-medium">License History</span>
                    </a>

                    <a
                        href="/superadmin/analytics"
                        className="
              flex items-center gap-sm
              bg-background
              border border-border
              rounded-[var(--radius-md)]
              p-sm
              hover:bg-surfaceHover
              hover:border-borderHover
              transition-all
            "
                    >
                        <div className="p-xs rounded-[var(--radius-sm)] bg-accent/10">
                            <Activity className="w-5 h-5 text-accent" />
                        </div>
                        <span className="text-textPrimary font-medium">Platform Analytics</span>
                    </a>
                </div>
            </div>

            {/* Recent Activity Placeholder */}
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                <h2 className="text-xl font-bold text-textPrimary mb-md">
                    Recent Activity
                </h2>
                <p className="text-textSecondary">
                    Coming soon: Real-time activity feed of platform events
                </p>
            </div>
        </div>
    );
}
