'use client'

import { useEffect, useState } from 'react'
import { fetchVariantAnalytics } from '@/lib/api'
import { TrendingUp, TrendingDown, Phone, Mail } from 'lucide-react'

export default function AnalyticsPage() {
    const [variants, setVariants] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showWinnersOnly, setShowWinnersOnly] = useState(false)

    useEffect(() => {
        loadAnalytics()
    }, [])

    async function loadAnalytics() {
        try {
            const data = await fetchVariantAnalytics()
            setVariants(data)
        } catch (error) {
            console.error('Failed to load analytics:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredVariants = showWinnersOnly
        ? variants.filter(v => v.booked_calls > 0)
        : variants

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-slate-400">Loading analytics...</div>
            </div>
        )
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Analytics Deep Dive</h1>
                <p className="text-slate-400">Performance metrics for all content variants</p>
            </div>

            {/* Filter Controls */}
            <div className="mb-6 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={showWinnersOnly}
                        onChange={(e) => setShowWinnersOnly(e.target.checked)}
                        className="rounded"
                    />
                    <span className="text-slate-300">Show Winners Only</span>
                </label>
                <div className="text-sm text-slate-500">
                    {filteredVariants.length} variants
                </div>
            </div>

            {/* Variants Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Variant ID</th>
                                <th className="text-center py-3 px-4 text-slate-400 font-medium">Replies</th>
                                <th className="text-center py-3 px-4 text-slate-400 font-medium">Booked Calls</th>
                                <th className="text-center py-3 px-4 text-slate-400 font-medium">Clicks</th>
                                <th className="text-center py-3 px-4 text-slate-400 font-medium">Bounces</th>
                                <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Last Event</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVariants.map((variant) => {
                                const isWinner = variant.booked_calls > 0
                                const bounceRate = variant.bounces / (variant.clicks || 1)
                                const isLoser = bounceRate > 0.15

                                return (
                                    <tr key={variant.variant_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                        <td className="py-3 px-4 font-mono text-sm">{variant.variant_id}</td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Mail size={14} className="text-slate-500" />
                                                {variant.replies}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Phone size={14} className="text-green-500" />
                                                <span className="font-bold text-green-400">{variant.booked_calls}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-400">{variant.clicks}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={bounceRate > 0.15 ? 'text-red-400 font-medium' : 'text-slate-400'}>
                                                {variant.bounces}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {isWinner && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                                                    <TrendingUp size={12} />
                                                    Winner
                                                </span>
                                            )}
                                            {isLoser && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">
                                                    <TrendingDown size={12} />
                                                    Killed
                                                </span>
                                            )}
                                            {!isWinner && !isLoser && (
                                                <span className="text-slate-500 text-xs">Active</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-slate-400 text-sm">
                                            {variant.last_event ? new Date(variant.last_event).toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
