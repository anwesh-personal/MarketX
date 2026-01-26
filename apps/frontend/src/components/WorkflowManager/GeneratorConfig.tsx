/**
 * GENERATOR CONFIG COMPONENT
 * Configuration forms for generator nodes (email, page, social, bundle)
 * 
 * EXTENDS AIConfig with type-specific generation options
 * 
 * DESIGN PRINCIPLES:
 * - Theme-aware using CSS variables only
 * - No hardcoded colors or sizes
 * - Proper TypeScript types throughout
 * - Dynamic forms based on generator type
 * 
 * @author Axiom AI
 */

import React, { useState, useCallback } from 'react';
import {
    MessageSquare, Send, FileText, Layers, Globe,
    ChevronDown, Plus, Trash2, Info, Sparkles,
    Hash, Image, Clock, Zap, Type, List
} from 'lucide-react';
import { AIConfig } from './AIConfig';

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratorConfigEntry {
    // AI Config (handled by AIConfig component)
    aiConfig?: any[];
    systemPrompt?: string;

    // Common fields
    outputFormat?: 'text' | 'html' | 'markdown' | 'json';
    constitutionId?: string;
    qualityThreshold?: number;

    // Email Reply specific
    replyStyle?: 'formal' | 'casual' | 'friendly' | 'direct';
    includeSignature?: boolean;
    maxLength?: number;
    signatureText?: string;

    // Email Flow specific
    sequenceLength?: number;
    daysBetween?: number;
    flowGoal?: 'MEANINGFUL_REPLY' | 'CLICK' | 'BOOK_CALL';
    includeFollowups?: boolean;
    abVariants?: number;

    // Website Page specific
    pageType?: string;
    seoOptimize?: boolean;
    seoTitle?: string;
    seoDescription?: string;
    includeSections?: string[];

    // Website Bundle specific
    bundlePages?: BundlePage[];
    navigationStyle?: 'top' | 'sidebar' | 'minimal';
    linkStrategy?: 'sequential' | 'hub' | 'custom';

    // Social Post specific
    platforms?: string[];
    includeHashtags?: boolean;
    hashtagCount?: number;
    emojiLevel?: 'none' | 'minimal' | 'moderate' | 'heavy';
    generateImagePrompt?: boolean;
    postLength?: 'short' | 'medium' | 'long';
}

interface BundlePage {
    id: string;
    pageType: string;
    slug: string;
    title: string;
}

interface GeneratorConfigProps {
    nodeType: string;
    config: GeneratorConfigEntry;
    onChange: (config: GeneratorConfigEntry) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const OUTPUT_FORMATS = [
    { value: 'text', label: 'Plain Text' },
    { value: 'html', label: 'HTML' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'json', label: 'JSON' },
];

const REPLY_STYLES = [
    { value: 'formal', label: 'Formal', description: 'Professional, business tone' },
    { value: 'casual', label: 'Casual', description: 'Friendly, relaxed tone' },
    { value: 'friendly', label: 'Friendly', description: 'Warm, personable tone' },
    { value: 'direct', label: 'Direct', description: 'Concise, to the point' },
];

const FLOW_GOALS = [
    { value: 'MEANINGFUL_REPLY', label: 'Get Meaningful Reply' },
    { value: 'CLICK', label: 'Drive Click' },
    { value: 'BOOK_CALL', label: 'Book a Call' },
];

const PAGE_TYPES = [
    { value: 'landing', label: 'Landing Page' },
    { value: 'how_it_works', label: 'How It Works' },
    { value: 'features', label: 'Features' },
    { value: 'pricing', label: 'Pricing' },
    { value: 'about', label: 'About Us' },
    { value: 'case_study', label: 'Case Study' },
    { value: 'blog_post', label: 'Blog Post' },
    { value: 'comparison', label: 'Comparison' },
];

const PAGE_SECTIONS = [
    { value: 'hero', label: 'Hero Section' },
    { value: 'problem', label: 'Problem/Pain' },
    { value: 'solution', label: 'Solution' },
    { value: 'features', label: 'Features Grid' },
    { value: 'benefits', label: 'Benefits' },
    { value: 'social_proof', label: 'Social Proof' },
    { value: 'testimonials', label: 'Testimonials' },
    { value: 'pricing', label: 'Pricing Table' },
    { value: 'faq', label: 'FAQ' },
    { value: 'cta', label: 'CTA Section' },
];

const SOCIAL_PLATFORMS = [
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'twitter', label: 'X (Twitter)' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'threads', label: 'Threads' },
];

