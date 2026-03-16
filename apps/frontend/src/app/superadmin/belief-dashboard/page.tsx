'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp, ArrowUp, ArrowDown, Pause, Play, Shield,
    ChevronDown, ChevronUp, Loader2, RefreshCw, Filter,
    BarChart3, Zap, Target, Clock, AlertTriangle, CheckCircle, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';

const LADDER = ['HYP', 'TEST', 'SW', 'IW', 'RW', 'GW'] as const;
const LADDER_LABELS: Record<string, string> = {
    HYP: 'Hypothesis', TEST: 'Testing', SW: 'Small Win',
    IW: 'Intermediate Win', RW: 'Repeatable Win', GW: 'Golden Win', PAUSED: 'Paused',
};
const LADDER_COLORS: Record<string, string> = {
    HYP: 'bg-gray-500/20 text-gray-400', TEST: 'bg-blue-500/20 text-blue-400',
    SW: 'bg-cyan-500/20 text-cyan-400', IW: 'bg-green-500/20 text-green-400',
    RW: 'bg-purple-500/20 text-purple-400', GW: 'bg-yellow-500/20 text-yellow-300',
    PAUSED: 'bg-orange-500/20 text-orange-400',
};

interface Belief {
    id: string; partner_id: string; brief_id: string;
    angle: string; statement: string; lane: string; status: string;
    confidence_score: number; allocation_weight: number;
    created_at: string; updated_at: string;
}

interface BeliefDetail {
    belief: Belief;
    promotion_history: any[];
    gate_snapshots: any[];
    competition: any;
    flows: any[];
    signal_counts: Record<string, number>;
}

