import React from 'react';
import {
    X, Rocket, Loader2, Hash, DollarSign, Clock,
    CheckCircle2, XCircle, Send, StopCircle
} from 'lucide-react';
import { EngineInstance, ExecutionState } from '@/types/engine';

interface ExecutionModalProps {
    isOpen: boolean;
    engine: EngineInstance | null;
    onClose: () => void;
    executionState: ExecutionState;
    onExecute: () => void;
    onStop: () => void;
    testInput: string;
    setTestInput: (input: string) => void;
}

export function ExecutionModal({
    isOpen,
    engine,
    onClose,
    executionState,
    onExecute,
    onStop,
    testInput,
    setTestInput,
}: ExecutionModalProps) {
    if (!isOpen || !engine) return null;

    const { status, progress, currentNode, output, tokensUsed, cost, durationMs, error } = executionState;

    return (
        <>
            <div className="fixed inset-0 bg-overlay backdrop-blur-sm z-40" onClick={status === 'idle' ? onClose : undefined} />
            <div className="
                fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                z-50 w-full max-w-2xl max-h-[90vh] overflow-hidden
                bg-surface border border-border
                rounded-[var(--radius-xl)]
                shadow-[var(--shadow-xl)]
                flex flex-col
            ">
                {/* Header */}
                <div className="flex items-center justify-between p-lg border-b border-border">
                    <div className="flex items-center gap-sm">
                        <div className="p-sm rounded-[var(--radius-md)] bg-surfaceElevated">
                            <Rocket className="w-5 h-5 text-success" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-textPrimary">Test Run: {engine.name}</h2>
                            <p className="text-sm text-textTertiary">Execute engine with test input</p>
                        </div>
                    </div>
                    {status === 'idle' && (
                        <button
                            onClick={onClose}
                            className="p-sm rounded-[var(--radius-md)] hover:bg-surfaceHover text-textSecondary"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-lg space-y-md">
                    {/* Input Section */}
                    {status === 'idle' && (
                        <div>
                            <label className="block text-sm font-medium text-textSecondary mb-xs">
                                Test Input (JSON or text)
                            </label>
                            <textarea
                                value={testInput}
                                onChange={(e) => setTestInput(e.target.value)}
                                placeholder='{"message": "Hello, I need help with my account", "context": "Customer inquiry"}'
                                rows={6}
                                className="
                                    w-full px-md py-sm
                                    bg-background border border-border
                                    rounded-[var(--radius-md)]
                                    text-textPrimary placeholder:text-textTertiary
                                    font-mono text-sm
                                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                                "
                            />
                        </div>
                    )}

                    {/* Progress Section */}
                    {status !== 'idle' && (
                        <>
                            {/* Progress Bar */}
                            <div className="space-y-xs">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-textSecondary">Progress</span>
                                    <span className="font-medium text-primary">{progress}%</span>
                                </div>
                                <div className="h-2 bg-background rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 rounded-full ${status === 'failed' ? 'bg-error' :
                                            status === 'completed' ? 'bg-success' :
                                                'bg-primary'
                                            }`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                {currentNode && status === 'running' && (
                                    <p className="text-xs text-textTertiary flex items-center gap-xs">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Processing: {currentNode}
                                    </p>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-sm">
                                <div className="p-sm rounded-[var(--radius-md)] bg-background text-center">
                                    <div className="flex items-center justify-center gap-xs text-info mb-xs">
                                        <Hash className="w-4 h-4" />
                                        <span className="text-lg font-bold">{tokensUsed.toLocaleString()}</span>
                                    </div>
                                    <p className="text-xs text-textTertiary">Tokens</p>
                                </div>
                                <div className="p-sm rounded-[var(--radius-md)] bg-background text-center">
                                    <div className="flex items-center justify-center gap-xs text-warning mb-xs">
                                        <DollarSign className="w-4 h-4" />
                                        <span className="text-lg font-bold">${cost.toFixed(4)}</span>
                                    </div>
                                    <p className="text-xs text-textTertiary">Cost</p>
                                </div>
                                <div className="p-sm rounded-[var(--radius-md)] bg-background text-center">
                                    <div className="flex items-center justify-center gap-xs text-primary mb-xs">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-lg font-bold">{(durationMs / 1000).toFixed(1)}s</span>
                                    </div>
                                    <p className="text-xs text-textTertiary">Duration</p>
                                </div>
                            </div>

                            {/* Status Message */}
                            {status === 'completed' && (
                                <div className="flex items-center gap-sm p-md bg-surfaceElevated border border-border rounded-[var(--radius-lg)] text-success">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="font-medium">Execution completed successfully!</span>
                                </div>
                            )}

                            {status === 'failed' && error && (
                                <div className="flex items-start gap-sm p-md bg-surfaceElevated border border-border rounded-[var(--radius-lg)] text-error">
                                    <XCircle className="w-5 h-5 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Execution failed</p>
                                        <p className="text-sm opacity-80">{error}</p>
                                    </div>
                                </div>
                            )}

                            {/* Output */}
                            {output && (
                                <div>
                                    <label className="block text-sm font-medium text-textSecondary mb-xs">
                                        Output
                                    </label>
                                    <div className="
                                        p-md
                                        bg-background border border-border
                                        rounded-[var(--radius-md)]
                                        max-h-64 overflow-y-auto
                                    ">
                                        <pre className="text-sm text-textPrimary whitespace-pre-wrap font-mono">
                                            {output}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-sm p-lg border-t border-border">
                    {status === 'idle' && (
                        <>
                            <button
                                onClick={onClose}
                                className="
                                    px-md py-sm
                                    text-textSecondary
                                    hover:text-textPrimary hover:bg-surfaceHover
                                    rounded-[var(--radius-md)]
                                    transition-colors
                                "
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onExecute}
                                className="
                                    flex items-center gap-xs
                                    px-md py-sm
                                    bg-success text-white
                                    rounded-[var(--radius-md)]
                                    hover:bg-success/90
                                    shadow-[0_0_20px_var(--color-success)/30]
                                    transition-all
                                "
                            >
                                <Send className="w-4 h-4" />
                                Execute
                            </button>
                        </>
                    )}

                    {status === 'running' && (
                        <button
                            onClick={onStop}
                            className="
                                flex items-center gap-xs
                                px-md py-sm
                                bg-error text-white
                                rounded-[var(--radius-md)]
                                hover:bg-error/90
                                transition-all
                            "
                        >
                            <StopCircle className="w-4 h-4" />
                            Stop
                        </button>
                    )}

                    {(status === 'completed' || status === 'failed') && (
                        <button
                            onClick={onClose}
                            className="
                                flex items-center gap-xs
                                px-md py-sm
                                bg-primary text-white
                                rounded-[var(--radius-md)]
                                hover:bg-primary/90
                                transition-all
                            "
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}

export default ExecutionModal;
