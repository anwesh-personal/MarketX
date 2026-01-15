'use client';

import React, { useState, useEffect } from 'react';
import {
    Settings as SettingsIcon,
    Save,
    Database,
    Mail,
    Shield,
    Zap,
    Bell,
    Globe,
    Lock,
    Key,
    Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SystemConfig {
    key: string;
    value: any;
    description: string;
}

export default function SettingsPage() {
    const [configs, setConfigs] = useState<Record<string, any>>({
        smtp_host: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        smtp_from_email: '',
        max_runs_per_day: 100,
        max_kb_size_mb: 50,
        enable_signups: true,
        require_email_verification: true,
        session_timeout_hours: 24,
        enable_audit_log: true,
        enable_rate_limiting: true,
        rate_limit_per_minute: 60,
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'email' | 'security' | 'limits'>('general');

    useEffect(() => {
        loadConfigs();
    }, []);

    const loadConfigs = async () => {
        try {
            const res = await fetch('/api/superadmin/settings');
            const data = await res.json();
            if (data.configs) {
                const configsMap: Record<string, any> = {};
                data.configs.forEach((config: SystemConfig) => {
                    configsMap[config.key] = config.value;
                });
                setConfigs({ ...configs, ...configsMap });
            }
        } catch (error) {
            console.error('Failed to load configs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/superadmin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ configs }),
            });

            if (!res.ok) throw new Error('Failed to save settings');

            toast.success('Settings saved successfully');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const updateConfig = (key: string, value: any) => {
        setConfigs(prev => ({ ...prev, [key]: value }));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-lg">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                        System Settings
                    </h1>
                    <p className="text-textSecondary">
                        Configure platform-wide system settings and preferences
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="
                        flex items-center gap-xs
                        bg-primary text-white
                        px-lg py-sm
                        rounded-[var(--radius-md)]
                        font-medium
                        hover:opacity-90
                        disabled:opacity-50
                        transition-all
                    "
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            <span>Save Changes</span>
                        </>
                    )}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-xs border-b border-border">
                {[
                    { id: 'general', label: 'General', icon: SettingsIcon },
                    { id: 'email', label: 'Email (SMTP)', icon: Mail },
                    { id: 'security', label: 'Security', icon: Shield },
                    { id: 'limits', label: 'Rate Limits', icon: Zap },
                ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                flex items-center gap-xs
                                px-md py-sm
                                border-b-2 transition-all
                                ${activeTab === tab.id
                                    ? 'border-primary text-primary font-medium'
                                    : 'border-transparent text-textSecondary hover:text-textPrimary'
                                }
                            `}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                {activeTab === 'general' && (
                    <div className="space-y-lg">
                        <h3 className="text-lg font-bold text-textPrimary flex items-center gap-sm">
                            <Globe className="w-5 h-5 text-primary" />
                            General Settings
                        </h3>

                        <div className="space-y-md">
                            <div>
                                <label className="flex items-center gap-sm mb-xs">
                                    <input
                                        type="checkbox"
                                        checked={configs.enable_signups}
                                        onChange={(e) => updateConfig('enable_signups', e.target.checked)}
                                        className="rounded border-border"
                                    />
                                    <span className="text-sm font-medium text-textPrimary">
                                        Enable Public Signups
                                    </span>
                                </label>
                                <p className="text-xs text-textSecondary ml-6">
                                    Allow new organizations to sign up without invitation
                                </p>
                            </div>

                            <div>
                                <label className="flex items-center gap-sm mb-xs">
                                    <input
                                        type="checkbox"
                                        checked={configs.require_email_verification}
                                        onChange={(e) => updateConfig('require_email_verification', e.target.checked)}
                                        className="rounded border-border"
                                    />
                                    <span className="text-sm font-medium text-textPrimary">
                                        Require Email Verification
                                    </span>
                                </label>
                                <p className="text-xs text-textSecondary ml-6">
                                    Users must verify their email before accessing the platform
                                </p>
                            </div>

                            <div>
                                <label className="flex items-center gap-sm mb-xs">
                                    <input
                                        type="checkbox"
                                        checked={configs.enable_audit_log}
                                        onChange={(e) => updateConfig('enable_audit_log', e.target.checked)}
                                        className="rounded border-border"
                                    />
                                    <span className="text-sm font-medium text-textPrimary">
                                        Enable Audit Logging
                                    </span>
                                </label>
                                <p className="text-xs text-textSecondary ml-6">
                                    Log all superadmin actions for security and compliance
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textPrimary mb-xs">
                                    Session Timeout (hours)
                                </label>
                                <input
                                    type="number"
                                    value={configs.session_timeout_hours}
                                    onChange={(e) => updateConfig('session_timeout_hours', parseInt(e.target.value))}
                                    className="
                                        w-full max-w-xs
                                        bg-background text-textPrimary
                                        border border-border rounded-[var(--radius-md)]
                                        px-sm py-xs
                                        focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    "
                                />
                                <p className="text-xs text-textSecondary mt-xs">
                                    Users will be logged out after this many hours of inactivity
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'email' && (
                    <div className="space-y-lg">
                        <h3 className="text-lg font-bold text-textPrimary flex items-center gap-sm">
                            <Mail className="w-5 h-5 text-info" />
                            Email Configuration (SMTP)
                        </h3>

                        <div className="space-y-md">
                            <div>
                                <label className="block text-sm font-medium text-textPrimary mb-xs">
                                    SMTP Host
                                </label>
                                <input
                                    type="text"
                                    value={configs.smtp_host}
                                    onChange={(e) => updateConfig('smtp_host', e.target.value)}
                                    placeholder="smtp.gmail.com"
                                    className="
                                        w-full
                                        bg-background text-textPrimary
                                        border border-border rounded-[var(--radius-md)]
                                        px-sm py-xs
                                        focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    "
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-md">
                                <div>
                                    <label className="block text-sm font-medium text-textPrimary mb-xs">
                                        SMTP Port
                                    </label>
                                    <input
                                        type="number"
                                        value={configs.smtp_port}
                                        onChange={(e) => updateConfig('smtp_port', parseInt(e.target.value))}
                                        className="
                                            w-full
                                            bg-background text-textPrimary
                                            border border-border rounded-[var(--radius-md)]
                                            px-sm py-xs
                                            focus:outline-none focus:ring-2 focus:ring-borderFocus
                                        "
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-textPrimary mb-xs">
                                        From Email
                                    </label>
                                    <input
                                        type="email"
                                        value={configs.smtp_from_email}
                                        onChange={(e) => updateConfig('smtp_from_email', e.target.value)}
                                        placeholder="noreply@axiom.com"
                                        className="
                                            w-full
                                            bg-background text-textPrimary
                                            border border-border rounded-[var(--radius-md)]
                                            px-sm py-xs
                                            focus:outline-none focus:ring-2 focus:ring-borderFocus
                                        "
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textPrimary mb-xs">
                                    SMTP Username
                                </label>
                                <input
                                    type="text"
                                    value={configs.smtp_username}
                                    onChange={(e) => updateConfig('smtp_username', e.target.value)}
                                    className="
                                        w-full
                                        bg-background text-textPrimary
                                        border border-border rounded-[var(--radius-md)]
                                        px-sm py-xs
                                        focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    "
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textPrimary mb-xs">
                                    SMTP Password
                                </label>
                                <input
                                    type="password"
                                    value={configs.smtp_password}
                                    onChange={(e) => updateConfig('smtp_password', e.target.value)}
                                    className="
                                        w-full
                                        bg-background text-textPrimary
                                        border border-border rounded-[var(--radius-md)]
                                        px-sm py-xs
                                        focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    "
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="space-y-lg">
                        <h3 className="text-lg font-bold text-textPrimary flex items-center gap-sm">
                            <Shield className="w-5 h-5 text-warning" />
                            Security Settings
                        </h3>

                        <div className="space-y-md">
                            <div>
                                <label className="flex items-center gap-sm mb-xs">
                                    <input
                                        type="checkbox"
                                        checked={configs.enable_rate_limiting}
                                        onChange={(e) => updateConfig('enable_rate_limiting', e.target.checked)}
                                        className="rounded border-border"
                                    />
                                    <span className="text-sm font-medium text-textPrimary">
                                        Enable Rate Limiting
                                    </span>
                                </label>
                                <p className="text-xs text-textSecondary ml-6">
                                    Protect API endpoints from abuse with rate limiting
                                </p>
                            </div>

                            <div className="bg-warning/10 border border-warning/20 rounded-[var(--radius-md)] p-md">
                                <div className="flex items-start gap-sm">
                                    <Lock className="w-5 h-5 text-warning flex-shrink-0 mt-xs" />
                                    <div>
                                        <p className="text-sm font-medium text-warning mb-xs">
                                            Security Best Practices
                                        </p>
                                        <ul className="text-xs text-textSecondary space-y-xs list-disc list-inside">
                                            <li>Always use HTTPS in production</li>
                                            <li>Rotate API keys regularly</li>
                                            <li>Enable audit logging for compliance</li>
                                            <li>Review superadmin access periodically</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'limits' && (
                    <div className="space-y-lg">
                        <h3 className="text-lg font-bold text-textPrimary flex items-center gap-sm">
                            <Zap className="w-5 h-5 text-accent" />
                            Rate Limits & Quotas
                        </h3>

                        <div className="space-y-md">
                            <div>
                                <label className="block text-sm font-medium text-textPrimary mb-xs">
                                    Max Runs per Day (per org)
                                </label>
                                <input
                                    type="number"
                                    value={configs.max_runs_per_day}
                                    onChange={(e) => updateConfig('max_runs_per_day', parseInt(e.target.value))}
                                    className="
                                        w-full max-w-xs
                                        bg-background text-textPrimary
                                        border border-border rounded-[var(--radius-md)]
                                        px-sm py-xs
                                        focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    "
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textPrimary mb-xs">
                                    Max Knowledge Base Size (MB)
                                </label>
                                <input
                                    type="number"
                                    value={configs.max_kb_size_mb}
                                    onChange={(e) => updateConfig('max_kb_size_mb', parseInt(e.target.value))}
                                    className="
                                        w-full max-w-xs
                                        bg-background text-textPrimary
                                        border border-border rounded-[var(--radius-md)]
                                        px-sm py-xs
                                        focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    "
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-textPrimary mb-xs">
                                    API Rate Limit (requests per minute)
                                </label>
                                <input
                                    type="number"
                                    value={configs.rate_limit_per_minute}
                                    onChange={(e) => updateConfig('rate_limit_per_minute', parseInt(e.target.value))}
                                    className="
                                        w-full max-w-xs
                                        bg-background text-textPrimary
                                        border border-border rounded-[var(--radius-md)]
                                        px-sm py-xs
                                        focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    "
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
