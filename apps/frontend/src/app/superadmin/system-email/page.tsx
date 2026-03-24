'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    Send, TestTube, Loader2, FileText, Clock, Lock, Mail, Users,
    AlertTriangle, CheckCircle, RefreshCw, Server, Save, Zap, Settings,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'
import { TemplateList } from './TemplateList'
import { SendLogs } from './SendLogs'
import { TestSendModal } from './TestSendModal'
import { TemplateEditor } from './TemplateEditor'

// ── Types ────────────────────────────────────

interface SmtpStatus {
    isConfigured: boolean
    host: string | null
    fromEmail: string | null
    fromName: string
    appName: string
}

interface Template {
    id: string; slug: string; name: string
    subject: string; html_body: string
    text_body: string | null; description: string | null
    variables: Array<{ name: string; required: boolean; description?: string; default?: string }>
    is_active: boolean; category: string
    created_at: string; updated_at: string
}

interface LogEntry {
    id: string; template_slug: string; recipient: string
    subject: string; provider_type: string | null
    status: string; message_id: string | null
    error: string | null; sent_at: string
}

export type { SmtpStatus, Template, LogEntry }

// ── Page ─────────────────────────────────────

export default function SystemEmailPage() {
    const { fetchWithAuth } = useSuperadminAuth()
    const [loading, setLoading] = useState(true)
    const [smtp, setSmtp] = useState<SmtpStatus | null>(null)
    const [templates, setTemplates] = useState<Template[]>([])
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0 })
    const [tab, setTab] = useState<'config' | 'templates' | 'logs'>('config')
    const [showTestModal, setShowTestModal] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

    // SMTP config form
    const [smtpForm, setSmtpForm] = useState({
        smtp_host: '', smtp_port: '587', smtp_username: '',
        smtp_password: '', smtp_from_email: '',
    })
    const [savingSmtp, setSavingSmtp] = useState(false)
    const [testingSmtp, setTestingSmtp] = useState(false)
    const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; error?: string; latencyMs?: number } | null>(null)

    const load = useCallback(async () => {
        try {
            const res = await fetchWithAuth('/api/superadmin/system-email')
            const data = await res.json()
            if (data.smtp) setSmtp(data.smtp)
            if (data.templates) setTemplates(data.templates)
            if (data.recent_logs) setLogs(data.recent_logs)
            if (data.stats) setStats(data.stats)

            // Load current SMTP settings
            const settingsRes = await fetchWithAuth('/api/superadmin/settings')
            const settingsData = await settingsRes.json()
            if (settingsData.configs) {
                const c: Record<string, any> = {}
                for (const cfg of settingsData.configs) {
                    const val = cfg.value?.value ?? cfg.value ?? ''
                    c[cfg.key] = val
                }
                setSmtpForm({
                    smtp_host: c.smtp_host || '',
                    smtp_port: String(c.smtp_port || 587),
                    smtp_username: c.smtp_username || '',
                    smtp_password: '',
                    smtp_from_email: c.smtp_from_email || '',
                })
            }
        } catch { toast.error('Failed to load') }
        finally { setLoading(false) }
    }, [fetchWithAuth])

    useEffect(() => { load() }, [load])

    const saveSmtp = async () => {
        setSavingSmtp(true)
        try {
            const configs: Record<string, any> = { ...smtpForm }
            configs.smtp_port = parseInt(smtpForm.smtp_port) || 587
            if (!configs.smtp_password) delete configs.smtp_password
            const res = await fetchWithAuth('/api/superadmin/settings', {
                method: 'POST',
                body: JSON.stringify({ configs }),
            })
            if (!res.ok) throw new Error()
            toast.success('SMTP settings saved')
            load()
        } catch { toast.error('Save failed') }
        finally { setSavingSmtp(false) }
    }

    const testConnection = async () => {
        setTestingSmtp(true); setSmtpTestResult(null)
        try {
            await saveSmtp()
            const res = await fetchWithAuth('/api/superadmin/system-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'test_connection' }),
            })
            const data = await res.json()
            setSmtpTestResult(data)
            if (data.success) toast.success(`SMTP OK (${data.latencyMs}ms)`)
            else toast.error(data.error || 'Connection failed')
        } catch { toast.error('Test failed') }
        finally { setTestingSmtp(false) }
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
    )

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
                            <Send className="w-6 h-6 text-accent" />
                        </div>
                        <h1 className="text-3xl font-bold font-display text-textPrimary">System Email</h1>
                    </div>
                    <p className="text-textSecondary ml-1 max-w-2xl">
                        Internal transactional emails — password resets, welcome, invitations, alerts.
                        Completely separate from client email providers.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={load} className="btn btn-ghost btn-icon" aria-label="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowTestModal(true)} className="btn btn-primary">
                        <TestTube className="w-4 h-4" /> Send Test
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Templates', value: templates.filter(t => t.is_active).length, icon: FileText, color: 'text-accent' },
                    { label: 'Emails Sent', value: stats.sent, icon: CheckCircle, color: 'text-success' },
                    { label: 'Failed', value: stats.failed, icon: AlertTriangle, color: 'text-error' },
                    { label: 'SMTP', value: smtp?.isConfigured ? smtp.host : 'Not set', icon: Server, color: smtp?.isConfigured ? 'text-success' : 'text-warning' },
                ].map(s => (
                    <div key={s.label} className="premium-card !p-4 flex items-center gap-4">
                        <s.icon className={`w-8 h-8 ${s.color} flex-shrink-0`} />
                        <div>
                            <p className="text-2xl font-bold text-textPrimary">{s.value}</p>
                            <p className="text-xs text-textSecondary">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
                {([
                    { id: 'config' as const, label: 'SMTP Configuration', icon: Settings },
                    { id: 'templates' as const, label: 'Email Templates', icon: FileText },
                    { id: 'logs' as const, label: 'Send Log', icon: Clock },
                ]).map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${tab === t.id ? 'border-accent text-accent' : 'border-transparent text-textSecondary hover:text-textPrimary'}`}>
                        <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                ))}
            </div>

            {/* Config Tab */}
            {tab === 'config' && (
                <div className="space-y-6">
                    <div className="premium-card !p-6">
                        <h3 className="text-lg font-bold text-textPrimary mb-1">SMTP Configuration</h3>
                        <p className="text-sm text-textSecondary mb-6">Configure SMTP server for all system transactional emails.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5 block">SMTP Host</label>
                                <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2.5">
                                    <Mail className="w-4 h-4 text-textTertiary flex-shrink-0" />
                                    <input type="text" value={smtpForm.smtp_host} onChange={e => setSmtpForm(f => ({ ...f, smtp_host: e.target.value }))}
                                        placeholder="smtp.gmail.com" className="w-full bg-transparent text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5 block">SMTP Port</label>
                                <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2.5">
                                    <Zap className="w-4 h-4 text-textTertiary flex-shrink-0" />
                                    <input type="text" value={smtpForm.smtp_port} onChange={e => setSmtpForm(f => ({ ...f, smtp_port: e.target.value }))}
                                        placeholder="587" className="w-full bg-transparent text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5 block">SMTP Username</label>
                                <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2.5">
                                    <Users className="w-4 h-4 text-textTertiary flex-shrink-0" />
                                    <input type="text" value={smtpForm.smtp_username} onChange={e => setSmtpForm(f => ({ ...f, smtp_username: e.target.value }))}
                                        className="w-full bg-transparent text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5 block">From Email</label>
                                <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2.5">
                                    <Mail className="w-4 h-4 text-textTertiary flex-shrink-0" />
                                    <input type="text" value={smtpForm.smtp_from_email} onChange={e => setSmtpForm(f => ({ ...f, smtp_from_email: e.target.value }))}
                                        placeholder="noreply@yourdomain.com" className="w-full bg-transparent text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1.5 block">SMTP Password</label>
                                <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2.5">
                                    <Lock className="w-4 h-4 text-textTertiary flex-shrink-0" />
                                    <input type="password" value={smtpForm.smtp_password} onChange={e => setSmtpForm(f => ({ ...f, smtp_password: e.target.value }))}
                                        placeholder={smtp?.isConfigured ? 'Configured. Leave blank to keep.' : 'Enter SMTP password'}
                                        className="w-full bg-transparent text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none" />
                                </div>
                            </div>
                        </div>

                        {smtpTestResult && (
                            <div className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
                                smtpTestResult.success ? 'border-success/30 bg-success/5 text-success' : 'border-error/30 bg-error/5 text-error'
                            }`}>
                                {smtpTestResult.success
                                    ? <><CheckCircle className="w-4 h-4" /> SMTP OK ({smtpTestResult.latencyMs}ms)</>
                                    : <><AlertTriangle className="w-4 h-4" /> {smtpTestResult.error}</>
                                }
                            </div>
                        )}

                        <div className="flex items-center gap-3 mt-6">
                            <button onClick={saveSmtp} disabled={savingSmtp} className="btn btn-primary">
                                {savingSmtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {savingSmtp ? 'Saving...' : 'Save Configuration'}
                            </button>
                            <button onClick={testConnection} disabled={testingSmtp || !smtpForm.smtp_host} className="btn btn-ghost">
                                {testingSmtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                {testingSmtp ? 'Testing...' : 'Test Connection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Templates Tab */}
            {tab === 'templates' && (
                <TemplateList templates={templates} onEdit={setEditingTemplate} fetchWithAuth={fetchWithAuth} onRefresh={load} />
            )}

            {/* Logs Tab */}
            {tab === 'logs' && <SendLogs logs={logs} />}

            {/* Modals */}
            {showTestModal && smtp && (
                <TestSendModal smtp={smtp} fetchWithAuth={fetchWithAuth} onClose={() => setShowTestModal(false)} onSent={load} />
            )}
            {editingTemplate && (
                <TemplateEditor template={editingTemplate} fetchWithAuth={fetchWithAuth} onClose={() => setEditingTemplate(null)} onSaved={load} />
            )}
        </div>
    )
}
