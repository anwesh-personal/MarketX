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
    X,
    ChevronRight,
    Sparkles,
    Brain,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import OnboardingModal, { computeOnboardingPercentage } from '@/components/onboarding/OnboardingModal';

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
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingComplete, setOnboardingComplete] = useState(true);
    const [onboardingPct, setOnboardingPct] = useState(0);
    const [userId, setUserId] = useState('');
    const [orgId, setOrgId] = useState('');
    const [orgName, setOrgName] = useState('');
    const [walkthroughDismissed, setWalkthroughDismissed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('mw_walkthrough_dismissed') === '1';
    });

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        setUserId(user.id);
        await loadDashboard(user.id);
        await checkOnboardingStatus(user.id);
    };

    const checkOnboardingStatus = async (uid: string) => {
        const { data: userData } = await supabase
            .from('users')
            .select('onboarding_completed')
            .eq('id', uid)
            .single();

        const isComplete = userData?.onboarding_completed === true;
        setOnboardingComplete(isComplete);

        if (!isComplete) {
            const { data: session } = await supabase
                .from('onboarding_sessions')
                .select('company_data, icp_data, offer_data, voice_data')
                .eq('user_id', uid)
                .eq('status', 'in_progress')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (session) {
                const pct = computeOnboardingPercentage(
                    session.company_data as any || {},
                    session.icp_data as any[] || [],
                    session.offer_data as any || {},
                    session.voice_data as any || {}
                );
                setOnboardingPct(pct);
            }

            setShowOnboarding(true);
        }
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
                setOrgId(userData.org_id || '');
                const org = Array.isArray(userData.organization) ? userData.organization[0] : userData.organization;
                setOrgName((org as any)?.name || '');
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

            const org = Array.isArray(userData?.organization) ? userData.organization[0] : userData?.organization;

            setStats({
                total_runs: totalRuns,
                successful_runs: successfulRuns,
                failed_runs: failedRuns,
                total_kbs: kbCount || 0,
                runs_this_week: runsThisWeek,
                org_name: org?.name || 'Organization',
                org_plan: org?.plan || 'free',
                quota_runs: org?.max_runs_per_month || 10,
                quota_kbs: org?.max_kbs || 1,
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

    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
        setOnboardingComplete(true);
        setOnboardingPct(100);
        if (userId) loadDashboard(userId);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Onboarding Modal */}
            <OnboardingModal
                isOpen={showOnboarding}
                onClose={() => setShowOnboarding(false)}
                onComplete={handleOnboardingComplete}
                userId={userId}
                orgId={orgId}
                orgName={orgName}
            />

            {/* Onboarding Banner (if incomplete) */}
            {!onboardingComplete && !showOnboarding && (
                <div className="card p-4 border-accent/30 bg-gradient-to-r from-accent/5 via-primary/5 to-transparent flex items-center justify-between gap-4 animate-fade-in">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                            <Brain className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <p className="font-semibold text-textPrimary text-sm">Finish Setting Up Your Brain</p>
                            <p className="text-xs text-textSecondary">Complete onboarding so your Brain can write better emails for you.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="w-24 h-2 bg-surface rounded-full overflow-hidden border border-border">
                                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${onboardingPct}%` }} />
                            </div>
                            <span className="text-xs font-mono text-textTertiary">{onboardingPct}%</span>
                        </div>
                        <button onClick={() => setShowOnboarding(true)}
                            className="btn btn-primary btn-sm rounded-lg flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" /> Continue Setup
                        </button>
                    </div>
                </div>
            )}

            {/* Walkthrough Guide Banner */}
            {!walkthroughDismissed && (
                <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-accent/20 p-4 sm:p-5 animate-fade-in"
                    style={{
                        background: 'linear-gradient(135deg, rgba(var(--color-accent-rgb), 0.06) 0%, var(--color-surface-elevated) 100%)',
                    }}>
                    {/* Grid pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                        backgroundImage: 'linear-gradient(var(--color-accent) 1px, transparent 1px), linear-gradient(90deg, var(--color-accent) 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                    }} />
                    <div className="relative flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-accent/15 flex items-center justify-center text-2xl flex-shrink-0">
                                🚀
                            </div>
                            <div>
                                <p className="font-bold text-textPrimary text-sm mb-0.5">New to MarketWriter? Start here.</p>
                                <p className="text-xs text-textSecondary">Take a 2-minute walkthrough to understand how everything works — step by step.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Link href="/walkthrough"
                                className="btn btn-primary rounded-xl flex items-center gap-2 shadow-md"
                                style={{ boxShadow: '0 4px 20px var(--color-glow)' }}>
                                <Sparkles className="w-3.5 h-3.5" /> Start Walkthrough
                            </Link>
                            <button onClick={() => { setWalkthroughDismissed(true); localStorage.setItem('mw_walkthrough_dismissed', '1'); }}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-textTertiary hover:text-textPrimary hover:bg-surface transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-display font-bold text-textPrimary tracking-tight mb-1">
                        Dashboard
                    </h1>
                    <p className="text-textSecondary text-lg">
                        Welcome back, <span className="text-textPrimary font-medium">{userName}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {onboardingComplete && (
                        <button onClick={() => setShowOnboarding(true)} className="btn btn-ghost btn-sm text-xs text-textTertiary hover:text-accent flex items-center gap-1.5" title="Revisit onboarding">
                            <Sparkles className="w-3 h-3" /> Setup
                        </button>
                    )}
                    <div className="badge badge-accent">
                        {stats?.org_name}
                    </div>
                    <div className="badge border-border">
                        {stats?.org_plan.toUpperCase()} Plan
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card lg:col-span-2 group">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <div className="stat-card-label mb-2">Total Runs</div>
                            <div className="stat-card-value text-5xl">{stats?.total_runs || 0}</div>
                        </div>
                        <div className="stat-card-icon group-hover:shadow-glow transition-shadow">
                            <Zap className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-textSecondary border-t border-border pt-4">
                        <span className="flex items-center gap-1.5 text-accent">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {stats?.runs_this_week || 0} this week
                        </span>
                        <div className="flex-1 h-1.5 bg-surfaceHover rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent/60 rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(((stats?.total_runs || 0) / (stats?.quota_runs || 1)) * 100, 100)}%` }}
                            />
                        </div>
                        <span className="text-xs text-textTertiary font-mono">{stats?.quota_runs || 0}/mo</span>
                    </div>
                </div>

                <div className="stat-card group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="stat-card-label">Success Rate</div>
                        <div className="stat-card-icon group-hover:shadow-glow transition-shadow">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="stat-card-value">{successRate}%</div>
                    <p className="text-sm text-textSecondary mt-1">
                        {stats?.successful_runs || 0} of {stats?.total_runs || 0} runs
                    </p>
                </div>

                <div className="stat-card group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="stat-card-label">Knowledge Bases</div>
                        <div className="stat-card-icon group-hover:shadow-glow transition-shadow">
                            <Database className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="stat-card-value">
                        {stats?.total_kbs || 0}
                        <span className="text-lg text-textTertiary font-normal ml-1">/ {stats?.quota_kbs || 0}</span>
                    </div>
                    <p className="text-sm text-textSecondary mt-1">Active bases</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card !p-0 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                    <Link href="/writer/new" className="p-5 flex items-center justify-between group hover:bg-surfaceHover transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="stat-card-icon">
                                <Plus className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-textPrimary text-sm group-hover:text-accent transition-colors">New Campaign</h4>
                                <p className="text-xs text-textSecondary">Generate emails</p>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-textTertiary group-hover:text-accent group-hover:translate-x-1 transition-all" />
                    </Link>
                    <Link href="/kb-manager" className="p-5 flex items-center justify-between group hover:bg-surfaceHover transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="stat-card-icon">
                                <Database className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-textPrimary text-sm group-hover:text-accent transition-colors">Knowledge</h4>
                                <p className="text-xs text-textSecondary">Manage KBs</p>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-textTertiary group-hover:text-accent group-hover:translate-x-1 transition-all" />
                    </Link>
                    <Link href="/brain-chat" className="p-5 flex items-center justify-between group hover:bg-surfaceHover transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="stat-card-icon">
                                <Brain className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-textPrimary text-sm group-hover:text-accent transition-colors">Brain Chat</h4>
                                <p className="text-xs text-textSecondary">Talk to your Brain</p>
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-textTertiary group-hover:text-accent group-hover:translate-x-1 transition-all" />
                    </Link>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Recent Activity */}
                <div className="card lg:col-span-3">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-textPrimary">Recent Activity</h2>
                        <Link href="/writer" className="btn btn-ghost btn-sm text-xs">View All</Link>
                    </div>
                    {recentRuns.length > 0 ? (
                        <div className="space-y-1">
                            {recentRuns.map((run, i) => (
                                <div key={run.id}
                                    className="group flex items-center justify-between p-3 rounded-[var(--radius-md)] hover:bg-surfaceHover transition-all"
                                    style={{ animationDelay: `${i * 50}ms` }}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                            ${run.status === 'completed' ? 'bg-surfaceElevated text-success' :
                                              run.status === 'failed' ? 'bg-surfaceElevated text-error' :
                                              run.status === 'running' ? 'bg-surfaceElevated text-warning' :
                                              'bg-surfaceHover text-textTertiary'}`}>
                                            {run.status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
                                             run.status === 'failed' ? <X className="w-4 h-4" /> :
                                             run.status === 'running' ? <RefreshCw className="w-4 h-4 animate-spin" /> :
                                             <Clock className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-textPrimary">{run.kb_name || 'Content Generation'}</p>
                                            <p className="text-xs text-textTertiary">
                                                {new Date(run.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`badge text-xs ${run.status === 'completed' ? 'badge-success' : run.status === 'failed' ? 'badge-error' : run.status === 'running' ? 'badge-warning' : ''}`}>
                                        {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-14 h-14 rounded-full bg-surfaceHover flex items-center justify-center mb-3">
                                <FileText className="w-7 h-7 text-textTertiary" />
                            </div>
                            <h3 className="font-medium text-textPrimary mb-1">No runs yet</h3>
                            <p className="text-sm text-textSecondary mb-4 max-w-xs">Generate content using your knowledge bases and Brain.</p>
                            <Link href="/writer/new" className="btn btn-primary btn-sm"><Plus className="w-4 h-4" /> Create First Run</Link>
                        </div>
                    )}
                </div>

                {/* Failed Runs */}
                <div className="stat-card flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-surfaceElevated flex items-center justify-center text-error">
                                <Activity className="w-4 h-4" />
                            </div>
                            <div className="stat-card-label">Failed Runs</div>
                        </div>
                        <div className="stat-card-value">{stats?.failed_runs || 0}</div>
                        <p className="text-sm text-textSecondary mt-1">
                            {stats?.failed_runs ? 'Needs attention' : 'All clear'}
                        </p>
                    </div>
                    {stats?.failed_runs ? (
                        <Link href="/writer?status=failed" className="btn btn-ghost btn-sm w-full mt-4 border border-border text-textSecondary hover:text-error hover:border-border transition-colors">
                            Review Errors
                        </Link>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
