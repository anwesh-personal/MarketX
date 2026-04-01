'use client'

import { useState, useEffect } from 'react'
import { Brain, Sparkles, Database, Target, Clock, Activity, AlertTriangle, CheckCircle } from 'lucide-react'
import { BrainBackground } from '@/components/BrainBackground'
import { createClient } from '@/lib/supabase/client'

export default function LearningLoopPage() {
    const [activeTab, setActiveTab] = useState('memories')
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<{
        memories: any[]
        gaps: any[]
        reflections: any[]
        dreams: any[]
    }>({
        memories: [],
        gaps: [],
        reflections: [],
        dreams: []
    })

    const supabase = createClient()

    useEffect(() => {
        loadLearningData()
    }, [])

    const loadLearningData = async () => {
        try {
            setLoading(true)
            
            // Get user's org
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            
            const { data: userRecord } = await supabase
                .from('users')
                .select('org_id')
                .eq('id', user.id)
                .single()
                
            if (!userRecord?.org_id) return

            // Fetch all learning data in parallel
            const [memoriesRes, gapsRes, reflectionsRes, dreamsRes] = await Promise.all([
                supabase.from('brain_memories').select('*').eq('org_id', userRecord.org_id).order('importance', { ascending: false }).limit(50),
                supabase.from('knowledge_gaps').select('*').eq('org_id', userRecord.org_id).order('impact_level', { ascending: false }).limit(50),
                supabase.from('brain_reflections').select('*').eq('org_id', userRecord.org_id).order('created_at', { ascending: false }).limit(20),
                supabase.from('brain_dream_logs').select('*').eq('org_id', userRecord.org_id).order('started_at', { ascending: false }).limit(20)
            ])

            setData({
                memories: memoriesRes.data || [],
                gaps: gapsRes.data || [],
                reflections: reflectionsRes.data || [],
                dreams: dreamsRes.data || []
            })
        } catch (error) {
            console.error('Failed to load learning data:', error)
        } finally {
            setLoading(false)
        }
    }

    const tabs = [
        { id: 'memories', label: 'Long-term Memory', icon: Database, count: data.memories.length },
        { id: 'gaps', label: 'Knowledge Gaps', icon: Target, count: data.gaps.length },
        { id: 'reflections', label: 'Reflections', icon: Brain, count: data.reflections.length },
        { id: 'dreams', label: 'Dream Logs', icon: Sparkles, count: data.dreams.length }
    ]

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <header className="border-b border-border/40 backdrop-blur-xl bg-background/80 sticky top-0 z-50 flex-shrink-0">
                <div className="px-8 py-5">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-accent-secondary/10 blur-xl" />
                            <div className="relative p-3 rounded-[var(--radius-lg)] bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20">
                                <Brain className="w-8 h-8 text-accent" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-display text-textPrimary">
                                Learning Loop
                            </h1>
                            <p className="text-sm text-textSecondary">
                                Monitor how your AI brain learns, reflects, and consolidates knowledge.
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Navigation */}
                <aside className="w-72 border-r border-border/40 bg-surface/30 backdrop-blur-md p-6 overflow-y-auto flex-shrink-0">
                    <div className="space-y-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full group relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-[rgba(var(--color-accent-rgb),0.1)] border border-accent/40 shadow-sm'
                                    : 'hover:bg-surfaceHover border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className={`p-2 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 transition-transform group-hover:scale-110`}>
                                        <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-accent' : 'text-textSecondary'}`} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <span className={`block font-medium ${activeTab === tab.id ? 'text-textPrimary' : 'text-textSecondary'}`}>
                                            {tab.label}
                                        </span>
                                    </div>
                                    <span className={`badge ${activeTab === tab.id ? 'badge-accent' : ''}`}>
                                        {tab.count}
                                    </span>
                                </div>
                                {activeTab === tab.id && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent opacity-50" />
                                )}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-8 bg-background relative">
                    <BrainBackground opacity={0.22} animation="pulse" mixBlendMode="soft-light" />
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-surface/30 to-background pointer-events-none" />
                    <div className="relative z-10 max-w-5xl mx-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <Activity className="w-8 h-8 text-accent animate-spin" />
                            </div>
                        ) : (
                            <>
                                {activeTab === 'memories' && <MemoriesView memories={data.memories} />}
                                {activeTab === 'gaps' && <GapsView gaps={data.gaps} />}
                                {activeTab === 'reflections' && <ReflectionsView reflections={data.reflections} />}
                                {activeTab === 'dreams' && <DreamsView dreams={data.dreams} />}
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}

