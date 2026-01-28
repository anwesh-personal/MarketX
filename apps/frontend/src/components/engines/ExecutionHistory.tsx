import React, { useState, useEffect } from 'react';
import {
    Clock, CheckCircle, XCircle, Loader2, Maximize2, Terminal,
    AlertCircle, DollarSign, Hash, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';

interface RunLog {
    id: string;
    engine_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    input: any;
    output: any;
    error: string | null;
    started_at: string;
    completed_at: string | null;
    duration_ms: number;
    tokens_used: number;
    cost_usd: number;
    created_at: string;
    count?: number; // Supabase result
}

interface ExecutionHistoryProps {
    engineId: string;
}

export function ExecutionHistory({ engineId }: ExecutionHistoryProps) {
    const { admin } = useSuperadminAuth();
    const token = admin?.token;
    const [runs, setRuns] = useState<RunLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRun, setSelectedRun] = useState<RunLog | null>(null);

    const fetchRuns = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/engines/${engineId}/runs?limit=50`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setRuns(data.runs || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (engineId && token) fetchRuns();
    }, [engineId, token]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4 text-success" />;
            case 'failed': return <XCircle className="w-4 h-4 text-error" />;
            case 'running': return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
            default: return <Clock className="w-4 h-4 text-textTertiary" />;
        }
    };

    if (loading) return <div className="p-xl text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>;
    if (runs.length === 0) return <div className="p-xl text-center text-textSecondary border border-dashed border-border rounded-[var(--radius-lg)]">No execution history found</div>;

    return (
        <div className="space-y-md">
            <div className="overflow-hidden border border-border rounded-[var(--radius-lg)]">
                <table className="w-full text-left text-sm">
                    <thead className="bg-surfaceHover border-b border-border text-textTertiary font-medium">
                        <tr>
                            <th className="py-sm px-md">Status</th>
                            <th className="py-sm px-md">Date</th>
                            <th className="py-sm px-md">Duration</th>
                            <th className="py-sm px-md">Tokens</th>
                            <th className="py-sm px-md">Cost</th>
                            <th className="py-sm px-md text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-background">
                        {runs.map((run) => (
                            <tr key={run.id} className="hover:bg-surfaceHover transition-colors">
                                <td className="py-sm px-md flex items-center gap-xs">
                                    {getStatusIcon(run.status)}
                                    <span className="capitalize">{run.status}</span>
                                </td>
                                <td className="py-sm px-md text-textSecondary">
                                    {format(new Date(run.created_at), 'MMM d, HH:mm:ss')}
                                </td>
                                <td className="py-sm px-md font-mono text-xs">
                                    {run.duration_ms ? `${run.duration_ms}ms` : '-'}
                                </td>
                                <td className="py-sm px-md font-mono text-xs">
                                    {run.tokens_used || 0}
                                </td>
                                <td className="py-sm px-md font-mono text-xs">
                                    ${run.cost_usd?.toFixed(6) || '0.000'}
                                </td>
                                <td className="py-sm px-md text-right">
                                    <button
                                        onClick={() => setSelectedRun(run)}
                                        className="p-xs hover:bg-surface rounded text-primary"
                                        title="View Details"
                                    >
                                        <Maximize2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Run Details Modal */}
            {selectedRun && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-md bg-overlay backdrop-blur-sm"
                    onClick={() => setSelectedRun(null)}
                >
                    <div
                        className="bg-background border border-border rounded-[var(--radius-xl)] shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-md border-b border-border bg-surface">
                            <div className="flex items-center gap-sm">
                                <Terminal className="w-5 h-5 text-primary" />
                                <h3 className="font-bold text-textPrimary">Execution Details</h3>
                                <span className="text-xs font-mono text-textTertiary">{selectedRun.id}</span>
                            </div>
                            <button onClick={() => setSelectedRun(null)} className="p-xs hover:bg-surfaceHover rounded">
                                <Maximize2 className="w-4 h-4 rotate-45" /> {/* Close icon workaround */}
                            </button>
                        </div>

                        <div className="p-md space-y-md overflow-y-auto flex-1">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-4 gap-sm">
                                <div className="p-sm bg-surfaceHover rounded border border-border">
                                    <div className="flex items-center gap-xs text-xs text-textTertiary mb-0.5">
                                        <Clock className="w-3 h-3" /> Duration
                                    </div>
                                    <div className="font-mono font-medium">{selectedRun.duration_ms}ms</div>
                                </div>
                                <div className="p-sm bg-surfaceHover rounded border border-border">
                                    <div className="flex items-center gap-xs text-xs text-textTertiary mb-0.5">
                                        <Hash className="w-3 h-3" /> Tokens
                                    </div>
                                    <div className="font-mono font-medium">{selectedRun.tokens_used}</div>
                                </div>
                                <div className="p-sm bg-surfaceHover rounded border border-border">
                                    <div className="flex items-center gap-xs text-xs text-textTertiary mb-0.5">
                                        <DollarSign className="w-3 h-3" /> Cost
                                    </div>
                                    <div className="font-mono font-medium">${selectedRun.cost_usd?.toFixed(6)}</div>
                                </div>
                                <div className="p-sm bg-surfaceHover rounded border border-border">
                                    <div className="flex items-center gap-xs text-xs text-textTertiary mb-0.5">
                                        <Calendar className="w-3 h-3" /> Started
                                    </div>
                                    <div className="font-mono text-xs">{format(new Date(selectedRun.started_at), 'HH:mm:ss')}</div>
                                </div>
                            </div>

                            {/* Error */}
                            {selectedRun.error && (
                                <div className="p-md bg-error/10 border border-error/30 rounded text-error flex items-start gap-sm">
                                    <AlertCircle className="w-5 h-5 mt-0.5" />
                                    <pre className="whitespace-pre-wrap font-mono text-xs">{selectedRun.error}</pre>
                                </div>
                            )}

                            {/* Input/Output */}
                            <div className="grid grid-cols-2 gap-md h-full min-h-[300px]">
                                <div className="flex flex-col gap-xs">
                                    <label className="text-xs font-bold text-textSecondary">Input</label>
                                    <div className="flex-1 bg-surface border border-border rounded p-sm font-mono text-xs overflow-auto">
                                        <pre>{JSON.stringify(selectedRun.input, null, 2)}</pre>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-xs">
                                    <label className="text-xs font-bold text-textSecondary">Output</label>
                                    <div className="flex-1 bg-surface border border-border rounded p-sm font-mono text-xs overflow-auto">
                                        <pre>{JSON.stringify(selectedRun.output, null, 2)}</pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