const EMOJI_LEVELS = [
    { value: 'none', label: 'No Emojis' },
    { value: 'minimal', label: 'Minimal (1-2)' },
    { value: 'moderate', label: 'Moderate (3-5)' },
    { value: 'heavy', label: 'Heavy (5+)' },
];

const POST_LENGTHS = [
    { value: 'short', label: 'Short (< 150 chars)' },
    { value: 'medium', label: 'Medium (150-300 chars)' },
    { value: 'long', label: 'Long (300+ chars)' },
];

const NAV_STYLES = [
    { value: 'top', label: 'Top Navigation' },
    { value: 'sidebar', label: 'Sidebar Navigation' },
    { value: 'minimal', label: 'Minimal (No Nav)' },
];

const LINK_STRATEGIES = [
    { value: 'sequential', label: 'Sequential (Page 1 → 2 → 3)' },
    { value: 'hub', label: 'Hub & Spoke (All link to landing)' },
    { value: 'custom', label: 'Custom Links' },
];

// ============================================================================
// GENERATOR CONFIG COMPONENT
// ============================================================================

export function GeneratorConfig({ nodeType, config, onChange }: GeneratorConfigProps) {
    const safeConfig: GeneratorConfigEntry = {
        ...config,
        outputFormat: config.outputFormat || 'html',
        qualityThreshold: config.qualityThreshold ?? 70,
        // Email Reply defaults
        replyStyle: config.replyStyle || 'friendly',
        includeSignature: config.includeSignature ?? true,
        maxLength: config.maxLength || 500,
        // Email Flow defaults
        sequenceLength: config.sequenceLength || 5,
        daysBetween: config.daysBetween || 2,
        flowGoal: config.flowGoal || 'MEANINGFUL_REPLY',
        abVariants: config.abVariants || 1,
        // Page defaults
        pageType: config.pageType || 'landing',
        seoOptimize: config.seoOptimize ?? true,
        includeSections: config.includeSections || ['hero', 'problem', 'solution', 'cta'],
        // Bundle defaults
        bundlePages: config.bundlePages || [],
        navigationStyle: config.navigationStyle || 'top',
        linkStrategy: config.linkStrategy || 'sequential',
        // Social defaults
        platforms: config.platforms || ['linkedin'],
        includeHashtags: config.includeHashtags ?? true,
        hashtagCount: config.hashtagCount || 5,
        emojiLevel: config.emojiLevel || 'minimal',
        postLength: config.postLength || 'medium',
    };

    const updateConfig = useCallback((updates: Partial<GeneratorConfigEntry>) => {
        onChange({ ...safeConfig, ...updates });
    }, [safeConfig, onChange]);

    const getGeneratorIcon = () => {
        switch (nodeType) {
            case 'generate-email-reply': return MessageSquare;
            case 'generate-email-flow': return Send;
            case 'generate-website-page': return FileText;
            case 'generate-website-bundle': return Layers;
            case 'generate-social-post': return Globe;
            default: return Sparkles;
        }
    };

    const Icon = getGeneratorIcon();

    return (
        <div className="generator-config">
            {/* Header */}
            <div className="generator-config-header">
                <Icon size={18} className="generator-config-icon" />
                <span>Generator Configuration</span>
            </div>

            {/* AI Config - Always shown for generators */}
            <div className="generator-config-ai-section">
                <AIConfig
                    config={safeConfig.aiConfig || []}
                    onChange={(aiConfig) => updateConfig({ aiConfig })}
                    systemPrompt={safeConfig.systemPrompt || ''}
                    onSystemPromptChange={(systemPrompt) => updateConfig({ systemPrompt })}
                    systemPromptLabel="Generation Instructions"
                />
            </div>

            {/* Common Settings */}
            <div className="generator-config-section">
                <div className="generator-config-section-title">Output Settings</div>

                <div className="generator-config-row">
                    <div className="generator-config-field generator-config-field-half">
                        <label>Output Format</label>
                        <div className="generator-config-select-wrapper">
                            <select
                                value={safeConfig.outputFormat}
                                onChange={(e) => updateConfig({ outputFormat: e.target.value as any })}
                            >
                                {OUTPUT_FORMATS.map(fmt => (
                                    <option key={fmt.value} value={fmt.value}>
                                        {fmt.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="select-icon" />
                        </div>
                    </div>

                    <div className="generator-config-field generator-config-field-half">
                        <label>Min Quality Score</label>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={safeConfig.qualityThreshold}
                            onChange={(e) => updateConfig({ qualityThreshold: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                </div>
            </div>

            {/* Type-specific Settings */}
            {nodeType === 'generate-email-reply' && (
                <EmailReplyConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'generate-email-flow' && (
                <EmailFlowConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'generate-website-page' && (
                <WebsitePageConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'generate-website-bundle' && (
                <WebsiteBundleConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'generate-social-post' && (
                <SocialPostConfig config={safeConfig} onChange={updateConfig} />
            )}
        </div>
    );
}

// ============================================================================
// EMAIL REPLY CONFIG
// ============================================================================

function EmailReplyConfig({ config, onChange }: {
    config: GeneratorConfigEntry;
    onChange: (updates: Partial<GeneratorConfigEntry>) => void;
}) {
    return (
        <div className="generator-config-section">
            <div className="generator-config-section-title">Email Reply Settings</div>

            <div className="generator-config-field">
                <label>Reply Style</label>
                <div className="generator-config-style-grid">
                    {REPLY_STYLES.map(style => (
                        <button
                            key={style.value}
                            type="button"
                            className={`generator-config-style-btn ${config.replyStyle === style.value ? 'active' : ''}`}
                            onClick={() => onChange({ replyStyle: style.value as any })}
                        >
                            <span className="style-label">{style.label}</span>
                            <span className="style-desc">{style.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="generator-config-row">
                <div className="generator-config-field generator-config-field-half">
                    <label>Max Length (words)</label>
                    <input
                        type="number"
                        min={50}
                        max={2000}
                        value={config.maxLength}
                        onChange={(e) => onChange({ maxLength: parseInt(e.target.value) || 500 })}
                    />
                </div>

                <div className="generator-config-field generator-config-field-half generator-config-field-inline">
                    <label>
                        <input
                            type="checkbox"
                            checked={config.includeSignature}
                            onChange={(e) => onChange({ includeSignature: e.target.checked })}
                        />
                        Include Signature
                    </label>
                </div>
            </div>

            {config.includeSignature && (
                <div className="generator-config-field">
                    <label>Signature Text</label>
                    <textarea
                        value={config.signatureText || ''}
                        onChange={(e) => onChange({ signatureText: e.target.value })}
                        rows={3}
                        placeholder="Best regards,&#10;{{sender_name}}&#10;{{sender_title}}"
                    />
                </div>
            )}
        </div>
    );
}

// ============================================================================
// EMAIL FLOW CONFIG
// ============================================================================

function EmailFlowConfig({ config, onChange }: {
    config: GeneratorConfigEntry;
    onChange: (updates: Partial<GeneratorConfigEntry>) => void;
}) {
    return (
        <div className="generator-config-section">
            <div className="generator-config-section-title">Email Sequence Settings</div>

            <div className="generator-config-row">
                <div className="generator-config-field generator-config-field-third">
                    <label>Emails in Sequence</label>
                    <input
                        type="number"
                        min={1}
                        max={15}
                        value={config.sequenceLength}
                        onChange={(e) => onChange({ sequenceLength: parseInt(e.target.value) || 5 })}
                    />
                </div>

                <div className="generator-config-field generator-config-field-third">
                    <label>Days Between</label>
                    <input
                        type="number"
                        min={1}
                        max={14}
                        value={config.daysBetween}
                        onChange={(e) => onChange({ daysBetween: parseInt(e.target.value) || 2 })}
                    />
                </div>

                <div className="generator-config-field generator-config-field-third">
                    <label>A/B Variants</label>
                    <input
                        type="number"
                        min={1}
                        max={5}
                        value={config.abVariants}
                        onChange={(e) => onChange({ abVariants: parseInt(e.target.value) || 1 })}
                    />
                </div>
            </div>

            <div className="generator-config-field">
                <label>Flow Goal</label>
                <div className="generator-config-select-wrapper">
                    <select
                        value={config.flowGoal}
                        onChange={(e) => onChange({ flowGoal: e.target.value as any })}
                    >
                        {FLOW_GOALS.map(goal => (
                            <option key={goal.value} value={goal.value}>
                                {goal.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="select-icon" />
                </div>
            </div>

            <div className="generator-config-field generator-config-field-inline">
                <label>
                    <input
                        type="checkbox"
                        checked={config.includeFollowups ?? true}
                        onChange={(e) => onChange({ includeFollowups: e.target.checked })}
                    />
                    Include follow-up variations
                </label>
            </div>

            {/* Visual timeline preview */}
            <div className="generator-config-timeline">
                {Array.from({ length: config.sequenceLength || 5 }).map((_, i) => (
                    <div key={i} className="timeline-item">
                        <div className="timeline-dot">{i + 1}</div>
                        <div className="timeline-label">
                            Day {i * (config.daysBetween || 2)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// WEBSITE PAGE CONFIG
// ============================================================================

function WebsitePageConfig({ config, onChange }: {
    config: GeneratorConfigEntry;
    onChange: (updates: Partial<GeneratorConfigEntry>) => void;
}) {
    const toggleSection = (section: string) => {
        const current = config.includeSections || [];
        const updated = current.includes(section)
            ? current.filter(s => s !== section)
            : [...current, section];
        onChange({ includeSections: updated });
    };

    return (
        <>
            <div className="generator-config-section">
                <div className="generator-config-section-title">Page Settings</div>

                <div className="generator-config-field">
                    <label>Page Type</label>
                    <div className="generator-config-select-wrapper">
                        <select
                            value={config.pageType}
                            onChange={(e) => onChange({ pageType: e.target.value })}
                        >
                            {PAGE_TYPES.map(pt => (
                                <option key={pt.value} value={pt.value}>
                                    {pt.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>

                <div className="generator-config-field generator-config-field-inline">
                    <label>
                        <input
                            type="checkbox"
                            checked={config.seoOptimize}
                            onChange={(e) => onChange({ seoOptimize: e.target.checked })}
                        />
                        Optimize for SEO
                    </label>
                </div>

                {config.seoOptimize && (
                    <>
                        <div className="generator-config-field">
                            <label>SEO Title (optional)</label>
                            <input
                                type="text"
                                value={config.seoTitle || ''}
                                onChange={(e) => onChange({ seoTitle: e.target.value })}
                                placeholder="Leave blank to auto-generate"
                            />
                        </div>

                        <div className="generator-config-field">
                            <label>Meta Description (optional)</label>
                            <textarea
                                value={config.seoDescription || ''}
                                onChange={(e) => onChange({ seoDescription: e.target.value })}
                                rows={2}
                                placeholder="Leave blank to auto-generate"
                            />
                        </div>
                    </>
                )}
            </div>

            <div className="generator-config-section">
                <div className="generator-config-section-title">Page Sections</div>

                <div className="generator-config-checkbox-grid">
                    {PAGE_SECTIONS.map(section => (
                        <label key={section.value} className="generator-config-checkbox-item">
                            <input
                                type="checkbox"
                                checked={(config.includeSections || []).includes(section.value)}
                                onChange={() => toggleSection(section.value)}
                            />
                            {section.label}
                        </label>
                    ))}
                </div>
            </div>
        </>
    );
}

// ============================================================================
// WEBSITE BUNDLE CONFIG
// ============================================================================

function WebsiteBundleConfig({ config, onChange }: {
    config: GeneratorConfigEntry;
    onChange: (updates: Partial<GeneratorConfigEntry>) => void;
}) {
    const pages = config.bundlePages || [];

    const addPage = () => {
        const newPage: BundlePage = {
            id: `page-${Date.now()}`,
            pageType: 'landing',
            slug: `page-${pages.length + 1}`,
            title: `Page ${pages.length + 1}`,
        };
        onChange({ bundlePages: [...pages, newPage] });
    };

    const updatePage = (id: string, updates: Partial<BundlePage>) => {
        const updated = pages.map(p =>
            p.id === id ? { ...p, ...updates } : p
        );
        onChange({ bundlePages: updated });
    };

    const removePage = (id: string) => {
        onChange({ bundlePages: pages.filter(p => p.id !== id) });
    };

    return (
        <>
            <div className="generator-config-section">
                <div className="generator-config-section-title">Bundle Settings</div>

                <div className="generator-config-row">
                    <div className="generator-config-field generator-config-field-half">
                        <label>Navigation Style</label>
                        <div className="generator-config-select-wrapper">
                            <select
                                value={config.navigationStyle}
                                onChange={(e) => onChange({ navigationStyle: e.target.value as any })}
                            >
                                {NAV_STYLES.map(ns => (
                                    <option key={ns.value} value={ns.value}>
                                        {ns.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="select-icon" />
                        </div>
                    </div>

                    <div className="generator-config-field generator-config-field-half">
                        <label>Link Strategy</label>
                        <div className="generator-config-select-wrapper">
                            <select
                                value={config.linkStrategy}
                                onChange={(e) => onChange({ linkStrategy: e.target.value as any })}
                            >
                                {LINK_STRATEGIES.map(ls => (
                                    <option key={ls.value} value={ls.value}>
                                        {ls.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="select-icon" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="generator-config-section">
                <div className="generator-config-section-header">
                    <div className="generator-config-section-title">Pages in Bundle</div>
                    <button
                        type="button"
                        className="generator-config-add-btn"
                        onClick={addPage}
                    >
                        <Plus size={14} />
                        Add Page
                    </button>
                </div>

                {pages.length === 0 && (
                    <div className="generator-config-empty">
                        No pages added. Click "Add Page" to build your bundle.
                    </div>
                )}

                <div className="generator-config-pages-list">
                    {pages.map((page, index) => (
                        <div key={page.id} className="generator-config-page-row">
                            <span className="page-number">{index + 1}</span>
                            <input
                                type="text"
                                value={page.title}
                                onChange={(e) => updatePage(page.id, { title: e.target.value })}
                                placeholder="Page Title"
                                className="page-title"
                            />
                            <div className="generator-config-select-wrapper page-type">
                                <select
                                    value={page.pageType}
                                    onChange={(e) => updatePage(page.id, { pageType: e.target.value })}
                                >
                                    {PAGE_TYPES.map(pt => (
                                        <option key={pt.value} value={pt.value}>
                                            {pt.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="select-icon" />
                            </div>
                            <input
                                type="text"
                                value={page.slug}
                                onChange={(e) => updatePage(page.id, { slug: e.target.value })}
                                placeholder="/slug"
                                className="page-slug"
                            />
                            <button
                                type="button"
                                className="generator-config-remove-btn"
                                onClick={() => removePage(page.id)}
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
// SOCIAL POST CONFIG
// ============================================================================

function SocialPostConfig({ config, onChange }: {
    config: GeneratorConfigEntry;
    onChange: (updates: Partial<GeneratorConfigEntry>) => void;
}) {
    const togglePlatform = (platform: string) => {
        const current = config.platforms || [];
        const updated = current.includes(platform)
            ? current.filter(p => p !== platform)
            : [...current, platform];
        onChange({ platforms: updated });
    };

    return (
        <>
            <div className="generator-config-section">
                <div className="generator-config-section-title">Platforms</div>

                <div className="generator-config-checkbox-grid">
                    {SOCIAL_PLATFORMS.map(platform => (
                        <label key={platform.value} className="generator-config-checkbox-item">
                            <input
                                type="checkbox"
                                checked={(config.platforms || []).includes(platform.value)}
                                onChange={() => togglePlatform(platform.value)}
                            />
                            {platform.label}
                        </label>
                    ))}
                </div>
            </div>

            <div className="generator-config-section">
                <div className="generator-config-section-title">Post Style</div>

                <div className="generator-config-row">
                    <div className="generator-config-field generator-config-field-half">
                        <label>Post Length</label>
                        <div className="generator-config-select-wrapper">
                            <select
                                value={config.postLength}
                                onChange={(e) => onChange({ postLength: e.target.value as any })}
                            >
                                {POST_LENGTHS.map(pl => (
                                    <option key={pl.value} value={pl.value}>
                                        {pl.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="select-icon" />
                        </div>
                    </div>

                    <div className="generator-config-field generator-config-field-half">
                        <label>Emoji Level</label>
                        <div className="generator-config-select-wrapper">
                            <select
                                value={config.emojiLevel}
                                onChange={(e) => onChange({ emojiLevel: e.target.value as any })}
                            >
                                {EMOJI_LEVELS.map(el => (
                                    <option key={el.value} value={el.value}>
                                        {el.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="select-icon" />
                        </div>
                    </div>
                </div>

                <div className="generator-config-field generator-config-field-inline">
                    <label>
                        <input
                            type="checkbox"
                            checked={config.includeHashtags}
                            onChange={(e) => onChange({ includeHashtags: e.target.checked })}
                        />
                        Include Hashtags
                    </label>
                </div>

                {config.includeHashtags && (
                    <div className="generator-config-field">
                        <label>Number of Hashtags</label>
                        <input
                            type="number"
                            min={1}
                            max={30}
                            value={config.hashtagCount}
                            onChange={(e) => onChange({ hashtagCount: parseInt(e.target.value) || 5 })}
                        />
                    </div>
                )}

                <div className="generator-config-field generator-config-field-inline">
                    <label>
                        <input
                            type="checkbox"
                            checked={config.generateImagePrompt ?? false}
                            onChange={(e) => onChange({ generateImagePrompt: e.target.checked })}
                        />
                        Generate Image Prompt (for AI image creation)
                    </label>
                </div>
            </div>
        </>
    );
}

export default GeneratorConfig;
