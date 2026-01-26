/**
 * TRIGGER CONFIG COMPONENT
 * Configuration forms for trigger nodes (webhook, schedule, manual, email)
 * 
 * DESIGN PRINCIPLES:
 * - Theme-aware using CSS variables only
 * - No hardcoded colors or sizes
 * - Proper TypeScript types throughout
 * - Dynamic forms based on trigger type
 * - Conditional field rendering
 * 
 * @author Axiom AI
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
    Webhook, Clock, Play, Mail,
    ChevronDown, Plus, Trash2, Info, Copy, Check,
    Key, Shield, Calendar, AlertCircle
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface InputField {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'email' | 'url' | 'select';
    required: boolean;
    defaultValue?: string;
    placeholder?: string;
    options?: { label: string; value: string }[];
}

export interface TriggerConfigEntry {
    // Webhook fields
    authType?: 'none' | 'api_key' | 'bearer' | 'hmac';
    apiKeyHeader?: string;
    apiKeyValue?: string;
    bearerToken?: string;
    hmacSecret?: string;
    payloadValidation?: boolean;
    expectedSchema?: Record<string, any>;

    // Schedule fields
    frequency?: 'hourly' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom';
    cronExpression?: string;
    timezone?: string;
    enabled?: boolean;

    // Manual fields
    inputFields?: InputField[];
    testMode?: boolean;
    testValues?: Record<string, any>;

    // Email fields
    mailboxId?: string;
    filterFrom?: string;
    filterSubject?: string;
    parseAttachments?: boolean;
    attachmentTypes?: string[];
    extractFields?: string[];
    autoReply?: boolean;
    autoReplyTemplate?: string;
}

interface TriggerConfigProps {
    nodeType: string;
    config: TriggerConfigEntry;
    onChange: (config: TriggerConfigEntry) => void;
}

// ============================================================================
// CONSTANTS - Guardrails only
// ============================================================================

const AUTH_TYPES = [
    { value: 'none', label: 'No Authentication', icon: Shield },
    { value: 'api_key', label: 'API Key', icon: Key },
    { value: 'bearer', label: 'Bearer Token', icon: Key },
    { value: 'hmac', label: 'HMAC Signature', icon: Shield },
];

const FREQUENCIES = [
    { value: 'hourly', label: 'Every Hour', cron: '0 * * * *' },
    { value: 'daily', label: 'Daily at 9 AM', cron: '0 9 * * *' },
    { value: 'weekdays', label: 'Weekdays at 9 AM', cron: '0 9 * * 1-5' },
    { value: 'weekly', label: 'Weekly on Monday', cron: '0 9 * * 1' },
    { value: 'monthly', label: 'Monthly on 1st', cron: '0 9 1 * *' },
    { value: 'custom', label: 'Custom (Cron)', cron: '' },
];

const TIMEZONES = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern (US)' },
    { value: 'America/Chicago', label: 'Central (US)' },
    { value: 'America/Denver', label: 'Mountain (US)' },
    { value: 'America/Los_Angeles', label: 'Pacific (US)' },
    { value: 'Europe/London', label: 'London (UK)' },
    { value: 'Europe/Paris', label: 'Paris (EU)' },
    { value: 'Europe/Berlin', label: 'Berlin (EU)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JP)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CN)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AU)' },
];

const INPUT_FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'url', label: 'URL' },
    { value: 'select', label: 'Dropdown' },
];

const EMAIL_EXTRACT_FIELDS = [
    { value: 'from', label: 'From Address' },
    { value: 'subject', label: 'Subject' },
    { value: 'body', label: 'Body Text' },
    { value: 'body_html', label: 'Body HTML' },
    { value: 'date', label: 'Date Received' },
    { value: 'attachments', label: 'Attachments' },
    { value: 'thread_id', label: 'Thread ID' },
];

const ATTACHMENT_TYPES = [
    { value: 'pdf', label: 'PDF' },
    { value: 'docx', label: 'Word (DOCX)' },
    { value: 'xlsx', label: 'Excel (XLSX)' },
    { value: 'csv', label: 'CSV' },
    { value: 'image', label: 'Images' },
    { value: 'any', label: 'Any Type' },
];

// ============================================================================
// TRIGGER CONFIG COMPONENT
// ============================================================================

export function TriggerConfig({ nodeType, config, onChange }: TriggerConfigProps) {
    const safeConfig: TriggerConfigEntry = {
        ...config,
        authType: config.authType || 'none',
        frequency: config.frequency || 'daily',
        timezone: config.timezone || 'UTC',
        enabled: config.enabled ?? true,
        inputFields: config.inputFields || [],
        parseAttachments: config.parseAttachments ?? true,
        extractFields: config.extractFields || ['from', 'subject', 'body'],
    };

    const updateConfig = useCallback((updates: Partial<TriggerConfigEntry>) => {
        onChange({ ...safeConfig, ...updates });
    }, [safeConfig, onChange]);

    const getTriggerIcon = () => {
        switch (nodeType) {
            case 'trigger-webhook': return Webhook;
            case 'trigger-schedule': return Clock;
            case 'trigger-manual': return Play;
            case 'trigger-email-inbound': return Mail;
            default: return Play;
        }
    };

    const Icon = getTriggerIcon();

    return (
        <div className="trigger-config">
            {/* Header */}
            <div className="trigger-config-header">
                <Icon size={18} className="trigger-config-icon" />
                <span>Trigger Configuration</span>
            </div>

            {/* Type-specific Settings */}
            {nodeType === 'trigger-webhook' && (
                <WebhookConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'trigger-schedule' && (
                <ScheduleConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'trigger-manual' && (
                <ManualConfig config={safeConfig} onChange={updateConfig} />
            )}
            {nodeType === 'trigger-email-inbound' && (
                <EmailConfig config={safeConfig} onChange={updateConfig} />
            )}
        </div>
    );
}

