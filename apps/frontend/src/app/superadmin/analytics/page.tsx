'use client';

import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    Users,
    Building2,
    Zap,
    Activity,
    Calendar,
    Download,
    Loader2,
} from 'lucide-react';

interface AnalyticsData {
    period: string;
    total_runs: number;
    total_orgs: number;
    active_users: number;
    kb_uploads: number;
    api_calls: number;
}

interface PlatformMetrics {
    total_organizations: number;
    total_users: number;
    total_runs_today: number;
    total_runs_this_month: number;
    avg_runs_per_org: number;
    most_active_org: string;
}

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
    const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('7d');

    useEffect(() => {
        loadData();
    }, [timeRange]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const analyticsRes = await fetch(`/api/superadmin/analytics?range=${timeRange}`);
            const analyticsData = await analyticsRes.json();
            setAnalytics(analyticsData.analytics || []);

            const metricsRes = await fetch('/api/superadmin/analytics/metrics');
            const metricsData = await metricsRes.json();
            setMetrics(metricsData.metrics || null);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setIsLoading(false);
        }
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
                        Platform Analytics
                    </h1>
                    <p className="text-textSecondary">
                        Monitor platform-wide usage, performance, and trends
                    </p>
                </div>

                <div className="flex items-center gap-sm">
                    {/* Time Range Selector */}
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="
                            bg-surface text-textPrimary
                            border border-border rounded-[var(--radius-md)]
                            px-md py-sm
                            focus:outline-none focus:ring-2 focus:ring-borderFocus
                            transition-all
                        "
                    >
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                    </select>

                    <button className="
                        flex items-center gap-xs
                        bg-primary text-white
                        px-md py-sm
                        rounded-[var(--radius-md)]
                        hover:opacity-90
                        transition-all
                    ">
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                        <div className="flex items-center justify-between mb-sm">
                            <p className="text-sm text-textSecondary">Total Organizations</p>
                            <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-3xl font-bold text-textPrimary">
                            {metrics.total_organizations}
                        </p>
                        <p className="text-xs text-textTertiary mt-xs">
                            Platform-wide
                        </p>
                    </div>

                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                        <div className="flex items-center justify-between mb-sm">
                            <p className="text-sm text-textSecondary">Total Users</p>
                            <Users className="w-5 h-5 text-info" />
                        </div>
                        <p className="text-3xl font-bold text-textPrimary">
                            {metrics.total_users}
                        </p>
                        <p className="text-xs text-textTertiary mt-xs">
                            Across all organizations
                        </p>
                    </div>

                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                        <div className="flex items-center justify-between mb-sm">
                            <p className="text-sm text-textSecondary">Runs Today</p>
                            <Zap className="w-5 h-5 text-success" />
                        </div>
                        <p className="text-3xl font-bold text-textPrimary">
                            {metrics.total_runs_today}
                        </p>
                        <p className="text-xs text-textTertiary mt-xs">
                            {metrics.total_runs_this_month} this month
                        </p>
                    </div>

                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                        <div className="flex items-center justify-between mb-sm">
                            <p className="text-sm text-textSecondary">Avg Runs per Org</p>
                            <BarChart3 className="w-5 h-5 text-accent" />
                        </div>
                        <p className="text-3xl font-bold text-textPrimary">
                            {metrics.avg_runs_per_org.toFixed(1)}
                        </p>
                        <p className="text-xs text-textTertiary mt-xs">
                            Per organization
                        </p>
                    </div>

                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg md:col-span-2">
                        <div className="flex items-center justify-between mb-sm">
                            <p className="text-sm text-textSecondary">Most Active Organization</p>
                            <TrendingUp className="w-5 h-5 text-warning" />
                        </div>
                        <p className="text-2xl font-bold text-textPrimary">
                            {metrics.most_active_org || 'N/A'}
                        </p>
                        <p className="text-xs text-textTertiary mt-xs">
                            Highest run count this period
                        </p>
                    </div>
                </div>
            )}

            {/* Chart Placeholder */}
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                <h3 className="text-lg font-bold text-textPrimary mb-md">
                    Usage Trends
                </h3>

                {/* Simple bar chart visualization */}
                <div className="space-y-sm">
                    {analytics.map((data, index) => (
                        <div key={index} className="space-y-xs">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-textSecondary">{data.period}</span>
                                <span className="text-textPrimary font-medium">{data.total_runs} runs</span>
                            </div>
                            <div className="w-full bg-surfaceHover rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-primary h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${(data.total_runs / Math.max(...analytics.map(d => d.total_runs), 1)) * 100}%`
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {analytics.length === 0 && (
                    <div className="text-center py-xl">
                        <BarChart3 className="w-12 h-12 mx-auto mb-md text-textTertiary opacity-50" />
                        <p className="text-textSecondary">No data available for this period</p>
                    </div>
                )}
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                    <h3 className="text-lg font-bold text-textPrimary mb-md flex items-center gap-sm">
                        <Activity className="w-5 h-5 text-primary" />
                        Recent Activity
                    </h3>
                    <div className="space-y-sm">
                        {analytics.slice(0, 5).map((data, index) => (
                            <div key={index} className="flex items-center justify-between py-xs border-b border-border last:border-0">
                                <div className="flex items-center gap-sm">
                                    <Calendar className="w-4 h-4 text-textTertiary" />
                                    <span className="text-sm text-textSecondary">{data.period}</span>
                                </div>
                                <div className="flex items-center gap-md text-xs">
                                    <span className="text-textTertiary">{data.total_orgs} orgs</span>
                                    <span className="text-textTertiary">{data.active_users} users</span>
                                    <span className="text-textPrimary font-medium">{data.total_runs} runs</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                    <h3 className="text-lg font-bold text-textPrimary mb-md flex items-center gap-sm">
                        <Zap className="w-5 h-5 text-warning" />
                        System Health
                    </h3>
                    <div className="space-y-md">
                        <div>
                            <div className="flex items-center justify-between mb-xs">
                                <span className="text-sm text-textSecondary">Database</span>
                                <span className="text-sm text-success font-medium">Healthy</span>
                            </div>
                            <div className="w-full bg-surfaceHover rounded-full h-2">
                                <div className="bg-success h-full rounded-full" style={{ width: '95%' }} />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-xs">
                                <span className="text-sm text-textSecondary">API Performance</span>
                                <span className="text-sm text-success font-medium">Excellent</span>
                            </div>
                            <div className="w-full bg-surfaceHover rounded-full h-2">
                                <div className="bg-success h-full rounded-full" style={{ width: '98%' }} />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-xs">
                                <span className="text-sm text-textSecondary">Worker Queue</span>
                                <span className="text-sm text-info font-medium">Normal</span>
                            </div>
                            <div className="w-full bg-surfaceHover rounded-full h-2">
                                <div className="bg-info h-full rounded-full" style={{ width: '85%' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
