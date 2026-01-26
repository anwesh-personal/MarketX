'use client';

/**
 * ENGINE INSTANCES PAGE
 * SuperAdmin page for managing cloned workflow engine instances
 * Includes execution capability and real-time progress tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus,
    Play,
    Pause,
    Copy,
    Trash2,
    Settings,
    ChevronRight,
    Zap,
    Building2,
    RefreshCw,
    MoreVertical,
    Check,
    X,
    AlertCircle,
    Server,
    Activity,
    Loader2,
    Rocket,
    Clock,
    DollarSign,
    Hash,
    CheckCircle2,
    XCircle,
    Send,
    StopCircle,
    Key,
    Users,
    UserPlus,
    Eye,
    EyeOff,
} from 'lucide-react';
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';

// ============================================================================
// TYPES
// ============================================================================

interface EngineInstance {
    id: string;
    name: string;
    template_id: string;
    template_name?: string;
    org_id: string | null;
    org_name?: string | null;
    kb_id: string | null;
    constitution_id: string | null;
    status: 'active' | 'standby' | 'disabled' | 'error';
    config: Record<string, any>;
    runs_today: number;
    runs_total: number;
    last_run_at: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
    // API Key
    api_key?: string;
    api_keys?: { id: string; api_key: string; user_id: string; is_active: boolean }[];
}

interface ExecutionState {
    executionId: string | null;
    status: 'idle' | 'running' | 'completed' | 'failed';
    progress: number;
    currentNode: string | null;
    output: string | null;
    tokensUsed: number;
    cost: number;
    durationMs: number;
    error: string | null;
}

interface WorkflowTemplate {
    id: string;
    name: string;
    description: string | null;
    status: string;
}

interface Organization {
    id: string;
    name: string;
}

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

function StatusBadge({ status }: { status: EngineInstance['status'] }) {
    const config = {
        active: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30', dot: 'bg-success animate-pulse' },
        standby: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30', dot: 'bg-warning' },
        disabled: { bg: 'bg-textTertiary/10', text: 'text-textTertiary', border: 'border-textTertiary/30', dot: 'bg-textTertiary' },
        error: { bg: 'bg-error/10', text: 'text-error', border: 'border-error/30', dot: 'bg-error animate-pulse' },
    };
    const c = config[status];

    return (
        <span className={`
            inline-flex items-center gap-xs
            px-sm py-0.5
            text-xs font-medium
            rounded-full border
            ${c.bg} ${c.text} ${c.border}
        `}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

// ============================================================================
// ENGINE CARD COMPONENT
// ============================================================================

function EngineCard({
    engine,
    onClone,
    onConfigure,
    onDelete,
    onToggleStatus,
    onExecute,
    onAssign,
    onViewApiKey,
}: {
    engine: EngineInstance;
    onClone: (engine: EngineInstance) => void;
    onConfigure: (engine: EngineInstance) => void;
    onDelete: (id: string) => void;
    onToggleStatus: (id: string, newStatus: 'active' | 'disabled') => void;
    onExecute: (engine: EngineInstance) => void;
    onAssign: (engine: EngineInstance) => void;
    onViewApiKey: (engine: EngineInstance) => void;
}) {
    const [showMenu, setShowMenu] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyApiKey = async () => {
        if (engine.api_key) {
            await navigator.clipboard.writeText(engine.api_key);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="
            group relative
            card overflow-hidden
            border border-border
            hover:border-primary/40
            hover:shadow-[0_0_30px_var(--color-primary)/10]
            transition-all duration-300
        ">
            {/* Status Strip */}
            <div className={`
                absolute top-0 left-0 right-0 h-1
                ${engine.status === 'active' ? 'bg-success' :
                    engine.status === 'standby' ? 'bg-warning' :
                        engine.status === 'error' ? 'bg-error' : 'bg-textTertiary'}
            `} />

            <div className="p-md">
                {/* Header */}
                <div className="flex items-start justify-between mb-md">
                    <div className="flex items-center gap-sm">
                        <div className="p-sm rounded-[var(--radius-md)] bg-primary/10">
                            <Server className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-textPrimary">{engine.name}</h3>
                            <p className="text-xs text-textTertiary">{engine.template_name || 'Unknown Template'}</p>
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="
                                p-xs rounded-[var(--radius-md)]
                                text-textTertiary hover:text-textPrimary
                                hover:bg-surfaceHover
                                transition-colors
                            "
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                <div className="
                                    absolute right-0 top-full mt-xs z-20
                                    min-w-[160px]
                                    bg-surface border border-border
                                    rounded-[var(--radius-lg)]
                                    shadow-[var(--shadow-lg)]
                                    py-xs overflow-hidden
                                ">
                                    <button
                                        onClick={() => { onClone(engine); setShowMenu(false); }}
                                        className="w-full flex items-center gap-sm px-md py-sm text-sm text-textPrimary hover:bg-surfaceHover"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Clone Engine
                                    </button>
                                    <button
                                        onClick={() => { onConfigure(engine); setShowMenu(false); }}
                                        className="w-full flex items-center gap-sm px-md py-sm text-sm text-textPrimary hover:bg-surfaceHover"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Configure
                                    </button>
                                    <button
                                        onClick={() => {
                                            onToggleStatus(engine.id, engine.status === 'active' ? 'disabled' : 'active');
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-sm px-md py-sm text-sm text-textPrimary hover:bg-surfaceHover"
                                    >
                                        {engine.status === 'active' ? (
                                            <><Pause className="w-4 h-4" /> Disable</>
                                        ) : (
                                            <><Play className="w-4 h-4" /> Activate</>
                                        )}
                                    </button>
                                    <div className="border-t border-border my-xs" />
                                    <button
                                        onClick={() => { onDelete(engine.id); setShowMenu(false); }}
                                        className="w-full flex items-center gap-sm px-md py-sm text-sm text-error hover:bg-error/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Organization Assignment */}
                <div className="mb-md">
                    {engine.org_name ? (
                        <div className="flex items-center gap-sm p-sm rounded-[var(--radius-md)] bg-surfaceHover">
                            <Building2 className="w-4 h-4 text-info" />
                            <span className="text-sm text-textPrimary">{engine.org_name}</span>
                            <ChevronRight className="w-3 h-3 text-textTertiary ml-auto" />
                        </div>
                    ) : (
                        <button
                            onClick={() => onAssign(engine)}
                            className="
                                w-full flex items-center gap-sm p-sm
                                rounded-[var(--radius-md)]
                                border border-dashed border-info/50
                                bg-info/5 hover:bg-info/10
                                transition-colors
                            "
                        >
                            <UserPlus className="w-4 h-4 text-info" />
                            <span className="text-sm text-info">Assign to Organization</span>
                        </button>
                    )}
                </div>

                {/* API Key Section */}
                {engine.api_key && (
                    <div className="mb-md">
                        <div className="
                            flex items-center gap-sm p-sm
                            rounded-[var(--radius-md)]
                            bg-background border border-border
                        ">
                            <Key className="w-4 h-4 text-warning" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-textTertiary mb-0.5">API Key</p>
                                <p className="text-xs font-mono text-textSecondary truncate">
                                    {showApiKey
                                        ? engine.api_key
                                        : engine.api_key.slice(0, 12) + '••••••••••••'}
                                </p>
                            </div>
                            <div className="flex items-center gap-xs">
                                <button
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="p-xs rounded hover:bg-surfaceHover text-textTertiary"
                                    title={showApiKey ? 'Hide' : 'Show'}
                                >
                                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                    onClick={handleCopyApiKey}
                                    className={`p-xs rounded hover:bg-surfaceHover ${copied ? 'text-success' : 'text-textTertiary'}`}
                                    title="Copy"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-sm mb-md">
                    <div className="text-center p-sm rounded-[var(--radius-md)] bg-background">
                        <p className="text-lg font-bold text-textPrimary">{engine.runs_today || 0}</p>
                        <p className="text-xs text-textTertiary">Today</p>
                    </div>
                    <div className="text-center p-sm rounded-[var(--radius-md)] bg-background">
                        <p className="text-lg font-bold text-textPrimary">{(engine.runs_total || 0).toLocaleString()}</p>
                        <p className="text-xs text-textTertiary">Total</p>
                    </div>
                    <div className="text-center p-sm rounded-[var(--radius-md)] bg-background">
                        <p className="text-lg font-bold text-textPrimary">
                            {engine.last_run_at ? new Date(engine.last_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </p>
                        <p className="text-xs text-textTertiary">Last Run</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-sm border-t border-border">
                    <StatusBadge status={engine.status} />
                    <div className="flex items-center gap-sm">
                        {engine.status === 'active' && (
                            <button
                                onClick={() => onExecute(engine)}
                                className="
                                    flex items-center gap-xs
                                    px-sm py-xs
                                    bg-success/10 text-success
                                    rounded-[var(--radius-md)]
                                    hover:bg-success/20
                                    transition-colors
                                    text-xs font-medium
                                "
                            >
                                <Rocket className="w-3 h-3" />
                                Test Run
                            </button>
                        )}
                        <span className="text-xs text-textTertiary">
                            {new Date(engine.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// CLONE MODAL COMPONENT
// ============================================================================

function CloneModal({
    isOpen,
    onClose,
    templates,
    organizations,
    onSubmit,
    loading,
}: {
    isOpen: boolean;
    onClose: () => void;
    templates: WorkflowTemplate[];
    organizations: Organization[];
    onSubmit: (templateId: string, name: string, orgId: string | null) => void;
    loading: boolean;
}) {
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [selectedOrg, setSelectedOrg] = useState<string>('');
    const [engineName, setEngineName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (selectedTemplate && engineName) {
            onSubmit(selectedTemplate, engineName, selectedOrg || null);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-overlay backdrop-blur-sm z-40" onClick={onClose} />
            <div className="
                fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                z-50 w-full max-w-lg
                bg-surface border border-border
                rounded-[var(--radius-xl)]
                shadow-[var(--shadow-xl)]
                p-lg
            ">
                <div className="flex items-center justify-between mb-lg">
                    <h2 className="text-xl font-bold text-textPrimary">Clone New Engine</h2>
                    <button
                        onClick={onClose}
                        className="p-sm rounded-[var(--radius-md)] hover:bg-surfaceHover text-textSecondary"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-md">
                    {/* Template Selection */}
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-xs">
                            Select Template
                        </label>
                        {templates.length === 0 ? (
                            <p className="text-sm text-textTertiary">No templates available. Create a workflow template first.</p>
                        ) : (
                            <div className="space-y-xs max-h-48 overflow-y-auto">
                                {templates.map((tmpl) => (
                                    <button
                                        key={tmpl.id}
                                        onClick={() => setSelectedTemplate(tmpl.id)}
                                        className={`
                                            w-full p-md text-left
                                            rounded-[var(--radius-lg)]
                                            border transition-all duration-[var(--duration-fast)]
                                            ${selectedTemplate === tmpl.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-primary/40'}
                                        `}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-textPrimary">{tmpl.name}</p>
                                                <p className="text-sm text-textSecondary">{tmpl.description || 'No description'}</p>
                                            </div>
                                            {selectedTemplate === tmpl.id && (
                                                <Check className="w-5 h-5 text-primary" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Engine Name */}
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-xs">
                            Engine Name
                        </label>
                        <input
                            type="text"
                            value={engineName}
                            onChange={(e) => setEngineName(e.target.value)}
                            placeholder="e.g., IMT Reply #3"
                            className="
                                w-full px-md py-sm
                                bg-background border border-border
                                rounded-[var(--radius-md)]
                                text-textPrimary placeholder:text-textTertiary
                                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                            "
                        />
                    </div>

                    {/* Organization Assignment */}
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-xs">
                            Assign to Organization (Optional)
                        </label>
                        <select
                            value={selectedOrg}
                            onChange={(e) => setSelectedOrg(e.target.value)}
                            className="
                                w-full px-md py-sm
                                bg-background border border-border
                                rounded-[var(--radius-md)]
                                text-textPrimary
                                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                            "
                        >
                            <option value="">Select an organization...</option>
                            {organizations.map((org) => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-sm pt-md">
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
                            onClick={handleSubmit}
                            disabled={!selectedTemplate || !engineName || loading}
                            className="
                                flex items-center gap-xs
                                px-md py-sm
                                bg-primary text-white
                                rounded-[var(--radius-md)]
                                hover:bg-primary/90
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all
                            "
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                            Clone Engine
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// ============================================================================
// EXECUTION MODAL COMPONENT
// ============================================================================

function ExecutionModal({
    isOpen,
    engine,
    onClose,
    executionState,
    onExecute,
    onStop,
    testInput,
    setTestInput,
}: {
    isOpen: boolean;
    engine: EngineInstance | null;
    onClose: () => void;
    executionState: ExecutionState;
    onExecute: () => void;
    onStop: () => void;
    testInput: string;
    setTestInput: (input: string) => void;
}) {
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
                        <div className="p-sm rounded-[var(--radius-md)] bg-success/10">
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
                                <div className="flex items-center gap-sm p-md bg-success/10 border border-success/30 rounded-[var(--radius-lg)] text-success">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="font-medium">Execution completed successfully!</span>
                                </div>
                            )}

                            {status === 'failed' && error && (
                                <div className="flex items-start gap-sm p-md bg-error/10 border border-error/30 rounded-[var(--radius-lg)] text-error">
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

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function EnginesPage() {
    const { fetchWithAuth } = useSuperadminAuth();

    // State
    const [engines, setEngines] = useState<EngineInstance[]>([]);
    const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [cloning, setCloning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'standby' | 'unassigned'>('all');

    // Execution state
    const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
    const [selectedEngine, setSelectedEngine] = useState<EngineInstance | null>(null);
    const [testInput, setTestInput] = useState('{\n  "message": "Hello, I need help with my account"\n}');
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
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch engines
    const fetchEngines = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetchWithAuth('/api/superadmin/engines');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch engines');
            }

            setEngines(data.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fetchWithAuth]);

    // Fetch templates for cloning
    const fetchTemplates = useCallback(async () => {
        try {
            const response = await fetchWithAuth('/api/superadmin/workflows?status=active');
            const data = await response.json();
            if (response.ok) {
                setTemplates(data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch templates:', err);
        }
    }, [fetchWithAuth]);

    // Fetch organizations
    const fetchOrganizations = useCallback(async () => {
        try {
            const response = await fetchWithAuth('/api/superadmin/organizations');
            const data = await response.json();
            if (response.ok) {
                setOrganizations(data.organizations || data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch organizations:', err);
        }
    }, [fetchWithAuth]);

    useEffect(() => {
        fetchEngines();
        fetchTemplates();
        fetchOrganizations();
    }, [fetchEngines, fetchTemplates, fetchOrganizations]);

    // Filter engines
    const filteredEngines = engines.filter((eng) => {
        if (filter === 'all') return true;
        if (filter === 'active') return eng.status === 'active';
        if (filter === 'standby') return eng.status === 'standby';
        if (filter === 'unassigned') return !eng.org_id;
        return true;
    });

    // Handlers
    const handleClone = async (templateId: string, name: string, orgId: string | null) => {
        setCloning(true);
        try {
            const response = await fetchWithAuth('/api/superadmin/engines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'clone',
                    template_id: templateId,
                    name,
                    org_id: orgId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to clone engine');
            }

            await fetchEngines();
            setIsCloneModalOpen(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCloning(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this engine instance?')) return;

        try {
            const response = await fetchWithAuth(`/api/superadmin/engines?id=${id}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete engine');
            }

            await fetchEngines();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleToggleStatus = async (id: string, newStatus: 'active' | 'disabled') => {
        try {
            const response = await fetchWithAuth('/api/superadmin/engines', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update engine status');
            }

            await fetchEngines();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleConfigure = (engine: EngineInstance) => {
        // TODO: Open configuration modal
        console.log('Configure engine:', engine.id);
    };

    const handleCloneExisting = (engine: EngineInstance) => {
        // Pre-select the template and open modal
        setIsCloneModalOpen(true);
    };

    // ========================================================================
    // EXECUTION HANDLERS
    // ========================================================================

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

    const handleCloseExecuteModal = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        setIsExecuteModalOpen(false);
        setSelectedEngine(null);
    };

    const handleExecute = async () => {
        if (!selectedEngine) return;

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
        }));

        try {
            // Call the new backend execute API
            const response = await fetch(`http://localhost:8080/api/engines/${selectedEngine.id}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: 'superadmin-test',
                    input: parsedInput,
                    options: { executionMode: 'sync' }
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Execution failed');
            }

            // Success!
            setExecutionState({
                executionId: data.executionId,
                status: 'completed',
                progress: 100,
                currentNode: null,
                output: typeof data.output === 'string' ? data.output : JSON.stringify(data.output, null, 2),
                tokensUsed: data.tokenUsage?.totalTokens || 0,
                cost: data.tokenUsage?.totalCost || 0,
                durationMs: data.durationMs || (Date.now() - startTime),
                error: null,
            });

            // Refresh engines to update run count
            fetchEngines();

        } catch (err: any) {
            setExecutionState(prev => ({
                ...prev,
                status: 'failed',
                progress: prev.progress,
                error: err.message,
                durationMs: Date.now() - startTime,
            }));
        }
    };

    const handleStopExecution = async () => {
        if (!executionState.executionId) return;

        try {
            await fetch(`http://localhost:8080/api/engines/executions/${executionState.executionId}/stop`, {
                method: 'POST',
            });

            setExecutionState(prev => ({
                ...prev,
                status: 'failed',
                error: 'Execution stopped by user',
            }));
        } catch (err) {
            console.error('Failed to stop execution:', err);
        }
    };

    // ========================================================================
    // ASSIGNMENT HANDLERS
    // ========================================================================

    const handleOpenAssignModal = (engine: EngineInstance) => {
        const orgId = prompt('Enter Organization ID to assign this engine:');
        if (!orgId) return;

        handleAssignToOrg(engine.id, orgId);
    };

    const handleAssignToOrg = async (engineId: string, orgId: string) => {
        try {
            // First assign the engine to the org
            const assignResponse = await fetchWithAuth('/api/superadmin/engines', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: engineId, org_id: orgId }),
            });

            if (!assignResponse.ok) {
                throw new Error('Failed to assign engine');
            }

            // Then create an API key
            const keyResponse = await fetch('http://localhost:8080/api/keys/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    engineId,
                    userId: orgId, // Using org_id as user_id for now
                    orgId,
                    keyName: 'Primary Access Key'
                }),
            });

            const keyData = await keyResponse.json();

            if (keyResponse.ok) {
                alert(`✅ Engine assigned successfully!\n\nAPI Key: ${keyData.apiKey}\n\nCopy this key - it won't be shown again!`);
            }

            await fetchEngines();
        } catch (err: any) {
            setError(err.message);
            alert(`❌ Failed to assign: ${err.message}`);
        }
    };

    const handleViewApiKey = (engine: EngineInstance) => {
        if (engine.api_key) {
            navigator.clipboard.writeText(engine.api_key);
            alert(`API Key copied to clipboard!\n\n${engine.api_key.slice(0, 30)}...`);
        } else {
            alert('No API key found. Assign to an organization first.');
        }
    };

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
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                        Engine Instances
                    </h1>
                    <p className="text-textSecondary">
                        Deploy and manage cloned workflow engines per organization
                    </p>
                </div>

                <div className="flex items-center gap-sm">
                    <button
                        onClick={() => fetchEngines()}
                        className="p-sm hover:bg-surfaceHover rounded-[var(--radius-md)] text-textTertiary hover:text-textPrimary"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setIsCloneModalOpen(true)}
                        className="
                            flex items-center gap-xs
                            px-md py-sm
                            bg-primary text-white
                            rounded-[var(--radius-md)]
                            hover:bg-primary/90
                            shadow-[0_0_20px_var(--color-primary)/30]
                            hover:shadow-[0_0_30px_var(--color-primary)/50]
                            transition-all duration-[var(--duration-fast)]
                        "
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Clone New Engine</span>
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="flex items-center gap-sm p-md bg-error/10 border border-error/30 rounded-[var(--radius-lg)] text-error">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                <div className="card flex items-center gap-md">
                    <div className="p-sm rounded-[var(--radius-md)] bg-primary/10">
                        <Server className="w-5 h-5 text-primary" />
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
                                ? 'bg-primary/10 text-primary border-b-2 border-primary'
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
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {/* Engine Grid */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                    {filteredEngines.map((engine) => (
                        <EngineCard
                            key={engine.id}
                            engine={engine}
                            onClone={handleCloneExisting}
                            onConfigure={handleConfigure}
                            onDelete={handleDelete}
                            onToggleStatus={handleToggleStatus}
                            onExecute={handleOpenExecuteModal}
                            onAssign={handleOpenAssignModal}
                            onViewApiKey={handleViewApiKey}
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

            {/* Clone Modal */}
            <CloneModal
                isOpen={isCloneModalOpen}
                onClose={() => setIsCloneModalOpen(false)}
                templates={templates}
                organizations={organizations}
                onSubmit={handleClone}
                loading={cloning}
            />

            {/* Execution Modal */}
            <ExecutionModal
                isOpen={isExecuteModalOpen}
                engine={selectedEngine}
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
