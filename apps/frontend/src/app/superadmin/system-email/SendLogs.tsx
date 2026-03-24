'use client'

import React from 'react'
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import type { LogEntry } from './page'

export function SendLogs({ logs }: { logs: LogEntry[] }) {
    if (logs.length === 0) {
        return (
            <div className="premium-card flex flex-col items-center justify-center py-16 text-center border-dashed">
                <Clock className="w-12 h-12 text-textTertiary mb-4" />
                <h3 className="text-lg font-bold text-textPrimary mb-2">No emails sent yet</h3>
                <p className="text-textSecondary text-sm">Send a test email to see logs here.</p>
            </div>
        )
    }

    return (
        <div className="premium-card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-surface/50">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wider">Status</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wider">Template</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wider">Recipient</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wider">Subject</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wider">Provider</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary uppercase tracking-wider">Sent At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id} className="border-b border-border/30 hover:bg-surface/30 transition-colors">
                                <td className="px-4 py-3">
                                    {log.status === 'sent' ? (
                                        <span className="flex items-center gap-1.5 text-success text-xs font-medium">
                                            <CheckCircle className="w-3.5 h-3.5" /> Sent
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-error text-xs font-medium" title={log.error || ''}>
                                            <AlertTriangle className="w-3.5 h-3.5" /> Failed
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <code className="text-xs bg-surface px-1.5 py-0.5 rounded font-mono text-textPrimary">{log.template_slug}</code>
                                </td>
                                <td className="px-4 py-3 text-textPrimary font-mono text-xs">{log.recipient}</td>
                                <td className="px-4 py-3 text-textSecondary truncate max-w-[200px]">{log.subject}</td>
                                <td className="px-4 py-3 text-textTertiary text-xs">{log.provider_type || '—'}</td>
                                <td className="px-4 py-3 text-textTertiary text-xs">{new Date(log.sent_at).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
