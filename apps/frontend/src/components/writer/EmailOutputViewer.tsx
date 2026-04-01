'use client'

import React, { useState } from 'react'
import { Copy, Check, Mail, ChevronDown, ChevronUp, Download, Hash, Send, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Email {
    step: number
    subject: string
    body: string
    delay_days?: number
    notes?: string
}

interface EmailOutputViewerProps {
    outputData: any
    onClose: () => void
    runId?: string
    runLabel?: string
    status?: string
    completedAt?: string
    errorMessage?: string
}

function parseEmails(outputData: any): Email[] {
    if (!outputData) return []

    // Handle { finalOutput: ... } wrapper from worker
    const data = outputData.finalOutput ?? outputData

    // If it's already an array of emails
    if (Array.isArray(data)) {
        return data.map((e: any, i: number) => ({
            step: e.step ?? e.sequence_number ?? i + 1,
            subject: e.subject ?? e.subject_line ?? '',
            body: e.body ?? e.content ?? e.html ?? e.text ?? '',
            delay_days: e.delay_days ?? e.delay ?? undefined,
            notes: e.notes ?? e.reasoning ?? undefined,
        }))
    }

    // If it's an object with emails key
    if (data?.emails && Array.isArray(data.emails)) {
        return parseEmails(data.emails)
    }

    // If it has sequence/flow
    if (data?.sequence && Array.isArray(data.sequence)) {
        return parseEmails(data.sequence)
    }

    // If it has output key
    if (data?.output) {
        return parseEmails(data.output)
    }

    // Try to extract from node outputs (workflow result)
    if (typeof data === 'object') {
        for (const key of Object.keys(data)) {
            const val = data[key]
            if (val?.output && typeof val.output === 'string') {
                try {
                    const parsed = JSON.parse(val.output)
                    const emails = parseEmails(parsed)
                    if (emails.length > 0) return emails
                } catch { /* not JSON */ }
            }
        }
    }

    return []
}

function CopyButton({ text, label }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success(label ? `${label} copied` : 'Copied!')
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-surfaceHover transition-colors text-textTertiary hover:text-textPrimary"
            title="Copy"
        >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
        </button>
    )
}

