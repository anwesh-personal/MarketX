import React, { useState } from 'react';
import {
    Server, MoreVertical, Copy, Settings, Pause, Play, Trash2,
    Building2, ChevronRight, UserPlus, Key, EyeOff, Eye, Check, Rocket
} from 'lucide-react';
import { EngineInstance } from '@/types/engine';

interface EngineCardProps {
    engine: EngineInstance;
    onClone: (engine: EngineInstance) => void;
    onConfigure: (engine: EngineInstance) => void;
    onDelete: (id: string) => void;
    onToggleStatus: (id: string, newStatus: 'active' | 'disabled') => void;
    onExecute: (engine: EngineInstance) => void;
    onAssign: (engine: EngineInstance) => void;
    onViewApiKey: (engine: EngineInstance) => void;
}

export function StatusBadge({ status }: { status: EngineInstance['status'] }) {
    const styles = {
        active: 'bg-surfaceElevated text-success border-border',
        standby: 'bg-surfaceElevated text-warning border-border',
        disabled: 'bg-textTertiary/10 text-textTertiary border-textTertiary/20',
        error: 'bg-surfaceElevated text-error border-border'
    };

    const labels = {
        active: 'Active',
        standby: 'Standby',
        disabled: 'Disabled',
        error: 'Error'
    };

    return (
        <span className={`
            px-sm py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider
            border ${styles[status] || styles.disabled}
        `}>
            {labels[status]}
        </span>
    );
}

export function EngineCard({
    engine,
    onClone,
    onConfigure,
    onDelete,
    onToggleStatus,
    onExecute,
    onAssign,
    onViewApiKey,
}: EngineCardProps) {
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
            hover:border-borderHover
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
                        <div className="p-sm rounded-[var(--radius-md)] bg-surfaceElevated">
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
                                        className="w-full flex items-center gap-sm px-md py-sm text-sm text-error hover:bg-surfaceElevated"
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
                                border border-dashed border-borderHover
                                bg-surface hover:bg-surfaceElevated
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
                                    bg-surfaceElevated text-success
                                    rounded-[var(--radius-md)]
                                    hover:bg-surfaceElevated
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

export default EngineCard;
