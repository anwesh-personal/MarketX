'use client'

import React, { useState } from 'react'
import { Check, Loader2, Server, Mail, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Config, Provider } from './page'

interface Props {
    config: Config
    providers: Provider[]
    fetchWithAuth: (url: string, opts?: RequestInit) => Promise<Response>
    onSaved: () => void
}

export function SystemEmailConfig({ config, providers, fetchWithAuth, onSaved }: Props) {
    const [form, setForm] = useState({
        provider_id: config.providerId || '',
        from_name: config.fromName,
        from_address: config.fromAddress,
        reply_to: config.replyTo || '',
        app_name: config.appName,
    })
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetchWithAuth('/api/superadmin/system-email', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider_id: form.provider_id || null,
                    from_name: form.from_name,
                    from_address: form.from_address,
                    reply_to: form.reply_to || null,
                    app_name: form.app_name,
                }),
            })
            if (!res.ok) throw new Error('Save failed')
            toast.success('System email config saved')
            onSaved()
        } catch (e: any) {
            toast.error(e.message || 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const activeProviders = providers.filter(p => p.is_active)
    const selectedProvider = providers.find(p => p.id === form.provider_id)

    return (
        <div className="space-y-6">
            {/* Provider Selection */}
            <div className="premium-card">
                <div className="flex items-center gap-3 mb-6">
                    <Server className="w-5 h-5 text-accent" />
                    <h3 className="text-lg font-bold text-textPrimary">Email Provider</h3>
                </div>

                {activeProviders.length === 0 ? (
                    <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 text-sm text-warning">
                        No active email providers found. Configure one in <strong>Email Providers</strong> first.
                    </div>
                ) : (
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-textSecondary">Select Provider for System Emails</label>
                        <select
                            value={form.provider_id}
                            onChange={e => setForm(f => ({ ...f, provider_id: e.target.value }))}
                            className="input w-full max-w-md"
                        >
                            <option value="">— Not configured —</option>
                            {activeProviders.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.display_name} ({p.provider_type}) — {p.scope}
                                </option>
                            ))}
                        </select>
                        {selectedProvider && (
                            <div className="flex items-center gap-2 text-xs text-textTertiary">
                                <span className={`w-2 h-2 rounded-full ${selectedProvider.health_status === 'healthy' ? 'bg-success' : 'bg-warning'}`} />
                                {selectedProvider.provider_type} — {selectedProvider.health_status}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* From / Reply-To */}
            <div className="premium-card">
                <div className="flex items-center gap-3 mb-6">
                    <Mail className="w-5 h-5 text-accent" />
                    <h3 className="text-lg font-bold text-textPrimary">Sender Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textSecondary">From Name</label>
                        <input value={form.from_name} onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))}
                            placeholder="Market Writer" className="input w-full" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textSecondary">From Email</label>
                        <input value={form.from_address} onChange={e => setForm(f => ({ ...f, from_address: e.target.value }))}
                            placeholder="noreply@yourdomain.com" className="input w-full font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textSecondary">Reply-To (optional)</label>
                        <input value={form.reply_to} onChange={e => setForm(f => ({ ...f, reply_to: e.target.value }))}
                            placeholder="support@yourdomain.com" className="input w-full font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textSecondary">App Name (used in templates)</label>
                        <input value={form.app_name} onChange={e => setForm(f => ({ ...f, app_name: e.target.value }))}
                            placeholder="Market Writer" className="input w-full" />
                    </div>
                </div>
            </div>

            {/* Save */}
            <div className="flex justify-end">
                <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save Configuration
                </button>
            </div>
        </div>
    )
}
