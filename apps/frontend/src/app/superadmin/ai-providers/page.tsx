'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Bot, Plus, Key, Trash2, ToggleLeft, ToggleRight,
    Save, X, AlertTriangle, CheckCircle, Loader2,
    Eye, EyeOff, RefreshCw, Sparkles, Zap, ChevronDown, ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'

interface AIProvider {
    id: string
    provider: string
    name: string
    api_key: string
    description?: string
    is_active: boolean
    failures: number
    usage_count: number
    created_at: string
}

interface ValidationResult {
    valid: boolean
    models?: Array<{ id: string; name: string }>
    error?: string
    message?: string
}

const PROVIDERS = [
    {
        id: 'openai',
        name: 'OpenAI',
        gradient: 'from-emerald-500 via-green-500 to-teal-500',
        bgGradient: 'from-emerald-500/10 to-green-500/5',
        icon: '🤖'
    },
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        gradient: 'from-orange-500 via-red-500 to-pink-500',
        bgGradient: 'from-orange-500/10 to-red-500/5',
        icon: '🧠'
    },
    {
        id: 'google',
        name: 'Google Gemini',
        gradient: 'from-blue-500 via-cyan-500 to-sky-500',
        bgGradient: 'from-blue-500/10 to-cyan-500/5',
        icon: '✨'
    },
    {
        id: 'mistral',
        name: 'Mistral AI',
        gradient: 'from-purple-500 via-violet-500 to-indigo-500',
        bgGradient: 'from-purple-500/10 to-violet-500/5',
        icon: '⚡'
    },
    {
        id: 'perplexity',
        name: 'Perplexity',
        gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
        bgGradient: 'from-cyan-500/10 to-blue-500/5',
        icon: '🔍'
    },
    {
        id: 'xai',
        name: 'X.AI Grok',
        gradient: 'from-gray-700 via-gray-600 to-slate-500',
        bgGradient: 'from-gray-500/10 to-slate-500/5',
        icon: '🚀'
    },
]