function MemoriesView({ memories }: { memories: any[] }) {
    if (memories.length === 0) return <EmptyState title="No memories yet" desc="The brain hasn't consolidated any long-term memories." />

    return (
        <div className="space-y-4 animate-fade-in-up">
            {memories.map((mem) => (
                <div key={mem.id} className="premium-card !p-5 group">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="badge badge-accent">{mem.memory_type}</span>
                            <span className="badge">{mem.scope}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-textTertiary">
                            <span title="Importance">⭐ {mem.importance.toFixed(2)}</span>
                            <span title="Accessed">👁️ {mem.accessed_count}</span>
                        </div>
                    </div>
                    <p className="text-textPrimary font-medium mb-2">{mem.content}</p>
                    {mem.summary && <p className="text-sm text-textSecondary mb-3">{mem.summary}</p>}
                    
                    {mem.keywords && mem.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/50">
                            {mem.keywords.map((kw: string, i: number) => (
                                <span key={i} className="text-xs text-textSecondary bg-surfaceHover px-2 py-1 rounded-md">#{kw}</span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

function GapsView({ gaps }: { gaps: any[] }) {
    if (gaps.length === 0) return <EmptyState title="No knowledge gaps" desc="The brain hasn't identified any missing information." />

    return (
        <div className="space-y-4 animate-fade-in-up">
            {gaps.map((gap) => (
                <div key={gap.id} className="premium-card !p-5">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className={`badge ${gap.status === 'identified' || gap.status === 'learning' ? 'badge-error' : 'badge-success'}`}>
                                {gap.status.toUpperCase()}
                            </span>
                            <span className="badge badge-warning">Impact: {gap.impact_level}</span>
                        </div>
                        <span className="text-xs text-textTertiary">{new Date(gap.first_identified ?? gap.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-lg font-bold text-textPrimary mb-2">{gap.description}</h3>
                    <p className="text-sm text-textSecondary mb-4">Domain: {gap.domain}</p>
                    
                    {gap.context_snapshot && (
                        <div className="bg-surfaceHover p-3 rounded-lg text-xs text-textSecondary font-mono overflow-x-auto">
                            {JSON.stringify(gap.context_snapshot, null, 2)}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

function ReflectionsView({ reflections }: { reflections: any[] }) {
    if (reflections.length === 0) return <EmptyState title="No reflections" desc="The brain hasn't run any self-reflection cycles yet." />

    return (
        <div className="space-y-4 animate-fade-in-up">
            {reflections.map((ref) => (
                <div key={ref.id} className="premium-card !p-5">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                <Brain className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium text-textPrimary">Reflection Cycle</p>
                                <p className="text-xs text-textSecondary">{new Date(ref.created_at).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-textPrimary">{((ref.quality_score ?? 0) * 10).toFixed(1)}<span className="text-sm text-textTertiary">/10</span></p>
                            <p className="text-xs text-textSecondary">Quality Score</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {ref.what_went_well && (
                            <div>
                                <h4 className="text-sm font-semibold text-success mb-1 flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4" /> What Went Well
                                </h4>
                                <p className="text-sm text-textSecondary">{ref.what_went_well}</p>
                            </div>
                        )}
                        {ref.what_could_improve && (
                            <div>
                                <h4 className="text-sm font-semibold text-textPrimary mb-1">What Could Improve</h4>
                                <p className="text-sm text-textSecondary">{ref.what_could_improve}</p>
                            </div>
                        )}
                        {ref.knowledge_gaps_identified && ref.knowledge_gaps_identified.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-warning mb-2">Knowledge Gaps Identified</h4>
                                <ul className="space-y-1">
                                    {ref.knowledge_gaps_identified.map((gap: string, i: number) => (
                                        <li key={i} className="text-sm text-textSecondary flex items-start gap-2">
                                            <span className="text-warning mt-1">•</span> {gap}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

function DreamsView({ dreams }: { dreams: any[] }) {
    if (dreams.length === 0) return <EmptyState title="No dream logs" desc="The brain hasn't run any nightly consolidation cycles." />

    return (
        <div className="space-y-4 animate-fade-in-up">
            {dreams.map((dream) => (
                <div key={dream.id} className="premium-card !p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-surfaceElevated flex items-center justify-center text-info">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium text-textPrimary">Dream Cycle</p>
                                <p className="text-xs text-textSecondary">
                                    {new Date(dream.started_at).toLocaleString()}
                                    {dream.ended_at && ` • Took ${Math.round((new Date(dream.ended_at).getTime() - new Date(dream.started_at).getTime()) / 1000)}s`}
                                </p>
                            </div>
                        </div>
                        <span className={`badge ${dream.status === 'complete' ? 'badge-success' : dream.status === 'error' ? 'badge-error' : 'badge-warning'}`}>
                            {dream.status}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-surfaceHover p-3 rounded-lg text-center">
                            <p className="text-2xl font-bold text-textPrimary">{dream.memories_created ?? 0}</p>
                            <p className="text-xs text-textSecondary">Memories Created</p>
                        </div>
                        <div className="bg-surfaceHover p-3 rounded-lg text-center">
                            <p className="text-2xl font-bold text-textPrimary">{dream.gaps_identified ?? 0}</p>
                            <p className="text-xs text-textSecondary">Gaps Identified</p>
                        </div>
                        <div className="bg-surfaceHover p-3 rounded-lg text-center">
                            <p className="text-2xl font-bold text-textPrimary">{dream.patterns_discovered ?? 0}</p>
                            <p className="text-xs text-textSecondary">Patterns Discovered</p>
                        </div>
                    </div>

                    {dream.narrative && (
                        <p className="text-sm text-textSecondary border-t border-border/50 pt-4">
                            {dream.narrative}
                        </p>
                    )}
                </div>
            ))}
        </div>
    )
}

function EmptyState({ title, desc }: { title: string, desc: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-surfaceHover flex items-center justify-center mb-4">
                <Database className="w-8 h-8 text-textTertiary" />
            </div>
            <h3 className="text-lg font-bold text-textPrimary mb-1">{title}</h3>
            <p className="text-sm text-textSecondary">{desc}</p>
        </div>
    )
}