export default function BeliefDashboardPage() {
    const { fetchWithAuth } = useSuperadminAuth();
    const [beliefs, setBeliefs] = useState<Belief[]>([]);
    const [statusDist, setStatusDist] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterOrg, setFilterOrg] = useState('');
    const [selectedBelief, setSelectedBelief] = useState<BeliefDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [promoting, setPromoting] = useState(false);

    const load = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filterStatus !== 'all') params.set('status', filterStatus);
            if (filterOrg) params.set('org_id', filterOrg);
            const res = await fetchWithAuth(`/api/superadmin/beliefs?${params}`);
            const data = await res.json();
            setBeliefs(data.beliefs ?? []);
            setStatusDist(data.status_distribution ?? {});
        } catch { toast.error('Failed to load beliefs'); }
        finally { setLoading(false); }
    }, [filterStatus, filterOrg]);

    useEffect(() => { load(); }, [load]);

    const loadDetail = async (id: string) => {
        setDetailLoading(true);
        try {
            const res = await fetchWithAuth(`/api/superadmin/beliefs?belief_id=${id}`);
            const data = await res.json();
            setSelectedBelief(data);
        } catch { toast.error('Failed to load belief detail'); }
        finally { setDetailLoading(false); }
    };

    const handlePromote = async (beliefId: string, target?: string, force?: boolean) => {
        setPromoting(true);
        try {
            const res = await fetchWithAuth('/api/beliefs/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ belief_id: beliefId, target_status: target, force }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`${data.from_status} → ${data.to_status}`);
                loadDetail(beliefId);
                load();
            } else {
                toast.error(data.message || data.error || 'Promotion blocked');
            }
        } catch { toast.error('Promotion request failed'); }
        finally { setPromoting(false); }
    };

    const handleBatchPromotion = async () => {
        try {
            const res = await fetchWithAuth('/api/beliefs/promote/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ org_id: filterOrg || undefined }),
            });
            const data = await res.json();
            if (data.success) toast.success('Batch promotion job enqueued');
            else toast.error(data.error);
        } catch { toast.error('Batch promotion failed'); }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
    }

    return (
        <div className="space-y-lg">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">Belief Dashboard</h1>
                    <p className="text-textSecondary">Promotion ladder, confidence scores, allocation weights, gate snapshots</p>
                </div>
                <div className="flex items-center gap-sm">
                    <button onClick={handleBatchPromotion} className="flex items-center gap-xs bg-accent/20 text-accent px-md py-sm rounded-[var(--radius-md)] text-sm font-medium hover:bg-accent/30 transition-all">
                        <Zap className="w-4 h-4" /> Run Batch Promotion
                    </button>
                    <button onClick={load} className="flex items-center gap-xs bg-surface border border-border text-textSecondary px-md py-sm rounded-[var(--radius-md)] hover:text-textPrimary transition-all">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            {/* Ladder Overview */}
            <div className="grid grid-cols-7 gap-sm">
                {[...LADDER, 'PAUSED' as const].map(s => (
                    <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                        className={`p-md rounded-[var(--radius-md)] text-center transition-all border ${
                            filterStatus === s ? 'border-primary' : 'border-border'
                        } bg-surface hover:bg-background/50`}
                    >
                        <div className="text-2xl font-bold text-textPrimary">{statusDist[s] ?? 0}</div>
                        <div className={`text-xs font-medium mt-xs px-xs py-xxs rounded-full inline-block ${LADDER_COLORS[s]}`}>
                            {LADDER_LABELS[s]}
                        </div>
                    </button>
                ))}
            </div>

            {/* Belief List + Detail Split */}
            <div className="grid grid-cols-5 gap-md">
                {/* List */}
                <div className="col-span-2 space-y-xs max-h-[70vh] overflow-y-auto">
                    {beliefs.length === 0 ? (
                        <div className="bg-surface border border-border rounded-[var(--radius-md)] p-xl text-center text-textSecondary">
                            No beliefs found
                        </div>
                    ) : beliefs.map(b => {
                        const isSelected = selectedBelief?.belief.id === b.id;
                        return (
                            <div key={b.id} onClick={() => loadDetail(b.id)}
                                className={`bg-surface border rounded-[var(--radius-md)] p-md cursor-pointer transition-all hover:bg-background/50 ${
                                    isSelected ? 'border-primary' : 'border-border'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-xs">
                                    <span className={`text-xs font-medium px-xs py-xxs rounded-full ${LADDER_COLORS[b.status]}`}>
                                        {LADDER_LABELS[b.status] ?? b.status}
                                    </span>
                                    <span className="text-xs text-textSecondary">{b.lane}</span>
                                </div>
                                <div className="text-sm text-textPrimary font-medium line-clamp-2 mb-xs">{b.statement}</div>
                                <div className="flex items-center gap-md text-xs text-textSecondary">
                                    <span>Confidence: <strong className="text-textPrimary">{(Number(b.confidence_score) * 100).toFixed(1)}%</strong></span>
                                    <span>Alloc: <strong className="text-textPrimary">{(Number(b.allocation_weight) * 100).toFixed(1)}%</strong></span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Detail Panel */}
                <div className="col-span-3">
                    {detailLoading ? (
                        <div className="flex items-center justify-center h-96"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                    ) : !selectedBelief ? (
                        <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-xl text-center text-textSecondary">
                            <Target className="w-12 h-12 mx-auto mb-md opacity-50" />
                            Select a belief to view details
                        </div>
                    ) : (
                        <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg space-y-md max-h-[70vh] overflow-y-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-sm mb-xs">
                                        <span className={`text-sm font-medium px-sm py-xxs rounded-full ${LADDER_COLORS[selectedBelief.belief.status]}`}>
                                            {LADDER_LABELS[selectedBelief.belief.status]}
                                        </span>
                                        <span className="text-xs text-textSecondary">{selectedBelief.belief.lane} | {selectedBelief.belief.angle}</span>
                                    </div>
                                    <p className="text-textPrimary font-medium">{selectedBelief.belief.statement}</p>
                                </div>
                                <button onClick={() => setSelectedBelief(null)} className="text-textSecondary hover:text-textPrimary"><X className="w-4 h-4" /></button>
                            </div>

                            {/* Scores */}
                            <div className="grid grid-cols-3 gap-sm">
                                <div className="bg-background rounded-[var(--radius-md)] p-sm text-center">
                                    <div className="text-xs text-textSecondary">Confidence</div>
                                    <div className="text-xl font-bold text-textPrimary">{(Number(selectedBelief.belief.confidence_score) * 100).toFixed(1)}%</div>
                                </div>
                                <div className="bg-background rounded-[var(--radius-md)] p-sm text-center">
                                    <div className="text-xs text-textSecondary">Allocation</div>
                                    <div className="text-xl font-bold text-textPrimary">{(Number(selectedBelief.belief.allocation_weight) * 100).toFixed(1)}%</div>
                                </div>
                                <div className="bg-background rounded-[var(--radius-md)] p-sm text-center">
                                    <div className="text-xs text-textSecondary">Flows</div>
                                    <div className="text-xl font-bold text-textPrimary">{selectedBelief.flows.length}</div>
                                </div>
                            </div>

                            {/* Signal Counts */}
                            {Object.keys(selectedBelief.signal_counts).length > 0 && (
                                <div className="bg-background rounded-[var(--radius-md)] p-sm">
                                    <div className="text-xs text-textSecondary font-medium mb-xs">Signal Events</div>
                                    <div className="flex flex-wrap gap-sm">
                                        {Object.entries(selectedBelief.signal_counts).map(([type, count]) => (
                                            <span key={type} className="text-xs bg-surface border border-border rounded px-xs py-xxs">
                                                {type}: <strong>{count}</strong>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Competition */}
                            {selectedBelief.competition && (
                                <div className="bg-background rounded-[var(--radius-md)] p-sm">
                                    <div className="text-xs text-textSecondary font-medium mb-xs">Competition Pair</div>
                                    <div className="flex items-center gap-md text-sm">
                                        <span>Champion: <strong>{(Number(selectedBelief.competition.allocation_champion) * 100).toFixed(1)}%</strong></span>
                                        <span className="text-textSecondary">vs</span>
                                        <span>Challenger: <strong>{(Number(selectedBelief.competition.allocation_challenger) * 100).toFixed(1)}%</strong></span>
                                        <span className={`text-xs px-xs rounded ${selectedBelief.competition.active ? 'text-success' : 'text-gray-400'}`}>
                                            {selectedBelief.competition.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Promotion Actions */}
                            <div className="flex items-center gap-sm pt-sm border-t border-border">
                                {selectedBelief.belief.status !== 'GW' && selectedBelief.belief.status !== 'PAUSED' && (
                                    <button onClick={() => handlePromote(selectedBelief.belief.id)} disabled={promoting}
                                        className="flex items-center gap-xs bg-success/20 text-success px-md py-xs rounded-[var(--radius-md)] text-sm font-medium hover:bg-success/30 disabled:opacity-50 transition-all">
                                        {promoting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-3.5 h-3.5" />}
                                        Promote (Gated)
                                    </button>
                                )}
                                {selectedBelief.belief.status !== 'GW' && selectedBelief.belief.status !== 'PAUSED' && (
                                    <button onClick={() => handlePromote(selectedBelief.belief.id, undefined, true)} disabled={promoting}
                                        className="flex items-center gap-xs bg-warning/20 text-warning px-md py-xs rounded-[var(--radius-md)] text-sm hover:bg-warning/30 disabled:opacity-50 transition-all">
                                        <Zap className="w-3.5 h-3.5" /> Force Promote
                                    </button>
                                )}
                                {selectedBelief.belief.status !== 'PAUSED' && selectedBelief.belief.status !== 'HYP' && (
                                    <button onClick={() => handlePromote(selectedBelief.belief.id, 'PAUSED')} disabled={promoting}
                                        className="flex items-center gap-xs bg-orange-500/20 text-orange-400 px-md py-xs rounded-[var(--radius-md)] text-sm hover:bg-orange-500/30 disabled:opacity-50 transition-all">
                                        <Pause className="w-3.5 h-3.5" /> Pause
                                    </button>
                                )}
                                {selectedBelief.belief.status === 'PAUSED' && (
                                    <button onClick={() => handlePromote(selectedBelief.belief.id, 'TEST')} disabled={promoting}
                                        className="flex items-center gap-xs bg-success/20 text-success px-md py-xs rounded-[var(--radius-md)] text-sm hover:bg-success/30 disabled:opacity-50 transition-all">
                                        <Play className="w-3.5 h-3.5" /> Resume to TEST
                                    </button>
                                )}
                            </div>

                            {/* Gate Snapshots */}
                            {selectedBelief.gate_snapshots.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-textPrimary mb-sm flex items-center gap-xs">
                                        <Shield className="w-4 h-4 text-info" /> Gate Snapshots ({selectedBelief.gate_snapshots.length})
                                    </h4>
                                    <div className="space-y-xs max-h-48 overflow-y-auto">
                                        {selectedBelief.gate_snapshots.map((snap: any) => (
                                            <div key={snap.id} className={`bg-background rounded-[var(--radius-sm)] p-sm border-l-2 ${snap.passed ? 'border-l-success' : 'border-l-danger'}`}>
                                                <div className="flex items-center justify-between mb-xs">
                                                    <span className={`text-xs font-medium ${snap.passed ? 'text-success' : 'text-danger'}`}>
                                                        {snap.passed ? 'PASSED' : 'FAILED'}
                                                    </span>
                                                    <span className="text-xs text-textSecondary">{new Date(snap.created_at).toLocaleString()}</span>
                                                </div>
                                                {snap.snapshot?.checks && (
                                                    <div className="flex flex-wrap gap-xs">
                                                        {Object.entries(snap.snapshot.checks).map(([k, v]: [string, any]) => (
                                                            <span key={k} className={`text-xs px-xs py-xxs rounded ${v.passed ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                                                {k}: {typeof v.actual === 'number' ? v.actual.toFixed(3) : v.actual}/{v.threshold}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Promotion History */}
                            {selectedBelief.promotion_history.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-textPrimary mb-sm flex items-center gap-xs">
                                        <Clock className="w-4 h-4 text-purple-400" /> Promotion History ({selectedBelief.promotion_history.length})
                                    </h4>
                                    <div className="space-y-xs max-h-48 overflow-y-auto">
                                        {selectedBelief.promotion_history.map((log: any) => (
                                            <div key={log.id} className="bg-background rounded-[var(--radius-sm)] p-sm">
                                                <div className="flex items-center gap-sm mb-xxs">
                                                    <span className={`text-xs font-medium px-xs rounded ${LADDER_COLORS[log.from_status]}`}>{log.from_status}</span>
                                                    <span className="text-xs text-textSecondary">→</span>
                                                    <span className={`text-xs font-medium px-xs rounded ${LADDER_COLORS[log.to_status]}`}>{log.to_status}</span>
                                                    <span className="text-xs text-textSecondary ml-auto">{new Date(log.created_at).toLocaleString()}</span>
                                                </div>
                                                <div className="text-xs text-textSecondary">{log.reason}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
