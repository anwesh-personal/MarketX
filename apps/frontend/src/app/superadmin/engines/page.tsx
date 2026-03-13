'use client';

/**
 * ENGINE INSTANCES PAGE
 * SuperAdmin page for managing cloned workflow engine instances
 * Includes execution capability and real-time progress tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    RefreshCw,
    AlertCircle,
    Server,
    Activity,
    Loader2,
    Zap,
    X
} from 'lucide-react';
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';
import { EngineInstance, ExecutionState, WorkflowTemplate, Organization } from '@/types/engine';
import { EngineCard } from '@/components/engines/EngineCard';
import { CloneEngineModal } from '@/components/engines/CloneEngineModal';
import { ExecutionModal } from '@/components/engines/ExecutionModal';
import { SuperadminConfirmDialog } from '@/components/SuperAdmin/surfaces';

export default function EnginesPage() {
    const { admin, isLoading: authLoading, fetchWithAuth } = useSuperadminAuth();
    const token = admin?.token;
    const router = useRouter();

    // Data State
    const [engines, setEngines] = useState<EngineInstance[]>([]);
    const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [filter, setFilter] = useState<'all' | 'active' | 'standby' | 'unassigned'>('all');

    // UI State
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
    const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
    const [selectedEngine, setSelectedEngine] = useState<EngineInstance | null>(null);
    const [cloning, setCloning] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    // Execution State
    const [executionState, setExecutionState] = useState<ExecutionState>({
        executionId: null,
        status: 'idle',
        progress: 0,
        currentNode: null,
        output: null,
        tokensUsed: 0,
        cost: 0,
        durationMs: 0,
        error: null,
    });
    const [testInput, setTestInput] = useState('');
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch Data
    const fetchEngines = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/superadmin/engines', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setEngines(data.data || []);
            } else {
                throw new Error(data.message || 'Failed to fetch engines');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchMetadata = useCallback(async () => {
        if (!token) return;
        try {
            const [tmplRes, orgRes] = await Promise.all([
                fetch('/api/superadmin/workflows', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/superadmin/organizations', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (tmplRes.ok) {
                const data = await tmplRes.json();
                setTemplates(data.data || []);
            }
            if (orgRes.ok) {
                const data = await orgRes.json();
                setOrganizations(data.organizations || []);
            }
        } catch (err) {
            console.error('Failed to fetch metadata:', err);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchEngines();
            fetchMetadata();
        }
    }, [token, fetchEngines, fetchMetadata]);

    // Computed
    const filteredEngines = engines.filter(engine => {
        if (filter === 'all') return true;
        if (filter === 'unassigned') return !engine.org_id;
        return engine.status === filter;
    });

    // Handlers
    const handleClone = async (templateId: string, name: string, orgId: string | null) => {
        if (!token) return;
        setCloning(true);
        try {
            const res = await fetch('/api/superadmin/engines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    template_id: templateId,
                    name,
                    org_id: orgId
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Clone failed');
            }

            fetchEngines();
            setIsCloneModalOpen(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCloning(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!token) return;
        try {
            const res = await fetch(`/api/superadmin/engines?id=${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Delete failed');
            fetchEngines();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleToggleStatus = async (id: string, newStatus: 'active' | 'disabled') => {
        if (!token) return;
        try {
            const res = await fetch('/api/superadmin/engines', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ id, status: newStatus })
            });
            if (!res.ok) throw new Error('Update failed');
            fetchEngines();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleConfigure = (engine: EngineInstance) => {
        router.push(`/superadmin/engines/${engine.id}`);
    };

    const handleOpenExecuteModal = (engine: EngineInstance) => {
        setSelectedEngine(engine);
        setExecutionState({
            executionId: null,
            status: 'idle',
            progress: 0,
            currentNode: null,
            output: null,
            tokensUsed: 0,
            cost: 0,
            durationMs: 0,
            error: null,
        });
        setIsExecuteModalOpen(true);
    };

    const handleExecute = async () => {
        if (!selectedEngine) return;

        const startTime = Date.now();
        let parsedInput: Record<string, any>;
        try {
            parsedInput = JSON.parse(testInput);
        } catch {
            parsedInput = { message: testInput };
        }

        setExecutionState(prev => ({
            ...prev,
            status: 'running',
            progress: 5,
            currentNode: 'Initializing...',
        }));

        try {
            const tier = selectedEngine?.tier || selectedEngine?.config?.tier || 'pro';
            const response = await fetchWithAuth(`/api/engines/${selectedEngine.id}/execute`, {
                method: 'POST',
                body: JSON.stringify({
                    input: parsedInput,
                    options: { tier }
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to queue execution');

            const executionId = data.executionId;
            setExecutionState(prev => ({ ...prev, executionId, currentNode: 'Queued...' }));

            pollingRef.current = setInterval(async () => {
                const statusRes = await fetchWithAuth(`/api/engines/executions/${executionId}`);
                const statusData = await statusRes.json();

                if (statusData.status === 'completed' || statusData.status === 'failed') {
                    if (pollingRef.current) {
                        clearInterval(pollingRef.current);
                        pollingRef.current = null;
                    }
                    setExecutionState(prev => ({
                        ...prev,
                        status: statusData.status,
                        progress: 100,
                        output: typeof statusData.output === 'string' ? statusData.output : JSON.stringify(statusData.output, null, 2),
                        error: statusData.error,
                        tokensUsed: statusData.tokensUsed || 0,
                        cost: statusData.cost || 0,
                        durationMs: statusData.durationMs || (Date.now() - startTime),
                    }));
                    if (statusData.status === 'completed') fetchEngines();
                } else if (statusData.status === 'running') {
                    setExecutionState(prev => ({ ...prev, progress: Math.min(prev.progress + 5, 90) }));
                }
            }, 1000);

        } catch (err: any) {
            setExecutionState(prev => ({
                ...prev,
                status: 'failed',
                error: err.message,
                durationMs: Date.now() - startTime,
            }));
        }
    };

    const handleStopExecution = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        setExecutionState(prev => ({ ...prev, status: 'failed', error: 'Stopped by user' }));
    };

    if (authLoading) return <div className="p-xl text-center">Checking access...</div>;

    // Stats
    const stats = {
        total: engines.length,
        active: engines.filter(e => e.status === 'active').length,
        runsToday: engines.reduce((a, e) => a + (e.runs_today || 0), 0),
        unassigned: engines.filter(e => !e.org_id).length,
    };

    return (
        <div className="space-y-lg">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <a
                            href="/superadmin/engine-bundles"
                            className="text-sm text-accent hover:underline flex items-center gap-1"
                        >
                            ← Engine Bundles
                        </a>
                    </div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                        Deployed Engines
                    </h1>
                    <p className="text-textSecondary">
                        Live engine instances deployed from bundles — one per org/user with full isolation
                    </p>
                </div>

                <div className="flex items-center gap-sm">
                    <button
                        onClick={() => fetchEngines()}
                        className="p-sm hover:bg-surfaceHover rounded-[var(--radius-md)] text-textPrimary border border-border hover:border-borderHover transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <a
                        href="/superadmin/engine-bundles"
                        className="btn btn-primary gap-xs px-md py-sm rounded-[var(--radius-md)] hover:scale-[var(--hover-scale)] active:scale-[var(--active-scale)]"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Deploy New Bundle</span>
                    </a>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="flex items-center gap-sm p-md bg-error/10 border border-error/30 rounded-[var(--radius-lg)] text-error">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto p-1 rounded hover:bg-error/20 text-error">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                <div className="card flex items-center gap-md">
                    <div className="p-sm rounded-[var(--radius-md)] bg-accent/10">
                        <Server className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-textPrimary">{stats.total}</p>
                        <p className="text-sm text-textSecondary">Total Engines</p>
                    </div>
                </div>
                <div className="card flex items-center gap-md">
                    <div className="p-sm rounded-[var(--radius-md)] bg-success/10">
                        <Activity className="w-5 h-5 text-success" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-textPrimary">{stats.active}</p>
                        <p className="text-sm text-textSecondary">Active</p>
                    </div>
                </div>
                <div className="card flex items-center gap-md">
                    <div className="p-sm rounded-[var(--radius-md)] bg-info/10">
                        <Zap className="w-5 h-5 text-info" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-textPrimary">{stats.runsToday}</p>
                        <p className="text-sm text-textSecondary">Runs Today</p>
                    </div>
                </div>
                <div className="card flex items-center gap-md">
                    <div className="p-sm rounded-[var(--radius-md)] bg-warning/10">
                        <AlertCircle className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-textPrimary">{stats.unassigned}</p>
                        <p className="text-sm text-textSecondary">Unassigned</p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-xs border-b border-border pb-xs">
                {[
                    { id: 'all', label: 'All Engines' },
                    { id: 'active', label: 'Active' },
                    { id: 'standby', label: 'Standby' },
                    { id: 'unassigned', label: 'Unassigned' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id as typeof filter)}
                        className={`
                            px-md py-sm
                            text-sm font-medium
                            rounded-t-[var(--radius-md)]
                            transition-colors duration-[var(--duration-fast)]
                            ${filter === tab.id
                                ? 'bg-accent/10 text-accent border-b-2 border-accent'
                                : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceHover'}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-xl">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
            )}

            {/* Engine Grid */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                    {filteredEngines.map((engine) => (
                        <EngineCard
                            key={engine.id}
                            engine={engine}
                            onClone={() => setIsCloneModalOpen(true)}
                            onConfigure={handleConfigure}
                            onDelete={(id) => setPendingDeleteId(id)}
                            onToggleStatus={handleToggleStatus}
                            onExecute={handleOpenExecuteModal}
                            onAssign={() => alert('Engine assignment is managed from the Organizations page.')}
                            onViewApiKey={handleConfigure} // Navigate to keys
                        />
                    ))}
                </div>
            )}

            {!loading && filteredEngines.length === 0 && (
                <div className="text-center py-xl">
                    <Server className="w-16 h-16 mx-auto mb-md text-textTertiary" />
                    <h3 className="text-xl font-semibold text-textPrimary mb-xs">No engines found</h3>
                    <p className="text-textSecondary">
                        {filter === 'all'
                            ? 'Clone a template to create your first engine'
                            : `No ${filter} engines at the moment`}
                    </p>
                </div>
            )}

            <CloneEngineModal
                isOpen={isCloneModalOpen}
                onClose={() => setIsCloneModalOpen(false)}
                templates={templates}
                organizations={organizations}
                onSubmit={handleClone}
                loading={cloning}
            />

            <ExecutionModal
                isOpen={isExecuteModalOpen}
                engine={selectedEngine}
                onClose={() => {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    setIsExecuteModalOpen(false);
                }}
                executionState={executionState}
                onExecute={handleExecute}
                onStop={handleStopExecution}
                testInput={testInput}
                setTestInput={setTestInput}
            />

            <SuperadminConfirmDialog
                open={Boolean(pendingDeleteId)}
                title="Delete engine instance"
                description="This will permanently remove this engine instance and its configuration. Any queued or running jobs will be lost. This cannot be undone."
                confirmLabel="Delete engine"
                onCancel={() => setPendingDeleteId(null)}
                onConfirm={() => {
                    if (pendingDeleteId) void handleDelete(pendingDeleteId);
                    setPendingDeleteId(null);
                }}
            />
        </div>
    );
}
