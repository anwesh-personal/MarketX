/**
 * OUTPUT CONFIG COMPONENT
 * Configuration forms for output nodes (webhook, store, email, analytics)
 * 
 * PRODUCTION-READY with full field configuration
 * 
 * DESIGN PRINCIPLES:
 * - Theme-aware using CSS variables only
 * - No hardcoded colors or sizes
 * - Proper TypeScript types throughout
 * - Dynamic forms based on output type
 * 
 * @author Axiom AI
 */

import React, { useState, useCallback } from 'react';
import {
    Send, HardDrive, Mail, BarChart,
    ChevronDown, Plus, Trash2, Copy, Check,
    AlertTriangle, RefreshCw, Key, Globe, Clock
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface OutputConfigEntry {
    // Common fields
    enabled?: boolean;
    logOutput?: boolean;
    onError?: 'stop' | 'warn' | 'skip';

    // Webhook specific
    webhookUrl?: string;
    webhookMethod?: 'POST' | 'PUT' | 'PATCH';
    webhookHeaders?: WebhookHeader[];
    webhookAuth?: {
        type: 'none' | 'api_key' | 'bearer' | 'basic';
        headerName?: string;
        apiKey?: string;
        bearerToken?: string;
        username?: string;
        password?: string;
    };
    webhookBodyTemplate?: string;
    webhookRetries?: number;
    webhookTimeout?: number;

    // Database store specific
    storeTable?: string;
    storeMode?: 'insert' | 'upsert' | 'update';
    storeUpsertKey?: string;
    storeFieldMappings?: FieldMapping[];
    storeIncludeMetadata?: boolean;
    storeTimestampField?: string;

    // Email specific
    emailProvider?: 'resend' | 'sendgrid' | 'smtp' | 'postmark';
    emailTo?: string;
    emailCc?: string;
    emailBcc?: string;
    emailSubjectTemplate?: string;
    emailBodyTemplate?: string;
    emailFromName?: string;
    emailFromAddress?: string;
    emailReplyTo?: string;
    emailTrackOpens?: boolean;
    emailTrackClicks?: boolean;

    // Analytics specific
    analyticsProvider?: 'posthog' | 'amplitude' | 'mixpanel' | 'segment' | 'custom';
    analyticsEventName?: string;
    analyticsProperties?: AnalyticsProperty[];
    analyticsUserId?: string;
    analyticsDistinctId?: string;
    analyticsTimestamp?: boolean;
}

interface WebhookHeader {
    id: string;
    key: string;
    value: string;
}

interface FieldMapping {
    id: string;
    sourceField: string;
    targetColumn: string;
    transform?: 'none' | 'json_stringify' | 'to_string' | 'to_number' | 'to_boolean';
}

interface AnalyticsProperty {
    id: string;
    name: string;
    value: string;
    type: 'string' | 'number' | 'boolean' | 'json';
}

interface OutputConfigProps {
    nodeType: string;
    config: OutputConfigEntry;
    onChange: (config: OutputConfigEntry) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HTTP_METHODS = [
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'PATCH', label: 'PATCH' },
];

const AUTH_TYPES = [
    { value: 'none', label: 'No Authentication' },
    { value: 'api_key', label: 'API Key Header' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'basic', label: 'Basic Auth' },
];

const ERROR_ACTIONS = [
    { value: 'stop', label: 'Stop Workflow' },
    { value: 'warn', label: 'Warn & Continue' },
    { value: 'skip', label: 'Skip Output' },
];

const STORE_MODES = [
    { value: 'insert', label: 'Insert New Row', description: 'Always create new record' },
    { value: 'upsert', label: 'Upsert (Insert or Update)', description: 'Update if exists, insert if not' },
    { value: 'update', label: 'Update Only', description: 'Only update existing records' },
];

const STORE_TABLES = [
    { value: 'generated_content', label: 'Generated Content' },
    { value: 'workflow_outputs', label: 'Workflow Outputs' },
    { value: 'campaign_assets', label: 'Campaign Assets' },
    { value: 'email_drafts', label: 'Email Drafts' },
    { value: 'landing_pages', label: 'Landing Pages' },
    { value: 'custom', label: 'Custom Table...' },
];

const FIELD_TRANSFORMS = [
    { value: 'none', label: 'No Transform' },
    { value: 'json_stringify', label: 'JSON.stringify()' },
    { value: 'to_string', label: 'Convert to String' },
    { value: 'to_number', label: 'Convert to Number' },
    { value: 'to_boolean', label: 'Convert to Boolean' },
];

const EMAIL_PROVIDERS = [
    { value: 'resend', label: 'Resend', description: 'Modern email API' },
    { value: 'sendgrid', label: 'SendGrid', description: 'Enterprise email service' },
    { value: 'postmark', label: 'Postmark', description: 'Transactional email' },
    { value: 'smtp', label: 'SMTP', description: 'Custom SMTP server' },
];

const ANALYTICS_PROVIDERS = [
    { value: 'posthog', label: 'PostHog' },
    { value: 'amplitude', label: 'Amplitude' },
    { value: 'mixpanel', label: 'Mixpanel' },
    { value: 'segment', label: 'Segment' },
    { value: 'custom', label: 'Custom Endpoint' },
];

const PROPERTY_TYPES = [
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'json', label: 'JSON Object' },
];

