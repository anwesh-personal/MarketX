/**
 * VALIDATOR CONFIG COMPONENT
 * Configuration forms for validator nodes (quality, constitution, intent)
 * 
 * EXTENDS AIConfig with validation-specific options
 * 
 * DESIGN PRINCIPLES:
 * - Theme-aware using CSS variables only
 * - No hardcoded colors or sizes
 * - Proper TypeScript types throughout
 * - Dynamic forms based on validator type
 * 
 * @author Axiom AI
 */

import React, { useState, useCallback } from 'react';
import {
    CheckCircle, Shield, Search,
    ChevronDown, Plus, Trash2, AlertTriangle, Sparkles,
    ThumbsUp, ThumbsDown, RotateCcw, XCircle
} from 'lucide-react';
import { AIConfig } from './AIConfig';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidatorConfigEntry {
    // AI Config (handled by AIConfig component)
    aiConfig?: any[];
    systemPrompt?: string;

    // Common fields
    passThreshold?: number;
    failAction?: 'stop' | 'warn' | 'skip' | 'retry';
    retryCount?: number;
    logResults?: boolean;

    // Quality validation specific
    checkGrammar?: boolean;
    checkReadability?: boolean;
    checkBrandVoice?: boolean;
    minReadabilityScore?: number;
    targetGradeLevel?: number;
    customChecks?: CustomCheck[];

    // Constitution validation specific
    constitutionId?: string;
    strictMode?: boolean;
    checkForbiddenTerms?: boolean;
    checkRequiredElements?: boolean;
    checkToneGuidelines?: boolean;
    forbiddenTermsList?: string[];
    requiredElementsList?: string[];

    // Intent analysis specific
    intentCategories?: string[];
    minConfidence?: number;
    extractEntities?: boolean;
    entityTypes?: string[];
    fallbackIntent?: string;
}

interface CustomCheck {
    id: string;
    name: string;
    description: string;
    type: 'contains' | 'not_contains' | 'regex' | 'length' | 'custom';
    value: string;
    weight: number;
}

