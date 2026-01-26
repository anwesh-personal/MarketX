/**
 * TRANSFORM CONFIG COMPONENT
 * Configuration forms for transform nodes (locker, format, personalize)
 * 
 * PRODUCTION-READY with full field configuration
 * 
 * DESIGN PRINCIPLES:
 * - Theme-aware using CSS variables only
 * - No hardcoded colors or sizes
 * - Proper TypeScript types throughout
 * - Dynamic forms based on transform type
 * 
 * @author Axiom AI
 */

import React, { useState, useCallback } from 'react';
import {
    Lock, RefreshCw, UserCog,
    ChevronDown, Plus, Trash2, Mail, Share2, CreditCard,
    Type, Code, FileText, FileJson, Eye, EyeOff, Zap,
    User, Building, Calendar, Hash, AtSign, Globe
} from 'lucide-react';
import { AIConfig } from './AIConfig';

// ============================================================================
// TYPES
// ============================================================================

export interface TransformConfigEntry {
    // AI Config (for personalize which may use AI)
    aiConfig?: any[];
    systemPrompt?: string;

    // Common fields
    enabled?: boolean;
    preserveOriginal?: boolean;
    onError?: 'stop' | 'warn' | 'skip';

    // Content Locker specific
    unlockMethod?: 'email_capture' | 'social_share' | 'payment' | 'code';
    lockerStyle?: 'overlay' | 'inline' | 'blur' | 'hidden';
    gatePercentage?: number;
    lockerTitle?: string;
    lockerDescription?: string;
    emailCapture?: {
        collectName?: boolean;
        collectCompany?: boolean;
        requireVerification?: boolean;
        subscribeToList?: string;
    };
    socialShare?: {
        platforms?: string[];
        shareMessage?: string;
        shareUrl?: string;
    };
    payment?: {
        amount?: number;
        currency?: string;
        provider?: 'stripe' | 'paddle' | 'lemonsqueezy';
        productId?: string;
    };
    unlockCode?: {
        codes?: string[];
        caseSensitive?: boolean;
        singleUse?: boolean;
    };

    // Format Converter specific
    inputFormat?: 'auto' | 'markdown' | 'html' | 'text' | 'json';
    outputFormat?: 'markdown' | 'html' | 'text' | 'json' | 'pdf';
    formatOptions?: {
        preserveLineBreaks?: boolean;
        sanitizeHtml?: boolean;
        syntaxHighlight?: boolean;
        tableOfContents?: boolean;
        inlineStyles?: boolean;
        minifyOutput?: boolean;
    };
    pdfOptions?: {
        pageSize?: 'a4' | 'letter' | 'legal';
        orientation?: 'portrait' | 'landscape';
        margins?: 'normal' | 'narrow' | 'wide';
        headerHtml?: string;
        footerHtml?: string;
        includePageNumbers?: boolean;
    };

    // Personalizer specific
    personalizationMode?: 'replace' | 'ai_enhance' | 'hybrid';
    variableMappings?: VariableMapping[];
    fallbackBehavior?: 'remove' | 'placeholder' | 'default' | 'error';
    fallbackDefaults?: Record<string, string>;
    detectVariables?: boolean;
    customVariablePattern?: string;
}

interface VariableMapping {
    id: string;
    variableName: string;
    sourceField: string;
    fallbackValue: string;
    transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize' | 'title_case';
}

