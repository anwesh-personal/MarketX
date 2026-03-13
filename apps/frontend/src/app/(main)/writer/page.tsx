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
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-display font-bold text-textPrimary tracking-tight mb-1">
                        Writer Studio
                    </h1>
                    <p className="text-textSecondary text-lg">
                        View and manage your content generation runs
                    </p>
                </div>

                <Link
                    href="/writer/new"
                    className="btn btn-primary shadow-md hover:shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    <span>New Run</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="premium-card !p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-textTertiary" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search runs..."
                        className="input pl-12 bg-transparent border-none shadow-none focus:ring-0"
                    />
                </div>
                
                <div className="w-px h-8 bg-border hidden sm:block"></div>

                {/* Status Filter */}
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="input sm:w-48 bg-transparent border-none shadow-none focus:ring-0 cursor-pointer"
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
                <div className="space-y-4">
                    {filteredRuns.map((run, i) => (
                        <div
                            key={run.id}
                            className="premium-card !p-6 group hover:border-accent transition-colors"
                            style={{ animationDelay: `${i * 50}ms` }}
                        >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className={`
                                        w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0
                                        ${run.status === 'completed' ? 'bg-success-muted text-success' :
                                            run.status === 'failed' ? 'bg-error-muted text-error' :
                                                run.status === 'running' ? 'bg-warning-muted text-warning' :
                                                    'bg-surfaceHover text-textTertiary'}
                                    `}>
                                        {run.status === 'completed' && <CheckCircle className="w-6 h-6" />}
                                        {run.status === 'failed' && <XCircle className="w-6 h-6" />}
                                        {run.status === 'running' && <Loader2 className="w-6 h-6 animate-spin" />}
                                        {run.status === 'pending' && <Clock className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-textPrimary mb-1 group-hover:text-accent transition-colors">
                                            {run.kb_name || 'Untitled Run'}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-textSecondary">
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" />
                                                {new Date(run.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {run.completed_at && (
                                                <span className="flex items-center gap-1.5">
                                                    <CheckCircle className="w-4 h-4" />
                                                    {Math.round((new Date(run.completed_at).getTime() - new Date(run.created_at).getTime()) / 1000)}s
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                    <span className={`badge ${
                                        run.status === 'completed' ? 'badge-success' :
                                        run.status === 'failed' ? 'badge-error' :
                                        run.status === 'running' ? 'badge-warning' : ''
                                    }`}>
                                        {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                                    </span>
                                    
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="btn btn-ghost btn-icon" title="View output">
                                            <Eye className="w-5 h-5" />
                                        </button>
                                        {run.status === 'completed' && (
                                            <button className="btn btn-ghost btn-icon" title="Download output">
                                                <Download className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button className="btn btn-ghost btn-icon text-error hover:bg-error-muted" title="Delete run">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="premium-card flex flex-col items-center justify-center py-24 text-center border-dashed">
                    <div className="w-20 h-20 rounded-full bg-surfaceHover flex items-center justify-center mb-6">
                        <Zap className="w-10 h-10 text-textTertiary" />
                    </div>
                    <h3 className="text-2xl font-bold font-display text-textPrimary mb-2">
                        {searchQuery || filterStatus !== 'all' ? 'No runs found' : 'No runs yet'}
                    </h3>
                    <p className="text-textSecondary mb-8 max-w-md">
                        {searchQuery || filterStatus !== 'all'
                            ? 'Try adjusting your filters to find what you are looking for.'
                            : 'Create your first run to generate high-converting content using your knowledge base.'}
                    </p>
                    {!searchQuery && filterStatus === 'all' && (
                        <Link href="/writer/new" className="btn btn-primary shadow-md">
                            <Plus className="w-5 h-5" />
                            <span>Create First Run</span>
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
