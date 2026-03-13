'use client'

import { useState, useEffect } from 'react'
import {
    Brain,
    Sparkles,
    BarChart3,
    Database,
    GitBranch,
    Cpu,
    Zap,
    TrendingUp,
    Activity,
    Users,
    Settings,
    Target,
    BookOpen,
    Layers,
    ArrowRight,
    ChevronRight,
    Plus,
    X
} from 'lucide-react'
import { BrainBackground } from '@/components/BrainBackground'

// ============================================================
// TYPES
// ============================================================

interface BrainStats {
    totalRequests: number
    avgResponseTime: number
    successRate: number
    tokensUsed: number
    cacheHitRate: number
    activeAgents: number
    trends: {
        requests: number
        successRate: number
        responseTime: number
    }
    brainName: string
}

interface AgentPerformance {
    name: string
    type: string
    sessions: number
    avgResponseTime: number
    successRate: number
    tokensUsed: number
}

// ============================================================
// BRAIN COMMAND CENTER
// ============================================================

export default function BrainControlPage() {
    const [activeSection, setActiveSection] = useState('overview')
    const [stats, setStats] = useState<BrainStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadStats = async () => {
            try {
                const [analyticsRes, agentsRes, runtimeRes] = await Promise.all([
                    fetch('/api/brain/analytics?range=7d'),
                    fetch('/api/brain/agents'),
                    fetch('/api/brain/runtime')
                ])

                let totalRequests = 0, avgResponseTime = 0, successRate = 0, tokensUsed = 0, cacheHitRate = 0
                let trends = { requests: 0, successRate: 0, responseTime: 0 }
                if (analyticsRes.ok) {
                    const data = await analyticsRes.json()
                    totalRequests = data.totalRequests || 0
                    avgResponseTime = data.avgResponseTime || 0
                    successRate = data.successRate || 0
                    tokensUsed = data.tokensUsed || 0
                    cacheHitRate = data.ragMetrics?.cacheHitRate || 0
                    trends = data.trends || { requests: 0, successRate: 0, responseTime: 0 }
                }

                let activeAgents = 0
                if (agentsRes.ok) {
                    const data = await agentsRes.json()
                    activeAgents = (data.agents || []).filter((a: any) => a.is_active).length
                }

                let brainName = 'Not Deployed'
                if (runtimeRes.ok) {
                    const data = await runtimeRes.json()
                    brainName = data.runtime?.name || 'Active Brain'
                }

                setStats({ totalRequests, avgResponseTime, successRate, tokensUsed, cacheHitRate, activeAgents, trends, brainName })
            } catch (error) {
                console.error('Failed to load brain stats:', error)
                setStats({ totalRequests: 0, avgResponseTime: 0, successRate: 0, tokensUsed: 0, cacheHitRate: 0, activeAgents: 0, trends: { requests: 0, successRate: 0, responseTime: 0 }, brainName: 'Error' })
            } finally {
                setIsLoading(false)
            }
        }
        loadStats()
    }, [])

    const sections = [
        { id: 'overview', label: 'Overview', icon: Activity, color: 'from-info to-info/70' },
        { id: 'memory', label: 'Memory Palace', icon: Database, color: 'from-accent to-accent/70' },
        { id: 'agents', label: 'Agent Control', icon: Users, color: 'from-success to-success/70' },
        { id: 'training', label: 'Training Center', icon: Target, color: 'from-warning to-error' },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'from-accent/80 to-accent' },
        { id: 'config', label: 'Configuration', icon: Settings, color: 'from-muted-foreground to-muted-foreground/70' }
    ]

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <header className="border-b border-border/40 backdrop-blur-xl bg-background/80 sticky top-0 z-50 flex-shrink-0">
                <div className="px-8 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-accent-secondary/10 blur-xl" />
                                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20">
                                    <Brain className="w-8 h-8 text-accent" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold font-display text-textPrimary">
                                    Brain Command Center
                                </h1>
                                <p className="text-sm text-textSecondary">
                                    Full control over your AI brain system
                                </p>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center gap-6">
                            <QuickStat
                                label="Requests Today"
                                value={stats?.totalRequests.toLocaleString() || '---'}
                                icon={Zap}
                                trend={stats?.trends.requests ? `${stats.trends.requests >= 0 ? '+' : ''}${stats.trends.requests.toFixed(1)}%` : '---'}
                                color="text-info"
                            />
                            <QuickStat
                                label="Success Rate"
                                value={stats ? `${(stats.successRate * 100).toFixed(1)}%` : '---'}
                                icon={TrendingUp}
                                trend={stats?.trends.successRate ? `${stats.trends.successRate >= 0 ? '+' : ''}${stats.trends.successRate.toFixed(1)}%` : '---'}
                                color="text-success"
                            />
                            <QuickStat
                                label="Avg Response"
                                value={stats ? `${stats.avgResponseTime}ms` : '---'}
                                icon={Activity}
                                trend={stats?.trends.responseTime ? `${stats.trends.responseTime <= 0 ? '' : '+'}${stats.trends.responseTime}ms` : '---'}
                                color="text-accent"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Navigation */}
                <aside className="w-72 border-r border-border/40 bg-surface/30 backdrop-blur-md p-6 overflow-y-auto flex-shrink-0">
                    <div className="space-y-2">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full group relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${activeSection === section.id
                                    ? 'bg-[rgba(var(--color-accent-rgb),0.1)] border border-accent/40 shadow-sm'
                                    : 'hover:bg-surfaceHover border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className={`p-2 rounded-lg bg-gradient-to-br ${section.color} bg-opacity-10 transition-transform group-hover:scale-110`}>
                                        <section.icon className={`w-5 h-5 ${activeSection === section.id ? 'text-accent' : 'text-textSecondary'
                                            }`} />
                                    </div>
                                    <span className={`font-medium ${activeSection === section.id ? 'text-textPrimary' : 'text-textSecondary'
                                        }`}>
                                        {section.label}
                                    </span>
                                    <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${activeSection === section.id ? 'translate-x-1 text-accent' : 'text-textTertiary opacity-0 group-hover:opacity-100'
                                        }`} />
                                </div>
                                {activeSection === section.id && (
                                    <div className={`absolute inset-0 bg-gradient-to-r ${section.color} opacity-5`} />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Brain Status */}
                    <div className="mt-8 p-5 rounded-2xl bg-surface border border-border shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                            </div>
                            <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">System Status</span>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-textSecondary">Brain Template</span>
                                <span className="font-medium text-accent bg-[rgba(var(--color-accent-rgb),0.1)] px-2 py-0.5 rounded-md">{stats?.brainName || 'Not Deployed'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-textSecondary">Active Agents</span>
                                <span className="font-medium text-textPrimary">{stats?.activeAgents || 0}/4</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-textSecondary">Cache Hit Rate</span>
                                <span className="font-medium text-success">
                                    {stats ? `${(stats.cacheHitRate * 100).toFixed(0)}%` : '---'}
                                </span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-background relative">
                    <BrainBackground opacity={0.2} animation="float" mixBlendMode="soft-light" />
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-surface/30 to-background pointer-events-none" />
                    <div className="relative z-10 max-w-6xl mx-auto">
                        {activeSection === 'overview' && <OverviewSection stats={stats} />}
                        {activeSection === 'memory' && <MemoryPalaceSection />}
                        {activeSection === 'agents' && <AgentControlSection />}
                        {activeSection === 'training' && <TrainingCenterSection />}
                        {activeSection === 'analytics' && <AnalyticsSection />}
                        {activeSection === 'config' && <ConfigurationSection />}
                    </div>
                </main>
            </div>
        </div>
    )
}

// ============================================================
// QUICK STAT COMPONENT
// ============================================================

function QuickStat({ label, value, icon: Icon, trend, color }: any) {
    return (
        <div className="group">
            <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-textSecondary">{label}</span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-textPrimary">{value}</span>
                <span className={`text-xs font-medium ${trend.startsWith('+') ? 'text-success' : 'text-error'}`}>
                    {trend}
                </span>
            </div>
        </div>
    )
}

// ============================================================
// OVERVIEW SECTION
// ============================================================

function OverviewSection({ stats }: { stats: BrainStats | null }) {
    const metrics = [
        {
            label: 'Total Requests',
            value: stats?.totalRequests.toLocaleString() || '---',
            change: '+12.3%',
            icon: Zap,
            color: 'text-info',
            bg: 'bg-info-muted'
        },
        {
            label: 'Avg Response Time',
            value: stats ? `${stats.avgResponseTime}ms` : '---',
            change: stats?.trends.responseTime ? `${stats.trends.responseTime <= 0 ? '' : '+'}${stats.trends.responseTime}ms` : '---',
            icon: Activity,
            color: 'text-accent',
            bg: 'bg-[rgba(var(--color-accent-rgb),0.1)]'
        },
        {
            label: 'Success Rate',
            value: stats ? `${(stats.successRate * 100).toFixed(1)}%` : '---',
            change: '+2.1%',
            icon: TrendingUp,
            color: 'text-success',
            bg: 'bg-success-muted'
        },
        {
            label: 'Tokens Used',
            value: stats ? `${(stats.tokensUsed / 1000).toFixed(1)}K` : '---',
            change: '+5.4%',
            icon: Cpu,
            color: 'text-warning',
            bg: 'bg-warning-muted'
        }
    ]

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-display font-bold text-textPrimary mb-2">System Overview</h2>
                <p className="text-textSecondary">
                    Real-time insights into your AI brain performance
                </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric, i) => (
                    <MetricCard key={i} {...metric} index={i} />
                ))}
            </div>

            {/* Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ActivityFeed />
                <RecentQueries />
            </div>

            {/* Agent Status */}
            <AgentStatusGrid />
        </div>
    )
}

function MetricCard({ label, value, change, icon: Icon, color, bg, index }: any) {
    return (
        <div 
            className="premium-card group"
            style={{ animationDelay: `${index * 100}ms` }}
        >
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-500`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <span className={`badge ${change.startsWith('+') ? 'badge-success' : 'badge-error'}`}>
                        {change}
                    </span>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-textSecondary">{label}</p>
                    <p className="text-4xl font-display font-bold text-textPrimary tracking-tight">{value}</p>
                </div>
            </div>
        </div>
    )
}