interface ValidatorConfigProps {
    nodeType: string;
    config: ValidatorConfigEntry;
    onChange: (config: ValidatorConfigEntry) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FAIL_ACTIONS = [
    { value: 'stop', label: 'Stop Workflow', icon: XCircle, description: 'Halt execution immediately' },
    { value: 'warn', label: 'Warn & Continue', icon: AlertTriangle, description: 'Log warning, proceed anyway' },
    { value: 'skip', label: 'Skip Node', icon: RotateCcw, description: 'Skip this node, continue flow' },
    { value: 'retry', label: 'Retry Generation', icon: RotateCcw, description: 'Retry previous AI generation' },
];

const GRADE_LEVELS = [
    { value: 5, label: 'Grade 5 (Age 10-11)' },
    { value: 6, label: 'Grade 6 (Age 11-12)' },
    { value: 7, label: 'Grade 7 (Age 12-13)' },
    { value: 8, label: 'Grade 8 (Age 13-14)' },
    { value: 9, label: 'Grade 9 (Age 14-15)' },
    { value: 10, label: 'Grade 10 (Age 15-16)' },
    { value: 11, label: 'Grade 11 (Age 16-17)' },
    { value: 12, label: 'Grade 12 (Age 17-18)' },
    { value: 13, label: 'College Level' },
];

const CHECK_TYPES = [
    { value: 'contains', label: 'Contains Text' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'regex', label: 'Regex Pattern' },
    { value: 'length', label: 'Min/Max Length' },
    { value: 'custom', label: 'Custom AI Check' },
];

const DEFAULT_INTENTS = [
    'inquiry',
    'complaint',
    'purchase_intent',
    'support_request',
    'feedback',
    'scheduling',
    'pricing_question',
    'feature_request',
    'cancellation',
    'other',
];

const ENTITY_TYPES = [
    { value: 'person', label: 'Person Name' },
    { value: 'company', label: 'Company Name' },
    { value: 'email', label: 'Email Address' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'date', label: 'Date/Time' },
    { value: 'money', label: 'Money/Price' },
    { value: 'product', label: 'Product Name' },
    { value: 'location', label: 'Location' },
];

// ============================================================================
// VALIDATOR CONFIG COMPONENT
// ============================================================================

export function ValidatorConfig({ nodeType, config, onChange }: ValidatorConfigProps) {
    const safeConfig: ValidatorConfigEntry = {
        ...config,
        passThreshold: config.passThreshold ?? 70,
        failAction: config.failAction || 'warn',
        retryCount: config.retryCount ?? 2,
        logResults: config.logResults ?? true,
        // Quality defaults
        checkGrammar: config.checkGrammar ?? true,
        checkReadability: config.checkReadability ?? true,
        checkBrandVoice: config.checkBrandVoice ?? false,
        minReadabilityScore: config.minReadabilityScore ?? 60,
        targetGradeLevel: config.targetGradeLevel ?? 8,
        customChecks: config.customChecks || [],
        // Constitution defaults
        strictMode: config.strictMode ?? false,
        checkForbiddenTerms: config.checkForbiddenTerms ?? true,
        checkRequiredElements: config.checkRequiredElements ?? true,
        checkToneGuidelines: config.checkToneGuidelines ?? true,
        forbiddenTermsList: config.forbiddenTermsList || [],
        requiredElementsList: config.requiredElementsList || [],
        // Intent defaults
        intentCategories: config.intentCategories || DEFAULT_INTENTS.slice(0, 5),
        minConfidence: config.minConfidence ?? 0.7,
        extractEntities: config.extractEntities ?? true,
        entityTypes: config.entityTypes || ['person', 'company', 'email'],
        fallbackIntent: config.fallbackIntent || 'other',
    };

    const updateConfig = useCallback((updates: Partial<ValidatorConfigEntry>) => {
        onChange({ ...safeConfig, ...updates });
    }, [safeConfig, onChange]);

    const getValidatorIcon = () => {
        switch (nodeType) {
            case 'validate-quality': return CheckCircle;
            case 'validate-constitution': return Shield;
            case 'analyze-intent': return Search;
            default: return Sparkles;
        }
    };

    const Icon = getValidatorIcon();

    return (
        <div className="validator-config">
            {/* Header */}
            <div className="validator-config-header">
                <Icon size={18} className="validator-config-icon" />
                <span>Validator Configuration</span>
            </div>

            {/* AI Config - Validators use AI */}
            <div className="validator-config-ai-section">
                <AIConfig
                    config={safeConfig.aiConfig || []}
                    onChange={(aiConfig) => updateConfig({ aiConfig })}
                    systemPrompt={safeConfig.systemPrompt || ''}
                    onSystemPromptChange={(systemPrompt) => updateConfig({ systemPrompt })}
                    systemPromptLabel={
                        nodeType === 'validate-quality' ? 'Quality Criteria' :
                            nodeType === 'validate-constitution' ? 'Compliance Rules' :
                                'Intent Classification Criteria'
                    }
                />
            </div>

            {/* Common Settings */}
            <div className="validator-config-section">
                <div className="validator-config-section-title">Pass/Fail Settings</div>

                <div className="validator-config-row">
                    <div className="validator-config-field validator-config-field-half">
                        <label>Pass Threshold (%)</label>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={safeConfig.passThreshold}
                            onChange={(e) => updateConfig({ passThreshold: parseInt(e.target.value) || 0 })}
                        />
                    </div>

                    <div className="validator-config-field validator-config-field-half validator-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={safeConfig.logResults}
                                onChange={(e) => updateConfig({ logResults: e.target.checked })}
                            />
                            Log Validation Results
                        </label>
                    </div>
                </div>

                <div className="validator-config-field">
                    <label>On Validation Failure</label>
                    <div className="validator-config-action-grid">
                        {FAIL_ACTIONS.map(action => (
                            <button
                                key={action.value}
                                type="button"
                                className={`validator-config-action-btn ${safeConfig.failAction === action.value ? 'active' : ''}`}
                                onClick={() => updateConfig({ failAction: action.value as any })}
                            >
                                <action.icon size={18} />
                                <span className="action-label">{action.label}</span>
                                <span className="action-desc">{action.description}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {safeConfig.failAction === 'retry' && (
                    <div className="validator-config-field">
                        <label>Max Retry Attempts</label>
                        <input
                            type="number"
                            min={1}
                            max={5}
                            value={safeConfig.retryCount}
                            onChange={(e) => updateConfig({ retryCount: parseInt(e.target.value) || 2 })}
                        />
                    </div>
                )}
            </div>

            {/* Type-specific Settings */}
            {nodeType === 'validate-quality' && (
                <QualityConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'validate-constitution' && (
                <ConstitutionConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'analyze-intent' && (
                <IntentConfig config={safeConfig} onChange={updateConfig} />
            )}
        </div>
    );
}

// ============================================================================
// QUALITY CONFIG
// ============================================================================

function QualityConfig({ config, onChange }: {
    config: ValidatorConfigEntry;
    onChange: (updates: Partial<ValidatorConfigEntry>) => void;
}) {
    const checks = config.customChecks || [];

    const addCheck = () => {
        const newCheck: CustomCheck = {
            id: `check-${Date.now()}`,
            name: `Check ${checks.length + 1}`,
            description: '',
            type: 'contains',
            value: '',
            weight: 1,
        };
        onChange({ customChecks: [...checks, newCheck] });
    };

    const updateCheck = (id: string, updates: Partial<CustomCheck>) => {
        const updated = checks.map(c =>
            c.id === id ? { ...c, ...updates } : c
        );
        onChange({ customChecks: updated });
    };

    const removeCheck = (id: string) => {
        onChange({ customChecks: checks.filter(c => c.id !== id) });
    };

    return (
        <>
            <div className="validator-config-section">
                <div className="validator-config-section-title">Quality Checks</div>

                <div className="validator-config-checks-grid">
                    <label className="validator-config-check-item">
                        <input
                            type="checkbox"
                            checked={config.checkGrammar}
                            onChange={(e) => onChange({ checkGrammar: e.target.checked })}
                        />
                        <div className="check-content">
                            <span className="check-label">Grammar & Spelling</span>
                            <span className="check-desc">Check for grammatical errors and typos</span>
                        </div>
                    </label>

                    <label className="validator-config-check-item">
                        <input
                            type="checkbox"
                            checked={config.checkReadability}
                            onChange={(e) => onChange({ checkReadability: e.target.checked })}
                        />
                        <div className="check-content">
                            <span className="check-label">Readability</span>
                            <span className="check-desc">Ensure content is easy to read</span>
                        </div>
                    </label>

                    <label className="validator-config-check-item">
                        <input
                            type="checkbox"
                            checked={config.checkBrandVoice}
                            onChange={(e) => onChange({ checkBrandVoice: e.target.checked })}
                        />
                        <div className="check-content">
                            <span className="check-label">Brand Voice</span>
                            <span className="check-desc">Match content to brand guidelines</span>
                        </div>
                    </label>
                </div>

                {config.checkReadability && (
                    <div className="validator-config-row">
                        <div className="validator-config-field validator-config-field-half">
                            <label>Min Readability Score</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={config.minReadabilityScore}
                                onChange={(e) => onChange({ minReadabilityScore: parseInt(e.target.value) || 60 })}
                            />
                        </div>

                        <div className="validator-config-field validator-config-field-half">
                            <label>Target Grade Level</label>
                            <div className="validator-config-select-wrapper">
                                <select
                                    value={config.targetGradeLevel}
                                    onChange={(e) => onChange({ targetGradeLevel: parseInt(e.target.value) })}
                                >
                                    {GRADE_LEVELS.map(gl => (
                                        <option key={gl.value} value={gl.value}>
                                            {gl.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="select-icon" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="validator-config-section">
                <div className="validator-config-section-header">
                    <div className="validator-config-section-title">Custom Checks</div>
                    <button
                        type="button"
                        className="validator-config-add-btn"
                        onClick={addCheck}
                    >
                        <Plus size={14} />
                        Add Check
                    </button>
                </div>

                {checks.length === 0 && (
                    <div className="validator-config-empty">
                        No custom checks defined. Add checks to validate specific content rules.
                    </div>
                )}

                <div className="validator-config-checks-list">
                    {checks.map((check) => (
                        <div key={check.id} className="validator-config-check-row">
                            <input
                                type="text"
                                value={check.name}
                                onChange={(e) => updateCheck(check.id, { name: e.target.value })}
                                placeholder="Check name"
                                className="check-name"
                            />
                            <div className="validator-config-select-wrapper check-type">
                                <select
                                    value={check.type}
                                    onChange={(e) => updateCheck(check.id, { type: e.target.value as any })}
                                >
                                    {CHECK_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="select-icon" />
                            </div>
                            <input
                                type="text"
                                value={check.value}
                                onChange={(e) => updateCheck(check.id, { value: e.target.value })}
                                placeholder={check.type === 'regex' ? '/pattern/i' : 'Value...'}
                                className="check-value"
                            />
                            <button
                                type="button"
                                className="validator-config-remove-btn"
                                onClick={() => removeCheck(check.id)}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

// ============================================================================
// CONSTITUTION CONFIG
// ============================================================================

function ConstitutionConfig({ config, onChange }: {
    config: ValidatorConfigEntry;
    onChange: (updates: Partial<ValidatorConfigEntry>) => void;
}) {
    const [newForbiddenTerm, setNewForbiddenTerm] = useState('');
    const [newRequiredElement, setNewRequiredElement] = useState('');

    const addForbiddenTerm = () => {
        if (newForbiddenTerm.trim()) {
            onChange({
                forbiddenTermsList: [...(config.forbiddenTermsList || []), newForbiddenTerm.trim()]
            });
            setNewForbiddenTerm('');
        }
    };

    const removeForbiddenTerm = (term: string) => {
        onChange({
            forbiddenTermsList: (config.forbiddenTermsList || []).filter(t => t !== term)
        });
    };

    const addRequiredElement = () => {
        if (newRequiredElement.trim()) {
            onChange({
                requiredElementsList: [...(config.requiredElementsList || []), newRequiredElement.trim()]
            });
            setNewRequiredElement('');
        }
    };

    const removeRequiredElement = (element: string) => {
        onChange({
            requiredElementsList: (config.requiredElementsList || []).filter(e => e !== element)
        });
    };

    return (
        <>
            <div className="validator-config-section">
                <div className="validator-config-section-title">Constitution Settings</div>

                <div className="validator-config-field">
                    <label>Constitution / Guardrails ID</label>
                    <div className="validator-config-select-wrapper">
                        <select
                            value={config.constitutionId || ''}
                            onChange={(e) => onChange({ constitutionId: e.target.value })}
                        >
                            <option value="">Select a constitution...</option>
                            {/* In production, these would be fetched from KB */}
                            <option value="const-brand-voice">Brand Voice Guidelines</option>
                            <option value="const-legal-compliance">Legal Compliance</option>
                            <option value="const-marketing-ethics">Marketing Ethics</option>
                            <option value="const-industry-specific">Industry-Specific Rules</option>
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>

                <div className="validator-config-field validator-config-field-inline">
                    <label>
                        <input
                            type="checkbox"
                            checked={config.strictMode}
                            onChange={(e) => onChange({ strictMode: e.target.checked })}
                        />
                        Strict Mode (fail on any violation)
                    </label>
                </div>

                <div className="validator-config-checks-grid">
                    <label className="validator-config-check-item">
                        <input
                            type="checkbox"
                            checked={config.checkForbiddenTerms}
                            onChange={(e) => onChange({ checkForbiddenTerms: e.target.checked })}
                        />
                        <div className="check-content">
                            <span className="check-label">Forbidden Terms</span>
                            <span className="check-desc">Block banned words/phrases</span>
                        </div>
                    </label>

                    <label className="validator-config-check-item">
                        <input
                            type="checkbox"
                            checked={config.checkRequiredElements}
                            onChange={(e) => onChange({ checkRequiredElements: e.target.checked })}
                        />
                        <div className="check-content">
                            <span className="check-label">Required Elements</span>
                            <span className="check-desc">Ensure mandatory content</span>
                        </div>
                    </label>

                    <label className="validator-config-check-item">
                        <input
                            type="checkbox"
                            checked={config.checkToneGuidelines}
                            onChange={(e) => onChange({ checkToneGuidelines: e.target.checked })}
                        />
                        <div className="check-content">
                            <span className="check-label">Tone Guidelines</span>
                            <span className="check-desc">Validate brand tone</span>
                        </div>
                    </label>
                </div>
            </div>

            {/* Forbidden Terms */}
            {config.checkForbiddenTerms && (
                <div className="validator-config-section">
                    <div className="validator-config-section-title">Forbidden Terms</div>

                    <div className="validator-config-tag-input">
                        <input
                            type="text"
                            value={newForbiddenTerm}
                            onChange={(e) => setNewForbiddenTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addForbiddenTerm()}
                            placeholder="Add forbidden term..."
                        />
                        <button type="button" onClick={addForbiddenTerm}>
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="validator-config-tags">
                        {(config.forbiddenTermsList || []).map((term, i) => (
                            <span key={i} className="validator-config-tag forbidden">
                                {term}
                                <button type="button" onClick={() => removeForbiddenTerm(term)}>
                                    <XCircle size={14} />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Required Elements */}
            {config.checkRequiredElements && (
                <div className="validator-config-section">
                    <div className="validator-config-section-title">Required Elements</div>

                    <div className="validator-config-tag-input">
                        <input
                            type="text"
                            value={newRequiredElement}
                            onChange={(e) => setNewRequiredElement(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addRequiredElement()}
                            placeholder="Add required element..."
                        />
                        <button type="button" onClick={addRequiredElement}>
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="validator-config-tags">
                        {(config.requiredElementsList || []).map((element, i) => (
                            <span key={i} className="validator-config-tag required">
                                {element}
                                <button type="button" onClick={() => removeRequiredElement(element)}>
                                    <XCircle size={14} />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

// ============================================================================
// INTENT CONFIG
// ============================================================================

function IntentConfig({ config, onChange }: {
    config: ValidatorConfigEntry;
    onChange: (updates: Partial<ValidatorConfigEntry>) => void;
}) {
    const [newIntent, setNewIntent] = useState('');

    const toggleIntent = (intent: string) => {
        const current = config.intentCategories || [];
        const updated = current.includes(intent)
            ? current.filter(i => i !== intent)
            : [...current, intent];
        onChange({ intentCategories: updated });
    };

    const addCustomIntent = () => {
        if (newIntent.trim() && !(config.intentCategories || []).includes(newIntent.trim())) {
            onChange({
                intentCategories: [...(config.intentCategories || []), newIntent.trim().toLowerCase().replace(/\s+/g, '_')]
            });
            setNewIntent('');
        }
    };

    const toggleEntityType = (entityType: string) => {
        const current = config.entityTypes || [];
        const updated = current.includes(entityType)
            ? current.filter(e => e !== entityType)
            : [...current, entityType];
        onChange({ entityTypes: updated });
    };

    return (
        <>
            <div className="validator-config-section">
                <div className="validator-config-section-title">Intent Categories</div>

                <div className="validator-config-intents-grid">
                    {DEFAULT_INTENTS.map(intent => (
                        <label key={intent} className={`validator-config-intent-item ${(config.intentCategories || []).includes(intent) ? 'active' : ''}`}>
                            <input
                                type="checkbox"
                                checked={(config.intentCategories || []).includes(intent)}
                                onChange={() => toggleIntent(intent)}
                            />
                            {intent.replace(/_/g, ' ')}
                        </label>
                    ))}
                </div>

                <div className="validator-config-tag-input">
                    <input
                        type="text"
                        value={newIntent}
                        onChange={(e) => setNewIntent(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomIntent()}
                        placeholder="Add custom intent..."
                    />
                    <button type="button" onClick={addCustomIntent}>
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <div className="validator-config-section">
                <div className="validator-config-section-title">Confidence Settings</div>

                <div className="validator-config-row">
                    <div className="validator-config-field validator-config-field-half">
                        <label>Min Confidence (%)</label>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={Math.round((config.minConfidence || 0.7) * 100)}
                            onChange={(e) => onChange({ minConfidence: (parseInt(e.target.value) || 70) / 100 })}
                        />
                    </div>

                    <div className="validator-config-field validator-config-field-half">
                        <label>Fallback Intent</label>
                        <div className="validator-config-select-wrapper">
                            <select
                                value={config.fallbackIntent}
                                onChange={(e) => onChange({ fallbackIntent: e.target.value })}
                            >
                                {(config.intentCategories || DEFAULT_INTENTS).map(intent => (
                                    <option key={intent} value={intent}>
                                        {intent.replace(/_/g, ' ')}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="select-icon" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="validator-config-section">
                <div className="validator-config-section-title">Entity Extraction</div>

                <div className="validator-config-field validator-config-field-inline">
                    <label>
                        <input
                            type="checkbox"
                            checked={config.extractEntities}
                            onChange={(e) => onChange({ extractEntities: e.target.checked })}
                        />
                        Extract Named Entities
                    </label>
                </div>

                {config.extractEntities && (
                    <div className="validator-config-checkbox-grid">
                        {ENTITY_TYPES.map(entity => (
                            <label key={entity.value} className="validator-config-checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={(config.entityTypes || []).includes(entity.value)}
                                    onChange={() => toggleEntityType(entity.value)}
                                />
                                {entity.label}
                            </label>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

export default ValidatorConfig;
