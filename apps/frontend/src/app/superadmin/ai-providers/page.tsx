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

// Provider Logo Components - Theme Aware
const OpenAILogo = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.6 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.1408 1.6407 4.4708 4.4708 0 0 1 .5765 3.0089zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.5056-2.6067-1.4998z" />
    </svg>
)

const AnthropicLogo = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M17.304 3.541h-3.672l6.696 16.918h3.672zM6.696 3.541L0 20.459h3.744l1.308-3.432h6.624l1.296 3.432h3.744L9.996 3.541zm.768 10.614l2.04-5.352 2.04 5.352z" />
    </svg>
)

const GoogleLogo = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
)

const MistralLogo = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <rect x="0" y="0" width="4.5" height="4.5" />
        <rect x="9.75" y="0" width="4.5" height="4.5" />
        <rect x="19.5" y="0" width="4.5" height="4.5" />
        <rect x="0" y="4.875" width="4.5" height="4.5" />
        <rect x="4.875" y="4.875" width="4.5" height="4.5" fill="#F7D046" />
        <rect x="9.75" y="4.875" width="4.5" height="4.5" />
        <rect x="19.5" y="4.875" width="4.5" height="4.5" />
        <rect x="0" y="9.75" width="4.5" height="4.5" />
        <rect x="9.75" y="9.75" width="4.5" height="4.5" />
        <rect x="14.625" y="9.75" width="4.5" height="4.5" fill="#F7D046" />
        <rect x="9.75" y="14.625" width="4.5" height="4.5" />
        <rect x="0" y="14.625" width="4.5" height="4.5" />
        <rect x="4.875" y="14.625" width="4.5" height="4.5" fill="#F2A73B" />
        <rect x="0" y="19.5" width="4.5" height="4.5" />
        <rect x="9.75" y="19.5" width="4.5" height="4.5" />
        <rect x="19.5" y="19.5" width="4.5" height="4.5" />
    </svg>
)

const PerplexityLogo = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 0L2 6v12l10 6 10-6V6L12 0zm0 2.31l7.36 4.42L12 11.15 4.64 6.73 12 2.31zM3.5 7.96l7.5 4.5v8.58l-7.5-4.5V7.96zm8.5 13.08v-8.58l7.5-4.5v8.58l-7.5 4.5z" />
    </svg>
)

const XAILogo = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
)

