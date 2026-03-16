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
                            className="btn btn-sm px-4 py-1.5 bg-accent text-white rounded-lg text-xs font-semibold hover:bg-accent/90 transition-colors flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" /> Continue Setup
                        </button>
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

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                
                {/* Main Stat: Total Runs (Spans 2 columns) */}
                <div className="premium-card md:col-span-2 bg-gradient-to-br from-accent to-accent-secondary text-onAccent border-none group">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity duration-500">
                        <Zap className="w-32 h-32 transform rotate-12" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between mb-8">
                            <div>
                                <p className="text-onAccent/80 font-medium mb-1">Total Runs</p>
                                <h2 className="text-6xl font-display font-bold tracking-tight">
                                    {stats?.total_runs || 0}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-medium">
                                <TrendingUp className="w-4 h-4" />
                                <span>{stats?.runs_this_week || 0} this week</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-onAccent/70 border-t border-white/20 pt-4">
                            <span>{stats?.quota_runs || 0} runs per month limit</span>
                            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-white rounded-full" 
                                    style={{ width: `${Math.min(((stats?.total_runs || 0) / (stats?.quota_runs || 1)) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Success Rate */}
                <div className="premium-card flex flex-col justify-between group">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-textSecondary font-medium">Success Rate</p>
                        <div className="w-10 h-10 rounded-full bg-success-muted flex items-center justify-center text-success group-hover:scale-110 transition-transform">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-4xl font-display font-bold text-textPrimary mb-1">
                            {successRate}%
                        </h3>
                        <p className="text-sm text-success flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {stats?.successful_runs || 0} successful runs
                        </p>
                    </div>
                </div>

                {/* Knowledge Bases */}
                <div className="premium-card flex flex-col justify-between group">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-textSecondary font-medium">Knowledge Bases</p>
                        <div className="w-10 h-10 rounded-full bg-info-muted flex items-center justify-center text-info group-hover:scale-110 transition-transform">
                            <Database className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-4xl font-display font-bold text-textPrimary mb-1">
                            {stats?.total_kbs || 0}
                            <span className="text-lg text-textTertiary font-normal ml-1">/ {stats?.quota_kbs || 0}</span>
                        </h3>
                        <p className="text-sm text-textSecondary">
                            Active bases
                        </p>
                    </div>
                </div>

                {/* Quick Actions (Spans full width) */}
                <div className="premium-card md:col-span-3 lg:col-span-4 !p-0 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                        <Link href="/writer/new" className="p-6 flex items-center justify-between group hover:bg-surfaceHover transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-onAccent transition-colors">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-textPrimary group-hover:text-accent transition-colors">New Run</h4>
                                    <p className="text-sm text-textSecondary">Generate new content</p>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-textTertiary group-hover:text-accent group-hover:translate-x-1 transition-all" />
                        </Link>

                        <Link href="/kb-manager" className="p-6 flex items-center justify-between group hover:bg-surfaceHover transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center text-info group-hover:bg-info group-hover:text-white transition-colors">
                                    <Database className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-textPrimary group-hover:text-info transition-colors">Manage KBs</h4>
                                    <p className="text-sm text-textSecondary">Update knowledge</p>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-textTertiary group-hover:text-info group-hover:translate-x-1 transition-all" />
                        </Link>

                        <Link href="/analytics" className="p-6 flex items-center justify-between group hover:bg-surfaceHover transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-textPrimary group-hover:text-primary transition-colors">Analytics</h4>
                                    <p className="text-sm text-textSecondary">View performance</p>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-textTertiary group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </Link>
                    </div>
                </div>

                {/* Recent Runs (Spans 2 columns) */}
                <div className="premium-card md:col-span-2 lg:col-span-3 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-textPrimary">Recent Activity</h2>
                        <Link href="/writer" className="btn btn-ghost btn-sm">
                            View All
                        </Link>
                    </div>

                    <div className="flex-1">
                        {recentRuns.length > 0 ? (
                            <div className="space-y-2">
                                {recentRuns.map((run, i) => (
                                    <div
                                        key={run.id}
                                        className="group flex items-center justify-between p-4 rounded-xl hover:bg-surfaceHover border border-transparent hover:border-border transition-all animate-fade-in-up"
                                        style={{ animationDelay: `${i * 50}ms` }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`
                                                w-10 h-10 rounded-full flex items-center justify-center
                                                ${run.status === 'completed' ? 'bg-success-muted text-success' :
                                                    run.status === 'failed' ? 'bg-error-muted text-error' :
                                                        run.status === 'running' ? 'bg-warning-muted text-warning' :
                                                            'bg-surface text-textTertiary border border-border'}
                                            `}>
                                                {run.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                                                 run.status === 'failed' ? <X className="w-5 h-5" /> :
                                                 run.status === 'running' ? <RefreshCw className="w-5 h-5 animate-spin" /> :
                                                 <Clock className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-textPrimary group-hover:text-accent transition-colors">
                                                    {run.kb_name || 'Content Generation Run'}
                                                </p>
                                                <p className="text-xs text-textTertiary mt-0.5">
                                                    {new Date(run.created_at).toLocaleString(undefined, { 
                                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`
                                                badge
                                                ${run.status === 'completed' ? 'badge-success' :
                                                    run.status === 'failed' ? 'badge-error' :
                                                        run.status === 'running' ? 'badge-warning' : ''}
                                            `}>
                                                {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-textTertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-surfaceHover flex items-center justify-center mb-4">
                                    <FileText className="w-8 h-8 text-textTertiary" />
                                </div>
                                <h3 className="text-lg font-medium text-textPrimary mb-1">No runs yet</h3>
                                <p className="text-sm text-textSecondary mb-6 max-w-sm">
                                    Start generating content using your knowledge bases and AI brains.
                                </p>
                                <Link href="/writer/new" className="btn btn-primary">
                                    <Plus className="w-4 h-4" />
                                    Create First Run
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Failed Runs / Alert (Spans 1 column) */}
                <div className="premium-card bg-gradient-to-b from-surface to-error-muted/30 border-error/20 flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-error-muted flex items-center justify-center text-error">
                            <Activity className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-textPrimary">Failed Runs</h3>
                    </div>
                    
                    <div>
                        <h2 className="text-5xl font-display font-bold text-error mb-2">
                            {stats?.failed_runs || 0}
                        </h2>
                        <p className="text-sm text-textSecondary">
                            Requires attention
                        </p>
                    </div>
                    
                    {stats?.failed_runs ? (
                        <button className="btn btn-ghost w-full mt-6 border border-error/20 text-error hover:bg-error hover:text-white">
                            Review Errors
                        </button>
                    ) : null}
                </div>

            </div>
        </div>
    );
}