function ActivityFeed() {
    const [activities, setActivities] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadActivities = async () => {
            try {
                const res = await fetch('/api/brain/analytics?range=24h')
                if (res.ok) {
                    const data = await res.json()
                    const recentLogs: any[] = []
                    if (data.agentUsage && data.agentUsage.length > 0) {
                        data.agentUsage.slice(0, 4).forEach((agent: any, i: number) => {
                            recentLogs.push({
                                type: agent.type,
                                message: `${agent.type} handled ${agent.count} requests`,
                                time: 'Last 24h',
                                color: agent.type === 'chat' ? 'bg-primary' : agent.type === 'writer' ? 'bg-info' : 'bg-success'
                            })
                        })
                    }
                    if (recentLogs.length === 0) {
                        recentLogs.push({ type: 'system', message: 'No recent activity', time: 'Now', color: 'bg-muted-foreground' })
                    }
                    setActivities(recentLogs)
                }
            } catch (error) {
                console.error('Failed to load activities:', error)
                setActivities([{ type: 'error', message: 'Could not load activity', time: 'Now', color: 'bg-error' }])
            } finally {
                setIsLoading(false)
            }
        }
        loadActivities()
    }, [])

    return (
        <div className="premium-card">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-textPrimary">Recent Activity</h3>
            </div>
            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="space-y-2">
                    {activities.map((activity, i) => (
                        <div key={i} className="group flex items-start gap-4 p-3 rounded-xl hover:bg-surfaceHover border border-transparent hover:border-border transition-all">
                            <div className="relative mt-1.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${activity.color}`} />
                                <div className={`absolute inset-0 rounded-full ${activity.color} animate-ping opacity-50`} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-textPrimary group-hover:text-accent transition-colors">{activity.message}</p>
                                <span className="text-xs text-textTertiary">{activity.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function RecentQueries() {
    const [queries, setQueries] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadQueries = async () => {
            try {
                const res = await fetch('/api/brain/analytics?range=7d')
                if (res.ok) {
                    const data = await res.json()
                    if (data.topQueries && data.topQueries.length > 0) {
                        setQueries(data.topQueries.slice(0, 5))
                    } else if (data.agentUsage && data.agentUsage.length > 0) {
                        setQueries(data.agentUsage.slice(0, 3).map((a: any) => ({
                            text: `${a.count} ${a.type} requests`,
                            agent: a.type,
                            count: a.count
                        })))
                    } else {
                        setQueries([])
                    }
                }
            } catch (error) {
                console.error('Failed to load queries:', error)
                setQueries([])
            } finally {
                setIsLoading(false)
            }
        }
        loadQueries()
    }, [])

    return (
        <div className="premium-card">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-textPrimary">Recent Queries</h3>
            </div>
            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
            ) : queries.length === 0 ? (
                <p className="text-sm text-textTertiary text-center py-4">No queries recorded yet</p>
            ) : (
                <div className="space-y-2">
                    {queries.map((q, i) => (
                        <div key={i} className="group p-4 rounded-xl hover:bg-surfaceHover border border-transparent hover:border-border transition-all flex flex-col justify-between">
                            <p className="text-sm font-medium text-textPrimary mb-3 group-hover:text-accent transition-colors">"{q.text}"</p>
                            <div className="flex items-center justify-between text-xs">
                                <span className="badge badge-accent">{q.agent}</span>
                                <span className="text-textTertiary flex items-center gap-1">
                                    <Activity className="w-3 h-3" />
                                    {q.count} times
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function AgentStatusGrid() {
    const [agents, setAgents] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadAgents = async () => {
            try {
                const res = await fetch('/api/brain/agents')
                if (res.ok) {
                    const data = await res.json()
                    setAgents(data.agents || [])
                }
            } catch (error) {
                console.error('Failed to load agents:', error)
                setAgents([])
            } finally {
                setIsLoading(false)
            }
        }
        loadAgents()
    }, [])

    const getAgentIcon = (type: string) => {
        switch (type) {
            case 'writer': return Zap
            case 'analyst': return BarChart3
            case 'coach': return Target
            default: return Brain
        }
    }

    const getAgentColor = (type: string, isActive: boolean) => {
        if (!isActive) return { color: 'text-textTertiary', bg: 'bg-surfaceHover' }
        switch (type) {
            case 'writer': return { color: 'text-info', bg: 'bg-info-muted' }
            case 'analyst': return { color: 'text-accent', bg: 'bg-[rgba(var(--color-accent-rgb),0.1)]' }
            case 'coach': return { color: 'text-warning', bg: 'bg-warning-muted' }
            default: return { color: 'text-success', bg: 'bg-success-muted' }
        }
    }

    return (
        <div>
            <h3 className="text-xl font-bold text-textPrimary mb-6">Agent Status</h3>
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            ) : agents.length === 0 ? (
                <div className="rounded-xl border border-border/40 bg-muted/20 p-12 text-center">
                    <Brain className="w-12 h-12 text-textTertiary mx-auto mb-4" />
                    <p className="text-textSecondary">No agents deployed for this organization</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {agents.map((agent, i) => {
                        const IconComponent = getAgentIcon(agent.agent_type)
                        const colors = getAgentColor(agent.agent_type, agent.is_active)
                        return (
                            <div
                                key={agent.id || i}
                                className="premium-card group hover:border-accent transition-colors"
                            >
                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center ${colors.color} group-hover:scale-110 transition-transform`}>
                                            <IconComponent className="w-6 h-6" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-textSecondary uppercase tracking-wider">
                                                {agent.is_active ? 'active' : 'inactive'}
                                            </span>
                                            <div className={`w-2 h-2 rounded-full ${agent.is_active ? 'bg-success animate-pulse' : 'bg-textTertiary'}`} />
                                        </div>
                                    </div>
                                    
                                    <h4 className="font-bold text-lg text-textPrimary mb-4">{agent.name}</h4>
                                    
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center pb-2 border-b border-border/50">
                                            <span className="text-sm text-textSecondary">Type</span>
                                            <span className="font-medium text-textPrimary capitalize">{agent.agent_type}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-textSecondary">Tools</span>
                                            <span className="font-medium text-textPrimary">{agent.tools?.length || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ============================================================
// MEMORY PALACE - FULL IMPLEMENTATION
// ============================================================

function MemoryPalaceSection() {
    const [embeddings, setEmbeddings] = useState<any[]>([])
    const [filteredEmbeddings, setFilteredEmbeddings] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState('all')
    const [stats, setStats] = useState({ total: 0, kb: 0, conversation: 0, memory: 0 })
    const [selectedEmbedding, setSelectedEmbedding] = useState<any>(null)

    useEffect(() => {
        loadEmbeddings()
    }, [])

    useEffect(() => {
        filterEmbeddings()
    }, [searchQuery, filterType, embeddings])

    const loadEmbeddings = async () => {
        try {
            const response = await fetch('/api/brain/embeddings')
            if (response.ok) {
                const data = await response.json()
                setEmbeddings(data.embeddings || [])

                // Calculate stats
                const total = data.embeddings?.length || 0
                const kb = data.embeddings?.filter((e: any) => e.source_type === 'kb').length || 0
                const conversation = data.embeddings?.filter((e: any) => e.source_type === 'conversation').length || 0
                const memory = data.embeddings?.filter((e: any) => e.source_type === 'user_memory').length || 0

                setStats({ total, kb, conversation, memory })
            }
        } catch (error) {
            console.error('Failed to load embeddings:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const filterEmbeddings = () => {
        let filtered = embeddings

        // Filter by type
        if (filterType !== 'all') {
            filtered = filtered.filter(e => e.source_type === filterType)
        }

        // Filter by search
        if (searchQuery) {
            filtered = filtered.filter(e =>
                e.content?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        setFilteredEmbeddings(filtered)
    }

    const deleteEmbedding = async (id: string) => {
        if (!confirm('Delete this embedding?')) return

        try {
            const response = await fetch(`/api/brain/embeddings/${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                await loadEmbeddings()
                setSelectedEmbedding(null)
            }
        } catch (error) {
            alert('Failed to delete embedding')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold mb-2">Memory Palace</h2>
                <p className="text-muted-foreground">
                    Explore and manage your knowledge embeddings
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-accent/5 to-accent/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Database className="w-5 h-5 text-accent" />
                        <span className="text-sm text-muted-foreground">Total Embeddings</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-info/5 to-info/10">
                    <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-5 h-5 text-info" />
                        <span className="text-sm text-muted-foreground">Knowledge Base</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.kb.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-success/5 to-success/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-success" />
                        <span className="text-sm text-muted-foreground">Conversations</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.conversation.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-warning/5 to-error/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-5 h-5 text-warning" />
                        <span className="text-sm text-muted-foreground">User Memories</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.memory.toLocaleString()}</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-4">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search embeddings..."
                    className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <option value="all">All Types</option>
                    <option value="kb">Knowledge Base</option>
                    <option value="conversation">Conversations</option>
                    <option value="user_memory">User Memories</option>
                </select>
            </div>

            {/* Embeddings List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            ) : filteredEmbeddings.length === 0 ? (
                <div className="rounded-xl border border-border/40 bg-muted/20 p-12 text-center">
                    <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Embeddings Found</h3>
                    <p className="text-muted-foreground">
                        {searchQuery ? 'Try a different search query' : 'Start adding content to your knowledge base'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredEmbeddings.slice(0, 50).map((embedding) => (
                        <div
                            key={embedding.id}
                            onClick={() => setSelectedEmbedding(embedding)}
                            className="p-4 rounded-xl border border-border/40 bg-background hover:border-accent/40 hover:shadow-lg transition-all cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${embedding.source_type === 'kb' ? 'bg-[rgba(var(--color-accent-rgb),0.1)] text-accent' :
                                    embedding.source_type === 'conversation' ? 'bg-success/10 text-success' :
                                        'bg-warning/10 text-warning'
                                    }`}>
                                    {embedding.source_type}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Chunk {embedding.chunk_index}
                                </span>
                            </div>
                            <p className="text-sm line-clamp-3 mb-2">{embedding.content}</p>
                            <span className="text-xs text-muted-foreground">
                                {new Date(embedding.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {filteredEmbeddings.length > 50 && (
                <p className="text-center text-sm text-muted-foreground">
                    Showing 50 of {filteredEmbeddings.length} embeddings
                </p>
            )}

            {/* Detail Modal */}
            {selectedEmbedding && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-background rounded-2xl border border-border/40 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border/40 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Embedding Details</h3>
                            <button
                                onClick={() => setSelectedEmbedding(null)}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Type</label>
                                <p className="mt-1">{selectedEmbedding.source_type}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Content</label>
                                <p className="mt-1 whitespace-pre-wrap">{selectedEmbedding.content}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Chunk Index</label>
                                <p className="mt-1">{selectedEmbedding.chunk_index}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Created</label>
                                <p className="mt-1">{new Date(selectedEmbedding.created_at).toLocaleString()}</p>
                            </div>
                            {selectedEmbedding.metadata && Object.keys(selectedEmbedding.metadata).length > 0 && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Metadata</label>
                                    <pre className="mt-1 p-4 rounded-lg bg-muted text-sm overflow-x-auto">
                                        {JSON.stringify(selectedEmbedding.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-border/40 flex gap-3">
                            <button
                                onClick={() => setSelectedEmbedding(null)}
                                className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => deleteEmbedding(selectedEmbedding.id)}
                                className="px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ============================================================
// AGENT CONTROL - FULL IMPLEMENTATION
// ============================================================

function AgentControlSection() {
    const [agents, setAgents] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedAgent, setSelectedAgent] = useState<any>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({ system_prompt: '', config: {} })

    useEffect(() => {
        loadAgents()
    }, [])

    const loadAgents = async () => {
        try {
            const response = await fetch('/api/brain/agents')
            if (response.ok) {
                const data = await response.json()
                setAgents(data.agents || [])
            }
        } catch (error) {
            console.error('Failed to load agents:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const toggleAgent = async (agentId: string, isActive: boolean) => {
        try {
            const response = await fetch(`/api/brain/agents/${agentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !isActive })
            })

            if (response.ok) {
                await loadAgents()
            }
        } catch (error) {
            alert('Failed to toggle agent')
        }
    }

    const updateAgent = async () => {
        if (!selectedAgent) return

        try {
            const response = await fetch(`/api/brain/agents/${selectedAgent.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_prompt: editForm.system_prompt,
                    config: editForm.config
                })
            })

            if (response.ok) {
                await loadAgents()
                setIsEditing(false)
                setSelectedAgent(null)
            }
        } catch (error) {
            alert('Failed to update agent')
        }
    }

    const openEditModal = (agent: any) => {
        setSelectedAgent(agent)
        setEditForm({
            system_prompt: agent.system_prompt,
            config: agent.config || {}
        })
        setIsEditing(true)
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold mb-2">Agent Control</h2>
                <p className="text-muted-foreground">
                    Manage and configure your AI agents
                </p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {agents.map((agent) => (
                        <div
                            key={agent.id}
                            className="relative overflow-hidden rounded-2xl border border-border/40 bg-background hover:shadow-xl transition-all duration-300"
                        >
                            <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-br ${agent.agent_type === 'writer' ? 'from-info/20 to-info/10' :
                                agent.agent_type === 'analyst' ? 'from-accent/20 to-accent/10' :
                                    agent.agent_type === 'coach' ? 'from-warning/20 to-error/20' :
                                        'from-success/20 to-success/10'
                                }`} />

                            <div className="relative p-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">{agent.name}</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-[rgba(var(--color-accent-rgb),0.1)] text-accent text-xs font-medium">
                                            {agent.agent_type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleAgent(agent.id, agent.is_active)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${agent.is_active ? 'bg-primary' : 'bg-muted'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${agent.is_active ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Status: </span>
                                        <span className={`font-medium ${agent.is_active ? 'text-success' : 'text-error'}`}>
                                            {agent.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Tools: </span>
                                        <span className="font-medium">{agent.tools?.length || 0}</span>
                                    </div>
                                    <div className="pt-2">
                                        <span className="text-muted-foreground text-xs block mb-2">System Prompt Preview:</span>
                                        <p className="text-xs bg-muted p-3 rounded-lg line-clamp-3">
                                            {agent.system_prompt}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => openEditModal(agent)}
                                        className="flex-1 px-4 py-2 rounded-lg bg-[rgba(var(--color-accent-rgb),0.1)] text-accent hover:bg-[rgba(var(--color-accent-rgb),0.2)] transition-colors font-medium"
                                    >
                                        Configure
                                    </button>
                                    <button
                                        onClick={() => setSelectedAgent(agent)}
                                        className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {isEditing && selectedAgent && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-background rounded-2xl border border-border/40 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border/40">
                            <h3 className="text-2xl font-bold">Configure {selectedAgent.name}</h3>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">System Prompt</label>
                                <textarea
                                    value={editForm.system_prompt}
                                    onChange={(e) => setEditForm({ ...editForm, system_prompt: e.target.value })}
                                    rows={8}
                                    className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-sm"
                                    placeholder="Enter agent system prompt..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Configuration (JSON)</label>
                                <textarea
                                    value={JSON.stringify(editForm.config, null, 2)}
                                    onChange={(e) => {
                                        try {
                                            setEditForm({ ...editForm, config: JSON.parse(e.target.value) })
                                        } catch (err) {
                                            // Invalid JSON, ignore
                                        }
                                    }}
                                    rows={6}
                                    className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Tools</label>
                                <div className="flex flex-wrap gap-2">
                                    {selectedAgent.tools?.map((tool: string, i: number) => (
                                        <span key={i} className="px-3 py-1 rounded-full bg-[rgba(var(--color-accent-rgb),0.1)] text-accent text-sm">
                                            {tool}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border/40 flex gap-3">
                            <button
                                onClick={() => {
                                    setIsEditing(false)
                                    setSelectedAgent(null)
                                }}
                                className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={updateAgent}
                                className="flex-1 px-4 py-2 rounded-lg bg-accent text-onAccent hover:scale-105 transition-all shadow-lg"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {selectedAgent && !isEditing && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-background rounded-2xl border border-border/40 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border/40 flex items-center justify-between">
                            <h3 className="text-xl font-bold">{selectedAgent.name} Details</h3>
                            <button
                                onClick={() => setSelectedAgent(null)}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Type</label>
                                <p className="mt-1 font-medium">{selectedAgent.agent_type}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <p className={`mt-1 font-medium ${selectedAgent.is_active ? 'text-success' : 'text-error'}`}>
                                    {selectedAgent.is_active ? 'Active' : 'Inactive'}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">System Prompt</label>
                                <p className="mt-1 whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
                                    {selectedAgent.system_prompt}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Tools</label>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedAgent.tools?.map((tool: string, i: number) => (
                                        <span key={i} className="px-3 py-1 rounded-full bg-[rgba(var(--color-accent-rgb),0.1)] text-accent text-sm">
                                            {tool}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Configuration</label>
                                <pre className="mt-1 p-4 rounded-lg bg-muted text-sm overflow-x-auto">
                                    {JSON.stringify(selectedAgent.config, null, 2)}
                                </pre>
                            </div>
                        </div>
                        <div className="p-6 border-t border-border/40">
                            <button
                                onClick={() => setSelectedAgent(null)}
                                className="w-full px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ============================================================
// TRAINING CENTER - FULL IMPLEMENTATION
// ============================================================

function TrainingCenterSection() {
    const [activeTab, setActiveTab] = useState('feedback')
    const [feedbackData, setFeedbackData] = useState<any[]>([])
    const [intentPatterns, setIntentPatterns] = useState<any[]>([])
    const [queryExpansions, setQueryExpansions] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showAddPattern, setShowAddPattern] = useState(false)
    const [newPattern, setNewPattern] = useState({ agent_type: 'generalist', keywords: '', priority: 5 })

    useEffect(() => {
        loadTrainingData()
    }, [activeTab])

    const loadTrainingData = async () => {
        setIsLoading(true)
        try {
            if (activeTab === 'feedback') {
                const response = await fetch('/api/brain/training/feedback')
                if (response.ok) {
                    const data = await response.json()
                    setFeedbackData(data.feedback || [])
                }
            } else if (activeTab === 'patterns') {
                const response = await fetch('/api/brain/training/intent-patterns')
                if (response.ok) {
                    const data = await response.json()
                    setIntentPatterns(data.patterns || [])
                }
            } else if (activeTab === 'expansions') {
                const response = await fetch('/api/brain/training/query-expansions')
                if (response.ok) {
                    const data = await response.json()
                    setQueryExpansions(data.expansions || [])
                }
            }
        } catch (error) {
            console.error('Failed to load training data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const addIntentPattern = async () => {
        if (!newPattern.keywords.trim()) {
            alert('Please enter keywords')
            return
        }

        try {
            const response = await fetch('/api/brain/training/intent-patterns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_type: newPattern.agent_type,
                    keywords: newPattern.keywords.split(',').map(k => k.trim()),
                    priority: newPattern.priority
                })
            })

            if (response.ok) {
                await loadTrainingData()
                setShowAddPattern(false)
                setNewPattern({ agent_type: 'generalist', keywords: '', priority: 5 })
            }
        } catch (error) {
            alert('Failed to add pattern')
        }
    }

    const togglePattern = async (patternId: string, isActive: boolean) => {
        try {
            const response = await fetch(`/api/brain/training/intent-patterns/${patternId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !isActive })
            })

            if (response.ok) {
                await loadTrainingData()
            }
        } catch (error) {
            alert('Failed to toggle pattern')
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold mb-2">Training Center</h2>
                <p className="text-muted-foreground">
                    RLHF, pattern learning, and continuous improvement
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border/40">
                <button
                    onClick={() => setActiveTab('feedback')}
                    className={`px-6 py-3 font-medium transition-colors ${activeTab === 'feedback'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-muted-foreground hover:text-textPrimary'
                        }`}
                >
                    User Feedback
                </button>
                <button
                    onClick={() => setActiveTab('patterns')}
                    className={`px-6 py-3 font-medium transition-colors ${activeTab === 'patterns'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-muted-foreground hover:text-textPrimary'
                        }`}
                >
                    Intent Patterns
                </button>
                <button
                    onClick={() => setActiveTab('expansions')}
                    className={`px-6 py-3 font-medium transition-colors ${activeTab === 'expansions'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-muted-foreground hover:text-textPrimary'
                        }`}
                >
                    Query Expansions
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            ) : (
                <>
                    {/* Feedback Tab */}
                    {activeTab === 'feedback' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-success/5 to-success/10">
                                    <div className="text-sm text-muted-foreground mb-1">Positive Feedback</div>
                                    <div className="text-2xl font-bold text-success">
                                        {feedbackData.filter(f => f.rating > 0).length}
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-error/5 to-warning/5">
                                    <div className="text-sm text-muted-foreground mb-1">Negative Feedback</div>
                                    <div className="text-2xl font-bold text-error">
                                        {feedbackData.filter(f => f.rating < 0).length}
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-info/5 to-info/10">
                                    <div className="text-sm text-muted-foreground mb-1">Avg Satisfaction</div>
                                    <div className="text-2xl font-bold">
                                        {feedbackData.length > 0
                                            ? ((feedbackData.filter(f => f.rating > 0).length / feedbackData.length) * 100).toFixed(0) + '%'
                                            : 'N/A'}
                                    </div>
                                </div>
                            </div>

                            {feedbackData.length === 0 ? (
                                <div className="rounded-xl border border-border/40 bg-muted/20 p-12 text-center">
                                    <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">No Feedback Yet</h3>
                                    <p className="text-muted-foreground">User feedback will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {feedbackData.map((feedback, i) => (
                                        <div key={i} className="p-4 rounded-xl border border-border/40 bg-background">
                                            <div className="flex items-start justify-between mb-2">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${feedback.rating > 0 ? 'bg-success/10 text-success' :
                                                    feedback.rating < 0 ? 'bg-error/10 text-error' :
                                                        'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {feedback.rating > 0 ? '👍 Positive' : feedback.rating < 0 ? '👎 Negative' : 'Neutral'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(feedback.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm mb-2">{feedback.query}</p>
                                            {feedback.comment && (
                                                <p className="text-xs text-muted-foreground italic">"{feedback.comment}"</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Intent Patterns Tab */}
                    {activeTab === 'patterns' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-muted-foreground">
                                    {intentPatterns.length} intent patterns configured
                                </p>
                                <button
                                    onClick={() => setShowAddPattern(true)}
                                    className="px-4 py-2 rounded-lg bg-accent text-onAccent hover:scale-105 transition-all shadow-lg flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Pattern
                                </button>
                            </div>

                            {intentPatterns.length === 0 ? (
                                <div className="rounded-xl border border-border/40 bg-muted/20 p-12 text-center">
                                    <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">No Patterns</h3>
                                    <p className="text-muted-foreground">Add intent patterns to improve routing</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {intentPatterns.map((pattern) => (
                                        <div key={pattern.id} className="p-4 rounded-xl border border-border/40 bg-background">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2 py-0.5 rounded-full bg-[rgba(var(--color-accent-rgb),0.1)] text-accent text-xs font-medium">
                                                            {pattern.agent_type}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            Priority: {pattern.priority}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {pattern.keywords.map((keyword: string, i: number) => (
                                                            <span key={i} className="px-2 py-0.5 rounded bg-muted text-xs">
                                                                {keyword}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => togglePattern(pattern.id, pattern.is_active)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pattern.is_active ? 'bg-primary' : 'bg-muted'
                                                        }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${pattern.is_active ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Pattern Modal */}
                            {showAddPattern && (
                                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                    <div className="bg-background rounded-2xl border border-border/40 max-w-lg w-full">
                                        <div className="p-6 border-b border-border/40">
                                            <h3 className="text-xl font-bold">Add Intent Pattern</h3>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Agent Type</label>
                                                <select
                                                    value={newPattern.agent_type}
                                                    onChange={(e) => setNewPattern({ ...newPattern, agent_type: e.target.value })}
                                                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                >
                                                    <option value="writer">Writer</option>
                                                    <option value="analyst">Analyst</option>
                                                    <option value="coach">Coach</option>
                                                    <option value="generalist">Generalist</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Keywords (comma-separated)</label>
                                                <input
                                                    type="text"
                                                    value={newPattern.keywords}
                                                    onChange={(e) => setNewPattern({ ...newPattern, keywords: e.target.value })}
                                                    placeholder="write, create, compose, author"
                                                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Priority (1-20)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="20"
                                                    value={newPattern.priority}
                                                    onChange={(e) => setNewPattern({ ...newPattern, priority: parseInt(e.target.value) })}
                                                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                />
                                            </div>
                                        </div>
                                        <div className="p-6 border-t border-border/40 flex gap-3">
                                            <button
                                                onClick={() => setShowAddPattern(false)}
                                                className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={addIntentPattern}
                                                className="flex-1 px-4 py-2 rounded-lg bg-accent text-onAccent hover:scale-105 transition-all"
                                            >
                                                Add Pattern
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Query Expansions Tab */}
                    {activeTab === 'expansions' && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {queryExpansions.length} query expansions tracked
                            </p>

                            {queryExpansions.length === 0 ? (
                                <div className="rounded-xl border border-border/40 bg-muted/20 p-12 text-center">
                                    <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">No Expansions Yet</h3>
                                    <p className="text-muted-foreground">Query expansions will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {queryExpansions.map((expansion, i) => (
                                        <div key={i} className="p-4 rounded-xl border border-border/40 bg-background">
                                            <div className="mb-3">
                                                <span className="text-xs text-muted-foreground">Original Query:</span>
                                                <p className="text-sm font-medium mt-1">{expansion.original_query}</p>
                                            </div>
                                            <div className="mb-2">
                                                <span className="text-xs text-muted-foreground">Expanded Queries:</span>
                                                <div className="mt-2 space-y-1">
                                                    {expansion.expanded_queries.map((eq: string, j: number) => (
                                                        <div key={j} className="text-sm bg-muted p-2 rounded">
                                                            {eq}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span className="px-2 py-0.5 rounded-full bg-[rgba(var(--color-accent-rgb),0.1)] text-accent">
                                                    {expansion.expansion_method}
                                                </span>
                                                <span>{new Date(expansion.created_at).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// ============================================================
// ANALYTICS - FULL IMPLEMENTATION
// ============================================================

function AnalyticsSection() {
    const [timeRange, setTimeRange] = useState('7d')
    const [analyticsData, setAnalyticsData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadAnalytics()
    }, [timeRange])

    const loadAnalytics = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`/api/brain/analytics?range=${timeRange}`)
            if (response.ok) {
                const data = await response.json()
                setAnalyticsData(data)
            }
        } catch (error) {
            console.error('Failed to load analytics:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold mb-2">Analytics Dashboard</h2>
                    <p className="text-muted-foreground">
                        Deep insights into brain performance
                    </p>
                </div>
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                </select>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            ) : (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-6 rounded-xl border border-border/40 bg-gradient-to-br from-info/5 to-info/10">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap className="w-5 h-5 text-info" />
                                <span className="text-sm text-muted-foreground">Total Requests</span>
                            </div>
                            <p className="text-3xl font-bold mb-1">{analyticsData?.totalRequests?.toLocaleString() || '0'}</p>
                            <p className={`text-xs ${(analyticsData?.trends?.requests ?? 0) >= 0 ? 'text-success' : 'text-error'}`}>
                                {analyticsData?.trends?.requests !== undefined ? `${analyticsData.trends.requests >= 0 ? '+' : ''}${analyticsData.trends.requests.toFixed(1)}% from previous period` : 'No comparison data'}
                            </p>
                        </div>

                        <div className="p-6 rounded-xl border border-border/40 bg-gradient-to-br from-success/5 to-success/10">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="w-5 h-5 text-success" />
                                <span className="text-sm text-muted-foreground">Success Rate</span>
                            </div>
                            <p className="text-3xl font-bold mb-1">{analyticsData?.successRate ? `${(analyticsData.successRate * 100).toFixed(1)}%` : '0%'}</p>
                            <p className={`text-xs ${(analyticsData?.trends?.successRate ?? 0) >= 0 ? 'text-success' : 'text-error'}`}>
                                {analyticsData?.trends?.successRate !== undefined ? `${analyticsData.trends.successRate >= 0 ? '+' : ''}${analyticsData.trends.successRate.toFixed(1)}% from previous period` : 'No comparison data'}
                            </p>
                        </div>

                        <div className="p-6 rounded-xl border border-border/40 bg-gradient-to-br from-accent/5 to-accent/10">
                            <div className="flex items-center gap-2 mb-3">
                                <Activity className="w-5 h-5 text-accent" />
                                <span className="text-sm text-muted-foreground">Avg Response</span>
                            </div>
                            <p className="text-3xl font-bold mb-1">{analyticsData?.avgResponseTime || '0'}ms</p>
                            <p className={`text-xs ${(analyticsData?.trends?.responseTime ?? 0) <= 0 ? 'text-success' : 'text-error'}`}>
                                {analyticsData?.trends?.responseTime !== undefined ? `${analyticsData.trends.responseTime <= 0 ? '' : '+'}${analyticsData.trends.responseTime}ms from previous period` : 'No comparison data'}
                            </p>
                        </div>

                        <div className="p-6 rounded-xl border border-border/40 bg-gradient-to-br from-warning/5 to-error/5">
                            <div className="flex items-center gap-2 mb-3">
                                <Cpu className="w-5 h-5 text-warning" />
                                <span className="text-sm text-muted-foreground">Tokens Used</span>
                            </div>
                            <p className="text-3xl font-bold mb-1">{analyticsData?.tokensUsed ? `${(analyticsData.tokensUsed / 1000).toFixed(1)}K` : '0'}</p>
                            <p className="text-xs text-warning">+5.4% from previous period</p>
                        </div>
                    </div>

                    {/* RAG Performance */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="p-6 rounded-xl border border-border/40 bg-background">
                            <h3 className="text-lg font-semibold mb-4">RAG Performance</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-muted-foreground">Cache Hit Rate</span>
                                        <span className="font-medium">{analyticsData?.ragMetrics?.cacheHitRate ? `${(analyticsData.ragMetrics.cacheHitRate * 100).toFixed(0)}%` : '0%'}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-success to-success/70 transition-all"
                                            style={{ width: `${(analyticsData?.ragMetrics?.cacheHitRate || 0) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-muted-foreground">Reranking Enabled</span>
                                        <span className="font-medium">{analyticsData?.ragMetrics?.rerankingUsage ? `${(analyticsData.ragMetrics.rerankingUsage * 100).toFixed(0)}%` : '0%'}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-accent to-accent/70 transition-all"
                                            style={{ width: `${(analyticsData?.ragMetrics?.rerankingUsage || 0) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-muted-foreground">Avg Retrieval Time</span>
                                        <span className="font-medium">{analyticsData?.ragMetrics?.avgRetrievalTime || '0'}ms</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-info to-info/70 transition-all"
                                            style={{ width: '75%' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-xl border border-border/40 bg-background">
                            <h3 className="text-lg font-semibold mb-4">Agent Distribution</h3>
                            <div className="space-y-3">
                                {analyticsData?.agentUsage?.map((agent: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${agent.type === 'writer' ? 'bg-primary' :
                                                agent.type === 'analyst' ? 'bg-accent' :
                                                    agent.type === 'coach' ? 'bg-warning' :
                                                        'bg-success'
                                                }`} />
                                            <span className="font-medium capitalize">{agent.type}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-muted-foreground">{agent.count} requests</span>
                                            <span className="text-sm font-medium">{agent.percentage}%</span>
                                        </div>
                                    </div>
                                )) || (
                                        <p className="text-sm text-muted-foreground text-center py-4">No agent usage data</p>
                                    )}
                            </div>
                        </div>
                    </div>

                    {/* Token Usage Over Time */}
                    <div className="p-6 rounded-xl border border-border/40 bg-background">
                        <h3 className="text-lg font-semibold mb-4">Token Usage Trends</h3>
                        <div className="h-64 flex items-end justify-between gap-2">
                            {analyticsData?.tokenTrends?.map((day: any, i: number) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="w-full bg-gradient-to-t from-primary/80 to-primary/40 rounded-t-lg hover:from-primary hover:to-primary/60 transition-all cursor-pointer"
                                        style={{ height: `${(day.tokens / Math.max(...(analyticsData?.tokenTrends?.map((d: any) => d.tokens) || [1]))) * 100}%` }}>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{day.date}</span>
                                </div>
                            )) || (
                                    <div className="w-full flex items-center justify-center h-full">
                                        <p className="text-sm text-muted-foreground">No token usage data</p>
                                    </div>
                                )}
                        </div>
                    </div>

                    {/* Response Time Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="p-6 rounded-xl border border-border/40 bg-background">
                            <h3 className="text-lg font-semibold mb-4">Response Time Distribution</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">&lt; 200ms</span>
                                    <div className="flex items-center gap-2 flex-1 mx-4">
                                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                            <div className="h-full bg-success" style={{ width: '65%' }} />
                                        </div>
                                        <span className="text-sm font-medium w-12 text-right">65%</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">200-500ms</span>
                                    <div className="flex items-center gap-2 flex-1 mx-4">
                                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                            <div className="h-full bg-primary" style={{ width: '25%' }} />
                                        </div>
                                        <span className="text-sm font-medium w-12 text-right">25%</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">500ms-1s</span>
                                    <div className="flex items-center gap-2 flex-1 mx-4">
                                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                            <div className="h-full bg-warning" style={{ width: '8%' }} />
                                        </div>
                                        <span className="text-sm font-medium w-12 text-right">8%</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">&gt; 1s</span>
                                    <div className="flex items-center gap-2 flex-1 mx-4">
                                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                            <div className="h-full bg-error" style={{ width: '2%' }} />
                                        </div>
                                        <span className="text-sm font-medium w-12 text-right">2%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-xl border border-border/40 bg-background">
                            <h3 className="text-lg font-semibold mb-4">Top Queries</h3>
                            <div className="space-y-2">
                                {analyticsData?.topQueries?.map((query: any, i: number) => (
                                    <div key={i} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                        <p className="text-sm font-medium line-clamp-1">{query.text}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-muted-foreground">{query.count} times</span>
                                            <span className="px-2 py-0.5 rounded-full bg-[rgba(var(--color-accent-rgb),0.1)] text-accent text-xs">
                                                {query.agent}
                                            </span>
                                        </div>
                                    </div>
                                )) || (
                                        <p className="text-sm text-muted-foreground text-center py-4">No query data</p>
                                    )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

// ============================================================
// CONFIGURATION - FULL IMPLEMENTATION
// ============================================================

function ConfigurationSection() {
    const [brainTemplates, setBrainTemplates] = useState<any[]>([])
    const [activeBrain, setActiveBrain] = useState<any>(null)
    const [ragConfig, setRagConfig] = useState<any>(null)
    const [providers, setProviders] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        loadConfiguration()
    }, [])

    const loadConfiguration = async () => {
        setIsLoading(true)
        try {
            const [brainsRes, configRes, providersRes] = await Promise.all([
                fetch('/api/brain/templates'),
                fetch('/api/brain/config'),
                fetch('/api/brain/providers')
            ])

            if (brainsRes.ok) {
                const data = await brainsRes.json()
                setBrainTemplates(data.templates || [])
                setActiveBrain(data.templates?.find((t: any) => t.is_default))
            }

            if (configRes.ok) {
                const data = await configRes.json()
                setRagConfig(data.ragConfig || {})
            }

            if (providersRes.ok) {
                const data = await providersRes.json()
                setProviders(data.providers || [])
            }
        } catch (error) {
            console.error('Failed to load configuration:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const switchBrainTemplate = async (templateId: string) => {
        try {
            const response = await fetch('/api/brain/templates/switch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId })
            })

            if (response.ok) {
                await loadConfiguration()
            }
        } catch (error) {
            alert('Failed to switch brain template')
        }
    }

    const updateRAGConfig = async () => {
        setIsSaving(true)
        try {
            const response = await fetch('/api/brain/config/rag', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ragConfig)
            })

            if (response.ok) {
                alert('RAG configuration updated successfully')
            }
        } catch (error) {
            alert('Failed to update RAG configuration')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold mb-2">Configuration</h2>
                <p className="text-muted-foreground">
                    Configure brain templates and system settings
                </p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            ) : (
                <>
                    {/* Brain Template Selection */}
                    <div className="p-6 rounded-xl border border-border/40 bg-background">
                        <h3 className="text-lg font-semibold mb-4">Brain Template</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {brainTemplates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => switchBrainTemplate(template.id)}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${activeBrain?.id === template.id
                                        ? 'border-accent bg-[rgba(var(--color-accent-rgb),0.05)]'
                                        : 'border-border/40 hover:border-accent/40'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-bold">{template.name}</h4>
                                        {activeBrain?.id === template.id && (
                                            <span className="px-2 py-0.5 rounded-full bg-accent text-onAccent text-xs">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">{template.pricing_tier}</p>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">RAG topK:</span>
                                            <span>{template.config?.rag?.topK || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Reranking:</span>
                                            <span>{template.config?.rag?.rerankingEnabled ? 'Yes' : 'No'}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RAG Configuration */}
                    {ragConfig && (
                        <div className="p-6 rounded-xl border border-border/40 bg-background">
                            <h3 className="text-lg font-semibold mb-4">RAG Configuration</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Top K Results</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={ragConfig.topK || 5}
                                        onChange={(e) => setRagConfig({ ...ragConfig, topK: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Minimum Similarity</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={ragConfig.minSimilarity || 0.7}
                                        onChange={(e) => setRagConfig({ ...ragConfig, minSimilarity: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Vector Weight</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={ragConfig.weights?.vector || 0.7}
                                        onChange={(e) => setRagConfig({
                                            ...ragConfig,
                                            weights: { ...ragConfig.weights, vector: parseFloat(e.target.value) }
                                        })}
                                        className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">FTS Weight</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={ragConfig.weights?.fts || 0.3}
                                        onChange={(e) => setRagConfig({
                                            ...ragConfig,
                                            weights: { ...ragConfig.weights, fts: parseFloat(e.target.value) }
                                        })}
                                        className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="reranking"
                                            checked={ragConfig.rerankingEnabled || false}
                                            onChange={(e) => setRagConfig({ ...ragConfig, rerankingEnabled: e.target.checked })}
                                            className="rounded"
                                        />
                                        <label htmlFor="reranking" className="text-sm font-medium">
                                            Enable Reranking
                                        </label>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="hybridSearch"
                                            checked={ragConfig.hybridSearch || false}
                                            onChange={(e) => setRagConfig({ ...ragConfig, hybridSearch: e.target.checked })}
                                            className="rounded"
                                        />
                                        <label htmlFor="hybridSearch" className="text-sm font-medium">
                                            Enable Hybrid Search
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={updateRAGConfig}
                                    disabled={isSaving}
                                    className="px-6 py-2 rounded-lg bg-accent text-onAccent hover:scale-105 transition-all shadow-lg disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save RAG Configuration'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* AI Providers */}
                    <div className="p-6 rounded-xl border border-border/40 bg-background">
                        <h3 className="text-lg font-semibold mb-4">AI Providers</h3>
                        <div className="space-y-3">
                            {providers.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No providers configured. Configure providers in Superadmin.
                                </p>
                            ) : (
                                providers.map((provider) => (
                                    <div
                                        key={provider.id}
                                        className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:border-accent/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${provider.is_active ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
                                            <div>
                                                <p className="font-medium">{provider.name}</p>
                                                <p className="text-xs text-muted-foreground">{provider.provider_type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-muted-foreground">
                                                {provider.capabilities?.join(', ')}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${provider.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                                                }`}>
                                                {provider.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* System Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-info/5 to-info/10">
                            <div className="text-sm text-muted-foreground mb-1">Active Template</div>
                            <div className="text-lg font-bold">{activeBrain?.name || 'None'}</div>
                        </div>
                        <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-accent/5 to-accent/10">
                            <div className="text-sm text-muted-foreground mb-1">Total Providers</div>
                            <div className="text-lg font-bold">{providers.length}</div>
                        </div>
                        <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-success/5 to-success/10">
                            <div className="text-sm text-muted-foreground mb-1">RAG Status</div>
                            <div className="text-lg font-bold text-success">
                                {ragConfig?.enabled ? 'Enabled' : 'Disabled'}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
