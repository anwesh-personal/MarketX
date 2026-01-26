/**
 * RESOLVER CONFIG COMPONENT
 * Configuration forms for resolver nodes (resolve-icp, resolve-offer, etc.)
 * 
 * DESIGN PRINCIPLES:
 * - Theme-aware using CSS variables only
 * - No hardcoded colors or sizes
 * - Proper TypeScript types throughout
 * - Dynamic forms based on resolver type
 * 
 * @author Axiom AI
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    User, Package, Compass, Layout, MousePointer,
    ChevronDown, AlertCircle, Loader2, Info
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface ResolverConfigEntry {
    // Common fields for all resolvers
    selectionMode: 'auto' | 'manual' | 'first_match';
    fallbackBehavior: 'error' | 'empty' | 'default';
    defaultValue?: Record<string, any>;
    cacheResults: boolean;

    // ICP-specific
    industryHint?: string;
    jobTitleHint?: string;
    companySizeHint?: string;
    icpId?: string;

    // Offer-specific
    offerId?: string;
    offerCategory?: string;
    offerNameHint?: string;

    // Angle-specific
    buyerStage?: string;
    preferredAxis?: string;

    // Blueprint-specific
    contentType?: 'website_page' | 'email_flow' | 'email_reply' | 'social_post';
    pageType?: string;
    flowGoal?: string;
    platform?: string;

    // CTA-specific
    ctaType?: 'REPLY' | 'CLICK' | 'BOOK_CALL' | 'DOWNLOAD' | 'OTHER';
}

interface ResolverConfigProps {
    nodeType: string;
    config: ResolverConfigEntry;
    onChange: (config: ResolverConfigEntry) => void;
}

// ============================================================================
// CONSTANTS - These are guardrails, not hardcoding
// ============================================================================

const SELECTION_MODES = [
    { value: 'auto', label: 'Auto Select', description: 'AI picks best match based on context' },
    { value: 'manual', label: 'Manual', description: 'Use explicit ID from config or input' },
    { value: 'first_match', label: 'First Match', description: 'Use first item that matches hints' },
];

const FALLBACK_BEHAVIORS = [
    { value: 'error', label: 'Throw Error', description: 'Fail workflow if no match found' },
    { value: 'empty', label: 'Return Empty', description: 'Continue with empty result' },
    { value: 'default', label: 'Use Default', description: 'Use configured default value' },
];

const BUYER_STAGES = [
    { value: 'AWARENESS', label: 'Awareness' },
    { value: 'CONSIDERATION', label: 'Consideration' },
    { value: 'DECISION', label: 'Decision' },
    { value: 'POST_PURCHASE', label: 'Post-Purchase' },
];

const CONTENT_TYPES = [
    { value: 'website_page', label: 'Website Page' },
    { value: 'email_flow', label: 'Email Flow' },
    { value: 'email_reply', label: 'Email Reply' },
    { value: 'social_post', label: 'Social Post' },
];

const PAGE_TYPES = [
    { value: 'LANDING', label: 'Landing Page' },
    { value: 'HOW_IT_WORKS', label: 'How It Works' },
    { value: 'FEATURES', label: 'Features' },
    { value: 'PRICING', label: 'Pricing' },
    { value: 'ABOUT', label: 'About' },
    { value: 'CASE_STUDY', label: 'Case Study' },
    { value: 'BLOG', label: 'Blog Post' },
];

const FLOW_GOALS = [
    { value: 'MEANINGFUL_REPLY', label: 'Get Meaningful Reply' },
    { value: 'CLICK', label: 'Drive Click' },
    { value: 'BOOK_CALL', label: 'Book a Call' },
];

const PLATFORMS = [
    { value: 'LinkedIn', label: 'LinkedIn' },
    { value: 'X', label: 'X (Twitter)' },
    { value: 'YouTube', label: 'YouTube' },
    { value: 'Instagram', label: 'Instagram' },
    { value: 'Facebook', label: 'Facebook' },
];

const CTA_TYPES = [
    { value: 'REPLY', label: 'Reply' },
    { value: 'CLICK', label: 'Click' },
    { value: 'BOOK_CALL', label: 'Book Call' },
    { value: 'DOWNLOAD', label: 'Download' },
    { value: 'OTHER', label: 'Other' },
];

const ANGLE_AXES = [
    { value: 'pain', label: 'Pain Point' },
    { value: 'gain', label: 'Gain/Benefit' },
    { value: 'authority', label: 'Authority/Trust' },
    { value: 'urgency', label: 'Urgency/FOMO' },
    { value: 'social_proof', label: 'Social Proof' },
];

// ============================================================================
// RESOLVER CONFIG COMPONENT
// ============================================================================

export function ResolverConfig({ nodeType, config, onChange }: ResolverConfigProps) {
    // Initialize with defaults if not set - spread config first, then apply defaults
    const safeConfig: ResolverConfigEntry = {
        ...config,
        selectionMode: config.selectionMode || 'auto',
        fallbackBehavior: config.fallbackBehavior || 'error',
        cacheResults: config.cacheResults ?? true,
    };

    const updateConfig = useCallback((updates: Partial<ResolverConfigEntry>) => {
        onChange({ ...safeConfig, ...updates });
    }, [safeConfig, onChange]);

    // Get resolver-specific icon
    const getResolverIcon = () => {
        switch (nodeType) {
            case 'resolve-icp': return User;
            case 'resolve-offer': return Package;
            case 'resolve-angle': return Compass;
            case 'resolve-blueprint': return Layout;
            case 'resolve-cta': return MousePointer;
            default: return User;
        }
    };

    const Icon = getResolverIcon();

    return (
        <div className="resolver-config">
            {/* Header */}
            <div className="resolver-config-header">
                <Icon size={18} className="resolver-config-icon" />
                <span>Resolver Configuration</span>
            </div>

            {/* Common Settings */}
            <div className="resolver-config-section">
                <div className="resolver-config-section-title">Resolution Settings</div>

                {/* Selection Mode */}
                <div className="resolver-config-field">
                    <label>Selection Mode</label>
                    <div className="resolver-config-select-wrapper">
                        <select
                            value={safeConfig.selectionMode}
                            onChange={(e) => updateConfig({ selectionMode: e.target.value as any })}
                        >
                            {SELECTION_MODES.map(mode => (
                                <option key={mode.value} value={mode.value}>
                                    {mode.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                    <span className="resolver-config-hint">
                        {SELECTION_MODES.find(m => m.value === safeConfig.selectionMode)?.description}
                    </span>
                </div>

                {/* Fallback Behavior */}
                <div className="resolver-config-field">
                    <label>If No Match Found</label>
                    <div className="resolver-config-select-wrapper">
                        <select
                            value={safeConfig.fallbackBehavior}
                            onChange={(e) => updateConfig({ fallbackBehavior: e.target.value as any })}
                        >
                            {FALLBACK_BEHAVIORS.map(fb => (
                                <option key={fb.value} value={fb.value}>
                                    {fb.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>

                {/* Cache Results */}
                <div className="resolver-config-field resolver-config-field-inline">
                    <label>
                        <input
                            type="checkbox"
                            checked={safeConfig.cacheResults}
                            onChange={(e) => updateConfig({ cacheResults: e.target.checked })}
                        />
                        Cache KB Lookups
                    </label>
                    <span className="resolver-config-hint">
                        Reuse results for identical parameters within same execution
                    </span>
                </div>
            </div>

            {/* Type-specific Settings */}
            {nodeType === 'resolve-icp' && (
                <ICPConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'resolve-offer' && (
                <OfferConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'resolve-angle' && (
                <AngleConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'resolve-blueprint' && (
                <BlueprintConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'resolve-cta' && (
                <CTAConfig config={safeConfig} onChange={updateConfig} />
            )}

            {/* Info Box */}
            <div className="resolver-config-info">
                <Info size={16} />
                <span>
                    Resolvers query the Knowledge Base attached to this workflow's engine.
                    Results are deterministic based on KB content.
                </span>
            </div>
        </div>
    );
}

// ============================================================================
// ICP CONFIG
// ============================================================================

function ICPConfig({ config, onChange }: {
    config: ResolverConfigEntry;
    onChange: (updates: Partial<ResolverConfigEntry>) => void;
}) {
    return (
        <div className="resolver-config-section">
            <div className="resolver-config-section-title">ICP Selection Hints</div>

            <div className="resolver-config-field">
                <label>Direct ICP ID (Optional)</label>
                <input
                    type="text"
                    value={config.icpId || ''}
                    onChange={(e) => onChange({ icpId: e.target.value || undefined })}
                    placeholder="e.g., icp-enterprise-cto"
                />
                <span className="resolver-config-hint">
                    Skip matching, use this ICP directly
                </span>
            </div>

            <div className="resolver-config-field">
                <label>Industry Hint</label>
                <input
                    type="text"
                    value={config.industryHint || ''}
                    onChange={(e) => onChange({ industryHint: e.target.value || undefined })}
                    placeholder="e.g., SaaS, Healthcare, FinTech"
                />
            </div>

            <div className="resolver-config-field">
                <label>Job Title Hint</label>
                <input
                    type="text"
                    value={config.jobTitleHint || ''}
                    onChange={(e) => onChange({ jobTitleHint: e.target.value || undefined })}
                    placeholder="e.g., CTO, VP Engineering, Founder"
                />
            </div>

            <div className="resolver-config-field">
                <label>Company Size Hint</label>
                <input
                    type="text"
                    value={config.companySizeHint || ''}
                    onChange={(e) => onChange({ companySizeHint: e.target.value || undefined })}
                    placeholder="e.g., 50-200, Enterprise, Startup"
                />
            </div>
        </div>
    );
}

// ============================================================================
// OFFER CONFIG
// ============================================================================

function OfferConfig({ config, onChange }: {
    config: ResolverConfigEntry;
    onChange: (updates: Partial<ResolverConfigEntry>) => void;
}) {
    return (
        <div className="resolver-config-section">
            <div className="resolver-config-section-title">Offer Selection Hints</div>

            <div className="resolver-config-field">
                <label>Direct Offer ID (Optional)</label>
                <input
                    type="text"
                    value={config.offerId || ''}
                    onChange={(e) => onChange({ offerId: e.target.value || undefined })}
                    placeholder="e.g., offer-main-product"
                />
                <span className="resolver-config-hint">
                    Skip matching, use this offer directly
                </span>
            </div>

            <div className="resolver-config-field">
                <label>Category Hint</label>
                <input
                    type="text"
                    value={config.offerCategory || ''}
                    onChange={(e) => onChange({ offerCategory: e.target.value || undefined })}
                    placeholder="e.g., Premium, Free Trial, Enterprise"
                />
            </div>

            <div className="resolver-config-field">
                <label>Offer Name Hint</label>
                <input
                    type="text"
                    value={config.offerNameHint || ''}
                    onChange={(e) => onChange({ offerNameHint: e.target.value || undefined })}
                    placeholder="e.g., Main Product, Consulting Package"
                />
            </div>
        </div>
    );
}

// ============================================================================
// ANGLE CONFIG
// ============================================================================

function AngleConfig({ config, onChange }: {
    config: ResolverConfigEntry;
    onChange: (updates: Partial<ResolverConfigEntry>) => void;
}) {
    return (
        <div className="resolver-config-section">
            <div className="resolver-config-section-title">Angle Selection</div>

            <div className="resolver-config-field">
                <label>Buyer Stage</label>
                <div className="resolver-config-select-wrapper">
                    <select
                        value={config.buyerStage || ''}
                        onChange={(e) => onChange({ buyerStage: e.target.value || undefined })}
                    >
                        <option value="">Auto-detect from context</option>
                        {BUYER_STAGES.map(stage => (
                            <option key={stage.value} value={stage.value}>
                                {stage.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="select-icon" />
                </div>
            </div>

            <div className="resolver-config-field">
                <label>Preferred Angle Axis</label>
                <div className="resolver-config-select-wrapper">
                    <select
                        value={config.preferredAxis || ''}
                        onChange={(e) => onChange({ preferredAxis: e.target.value || undefined })}
                    >
                        <option value="">Let KB decide</option>
                        {ANGLE_AXES.map(axis => (
                            <option key={axis.value} value={axis.value}>
                                {axis.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="select-icon" />
                </div>
                <span className="resolver-config-hint">
                    Force a specific angle type, or let KB preferences decide
                </span>
            </div>
        </div>
    );
}

// ============================================================================
// BLUEPRINT CONFIG
// ============================================================================

function BlueprintConfig({ config, onChange }: {
    config: ResolverConfigEntry;
    onChange: (updates: Partial<ResolverConfigEntry>) => void;
}) {
    const contentType = config.contentType || 'website_page';

    return (
        <div className="resolver-config-section">
            <div className="resolver-config-section-title">Blueprint Selection</div>

            <div className="resolver-config-field">
                <label>Content Type</label>
                <div className="resolver-config-select-wrapper">
                    <select
                        value={contentType}
                        onChange={(e) => onChange({ contentType: e.target.value as any })}
                    >
                        {CONTENT_TYPES.map(ct => (
                            <option key={ct.value} value={ct.value}>
                                {ct.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="select-icon" />
                </div>
            </div>

            {/* Conditional fields based on content type */}
            {contentType === 'website_page' && (
                <div className="resolver-config-field">
                    <label>Page Type</label>
                    <div className="resolver-config-select-wrapper">
                        <select
                            value={config.pageType || ''}
                            onChange={(e) => onChange({ pageType: e.target.value || undefined })}
                        >
                            <option value="">Select from context</option>
                            {PAGE_TYPES.map(pt => (
                                <option key={pt.value} value={pt.value}>
                                    {pt.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>
            )}

            {contentType === 'email_flow' && (
                <div className="resolver-config-field">
                    <label>Flow Goal</label>
                    <div className="resolver-config-select-wrapper">
                        <select
                            value={config.flowGoal || ''}
                            onChange={(e) => onChange({ flowGoal: e.target.value || undefined })}
                        >
                            <option value="">Let KB decide</option>
                            {FLOW_GOALS.map(fg => (
                                <option key={fg.value} value={fg.value}>
                                    {fg.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>
            )}

            {contentType === 'social_post' && (
                <div className="resolver-config-field">
                    <label>Platform</label>
                    <div className="resolver-config-select-wrapper">
                        <select
                            value={config.platform || ''}
                            onChange={(e) => onChange({ platform: e.target.value || undefined })}
                        >
                            <option value="">Any platform</option>
                            {PLATFORMS.map(p => (
                                <option key={p.value} value={p.value}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>
            )}

            <div className="resolver-config-field">
                <label>Buyer Stage</label>
                <div className="resolver-config-select-wrapper">
                    <select
                        value={config.buyerStage || ''}
                        onChange={(e) => onChange({ buyerStage: e.target.value || undefined })}
                    >
                        <option value="">Auto-detect</option>
                        {BUYER_STAGES.map(stage => (
                            <option key={stage.value} value={stage.value}>
                                {stage.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="select-icon" />
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// CTA CONFIG
// ============================================================================

function CTAConfig({ config, onChange }: {
    config: ResolverConfigEntry;
    onChange: (updates: Partial<ResolverConfigEntry>) => void;
}) {
    return (
        <div className="resolver-config-section">
            <div className="resolver-config-section-title">CTA Selection</div>

            <div className="resolver-config-field">
                <label>Preferred CTA Type</label>
                <div className="resolver-config-select-wrapper">
                    <select
                        value={config.ctaType || ''}
                        onChange={(e) => onChange({ ctaType: e.target.value as any || undefined })}
                    >
                        <option value="">Any type</option>
                        {CTA_TYPES.map(ct => (
                            <option key={ct.value} value={ct.value}>
                                {ct.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="select-icon" />
                </div>
            </div>

            <div className="resolver-config-field">
                <label>Page Type Context</label>
                <div className="resolver-config-select-wrapper">
                    <select
                        value={config.pageType || ''}
                        onChange={(e) => onChange({ pageType: e.target.value || undefined })}
                    >
                        <option value="">From previous resolver</option>
                        {PAGE_TYPES.map(pt => (
                            <option key={pt.value} value={pt.value}>
                                {pt.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="select-icon" />
                </div>
            </div>

            <div className="resolver-config-field">
                <label>Buyer Stage</label>
                <div className="resolver-config-select-wrapper">
                    <select
                        value={config.buyerStage || ''}
                        onChange={(e) => onChange({ buyerStage: e.target.value || undefined })}
                    >
                        <option value="">From previous resolver</option>
                        {BUYER_STAGES.map(stage => (
                            <option key={stage.value} value={stage.value}>
                                {stage.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="select-icon" />
                </div>
            </div>
        </div>
    );
}

export default ResolverConfig;
