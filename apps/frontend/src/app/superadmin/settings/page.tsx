'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    AlertTriangle,
    CheckCircle,
    Globe,
    Loader2,
    Lock,
    Mail,
    RefreshCw,
    Save,
    Send,
    Settings as SettingsIcon,
    Shield,
    UserPlus,
    Users,
    Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'
import { DEFAULT_SUPERADMIN_SETTINGS } from '@/lib/config-defaults'
import {
    SuperadminBadge,
    SuperadminButton,
    SuperadminEmptyState,
    SuperadminErrorState,
    SuperadminInputShell,
    SuperadminLoadingState,
    SuperadminMetricCard,
    SuperadminPageHero,
    SuperadminPanel,
    SuperadminSegmentedControl,
    SuperadminToolbar,
} from '@/components/SuperAdmin/surfaces'

interface SystemConfigRow {
    key: string
    value: any
    description: string
}

interface AdminRecord {
    id: string
    email: string
    full_name: string | null
    is_active: boolean
    created_at: string
}

type SettingsTab = 'general' | 'email' | 'security' | 'limits' | 'admins'

const DEFAULT_CONFIGS: Record<string, any> = DEFAULT_SUPERADMIN_SETTINGS

const TAB_OPTIONS: Array<{ value: SettingsTab; label: string }> = [
    { value: 'general', label: 'General' },
    { value: 'email', label: 'Email' },
    { value: 'security', label: 'Security' },
    { value: 'limits', label: 'Limits' },
    { value: 'admins', label: 'Admins' },
]

function unwrapConfigValue(value: any) {
    if (value && typeof value === 'object' && 'value' in value) {
        return value.value
    }
    return value
}

