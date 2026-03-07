'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wrench, AlertCircle, ToggleLeft, ToggleRight, Loader2, ChevronDown, Code2, Tag } from 'lucide-react'

interface BrainTool {
    name: string
    category: 'generation' | 'retrieval' | 'analysis' | 'action'
    description: string
    parameters: Record<string, unknown>
    handler_function: string
    min_tier: 'basic' | 'medium' | 'enterprise'
    requires_confirm: boolean
    is_enabled: boolean
    created_at: string
}

const CAT_COLORS: Record<string, string> = {
    generation: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    retrieval:  'bg-blue-500/10 text-blue-600 border-blue-500/20',
    analysis:   'bg-purple-500/10 text-purple-600 border-purple-500/20',
    action:     'bg-green-500/10 text-green-600 border-green-500/20',
}

const TIER_COLORS: Record<string, string> = {
    basic:      'bg-slate-500/10 text-slate-600',
    medium:     'bg-indigo-500/10 text-indigo-600',
    enterprise: 'bg-orange-500/10 text-orange-600',
}

export default function ToolRegistryPage() {
    const [tools, setTools]         = useState<BrainTool[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError]         = useState<string | null>(null)
    const [expanded, setExpanded]   = useState<string | null>(null)
    const [toggling, setToggling]   = useState<string | null>(null)

    const load = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/superadmin/brain-tools')
            if (!res.ok) throw new Error('Failed to load tools')
            const data = await res.json()
            setTools(data.tools ?? [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const toggleEnabled = async (tool: BrainTool) => {
        setToggling(tool.name)
        try {
            const res = await fetch(`/api/superadmin/brain-tools/${tool.name}`, {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ is_enabled: !tool.is_enabled }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error)
            }
            setTools(prev => prev.map(t => t.name === tool.name ? { ...t, is_enabled: !t.is_enabled } : t))
        } catch (err: any) {
            setError(err.message)
        } finally {
            setToggling(null)
        }
    }

    const byCategory: Record<string, BrainTool[]> = {}
    for (const t of tools) {
        if (!byCategory[t.category]) byCategory[t.category] = []
        byCategory[t.category].push(t)
    }

    const stats = {
        total:    tools.length,
        enabled:  tools.filter(t => t.is_enabled).length,
        basic:    tools.filter(t => t.min_tier === 'basic').length,
        medium:   tools.filter(t => t.min_tier === 'medium').length,
        enterprise: tools.filter(t => t.min_tier === 'enterprise').length,
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Wrench className="w-8 h-8 text-primary" />
                    Tool Registry
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    All Brain tools. Definitions come from <code className="text-xs bg-muted px-1 py-0.5 rounded">brain_tools</code> table.
                    Disable a tool here to remove it from all future agentic calls.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Tools',  value: stats.total,      color: 'text-foreground' },
                    { label: 'Enabled',      value: stats.enabled,    color: 'text-green-600' },
                    { label: 'Basic+',       value: stats.basic,      color: 'text-slate-600' },
                    { label: 'Medium+',      value: stats.medium,     color: 'text-indigo-600' },
                ].map(s => (
                    <div key={s.label} className="rounded-xl border border-border/40 bg-background p-4 text-center">
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-6">
                    {(['retrieval', 'generation', 'analysis', 'action'] as const).map(cat => {
                        const catTools = byCategory[cat]
                        if (!catTools?.length) return null
                        return (
                            <div key={cat}>
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                    <Tag className="w-3 h-3" />
                                    {cat}
                                </p>
                                <div className="space-y-2">
                                    {catTools.map(tool => (
                                        <div key={tool.name} className={`rounded-2xl border overflow-hidden transition-all ${tool.is_enabled ? 'border-border/40 bg-background' : 'border-border/20 bg-muted/20 opacity-60'}`}>
                                            <div className="flex items-center gap-4 p-4">
                                                <button
                                                    onClick={() => setExpanded(expanded === tool.name ? null : tool.name)}
                                                    className="flex-1 flex items-center gap-4 text-left"
                                                >
                                                    <code className="text-sm font-mono font-semibold">{tool.name}</code>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_COLORS[tool.category] ?? ''}`}>
                                                        {tool.category}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_COLORS[tool.min_tier] ?? ''}`}>
                                                        {tool.min_tier}+
                                                    </span>
                                                    {tool.requires_confirm && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                                                            requires confirm
                                                        </span>
                                                    )}
                                                    <ChevronDown className={`w-4 h-4 text-muted-foreground ml-auto transition-transform ${expanded === tool.name ? 'rotate-180' : ''}`} />
                                                </button>
                                                <button
                                                    onClick={() => toggleEnabled(tool)}
                                                    disabled={toggling === tool.name}
                                                    className="flex-shrink-0 p-1"
                                                    title={tool.is_enabled ? 'Disable tool' : 'Enable tool'}
                                                >
                                                    {toggling === tool.name ? (
                                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                                    ) : tool.is_enabled ? (
                                                        <ToggleRight className="w-6 h-6 text-primary" />
                                                    ) : (
                                                        <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                                                    )}
                                                </button>
                                            </div>

                                            {expanded === tool.name && (
                                                <div className="border-t border-border/40 p-4 space-y-4">
                                                    <div>
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description (shown to LLM)</p>
                                                        <p className="text-sm">{tool.description}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                                            <Code2 className="w-3 h-3" /> Handler Function
                                                        </p>
                                                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{tool.handler_function}()</code>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Parameters (JSON Schema)</p>
                                                        <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-auto max-h-48 font-mono text-muted-foreground">
                                                            {JSON.stringify(tool.parameters, null, 2)}
                                                        </pre>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
