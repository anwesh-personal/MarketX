/**
 * ENRICHER CONFIG COMPONENT
 * Configuration forms for enricher nodes (web search, LinkedIn, CRM, email validation)
 * 
 * PRODUCTION-READY with full field configuration
 * 
 * DESIGN PRINCIPLES:
 * - Theme-aware using CSS variables only
 * - No hardcoded colors or sizes
 * - Proper TypeScript types throughout
 * - Dynamic forms based on enricher type
 * 
 * @author Axiom AI
 */

import React, { useState, useCallback } from 'react';
import {
    Search, Linkedin, Database, MailCheck,
    ChevronDown, Plus, Trash2, Globe, Building, User,
    RefreshCw, Shield, Clock, Zap
} from 'lucide-react';
import { AIConfig } from './AIConfig';

// ============================================================================
// TYPES
// ============================================================================

export interface EnricherConfigEntry {
    // AI Config (for AI-powered enrichers)
    aiConfig?: any[];
    systemPrompt?: string;

    // Common fields
    enabled?: boolean;
    cacheResults?: boolean;
    cacheDuration?: number;
    maxRetries?: number;
    timeout?: number;
    onError?: 'stop' | 'warn' | 'skip';

    // Web Search specific
    searchProvider?: 'serpapi' | 'tavily' | 'brave' | 'google';
    searchQuery?: string;
    searchDepth?: 'quick' | 'standard' | 'deep';
    maxResults?: number;
    includeSnippets?: boolean;
    includeDomains?: string[];
    excludeDomains?: string[];
    dateRestrict?: 'any' | 'day' | 'week' | 'month' | 'year';
    summarizeResults?: boolean;

    // LinkedIn specific
    linkedinProvider?: 'proxycurl' | 'phantombuster' | 'custom';
    linkedinField?: string;
    enrichProfile?: boolean;
    enrichCompany?: boolean;
    profileFields?: string[];
    companyFields?: string[];

    // CRM specific
    crmProvider?: 'salesforce' | 'hubspot' | 'pipedrive' | 'custom';
    crmObject?: 'contact' | 'company' | 'deal' | 'lead';
    lookupField?: string;
    lookupValue?: string;
    fieldsToFetch?: string[];
    createIfMissing?: boolean;
    updateOnMatch?: boolean;

    // Email Validation specific
    emailProvider?: 'zerobounce' | 'neverbounce' | 'hunter' | 'mailgun';
    emailField?: string;
    checkMxRecords?: boolean;
    checkSmtpDeliverable?: boolean;
    checkDisposable?: boolean;
    checkRoleAccount?: boolean;
    checkFreeProvider?: boolean;
    rejectDisposable?: boolean;
    rejectInvalid?: boolean;
    enrichWithCompanyData?: boolean;
}