interface TransformConfigProps {
    nodeType: string;
    config: TransformConfigEntry;
    onChange: (config: TransformConfigEntry) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ERROR_ACTIONS = [
    { value: 'stop', label: 'Stop Workflow' },
    { value: 'warn', label: 'Warn & Continue' },
    { value: 'skip', label: 'Skip Transform' },
];

const UNLOCK_METHODS = [
    { value: 'email_capture', label: 'Email Capture', icon: Mail, description: 'Collect email to unlock' },
    { value: 'social_share', label: 'Social Share', icon: Share2, description: 'Share to unlock' },
    { value: 'payment', label: 'Payment', icon: CreditCard, description: 'Pay to unlock' },
    { value: 'code', label: 'Access Code', icon: Lock, description: 'Enter code to unlock' },
];

const LOCKER_STYLES = [
    { value: 'overlay', label: 'Overlay', description: 'Modal popup over content' },
    { value: 'inline', label: 'Inline', description: 'Form replaces locked content' },
    { value: 'blur', label: 'Blur', description: 'Blur locked content, reveal on unlock' },
    { value: 'hidden', label: 'Hidden', description: 'Completely hide until unlock' },
];

const SOCIAL_PLATFORMS = [
    { value: 'twitter', label: 'Twitter/X' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'telegram', label: 'Telegram' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'email', label: 'Email Share' },
];

const PAYMENT_PROVIDERS = [
    { value: 'stripe', label: 'Stripe', description: 'Full-featured payments' },
    { value: 'paddle', label: 'Paddle', description: 'MoR included' },
    { value: 'lemonsqueezy', label: 'Lemon Squeezy', description: 'Creator-focused' },
];

const CURRENCIES = [
    { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
    { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
    { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
    { value: 'INR', label: 'INR - Indian Rupee', symbol: '₹' },
];

const INPUT_FORMATS = [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'html', label: 'HTML' },
    { value: 'text', label: 'Plain Text' },
    { value: 'json', label: 'JSON' },
];

const OUTPUT_FORMATS = [
    { value: 'markdown', label: 'Markdown', icon: Type },
    { value: 'html', label: 'HTML', icon: Code },
    { value: 'text', label: 'Plain Text', icon: FileText },
    { value: 'json', label: 'JSON', icon: FileJson },
    { value: 'pdf', label: 'PDF', icon: FileText },
];

const PAGE_SIZES = [
    { value: 'a4', label: 'A4' },
    { value: 'letter', label: 'US Letter' },
    { value: 'legal', label: 'US Legal' },
];

const PDF_ORIENTATIONS = [
    { value: 'portrait', label: 'Portrait' },
    { value: 'landscape', label: 'Landscape' },
];

const PDF_MARGINS = [
    { value: 'normal', label: 'Normal' },
    { value: 'narrow', label: 'Narrow' },
    { value: 'wide', label: 'Wide' },
];

const PERSONALIZATION_MODES = [
    { value: 'replace', label: 'Simple Replace', description: 'Direct variable substitution' },
    { value: 'ai_enhance', label: 'AI Enhanced', description: 'AI rewrites with personalization' },
    { value: 'hybrid', label: 'Hybrid', description: 'Replace + AI polish' },
];

const FALLBACK_BEHAVIORS = [
    { value: 'remove', label: 'Remove Variable', description: 'Delete the variable placeholder' },
    { value: 'placeholder', label: 'Keep Placeholder', description: 'Leave {{variable}} as-is' },
    { value: 'default', label: 'Use Default', description: 'Replace with fallback value' },
    { value: 'error', label: 'Throw Error', description: 'Stop if variable missing' },
];

const VARIABLE_TRANSFORMS = [
    { value: 'none', label: 'None' },
    { value: 'uppercase', label: 'UPPERCASE' },
    { value: 'lowercase', label: 'lowercase' },
    { value: 'capitalize', label: 'Capitalize' },
    { value: 'title_case', label: 'Title Case' },
];

const COMMON_VARIABLES = [
    { name: 'firstName', icon: User, label: 'First Name' },
    { name: 'lastName', icon: User, label: 'Last Name' },
    { name: 'fullName', icon: User, label: 'Full Name' },
    { name: 'email', icon: AtSign, label: 'Email' },
    { name: 'company', icon: Building, label: 'Company' },
    { name: 'jobTitle', icon: User, label: 'Job Title' },
    { name: 'website', icon: Globe, label: 'Website' },
    { name: 'date', icon: Calendar, label: 'Current Date' },
];

// ============================================================================
// TRANSFORM CONFIG COMPONENT
// ============================================================================

export function TransformConfig({ nodeType, config, onChange }: TransformConfigProps) {
    const safeConfig: TransformConfigEntry = {
        ...config,
        enabled: config.enabled ?? true,
        preserveOriginal: config.preserveOriginal ?? false,
        onError: config.onError || 'warn',
        // Locker defaults
        unlockMethod: config.unlockMethod || 'email_capture',
        lockerStyle: config.lockerStyle || 'overlay',
        gatePercentage: config.gatePercentage ?? 50,
        emailCapture: config.emailCapture || {
            collectName: true,
            collectCompany: false,
            requireVerification: false,
        },
        socialShare: config.socialShare || {
            platforms: ['twitter', 'linkedin'],
        },
        payment: config.payment || {
            currency: 'USD',
            provider: 'stripe',
        },
        unlockCode: config.unlockCode || {
            codes: [],
            caseSensitive: false,
            singleUse: false,
        },
        // Format defaults
        inputFormat: config.inputFormat || 'auto',
        outputFormat: config.outputFormat || 'html',
        formatOptions: config.formatOptions || {
            preserveLineBreaks: true,
            sanitizeHtml: true,
        },
        pdfOptions: config.pdfOptions || {
            pageSize: 'a4',
            orientation: 'portrait',
            margins: 'normal',
            includePageNumbers: true,
        },
        // Personalize defaults
        personalizationMode: config.personalizationMode || 'replace',
        variableMappings: config.variableMappings || [],
        fallbackBehavior: config.fallbackBehavior || 'default',
        fallbackDefaults: config.fallbackDefaults || {},
        detectVariables: config.detectVariables ?? true,
    };

    const updateConfig = useCallback((updates: Partial<TransformConfigEntry>) => {
        onChange({ ...safeConfig, ...updates });
    }, [safeConfig, onChange]);

    const getTransformIcon = () => {
        switch (nodeType) {
            case 'transform-locker': return Lock;
            case 'transform-format': return RefreshCw;
            case 'transform-personalize': return UserCog;
            default: return Zap;
        }
    };

    const Icon = getTransformIcon();
    const requiresAI = nodeType === 'transform-personalize' && safeConfig.personalizationMode !== 'replace';

    return (
        <div className="transform-config">
            {/* Header */}
            <div className="transform-config-header">
                <Icon size={18} className="transform-config-icon" />
                <span>Transform Configuration</span>
            </div>

            {/* AI Config for AI-powered personalization */}
            {requiresAI && (
                <div className="transform-config-ai-section">
                    <AIConfig
                        config={safeConfig.aiConfig || []}
                        onChange={(aiConfig) => updateConfig({ aiConfig })}
                        systemPrompt={safeConfig.systemPrompt || ''}
                        onSystemPromptChange={(systemPrompt) => updateConfig({ systemPrompt })}
                        systemPromptLabel="Personalization Instructions"
                    />
                </div>
            )}

            {/* Common Settings */}
            <div className="transform-config-section">
                <div className="transform-config-section-title">General Settings</div>

                <div className="transform-config-row">
                    <div className="transform-config-field transform-config-field-half transform-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={safeConfig.enabled}
                                onChange={(e) => updateConfig({ enabled: e.target.checked })}
                            />
                            Transform Enabled
                        </label>
                    </div>

                    <div className="transform-config-field transform-config-field-half transform-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={safeConfig.preserveOriginal}
                                onChange={(e) => updateConfig({ preserveOriginal: e.target.checked })}
                            />
                            Preserve Original Content
                        </label>
                    </div>
                </div>

                <div className="transform-config-field">
                    <label>On Error</label>
                    <div className="transform-config-select-wrapper">
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

            {/* Type-specific Settings */}
            {nodeType === 'transform-locker' && (
                <LockerConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'transform-format' && (
                <FormatConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'transform-personalize' && (
                <PersonalizeConfig config={safeConfig} onChange={updateConfig} />
            )}
        </div>
    );
}

// ============================================================================
// LOCKER CONFIG
// ============================================================================

function LockerConfig({ config, onChange }: {
    config: TransformConfigEntry;
    onChange: (updates: Partial<TransformConfigEntry>) => void;
}) {
    const [newCode, setNewCode] = useState('');
    const emailCapture = config.emailCapture || {};
    const socialShare = config.socialShare || {};
    const payment = config.payment || {};
    const unlockCode = config.unlockCode || {};

    const updateEmailCapture = (updates: Partial<typeof emailCapture>) => {
        onChange({ emailCapture: { ...emailCapture, ...updates } });
    };

    const updateSocialShare = (updates: Partial<typeof socialShare>) => {
        onChange({ socialShare: { ...socialShare, ...updates } });
    };

    const updatePayment = (updates: Partial<typeof payment>) => {
        onChange({ payment: { ...payment, ...updates } });
    };

    const updateUnlockCode = (updates: Partial<typeof unlockCode>) => {
        onChange({ unlockCode: { ...unlockCode, ...updates } });
    };

    const togglePlatform = (platform: string) => {
        const current = socialShare.platforms || [];
        const updated = current.includes(platform)
            ? current.filter(p => p !== platform)
            : [...current, platform];
        updateSocialShare({ platforms: updated });
    };

    const addCode = () => {
        if (newCode.trim()) {
            updateUnlockCode({ codes: [...(unlockCode.codes || []), newCode.trim()] });
            setNewCode('');
        }
    };

    return (
        <>
            <div className="transform-config-section">
                <div className="transform-config-section-title">Unlock Method</div>

                <div className="transform-config-unlock-grid">
                    {UNLOCK_METHODS.map(method => {
                        const MethodIcon = method.icon;
                        return (
                            <button
                                key={method.value}
                                type="button"
                                className={`transform-config-unlock-btn ${config.unlockMethod === method.value ? 'active' : ''}`}
                                onClick={() => onChange({ unlockMethod: method.value as any })}
                            >
                                <MethodIcon size={20} />
                                <span className="unlock-label">{method.label}</span>
                                <span className="unlock-desc">{method.description}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="transform-config-section">
                <div className="transform-config-section-title">Locker Appearance</div>

                <div className="transform-config-field">
                    <label>Lock Style</label>
                    <div className="transform-config-style-grid">
                        {LOCKER_STYLES.map(style => (
                            <button
                                key={style.value}
                                type="button"
                                className={`transform-config-style-btn ${config.lockerStyle === style.value ? 'active' : ''}`}
                                onClick={() => onChange({ lockerStyle: style.value as any })}
                            >
                                <span className="style-label">{style.label}</span>
                                <span className="style-desc">{style.description}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="transform-config-field">
                    <label>Content to Lock (%)</label>
                    <div className="transform-config-slider-wrapper">
                        <input
                            type="range"
                            min={10}
                            max={100}
                            step={10}
                            value={config.gatePercentage}
                            onChange={(e) => onChange({ gatePercentage: parseInt(e.target.value) })}
                        />
                        <span className="slider-value">{config.gatePercentage}%</span>
                    </div>
                    <div className="transform-config-hint">
                        First {100 - (config.gatePercentage || 50)}% shown free, rest locked
                    </div>
                </div>

                <div className="transform-config-field">
                    <label>Locker Title</label>
                    <input
                        type="text"
                        value={config.lockerTitle || ''}
                        onChange={(e) => onChange({ lockerTitle: e.target.value })}
                        placeholder="🔒 Unlock Premium Content"
                    />
                </div>

                <div className="transform-config-field">
                    <label>Locker Description</label>
                    <textarea
                        value={config.lockerDescription || ''}
                        onChange={(e) => onChange({ lockerDescription: e.target.value })}
                        rows={2}
                        placeholder="Enter your email to access the full content"
                    />
                </div>
            </div>

            {/* Email Capture Options */}
            {config.unlockMethod === 'email_capture' && (
                <div className="transform-config-section">
                    <div className="transform-config-section-title">Email Capture Settings</div>

                    <div className="transform-config-checkbox-grid">
                        <label className="transform-config-checkbox-item">
                            <input
                                type="checkbox"
                                checked={emailCapture.collectName}
                                onChange={(e) => updateEmailCapture({ collectName: e.target.checked })}
                            />
                            Collect Name
                        </label>

                        <label className="transform-config-checkbox-item">
                            <input
                                type="checkbox"
                                checked={emailCapture.collectCompany}
                                onChange={(e) => updateEmailCapture({ collectCompany: e.target.checked })}
                            />
                            Collect Company
                        </label>

                        <label className="transform-config-checkbox-item">
                            <input
                                type="checkbox"
                                checked={emailCapture.requireVerification}
                                onChange={(e) => updateEmailCapture({ requireVerification: e.target.checked })}
                            />
                            Require Email Verification
                        </label>
                    </div>

                    <div className="transform-config-field">
                        <label>Subscribe to List (optional)</label>
                        <input
                            type="text"
                            value={emailCapture.subscribeToList || ''}
                            onChange={(e) => updateEmailCapture({ subscribeToList: e.target.value })}
                            placeholder="List ID or name"
                        />
                    </div>
                </div>
            )}

            {/* Social Share Options */}
            {config.unlockMethod === 'social_share' && (
                <div className="transform-config-section">
                    <div className="transform-config-section-title">Social Share Settings</div>

                    <div className="transform-config-field">
                        <label>Platforms (select at least one)</label>
                        <div className="transform-config-checkbox-grid">
                            {SOCIAL_PLATFORMS.map(platform => (
                                <label key={platform.value} className="transform-config-checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={(socialShare.platforms || []).includes(platform.value)}
                                        onChange={() => togglePlatform(platform.value)}
                                    />
                                    {platform.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="transform-config-field">
                        <label>Share Message Template</label>
                        <textarea
                            value={socialShare.shareMessage || ''}
                            onChange={(e) => updateSocialShare({ shareMessage: e.target.value })}
                            rows={2}
                            placeholder="Check out this amazing content!"
                        />
                    </div>

                    <div className="transform-config-field">
                        <label>Share URL (optional)</label>
                        <input
                            type="text"
                            value={socialShare.shareUrl || ''}
                            onChange={(e) => updateSocialShare({ shareUrl: e.target.value })}
                            placeholder="{{pageUrl}} or custom URL"
                        />
                    </div>
                </div>
            )}

            {/* Payment Options */}
            {config.unlockMethod === 'payment' && (
                <div className="transform-config-section">
                    <div className="transform-config-section-title">Payment Settings</div>

                    <div className="transform-config-field">
                        <label>Payment Provider</label>
                        <div className="transform-config-provider-grid">
                            {PAYMENT_PROVIDERS.map(provider => (
                                <button
                                    key={provider.value}
                                    type="button"
                                    className={`transform-config-provider-btn ${payment.provider === provider.value ? 'active' : ''}`}
                                    onClick={() => updatePayment({ provider: provider.value as any })}
                                >
                                    <span className="provider-label">{provider.label}</span>
                                    <span className="provider-desc">{provider.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="transform-config-row">
                        <div className="transform-config-field transform-config-field-half">
                            <label>Amount</label>
                            <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={payment.amount || ''}
                                onChange={(e) => updatePayment({ amount: parseFloat(e.target.value) || 0 })}
                                placeholder="9.99"
                            />
                        </div>

                        <div className="transform-config-field transform-config-field-half">
                            <label>Currency</label>
                            <div className="transform-config-select-wrapper">
                                <select
                                    value={payment.currency}
                                    onChange={(e) => updatePayment({ currency: e.target.value })}
                                >
                                    {CURRENCIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="select-icon" />
                            </div>
                        </div>
                    </div>

                    <div className="transform-config-field">
                        <label>Product ID (from payment provider)</label>
                        <input
                            type="text"
                            value={payment.productId || ''}
                            onChange={(e) => updatePayment({ productId: e.target.value })}
                            placeholder="prod_xxxxx or price_xxxxx"
                        />
                    </div>
                </div>
            )}

            {/* Code Unlock Options */}
            {config.unlockMethod === 'code' && (
                <div className="transform-config-section">
                    <div className="transform-config-section-title">Access Code Settings</div>

                    <div className="transform-config-field">
                        <label>Valid Codes</label>
                        <div className="transform-config-tag-input">
                            <input
                                type="text"
                                value={newCode}
                                onChange={(e) => setNewCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addCode()}
                                placeholder="Add access code..."
                            />
                            <button type="button" onClick={addCode}>
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="transform-config-tags">
                            {(unlockCode.codes || []).map((code, i) => (
                                <span key={i} className="transform-config-tag code">
                                    {code}
                                    <button
                                        type="button"
                                        onClick={() => updateUnlockCode({
                                            codes: unlockCode.codes?.filter((_, idx) => idx !== i)
                                        })}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="transform-config-row">
                        <div className="transform-config-field transform-config-field-half transform-config-field-inline">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={unlockCode.caseSensitive}
                                    onChange={(e) => updateUnlockCode({ caseSensitive: e.target.checked })}
                                />
                                Case Sensitive
                            </label>
                        </div>

                        <div className="transform-config-field transform-config-field-half transform-config-field-inline">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={unlockCode.singleUse}
                                    onChange={(e) => updateUnlockCode({ singleUse: e.target.checked })}
                                />
                                Single Use (invalidate after use)
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ============================================================================
// FORMAT CONFIG
// ============================================================================

function FormatConfig({ config, onChange }: {
    config: TransformConfigEntry;
    onChange: (updates: Partial<TransformConfigEntry>) => void;
}) {
    const formatOptions = config.formatOptions || {};
    const pdfOptions = config.pdfOptions || {};

    const updateFormatOptions = (updates: Partial<typeof formatOptions>) => {
        onChange({ formatOptions: { ...formatOptions, ...updates } });
    };

    const updatePdfOptions = (updates: Partial<typeof pdfOptions>) => {
        onChange({ pdfOptions: { ...pdfOptions, ...updates } });
    };

    return (
        <>
            <div className="transform-config-section">
                <div className="transform-config-section-title">Format Conversion</div>

                <div className="transform-config-row">
                    <div className="transform-config-field transform-config-field-half">
                        <label>Input Format</label>
                        <div className="transform-config-select-wrapper">
                            <select
                                value={config.inputFormat}
                                onChange={(e) => onChange({ inputFormat: e.target.value as any })}
                            >
                                {INPUT_FORMATS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="select-icon" />
                        </div>
                    </div>

                    <div className="transform-config-field transform-config-field-half">
                        <label>Output Format</label>
                        <div className="transform-config-select-wrapper">
                            <select
                                value={config.outputFormat}
                                onChange={(e) => onChange({ outputFormat: e.target.value as any })}
                            >
                                {OUTPUT_FORMATS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="select-icon" />
                        </div>
                    </div>
                </div>

                <div className="transform-config-format-visual">
                    <div className="format-from">
                        <Type size={24} />
                        <span>{config.inputFormat || 'auto'}</span>
                    </div>
                    <div className="format-arrow">→</div>
                    <div className="format-to">
                        {OUTPUT_FORMATS.find(f => f.value === config.outputFormat)?.icon &&
                            React.createElement(OUTPUT_FORMATS.find(f => f.value === config.outputFormat)!.icon, { size: 24 })}
                        <span>{config.outputFormat || 'html'}</span>
                    </div>
                </div>
            </div>

            <div className="transform-config-section">
                <div className="transform-config-section-title">Format Options</div>

                <div className="transform-config-checkbox-grid wide">
                    <label className="transform-config-checkbox-item">
                        <input
                            type="checkbox"
                            checked={formatOptions.preserveLineBreaks}
                            onChange={(e) => updateFormatOptions({ preserveLineBreaks: e.target.checked })}
                        />
                        Preserve Line Breaks
                    </label>

                    <label className="transform-config-checkbox-item">
                        <input
                            type="checkbox"
                            checked={formatOptions.sanitizeHtml}
                            onChange={(e) => updateFormatOptions({ sanitizeHtml: e.target.checked })}
                        />
                        Sanitize HTML
                    </label>

                    <label className="transform-config-checkbox-item">
                        <input
                            type="checkbox"
                            checked={formatOptions.syntaxHighlight}
                            onChange={(e) => updateFormatOptions({ syntaxHighlight: e.target.checked })}
                        />
                        Syntax Highlighting
                    </label>

                    <label className="transform-config-checkbox-item">
                        <input
                            type="checkbox"
                            checked={formatOptions.tableOfContents}
                            onChange={(e) => updateFormatOptions({ tableOfContents: e.target.checked })}
                        />
                        Generate Table of Contents
                    </label>

                    <label className="transform-config-checkbox-item">
                        <input
                            type="checkbox"
                            checked={formatOptions.inlineStyles}
                            onChange={(e) => updateFormatOptions({ inlineStyles: e.target.checked })}
                        />
                        Inline CSS Styles
                    </label>

                    <label className="transform-config-checkbox-item">
                        <input
                            type="checkbox"
                            checked={formatOptions.minifyOutput}
                            onChange={(e) => updateFormatOptions({ minifyOutput: e.target.checked })}
                        />
                        Minify Output
                    </label>
                </div>
            </div>

            {/* PDF Options */}
            {config.outputFormat === 'pdf' && (
                <div className="transform-config-section">
                    <div className="transform-config-section-title">PDF Options</div>

                    <div className="transform-config-row">
                        <div className="transform-config-field transform-config-field-third">
                            <label>Page Size</label>
                            <div className="transform-config-select-wrapper">
                                <select
                                    value={pdfOptions.pageSize}
                                    onChange={(e) => updatePdfOptions({ pageSize: e.target.value as any })}
                                >
                                    {PAGE_SIZES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="select-icon" />
                            </div>
                        </div>

                        <div className="transform-config-field transform-config-field-third">
                            <label>Orientation</label>
                            <div className="transform-config-select-wrapper">
                                <select
                                    value={pdfOptions.orientation}
                                    onChange={(e) => updatePdfOptions({ orientation: e.target.value as any })}
                                >
                                    {PDF_ORIENTATIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="select-icon" />
                            </div>
                        </div>

                        <div className="transform-config-field transform-config-field-third">
                            <label>Margins</label>
                            <div className="transform-config-select-wrapper">
                                <select
                                    value={pdfOptions.margins}
                                    onChange={(e) => updatePdfOptions({ margins: e.target.value as any })}
                                >
                                    {PDF_MARGINS.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="select-icon" />
                            </div>
                        </div>
                    </div>

                    <div className="transform-config-field transform-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={pdfOptions.includePageNumbers}
                                onChange={(e) => updatePdfOptions({ includePageNumbers: e.target.checked })}
                            />
                            Include Page Numbers
                        </label>
                    </div>

                    <div className="transform-config-field">
                        <label>Header HTML (optional)</label>
                        <textarea
                            value={pdfOptions.headerHtml || ''}
                            onChange={(e) => updatePdfOptions({ headerHtml: e.target.value })}
                            rows={2}
                            placeholder="<div style='text-align: center'>Company Name</div>"
                            className="transform-config-code"
                        />
                    </div>

                    <div className="transform-config-field">
                        <label>Footer HTML (optional)</label>
                        <textarea
                            value={pdfOptions.footerHtml || ''}
                            onChange={(e) => updatePdfOptions({ footerHtml: e.target.value })}
                            rows={2}
                            placeholder="<div style='text-align: center'>Page {pageNumber} of {totalPages}</div>"
                            className="transform-config-code"
                        />
                    </div>
                </div>
            )}
        </>
    );
}

// ============================================================================
// PERSONALIZE CONFIG
// ============================================================================

function PersonalizeConfig({ config, onChange }: {
    config: TransformConfigEntry;
    onChange: (updates: Partial<TransformConfigEntry>) => void;
}) {
    const mappings = config.variableMappings || [];
    const fallbackDefaults = config.fallbackDefaults || {};

    const addMapping = () => {
        const newMapping: VariableMapping = {
            id: `var-${Date.now()}`,
            variableName: '',
            sourceField: '',
            fallbackValue: '',
            transform: 'none',
        };
        onChange({ variableMappings: [...mappings, newMapping] });
    };

    const updateMapping = (id: string, updates: Partial<VariableMapping>) => {
        const updated = mappings.map(m => m.id === id ? { ...m, ...updates } : m);
        onChange({ variableMappings: updated });
    };

    const removeMapping = (id: string) => {
        onChange({ variableMappings: mappings.filter(m => m.id !== id) });
    };

    const addQuickVariable = (varName: string) => {
        const newMapping: VariableMapping = {
            id: `var-${Date.now()}`,
            variableName: varName,
            sourceField: `{{lastNodeOutput.${varName}}}`,
            fallbackValue: '',
            transform: 'none',
        };
        onChange({ variableMappings: [...mappings, newMapping] });
    };

    const updateFallbackDefault = (varName: string, value: string) => {
        onChange({ fallbackDefaults: { ...fallbackDefaults, [varName]: value } });
    };

    return (
        <>
            <div className="transform-config-section">
                <div className="transform-config-section-title">Personalization Mode</div>

                <div className="transform-config-mode-grid">
                    {PERSONALIZATION_MODES.map(mode => (
                        <button
                            key={mode.value}
                            type="button"
                            className={`transform-config-mode-btn ${config.personalizationMode === mode.value ? 'active' : ''}`}
                            onClick={() => onChange({ personalizationMode: mode.value as any })}
                        >
                            <span className="mode-label">{mode.label}</span>
                            <span className="mode-desc">{mode.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="transform-config-section">
                <div className="transform-config-section-header">
                    <div className="transform-config-section-title">Variable Mappings</div>
                    <button
                        type="button"
                        className="transform-config-add-btn"
                        onClick={addMapping}
                    >
                        <Plus size={14} />
                        Add Variable
                    </button>
                </div>

                <div className="transform-config-quick-vars">
                    <span className="quick-vars-label">Quick Add:</span>
                    {COMMON_VARIABLES.map(v => {
                        const VarIcon = v.icon;
                        const alreadyAdded = mappings.some(m => m.variableName === v.name);
                        return (
                            <button
                                key={v.name}
                                type="button"
                                className={`quick-var-btn ${alreadyAdded ? 'added' : ''}`}
                                onClick={() => !alreadyAdded && addQuickVariable(v.name)}
                                disabled={alreadyAdded}
                            >
                                <VarIcon size={12} />
                                {v.label}
                            </button>
                        );
                    })}
                </div>

                {mappings.length === 0 && (
                    <div className="transform-config-empty">
                        No variable mappings. Add variables to personalize content.
                    </div>
                )}

                <div className="transform-config-list">
                    {mappings.map((mapping) => (
                        <div key={mapping.id} className="transform-config-mapping-row">
                            <input
                                type="text"
                                value={mapping.variableName}
                                onChange={(e) => updateMapping(mapping.id, { variableName: e.target.value })}
                                placeholder="variableName"
                                className="mapping-var"
                            />
                            <span className="mapping-equals">=</span>
                            <input
                                type="text"
                                value={mapping.sourceField}
                                onChange={(e) => updateMapping(mapping.id, { sourceField: e.target.value })}
                                placeholder="{{lastNodeOutput.field}}"
                                className="mapping-source"
                            />
                            <input
                                type="text"
                                value={mapping.fallbackValue}
                                onChange={(e) => updateMapping(mapping.id, { fallbackValue: e.target.value })}
                                placeholder="Fallback"
                                className="mapping-fallback"
                            />
                            <div className="transform-config-select-wrapper mapping-transform">
                                <select
                                    value={mapping.transform}
                                    onChange={(e) => updateMapping(mapping.id, { transform: e.target.value as any })}
                                >
                                    {VARIABLE_TRANSFORMS.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="select-icon" />
                            </div>
                            <button
                                type="button"
                                className="transform-config-remove-btn"
                                onClick={() => removeMapping(mapping.id)}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="transform-config-section">
                <div className="transform-config-section-title">Fallback Behavior</div>

                <div className="transform-config-fallback-grid">
                    {FALLBACK_BEHAVIORS.map(fb => (
                        <button
                            key={fb.value}
                            type="button"
                            className={`transform-config-fallback-btn ${config.fallbackBehavior === fb.value ? 'active' : ''}`}
                            onClick={() => onChange({ fallbackBehavior: fb.value as any })}
                        >
                            <span className="fallback-label">{fb.label}</span>
                            <span className="fallback-desc">{fb.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="transform-config-section">
                <div className="transform-config-section-title">Detection Settings</div>

                <div className="transform-config-row">
                    <div className="transform-config-field transform-config-field-half transform-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.detectVariables}
                                onChange={(e) => onChange({ detectVariables: e.target.checked })}
                            />
                            Auto-detect Variables
                        </label>
                    </div>

                    <div className="transform-config-field transform-config-field-half">
                        <label>Custom Pattern (optional)</label>
                        <input
                            type="text"
                            value={config.customVariablePattern || ''}
                            onChange={(e) => onChange({ customVariablePattern: e.target.value })}
                            placeholder="{{(.+?)}}"
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

export default TransformConfig;
