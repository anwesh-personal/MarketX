'use client'

import { useEffect, useState } from 'react'
import { fetchStats, fetchRuns, triggerManualRun } from '@/lib/api'
import { Play, Zap, Database, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
    const [stats, setStats] = useState<any[]>([])
    const [runs, setRuns] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [running, setRunning] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [statsData, runsData] = await Promise.all([
                fetchStats(),
                fetchRuns()
            ])
            setStats(statsData)
            setRuns(runsData)
        } catch (error) {
            console.error('Failed to load data:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleManualRun() {
        setRunning(true)
        try {
            await triggerManualRun()
            await loadData()
            alert('Manual run completed successfully!')
        } catch (error) {
            alert('Manual run failed: ' + (error as Error).message)
        } finally {
            setRunning(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-slate-400">Loading dashboard...</div>
            </div>
        )
    }

    // Calculate KPIs
    const bookedCalls = stats.filter(s => s.event_type === 'BOOKED_CALL').reduce((acc, s) => acc + parseInt(s.count), 0)
    const activeExperiments = runs.filter(r => r.status === 'COMPLETED').length

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Command Center</h1>
                <p className="text-slate-400">Real-time system monitoring and control</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <KPICard
                    icon={<TrendingUp className="text-green-500" />}
                    label="Booked Calls (Last 30 Days)"
                    value={bookedCalls}
                    trend="+12%"
                />
                <KPICard
                    icon={<Zap className="text-amber-500" />}
                    label="Active Experiments"
                    value={activeExperiments}
                />
                <KPICard
                    icon={<Database className="text-blue-500" />}
                    label="KB Version"
                    value="1.0.0"
                />
            </div>

            {/* Action Panel */}
            <div className="card mb-8">
                <h2 className="text-xl font-bold mb-4">Actions</h2>
                <div className="flex gap-4">
                    <button
                        onClick={handleManualRun}
                        disabled={running}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Play size={16} />
                        {running ? 'Running...' : 'Manual Run'}
                    </button>
                    <button className="btn-secondary">
                        Force Sync
                    </button>
                </div>
            </div>

            {/* Recent Runs */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">Recent Runs</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Run ID</th>
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Type</th>
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                                <th className="text-left py-3 px-4 text-slate-400 font-medium">Started</th>
                            </tr>
                        </thead>
                        <tbody>
                            {runs.slice(0, 10).map((run) => (
                                <tr key={run.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                    <td className="py-3 px-4 font-mono text-sm">{run.id.substring(0, 8)}</td>
                                    <td className="py-3 px-4">{run.run_type}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded text-xs ${run.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                                run.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-amber-500/20 text-amber-400'
                                            }`}>
                                            {run.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-400 text-sm">
                                        {new Date(run.started_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function KPICard({ icon, label, value, trend }: any) {
    return (
        <div className="card">
            <div className="flex items-start justify-between mb-4">
                {icon}
                {trend && (
                    <span className="text-green-400 text-sm font-medium">{trend}</span>
                )}
            </div>
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className="text-sm text-slate-400">{label}</div>
        </div>
    )
}