interface EnricherConfigProps {
    nodeType: string;
    config: EnricherConfigEntry;
    onChange: (config: EnricherConfigEntry) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ERROR_ACTIONS = [
    { value: 'stop', label: 'Stop Workflow' },
    { value: 'warn', label: 'Warn & Continue' },
    { value: 'skip', label: 'Skip Enrichment' },
];

const SEARCH_PROVIDERS = [
    { value: 'tavily', label: 'Tavily', description: 'AI-optimized search' },
    { value: 'serpapi', label: 'SerpAPI', description: 'Google results API' },
    { value: 'brave', label: 'Brave Search', description: 'Privacy-focused' },
    { value: 'google', label: 'Google Custom Search', description: 'Direct Google API' },
];

const SEARCH_DEPTHS = [
    { value: 'quick', label: 'Quick', description: '3-5 results, fast' },
    { value: 'standard', label: 'Standard', description: '10 results, balanced' },
    { value: 'deep', label: 'Deep Research', description: '20+ results, thorough' },
];

const DATE_RESTRICTS = [
    { value: 'any', label: 'Any Time' },
    { value: 'day', label: 'Past 24 Hours' },
    { value: 'week', label: 'Past Week' },
    { value: 'month', label: 'Past Month' },
    { value: 'year', label: 'Past Year' },
];

const LINKEDIN_PROVIDERS = [
    { value: 'proxycurl', label: 'Proxycurl', description: 'Reliable API access' },
    { value: 'phantombuster', label: 'PhantomBuster', description: 'Automation platform' },
    { value: 'custom', label: 'Custom Endpoint', description: 'Your own scraper' },
];

const PROFILE_FIELDS = [
    { value: 'full_name', label: 'Full Name' },
    { value: 'headline', label: 'Headline' },
    { value: 'summary', label: 'Summary' },
    { value: 'experience', label: 'Experience' },
    { value: 'education', label: 'Education' },
    { value: 'skills', label: 'Skills' },
    { value: 'location', label: 'Location' },
    { value: 'connections', label: 'Connections Count' },
];

const COMPANY_FIELDS = [
    { value: 'name', label: 'Company Name' },
    { value: 'industry', label: 'Industry' },
    { value: 'size', label: 'Company Size' },
    { value: 'website', label: 'Website' },
    { value: 'description', label: 'Description' },
    { value: 'headquarters', label: 'Headquarters' },
    { value: 'founded', label: 'Founded Year' },
    { value: 'specialties', label: 'Specialties' },
];

const CRM_PROVIDERS = [
    { value: 'hubspot', label: 'HubSpot', description: 'Marketing & Sales CRM' },
    { value: 'salesforce', label: 'Salesforce', description: 'Enterprise CRM' },
    { value: 'pipedrive', label: 'Pipedrive', description: 'Sales-focused CRM' },
    { value: 'custom', label: 'Custom CRM', description: 'REST API endpoint' },
];

const CRM_OBJECTS = [
    { value: 'contact', label: 'Contact' },
    { value: 'company', label: 'Company' },
    { value: 'deal', label: 'Deal' },
    { value: 'lead', label: 'Lead' },
];

const EMAIL_PROVIDERS = [
    { value: 'zerobounce', label: 'ZeroBounce', description: '99% accuracy' },
    { value: 'neverbounce', label: 'NeverBounce', description: 'Real-time validation' },
    { value: 'hunter', label: 'Hunter.io', description: 'Email finder + verify' },
    { value: 'mailgun', label: 'Mailgun', description: 'Integrated with sending' },
];

// ============================================================================
// ENRICHER CONFIG COMPONENT
// ============================================================================

export function EnricherConfig({ nodeType, config, onChange }: EnricherConfigProps) {
    const safeConfig: EnricherConfigEntry = {
        ...config,
        enabled: config.enabled ?? true,
        cacheResults: config.cacheResults ?? true,
        cacheDuration: config.cacheDuration ?? 86400, // 24 hours
        maxRetries: config.maxRetries ?? 3,
        timeout: config.timeout ?? 30000,
        onError: config.onError || 'warn',
        // Web search defaults
        searchProvider: config.searchProvider || 'tavily',
        searchDepth: config.searchDepth || 'standard',
        maxResults: config.maxResults ?? 10,
        includeSnippets: config.includeSnippets ?? true,
        includeDomains: config.includeDomains || [],
        excludeDomains: config.excludeDomains || [],
        dateRestrict: config.dateRestrict || 'any',
        summarizeResults: config.summarizeResults ?? true,
        // LinkedIn defaults
        linkedinProvider: config.linkedinProvider || 'proxycurl',
        enrichProfile: config.enrichProfile ?? true,
        enrichCompany: config.enrichCompany ?? false,
        profileFields: config.profileFields || ['full_name', 'headline', 'experience'],
        companyFields: config.companyFields || ['name', 'industry', 'size'],
        // CRM defaults
        crmProvider: config.crmProvider || 'hubspot',
        crmObject: config.crmObject || 'contact',
        fieldsToFetch: config.fieldsToFetch || [],
        createIfMissing: config.createIfMissing ?? false,
        updateOnMatch: config.updateOnMatch ?? false,
        // Email validation defaults
        emailProvider: config.emailProvider || 'zerobounce',
        checkMxRecords: config.checkMxRecords ?? true,
        checkSmtpDeliverable: config.checkSmtpDeliverable ?? true,
        checkDisposable: config.checkDisposable ?? true,
        checkRoleAccount: config.checkRoleAccount ?? false,
        checkFreeProvider: config.checkFreeProvider ?? false,
        rejectDisposable: config.rejectDisposable ?? true,
        rejectInvalid: config.rejectInvalid ?? true,
        enrichWithCompanyData: config.enrichWithCompanyData ?? false,
    };

    const updateConfig = useCallback((updates: Partial<EnricherConfigEntry>) => {
        onChange({ ...safeConfig, ...updates });
    }, [safeConfig, onChange]);

    const getEnricherIcon = () => {
        switch (nodeType) {
            case 'enrich-web-search': return Search;
            case 'enrich-linkedin': return Linkedin;
            case 'enrich-crm': return Database;
            case 'enrich-email-validation': return MailCheck;
            default: return Zap;
        }
    };

    const Icon = getEnricherIcon();
    const requiresAI = nodeType === 'enrich-web-search';

    return (
        <div className="enricher-config">
            {/* Header */}
            <div className="enricher-config-header">
                <Icon size={18} className="enricher-config-icon" />
                <span>Enricher Configuration</span>
            </div>

            {/* AI Config for web search */}
            {requiresAI && (
                <div className="enricher-config-ai-section">
                    <AIConfig
                        config={safeConfig.aiConfig || []}
                        onChange={(aiConfig) => updateConfig({ aiConfig })}
                        systemPrompt={safeConfig.systemPrompt || ''}
                        onSystemPromptChange={(systemPrompt) => updateConfig({ systemPrompt })}
                        systemPromptLabel="Research Instructions"
                    />
                </div>
            )}

            {/* Common Settings */}
            <div className="enricher-config-section">
                <div className="enricher-config-section-title">General Settings</div>

                <div className="enricher-config-row">
                    <div className="enricher-config-field enricher-config-field-half enricher-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={safeConfig.enabled}
                                onChange={(e) => updateConfig({ enabled: e.target.checked })}
                            />
                            Enrichment Enabled
                        </label>
                    </div>

                    <div className="enricher-config-field enricher-config-field-half enricher-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={safeConfig.cacheResults}
                                onChange={(e) => updateConfig({ cacheResults: e.target.checked })}
                            />
                            Cache Results
                        </label>
                    </div>
                </div>

                {safeConfig.cacheResults && (
                    <div className="enricher-config-field">
                        <label>Cache Duration (seconds)</label>
                        <input
                            type="number"
                            min={60}
                            max={604800}
                            value={safeConfig.cacheDuration}
                            onChange={(e) => updateConfig({ cacheDuration: parseInt(e.target.value) || 86400 })}
                        />
                        <div className="enricher-config-hint">
                            {safeConfig.cacheDuration! >= 86400
                                ? `${Math.floor(safeConfig.cacheDuration! / 86400)} day(s)`
                                : safeConfig.cacheDuration! >= 3600
                                    ? `${Math.floor(safeConfig.cacheDuration! / 3600)} hour(s)`
                                    : `${Math.floor(safeConfig.cacheDuration! / 60)} minute(s)`}
                        </div>
                    </div>
                )}

                <div className="enricher-config-row">
                    <div className="enricher-config-field enricher-config-field-third">
                        <label>Timeout (ms)</label>
                        <input
                            type="number"
                            min={5000}
                            max={120000}
                            value={safeConfig.timeout}
                            onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) || 30000 })}
                        />
                    </div>

                    <div className="enricher-config-field enricher-config-field-third">
                        <label>Max Retries</label>
                        <input
                            type="number"
                            min={0}
                            max={5}
                            value={safeConfig.maxRetries}
                            onChange={(e) => updateConfig({ maxRetries: parseInt(e.target.value) || 0 })}
                        />
                    </div>

                    <div className="enricher-config-field enricher-config-field-third">
                        <label>On Error</label>
                        <div className="enricher-config-select-wrapper">
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

            {/* Type-specific Settings */}
            {nodeType === 'enrich-web-search' && (
                <WebSearchConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'enrich-linkedin' && (
                <LinkedInConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'enrich-crm' && (
                <CRMConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'enrich-email-validation' && (
                <EmailValidationConfig config={safeConfig} onChange={updateConfig} />
            )}
        </div>
    );
}

// ============================================================================
// WEB SEARCH CONFIG
// ============================================================================

function WebSearchConfig({ config, onChange }: {
    config: EnricherConfigEntry;
    onChange: (updates: Partial<EnricherConfigEntry>) => void;
}) {
    const [newIncludeDomain, setNewIncludeDomain] = useState('');
    const [newExcludeDomain, setNewExcludeDomain] = useState('');

    const addIncludeDomain = () => {
        if (newIncludeDomain.trim()) {
            onChange({
                includeDomains: [...(config.includeDomains || []), newIncludeDomain.trim()]
            });
            setNewIncludeDomain('');
        }
    };

    const addExcludeDomain = () => {
        if (newExcludeDomain.trim()) {
            onChange({
                excludeDomains: [...(config.excludeDomains || []), newExcludeDomain.trim()]
            });
            setNewExcludeDomain('');
        }
    };

    return (
        <>
            <div className="enricher-config-section">
                <div className="enricher-config-section-title">Search Provider</div>

                <div className="enricher-config-provider-grid">
                    {SEARCH_PROVIDERS.map(provider => (
                        <button
                            key={provider.value}
                            type="button"
                            className={`enricher-config-provider-btn ${config.searchProvider === provider.value ? 'active' : ''}`}
                            onClick={() => onChange({ searchProvider: provider.value as any })}
                        >
                            <span className="provider-label">{provider.label}</span>
                            <span className="provider-desc">{provider.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="enricher-config-section">
                <div className="enricher-config-section-title">Search Configuration</div>

                <div className="enricher-config-field">
                    <label>Search Query Template</label>
                    <input
                        type="text"
                        value={config.searchQuery || ''}
                        onChange={(e) => onChange({ searchQuery: e.target.value })}
                        placeholder="{{company_name}} {{industry}} latest news"
                    />
                    <div className="enricher-config-hint">
                        Use <code>{'{{variable}}'}</code> for dynamic values from previous nodes
                    </div>
                </div>

                <div className="enricher-config-field">
                    <label>Search Depth</label>
                    <div className="enricher-config-depth-grid">
                        {SEARCH_DEPTHS.map(depth => (
                            <button
                                key={depth.value}
                                type="button"
                                className={`enricher-config-depth-btn ${config.searchDepth === depth.value ? 'active' : ''}`}
                                onClick={() => onChange({ searchDepth: depth.value as any })}
                            >
                                <span className="depth-label">{depth.label}</span>
                                <span className="depth-desc">{depth.description}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="enricher-config-row">
                    <div className="enricher-config-field enricher-config-field-half">
                        <label>Max Results</label>
                        <input
                            type="number"
                            min={1}
                            max={50}
                            value={config.maxResults}
                            onChange={(e) => onChange({ maxResults: parseInt(e.target.value) || 10 })}
                        />
                    </div>

                    <div className="enricher-config-field enricher-config-field-half">
                        <label>Date Restriction</label>
                        <div className="enricher-config-select-wrapper">
                            <select
                                value={config.dateRestrict}
                                onChange={(e) => onChange({ dateRestrict: e.target.value as any })}
                            >
                                {DATE_RESTRICTS.map(dr => (
                                    <option key={dr.value} value={dr.value}>{dr.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="select-icon" />
                        </div>
                    </div>
                </div>

                <div className="enricher-config-row">
                    <div className="enricher-config-field enricher-config-field-half enricher-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.includeSnippets}
                                onChange={(e) => onChange({ includeSnippets: e.target.checked })}
                            />
                            Include Result Snippets
                        </label>
                    </div>

                    <div className="enricher-config-field enricher-config-field-half enricher-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.summarizeResults}
                                onChange={(e) => onChange({ summarizeResults: e.target.checked })}
                            />
                            AI Summarize Results
                        </label>
                    </div>
                </div>
            </div>

            <div className="enricher-config-section">
                <div className="enricher-config-section-title">Domain Filters</div>

                <div className="enricher-config-field">
                    <label>Include Only These Domains (optional)</label>
                    <div className="enricher-config-tag-input">
                        <input
                            type="text"
                            value={newIncludeDomain}
                            onChange={(e) => setNewIncludeDomain(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addIncludeDomain()}
                            placeholder="e.g., linkedin.com"
                        />
                        <button type="button" onClick={addIncludeDomain}>
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="enricher-config-tags">
                        {(config.includeDomains || []).map((domain, i) => (
                            <span key={i} className="enricher-config-tag include">
                                {domain}
                                <button
                                    type="button"
                                    onClick={() => onChange({
                                        includeDomains: config.includeDomains?.filter((_, idx) => idx !== i)
                                    })}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="enricher-config-field">
                    <label>Exclude These Domains</label>
                    <div className="enricher-config-tag-input">
                        <input
                            type="text"
                            value={newExcludeDomain}
                            onChange={(e) => setNewExcludeDomain(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addExcludeDomain()}
                            placeholder="e.g., pinterest.com"
                        />
                        <button type="button" onClick={addExcludeDomain}>
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="enricher-config-tags">
                        {(config.excludeDomains || []).map((domain, i) => (
                            <span key={i} className="enricher-config-tag exclude">
                                {domain}
                                <button
                                    type="button"
                                    onClick={() => onChange({
                                        excludeDomains: config.excludeDomains?.filter((_, idx) => idx !== i)
                                    })}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

// ============================================================================
// LINKEDIN CONFIG
// ============================================================================

function LinkedInConfig({ config, onChange }: {
    config: EnricherConfigEntry;
    onChange: (updates: Partial<EnricherConfigEntry>) => void;
}) {
    const toggleProfileField = (field: string) => {
        const current = config.profileFields || [];
        const updated = current.includes(field)
            ? current.filter(f => f !== field)
            : [...current, field];
        onChange({ profileFields: updated });
    };

    const toggleCompanyField = (field: string) => {
        const current = config.companyFields || [];
        const updated = current.includes(field)
            ? current.filter(f => f !== field)
            : [...current, field];
        onChange({ companyFields: updated });
    };

    return (
        <>
            <div className="enricher-config-section">
                <div className="enricher-config-section-title">LinkedIn Provider</div>

                <div className="enricher-config-provider-grid">
                    {LINKEDIN_PROVIDERS.map(provider => (
                        <button
                            key={provider.value}
                            type="button"
                            className={`enricher-config-provider-btn ${config.linkedinProvider === provider.value ? 'active' : ''}`}
                            onClick={() => onChange({ linkedinProvider: provider.value as any })}
                        >
                            <span className="provider-label">{provider.label}</span>
                            <span className="provider-desc">{provider.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="enricher-config-section">
                <div className="enricher-config-section-title">LinkedIn URL Source</div>

                <div className="enricher-config-field">
                    <label>LinkedIn Profile/Company URL Field</label>
                    <input
                        type="text"
                        value={config.linkedinField || ''}
                        onChange={(e) => onChange({ linkedinField: e.target.value })}
                        placeholder="{{lastNodeOutput.linkedin_url}} or {{userInput.profile_url}}"
                    />
                </div>
            </div>

            <div className="enricher-config-section">
                <div className="enricher-config-section-title">Enrichment Scope</div>

                <div className="enricher-config-row">
                    <div className="enricher-config-field enricher-config-field-half enricher-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.enrichProfile}
                                onChange={(e) => onChange({ enrichProfile: e.target.checked })}
                            />
                            Enrich Profile Data
                        </label>
                    </div>

                    <div className="enricher-config-field enricher-config-field-half enricher-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.enrichCompany}
                                onChange={(e) => onChange({ enrichCompany: e.target.checked })}
                            />
                            Enrich Company Data
                        </label>
                    </div>
                </div>
            </div>

            {config.enrichProfile && (
                <div className="enricher-config-section">
                    <div className="enricher-config-section-title">Profile Fields to Fetch</div>

                    <div className="enricher-config-checkbox-grid">
                        {PROFILE_FIELDS.map(field => (
                            <label key={field.value} className="enricher-config-checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={(config.profileFields || []).includes(field.value)}
                                    onChange={() => toggleProfileField(field.value)}
                                />
                                {field.label}
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {config.enrichCompany && (
                <div className="enricher-config-section">
                    <div className="enricher-config-section-title">Company Fields to Fetch</div>

                    <div className="enricher-config-checkbox-grid">
                        {COMPANY_FIELDS.map(field => (
                            <label key={field.value} className="enricher-config-checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={(config.companyFields || []).includes(field.value)}
                                    onChange={() => toggleCompanyField(field.value)}
                                />
                                {field.label}
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

// ============================================================================
// CRM CONFIG
// ============================================================================

function CRMConfig({ config, onChange }: {
    config: EnricherConfigEntry;
    onChange: (updates: Partial<EnricherConfigEntry>) => void;
}) {
    const [newField, setNewField] = useState('');

    const addField = () => {
        if (newField.trim()) {
            onChange({
                fieldsToFetch: [...(config.fieldsToFetch || []), newField.trim()]
            });
            setNewField('');
        }
    };

    return (
        <>
            <div className="enricher-config-section">
                <div className="enricher-config-section-title">CRM Provider</div>

                <div className="enricher-config-provider-grid">
                    {CRM_PROVIDERS.map(provider => (
                        <button
                            key={provider.value}
                            type="button"
                            className={`enricher-config-provider-btn ${config.crmProvider === provider.value ? 'active' : ''}`}
                            onClick={() => onChange({ crmProvider: provider.value as any })}
                        >
                            <span className="provider-label">{provider.label}</span>
                            <span className="provider-desc">{provider.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="enricher-config-section">
                <div className="enricher-config-section-title">CRM Object & Lookup</div>

                <div className="enricher-config-row">
                    <div className="enricher-config-field enricher-config-field-half">
                        <label>Object Type</label>
                        <div className="enricher-config-select-wrapper">
                            <select
                                value={config.crmObject}
                                onChange={(e) => onChange({ crmObject: e.target.value as any })}
                            >
                                {CRM_OBJECTS.map(obj => (
                                    <option key={obj.value} value={obj.value}>{obj.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="select-icon" />
                        </div>
                    </div>

                    <div className="enricher-config-field enricher-config-field-half">
                        <label>Lookup Field</label>
                        <input
                            type="text"
                            value={config.lookupField || ''}
                            onChange={(e) => onChange({ lookupField: e.target.value })}
                            placeholder="email"
                        />
                    </div>
                </div>

                <div className="enricher-config-field">
                    <label>Lookup Value</label>
                    <input
                        type="text"
                        value={config.lookupValue || ''}
                        onChange={(e) => onChange({ lookupValue: e.target.value })}
                        placeholder="{{lastNodeOutput.email}} or {{userInput.email}}"
                    />
                </div>
            </div>

            <div className="enricher-config-section">
                <div className="enricher-config-section-title">Fields to Fetch</div>

                <div className="enricher-config-tag-input">
                    <input
                        type="text"
                        value={newField}
                        onChange={(e) => setNewField(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addField()}
                        placeholder="Add field name..."
                    />
                    <button type="button" onClick={addField}>
                        <Plus size={16} />
                    </button>
                </div>

                <div className="enricher-config-tags">
                    {(config.fieldsToFetch || []).map((field, i) => (
                        <span key={i} className="enricher-config-tag field">
                            {field}
                            <button
                                type="button"
                                onClick={() => onChange({
                                    fieldsToFetch: config.fieldsToFetch?.filter((_, idx) => idx !== i)
                                })}
                            >
                                <Trash2 size={12} />
                            </button>
                        </span>
                    ))}
                </div>

                <div className="enricher-config-hint">
                    Leave empty to fetch all available fields
                </div>
            </div>

            <div className="enricher-config-section">
                <div className="enricher-config-section-title">Sync Behavior</div>

                <div className="enricher-config-row">
                    <div className="enricher-config-field enricher-config-field-half enricher-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.createIfMissing}
                                onChange={(e) => onChange({ createIfMissing: e.target.checked })}
                            />
                            Create If Missing
                        </label>
                    </div>

                    <div className="enricher-config-field enricher-config-field-half enricher-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.updateOnMatch}
                                onChange={(e) => onChange({ updateOnMatch: e.target.checked })}
                            />
                            Update On Match
                        </label>
                    </div>
                </div>
            </div>
        </>
    );
}

// ============================================================================
// EMAIL VALIDATION CONFIG
// ============================================================================

function EmailValidationConfig({ config, onChange }: {
    config: EnricherConfigEntry;
    onChange: (updates: Partial<EnricherConfigEntry>) => void;
}) {
    return (
        <>
            <div className="enricher-config-section">
                <div className="enricher-config-section-title">Validation Provider</div>

                <div className="enricher-config-provider-grid">
                    {EMAIL_PROVIDERS.map(provider => (
                        <button
                            key={provider.value}
                            type="button"
                            className={`enricher-config-provider-btn ${config.emailProvider === provider.value ? 'active' : ''}`}
                            onClick={() => onChange({ emailProvider: provider.value as any })}
                        >
                            <span className="provider-label">{provider.label}</span>
                            <span className="provider-desc">{provider.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="enricher-config-section">
                <div className="enricher-config-section-title">Email Source</div>

                <div className="enricher-config-field">
                    <label>Email Field</label>
                    <input
                        type="text"
                        value={config.emailField || ''}
                        onChange={(e) => onChange({ emailField: e.target.value })}
                        placeholder="{{lastNodeOutput.email}} or {{userInput.email}}"
                    />
                </div>
            </div>

            <div className="enricher-config-section">
                <div className="enricher-config-section-title">Validation Checks</div>

                <div className="enricher-config-checks-grid">
                    <label className="enricher-config-check-item">
                        <input
                            type="checkbox"
                            checked={config.checkMxRecords}
                            onChange={(e) => onChange({ checkMxRecords: e.target.checked })}
                        />
                        <div className="check-content">
                            <span className="check-label">MX Records</span>
                            <span className="check-desc">Verify domain can receive email</span>
                        </div>
                    </label>

                    <label className="enricher-config-check-item">
                        <input
                            type="checkbox"
                            checked={config.checkSmtpDeliverable}
                            onChange={(e) => onChange({ checkSmtpDeliverable: e.target.checked })}
                        />
                        <div className="check-content">
                            <span className="check-label">SMTP Deliverable</span>
                            <span className="check-desc">Test actual deliverability</span>
                        </div>
                    </label>

                    <label className="enricher-config-check-item">
                        <input
                            type="checkbox"
                            checked={config.checkDisposable}
                            onChange={(e) => onChange({ checkDisposable: e.target.checked })}
                        />
                        <div className="check-content">
                            <span className="check-label">Disposable Check</span>
                            <span className="check-desc">Detect temp/disposable emails</span>
                        </div>
                    </label>

                    <label className="enricher-config-check-item">
                        <input
                            type="checkbox"
                            checked={config.checkRoleAccount}
                            onChange={(e) => onChange({ checkRoleAccount: e.target.checked })}
                        />
                        <div className="check-content">
                            <span className="check-label">Role Account</span>
                            <span className="check-desc">Detect info@, support@, etc.</span>
                        </div>
                    </label>

                    <label className="enricher-config-check-item">
                        <input
                            type="checkbox"
                            checked={config.checkFreeProvider}
                            onChange={(e) => onChange({ checkFreeProvider: e.target.checked })}
                        />
                        <div className="check-content">
                            <span className="check-label">Free Provider</span>
                            <span className="check-desc">Detect Gmail, Yahoo, etc.</span>
                        </div>
                    </label>
                </div>
            </div>

            <div className="enricher-config-section">
                <div className="enricher-config-section-title">Rejection Rules</div>

                <div className="enricher-config-row">
                    <div className="enricher-config-field enricher-config-field-half enricher-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.rejectDisposable}
                                onChange={(e) => onChange({ rejectDisposable: e.target.checked })}
                            />
                            Reject Disposable Emails
                        </label>
                    </div>

                    <div className="enricher-config-field enricher-config-field-half enricher-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.rejectInvalid}
                                onChange={(e) => onChange({ rejectInvalid: e.target.checked })}
                            />
                            Reject Invalid Emails
                        </label>
                    </div>
                </div>
            </div>

            <div className="enricher-config-section">
                <div className="enricher-config-section-title">Additional Data</div>

                <div className="enricher-config-field enricher-config-field-inline">
                    <label>
                        <input
                            type="checkbox"
                            checked={config.enrichWithCompanyData}
                            onChange={(e) => onChange({ enrichWithCompanyData: e.target.checked })}
                        />
                        Enrich with Company Data (from domain)
                    </label>
                </div>
            </div>
        </>
    );
}

export default EnricherConfig;
