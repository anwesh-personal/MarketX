'use client'

import React, { useState } from 'react'
import { X, Check, Loader2, Eye, Code, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import type { Template } from './page'

interface Props {
    template: Template
    fetchWithAuth: (url: string, opts?: RequestInit) => Promise<Response>
    onClose: () => void
    onSaved: () => void
}

export function TemplateEditor({ template, fetchWithAuth, onClose, onSaved }: Props) {
    const [form, setForm] = useState({
        name: template.name,
        subject: template.subject,
        html_body: template.html_body,
        text_body: template.text_body || '',
        description: template.description || '',
    })
    const [saving, setSaving] = useState(false)
    const [view, setView] = useState<'code' | 'preview'>('code')

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetchWithAuth(
                `/api/superadmin/system-email/templates/${template.id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                }
            )
            if (!res.ok) throw new Error('Save failed')
            toast.success('Template saved')
            onSaved()
            onClose()
        } catch (e: any) {
            toast.error(e.message || 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-background border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-accent" />
                        <div>
                            <h2 className="text-lg font-bold text-textPrimary">
                                Edit: {template.name}
                            </h2>
                            <p className="text-xs text-textTertiary font-mono">
                                {template.slug}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-icon">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Name + Subject */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-textSecondary">
                                Template Name
                            </label>
                            <input
                                value={form.name}
                                onChange={e => setForm(f => ({
                                    ...f, name: e.target.value
                                }))}
                                className="input w-full"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-textSecondary">
                                Subject Line
                            </label>
                            <input
                                value={form.subject}
                                onChange={e => setForm(f => ({
                                    ...f, subject: e.target.value
                                }))}
                                className="input w-full font-mono text-sm"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textSecondary">
                            Description
                        </label>
                        <input
                            value={form.description}
                            onChange={e => setForm(f => ({
                                ...f, description: e.target.value
                            }))}
                            className="input w-full"
                            placeholder="Internal description"
                        />
                    </div>

                    {/* Variables reference */}
                    <div className="bg-surface rounded-lg p-3">
                        <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">
                            Available Variables
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {(template.variables || []).map(v => (
                                <span
                                    key={v.name}
                                    className="text-xs px-2 py-1 rounded-lg font-mono bg-accent/10 text-accent border border-accent/20 cursor-pointer hover:bg-accent/20 transition-colors"
                                    title={v.description || v.name}
                                    onClick={() => {
                                        navigator.clipboard.writeText(
                                            `{{${v.name}}}`
                                        )
                                        toast.success(`Copied {{${v.name}}}`)
                                    }}
                                >
                                    {'{{' + v.name + '}}'}
                                    {v.required && ' *'}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* HTML Body — toggle code/preview */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-textSecondary">
                                HTML Body
                            </label>
                            <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5">
                                <button
                                    onClick={() => setView('code')}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${view === 'code' ? 'bg-accent text-onAccent' : 'text-textTertiary hover:text-textPrimary'}`}
                                >
                                    <Code className="w-3 h-3" /> Code
                                </button>
                                <button
                                    onClick={() => setView('preview')}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${view === 'preview' ? 'bg-accent text-onAccent' : 'text-textTertiary hover:text-textPrimary'}`}
                                >
                                    <Eye className="w-3 h-3" /> Preview
                                </button>
                            </div>
                        </div>
                        {view === 'code' ? (
                            <textarea
                                value={form.html_body}
                                onChange={e => setForm(f => ({
                                    ...f, html_body: e.target.value
                                }))}
                                className="input w-full font-mono text-xs resize-none"
                                rows={14}
                                spellCheck={false}
                            />
                        ) : (
                            <div className="rounded-lg border border-border overflow-hidden">
                                <iframe
                                    srcDoc={form.html_body}
                                    className="w-full h-72 bg-white"
                                    sandbox=""
                                    title="Preview"
                                />
                            </div>
                        )}
                    </div>

                    {/* Plain Text */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textSecondary">
                            Plain Text Fallback
                        </label>
                        <textarea
                            value={form.text_body}
                            onChange={e => setForm(f => ({
                                ...f, text_body: e.target.value
                            }))}
                            className="input w-full font-mono text-xs resize-none"
                            rows={4}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border flex-shrink-0">
                    <p className="text-xs text-textTertiary">
                        Last updated: {new Date(template.updated_at).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="btn btn-ghost">
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn btn-primary"
                        >
                            {saving
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Check className="w-4 h-4" />
                            }
                            Save Template
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}
