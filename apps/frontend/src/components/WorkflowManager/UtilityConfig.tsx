/**
 * UTILITY CONFIG COMPONENT
 * Configuration forms for utility nodes (conditions, loops, merge, delay, review, error, split)
 * 
 * PRODUCTION-READY with full field configuration
 * 
 * @author Axiom AI
 */

import React, { useState, useCallback } from 'react';
import {
    GitBranch, Workflow, Repeat, Merge, Clock, UserCheck, AlertTriangle, GitFork,
    ChevronDown, Plus, Trash2, Play, Pause, Check, X, RefreshCw, Zap
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface UtilityConfigEntry {
    enabled?: boolean;
    onError?: 'stop' | 'warn' | 'skip';

    // If-Else Condition
    conditionType?: 'simple' | 'expression' | 'script';
    field?: string;
    operator?: string;
    value?: string;
    expression?: string;

    // Switch Router
    cases?: SwitchCase[];
    defaultPath?: boolean;

    // For Each Loop
    arrayField?: string;
    itemVariable?: string;
    indexVariable?: string;
    parallelExecution?: boolean;
    maxConcurrency?: number;
    continueOnError?: boolean;

    // Merge Branches
    waitMode?: 'all' | 'any' | 'first';
    mergeStrategy?: 'combine' | 'last' | 'custom';
    timeout?: number;

    // Delay/Wait
    delayType?: 'fixed' | 'dynamic' | 'schedule';
    duration?: number;
    unit?: 'ms' | 's' | 'm' | 'h' | 'd';
    dynamicField?: string;
    scheduleTime?: string;

    // Human Review
    reviewType?: 'approve_reject' | 'edit' | 'select';
    reviewTitle?: string;
    reviewInstructions?: string;
    approvers?: string[];
    notifyChannels?: string[];
    timeoutAction?: 'approve' | 'reject' | 'escalate';
    allowEdit?: boolean;

    // Error Handler
    catchAll?: boolean;
    catchErrors?: string[];
    retryCount?: number;
    retryDelay?: number;
    retryBackoff?: 'linear' | 'exponential';
    fallbackValue?: string;

    // Split Parallel
    branchCount?: number;
    cloneInput?: boolean;
    branchNames?: string[];
}

interface SwitchCase {
    id: string;
    pattern: string;
    matchType: 'exact' | 'contains' | 'regex' | 'startsWith' | 'endsWith';
    label: string;
}

interface UtilityConfigProps {
    nodeType: string;
    config: UtilityConfigEntry;
    onChange: (config: UtilityConfigEntry) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ERROR_ACTIONS = [
    { value: 'stop', label: 'Stop Workflow' },
    { value: 'warn', label: 'Warn & Continue' },
    { value: 'skip', label: 'Skip Node' },
];

const OPERATORS = [
    { value: 'eq', label: '= Equals' },
    { value: 'neq', label: '≠ Not Equals' },
    { value: 'gt', label: '> Greater Than' },
    { value: 'gte', label: '≥ Greater or Equal' },
    { value: 'lt', label: '< Less Than' },
    { value: 'lte', label: '≤ Less or Equal' },
    { value: 'contains', label: 'Contains' },
    { value: 'notContains', label: 'Not Contains' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' },
    { value: 'matches', label: 'Matches Regex' },
    { value: 'isEmpty', label: 'Is Empty' },
    { value: 'isNotEmpty', label: 'Is Not Empty' },
    { value: 'isNull', label: 'Is Null' },
    { value: 'isNotNull', label: 'Is Not Null' },
];

const MATCH_TYPES = [
    { value: 'exact', label: 'Exact Match' },
    { value: 'contains', label: 'Contains' },
    { value: 'regex', label: 'Regex' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' },
];

const WAIT_MODES = [
    { value: 'all', label: 'Wait for All', description: 'Wait until all branches complete' },
    { value: 'any', label: 'Wait for Any', description: 'Continue when any branch completes' },
    { value: 'first', label: 'Wait for First', description: 'Continue with first completion only' },
];

const MERGE_STRATEGIES = [
    { value: 'combine', label: 'Combine All', description: 'Merge all outputs into array' },
    { value: 'last', label: 'Use Last', description: 'Use output from last branch' },
    { value: 'custom', label: 'Custom', description: 'Custom merge logic' },
];

const TIME_UNITS = [
    { value: 'ms', label: 'Milliseconds' },
    { value: 's', label: 'Seconds' },
    { value: 'm', label: 'Minutes' },
    { value: 'h', label: 'Hours' },
    { value: 'd', label: 'Days' },
];

const DELAY_TYPES = [
    { value: 'fixed', label: 'Fixed Delay', description: 'Wait for set duration' },
    { value: 'dynamic', label: 'Dynamic', description: 'Duration from field' },
    { value: 'schedule', label: 'Schedule', description: 'Resume at specific time' },
];

const REVIEW_TYPES = [
    { value: 'approve_reject', label: 'Approve/Reject', description: 'Simple approval flow' },
    { value: 'edit', label: 'Edit & Approve', description: 'Allow edits before approval' },
    { value: 'select', label: 'Select Option', description: 'Choose from options' },
];

const TIMEOUT_ACTIONS = [
    { value: 'approve', label: 'Auto-Approve' },
    { value: 'reject', label: 'Auto-Reject' },
    { value: 'escalate', label: 'Escalate' },
];

const RETRY_BACKOFFS = [
    { value: 'linear', label: 'Linear' },
    { value: 'exponential', label: 'Exponential' },
];

// ============================================================================
// UTILITY CONFIG COMPONENT
// ============================================================================

export function UtilityConfig({ nodeType, config, onChange }: UtilityConfigProps) {
    const safeConfig: UtilityConfigEntry = {
        ...config,
        enabled: config.enabled ?? true,
        onError: config.onError || 'warn',
        // If-Else defaults
        conditionType: config.conditionType || 'simple',
        operator: config.operator || 'eq',
        // Switch defaults
        cases: config.cases || [],
        defaultPath: config.defaultPath ?? true,
        // Loop defaults
        itemVariable: config.itemVariable || 'item',
        indexVariable: config.indexVariable || 'index',
        parallelExecution: config.parallelExecution ?? false,
        maxConcurrency: config.maxConcurrency ?? 5,
        continueOnError: config.continueOnError ?? false,
        // Merge defaults
        waitMode: config.waitMode || 'all',
        mergeStrategy: config.mergeStrategy || 'combine',
        timeout: config.timeout ?? 300000,
        // Delay defaults
        delayType: config.delayType || 'fixed',
        duration: config.duration ?? 5000,
        unit: config.unit || 'ms',
        // Review defaults
        reviewType: config.reviewType || 'approve_reject',
        approvers: config.approvers || [],
        notifyChannels: config.notifyChannels || [],
        timeoutAction: config.timeoutAction || 'escalate',
        allowEdit: config.allowEdit ?? true,
        // Error handler defaults
        catchAll: config.catchAll ?? true,
        catchErrors: config.catchErrors || [],
        retryCount: config.retryCount ?? 0,
        retryDelay: config.retryDelay ?? 1000,
        retryBackoff: config.retryBackoff || 'linear',
        // Split defaults
        branchCount: config.branchCount ?? 2,
        cloneInput: config.cloneInput ?? true,
        branchNames: config.branchNames || [],
    };

    const updateConfig = useCallback((updates: Partial<UtilityConfigEntry>) => {
        onChange({ ...safeConfig, ...updates });
    }, [safeConfig, onChange]);

    const getUtilityIcon = () => {
        switch (nodeType) {
            case 'condition-if-else': return GitBranch;
            case 'condition-switch': return Workflow;
            case 'loop-foreach': return Repeat;
            case 'merge-combine': return Merge;
            case 'delay-wait': return Clock;
            case 'human-review': return UserCheck;
            case 'error-handler': return AlertTriangle;
            case 'split-parallel': return GitFork;
            default: return Zap;
        }
    };

    const Icon = getUtilityIcon();

    return (
        <div className="utility-config">
            <div className="utility-config-header">
                <Icon size={18} className="utility-config-icon" />
                <span>Utility Configuration</span>
            </div>

            <div className="utility-config-section">
                <div className="utility-config-section-title">General Settings</div>
                <div className="utility-config-row">
                    <div className="utility-config-field utility-config-field-half utility-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={safeConfig.enabled}
                                onChange={(e) => updateConfig({ enabled: e.target.checked })}
                            />
                            Node Enabled
                        </label>
                    </div>
                    <div className="utility-config-field utility-config-field-half">
                        <label>On Error</label>
                        <div className="utility-config-select-wrapper">
                            <select
                                value={safeConfig.onError}
                                onChange={(e) => updateConfig({ onError: e.target.value as any })}
                            >
                                {ERROR_ACTIONS.map(ea => (
                                    <option key={ea.value} value={ea.value}>{ea.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="select-icon" />
                        </div>
                    </div>
                </div>
            </div>

            {nodeType === 'condition-if-else' && <IfElseConfig config={safeConfig} onChange={updateConfig} />}
            {nodeType === 'condition-switch' && <SwitchConfig config={safeConfig} onChange={updateConfig} />}
            {nodeType === 'loop-foreach' && <LoopConfig config={safeConfig} onChange={updateConfig} />}
            {nodeType === 'merge-combine' && <MergeConfig config={safeConfig} onChange={updateConfig} />}
            {nodeType === 'delay-wait' && <DelayConfig config={safeConfig} onChange={updateConfig} />}
            {nodeType === 'human-review' && <HumanReviewConfig config={safeConfig} onChange={updateConfig} />}
            {nodeType === 'error-handler' && <ErrorHandlerConfig config={safeConfig} onChange={updateConfig} />}
            {nodeType === 'split-parallel' && <SplitConfig config={safeConfig} onChange={updateConfig} />}
        </div>
    );
}

// ============================================================================
// IF-ELSE CONFIG
// ============================================================================

function IfElseConfig({ config, onChange }: { config: UtilityConfigEntry; onChange: (u: Partial<UtilityConfigEntry>) => void }) {
    return (
        <div className="utility-config-section">
            <div className="utility-config-section-title">Condition</div>
            <div className="utility-config-condition-type">
                {['simple', 'expression'].map(t => (
                    <button
                        key={t}
                        type="button"
                        className={`utility-config-type-btn ${config.conditionType === t ? 'active' : ''}`}
                        onClick={() => onChange({ conditionType: t as any })}
                    >
                        {t === 'simple' ? 'Simple' : 'Expression'}
                    </button>
                ))}
            </div>

            {config.conditionType === 'simple' ? (
                <div className="utility-config-simple-condition">
                    <div className="utility-config-field">
                        <label>Field</label>
                        <input
                            type="text"
                            value={config.field || ''}
                            onChange={(e) => onChange({ field: e.target.value })}
                            placeholder="{{lastNodeOutput.status}}"
                        />
                    </div>
                    <div className="utility-config-row">
                        <div className="utility-config-field utility-config-field-half">
                            <label>Operator</label>
                            <div className="utility-config-select-wrapper">
                                <select value={config.operator} onChange={(e) => onChange({ operator: e.target.value })}>
                                    {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <ChevronDown size={16} className="select-icon" />
                            </div>
                        </div>
                        <div className="utility-config-field utility-config-field-half">
                            <label>Value</label>
                            <input
                                type="text"
                                value={config.value || ''}
                                onChange={(e) => onChange({ value: e.target.value })}
                                placeholder="success"
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="utility-config-field">
                    <label>Expression</label>
                    <textarea
                        value={config.expression || ''}
                        onChange={(e) => onChange({ expression: e.target.value })}
                        rows={3}
                        placeholder="{{lastNodeOutput.score}} > 80 && {{lastNodeOutput.verified}}"
                        className="utility-config-code"
                    />
                    <div className="utility-config-hint">Use logical operators: && (and), || (or), ! (not)</div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// SWITCH CONFIG
// ============================================================================

function SwitchConfig({ config, onChange }: { config: UtilityConfigEntry; onChange: (u: Partial<UtilityConfigEntry>) => void }) {
    const cases = config.cases || [];

    const addCase = () => {
        const newCase: SwitchCase = { id: `case-${Date.now()}`, pattern: '', matchType: 'exact', label: `Case ${cases.length + 1}` };
        onChange({ cases: [...cases, newCase] });
    };

    const updateCase = (id: string, updates: Partial<SwitchCase>) => {
        onChange({ cases: cases.map(c => c.id === id ? { ...c, ...updates } : c) });
    };

    const removeCase = (id: string) => {
        onChange({ cases: cases.filter(c => c.id !== id) });
    };

    return (
        <div className="utility-config-section">
            <div className="utility-config-section-header">
                <div className="utility-config-section-title">Switch Field</div>
            </div>
            <div className="utility-config-field">
                <label>Field to Match</label>
                <input
                    type="text"
                    value={config.field || ''}
                    onChange={(e) => onChange({ field: e.target.value })}
                    placeholder="{{lastNodeOutput.type}}"
                />
            </div>

            <div className="utility-config-section-header">
                <div className="utility-config-section-title">Cases</div>
                <button type="button" className="utility-config-add-btn" onClick={addCase}>
                    <Plus size={14} /> Add Case
                </button>
            </div>

            <div className="utility-config-list">
                {cases.map((c, i) => (
                    <div key={c.id} className="utility-config-case-row">
                        <span className="case-number">{i + 1}</span>
                        <input
                            type="text"
                            value={c.label}
                            onChange={(e) => updateCase(c.id, { label: e.target.value })}
                            placeholder="Label"
                            className="case-label"
                        />
                        <div className="utility-config-select-wrapper case-match">
                            <select value={c.matchType} onChange={(e) => updateCase(c.id, { matchType: e.target.value as any })}>
                                {MATCH_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <ChevronDown size={14} className="select-icon" />
                        </div>
                        <input
                            type="text"
                            value={c.pattern}
                            onChange={(e) => updateCase(c.id, { pattern: e.target.value })}
                            placeholder="Pattern"
                            className="case-pattern"
                        />
                        <button type="button" className="utility-config-remove-btn" onClick={() => removeCase(c.id)}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="utility-config-field utility-config-field-inline">
                <label>
                    <input type="checkbox" checked={config.defaultPath} onChange={(e) => onChange({ defaultPath: e.target.checked })} />
                    Include Default Path (when no case matches)
                </label>
            </div>
        </div>
    );
}

// ============================================================================
// LOOP CONFIG
// ============================================================================

function LoopConfig({ config, onChange }: { config: UtilityConfigEntry; onChange: (u: Partial<UtilityConfigEntry>) => void }) {
    return (
        <div className="utility-config-section">
            <div className="utility-config-section-title">Loop Configuration</div>
            <div className="utility-config-field">
                <label>Array Field</label>
                <input
                    type="text"
                    value={config.arrayField || ''}
                    onChange={(e) => onChange({ arrayField: e.target.value })}
                    placeholder="{{lastNodeOutput.items}}"
                />
            </div>
            <div className="utility-config-row">
                <div className="utility-config-field utility-config-field-half">
                    <label>Item Variable</label>
                    <input type="text" value={config.itemVariable} onChange={(e) => onChange({ itemVariable: e.target.value })} placeholder="item" />
                </div>
                <div className="utility-config-field utility-config-field-half">
                    <label>Index Variable</label>
                    <input type="text" value={config.indexVariable} onChange={(e) => onChange({ indexVariable: e.target.value })} placeholder="index" />
                </div>
            </div>
            <div className="utility-config-field utility-config-field-inline">
                <label>
                    <input type="checkbox" checked={config.parallelExecution} onChange={(e) => onChange({ parallelExecution: e.target.checked })} />
                    Parallel Execution
                </label>
            </div>
            {config.parallelExecution && (
                <div className="utility-config-field">
                    <label>Max Concurrency</label>
                    <input type="number" min={1} max={50} value={config.maxConcurrency} onChange={(e) => onChange({ maxConcurrency: parseInt(e.target.value) || 5 })} />
                </div>
            )}
            <div className="utility-config-field utility-config-field-inline">
                <label>
                    <input type="checkbox" checked={config.continueOnError} onChange={(e) => onChange({ continueOnError: e.target.checked })} />
                    Continue on Item Error
                </label>
            </div>
        </div>
    );
}

// ============================================================================
// MERGE CONFIG
// ============================================================================

function MergeConfig({ config, onChange }: { config: UtilityConfigEntry; onChange: (u: Partial<UtilityConfigEntry>) => void }) {
    return (
        <div className="utility-config-section">
            <div className="utility-config-section-title">Wait Mode</div>
            <div className="utility-config-mode-grid">
                {WAIT_MODES.map(m => (
                    <button key={m.value} type="button" className={`utility-config-mode-btn ${config.waitMode === m.value ? 'active' : ''}`} onClick={() => onChange({ waitMode: m.value as any })}>
                        <span className="mode-label">{m.label}</span>
                        <span className="mode-desc">{m.description}</span>
                    </button>
                ))}
            </div>
            <div className="utility-config-section-title">Merge Strategy</div>
            <div className="utility-config-mode-grid">
                {MERGE_STRATEGIES.map(m => (
                    <button key={m.value} type="button" className={`utility-config-mode-btn ${config.mergeStrategy === m.value ? 'active' : ''}`} onClick={() => onChange({ mergeStrategy: m.value as any })}>
                        <span className="mode-label">{m.label}</span>
                        <span className="mode-desc">{m.description}</span>
                    </button>
                ))}
            </div>
            <div className="utility-config-field">
                <label>Timeout (ms)</label>
                <input type="number" min={0} value={config.timeout} onChange={(e) => onChange({ timeout: parseInt(e.target.value) || 0 })} />
                <div className="utility-config-hint">{config.timeout! >= 60000 ? `${Math.floor(config.timeout! / 60000)} minute(s)` : `${config.timeout} ms`}</div>
            </div>
        </div>
    );
}

// ============================================================================
// DELAY CONFIG
// ============================================================================

function DelayConfig({ config, onChange }: { config: UtilityConfigEntry; onChange: (u: Partial<UtilityConfigEntry>) => void }) {
    return (
        <div className="utility-config-section">
            <div className="utility-config-section-title">Delay Type</div>
            <div className="utility-config-mode-grid">
                {DELAY_TYPES.map(d => (
                    <button key={d.value} type="button" className={`utility-config-mode-btn ${config.delayType === d.value ? 'active' : ''}`} onClick={() => onChange({ delayType: d.value as any })}>
                        <span className="mode-label">{d.label}</span>
                        <span className="mode-desc">{d.description}</span>
                    </button>
                ))}
            </div>
            {config.delayType === 'fixed' && (
                <div className="utility-config-row">
                    <div className="utility-config-field utility-config-field-half">
                        <label>Duration</label>
                        <input type="number" min={0} value={config.duration} onChange={(e) => onChange({ duration: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="utility-config-field utility-config-field-half">
                        <label>Unit</label>
                        <div className="utility-config-select-wrapper">
                            <select value={config.unit} onChange={(e) => onChange({ unit: e.target.value as any })}>
                                {TIME_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                            </select>
                            <ChevronDown size={16} className="select-icon" />
                        </div>
                    </div>
                </div>
            )}
            {config.delayType === 'dynamic' && (
                <div className="utility-config-field">
                    <label>Duration Field</label>
                    <input type="text" value={config.dynamicField || ''} onChange={(e) => onChange({ dynamicField: e.target.value })} placeholder="{{lastNodeOutput.waitTime}}" />
                </div>
            )}
            {config.delayType === 'schedule' && (
                <div className="utility-config-field">
                    <label>Resume At (ISO 8601)</label>
                    <input type="text" value={config.scheduleTime || ''} onChange={(e) => onChange({ scheduleTime: e.target.value })} placeholder="{{lastNodeOutput.resumeAt}} or 2026-01-27T09:00:00Z" />
                </div>
            )}
        </div>
    );
}

// ============================================================================
// HUMAN REVIEW CONFIG
// ============================================================================

function HumanReviewConfig({ config, onChange }: { config: UtilityConfigEntry; onChange: (u: Partial<UtilityConfigEntry>) => void }) {
    const [newApprover, setNewApprover] = useState('');
    const addApprover = () => { if (newApprover.trim()) { onChange({ approvers: [...(config.approvers || []), newApprover.trim()] }); setNewApprover(''); } };

    return (
        <div className="utility-config-section">
            <div className="utility-config-section-title">Review Type</div>
            <div className="utility-config-mode-grid">
                {REVIEW_TYPES.map(r => (
                    <button key={r.value} type="button" className={`utility-config-mode-btn ${config.reviewType === r.value ? 'active' : ''}`} onClick={() => onChange({ reviewType: r.value as any })}>
                        <span className="mode-label">{r.label}</span>
                        <span className="mode-desc">{r.description}</span>
                    </button>
                ))}
            </div>
            <div className="utility-config-field">
                <label>Review Title</label>
                <input type="text" value={config.reviewTitle || ''} onChange={(e) => onChange({ reviewTitle: e.target.value })} placeholder="Content Approval Required" />
            </div>
            <div className="utility-config-field">
                <label>Instructions</label>
                <textarea value={config.reviewInstructions || ''} onChange={(e) => onChange({ reviewInstructions: e.target.value })} rows={2} placeholder="Please review the generated content..." />
            </div>
            <div className="utility-config-field">
                <label>Approvers (emails)</label>
                <div className="utility-config-tag-input">
                    <input type="text" value={newApprover} onChange={(e) => setNewApprover(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addApprover()} placeholder="Add approver email..." />
                    <button type="button" onClick={addApprover}><Plus size={16} /></button>
                </div>
                <div className="utility-config-tags">
                    {(config.approvers || []).map((a, i) => (
                        <span key={i} className="utility-config-tag approver">{a}<button type="button" onClick={() => onChange({ approvers: config.approvers?.filter((_, idx) => idx !== i) })}><Trash2 size={12} /></button></span>
                    ))}
                </div>
            </div>
            <div className="utility-config-row">
                <div className="utility-config-field utility-config-field-half">
                    <label>Timeout (ms)</label>
                    <input type="number" min={0} value={config.timeout} onChange={(e) => onChange({ timeout: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="utility-config-field utility-config-field-half">
                    <label>Timeout Action</label>
                    <div className="utility-config-select-wrapper">
                        <select value={config.timeoutAction} onChange={(e) => onChange({ timeoutAction: e.target.value as any })}>
                            {TIMEOUT_ACTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>
            </div>
            <div className="utility-config-field utility-config-field-inline">
                <label><input type="checkbox" checked={config.allowEdit} onChange={(e) => onChange({ allowEdit: e.target.checked })} /> Allow Content Editing</label>
            </div>
        </div>
    );
}

// ============================================================================
// ERROR HANDLER CONFIG
// ============================================================================

function ErrorHandlerConfig({ config, onChange }: { config: UtilityConfigEntry; onChange: (u: Partial<UtilityConfigEntry>) => void }) {
    return (
        <div className="utility-config-section">
            <div className="utility-config-section-title">Error Catching</div>
            <div className="utility-config-field utility-config-field-inline">
                <label><input type="checkbox" checked={config.catchAll} onChange={(e) => onChange({ catchAll: e.target.checked })} /> Catch All Errors</label>
            </div>
            <div className="utility-config-section-title">Retry Logic</div>
            <div className="utility-config-row">
                <div className="utility-config-field utility-config-field-third">
                    <label>Retry Count</label>
                    <input type="number" min={0} max={10} value={config.retryCount} onChange={(e) => onChange({ retryCount: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="utility-config-field utility-config-field-third">
                    <label>Retry Delay (ms)</label>
                    <input type="number" min={0} value={config.retryDelay} onChange={(e) => onChange({ retryDelay: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="utility-config-field utility-config-field-third">
                    <label>Backoff</label>
                    <div className="utility-config-select-wrapper">
                        <select value={config.retryBackoff} onChange={(e) => onChange({ retryBackoff: e.target.value as any })}>
                            {RETRY_BACKOFFS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>
            </div>
            <div className="utility-config-field">
                <label>Fallback Value (JSON)</label>
                <textarea value={config.fallbackValue || ''} onChange={(e) => onChange({ fallbackValue: e.target.value })} rows={2} placeholder='{"status": "error", "message": "Operation failed"}' className="utility-config-code" />
            </div>
        </div>
    );
}

// ============================================================================
// SPLIT CONFIG
// ============================================================================

function SplitConfig({ config, onChange }: { config: UtilityConfigEntry; onChange: (u: Partial<UtilityConfigEntry>) => void }) {
    const updateBranchName = (index: number, name: string) => {
        const names = [...(config.branchNames || [])];
        names[index] = name;
        onChange({ branchNames: names });
    };

    return (
        <div className="utility-config-section">
            <div className="utility-config-section-title">Parallel Branches</div>
            <div className="utility-config-field">
                <label>Number of Branches</label>
                <input type="number" min={2} max={10} value={config.branchCount} onChange={(e) => onChange({ branchCount: parseInt(e.target.value) || 2 })} />
            </div>
            <div className="utility-config-field utility-config-field-inline">
                <label><input type="checkbox" checked={config.cloneInput} onChange={(e) => onChange({ cloneInput: e.target.checked })} /> Clone Input to Each Branch</label>
            </div>
            <div className="utility-config-section-title">Branch Names (optional)</div>
            <div className="utility-config-branch-list">
                {Array.from({ length: config.branchCount || 2 }).map((_, i) => (
                    <div key={i} className="utility-config-branch-row">
                        <span className="branch-number">{i + 1}</span>
                        <input
                            type="text"
                            value={(config.branchNames || [])[i] || ''}
                            onChange={(e) => updateBranchName(i, e.target.value)}
                            placeholder={`Branch ${i + 1}`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default UtilityConfig;