export default function SettingsPage() {
    const { fetchWithAuth } = useSuperadminAuth()
    const [configs, setConfigs] = useState<Record<string, any>>(DEFAULT_CONFIGS)
    const [admins, setAdmins] = useState<AdminRecord[]>([])
    const [activeTab, setActiveTab] = useState<SettingsTab>('general')
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [creatingAdmin, setCreatingAdmin] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [newAdmin, setNewAdmin] = useState({ email: '', full_name: '', password: '' })
    const [loadedConfigKeys, setLoadedConfigKeys] = useState<string[]>([])
    const [configuredSecrets, setConfiguredSecrets] = useState<Record<string, boolean>>({})
    const [testingSmtp, setTestingSmtp] = useState(false)
    const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; error?: string; latencyMs?: number } | null>(null)

    const loadData = useCallback(async (refreshing = false) => {
        if (refreshing) setIsRefreshing(true)
        else setIsLoading(true)

        try {
            setError(null)

            const [settingsResponse, adminsResponse] = await Promise.all([
                fetchWithAuth('/api/superadmin/settings'),
                fetchWithAuth('/api/superadmin/admins'),
            ])
            const [settingsPayload, adminsPayload] = await Promise.all([
                settingsResponse.json(),
                adminsResponse.json(),
            ])

            if (!settingsResponse.ok) {
                throw new Error(settingsPayload.error || 'Failed to load settings')
            }
            if (!adminsResponse.ok) {
                throw new Error(adminsPayload.error || 'Failed to load admins')
            }

            const nextConfigs = { ...DEFAULT_CONFIGS }
            ;(settingsPayload.configs || []).forEach((config: SystemConfigRow) => {
                nextConfigs[config.key] = unwrapConfigValue(config.value)
            })

            setConfigs(nextConfigs)
            setAdmins(adminsPayload.admins || [])
            setLoadedConfigKeys((settingsPayload.configs || []).map((config: SystemConfigRow) => config.key))
            setConfiguredSecrets(settingsPayload.secret_status || {})
        } catch (loadError: any) {
            console.error('Failed to load settings:', loadError)
            setError(loadError?.message || 'Failed to load settings')
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }, [fetchWithAuth])

    useEffect(() => {
        loadData()
    }, [loadData])

    const updateConfig = (key: string, value: any) => {
        setConfigs((current) => ({ ...current, [key]: value }))
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const response = await fetchWithAuth('/api/superadmin/settings', {
                method: 'POST',
                body: JSON.stringify({ configs }),
            })
            const payload = await response.json()

            if (!response.ok) throw new Error(payload.error || 'Failed to save settings')

            toast.success('System settings saved')
        } catch (saveError: any) {
            toast.error(saveError?.message || 'Failed to save settings')
        } finally {
            setIsSaving(false)
        }
    }

    const createAdmin = async () => {
        if (!newAdmin.email || !newAdmin.password) {
            toast.error('Email and password are required')
            return
        }

        setCreatingAdmin(true)
        try {
            const response = await fetchWithAuth('/api/superadmin/admins', {
                method: 'POST',
                body: JSON.stringify(newAdmin),
            })
            const payload = await response.json()

            if (!response.ok) throw new Error(payload.error || 'Failed to create superadmin')

            toast.success('Superadmin created')
            setNewAdmin({ email: '', full_name: '', password: '' })
            loadData(true)
        } catch (createError: any) {
            toast.error(createError?.message || 'Failed to create superadmin')
        } finally {
            setCreatingAdmin(false)
        }
    }

    const summary = useMemo(() => ({
        signupsEnabled: configs.enable_signups ? 'Enabled' : 'Restricted',
        rateLimiting: configs.enable_rate_limiting ? 'Protected' : 'Disabled',
        sessionWindow: `${configs.session_timeout_hours}h`,
        activeAdmins: admins.filter((admin) => admin.is_active).length,
        defaultsInUse: Math.max(Object.keys(DEFAULT_CONFIGS).length - loadedConfigKeys.length, 0),
    }), [admins, configs, loadedConfigKeys.length])

    if (isLoading) {
        return <SuperadminLoadingState label="Loading Settings" />
    }

    if (error && admins.length === 0) {
        return (
            <SuperadminErrorState
                title="Settings command failed to load"
                description={error}
                action={<SuperadminButton icon={RefreshCw} onClick={() => loadData()}>Retry settings sync</SuperadminButton>}
            />
        )
    }

    return (
        <div className="space-y-lg">
            <SuperadminPageHero
                eyebrow="System Governance"
                title="Platform Settings Command"
                description="Shape signup policy, email delivery, security posture, platform limits, and superadmin access from a single premium control surface."
                actions={(
                    <>
                        <SuperadminButton icon={RefreshCw} onClick={() => loadData(true)}>
                            {isRefreshing ? 'Refreshing' : 'Refresh'}
                        </SuperadminButton>
                        <SuperadminButton tone="primary" icon={Save} onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving' : 'Save Changes'}
                        </SuperadminButton>
                    </>
                )}
            >
                <div className="flex flex-wrap gap-sm">
                    <SuperadminBadge tone="primary"><SettingsIcon className="h-3.5 w-3.5" /> Centralized system configuration</SuperadminBadge>
                    <SuperadminBadge tone="success"><Shield className="h-3.5 w-3.5" /> {summary.activeAdmins} active admins</SuperadminBadge>
                    <SuperadminBadge tone="info"><Mail className="h-3.5 w-3.5" /> SMTP + governance controls</SuperadminBadge>
                    {summary.defaultsInUse > 0 && (
                        <SuperadminBadge tone="warning"><Zap className="h-3.5 w-3.5" /> {summary.defaultsInUse} fallback defaults active</SuperadminBadge>
                    )}
                </div>
            </SuperadminPageHero>

            <div className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-4">
                <SuperadminMetricCard icon={Globe} label="Signups" value={summary.signupsEnabled} hint="Organization acquisition posture" tone="primary" />
                <SuperadminMetricCard icon={Shield} label="Rate Limiting" value={summary.rateLimiting} hint="Current abuse protection state" tone="warning" />
                <SuperadminMetricCard icon={Lock} label="Session Window" value={summary.sessionWindow} hint="Timeout for authenticated access" tone="accent" />
                <SuperadminMetricCard icon={Users} label="Active Admins" value={String(summary.activeAdmins)} hint="People holding platform-level authority" tone="success" />
            </div>

            <SuperadminToolbar>
                <div className="flex flex-col gap-xs">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">
                        Control domain
                    </p>
                    <SuperadminSegmentedControl value={activeTab} onChange={setActiveTab} options={TAB_OPTIONS} />
                </div>
                <div className="text-sm text-textSecondary">
                    Config is persisted through a dedicated superadmin API, not a disconnected form shell.
                </div>
            </SuperadminToolbar>

            {activeTab === 'general' && (
                <SuperadminPanel
                    title="General Platform Controls"
                    description="Set acquisition, verification, session, and audit posture for the product."
                    tone="primary"
                >
                    <div className="grid grid-cols-1 gap-md xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-sm">
                            <ToggleRow
                                title="Enable Public Signups"
                                description="Allow new organizations to create accounts without a manual invitation path."
                                checked={!!configs.enable_signups}
                                onChange={(value) => updateConfig('enable_signups', value)}
                            />
                            <ToggleRow
                                title="Require Email Verification"
                                description="Gate access until user addresses are confirmed."
                                checked={!!configs.require_email_verification}
                                onChange={(value) => updateConfig('require_email_verification', value)}
                            />
                            <ToggleRow
                                title="Enable Audit Logging"
                                description="Persist superadmin activity for accountability and compliance review."
                                checked={!!configs.enable_audit_log}
                                onChange={(value) => updateConfig('enable_audit_log', value)}
                            />
                        </div>
                        <div className="rounded-[calc(var(--radius-lg)*1.25)] border border-border/70 bg-background/70 p-md">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">Session timeout</p>
                            <div className="mt-md max-w-xs">
                                <SuperadminInputShell icon={<Lock className="h-4 w-4" />}>
                                    <input
                                        type="number"
                                        value={configs.session_timeout_hours}
                                        onChange={(event) => updateConfig('session_timeout_hours', parseInt(event.target.value || '0', 10))}
                                        className="w-full bg-transparent py-sm text-sm text-textPrimary focus:outline-none"
                                    />
                                </SuperadminInputShell>
                            </div>
                            <p className="mt-sm text-sm text-textSecondary">
                                Superadmin and user sessions will be considered stale after this inactivity window.
                            </p>
                        </div>
                    </div>
                </SuperadminPanel>
            )}

            {activeTab === 'email' && (
                <SuperadminPanel
                    title="Email Delivery"
                    description="Configure SMTP for transactional and system-originated delivery."
                    tone="info"
                >
                    <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                        <FieldCard label="SMTP Host">
                            <TextInput value={configs.smtp_host} onChange={(value) => updateConfig('smtp_host', value)} placeholder="smtp.gmail.com" icon={<Mail className="h-4 w-4" />} />
                        </FieldCard>
                        <FieldCard label="SMTP Port">
                            <TextInput value={String(configs.smtp_port)} onChange={(value) => updateConfig('smtp_port', parseInt(value || '0', 10))} icon={<Zap className="h-4 w-4" />} />
                        </FieldCard>
                        <FieldCard label="SMTP Username">
                            <TextInput value={configs.smtp_username} onChange={(value) => updateConfig('smtp_username', value)} icon={<Users className="h-4 w-4" />} />
                        </FieldCard>
                        <FieldCard label="From Email">
                            <TextInput value={configs.smtp_from_email} onChange={(value) => updateConfig('smtp_from_email', value)} placeholder="noreply@axiom.app" icon={<Mail className="h-4 w-4" />} />
                        </FieldCard>
                        <div className="md:col-span-2">
                            <FieldCard label="SMTP Password">
                                <TextInput
                                    type="password"
                                    value={configs.smtp_password}
                                    onChange={(value) => updateConfig('smtp_password', value)}
                                    icon={<Lock className="h-4 w-4" />}
                                    placeholder={configuredSecrets.smtp_password ? 'Configured. Leave blank to keep existing secret.' : 'Set SMTP password'}
                                />
                            </FieldCard>
                        </div>
                    </div>

                    {smtpTestResult && (
                        <div className={`mt-md flex items-center gap-sm rounded-[calc(var(--radius-lg)*1.25)] border p-md text-sm ${
                            smtpTestResult.success
                                ? 'border-success/30 bg-success/5 text-success'
                                : 'border-error/30 bg-error/5 text-error'
                        }`}>
                            {smtpTestResult.success
                                ? <><CheckCircle className="h-4 w-4 flex-shrink-0" /> SMTP connection successful ({smtpTestResult.latencyMs}ms)</>
                                : <><AlertTriangle className="h-4 w-4 flex-shrink-0" /> {smtpTestResult.error}</>
                            }
                        </div>
                    )}

                    <div className="mt-md flex items-center gap-sm">
                        <SuperadminButton
                            icon={testingSmtp ? Loader2 : Zap}
                            onClick={async () => {
                                setTestingSmtp(true); setSmtpTestResult(null)
                                try {
                                    await handleSave()
                                    const res = await fetchWithAuth('/api/superadmin/system-email', {
                                        method: 'POST',
                                        body: JSON.stringify({ action: 'test_connection' }),
                                    })
                                    const data = await res.json()
                                    setSmtpTestResult(data)
                                    if (data.success) toast.success(`SMTP OK (${data.latencyMs}ms)`)
                                    else toast.error(data.error || 'Connection failed')
                                } catch { toast.error('Test failed') }
                                finally { setTestingSmtp(false) }
                            }}
                            disabled={testingSmtp || !configs.smtp_host}
                        >
                            {testingSmtp ? 'Testing…' : 'Test SMTP Connection'}
                        </SuperadminButton>
                        <SuperadminButton
                            tone="primary"
                            icon={Send}
                            onClick={() => {
                                const recipient = prompt('Send test email to:')
                                if (!recipient) return
                                fetchWithAuth('/api/superadmin/system-email', {
                                    method: 'POST',
                                    body: JSON.stringify({ action: 'test', recipient }),
                                }).then(r => r.json()).then(d => {
                                    if (d.success) toast.success('Test email sent!')
                                    else toast.error(d.error || 'Send failed')
                                }).catch(() => toast.error('Send failed'))
                            }}
                            disabled={!configs.smtp_host}
                        >
                            Send Test Email
                        </SuperadminButton>
                    </div>
                </SuperadminPanel>
            )}

            {activeTab === 'security' && (
                <SuperadminPanel
                    title="Security Posture"
                    description="Define platform protections and keep operational hygiene high."
                    tone="warning"
                >
                    <div className="grid grid-cols-1 gap-md xl:grid-cols-[1fr_0.95fr]">
                        <div className="space-y-sm">
                            <ToggleRow
                                title="Enable Rate Limiting"
                                description="Protect public and authenticated interfaces from burst abuse."
                                checked={!!configs.enable_rate_limiting}
                                onChange={(value) => updateConfig('enable_rate_limiting', value)}
                            />
                        </div>
                        <div className="rounded-[calc(var(--radius-lg)*1.25)] border border-warning/20 bg-warning/5 p-md">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warning">Operational guidance</p>
                            <ul className="mt-md space-y-sm text-sm text-textSecondary">
                                <li>Keep HTTPS enforced across all environments that handle platform traffic.</li>
                                <li>Rotate provider and SMTP credentials on a recurring cadence.</li>
                                <li>Leave audit logging active whenever sensitive workflows are enabled.</li>
                                <li>Review superadmin roster regularly to keep blast radius low.</li>
                            </ul>
                        </div>
                    </div>
                </SuperadminPanel>
            )}

            {activeTab === 'limits' && (
                <SuperadminPanel
                    title="Limits & Quotas"
                    description="Define platform-wide throughput constraints and protective ceilings."
                    tone="accent"
                >
                    <div className="grid grid-cols-1 gap-md md:grid-cols-3">
                        <FieldCard label="Max Runs Per Day">
                            <TextInput value={String(configs.max_runs_per_day)} onChange={(value) => updateConfig('max_runs_per_day', parseInt(value || '0', 10))} icon={<Zap className="h-4 w-4" />} />
                        </FieldCard>
                        <FieldCard label="Max KB Size (MB)">
                            <TextInput value={String(configs.max_kb_size_mb)} onChange={(value) => updateConfig('max_kb_size_mb', parseInt(value || '0', 10))} icon={<Globe className="h-4 w-4" />} />
                        </FieldCard>
                        <FieldCard label="Rate Limit / Minute">
                            <TextInput value={String(configs.rate_limit_per_minute)} onChange={(value) => updateConfig('rate_limit_per_minute', parseInt(value || '0', 10))} icon={<Shield className="h-4 w-4" />} />
                        </FieldCard>
                    </div>
                </SuperadminPanel>
            )}

            {activeTab === 'admins' && (
                <div className="grid grid-cols-1 gap-md xl:grid-cols-[1fr_1.1fr]">
                    <SuperadminPanel
                        title="Create Superadmin"
                        description="Provision a new platform operator with immediate access."
                        tone="success"
                    >
                        <div className="space-y-sm">
                            <FieldCard label="Email">
                                <TextInput value={newAdmin.email} onChange={(value) => setNewAdmin((current) => ({ ...current, email: value }))} placeholder="admin@axiom.app" icon={<Mail className="h-4 w-4" />} />
                            </FieldCard>
                            <FieldCard label="Full Name">
                                <TextInput value={newAdmin.full_name} onChange={(value) => setNewAdmin((current) => ({ ...current, full_name: value }))} placeholder="Operator Name" icon={<Users className="h-4 w-4" />} />
                            </FieldCard>
                            <FieldCard label="Password">
                                <TextInput type="password" value={newAdmin.password} onChange={(value) => setNewAdmin((current) => ({ ...current, password: value }))} placeholder="Strong password" icon={<Lock className="h-4 w-4" />} />
                            </FieldCard>
                            <div className="pt-sm">
                                <SuperadminButton tone="primary" icon={UserPlus} onClick={createAdmin} disabled={creatingAdmin}>
                                    {creatingAdmin ? 'Creating' : 'Create Superadmin'}
                                </SuperadminButton>
                            </div>
                        </div>
                    </SuperadminPanel>

                    <SuperadminPanel
                        title="Current Superadmins"
                        description="Live roster of platform-level operators."
                        tone="primary"
                    >
                        {admins.length === 0 ? (
                            <SuperadminEmptyState
                                icon={Users}
                                title="No superadmins found"
                                description="Create the first operator to establish a managed control layer."
                            />
                        ) : (
                            <div className="space-y-sm">
                                {admins.map((admin) => (
                                    <div key={admin.id} className="rounded-[calc(var(--radius-lg)*1.2)] border border-border/70 bg-background/70 p-md">
                                        <div className="flex items-start justify-between gap-sm">
                                            <div>
                                                <p className="text-sm font-semibold text-textPrimary">{admin.email}</p>
                                                <p className="mt-xs text-xs text-textSecondary">{admin.full_name || 'No display name set'}</p>
                                            </div>
                                            <SuperadminBadge tone={admin.is_active ? 'success' : 'warning'}>
                                                {admin.is_active ? 'Active' : 'Inactive'}
                                            </SuperadminBadge>
                                        </div>
                                        <p className="mt-sm text-xs text-textSecondary">
                                            Added {new Date(admin.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SuperadminPanel>
                </div>
            )}

            {error && (
                <SuperadminErrorState
                    title="Partial settings sync issue"
                    description={error}
                    action={<SuperadminButton icon={RefreshCw} onClick={() => loadData(true)}>Retry refresh</SuperadminButton>}
                />
            )}
        </div>
    )
}

function ToggleRow({
    title,
    description,
    checked,
    onChange,
}: {
    title: string
    description: string
    checked: boolean
    onChange: (value: boolean) => void
}) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex w-full items-start justify-between gap-md rounded-[calc(var(--radius-lg)*1.25)] border border-border/70 bg-background/70 p-md text-left transition-all duration-[var(--duration-fast)] hover:border-borderHover"
        >
            <div>
                <p className="text-sm font-semibold text-textPrimary">{title}</p>
                <p className="mt-xs text-sm leading-relaxed text-textSecondary">{description}</p>
            </div>
            <div className={`mt-xs inline-flex h-6 w-11 rounded-full border p-1 transition-all ${checked ? 'border-primary bg-primary/15' : 'border-border bg-surface'}`}>
                <div className={`h-4 w-4 rounded-full transition-all ${checked ? 'translate-x-5 bg-primary' : 'translate-x-0 bg-textTertiary'}`} />
            </div>
        </button>
    )
}

function FieldCard({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <div className="rounded-[calc(var(--radius-lg)*1.25)] border border-border/70 bg-background/70 p-md">
            <p className="mb-sm text-xs font-semibold uppercase tracking-[0.2em] text-textTertiary">{label}</p>
            {children}
        </div>
    )
}

function TextInput({
    value,
    onChange,
    placeholder,
    icon,
    type = 'text',
}: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    icon: React.ReactNode
    type?: string
}) {
    return (
        <SuperadminInputShell icon={icon}>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent py-sm text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none"
            />
        </SuperadminInputShell>
    )
}
