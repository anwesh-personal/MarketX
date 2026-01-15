'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Activity,
    TrendingUp,
    TrendingDown,
    Zap,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AnalyticsData {
    total_runs: number;
    successful_runs: number;
    failed_runs: number;
    avg_duration_seconds: number;
    runs_by_day: { date: string; count: number }[];
    success_rate_trend: number;
}

export default function AnalyticsPage() {
    const router = useRouter();
    const supabase = createClient();
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('7d');

    useEffect(() => {
        checkAuth();
    }, [timeRange]);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        await loadAnalytics(user.id);
    };

    const loadAnalytics = async (userId: string) => {
        try {
            setIsLoading(true);

            // Get time range
            const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Get all runs in time range
            const { data: runs } = await supabase
                .from('runs')
                .select('status, created_at, completed_at')
                .eq('triggered_by', userId)
                .gte('created_at', startDate.toISOString());

            if (!runs) {
                setAnalytics(null);
                return;
            }

            // Calculate metrics
            const totalRuns = runs.length;
            const successfulRuns = runs.filter(r => r.status === 'completed').length;
            const failedRuns = runs.filter(r => r.status === 'failed').length;

            // Calculate average duration
            const completedWithDuration = runs.filter(r => r.completed_at && r.created_at);
            const avgDuration = completedWithDuration.length > 0
                ? completedWithDuration.reduce((sum, r) => {
                    const duration = new Date(r.completed_at!).getTime() - new Date(r.created_at).getTime();
                    return sum + duration / 1000; // Convert to seconds
                }, 0) / completedWithDuration.length
                : 0;

            // Group by day
            const runsByDay: { [key: string]: number } = {};
            runs.forEach(run => {
                const date = new Date(run.created_at).toISOString().split('T')[0];
                runsByDay[date] = (runsByDay[date] || 0) + 1;
            });

            const runsByDayArray = Object.entries(runsByDay).map(([date, count]) => ({
                date,
                count,
            })).sort((a, b) => a.date.localeCompare(b.date));

            // Calculate success rate trend (mock for now)
            const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;
            const successRateTrend = 5.2; // TODO: Calculate actual trend

            setAnalytics({
                total_runs: totalRuns,
                successful_runs: successfulRuns,
                failed_runs: failedRuns,
                avg_duration_seconds: avgDuration,
                runs_by_day: runsByDayArray,
                success_rate_trend: successRateTrend,
            });

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

    const successRate = analytics && analytics.total_runs > 0
        ? Math.round((analytics.successful_runs / analytics.total_runs) * 100)
        : 0;

    return (
        <div className="space-y-lg">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                        Analytics
                    </h1>
                    <p className="text-textSecondary">
                        Track your content generation performance
                    </p>
                </div>

                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="
                        px-md py-sm
                        bg-background text-textPrimary
                        border border-border rounded-[var(--radius-md)]
                        focus:outline-none focus:ring-2 focus:ring-borderFocus
                        transition-all
                    "
                >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                </select>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
                {/* Total Runs */}
                <div className="card">
                    <div className="flex items-start justify-between mb-md">
                        <div className="p-sm rounded-[var(--radius-md)] bg-primary/10">
                            <Zap className="w-5 h-5 text-primary" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-textPrimary mb-xs">
                        {analytics?.total_runs || 0}
                    </p>
                    <p className="text-sm text-textSecondary">Total Runs</p>
                </div>

                {/* Success Rate */}
                <div className="card">
                    <div className="flex items-start justify-between mb-md">
                        <div className="p-sm rounded-[var(--radius-md)] bg-success/10">
                            <CheckCircle className="w-5 h-5 text-success" />
                        </div>
                        <div className="flex items-center gap-xs text-sm font-medium text-success">
                            <TrendingUp className="w-4 h-4" />
                            <span>+{analytics?.success_rate_trend.toFixed(1)}%</span>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-textPrimary mb-xs">
                        {successRate}%
                    </p>
                    <p className="text-sm text-textSecondary">Success Rate</p>
                </div>

                {/* Avg Duration */}
                <div className="card">
                    <div className="flex items-start justify-between mb-md">
                        <div className="p-sm rounded-[var(--radius-md)] bg-info/10">
                            <Clock className="w-5 h-5 text-info" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-textPrimary mb-xs">
                        {analytics?.avg_duration_seconds.toFixed(1) || 0}s
                    </p>
                    <p className="text-sm text-textSecondary">Avg Duration</p>
                </div>

                {/* Failed Runs */}
                <div className="card">
                    <div className="flex items-start justify-between mb-md">
                        <div className="p-sm rounded-[var(--radius-md)] bg-error/10">
                            <XCircle className="w-5 h-5 text-error" />
                        </div>
                        {analytics && analytics.failed_runs > 0 && (
                            <div className="flex items-center gap-xs text-sm font-medium text-error">
                                <TrendingDown className="w-4 h-4" />
                            </div>
                        )}
                    </div>
                    <p className="text-2xl font-bold text-textPrimary mb-xs">
                        {analytics?.failed_runs || 0}
                    </p>
                    <p className="text-sm text-textSecondary">Failed Runs</p>
                </div>
            </div>

            {/* Activity Chart */}
            <div className="card">
                <h2 className="text-xl font-bold text-textPrimary mb-md">
                    Activity Over Time
                </h2>

                {analytics && analytics.runs_by_day.length > 0 ? (
                    <div className="space-y-sm">
                        {analytics.runs_by_day.map((day) => (
                            <div key={day.date} className="flex items-center gap-md">
                                <span className="text-sm text-textSecondary w-24">
                                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <div className="flex-1 h-8 bg-surfaceHover rounded-[var(--radius-sm)] overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-[var(--radius-sm)] transition-all"
                                        style={{
                                            width: `${(day.count / Math.max(...analytics.runs_by_day.map(d => d.count))) * 100}%`,
                                        }}
                                    />
                                </div>
                                <span className="text-sm font-semibold text-textPrimary w-12 text-right">
                                    {day.count}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-xl">
                        <Activity className="w-12 h-12 text-textTertiary mx-auto mb-sm opacity-20" />
                        <p className="text-sm text-textSecondary">No activity data yet</p>
                    </div>
                )}
            </div>

            {/* Performance Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {/* Status Distribution */}
                <div className="card">
                    <h2 className="text-xl font-bold text-textPrimary mb-md">
                        Status Distribution
                    </h2>
                    <div className="space-y-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-sm">
                                <div className="w-3 h-3 rounded-full bg-success" />
                                <span className="text-sm text-textSecondary">Completed</span>
                            </div>
                            <span className="text-sm font-semibold text-textPrimary">
                                {analytics?.successful_runs || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-sm">
                                <div className="w-3 h-3 rounded-full bg-error" />
                                <span className="text-sm text-textSecondary">Failed</span>
                            </div>
                            <span className="text-sm font-semibold text-textPrimary">
                                {analytics?.failed_runs || 0}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="card">
                    <h2 className="text-xl font-bold text-textPrimary mb-md">
                        Quick Stats
                    </h2>
                    <div className="space-y-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-textSecondary">Best Day</span>
                            <span className="text-sm font-semibold text-textPrimary">
                                {analytics && analytics.runs_by_day.length > 0
                                    ? new Date(analytics.runs_by_day.reduce((max, day) => day.count > max.count ? day : max).date).toLocaleDateString()
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-textSecondary">Total Days Active</span>
                            <span className="text-sm font-semibold text-textPrimary">
                                {analytics?.runs_by_day.length || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