// ============================================================================
// WEBHOOK CONFIG
// ============================================================================

function WebhookConfig({ config, onChange }: {
    config: TriggerConfigEntry;
    onChange: (updates: Partial<TriggerConfigEntry>) => void;
}) {
    const [copied, setCopied] = useState(false);

    // Generate a mock webhook URL (in production, this would be from the backend)
    const webhookUrl = useMemo(() => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://api.axiom.ai';
        return `${baseUrl}/api/webhooks/wf-${Date.now().toString(36)}`;
    }, []);

    const copyUrl = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            {/* Webhook URL */}
            <div className="trigger-config-section">
                <div className="trigger-config-section-title">Webhook Endpoint</div>
                <div className="trigger-config-url-box">
                    <code>{webhookUrl}</code>
                    <button
                        type="button"
                        className="trigger-config-copy-btn"
                        onClick={copyUrl}
                        title="Copy URL"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                </div>
                <span className="trigger-config-hint">
                    Send POST requests to this URL to trigger the workflow
                </span>
            </div>

            {/* Authentication */}
            <div className="trigger-config-section">
                <div className="trigger-config-section-title">Authentication</div>

                <div className="trigger-config-field">
                    <label>Authentication Type</label>
                    <div className="trigger-config-select-wrapper">
                        <select
                            value={config.authType}
                            onChange={(e) => onChange({ authType: e.target.value as any })}
                        >
                            {AUTH_TYPES.map(auth => (
                                <option key={auth.value} value={auth.value}>
                                    {auth.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>

                {/* API Key Fields */}
                {config.authType === 'api_key' && (
                    <>
                        <div className="trigger-config-field">
                            <label>Header Name</label>
                            <input
                                type="text"
                                value={config.apiKeyHeader || ''}
                                onChange={(e) => onChange({ apiKeyHeader: e.target.value })}
                                placeholder="X-API-Key"
                            />
                        </div>
                        <div className="trigger-config-field">
                            <label>API Key Value</label>
                            <input
                                type="password"
                                value={config.apiKeyValue || ''}
                                onChange={(e) => onChange({ apiKeyValue: e.target.value })}
                                placeholder="Enter API key..."
                            />
                        </div>
                    </>
                )}

                {/* Bearer Token */}
                {config.authType === 'bearer' && (
                    <div className="trigger-config-field">
                        <label>Bearer Token</label>
                        <input
                            type="password"
                            value={config.bearerToken || ''}
                            onChange={(e) => onChange({ bearerToken: e.target.value })}
                            placeholder="Enter bearer token..."
                        />
                    </div>
                )}

                {/* HMAC Secret */}
                {config.authType === 'hmac' && (
                    <div className="trigger-config-field">
                        <label>HMAC Secret</label>
                        <input
                            type="password"
                            value={config.hmacSecret || ''}
                            onChange={(e) => onChange({ hmacSecret: e.target.value })}
                            placeholder="Enter HMAC secret..."
                        />
                        <span className="trigger-config-hint">
                            Signature will be validated using X-Webhook-Signature header
                        </span>
                    </div>
                )}
            </div>

            {/* Payload Validation */}
            <div className="trigger-config-section">
                <div className="trigger-config-section-title">Payload Settings</div>

                <div className="trigger-config-field trigger-config-field-inline">
                    <label>
                        <input
                            type="checkbox"
                            checked={config.payloadValidation || false}
                            onChange={(e) => onChange({ payloadValidation: e.target.checked })}
                        />
                        Validate Payload Schema
                    </label>
                </div>

                {config.payloadValidation && (
                    <div className="trigger-config-field">
                        <label>Expected JSON Schema</label>
                        <textarea
                            value={JSON.stringify(config.expectedSchema || {}, null, 2)}
                            onChange={(e) => {
                                try {
                                    onChange({ expectedSchema: JSON.parse(e.target.value) });
                                } catch { /* ignore parse errors while typing */ }
                            }}
                            rows={4}
                            placeholder='{ "type": "object", "properties": { ... } }'
                            spellCheck={false}
                        />
                    </div>
                )}
            </div>
        </>
    );
}

// ============================================================================
// SCHEDULE CONFIG
// ============================================================================

function ScheduleConfig({ config, onChange }: {
    config: TriggerConfigEntry;
    onChange: (updates: Partial<TriggerConfigEntry>) => void;
}) {
    const selectedFreq = FREQUENCIES.find(f => f.value === config.frequency);

    const handleFrequencyChange = (freq: string) => {
        const selected = FREQUENCIES.find(f => f.value === freq);
        onChange({
            frequency: freq as any,
            cronExpression: selected?.cron || config.cronExpression
        });
    };

    // Calculate next run (simplified - in production would use a proper cron parser)
    const nextRun = useMemo(() => {
        const now = new Date();
        // This is a simplified calculation - real implementation would parse cron
        const next = new Date(now);
        next.setMinutes(0);
        next.setSeconds(0);

        switch (config.frequency) {
            case 'hourly':
                next.setHours(now.getHours() + 1);
                break;
            case 'daily':
            case 'weekdays':
                next.setDate(now.getDate() + 1);
                next.setHours(9);
                break;
            case 'weekly':
                next.setDate(now.getDate() + (8 - now.getDay()) % 7);
                next.setHours(9);
                break;
            case 'monthly':
                next.setMonth(now.getMonth() + 1);
                next.setDate(1);
                next.setHours(9);
                break;
            default:
                break;
        }

        return next.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
        });
    }, [config.frequency, config.cronExpression]);

    return (
        <>
            {/* Enable/Disable */}
            <div className="trigger-config-section">
                <div className="trigger-config-field trigger-config-field-inline">
                    <label className={`trigger-config-toggle ${config.enabled ? 'active' : ''}`}>
                        <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={(e) => onChange({ enabled: e.target.checked })}
                        />
                        Schedule {config.enabled ? 'Enabled' : 'Disabled'}
                    </label>
                </div>
            </div>

            {/* Frequency */}
            <div className="trigger-config-section">
                <div className="trigger-config-section-title">Schedule</div>

                <div className="trigger-config-field">
                    <label>Frequency</label>
                    <div className="trigger-config-select-wrapper">
                        <select
                            value={config.frequency}
                            onChange={(e) => handleFrequencyChange(e.target.value)}
                        >
                            {FREQUENCIES.map(freq => (
                                <option key={freq.value} value={freq.value}>
                                    {freq.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>

                {/* Custom Cron */}
                {config.frequency === 'custom' && (
                    <div className="trigger-config-field">
                        <label>Cron Expression</label>
                        <input
                            type="text"
                            value={config.cronExpression || ''}
                            onChange={(e) => onChange({ cronExpression: e.target.value })}
                            placeholder="0 9 * * 1-5"
                        />
                        <span className="trigger-config-hint">
                            Format: minute hour day-of-month month day-of-week
                        </span>
                    </div>
                )}

                {/* Timezone */}
                <div className="trigger-config-field">
                    <label>Timezone</label>
                    <div className="trigger-config-select-wrapper">
                        <select
                            value={config.timezone}
                            onChange={(e) => onChange({ timezone: e.target.value })}
                        >
                            {TIMEZONES.map(tz => (
                                <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                </div>

                {/* Next Run Preview */}
                <div className="trigger-config-next-run">
                    <Calendar size={16} />
                    <span>Next run: <strong>{nextRun}</strong></span>
                </div>
            </div>
        </>
    );
}

// ============================================================================
// MANUAL CONFIG
// ============================================================================

function ManualConfig({ config, onChange }: {
    config: TriggerConfigEntry;
    onChange: (updates: Partial<TriggerConfigEntry>) => void;
}) {
    const fields = config.inputFields || [];

    const addField = () => {
        const newField: InputField = {
            name: `field_${fields.length + 1}`,
            label: `Field ${fields.length + 1}`,
            type: 'text',
            required: false,
            placeholder: ''
        };
        onChange({ inputFields: [...fields, newField] });
    };

    const updateField = (index: number, updates: Partial<InputField>) => {
        const updated = fields.map((f, i) =>
            i === index ? { ...f, ...updates } : f
        );
        onChange({ inputFields: updated });
    };

    const removeField = (index: number) => {
        onChange({ inputFields: fields.filter((_, i) => i !== index) });
    };

    return (
        <>
            {/* Input Fields */}
            <div className="trigger-config-section">
                <div className="trigger-config-section-header">
                    <div className="trigger-config-section-title">Input Form Fields</div>
                    <button
                        type="button"
                        className="trigger-config-add-btn"
                        onClick={addField}
                    >
                        <Plus size={14} />
                        Add Field
                    </button>
                </div>

                {fields.length === 0 && (
                    <div className="trigger-config-empty">
                        No input fields defined. Click "Add Field" to create form fields.
                    </div>
                )}

                <div className="trigger-config-fields-list">
                    {fields.map((field, index) => (
                        <div key={index} className="trigger-config-field-row">
                            <div className="trigger-config-field-row-inputs">
                                <input
                                    type="text"
                                    value={field.name}
                                    onChange={(e) => updateField(index, { name: e.target.value })}
                                    placeholder="variable_name"
                                    className="trigger-config-field-name"
                                />
                                <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => updateField(index, { label: e.target.value })}
                                    placeholder="Display Label"
                                    className="trigger-config-field-label"
                                />
                                <div className="trigger-config-select-wrapper trigger-config-field-type">
                                    <select
                                        value={field.type}
                                        onChange={(e) => updateField(index, { type: e.target.value as any })}
                                    >
                                        {INPUT_FIELD_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="select-icon" />
                                </div>
                                <label className="trigger-config-field-required">
                                    <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) => updateField(index, { required: e.target.checked })}
                                    />
                                    Required
                                </label>
                            </div>
                            <button
                                type="button"
                                className="trigger-config-remove-btn"
                                onClick={() => removeField(index)}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Test Mode */}
            <div className="trigger-config-section">
                <div className="trigger-config-section-title">Testing</div>

                <div className="trigger-config-field trigger-config-field-inline">
                    <label>
                        <input
                            type="checkbox"
                            checked={config.testMode || false}
                            onChange={(e) => onChange({ testMode: e.target.checked })}
                        />
                        Use Test Values (for development)
                    </label>
                </div>

                {config.testMode && (
                    <div className="trigger-config-field">
                        <label>Test Values (JSON)</label>
                        <textarea
                            value={JSON.stringify(config.testValues || {}, null, 2)}
                            onChange={(e) => {
                                try {
                                    onChange({ testValues: JSON.parse(e.target.value) });
                                } catch { /* ignore parse errors while typing */ }
                            }}
                            rows={4}
                            placeholder='{ "field_1": "test value" }'
                            spellCheck={false}
                        />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="trigger-config-info">
                <Info size={16} />
                <span>
                    These fields will appear as an input form when the workflow is triggered manually.
                </span>
            </div>
        </>
    );
}

// ============================================================================
// EMAIL CONFIG
// ============================================================================

function EmailConfig({ config, onChange }: {
    config: TriggerConfigEntry;
    onChange: (updates: Partial<TriggerConfigEntry>) => void;
}) {
    const toggleExtractField = (field: string) => {
        const current = config.extractFields || [];
        const updated = current.includes(field)
            ? current.filter(f => f !== field)
            : [...current, field];
        onChange({ extractFields: updated });
    };

    const toggleAttachmentType = (type: string) => {
        const current = config.attachmentTypes || [];
        const updated = current.includes(type)
            ? current.filter(t => t !== type)
            : [...current, type];
        onChange({ attachmentTypes: updated });
    };

    return (
        <>
            {/* Mailbox Selection */}
            <div className="trigger-config-section">
                <div className="trigger-config-section-title">Email Source</div>

                <div className="trigger-config-field">
                    <label>Mailbox</label>
                    <div className="trigger-config-select-wrapper">
                        <select
                            value={config.mailboxId || ''}
                            onChange={(e) => onChange({ mailboxId: e.target.value })}
                        >
                            <option value="">Select a mailbox...</option>
                            {/* In production, these would be fetched from API */}
                            <option value="inbox-primary">Primary Inbox</option>
                            <option value="inbox-support">Support Inbox</option>
                            <option value="inbox-sales">Sales Inbox</option>
                        </select>
                        <ChevronDown size={16} className="select-icon" />
                    </div>
                    <span className="trigger-config-hint">
                        Configure mailboxes in Settings → Email Connections
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="trigger-config-section">
                <div className="trigger-config-section-title">Filters</div>

                <div className="trigger-config-field">
                    <label>From Address Contains</label>
                    <input
                        type="text"
                        value={config.filterFrom || ''}
                        onChange={(e) => onChange({ filterFrom: e.target.value })}
                        placeholder="e.g., @company.com or support@"
                    />
                </div>

                <div className="trigger-config-field">
                    <label>Subject Contains</label>
                    <input
                        type="text"
                        value={config.filterSubject || ''}
                        onChange={(e) => onChange({ filterSubject: e.target.value })}
                        placeholder="e.g., [Urgent] or Request:"
                    />
                </div>
            </div>

            {/* Extract Fields */}
            <div className="trigger-config-section">
                <div className="trigger-config-section-title">Extract Fields</div>

                <div className="trigger-config-checkbox-grid">
                    {EMAIL_EXTRACT_FIELDS.map(field => (
                        <label key={field.value} className="trigger-config-checkbox-item">
                            <input
                                type="checkbox"
                                checked={(config.extractFields || []).includes(field.value)}
                                onChange={() => toggleExtractField(field.value)}
                            />
                            {field.label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Attachments */}
            <div className="trigger-config-section">
                <div className="trigger-config-section-title">Attachments</div>

                <div className="trigger-config-field trigger-config-field-inline">
                    <label>
                        <input
                            type="checkbox"
                            checked={config.parseAttachments}
                            onChange={(e) => onChange({ parseAttachments: e.target.checked })}
                        />
                        Parse and Include Attachments
                    </label>
                </div>

                {config.parseAttachments && (
                    <div className="trigger-config-checkbox-grid">
                        {ATTACHMENT_TYPES.map(type => (
                            <label key={type.value} className="trigger-config-checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={(config.attachmentTypes || []).includes(type.value)}
                                    onChange={() => toggleAttachmentType(type.value)}
                                />
                                {type.label}
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Auto Reply */}
            <div className="trigger-config-section">
                <div className="trigger-config-section-title">Auto Reply</div>

                <div className="trigger-config-field trigger-config-field-inline">
                    <label>
                        <input
                            type="checkbox"
                            checked={config.autoReply || false}
                            onChange={(e) => onChange({ autoReply: e.target.checked })}
                        />
                        Send Auto-Reply
                    </label>
                </div>

                {config.autoReply && (
                    <div className="trigger-config-field">
                        <label>Auto-Reply Template</label>
                        <textarea
                            value={config.autoReplyTemplate || ''}
                            onChange={(e) => onChange({ autoReplyTemplate: e.target.value })}
                            rows={4}
                            placeholder="Thank you for your email. We have received your request and will respond shortly..."
                        />
                        <span className="trigger-config-hint">
                            Use {'{{sender}}'} for sender name, {'{{subject}}'} for original subject
                        </span>
                    </div>
                )}
            </div>
        </>
    );
}

export default TriggerConfig;
