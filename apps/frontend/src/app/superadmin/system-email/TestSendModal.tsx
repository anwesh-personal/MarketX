'use client'

import React, { useState } from 'react'
import { X, Send, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import type { Config } from './page'

interface Props {
    config: Config
    fetchWithAuth: (url: string, opts?: RequestInit) => Promise<Response>
    onClose: () => void
    onSent: () => void
}

export function TestSendModal({ config, fetchWithAuth, onClose, onSent }: Props) {
    const [recipient, setRecipient] = useState('')
    const [sending, setSending] = useState(false)
    const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

    const handleSend = async () => {
        if (!recipient) { toast.error('Enter a recipient email'); return }
        setSending(true)
        setResult(null)
        try {
            const res = await fetchWithAuth('/api/superadmin/system-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'test', recipient }),
            })
            const data = await res.json()
            setResult(data)
            if (data.success) {
                toast.success('Test email sent!')
                onSent()
            } else {
                toast.error(data.error || 'Send failed')
            }
        } catch (e: any) {
            setResult({ success: false, error: e.message })
            toast.error('Send failed')
        } finally {
            setSending(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <Send className="w-5 h-5 text-accent" />
                        <h2 className="text-lg font-bold text-textPrimary">Send Test Email</h2>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-icon"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    {!config.providerId && (
                        <div className="p-3 rounded-xl bg-warning/5 border border-warning/20 text-sm text-warning">
                            No provider configured. Set one in the Configuration tab first.
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-textSecondary">Recipient Email</label>
                        <input
                            type="email" value={recipient}
                            onChange={e => setRecipient(e.target.value)}
                            placeholder="you@example.com" className="input w-full"
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                    </div>
                    <div className="bg-surface rounded-lg p-3 text-xs text-textTertiary space-y-1">
                        <p>From: <strong className="text-textSecondary">{config.fromName} &lt;{config.fromAddress}&gt;</strong></p>
                        <p>Provider: <strong className="text-textSecondary">{config.provider?.display_name || 'Not set'}</strong></p>
                    </div>
                    {result && (
                        <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${result.success ? 'bg-success/5 border border-success/20 text-success' : 'bg-error/5 border border-error/20 text-error'}`}>
                            {result.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            {result.success ? 'Email sent successfully!' : result.error}
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 p-6 border-t border-border">
                    <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                    <button onClick={handleSend} disabled={sending || !config.providerId} className="btn btn-primary">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send Test
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}
