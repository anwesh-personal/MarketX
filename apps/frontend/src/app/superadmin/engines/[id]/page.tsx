'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Server, Building2, Calendar, Activity,
    Rocket, Settings, Key, Terminal, AlertCircle
} from 'lucide-react';
import { EngineInstance, ExecutionState } from '@/types/engine';
import { StatusBadge } from '@/components/engines/EngineCard';
import { ExecutionHistory } from '@/components/engines/ExecutionHistory';
import { ApiKeyManager } from '@/components/engines/ApiKeyManager';
import { ExecutionModal } from '@/components/engines/ExecutionModal';
import { toast } from 'sonner';
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';

export default function EngineDetailsPage({ params }: { params: { id: string } }) {
    const { admin } = useSuperadminAuth();
    const token = admin?.token;
    const router = useRouter();
    const [engine, setEngine] = useState<EngineInstance | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'keys' | 'config'>('overview');

    // Execution State
    const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
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

    // Polling Ref
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    const fetchEngine = async () => {
        if (!token) return;
        try {
            const res = await fetch(`/api/superadmin/engines/${params.id}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok) {
                setEngine(data.engine);
            } else {
                toast.error(data.error || 'Failed to load engine');
            }
        } catch (error) {
            console.error(error);
            toast.error('Network error loading engine');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchEngine();

        // Cleanup polling on unmount
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, [params.id, token]);

    const handleOpenExecuteModal = () => {
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
        if (!engine) return;

        const startTime = Date.now();

        // Parse input
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
            error: null, // Clear previous errors
        }));

        try {
            // Queue execution
            const response = await fetch(`/api/engines/${engine.id}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: parsedInput,
                    options: { tier: 'pro' } // Assume pro for admin testing
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to queue execution');
            }

            const executionId = data.executionId;
            setExecutionState(prev => ({
                ...prev,
                executionId,
                currentNode: 'Queued for execution...',
            }));

            // Poll for completion
            if (pollingRef.current) clearInterval(pollingRef.current);

            pollingRef.current = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/engines/executions/${executionId}`);
                    const statusData = await statusRes.json();

                    if (statusData.status === 'completed') {
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        setExecutionState({
                            executionId,
                            status: 'completed',
                            progress: 100,
                            currentNode: null,
                            output: typeof statusData.output === 'string'
                                ? statusData.output
                                : JSON.stringify(statusData.output, null, 2),
                            tokensUsed: statusData.tokensUsed || 0,
                            cost: statusData.cost || 0,
                            durationMs: statusData.durationMs || (Date.now() - startTime),
                            error: null,
                        });
                        // Refresh engine stats
                        fetchEngine();
                    } else if (statusData.status === 'failed') {
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        setExecutionState(prev => ({
                            ...prev,
                            status: 'failed',
                            progress: 100,
                            error: statusData.error || 'Execution failed',
                            durationMs: statusData.durationMs || (Date.now() - startTime),
                        }));
                    } else if (statusData.status === 'running') {
                        setExecutionState(prev => ({
                            ...prev,
                            progress: Math.min(prev.progress + 5, 90), // Fake progress for now
                            currentNode: 'Processing...',
                        }));
                    }
                } catch (pollError) {
                    console.error('Polling error:', pollError);
                }
            }, 1000);

        } catch (err: any) {
            console.error(err);
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
        setExecutionState(prev => ({
            ...prev,
            status: 'failed',
            error: 'Execution stopped by user',
        }));
    };

    const handleCloseExecuteModal = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        setIsExecuteModalOpen(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center gap-md text-textTertiary">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p>Loading engine details...</p>
            </div>
        </div>
    );

    if (!engine) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
                <h2 className="text-xl font-bold text-textPrimary mb-sm">Engine Not Found</h2>
                <button
                    onClick={() => router.push('/superadmin/engines')}
                    className="text-primary hover:underline"
                >
                    Return to Engines
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-lg max-w-7xl mx-auto p-md">
            {/* Header */}
            <div>
                <button
                    onClick={() => router.push('/superadmin/engines')}
                    className="flex items-center gap-xs text-textTertiary hover:text-textPrimary mb-md transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Engines
                </button>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-md">
                    <div className="flex items-center gap-md">
                        <div className="p-md rounded-[var(--radius-lg)] bg-primary/10">
                            <Server className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-textPrimary mb-xs">{engine.name}</h1>
                            <div className="flex flex-wrap items-center gap-md text-sm text-textSecondary">
                                <span className="flex items-center gap-xs">
                                    <Building2 className="w-4 h-4 text-textTertiary" />
                                    {engine.org_name || 'Unassigned'}
                                </span>
                                <span className="flex items-center gap-xs">
                                    <Terminal className="w-4 h-4 text-textTertiary" />
                                    {engine.template_name || 'Unknown Template'}
                                </span>
                                <span className="flex items-center gap-xs font-mono text-xs text-textTertiary bg-surfaceHover px-xs py-0.5 rounded">
                                    ID: {engine.id}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-sm">
                        <StatusBadge status={engine.status} />
                        <button
                            onClick={handleOpenExecuteModal}
                            className="
                                flex items-center gap-xs px-md py-sm 
                                bg-primary text-white rounded-[var(--radius-md)] 
                                hover:bg-primary/90 hover:shadow-[0_0_20px_var(--color-primary)/30]
                                transition-all
                            "
                        >
                            <Rocket className="w-4 h-4" />
                            Test Run
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="border-b border-border flex gap-lg overflow-x-auto">
                {[
                    { id: 'overview', label: 'Overview', icon: Activity },
                    { id: 'history', label: 'Execution History', icon: Calendar },
                    { id: 'keys', label: 'Access Keys', icon: Key },
                    { id: 'config', label: 'Configuration', icon: Settings },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            flex items-center gap-xs py-md px-xs border-b-2 transition-colors whitespace-nowrap
                            ${activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-textSecondary hover:text-textPrimary'}
                        `}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-md animate-in fade-in duration-300">
                        {/* Stats Cards */}
                        <div className="card p-lg bg-surface border border-border rounded-[var(--radius-lg)] hover:border-primary/30 transition-colors">
                            <p className="text-textSecondary text-sm mb-xs">Total Runs</p>
                            <p className="text-3xl font-bold text-textPrimary">{engine.runs_total}</p>
                        </div>
                        <div className="card p-lg bg-surface border border-border rounded-[var(--radius-lg)] hover:border-primary/30 transition-colors">
                            <p className="text-textSecondary text-sm mb-xs">Runs Today</p>
                            <p className="text-3xl font-bold text-textPrimary">{engine.runs_today}</p>
                        </div>
                        <div className="card p-lg bg-surface border border-border rounded-[var(--radius-lg)] hover:border-primary/30 transition-colors">
                            <p className="text-textSecondary text-sm mb-xs">Last Active</p>
                            <p className="text-lg font-medium text-textPrimary">
                                {engine.last_run_at ? new Date(engine.last_run_at).toLocaleString() : 'Never'}
                            </p>
                        </div>

                        {/* Error State */}
                        {engine.status === 'error' && engine.error_message && (
                            <div className="col-span-full p-md bg-error/10 border border-error/30 rounded-[var(--radius-lg)] flex items-start gap-md">
                                <AlertCircle className="w-5 h-5 text-error mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-error">Engine Error</h4>
                                    <p className="text-error/80">{engine.error_message}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="animate-in fade-in duration-300">
                        <ExecutionHistory engineId={engine.id} />
                    </div>
                )}

                {activeTab === 'keys' && (
                    <div className="animate-in fade-in duration-300">
                        <ApiKeyManager engineId={engine.id} />
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="space-y-lg animate-in fade-in duration-300">
                        <div className="p-md bg-surface border border-border rounded-[var(--radius-lg)]">
                            <div className="flex items-center justify-between mb-md">
                                <h3 className="font-semibold text-textPrimary">Global Configuration</h3>
                                <span className="text-xs text-textTertiary">Read-only view</span>
                            </div>
                            <pre className="bg-background p-md rounded border border-border text-xs font-mono overflow-auto max-h-96 text-textSecondary">
                                {JSON.stringify(engine.config || {}, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>

            {/* Execution Modal */}
            <ExecutionModal
                isOpen={isExecuteModalOpen}
                engine={engine}
                onClose={handleCloseExecuteModal}
                executionState={executionState}
                onExecute={handleExecute}
                onStop={handleStopExecution}
                testInput={testInput}
                setTestInput={setTestInput}
            />
        </div>
    );
}
