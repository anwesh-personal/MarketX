'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    TrendingUp,
    Zap,
    Database,
    FileText,
    Activity,
    Plus,
    ArrowRight,
    RefreshCw,
    Clock,
    CheckCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DashboardStats {
    total_runs: number;
    successful_runs: number;
    failed_runs: number;
    total_kbs: number;
    runs_this_week: number;
    org_name: string;
    org_plan: string;
    quota_runs: number;
    quota_kbs: number;
}

interface RecentRun {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    created_at: string;
    kb_name: string | null;
}

export default function DashboardPage() {
    const router = useRouter();
    const supabase = createClient();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        await loadDashboard(user.id);
    };

    const loadDashboard = async (userId: string) => {
        try {
            setIsLoading(true);

            // Get user info
            const { data: userData } = await supabase
                .from('users')
                .select(`
                    full_name,
                    org_id,
                    organization:organizations(
                        name,
                        plan,
                        max_runs_per_month,
                        max_kbs
                    )
                `)
                .eq('id', userId)
                .single();

            if (userData) {
                setUserName(userData.full_name || 'User');
            }

            // Get run stats
            const { data: runs } = await supabase
                .from('runs')
                .select('status, created_at')
                .eq('triggered_by', userId);

            // Get KB count
            const { data: kbData } = await supabase
                .from('knowledge_bases')
                .select('id')
                .eq('org_id', userData?.org_id);

            const kbCount = kbData?.length || 0;

            // Get recent runs
            const { data: recentRunsData } = await supabase
                .from('runs')
                .select(`
                    id,
                    status,
                    created_at,
                    kb_id,
                    knowledge_base:knowledge_bases(name)
                `)
                .eq('triggered_by', userId)
                .order('created_at', { ascending: false })
                .limit(5);

            // Calculate stats
            const totalRuns = runs?.length || 0;
            const successfulRuns = runs?.filter(r => r.status === 'completed').length || 0;
            const failedRuns = runs?.filter(r => r.status === 'failed').length || 0;
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const runsThisWeek = runs?.filter(r => new Date(r.created_at) > weekAgo).length || 0;

            setStats({
                total_runs: totalRuns,
                successful_runs: successfulRuns,
                failed_runs: failedRuns,
                total_kbs: kbCount || 0,
                runs_this_week: runsThisWeek,
                org_name: userData?.organization?.name || 'Organization',
                org_plan: userData?.organization?.plan || 'free',
                quota_runs: userData?.organization?.max_runs_per_month || 10,
                quota_kbs: userData?.organization?.max_kbs || 1,
            });

            setRecentRuns(recentRunsData?.map(r => ({
                id: r.id,
                status: r.status,
                created_at: r.created_at,
                kb_name: (r.knowledge_base as any)?.name || null,
            })) || []);

        } catch (error) {
            console.error('Dashboard load error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    const successRate = stats?.total_runs ? Math.round((stats.successful_runs / stats.total_runs) * 100) : 0;

    return (
        <div className="space-y-lg">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                    Welcome back, {userName}
                </h1>
                <p className="text-textSecondary">
                    {stats?.org_name} • {stats?.org_plan.toUpperCase()} Plan
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
                {/* Total Runs */}
                <div className="card">
                    <div className="flex items-start justify-between mb-md">
                        <div className="p-sm rounded-[var(--radius-md)] bg-primary/10">
                            <Zap className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-xs text-textTertiary">
                            {stats?.runs_this_week || 0} this week
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-textPrimary mb-xs">
                        {stats?.total_runs || 0}
                    </p>
                    <p className="text-sm text-textSecondary">Total Runs</p>
                    <div className="mt-sm text-xs text-textTertiary">
                        {stats?.quota_runs || 0} per month
                    </div>
                </div>

                {/* Success Rate */}
                <div className="card">
                    <div className="flex items-start justify-between mb-md">
                        <div className="p-sm rounded-[var(--radius-md)] bg-success/10">
                            <CheckCircle className="w-5 h-5 text-success" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-success" />
                    </div>
                    <p className="text-2xl font-bold text-textPrimary mb-xs">
                        {successRate}%
                    </p>
                    <p className="text-sm text-textSecondary">Success Rate</p>
                    <div className="mt-sm text-xs text-textTertiary">
                        {stats?.successful_runs || 0} successful
                    </div>
                </div>

                {/* Knowledge Bases */}
                <div className="card">
                    <div className="flex items-start justify-between mb-md">
                        <div className="p-sm rounded-[var(--radius-md)] bg-info/10">
                            <Database className="w-5 h-5 text-info" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-textPrimary mb-xs">
                        {stats?.total_kbs || 0}
                    </p>
                    <p className="text-sm text-textSecondary">Knowledge Bases</p>
                    <div className="mt-sm text-xs text-textTertiary">
                        {stats?.quota_kbs || 0} max allowed
                    </div>
                </div>

                {/* Failed Runs */}
                <div className="card">
                    <div className="flex items-start justify-between mb-md">
                        <div className="p-sm rounded-[var(--radius-md)] bg-error/10">
                            <Activity className="w-5 h-5 text-error" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-textPrimary mb-xs">
                        {stats?.failed_runs || 0}
                    </p>
                    <p className="text-sm text-textSecondary">Failed Runs</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h2 className="text-xl font-bold text-textPrimary mb-md">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                    <Link
                        href="/writer/new"
                        className="
                            flex items-center justify-between
                            p-md
                            bg-primary/5 border border-primary/20
                            rounded-[var(--radius-md)]
                            hover:bg-primary/10 hover:scale-[1.02]
                            transition-all
                        "
                    >
                        <div className="flex items-center gap-sm">
                            <Plus className="w-5 h-5 text-primary" />
                            <span className="font-medium text-textPrimary">New Run</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-textSecondary" />
                    </Link>

                    <Link
                        href="/kb-manager"
                        className="
                            flex items-center justify-between
                            p-md
                            bg-info/5 border border-info/20
                            rounded-[var(--radius-md)]
                            hover:bg-info/10 hover:scale-[1.02]
                            transition-all
                        "
                    >
                        <div className="flex items-center gap-sm">
                            <Database className="w-5 h-5 text-info" />
                            <span className="font-medium text-textPrimary">Manage KBs</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-textSecondary" />
                    </Link>

                    <Link
                        href="/analytics"
                        className="
                            flex items-center justify-between
                            p-md
                            bg-accent/5 border border-accent/20
                            rounded-[var(--radius-md)]
                            hover:bg-accent/10 hover:scale-[1.02]
                            transition-all
                        "
                    >
                        <div className="flex items-center gap-sm">
                            <Activity className="w-5 h-5 text-accent" />
                            <span className="font-medium text-textPrimary">View Analytics</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-textSecondary" />
                    </Link>
                </div>
            </div>

            {/* Recent Runs */}
            <div className="card">
                <div className="flex items-center justify-between mb-md">
                    <h2 className="text-xl font-bold text-textPrimary">Recent Runs</h2>
                    <Link href="/writer" className="text-sm text-primary hover:underline">
                        View All
                    </Link>
                </div>

                {recentRuns.length > 0 ? (
                    <div className="space-y-sm">
                        {recentRuns.map((run) => (
                            <div
                                key={run.id}
                                className="flex items-center justify-between p-md bg-surfaceHover rounded-[var(--radius-md)] hover:bg-surface transition-all"
                            >
                                <div className="flex items-center gap-md">
                                    <div className={`
                                        w-2 h-2 rounded-full
                                        ${run.status === 'completed' ? 'bg-success' :
                                            run.status === 'failed' ? 'bg-error' :
                                                run.status === 'running' ? 'bg-warning animate-pulse' :
                                                    'bg-textTertiary'}
                                    `} />
                                    <div>
                                        <p className="text-sm font-medium text-textPrimary">
                                            {run.kb_name || 'Run'}
                                        </p>
                                        <p className="text-xs text-textTertiary flex items-center gap-xs">
                                            <Clock className="w-3 h-3" />
                                            {new Date(run.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <span className={`
                                    text-xs font-medium px-sm py-xs rounded-full
                                    ${run.status === 'completed' ? 'bg-success/10 text-success' :
                                        run.status === 'failed' ? 'bg-error/10 text-error' :
                                            run.status === 'running' ? 'bg-warning/10 text-warning' :
                                                'bg-textTertiary/10 text-textTertiary'}
                                `}>
                                    {run.status}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-xl">
                        <FileText className="w-12 h-12 text-textTertiary mx-auto mb-sm opacity-20" />
                        <p className="text-sm text-textSecondary">No runs yet</p>
                        <Link href="/writer/new" className="text-sm text-primary hover:underline mt-xs inline-block">
                            Create your first run
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
