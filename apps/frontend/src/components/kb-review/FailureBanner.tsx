'use client'

import React, { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, XCircle } from 'lucide-react'

interface FailedSection {
    section_number: number
    section_title: string
    error: string
}

interface Props {
    failedSections: FailedSection[]
    failureReport: any
    questionnaireStatus: string
}

export default function FailureBanner({ failedSections, failureReport, questionnaireStatus }: Props) {
    const [expanded, setExpanded] = useState(false)

    if (failedSections.length === 0 && !failureReport) return null

    const isFatal = questionnaireStatus === 'generation_failed'
    const isPartial = questionnaireStatus === 'generation_partial_failure'

    return (
        <div className={`mb-4 rounded-xl border overflow-hidden ${
            isFatal ? 'bg-error/5 border-error/30' : 'bg-warning/5 border-warning/30'
        }`}>
            {/* Header — always visible */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3"
            >
                <div className="flex items-center gap-2.5">
                    {isFatal ? (
                        <XCircle className="w-5 h-5 text-error shrink-0" />
                    ) : (
                        <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                    )}
                    <div className="text-left">
                        <div className={`text-sm font-semibold ${isFatal ? 'text-error' : 'text-warning'}`}>
                            {isFatal
                                ? 'Generation Failed'
                                : `${failedSections.length} Section${failedSections.length === 1 ? '' : 's'} Failed`
                            }
                        </div>
                        <div className="text-xs text-textTertiary">
                            {isFatal
                                ? 'The entire generation process crashed. Check provider configuration.'
                                : `${failureReport?.succeeded || 0} succeeded, ${failureReport?.failed || failedSections.length} failed, ${failureReport?.skipped_by_cascade || 0} skipped by cascade`
                            }
                        </div>
                    </div>
                </div>
                {expanded
                    ? <ChevronUp className="w-4 h-4 text-textTertiary" />
                    : <ChevronDown className="w-4 h-4 text-textTertiary" />
                }
            </button>

            {/* Expanded details */}
            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                    {isFatal && failureReport?.fatal_error && (
                        <div className="p-3 bg-error/10 rounded-lg">
                            <div className="text-xs font-semibold text-error mb-1">Fatal Error</div>
                            <code className="text-xs text-error/80 break-all">{failureReport.fatal_error}</code>
                            {failureReport.note && (
                                <p className="text-xs text-textTertiary mt-2">{failureReport.note}</p>
                            )}
                        </div>
                    )}

                    {failedSections.map(f => (
                        <div key={f.section_number} className="p-3 bg-surface rounded-lg border border-border/50">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs font-bold text-textPrimary">
                                    Section {f.section_number}
                                </span>
                                <span className="text-xs text-textSecondary">
                                    {f.section_title}
                                </span>
                            </div>
                            <div className="text-xs text-error/80 font-mono break-all whitespace-pre-wrap">
                                {f.error}
                            </div>
                        </div>
                    ))}

                    {failureReport?.failures?.length > 0 && failureReport.failures.some((f: any) => f.cascaded_to?.length > 0) && (
                        <div className="p-3 bg-warning/5 rounded-lg border border-warning/20">
                            <div className="text-xs font-semibold text-warning mb-1">Cascade Impact</div>
                            {failureReport.failures
                                .filter((f: any) => f.cascaded_to?.length > 0)
                                .map((f: any, i: number) => (
                                    <div key={i} className="text-xs text-textSecondary mt-1">
                                        <span className="text-textPrimary">{f.section}</span> failure blocked →{' '}
                                        {f.cascaded_to.join(', ')}
                                    </div>
                                ))
                            }
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
