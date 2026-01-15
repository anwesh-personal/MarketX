'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Zap,
    Search,
    Filter,
    Eye,
    Download,
    Trash2,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    Plus,
    FileText,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Run {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    created_at: string;
    completed_at: string | null;
    kb_name: string | null;
    output_preview: string | null;
}

export default function WriterPage() {
    const router = useRouter();
    const supabase = createClient();
    const [runs, setRuns] = useState<Run[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        await loadRuns(user.id);
    };

    const loadRuns = async (userId: string) => {
        try {
            setIsLoading(true);

            const { data: runsData } = await supabase
                .from('runs')
                .select(`
                    id,
                    status,
                    created_at,
                    completed_at,
                    kb_id,
                    knowledge_base:knowledge_bases(name)
                `)
                .eq('triggered_by', userId)
                .order('created_at', { ascending: false });

            setRuns(runsData?.map(r => ({
                id: r.id,
                status: r.status,
                created_at: r.created_at,
                completed_at: r.completed_at,
                kb_name: (r.knowledge_base as any)?.name || null,
                output_preview: null, // TODO: Add output preview
            })) || []);

        } catch (error) {
            console.error('Failed to load runs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredRuns = runs.filter(run => {
        const matchesSearch = run.kb_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || run.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                        Runs
                    </h1>
                    <p className="text-textSecondary">
                        View and manage your content generation runs
                    </p>
                </div>

                <Link
                    href="/writer/new"
                    className="
                        flex items-center gap-xs
                        bg-primary text-white font-semibold
                        px-md py-sm
                        rounded-[var(--radius-md)]
                        hover:opacity-90
                        active:scale-[0.98]
                        transition-all
                    "
                >
                    <Plus className="w-5 h-5" />
                    <span>New Run</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-md">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-md top-1/2 -translate-y-1/2 w-5 h-5 text-textTertiary" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search runs..."
                        className="
                            w-full pl-xl pr-md py-sm
                            bg-background text-textPrimary
                            border border-border rounded-[var(--radius-md)]
                            focus:outline-none focus:ring-2 focus:ring-borderFocus
                            transition-all
                        "
                    />
                </div>

                {/* Status Filter */}
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="
                        px-md py-sm
                        bg-background text-textPrimary
                        border border-border rounded-[var(--radius-md)]
                        focus:outline-none focus:ring-2 focus:ring-borderFocus
                        transition-all
                    "
                >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                </select>
            </div>

            {/* Runs List */}
            {filteredRuns.length > 0 ? (
                <div className="space-y-md">
                    {filteredRuns.map((run) => (
                        <div
                            key={run.id}
                            className="card hover:shadow-md transition-all"
                        >
                            <div className="flex items-start justify-between gap-md">
                                <div className="flex-1">
                                    <div className="flex items-center gap-sm mb-sm">
                                        {run.status === 'completed' && (
                                            <CheckCircle className="w-5 h-5 text-success" />
                                        )}
                                        {run.status === 'failed' && (
                                            <XCircle className="w-5 h-5 text-error" />
                                        )}
                                        {run.status === 'running' && (
                                            <Loader2 className="w-5 h-5 text-warning animate-spin" />
                                        )}
                                        {run.status === 'pending' && (
                                            <Clock className="w-5 h-5 text-textTertiary" />
                                        )}
                                        <h3 className="text-lg font-bold text-textPrimary">
                                            {run.kb_name || 'Untitled Run'}
                                        </h3>
                                    </div>

                                    <div className="flex items-center gap-md text-sm text-textSecondary mb-sm">
                                        <div className="flex items-center gap-xs">
                                            <Clock className="w-4 h-4" />
                                            <span>Started: {new Date(run.created_at).toLocaleString()}</span>
                                        </div>
                                        {run.completed_at && (
                                            <div className="flex items-center gap-xs">
                                                <CheckCircle className="w-4 h-4" />
                                                <span>Completed: {new Date(run.completed_at).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    <span className={`
                                        inline-block text-xs font-medium px-sm py-xs rounded-full
                                        ${run.status === 'completed' ? 'bg-success/10 text-success' :
                                            run.status === 'failed' ? 'bg-error/10 text-error' :
                                                run.status === 'running' ? 'bg-warning/10 text-warning' :
                                                    'bg-textTertiary/10 text-textTertiary'}
                                    `}>
                                        {run.status.toUpperCase()}
                                    </span>
                                </div>

                                <div className="flex items-center gap-xs">
                                    <button
                                        className="
                                            p-sm
                                            text-textSecondary
                                            hover:text-textPrimary hover:bg-surfaceHover
                                            rounded-[var(--radius-sm)]
                                            transition-all
                                        "
                                        title="View output"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>

                                    {run.status === 'completed' && (
                                        <button
                                            className="
                                                p-sm
                                                text-textSecondary
                                                hover:text-textPrimary hover:bg-surfaceHover
                                                rounded-[var(--radius-sm)]
                                                transition-all
                                            "
                                            title="Download output"
                                        >
                                            <Download className="w-5 h-5" />
                                        </button>
                                    )}

                                    <button
                                        className="
                                            p-sm
                                            text-error
                                            hover:bg-error/10
                                            rounded-[var(--radius-sm)]
                                            transition-all
                                        "
                                        title="Delete run"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card text-center py-xl">
                    <Zap className="w-16 h-16 text-textTertiary mx-auto mb-md opacity-20" />
                    <h3 className="text-lg font-bold text-textPrimary mb-xs">
                        {searchQuery || filterStatus !== 'all' ? 'No runs found' : 'No runs yet'}
                    </h3>
                    <p className="text-sm text-textSecondary mb-md">
                        {searchQuery || filterStatus !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Create your first run to generate content'}
                    </p>
                    {!searchQuery && filterStatus === 'all' && (
                        <Link
                            href="/writer/new"
                            className="
                                inline-flex items-center gap-xs
                                bg-primary text-white font-semibold
                                px-md py-sm
                                rounded-[var(--radius-md)]
                                hover:opacity-90
                                transition-all
                            "
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Run</span>
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