// ============================================================================
// OUTPUT CONFIG COMPONENT
// ============================================================================

export function OutputConfig({ nodeType, config, onChange }: OutputConfigProps) {
    const safeConfig: OutputConfigEntry = {
        ...config,
        enabled: config.enabled ?? true,
        logOutput: config.logOutput ?? true,
        onError: config.onError || 'warn',
        // Webhook defaults
        webhookMethod: config.webhookMethod || 'POST',
        webhookHeaders: config.webhookHeaders || [],
        webhookAuth: config.webhookAuth || { type: 'none' },
        webhookRetries: config.webhookRetries ?? 3,
        webhookTimeout: config.webhookTimeout ?? 30000,
        // Store defaults
        storeTable: config.storeTable || 'generated_content',
        storeMode: config.storeMode || 'insert',
        storeFieldMappings: config.storeFieldMappings || [],
        storeIncludeMetadata: config.storeIncludeMetadata ?? true,
        // Email defaults
        emailProvider: config.emailProvider || 'resend',
        emailTrackOpens: config.emailTrackOpens ?? true,
        emailTrackClicks: config.emailTrackClicks ?? true,
        // Analytics defaults
        analyticsProvider: config.analyticsProvider || 'posthog',
        analyticsProperties: config.analyticsProperties || [],
        analyticsTimestamp: config.analyticsTimestamp ?? true,
    };

    const updateConfig = useCallback((updates: Partial<OutputConfigEntry>) => {
        onChange({ ...safeConfig, ...updates });
    }, [safeConfig, onChange]);

    const getOutputIcon = () => {
        switch (nodeType) {
            case 'output-webhook': return Send;
            case 'output-store': return HardDrive;
            case 'output-email': return Mail;
            case 'output-analytics': return BarChart;
            default: return Send;
        }
    };

    const Icon = getOutputIcon();

    return (
        <div className="output-config">
            {/* Header */}
            <div className="output-config-header">
                <Icon size={18} className="output-config-icon" />
                <span>Output Configuration</span>
            </div>

            {/* Common Settings */}
            <div className="output-config-section">
                <div className="output-config-section-title">General Settings</div>

                <div className="output-config-row">
                    <div className="output-config-field output-config-field-half output-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={safeConfig.enabled}
                                onChange={(e) => updateConfig({ enabled: e.target.checked })}
                            />
                            Output Enabled
                        </label>
                    </div>

                    <div className="output-config-field output-config-field-half output-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={safeConfig.logOutput}
                                onChange={(e) => updateConfig({ logOutput: e.target.checked })}
                            />
                            Log Output Data
                        </label>
                    </div>
                </div>

                <div className="output-config-field">
                    <label>On Error</label>
                    <div className="output-config-select-wrapper">
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
            {nodeType === 'output-webhook' && (
                <WebhookConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'output-store' && (
                <StoreConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'output-email' && (
                <EmailConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'output-analytics' && (
                <AnalyticsConfig config={safeConfig} onChange={updateConfig} />
            )}
        </div>
    );
}

// ============================================================================
// WEBHOOK CONFIG
// ============================================================================

function WebhookConfig({ config, onChange }: {
    config: OutputConfigEntry;
    onChange: (updates: Partial<OutputConfigEntry>) => void;
}) {
    const headers = config.webhookHeaders || [];
    const auth = config.webhookAuth || { type: 'none' };

    const addHeader = () => {
        const newHeader: WebhookHeader = {
            id: `hdr-${Date.now()}`,
            key: '',
            value: '',
        };
        onChange({ webhookHeaders: [...headers, newHeader] });
    };

    const updateHeader = (id: string, updates: Partial<WebhookHeader>) => {
        const updated = headers.map(h => h.id === id ? { ...h, ...updates } : h);
        onChange({ webhookHeaders: updated });
    };

    const removeHeader = (id: string) => {
        onChange({ webhookHeaders: headers.filter(h => h.id !== id) });
    };

    const updateAuth = (updates: Partial<typeof auth>) => {
        onChange({ webhookAuth: { ...auth, ...updates } });
    };

    return (
        <>
            <div className="output-config-section">
                <div className="output-config-section-title">Webhook Endpoint</div>

                <div className="output-config-field">
                    <label>Webhook URL</label>
                    <input
                        type="text"
                        value={config.webhookUrl || ''}
                        onChange={(e) => onChange({ webhookUrl: e.target.value })}
                        placeholder="https://api.example.com/webhook"
                    />
                </div>

                <div className="output-config-row">
                    <div className="output-config-field output-config-field-third">
                        <label>Method</label>
                        <div className="output-config-select-wrapper">
                            <select
                                value={config.webhookMethod}
                                onChange={(e) => onChange({ webhookMethod: e.target.value as any })}
                            >
                                {HTTP_METHODS.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="select-icon" />
                        </div>
                    </div>

                    <div className="output-config-field output-config-field-third">
                        <label>Timeout (ms)</label>
                        <input
                            type="number"
                            min={1000}
                            max={120000}
                            value={config.webhookTimeout}
                            onChange={(e) => onChange({ webhookTimeout: parseInt(e.target.value) || 30000 })}
                        />
                    </div>

                    <div className="output-config-field output-config-field-third">
                        <label>Retries</label>
                        <input
                            type="number"
                            min={0}
                            max={10}
                            value={config.webhookRetries}
                            onChange={(e) => onChange({ webhookRetries: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                </div>
            </div>

            <div className="output-config-section">
                <div className="output-config-section-title">Authentication</div>

                <div className="output-config-field">
                    <label>Auth Type</label>
                    <div className="output-config-select-wrapper">
                        <select
                            value={auth.type}
                            onChange={(e) => updateAuth({ type: e.target.value as any })}
                        >
                            {AUTH_TYPES.map(at => (
                                <option key={at.value} value={at.value}>{at.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>

                {auth.type === 'api_key' && (
                    <div className="output-config-row">
                        <div className="output-config-field output-config-field-half">
                            <label>Header Name</label>
                            <input
                                type="text"
                                value={auth.headerName || ''}
                                onChange={(e) => updateAuth({ headerName: e.target.value })}
                                placeholder="X-API-Key"
                            />
                        </div>
                        <div className="output-config-field output-config-field-half">
                            <label>API Key</label>
                            <input
                                type="password"
                                value={auth.apiKey || ''}
                                onChange={(e) => updateAuth({ apiKey: e.target.value })}
                                placeholder="Enter API key..."
                            />
                        </div>
                    </div>
                )}

                {auth.type === 'bearer' && (
                    <div className="output-config-field">
                        <label>Bearer Token</label>
                        <input
                            type="password"
                            value={auth.bearerToken || ''}
                            onChange={(e) => updateAuth({ bearerToken: e.target.value })}
                            placeholder="Enter bearer token..."
                        />
                    </div>
                )}

                {auth.type === 'basic' && (
                    <div className="output-config-row">
                        <div className="output-config-field output-config-field-half">
                            <label>Username</label>
                            <input
                                type="text"
                                value={auth.username || ''}
                                onChange={(e) => updateAuth({ username: e.target.value })}
                            />
                        </div>
                        <div className="output-config-field output-config-field-half">
                            <label>Password</label>
                            <input
                                type="password"
                                value={auth.password || ''}
                                onChange={(e) => updateAuth({ password: e.target.value })}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="output-config-section">
                <div className="output-config-section-header">
                    <div className="output-config-section-title">Custom Headers</div>
                    <button
                        type="button"
                        className="output-config-add-btn"
                        onClick={addHeader}
                    >
                        <Plus size={14} />
                        Add Header
                    </button>
                </div>

                {headers.length === 0 && (
                    <div className="output-config-empty">
                        No custom headers. Content-Type: application/json is sent by default.
                    </div>
                )}

                <div className="output-config-list">
                    {headers.map((header) => (
                        <div key={header.id} className="output-config-header-row">
                            <input
                                type="text"
                                value={header.key}
                                onChange={(e) => updateHeader(header.id, { key: e.target.value })}
                                placeholder="Header name"
                                className="header-key"
                            />
                            <input
                                type="text"
                                value={header.value}
                                onChange={(e) => updateHeader(header.id, { value: e.target.value })}
                                placeholder="Header value"
                                className="header-value"
                            />
                            <button
                                type="button"
                                className="output-config-remove-btn"
                                onClick={() => removeHeader(header.id)}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="output-config-section">
                <div className="output-config-section-title">Request Body Template</div>

                <div className="output-config-field">
                    <label>Body Template (JSON with variables)</label>
                    <textarea
                        value={config.webhookBodyTemplate || ''}
                        onChange={(e) => onChange({ webhookBodyTemplate: e.target.value })}
                        rows={6}
                        placeholder={`{
  "content": "{{lastNodeOutput.content}}",
  "metadata": {{JSON.stringify(lastNodeOutput.aiMetadata)}},
  "workflow_id": "{{executionId}}",
  "timestamp": "{{new Date().toISOString()}}"
}`}
                        className="output-config-code"
                    />
                    <div className="output-config-hint">
                        Use <code>{'{{variable}}'}</code> for dynamic values. Available: lastNodeOutput, nodeOutputs, userInput, executionId
                    </div>
                </div>
            </div>
        </>
    );
}

// ============================================================================
// STORE CONFIG
// ============================================================================

function StoreConfig({ config, onChange }: {
    config: OutputConfigEntry;
    onChange: (updates: Partial<OutputConfigEntry>) => void;
}) {
    const [customTable, setCustomTable] = useState('');
    const mappings = config.storeFieldMappings || [];

    const addMapping = () => {
        const newMapping: FieldMapping = {
            id: `map-${Date.now()}`,
            sourceField: '',
            targetColumn: '',
            transform: 'none',
        };
        onChange({ storeFieldMappings: [...mappings, newMapping] });
    };

    const updateMapping = (id: string, updates: Partial<FieldMapping>) => {
        const updated = mappings.map(m => m.id === id ? { ...m, ...updates } : m);
        onChange({ storeFieldMappings: updated });
    };

    const removeMapping = (id: string) => {
        onChange({ storeFieldMappings: mappings.filter(m => m.id !== id) });
    };

    return (
        <>
            <div className="output-config-section">
                <div className="output-config-section-title">Database Settings</div>

                <div className="output-config-field">
                    <label>Target Table</label>
                    <div className="output-config-select-wrapper">
                        <select
                            value={config.storeTable}
                            onChange={(e) => {
                                if (e.target.value === 'custom') {
                                    onChange({ storeTable: customTable || 'custom_table' });
                                } else {
                                    onChange({ storeTable: e.target.value });
                                }
                            }}
                        >
                            {STORE_TABLES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>

                {config.storeTable === 'custom' && (
                    <div className="output-config-field">
                        <label>Custom Table Name</label>
                        <input
                            type="text"
                            value={customTable}
                            onChange={(e) => {
                                setCustomTable(e.target.value);
                                onChange({ storeTable: e.target.value });
                            }}
                            placeholder="my_custom_table"
                        />
                    </div>
                )}

                <div className="output-config-field">
                    <label>Storage Mode</label>
                    <div className="output-config-mode-grid">
                        {STORE_MODES.map(mode => (
                            <button
                                key={mode.value}
                                type="button"
                                className={`output-config-mode-btn ${config.storeMode === mode.value ? 'active' : ''}`}
                                onClick={() => onChange({ storeMode: mode.value as any })}
                            >
                                <span className="mode-label">{mode.label}</span>
                                <span className="mode-desc">{mode.description}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {(config.storeMode === 'upsert' || config.storeMode === 'update') && (
                    <div className="output-config-field">
                        <label>Upsert Key Column</label>
                        <input
                            type="text"
                            value={config.storeUpsertKey || ''}
                            onChange={(e) => onChange({ storeUpsertKey: e.target.value })}
                            placeholder="e.g., execution_id or external_id"
                        />
                    </div>
                )}

                <div className="output-config-row">
                    <div className="output-config-field output-config-field-half output-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.storeIncludeMetadata}
                                onChange={(e) => onChange({ storeIncludeMetadata: e.target.checked })}
                            />
                            Include Execution Metadata
                        </label>
                    </div>

                    <div className="output-config-field output-config-field-half">
                        <label>Timestamp Column</label>
                        <input
                            type="text"
                            value={config.storeTimestampField || ''}
                            onChange={(e) => onChange({ storeTimestampField: e.target.value })}
                            placeholder="created_at"
                        />
                    </div>
                </div>
            </div>

            <div className="output-config-section">
                <div className="output-config-section-header">
                    <div className="output-config-section-title">Field Mappings</div>
                    <button
                        type="button"
                        className="output-config-add-btn"
                        onClick={addMapping}
                    >
                        <Plus size={14} />
                        Add Mapping
                    </button>
                </div>

                {mappings.length === 0 && (
                    <div className="output-config-empty">
                        No field mappings. The entire output will be stored as JSON in the 'content' column.
                    </div>
                )}

                <div className="output-config-list">
                    {mappings.map((mapping) => (
                        <div key={mapping.id} className="output-config-mapping-row">
                            <input
                                type="text"
                                value={mapping.sourceField}
                                onChange={(e) => updateMapping(mapping.id, { sourceField: e.target.value })}
                                placeholder="lastNodeOutput.content"
                                className="mapping-source"
                            />
                            <span className="mapping-arrow">→</span>
                            <input
                                type="text"
                                value={mapping.targetColumn}
                                onChange={(e) => updateMapping(mapping.id, { targetColumn: e.target.value })}
                                placeholder="column_name"
                                className="mapping-target"
                            />
                            <div className="output-config-select-wrapper mapping-transform">
                                <select
                                    value={mapping.transform}
                                    onChange={(e) => updateMapping(mapping.id, { transform: e.target.value as any })}
                                >
                                    {FIELD_TRANSFORMS.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="select-icon" />
                            </div>
                            <button
                                type="button"
                                className="output-config-remove-btn"
                                onClick={() => removeMapping(mapping.id)}
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
// EMAIL CONFIG
// ============================================================================

function EmailConfig({ config, onChange }: {
    config: OutputConfigEntry;
    onChange: (updates: Partial<OutputConfigEntry>) => void;
}) {
    return (
        <>
            <div className="output-config-section">
                <div className="output-config-section-title">Email Provider</div>

                <div className="output-config-provider-grid">
                    {EMAIL_PROVIDERS.map(provider => (
                        <button
                            key={provider.value}
                            type="button"
                            className={`output-config-provider-btn ${config.emailProvider === provider.value ? 'active' : ''}`}
                            onClick={() => onChange({ emailProvider: provider.value as any })}
                        >
                            <span className="provider-label">{provider.label}</span>
                            <span className="provider-desc">{provider.description}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="output-config-section">
                <div className="output-config-section-title">Sender Settings</div>

                <div className="output-config-row">
                    <div className="output-config-field output-config-field-half">
                        <label>From Name</label>
                        <input
                            type="text"
                            value={config.emailFromName || ''}
                            onChange={(e) => onChange({ emailFromName: e.target.value })}
                            placeholder="Your Company"
                        />
                    </div>
                    <div className="output-config-field output-config-field-half">
                        <label>From Address</label>
                        <input
                            type="email"
                            value={config.emailFromAddress || ''}
                            onChange={(e) => onChange({ emailFromAddress: e.target.value })}
                            placeholder="noreply@yourcompany.com"
                        />
                    </div>
                </div>

                <div className="output-config-field">
                    <label>Reply-To Address</label>
                    <input
                        type="email"
                        value={config.emailReplyTo || ''}
                        onChange={(e) => onChange({ emailReplyTo: e.target.value })}
                        placeholder="support@yourcompany.com (optional)"
                    />
                </div>
            </div>

            <div className="output-config-section">
                <div className="output-config-section-title">Recipients</div>

                <div className="output-config-field">
                    <label>To (comma-separated or variable)</label>
                    <input
                        type="text"
                        value={config.emailTo || ''}
                        onChange={(e) => onChange({ emailTo: e.target.value })}
                        placeholder="{{userInput.email}} or email@example.com"
                    />
                </div>

                <div className="output-config-row">
                    <div className="output-config-field output-config-field-half">
                        <label>CC</label>
                        <input
                            type="text"
                            value={config.emailCc || ''}
                            onChange={(e) => onChange({ emailCc: e.target.value })}
                            placeholder="Optional"
                        />
                    </div>
                    <div className="output-config-field output-config-field-half">
                        <label>BCC</label>
                        <input
                            type="text"
                            value={config.emailBcc || ''}
                            onChange={(e) => onChange({ emailBcc: e.target.value })}
                            placeholder="Optional"
                        />
                    </div>
                </div>
            </div>

            <div className="output-config-section">
                <div className="output-config-section-title">Email Content</div>

                <div className="output-config-field">
                    <label>Subject Line</label>
                    <input
                        type="text"
                        value={config.emailSubjectTemplate || ''}
                        onChange={(e) => onChange({ emailSubjectTemplate: e.target.value })}
                        placeholder="{{lastNodeOutput.content.subject}} or static subject"
                    />
                </div>

                <div className="output-config-field">
                    <label>Body Template (HTML)</label>
                    <textarea
                        value={config.emailBodyTemplate || ''}
                        onChange={(e) => onChange({ emailBodyTemplate: e.target.value })}
                        rows={8}
                        placeholder={`{{lastNodeOutput.content.body}}

Or use a full HTML template with variables:
<html>
  <body>
    <h1>Hello {{userInput.name}}</h1>
    <div>{{lastNodeOutput.content.body}}</div>
  </body>
</html>`}
                        className="output-config-code"
                    />
                </div>
            </div>

            <div className="output-config-section">
                <div className="output-config-section-title">Tracking</div>

                <div className="output-config-row">
                    <div className="output-config-field output-config-field-half output-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.emailTrackOpens}
                                onChange={(e) => onChange({ emailTrackOpens: e.target.checked })}
                            />
                            Track Opens
                        </label>
                    </div>

                    <div className="output-config-field output-config-field-half output-config-field-inline">
                        <label>
                            <input
                                type="checkbox"
                                checked={config.emailTrackClicks}
                                onChange={(e) => onChange({ emailTrackClicks: e.target.checked })}
                            />
                            Track Link Clicks
                        </label>
                    </div>
                </div>
            </div>
        </>
    );
}

// ============================================================================
// ANALYTICS CONFIG
// ============================================================================

function AnalyticsConfig({ config, onChange }: {
    config: OutputConfigEntry;
    onChange: (updates: Partial<OutputConfigEntry>) => void;
}) {
    const properties = config.analyticsProperties || [];

    const addProperty = () => {
        const newProp: AnalyticsProperty = {
            id: `prop-${Date.now()}`,
            name: '',
            value: '',
            type: 'string',
        };
        onChange({ analyticsProperties: [...properties, newProp] });
    };

    const updateProperty = (id: string, updates: Partial<AnalyticsProperty>) => {
        const updated = properties.map(p => p.id === id ? { ...p, ...updates } : p);
        onChange({ analyticsProperties: updated });
    };

    const removeProperty = (id: string) => {
        onChange({ analyticsProperties: properties.filter(p => p.id !== id) });
    };

    return (
        <>
            <div className="output-config-section">
                <div className="output-config-section-title">Analytics Provider</div>

                <div className="output-config-field">
                    <label>Provider</label>
                    <div className="output-config-select-wrapper">
                        <select
                            value={config.analyticsProvider}
                            onChange={(e) => onChange({ analyticsProvider: e.target.value as any })}
                        >
                            {ANALYTICS_PROVIDERS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>
            </div>

            <div className="output-config-section">
                <div className="output-config-section-title">Event Configuration</div>

                <div className="output-config-field">
                    <label>Event Name</label>
                    <input
                        type="text"
                        value={config.analyticsEventName || ''}
                        onChange={(e) => onChange({ analyticsEventName: e.target.value })}
                        placeholder="workflow_completed"
                    />
                </div>

                <div className="output-config-row">
                    <div className="output-config-field output-config-field-half">
                        <label>User ID Field</label>
                        <input
                            type="text"
                            value={config.analyticsUserId || ''}
                            onChange={(e) => onChange({ analyticsUserId: e.target.value })}
                            placeholder="{{executionUser.userId}}"
                        />
                    </div>

                    <div className="output-config-field output-config-field-half">
                        <label>Distinct ID (optional)</label>
                        <input
                            type="text"
                            value={config.analyticsDistinctId || ''}
                            onChange={(e) => onChange({ analyticsDistinctId: e.target.value })}
                            placeholder="{{userInput.session_id}}"
                        />
                    </div>
                </div>

                <div className="output-config-field output-config-field-inline">
                    <label>
                        <input
                            type="checkbox"
                            checked={config.analyticsTimestamp}
                            onChange={(e) => onChange({ analyticsTimestamp: e.target.checked })}
                        />
                        Include Timestamp
                    </label>
                </div>
            </div>

            <div className="output-config-section">
                <div className="output-config-section-header">
                    <div className="output-config-section-title">Event Properties</div>
                    <button
                        type="button"
                        className="output-config-add-btn"
                        onClick={addProperty}
                    >
                        <Plus size={14} />
                        Add Property
                    </button>
                </div>

                {properties.length === 0 && (
                    <div className="output-config-empty">
                        No custom properties. Add properties to enrich your analytics events.
                    </div>
                )}

                <div className="output-config-list">
                    {properties.map((prop) => (
                        <div key={prop.id} className="output-config-property-row">
                            <input
                                type="text"
                                value={prop.name}
                                onChange={(e) => updateProperty(prop.id, { name: e.target.value })}
                                placeholder="property_name"
                                className="property-name"
                            />
                            <div className="output-config-select-wrapper property-type">
                                <select
                                    value={prop.type}
                                    onChange={(e) => updateProperty(prop.id, { type: e.target.value as any })}
                                >
                                    {PROPERTY_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="select-icon" />
                            </div>
                            <input
                                type="text"
                                value={prop.value}
                                onChange={(e) => updateProperty(prop.id, { value: e.target.value })}
                                placeholder="{{lastNodeOutput.content}}"
                                className="property-value"
                            />
                            <button
                                type="button"
                                className="output-config-remove-btn"
                                onClick={() => removeProperty(prop.id)}
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

export default OutputConfig;
