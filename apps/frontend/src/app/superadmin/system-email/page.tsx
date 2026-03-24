'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    Send, Settings, TestTube, Loader2, Check, X,
    RefreshCw, Mail, FileText, Clock, AlertTriangle,
    CheckCircle, ChevronDown, ChevronUp, Eye, Edit3,
    Activity, Server, Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'
import { SystemEmailConfig } from './SystemEmailConfig'
import { TemplateList } from './TemplateList'
import { SendLogs } from './SendLogs'
import { TestSendModal } from './TestSendModal'
import { TemplateEditor } from './TemplateEditor'

// ── Types ──────────────────────────────────────────

interface Config {
    providerId: string | null
    providerType: string | null
    fromName: string
    fromAddress: string
    replyTo: string | null
    appName: string
    provider: {
        id: string
        display_name: string
        provider_type: string
        is_active: boolean
        health_status: string
    } | null
}

interface Template {
    id: string; slug: string; name: string
    subject: string; html_body: string
    text_body: string | null; description: string | null
    variables: Array<{ name: string; required: boolean; description?: string; default?: string }>
    is_active: boolean; category: string
    created_at: string; updated_at: string
}

interface Provider {
    id: string; display_name: string
    provider_type: string; is_active: boolean
    health_status: string; scope: string
}

interface LogEntry {
    id: string; template_slug: string; recipient: string
    subject: string; provider_type: string | null
    status: string; message_id: string | null
    error: string | null; sent_at: string
}

export type { Config, Template, Provider, LogEntry }

// ── Page ───────────────────────────────────────────

export default function SystemEmailPage() {
    const { fetchWithAuth } = useSuperadminAuth()
    const [loading, setLoading] = useState(true)
    const [config, setConfig] = useState<Config | null>(null)
    const [templates, setTemplates] = useState<Template[]>([])
    const [providers, setProviders] = useState<Provider[]>([])
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0 })
    const [tab, setTab] = useState<'config' | 'templates' | 'logs'>('config')
    const [showTestModal, setShowTestModal] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

    const load = useCallback(async () => {
        try {
            const res = await fetchWithAuth('/api/superadmin/system-email')
            const data = await res.json()
            if (data.config) setConfig(data.config)
            if (data.templates) setTemplates(data.templates)
            if (data.available_providers) setProviders(data.available_providers)
            if (data.recent_logs) setLogs(data.recent_logs)
            if (data.stats) setStats(data.stats)
        } catch { toast.error('Failed to load system email config') }
        finally { setLoading(false) }
    }, [fetchWithAuth])

    useEffect(() => { load() }, [load])

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
                        Configure transactional emails — password resets, welcome emails, invitations. All templates are editable. Uses your configured email providers.
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
                    { label: 'Templates', value: templates.length, icon: FileText, color: 'text-accent' },
                    { label: 'Emails Sent', value: stats.sent, icon: CheckCircle, color: 'text-success' },
                    { label: 'Failed', value: stats.failed, icon: AlertTriangle, color: 'text-error' },
                    { label: 'Provider', value: config?.provider?.display_name || 'Not set', icon: Server, color: config?.provider ? 'text-success' : 'text-warning' },
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
                    { id: 'config' as const, label: 'Configuration', icon: Settings },
                    { id: 'templates' as const, label: 'Templates', icon: FileText },
                    { id: 'logs' as const, label: 'Send Log', icon: Clock },
                ]).map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${tab === t.id ? 'border-accent text-accent' : 'border-transparent text-textSecondary hover:text-textPrimary'}`}>
                        <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {tab === 'config' && config && (
                <SystemEmailConfig
                    config={config}
                    providers={providers}
                    fetchWithAuth={fetchWithAuth}
                    onSaved={load}
                />
            )}
            {tab === 'templates' && (
                <TemplateList
                    templates={templates}
                    onEdit={setEditingTemplate}
                    fetchWithAuth={fetchWithAuth}
                    onRefresh={load}
                />
            )}
            {tab === 'logs' && <SendLogs logs={logs} />}

            {/* Modals */}
            {showTestModal && config && (
                <TestSendModal
                    config={config}
                    fetchWithAuth={fetchWithAuth}
                    onClose={() => setShowTestModal(false)}
                    onSent={load}
                />
            )}
            {editingTemplate && (
                <TemplateEditor
                    template={editingTemplate}
                    fetchWithAuth={fetchWithAuth}
                    onClose={() => setEditingTemplate(null)}
                    onSaved={load}
                />
            )}
        </div>
    )
}