export default function AIProvidersPage() {
    const [providers, setProviders] = useState<AIProvider[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [addingTo, setAddingTo] = useState<string | null>(null)
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
    const [isValidating, setIsValidating] = useState(false)
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
    const [showModels, setShowModels] = useState(false)

    const [newKey, setNewKey] = useState({
        name: '',
        api_key: '',
        description: '',
    })

    useEffect(() => {
        loadProviders()
    }, [])

    const loadProviders = async () => {
        try {
            const res = await fetch('/api/superadmin/ai-providers')
            const data = await res.json()
            setProviders(data.providers || [])
        } catch (error) {
            toast.error('Failed to load providers')
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddKey = async (providerType: string) => {
        if (!newKey.name || !newKey.api_key) {
            toast.error('Name and API key are required')
            return
        }

        setIsValidating(true)
        setValidationResult(null)

        try {
            // Step 1: Test the API key
            const testRes = await fetch(`/api/superadmin/ai-providers/test/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: providerType,
                    api_key: newKey.api_key,
                }),
            })

            const testResult = await testRes.json()
            setValidationResult(testResult)

            if (!testResult.valid) {
                toast.error(`Invalid API key: ${testResult.error}`)
                setIsValidating(false)
                return
            }

            // Step 2: Save the key
            const res = await fetch('/api/superadmin/ai-providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: providerType,
                    ...newKey,
                }),
            })

            if (!res.ok) throw new Error('Failed to save key')

            // Step 3: Show success with discovered models
            if (testResult.models && testResult.models.length > 0) {
                toast.success(`✅ Validated! Discovered ${testResult.models.length} models`)
                setShowModels(true)
            } else {
                toast.success('✅ API key validated and saved')
            }

            // Auto-close after showing models
            setTimeout(() => {
                setNewKey({ name: '', api_key: '', description: '' })
                setAddingTo(null)
                setValidationResult(null)
                setShowModels(false)
            }, 5000)

            loadProviders()
        } catch (error: any) {
            toast.error(`Failed: ${error.message}`)
        } finally {
            setIsValidating(false)
        }
    }

    const handleToggleActive = async (providerId: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/superadmin/ai-providers/${providerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus }),
            })

            if (!res.ok) throw new Error('Failed to update')

            toast.success(currentStatus ? 'Key deactivated' : 'Key activated')
            loadProviders()
        } catch (error) {
            toast.error('Failed to update key status')
        }
    }

    const handleDelete = async (providerId: string) => {
        if (!confirm('Are you sure you want to delete this API key?')) return

        try {
            const res = await fetch(`/api/superadmin/ai-providers/${providerId}`, {
                method: 'DELETE',
            })

            if (!res.ok) throw new Error('Failed to delete')

            toast.success('API key deleted')
            loadProviders()
        } catch (error) {
            toast.error('Failed to delete key')
        }
    }

    const toggleKeyVisibility = (keyId: string) => {
        const newSet = new Set(revealedKeys)
        if (newSet.has(keyId)) {
            newSet.delete(keyId)
        } else {
            newSet.add(keyId)
        }
        setRevealedKeys(newSet)
    }

    const maskKey = (key: string) => {
        if (key.length <= 8) return '••••••••'
        return `${key.substring(0, 4)}${'•'.repeat(20)}${key.substring(key.length - 4)}`
    }

    const groupedProviders = PROVIDERS.map(provider => ({
        ...provider,
        keys: providers.filter(p => p.provider === provider.id),
    }))

    return (
        <div className="space-y-8">
            {/* Animated Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        >
                            <Sparkles className="w-8 h-8 text-primary" />
                        </motion.div>
                        AI Provider Management
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manage multiple API keys per provider • Auto-validation • Model discovery
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={loadProviders}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted transition-all shadow-sm"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </motion.button>
            </motion.div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                        <Loader2 className="w-8 h-8 text-primary" />
                    </motion.div>
                </div>
            ) : (
                <motion.div
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ staggerChildren: 0.1 }}
                >
                    {groupedProviders.map((provider, index) => (
                        <motion.div
                            key={provider.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <ProviderCard
                                provider={provider}
                                addingTo={addingTo}
                                setAddingTo={setAddingTo}
                                newKey={newKey}
                                setNewKey={setNewKey}
                                isValidating={isValidating}
                                validationResult={validationResult}
                                showModels={showModels}
                                setShowModels={setShowModels}
                                onAddKey={handleAddKey}
                                onToggleActive={handleToggleActive}
                                onDelete={handleDelete}
                                revealedKeys={revealedKeys}
                                toggleKeyVisibility={toggleKeyVisibility}
                                maskKey={maskKey}
                            />
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    )
}

function ProviderCard({
    provider,
    addingTo,
    setAddingTo,
    newKey,
    setNewKey,
    isValidating,
    validationResult,
    showModels,
    setShowModels,
    onAddKey,
    onToggleActive,
    onDelete,
    revealedKeys,
    toggleKeyVisibility,
    maskKey,
}: any) {
    const activeKeys = provider.keys.filter((k: AIProvider) => k.is_active).length
    const totalKeys = provider.keys.length
    const isAdding = addingTo === provider.id

    return (
        <motion.div
            className="rounded-2xl border border-border/40 bg-background overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
            whileHover={{ y: -2 }}
            layout
        >
            {/* Gradient Header */}
            <div className={`relative p-6 bg-gradient-to-br ${provider.bgGradient} border-b border-border/40 overflow-hidden`}>
                <div className="absolute inset-0 opacity-10">
                    <div className={`absolute inset-0 bg-gradient-to-br ${provider.gradient}`} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <motion.div
                                className="text-3xl"
                                whileHover={{ scale: 1.2, rotate: 10 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                {provider.icon}
                            </motion.div>
                            <div>
                                <h3 className="text-xl font-bold">{provider.name}</h3>
                                <div className="flex items-center gap-3 text-sm mt-1">
                                    <span className="flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        <strong>{activeKeys}</strong> active
                                    </span>
                                    <span className="text-muted-foreground">•</span>
                                    <span><strong>{totalKeys}</strong> total</span>
                                </div>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setAddingTo(isAdding ? null : provider.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm ${isAdding
                                    ? 'bg-destructive/10 text-destructive border border-destructive/40'
                                    : 'bg-background/90 hover:bg-background border border-border/60'
                                }`}
                        >
                            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {isAdding ? 'Cancel' : 'Add Key'}
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Add Key Form with Animation */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden border-b border-border/40"
                    >
                        <div className="p-6 bg-muted/20 space-y-4">
                            <motion.input
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                type="text"
                                placeholder="Key name (e.g., 'Production Key 1')"
                                value={newKey.name}
                                onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 transition-all"
                            />

                            <motion.input
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                type="password"
                                placeholder="API Key"
                                value={newKey.api_key}
                                onChange={(e) => setNewKey({ ...newKey, api_key: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-background font-mono text-sm focus:ring-2 focus:ring-primary/50 transition-all"
                            />

                            <motion.input
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                type="text"
                                placeholder="Description (optional)"
                                value={newKey.description}
                                onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 transition-all"
                            />

                            {/* Validation Result */}
                            <AnimatePresence>
                                {validationResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className={`p-4 rounded-xl border ${validationResult.valid
                                                ? 'bg-green-500/10 border-green-500/40 text-green-600'
                                                : 'bg-destructive/10 border-destructive/40 text-destructive'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            {validationResult.valid ? (
                                                <CheckCircle className="w-5 h-5" />
                                            ) : (
                                                <AlertTriangle className="w-5 h-5" />
                                            )}
                                            <span className="font-semibold">
                                                {validationResult.valid ? 'Success!' : 'Validation Failed'}
                                            </span>
                                        </div>
                                        <p className="text-sm">{validationResult.message || validationResult.error}</p>

                                        {/* Discovered Models */}
                                        {validationResult.valid && validationResult.models && showModels && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="mt-3 pt-3 border-t border-green-500/20"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-semibold flex items-center gap-2">
                                                        <Zap className="w-4 h-4" />
                                                        Discovered Models ({validationResult.models.length})
                                                    </span>
                                                    <button
                                                        onClick={() => setShowModels(!showModels)}
                                                        className="text-xs hover:underline"
                                                    >
                                                        {showModels ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                                                    {validationResult.models.slice(0, 5).map((model: any, i: number) => (
                                                        <motion.div
                                                            key={model.id}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.05 }}
                                                            className="text-xs font-mono px-2 py-1 rounded bg-green-500/5"
                                                        >
                                                            {model.id}
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onAddKey(provider.id)}
                                    disabled={isValidating}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-md disabled:opacity-50"
                                >
                                    {isValidating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Validating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Validate & Save
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Keys List */}
            <div className="p-6">
                {provider.keys.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 text-muted-foreground"
                    >
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Key className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        </motion.div>
                        <p className="font-medium">No API keys configured</p>
                        <p className="text-sm mt-1">Click "Add Key" to get started</p>
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {provider.keys.map((key: AIProvider, index: number) => (
                                <motion.div
                                    key={key.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ scale: 1.01 }}
                                    className={`p-4 rounded-xl border transition-all ${key.is_active
                                            ? 'border-green-500/40 bg-green-500/5 shadow-sm'
                                            : 'border-border/40 bg-muted/10'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold">{key.name}</h4>
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: "spring", stiffness: 500 }}
                                                >
                                                    {key.is_active ? (
                                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                                                    )}
                                                </motion.div>
                                            </div>
                                            {key.description && (
                                                <p className="text-sm text-muted-foreground">{key.description}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => onToggleActive(key.id, key.is_active)}
                                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                                            >
                                                {key.is_active ? (
                                                    <ToggleRight className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                                                )}
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.1, rotate: 5 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => onDelete(key.id)}
                                                className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </motion.button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 rounded-lg bg-background border border-border font-mono text-xs">
                                            {revealedKeys.has(key.id) ? key.api_key : maskKey(key.api_key)}
                                        </code>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => toggleKeyVisibility(key.id)}
                                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                                        >
                                            {revealedKeys.has(key.id) ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </motion.button>
                                    </div>

                                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Zap className="w-3 h-3" />
                                            {key.usage_count} uses
                                        </span>
                                        {key.failures > 0 && (
                                            <motion.span
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="flex items-center gap-1 text-destructive"
                                            >
                                                <AlertTriangle className="w-3 h-3" />
                                                {key.failures} failures
                                            </motion.span>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