const PROVIDERS = [
    {
        id: 'openai',
        name: 'OpenAI',
        Logo: OpenAILogo,
        borderColor: 'border-emerald-500/40',
        textColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
    },
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        Logo: AnthropicLogo,
        borderColor: 'border-orange-500/40',
        textColor: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
    },
    {
        id: 'google',
        name: 'Google Gemini',
        Logo: GoogleLogo,
        borderColor: 'border-blue-500/40',
        textColor: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
    },
    {
        id: 'mistral',
        name: 'Mistral AI',
        Logo: MistralLogo,
        borderColor: 'border-purple-500/40',
        textColor: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
    },
    {
        id: 'perplexity',
        name: 'Perplexity',
        Logo: PerplexityLogo,
        borderColor: 'border-cyan-500/40',
        textColor: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10',
    },
    {
        id: 'xai',
        name: 'X.AI Grok',
        Logo: XAILogo,
        borderColor: 'border-gray-400/40',
        textColor: 'text-gray-300',
        bgColor: 'bg-gray-500/10',
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

            const savedProvider = await res.json()
            toast.success('✅ API key validated and saved')

            // Step 3: AUTO-DISCOVER MODELS
            // This is the critical step - discover whitelist models, test each, upsert to DB
            toast.loading('Discovering and testing models...', { id: 'discover' })

            try {
                const discoverRes = await fetch('/api/superadmin/ai-models/discover', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        provider_id: savedProvider.provider?.id || savedProvider.id,
                    }),
                })

                const discoverResult = await discoverRes.json()

                if (discoverResult.success) {
                    toast.success(
                        `✅ Discovered ${discoverResult.models_discovered} models (${discoverResult.models_active} active)`,
                        { id: 'discover' }
                    )
                } else {
                    toast.error(`Discovery failed: ${discoverResult.error}`, { id: 'discover' })
                }
            } catch (discoverError: any) {
                toast.error(`Discovery error: ${discoverError.message}`, { id: 'discover' })
            }

            // Clean up form
            setNewKey({ name: '', api_key: '', description: '' })
            setAddingTo(null)
            setValidationResult(null)
            setShowModels(false)

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
    const Logo = provider.Logo

    return (
        <div className={`rounded-xl border ${provider.borderColor} bg-surface/50 backdrop-blur-sm overflow-hidden shadow-lg transition-all hover:shadow-xl`}>
            {/* Header with Logo */}
            <div className={`px-4 py-3 ${provider.bgColor} border-b ${provider.borderColor}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${provider.bgColor} ${provider.textColor}`}>
                            <Logo />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-textPrimary">{provider.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-textSecondary mt-0.5">
                                {activeKeys > 0 ? (
                                    <span className={`flex items-center gap-1 ${provider.textColor}`}>
                                        <CheckCircle className="w-3 h-3" />
                                        {activeKeys} active
                                    </span>
                                ) : (
                                    <span className="text-textTertiary">No keys configured</span>
                                )}
                                {totalKeys > 0 && <span className="text-textTertiary">• {totalKeys} total</span>}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setAddingTo(isAdding ? null : provider.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isAdding
                            ? 'bg-error/10 text-error border border-error/40 hover:bg-error/20'
                            : `${provider.bgColor} ${provider.textColor} border ${provider.borderColor} hover:opacity-80`
                            }`}
                    >
                        {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {isAdding ? 'Cancel' : 'Add Key'}
                    </button>
                </div>
            </div>

            {/* Add Key Form */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-b border-border/40"
                    >
                        <div className="p-4 bg-muted/20 space-y-3">
                            <input
                                type="text"
                                placeholder="Key name (e.g., 'Production')"
                                value={newKey.name}
                                onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/50"
                            />
                            <input
                                type="password"
                                placeholder="API Key"
                                value={newKey.api_key}
                                onChange={(e) => setNewKey({ ...newKey, api_key: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background font-mono text-xs focus:ring-2 focus:ring-primary/50"
                            />
                            <button
                                onClick={() => onAddKey(provider.id)}
                                disabled={isValidating}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm disabled:opacity-50"
                            >
                                {isValidating ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Validating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-3 h-3" />
                                        Save Key
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Keys List - Compact */}
            <div className="p-3">
                {provider.keys.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <Key className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No API keys configured</p>
                        <p className="text-xs mt-0.5">Click "Add Key" to get started</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {provider.keys.map((key: AIProvider) => (
                            <div
                                key={key.id}
                                className={`p-3 rounded-lg border transition-all ${key.is_active
                                    ? 'border-success/40 bg-success/5'
                                    : 'border-border/40 bg-muted/10'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <h4 className="text-sm font-medium truncate">{key.name}</h4>
                                        {key.is_active ? (
                                            <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                                        ) : (
                                            <AlertTriangle className="w-3 h-3 text-warning flex-shrink-0" />
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => onToggleActive(key.id, key.is_active)}
                                            className="p-1.5 rounded hover:bg-muted transition-colors"
                                        >
                                            {key.is_active ? (
                                                <ToggleRight className="w-4 h-4 text-success" />
                                            ) : (
                                                <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => onDelete(key.id)}
                                            className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-2">
                                    <code className="flex-1 px-2 py-1 rounded bg-background border border-border font-mono text-xs truncate">
                                        {revealedKeys.has(key.id) ? key.api_key : maskKey(key.api_key)}
                                    </code>
                                    <button
                                        onClick={() => toggleKeyVisibility(key.id)}
                                        className="p-1.5 rounded hover:bg-muted transition-colors"
                                    >
                                        {revealedKeys.has(key.id) ? (
                                            <EyeOff className="w-3 h-3" />
                                        ) : (
                                            <Eye className="w-3 h-3" />
                                        )}
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Zap className="w-3 h-3" />
                                        {key.usage_count} uses
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

