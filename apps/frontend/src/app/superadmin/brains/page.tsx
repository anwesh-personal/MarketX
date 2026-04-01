'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Plus, Edit2, Trash2, Users, Zap, TrendingUp, Activity, Check, X, Sparkles, Wrench } from 'lucide-react'
import { BrainBackground } from '@/components/BrainBackground'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'

// ============================================================
// TYPES
// ============================================================

interface BrainTemplate {
    id: string
    name: string
    version: string
    pricing_tier: 'echii' | 'pulz' | 'quanta'
    is_active: boolean
    is_default: boolean
    created_at: string
    _count?: {
        org_assignments: number
    }
}

// ============================================================
// BRAIN MANAGEMENT PAGE
// ============================================================

export default function BrainManagementPage() {
    const router = useRouter()
    const { fetchWithAuth } = useSuperadminAuth()
    const [brains, setBrains] = useState<BrainTemplate[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedBrain, setSelectedBrain] = useState<BrainTemplate | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [stats, setStats] = useState({
        totalOrgs: 0,
        requestsToday: 0
    })

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        version: '1.0.0',
        description: '',
        pricing_tier: 'echii' as 'echii' | 'pulz' | 'quanta',
        is_default: false
    })

    // Load brain templates
    useEffect(() => {
        loadBrains()
        loadStats()
    }, [])

    const loadBrains = async () => {
        try {
            const response = await fetchWithAuth('/api/superadmin/brains')
            if (response.ok) {
                const data = await response.json()
                setBrains(data.brains || [])
            }
        } catch (error) {
            console.error('Failed to load brains:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const loadStats = async () => {
        try {
            const response = await fetchWithAuth('/api/superadmin/stats')
            if (response.ok) {
                const data = await response.json()
                setStats({
                    totalOrgs: data.stats?.active_orgs || 0,
                    requestsToday: data.stats?.total_runs || 0
                })
            }
        } catch (error) {
            console.error('Failed to load stats:', error)
            // Set to 0 if API fails
            setStats({ totalOrgs: 0, requestsToday: 0 })
        }
    }

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'echii': return 'from-blue-500 to-cyan-500'
            case 'pulz': return 'from-purple-500 to-pink-500'
            case 'quanta': return 'from-orange-500 to-red-500'
            default: return 'from-gray-500 to-slate-500'
        }
    }

    const getTierLabel = (tier: string) => {
        switch (tier) {
            case 'echii': return 'Echii (Free)'
            case 'pulz': return 'Pulz (Pro)'
            case 'quanta': return 'Quanta (Enterprise)'
            default: return tier
        }
    }

    const createBrain = async () => {
        if (!formData.name.trim() || !formData.version.trim()) {
            alert('Please fill in all required fields')
            return
        }

        setIsCreating(true)

        try {
            const config = {
                providers: { chat: null, embeddings: null },
                agents: {
                    chat: {
                        systemPrompt: "You are a helpful AI assistant.",
                        temperature: 0.7,
                        maxTokens: 2000,
                        tools: ["kb_search", "memory_recall"],
                        providerId: null
                    }
                },
                rag: {
                    enabled: true,
                    topK: formData.pricing_tier === 'echii' ? 3 : formData.pricing_tier === 'pulz' ? 8 : 15,
                    minSimilarity: 0.7,
                    rerankingEnabled: formData.pricing_tier !== 'echii',
                    hybridSearch: true,
                    weights: { vector: 0.7, fts: 0.3 }
                },
                memory: {
                    maxContextTokens: formData.pricing_tier === 'echii' ? 4000 : formData.pricing_tier === 'pulz' ? 16000 : 32000,
                    maxMemoryTokens: formData.pricing_tier === 'echii' ? 1000 : formData.pricing_tier === 'pulz' ? 3000 : 8000,
                    conversationWindowSize: formData.pricing_tier === 'echii' ? 5 : formData.pricing_tier === 'pulz' ? 20 : 50,
                    enableSummarization: formData.pricing_tier !== 'echii'
                },
                limits: {
                    maxRequestsPerMinute: formData.pricing_tier === 'echii' ? 10 : formData.pricing_tier === 'pulz' ? 60 : 200,
                    maxTokensPerDay: formData.pricing_tier === 'echii' ? 50000 : formData.pricing_tier === 'pulz' ? 500000 : 10000000
                },
                features: {
                    multiAgent: formData.pricing_tier !== 'echii',
                    streamingEnabled: true
                }
            }

            const response = await fetchWithAuth('/api/superadmin/brains', {
                method: 'POST',
                body: JSON.stringify({
                    name: formData.name,
                    version: formData.version,
                    description: formData.description,
                    config: config,
                    pricingTier: formData.pricing_tier,
                    isDefault: formData.is_default
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create brain template')
            }

            // Success - reload brains and close modal
            await loadBrains()
            setShowCreateModal(false)
            setFormData({
                name: '',
                version: '1.0.0',
                description: '',
                pricing_tier: 'echii',
                is_default: false
            })
        } catch (error: any) {
            alert(error.message || 'Failed to create brain template')
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="relative space-y-8 min-h-[60vh]">
            <BrainBackground opacity={0.2} animation="float" mixBlendMode="soft-light" />
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Brain className="w-8 h-8 text-primary" />
                        Brain Management
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manage AI brain templates and configurations
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/superadmin/prompt-library')}
                        className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl hover:bg-muted transition-all text-sm font-medium"
                    >
                        <Sparkles className="w-4 h-4" />
                        Prompt Library
                    </button>
                    <button
                        onClick={() => router.push('/superadmin/tool-registry')}
                        className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl hover:bg-muted transition-all text-sm font-medium"
                    >
                        <Wrench className="w-4 h-4" />
                        Tool Registry
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-primary/20"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">Create Brain Template</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    label="Total Brains"
                    value={brains.length.toString()}
                    icon={Brain}
                    color="from-blue-500 to-cyan-500"
                />
                <StatCard
                    label="Active Brains"
                    value={brains.filter(b => b.is_active).length.toString()}
                    icon={Activity}
                    color="from-green-500 to-emerald-500"
                />
                <StatCard
                    label="Organizations"
                    value={stats.totalOrgs.toString()}
                    icon={Users}
                    color="from-purple-500 to-pink-500"
                />
                <StatCard
                    label="Requests Today"
                    value={stats.requestsToday.toLocaleString()}
                    icon={Zap}
                    color="from-orange-500 to-red-500"
                />
            </div>

            {/* Brain Templates Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {brains.map((brain) => (
                        <BrainCard
                            key={brain.id}
                            brain={brain}
                            getTierColor={getTierColor}
                            getTierLabel={getTierLabel}
                            onSelect={() => router.push(`/superadmin/brains/${brain.id}`)}
                            onDelete={async () => {
                                if (!confirm(`Kya aap "${brain.name}" brain template delete karna chahte hain?`)) return
                                try {
                                    const res = await fetchWithAuth(`/api/superadmin/brains/${brain.id}`, { method: 'DELETE' })
                                    if (!res.ok) {
                                        const err = await res.json()
                                        throw new Error(err.error || 'Delete failed')
                                    }
                                    await loadBrains()
                                } catch (error: any) {
                                    alert(error.message || 'Failed to delete brain template')
                                }
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && brains.length === 0 && (
                <div className="rounded-[var(--radius-lg)] border-2 border-dashed border-border/60 bg-muted/20 p-16 text-center">
                    <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Brain Templates</h3>
                    <p className="text-muted-foreground mb-6">
                        Get started by creating your first brain template
                    </p>
                    <button onClick={() => setShowCreateModal(true)} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:scale-105 transition-all">
                        Create Brain Template
                    </button>
                </div>
            )}

            {/* Create Brain Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-background rounded-[var(--radius-lg)] border border-border/40 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-border/40">
                            <h2 className="text-2xl font-bold">Create Brain Template</h2>
                            <p className="text-muted-foreground mt-1">
                                Configure a new AI brain template
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Template Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Custom Enterprise Brain"
                                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Version *</label>
                                <input
                                    type="text"
                                    value={formData.version}
                                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                    placeholder="1.0.0"
                                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Pricing Tier</label>
                                <select
                                    value={formData.pricing_tier}
                                    onChange={(e) => setFormData({ ...formData, pricing_tier: e.target.value as any })}
                                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="echii">Echii (Free)</option>
                                    <option value="pulz">Pulz (Professional)</option>
                                    <option value="quanta">Quanta (Enterprise)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe this brain template..."
                                    rows={3}
                                    className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_default"
                                    checked={formData.is_default}
                                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                    className="rounded"
                                />
                                <label htmlFor="is_default" className="text-sm">Set as default template</label>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border/40 flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                disabled={isCreating}
                                className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createBrain}
                                disabled={isCreating}
                                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {isCreating ? 'Creating...' : 'Create Brain'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({ label, value, icon: Icon, color }: any) {
    return (
        <div className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-border/40 bg-gradient-to-br from-background to-muted/20 p-6 hover:shadow-xl transition-all duration-300">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-10 blur-3xl`} />
            <div className="relative">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-10 mb-4`}>
                    <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-3xl font-bold">{value}</p>
                </div>
            </div>
        </div>
    )
}

// ============================================================
// BRAIN CARD
// ============================================================

function BrainCard({ brain, getTierColor, getTierLabel, onSelect, onDelete }: any) {
    return (
        <div className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-border/40 bg-background hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            {/* Gradient Background */}
            <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-br ${getTierColor(brain.pricing_tier)} opacity-20`} />

            {/* Content */}
            <div className="relative p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold">{brain.name}</h3>
                            {brain.is_default && (
                                <span className="px-2 py-0.5 rounded-full bg-surfaceElevated text-primary text-xs font-medium">
                                    Default
                                </span>
                            )}
                        </div>
                        <p className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${getTierColor(brain.pricing_tier)} bg-opacity-10 text-sm font-medium`}>
                            {getTierLabel(brain.pricing_tier)}
                        </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTierColor(brain.pricing_tier)} bg-opacity-10 flex items-center justify-center`}>
                        <Brain className="w-6 h-6 text-primary" />
                    </div>
                </div>

                {/* Meta Info */}
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Version</span>
                        <span className="font-medium">{brain.version}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className={`flex items-center gap-1.5 font-medium ${brain.is_active ? 'text-green-500' : 'text-red-500'}`}>
                            {brain.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            {brain.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Organizations</span>
                        <span className="font-medium">{brain._count?.org_assignments || 0}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-border/40">
                    <button
                        onClick={onSelect}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-surfaceElevated text-primary rounded-xl hover:bg-surfaceElevated transition-all font-medium"
                    >
                        <Edit2 className="w-4 h-4" />
                        Configure
                    </button>
                    <button onClick={onDelete} className="p-2.5 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
