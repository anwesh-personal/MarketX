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

    // Load stats
    useEffect(() => {
        // TODO: Fetch from API
        setTimeout(() => {
            setStats({
                totalRequests: 1247,
                avgResponseTime: 342,
                successRate: 0.968,
                tokensUsed: 487234,
                cacheHitRate: 0.73,
                activeAgents: 2
            })
            setIsLoading(false)
        }, 500)
    }, [])

    const sections = [
        { id: 'overview', label: 'Overview', icon: Activity, color: 'from-blue-500 to-cyan-500' },
        { id: 'memory', label: 'Memory Palace', icon: Database, color: 'from-purple-500 to-pink-500' },
        { id: 'agents', label: 'Agent Control', icon: Users, color: 'from-green-500 to-emerald-500' },
        { id: 'training', label: 'Training Center', icon: Target, color: 'from-orange-500 to-red-500' },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'from-indigo-500 to-purple-500' },
        { id: 'config', label: 'Configuration', icon: Settings, color: 'from-gray-500 to-slate-500' }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
            {/* Header */}
            <header className="border-b border-border/40 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
                <div className="px-8 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 blur-xl" />
                                <div className="relative p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                                    <Brain className="w-8 h-8 text-primary" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                                    Brain Command Center
                                </h1>
                                <p className="text-sm text-muted-foreground">
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
                                trend="+12%"
                                color="text-blue-500"
                            />
                            <QuickStat
                                label="Success Rate"
                                value={stats ? `${(stats.successRate * 100).toFixed(1)}%` : '---'}
                                icon={TrendingUp}
                                trend="+2.3%"
                                color="text-green-500"
                            />
                            <QuickStat
                                label="Avg Response"
                                value={stats ? `${stats.avgResponseTime}ms` : '---'}
                                icon={Activity}
                                trend="-18ms"
                                color="text-purple-500"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-88px)]">
                {/* Sidebar Navigation */}
                <aside className="w-72 border-r border-border/40 bg-background/50 backdrop-blur-sm p-6">
                    <div className="space-y-2">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full group relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${activeSection === section.id
                                    ? 'bg-primary/10 border-2 border-primary/40'
                                    : 'hover:bg-muted/50 border-2 border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className={`p-2 rounded-lg bg-gradient-to-br ${section.color} bg-opacity-10`}>
                                        <section.icon className={`w-5 h-5 ${activeSection === section.id ? 'text-primary' : 'text-muted-foreground'
                                            }`} />
                                    </div>
                                    <span className={`font-medium ${activeSection === section.id ? 'text-foreground' : 'text-muted-foreground'
                                        }`}>
                                        {section.label}
                                    </span>
                                    <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${activeSection === section.id ? 'translate-x-1' : ''
                                        }`} />
                                </div>
                                {activeSection === section.id && (
                                    <div className={`absolute inset-0 bg-gradient-to-r ${section.color} opacity-5`} />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Brain Status */}
                    <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/40">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <span className="text-xs font-medium text-muted-foreground">System Status</span>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Brain Template</span>
                                <span className="font-medium text-primary">Pulz</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Active Agents</span>
                                <span className="font-medium">{stats?.activeAgents || 0}/4</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Cache Hit Rate</span>
                                <span className="font-medium text-success">
                                    {stats ? `${(stats.cacheHitRate * 100).toFixed(0)}%` : '---'}
                                </span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-8">
                    {activeSection === 'overview' && <OverviewSection stats={stats} />}
                    {activeSection === 'memory' && <MemoryPalaceSection />}
                    {activeSection === 'agents' && <AgentControlSection />}
                    {activeSection === 'training' && <TrainingCenterSection />}
                    {activeSection === 'analytics' && <AnalyticsSection />}
                    {activeSection === 'config' && <ConfigurationSection />}
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
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold">{value}</span>
                <span className={`text-xs font-medium ${trend.startsWith('+') || trend.startsWith('-') ?
                    trend.startsWith('+') ? 'text-success' : 'text-error'
                    : 'text-muted-foreground'
                    }`}>
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
            color: 'from-blue-500 to-cyan-500'
        },
        {
            label: 'Avg Response Time',
            value: stats ? `${stats.avgResponseTime}ms` : '---',
            change: '-18ms',
            icon: Activity,
            color: 'from-purple-500 to-pink-500'
        },
        {
            label: 'Success Rate',
            value: stats ? `${(stats.successRate * 100).toFixed(1)}%` : '---',
            change: '+2.1%',
            icon: TrendingUp,
            color: 'from-green-500 to-emerald-500'
        },
        {
            label: 'Tokens Used',
            value: stats ? `${(stats.tokensUsed / 1000).toFixed(1)}K` : '---',
            change: '+5.4%',
            icon: Cpu,
            color: 'from-orange-500 to-red-500'
        }
    ]

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold mb-2">System Overview</h2>
                <p className="text-muted-foreground">
                    Real-time insights into your AI brain performance
                </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric, i) => (
                    <MetricCard key={i} {...metric} />
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

function MetricCard({ label, value, change, icon: Icon, color }: any) {
    return (
        <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/20 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-10 blur-3xl`} />
            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-10`}>
                        <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className={`text-sm font-medium ${change.startsWith('+') ? 'text-success' : 'text-error'
                        }`}>
                        {change}
                    </span>
                </div>
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-3xl font-bold">{value}</p>
                </div>
            </div>
        </div>
    )
}

function ActivityFeed() {
    const activities = [
        { type: 'agent', message: 'Writer Agent completed task', time: '2m ago', color: 'text-primary-500' },
        { type: 'rag', message: 'RAG cache hit rate improved', time: '5m ago', color: 'text-success' },
        { type: 'training', message: 'New intent pattern learned', time: '12m ago', color: 'text-secondary-500' },
        { type: 'system', message: 'Embeddings index updated', time: '23m ago', color: 'text-warning' }
    ]

    return (
        <div className="rounded-2xl border border-border/40 bg-background/50 p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3">
                {activities.map((activity, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className={`w-2 h-2 rounded-full mt-2 ${activity.color}`} />
                        <div className="flex-1">
                            <p className="text-sm">{activity.message}</p>
                            <span className="text-xs text-muted-foreground">{activity.time}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function RecentQueries() {
    const queries = [
        { query: 'Write a blog post about AI', agent: 'Writer', time: '342ms' },
        { query: 'Analyze Q4 data', agent: 'Analyst', time: ' 234ms' },
        { query: 'Set productivity goals', agent: 'Coach', time: '198ms' }
    ]

    return (
        <div className="rounded-2xl border border-border/40 bg-background/50 p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Queries</h3>
            <div className="space-y-3">
                {queries.map((q, i) => (
                    <div key={i} className="p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <p className="text-sm font-medium mb-1">{q.query}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{q.agent}</span>
                            <span>{q.time}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function AgentStatusGrid() {
    const agents = [
        { name: 'Writer Agent', status: 'active', sessions: 234, success: 97.2, color: 'from-blue-500 to-cyan-500' },
        { name: 'Generalist Agent', status: 'active', sessions: 156, success: 95.8, color: 'from-green-500 to-emerald-500' },
        { name: 'Analyst Agent', status: 'inactive', sessions: 0, success: 0, color: 'from-purple-500 to-pink-500' },
        { name: 'Coach Agent', status: 'inactive', sessions: 0, success: 0, color: 'from-orange-500 to-red-500' }
    ]

    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Agent Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {agents.map((agent, i) => (
                    <div
                        key={i}
                        className="relative overflow-hidden rounded-xl border border-border/40 bg-background/50 p-4 hover:shadow-lg transition-all duration-300"
                    >
                        <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${agent.color} opacity-10 blur-2xl`} />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-success animate-pulse' : 'bg-neutral-400'
                                        }`} />
                                    <span className="text-xs text-muted-foreground">{agent.status}</span>
                                </div>
                            </div>
                            <h4 className="font-medium mb-2">{agent.name}</h4>
                            <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>Sessions</span>
                                    <span className="font-medium text-foreground">{agent.sessions}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Success</span>
                                    <span className="font-medium text-success">{agent.success}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
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
                <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Database className="w-5 h-5 text-purple-500" />
                        <span className="text-sm text-muted-foreground">Total Embeddings</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
                    <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-muted-foreground">Knowledge Base</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.kb.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-muted-foreground">Conversations</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.conversation.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-orange-500/5 to-red-500/5">
                    <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-5 h-5 text-orange-500" />
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
                            className="p-4 rounded-xl border border-border/40 bg-background hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${embedding.source_type === 'kb' ? 'bg-primary-500/10 text-primary-500' :
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                            <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-br ${agent.agent_type === 'writer' ? 'from-blue-500/20 to-cyan-500/20' :
                                agent.agent_type === 'analyst' ? 'from-purple-500/20 to-pink-500/20' :
                                    agent.agent_type === 'coach' ? 'from-orange-500/20 to-red-500/20' :
                                        'from-green-500/20 to-emerald-500/20'
                                }`} />

                            <div className="relative p-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">{agent.name}</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
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
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${agent.is_active ? 'translate-x-6' : 'translate-x-1'
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
                                        className="flex-1 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                                        <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
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
                                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:scale-105 transition-all shadow-lg"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {selectedAgent && !isEditing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                                <p className={`mt-1 font-medium ${selectedAgent.is_active ? 'text-green-500' : 'text-red-500'}`}>
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
                                        <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
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
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    User Feedback
                </button>
                <button
                    onClick={() => setActiveTab('patterns')}
                    className={`px-6 py-3 font-medium transition-colors ${activeTab === 'patterns'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Intent Patterns
                </button>
                <button
                    onClick={() => setActiveTab('expansions')}
                    className={`px-6 py-3 font-medium transition-colors ${activeTab === 'expansions'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-muted-foreground hover:text-foreground'
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
                                <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                                    <div className="text-sm text-muted-foreground mb-1">Positive Feedback</div>
                                    <div className="text-2xl font-bold text-green-500">
                                        {feedbackData.filter(f => f.rating > 0).length}
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-red-500/5 to-orange-500/5">
                                    <div className="text-sm text-muted-foreground mb-1">Negative Feedback</div>
                                    <div className="text-2xl font-bold text-red-500">
                                        {feedbackData.filter(f => f.rating < 0).length}
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
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
                                                        'bg-neutral-500/10 text-neutral-500'
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
                                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:scale-105 transition-all shadow-lg flex items-center gap-2"
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
                                                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
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
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pattern.is_active ? 'translate-x-6' : 'translate-x-1'
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
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                                                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:scale-105 transition-all"
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
                                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
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
                        <div className="p-6 rounded-xl border border-border/40 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap className="w-5 h-5 text-blue-500" />
                                <span className="text-sm text-muted-foreground">Total Requests</span>
                            </div>
                            <p className="text-3xl font-bold mb-1">{analyticsData?.totalRequests?.toLocaleString() || '0'}</p>
                            <p className="text-xs text-green-500">+12% from previous period</p>
                        </div>

                        <div className="p-6 rounded-xl border border-border/40 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                            <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="w-5 h-5 text-green-500" />
                                <span className="text-sm text-muted-foreground">Success Rate</span>
                            </div>
                            <p className="text-3xl font-bold mb-1">{analyticsData?.successRate ? `${(analyticsData.successRate * 100).toFixed(1)}%` : '0%'}</p>
                            <p className="text-xs text-green-500">+2.3% from previous period</p>
                        </div>

                        <div className="p-6 rounded-xl border border-border/40 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                            <div className="flex items-center gap-2 mb-3">
                                <Activity className="w-5 h-5 text-purple-500" />
                                <span className="text-sm text-muted-foreground">Avg Response</span>
                            </div>
                            <p className="text-3xl font-bold mb-1">{analyticsData?.avgResponseTime || '0'}ms</p>
                            <p className="text-xs text-green-500">-18ms from previous period</p>
                        </div>

                        <div className="p-6 rounded-xl border border-border/40 bg-gradient-to-br from-orange-500/5 to-red-500/5">
                            <div className="flex items-center gap-2 mb-3">
                                <Cpu className="w-5 h-5 text-orange-500" />
                                <span className="text-sm text-muted-foreground">Tokens Used</span>
                            </div>
                            <p className="text-3xl font-bold mb-1">{analyticsData?.tokensUsed ? `${(analyticsData.tokensUsed / 1000).toFixed(1)}K` : '0'}</p>
                            <p className="text-xs text-orange-500">+5.4% from previous period</p>
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
                                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
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
                                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
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
                                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
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
                                            <div className={`w-2 h-2 rounded-full ${agent.type === 'writer' ? 'bg-primary-500' :
                                                agent.type === 'analyst' ? 'bg-secondary-500' :
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
                                            <div className="h-full bg-primary-500" style={{ width: '25%' }} />
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
                                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
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
                fetch('/api/superadmin/ai-providers')
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
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border/40 hover:border-primary/40'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-bold">{template.name}</h4>
                                        {activeBrain?.id === template.id && (
                                            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
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
                                    className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:scale-105 transition-all shadow-lg disabled:opacity-50"
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
                                        className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:border-primary/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${provider.is_active ? 'bg-success animate-pulse' : 'bg-neutral-400'}`} />
                                            <div>
                                                <p className="font-medium">{provider.name}</p>
                                                <p className="text-xs text-muted-foreground">{provider.provider_type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-muted-foreground">
                                                {provider.capabilities?.join(', ')}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${provider.is_active ? 'bg-success/10 text-success' : 'bg-neutral-500/10 text-neutral-500'
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
                        <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
                            <div className="text-sm text-muted-foreground mb-1">Active Template</div>
                            <div className="text-lg font-bold">{activeBrain?.name || 'None'}</div>
                        </div>
                        <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                            <div className="text-sm text-muted-foreground mb-1">Total Providers</div>
                            <div className="text-lg font-bold">{providers.length}</div>
                        </div>
                        <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                            <div className="text-sm text-muted-foreground mb-1">RAG Status</div>
                            <div className="text-lg font-bold text-green-500">
                                {ragConfig?.enabled ? 'Enabled' : 'Disabled'}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
