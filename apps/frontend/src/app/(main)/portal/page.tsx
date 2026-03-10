'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart3, TrendingUp, Mail, Users, Target, Zap,
    MessageSquare, Brain, BookOpen, FileText, Loader2,
    Lock, ArrowUpRight, Calendar, DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PortalConfig {
    tier: string;
    features: Record<string, any>;
    partner_id: string;
}

interface DashboardData {
    headline: {
        total_sends: number; reply_rate: number; booked_calls: number;
        show_rate: number; revenue: number; revenue_per_1k_sends: number;
    };
    satellites: { total: number; active: number; avg_reputation: number };
    beliefs: { active: number; by_status: Record<string, number> };
    daily_trend: any[];
}

export default function MemberPortalPage() {
    const [config, setConfig] = useState<PortalConfig | null>(null);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const [cfgRes, dashRes] = await Promise.all([
                fetch('/api/portal/config'),
                fetch('/api/dashboard/partner?days=30'),
            ]);
            const cfgData = await cfgRes.json();
            const dashData = await dashRes.json();
            setConfig(cfgData);
            setDashboard(dashData);
        } catch { toast.error('Failed to load portal data'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

    const features = config?.features ?? {};
    const tier = config?.tier ?? 'basic';
    const h = dashboard?.headline;

    const TIER_BADGES: Record<string, { bg: string; text: string }> = {
        basic: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
        medium: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
        enterprise: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    };
    const badge = TIER_BADGES[tier] ?? TIER_BADGES.basic;

    return (
        <div className="space-y-lg max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">Dashboard</h1>
                    <p className="text-textSecondary">Your campaign performance at a glance</p>
                </div>
                <span className={`px-md py-xs rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
                    {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
                </span>
            </div>

            {/* Headline Metrics */}
            {features.can_view_metrics && h && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-sm">
                    <MetricCard icon={Mail} label="Total Sends" value={h.total_sends.toLocaleString()} color="text-blue-400" />
                    <MetricCard icon={MessageSquare} label="Reply Rate" value={`${(h.reply_rate * 100).toFixed(1)}%`} color="text-green-400" />
                    <MetricCard icon={Calendar} label="Booked Calls" value={h.booked_calls.toString()} color="text-purple-400" />
                    <MetricCard icon={Users} label="Show Rate" value={`${(h.show_rate * 100).toFixed(1)}%`} color="text-cyan-400" />
                    <MetricCard icon={DollarSign} label="Revenue" value={`$${h.revenue.toLocaleString()}`} color="text-yellow-400" />
                    <MetricCard icon={TrendingUp} label="Rev / 1K Sends" value={`$${h.revenue_per_1k_sends.toFixed(2)}`} color="text-orange-400" />
                </div>
            )}

            {/* Infrastructure */}
            {features.can_view_metrics && dashboard && (
                <div className="grid grid-cols-3 gap-sm">
                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md">
                        <div className="flex items-center gap-sm mb-sm">
                            <Zap className="w-5 h-5 text-orange-400" />
                            <span className="font-semibold text-textPrimary">Satellites</span>
                        </div>
                        <div className="text-2xl font-bold text-textPrimary">{dashboard.satellites.active} <span className="text-sm text-textSecondary font-normal">/ {dashboard.satellites.total}</span></div>
                        <div className="text-xs text-textSecondary mt-xs">Avg Reputation: {dashboard.satellites.avg_reputation}</div>
                    </div>
                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md">
                        <div className="flex items-center gap-sm mb-sm">
                            <Target className="w-5 h-5 text-purple-400" />
                            <span className="font-semibold text-textPrimary">Active Beliefs</span>
                        </div>
                        <div className="text-2xl font-bold text-textPrimary">{dashboard.beliefs.active}</div>
                        <div className="flex gap-xs mt-xs flex-wrap">
                            {Object.entries(dashboard.beliefs.by_status).map(([s, c]) => (
                                <span key={s} className="text-xs bg-background px-xs rounded">{s}: {c}</span>
                            ))}
                        </div>
                    </div>
                    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md">
                        <div className="flex items-center gap-sm mb-sm">
                            <BarChart3 className="w-5 h-5 text-cyan-400" />
                            <span className="font-semibold text-textPrimary">Trend</span>
                        </div>
                        <div className="text-2xl font-bold text-textPrimary">{dashboard.daily_trend.length}</div>
                        <div className="text-xs text-textSecondary">Days of data</div>
                    </div>
                </div>
            )}

            {/* Feature Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-sm">
                <FeatureTile icon={Brain} label="Chat with Brain" enabled={features.can_chat_brain} href="/brain-chat" />
                <FeatureTile icon={BookOpen} label="Train Brain" enabled={features.can_train_brain} href="/brain-training" />
                <FeatureTile icon={FileText} label="Write Emails" enabled={features.can_write_emails} href="/email-writer" />
                <FeatureTile icon={Brain} label="Feed Brain" enabled={features.can_feed_brain} href="/brain-feed" />
                <FeatureTile icon={Target} label="Flow Builder" enabled={features.can_access_flow_builder} href="/flow-builder" />
                <FeatureTile icon={BookOpen} label="Knowledge Base" enabled={features.can_view_kb} href="/knowledge" />
            </div>

            {!features.can_view_metrics && (
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-xl text-center">
                    <Lock className="w-12 h-12 text-textSecondary mx-auto mb-md opacity-50" />
                    <p className="text-textPrimary font-medium">Metrics not available on your current plan</p>
                    <p className="text-textSecondary text-sm mt-xs">Contact your account manager to upgrade</p>
                </div>
            )}
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
    return (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md">
            <div className="flex items-center gap-xs mb-sm">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-textSecondary">{label}</span>
            </div>
            <div className="text-xl font-bold text-textPrimary">{value}</div>
        </div>
    );
}

function FeatureTile({ icon: Icon, label, enabled, href }: { icon: any; label: string; enabled: boolean; href: string }) {
    if (!enabled) {
        return (
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-md opacity-50 cursor-not-allowed">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-sm">
                        <Icon className="w-5 h-5 text-textSecondary" />
                        <span className="font-medium text-textSecondary">{label}</span>
                    </div>
                    <Lock className="w-4 h-4 text-textSecondary" />
                </div>
            </div>
        );
    }
    return (
        <a href={href} className="bg-surface border border-border rounded-[var(--radius-lg)] p-md hover:bg-background/50 transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-sm">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="font-medium text-textPrimary">{label}</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-textSecondary group-hover:text-primary transition-all" />
            </div>
        </a>
    );
}