export default function EmailOutputViewer({
    outputData,
    onClose,
    runId,
    runLabel,
    status,
    completedAt,
    errorMessage,
}: EmailOutputViewerProps) {
    const emails = parseEmails(outputData)
    const [expandedIndex, setExpandedIndex] = useState<number | null>(emails.length > 0 ? 0 : null)
    const [isPushing, setIsPushing] = useState(false)
    const [pushResult, setPushResult] = useState<{ success: boolean; message: string } | null>(null)
    const hasEmails = emails.length > 0
    const canPush = hasEmails && runId && status?.toLowerCase() === 'completed'

    const handlePushToMTA = async () => {
        if (!runId || isPushing) return

        const confirmed = window.confirm(
            `Push ${emails.length} email(s) to your MTA?\n\nThis will create campaigns in your connected email provider.`
        )
        if (!confirmed) return

        setIsPushing(true)
        setPushResult(null)

        try {
            const res = await fetch('/api/writer/push-to-mta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ run_id: runId }),
            })

            const data = await res.json()

            if (!res.ok) {
                if (data.code === 'MTA_NOT_CONFIGURED') {
                    setPushResult({ success: false, message: 'No MTA configured. Set up your email provider in Settings first.' })
                } else {
                    setPushResult({ success: false, message: data.error || 'Push failed' })
                }
                toast.error(data.error || 'Push failed')
                return
            }

            setPushResult({
                success: true,
                message: `${data.pushed}/${data.total} emails pushed to ${data.provider}`,
            })
            toast.success(`${data.pushed} email(s) pushed to ${data.provider}`)
        } catch (err: any) {
            setPushResult({ success: false, message: err.message || 'Network error' })
            toast.error('Failed to push emails')
        } finally {
            setIsPushing(false)
        }
    }

    const handleExportAll = () => {
        if (!hasEmails) return
        const text = emails.map(e =>
            `--- Email ${e.step} ---\nSubject: ${e.subject}\n${e.delay_days ? `Send after: Day ${e.delay_days}\n` : ''}\n${e.body}\n`
        ).join('\n')
        const blob = new Blob([text], { type: 'text/plain' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `emails-${runLabel?.replace(/[^a-z0-9]/gi, '_') || 'export'}.txt`
        a.click()
        toast.success('Emails exported')
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-3xl max-h-[85vh] bg-surface border border-border rounded-[var(--radius-lg)] shadow-xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-textPrimary text-lg truncate">
                            {runLabel || 'Email Output'}
                        </h2>
                        <div className="flex items-center gap-3 text-xs text-textTertiary mt-0.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                status?.toLowerCase() === 'completed' ? 'bg-success-muted text-success' :
                                status?.toLowerCase() === 'failed' ? 'bg-error-muted text-error' :
                                'bg-warning-muted text-warning'
                            }`}>
                                {status || 'unknown'}
                            </span>
                            {hasEmails && (
                                <span>{emails.length} email{emails.length !== 1 ? 's' : ''} generated</span>
                            )}
                            {completedAt && (
                                <span>· {new Date(completedAt).toLocaleString()}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        {canPush && (
                            <button
                                onClick={handlePushToMTA}
                                disabled={isPushing || pushResult?.success}
                                className={`btn btn-sm gap-1.5 font-semibold transition-all ${
                                    pushResult?.success
                                        ? 'bg-success/10 text-success border border-success/20'
                                        : 'btn-primary hover:scale-[1.02] active:scale-[0.98]'
                                } disabled:opacity-50`}
                                title="Push emails to your MTA"
                            >
                                {isPushing ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Pushing...</>
                                ) : pushResult?.success ? (
                                    <><Check className="w-4 h-4" /> Pushed</>
                                ) : (
                                    <><Send className="w-4 h-4" /> Push to MTA</>
                                )}
                            </button>
                        )}
                        {hasEmails && (
                            <button
                                onClick={handleExportAll}
                                className="btn btn-ghost btn-sm gap-1.5"
                                title="Export all emails"
                            >
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-surfaceHover rounded-lg transition-colors">
                            <span className="text-textTertiary text-lg">✕</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {pushResult && !pushResult.success && (
                        <div className="mx-6 mt-4 p-3 bg-warning-muted border border-warning/20 rounded-xl text-warning text-sm flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            {pushResult.message}
                        </div>
                    )}

                    {errorMessage && (
                        <div className="mx-6 mt-4 p-3 bg-error-muted border border-error/20 rounded-xl text-error text-sm">
                            {errorMessage}
                        </div>
                    )}

                    {hasEmails ? (
                        <div className="p-4 space-y-3">
                            {emails.map((email, i) => {
                                const isExpanded = expandedIndex === i
                                return (
                                    <div
                                        key={i}
                                        className={`border rounded-xl transition-all ${
                                            isExpanded
                                                ? 'border-accent/30 bg-accent/[0.02] shadow-sm'
                                                : 'border-border hover:border-borderHover'
                                        }`}
                                    >
                                        {/* Email header */}
                                        <button
                                            onClick={() => setExpandedIndex(isExpanded ? null : i)}
                                            className="w-full flex items-center gap-3 p-4 text-left"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                                <Hash className="w-4 h-4 text-accent" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-textTertiary">
                                                        Email {email.step}
                                                    </span>
                                                    {email.delay_days !== undefined && (
                                                        <span className="text-[10px] text-textTertiary px-1.5 py-0.5 bg-surfaceHover rounded-md">
                                                            Day {email.delay_days}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`font-semibold truncate ${isExpanded ? 'text-accent' : 'text-textPrimary'}`}>
                                                    {email.subject || '(no subject)'}
                                                </p>
                                            </div>
                                            {isExpanded
                                                ? <ChevronUp className="w-5 h-5 text-textTertiary flex-shrink-0" />
                                                : <ChevronDown className="w-5 h-5 text-textTertiary flex-shrink-0" />
                                            }
                                        </button>

                                        {/* Email body */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 border-t border-border/30">
                                                {/* Subject row */}
                                                <div className="flex items-center justify-between py-2 mb-2">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Mail className="w-4 h-4 text-textTertiary" />
                                                        <span className="font-medium text-textPrimary">{email.subject}</span>
                                                    </div>
                                                    <CopyButton text={email.subject} label="Subject" />
                                                </div>

                                                {/* Body */}
                                                <div className="relative group">
                                                    <div className="bg-background rounded-xl p-4 border border-border text-sm text-textSecondary whitespace-pre-wrap leading-relaxed">
                                                        {email.body}
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <CopyButton text={email.body} label="Body" />
                                                    </div>
                                                </div>

                                                {/* Notes */}
                                                {email.notes && (
                                                    <div className="mt-3 p-3 bg-surfaceHover rounded-lg text-xs text-textTertiary italic">
                                                        💡 {email.notes}
                                                    </div>
                                                )}

                                                {/* Copy full email */}
                                                <div className="mt-3 flex justify-end">
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`)
                                                            toast.success('Full email copied')
                                                        }}
                                                        className="btn btn-ghost btn-sm text-xs gap-1.5"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                        Copy Full Email
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : outputData ? (
                        /* Fallback: raw JSON if we can't parse emails */
                        <div className="p-6">
                            <p className="text-xs text-textTertiary mb-2">Raw output (could not parse email format):</p>
                            <pre className="text-sm text-textSecondary whitespace-pre-wrap font-mono bg-background rounded-xl p-4 border border-border overflow-x-auto max-h-[50vh]">
                                {JSON.stringify(outputData, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Mail className="w-12 h-12 text-textTertiary mb-4 opacity-30" />
                            <p className="text-textTertiary">No output data available yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
