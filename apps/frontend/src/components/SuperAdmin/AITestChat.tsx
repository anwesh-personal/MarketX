'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Send, Loader2, CheckCircle, XCircle, Zap, Brain, Sparkles,
    MessageSquare, Settings, RotateCcw, Copy, Check, Bot,
    ChevronDown, Activity, DollarSign, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    provider?: string
    model?: string
    tokens?: { input: number; output: number }
    cost?: number
    latency?: number
    timestamp: Date
}

interface ProviderStatus {
    provider: string
    name: string
    success: boolean
    error?: string
    latency?: number
    models?: string[]
}

const PROVIDER_CONFIG = {
    openai: { name: 'OpenAI', icon: '🤖', color: 'emerald' },
    anthropic: { name: 'Claude', icon: '🧠', color: 'orange' },
    google: { name: 'Gemini', icon: '✨', color: 'blue' },
    mistral: { name: 'Mistral', icon: '⚡', color: 'purple' },
    perplexity: { name: 'Perplexity', icon: '🔍', color: 'cyan' },
    xai: { name: 'Grok', icon: '🚀', color: 'slate' },
}

export default function AITestChat() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([])
    const [selectedProvider, setSelectedProvider] = useState('openai')
    const [selectedModel, setSelectedModel] = useState('')
    const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({})
    const [showSettings, setShowSettings] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        loadAvailableModels()
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const loadAvailableModels = async () => {
        try {
            const res = await fetch('/api/superadmin/ai-models')
            if (res.ok) {
                const data = await res.json()
                // Group by provider
                const grouped: Record<string, string[]> = {}
                for (const model of data.models || []) {
                    if (!grouped[model.provider]) {
                        grouped[model.provider] = []
                    }
                    grouped[model.provider].push(model.model_id)
                }
                setAvailableModels(grouped)

                // Set default model
                if (grouped.openai?.length > 0) {
                    setSelectedModel(grouped.openai[0])
                }
            }
        } catch (error) {
            console.error('Failed to load models:', error)
        }
    }

    const testAllProviders = async () => {
        setIsTesting(true)
        setProviderStatuses([])
        toast.loading('Testing AI providers...', { id: 'provider-test' })

        try {
            const results: ProviderStatus[] = []

            for (const [providerId, config] of Object.entries(PROVIDER_CONFIG)) {
                try {
                    const start = Date.now()
                    const res = await fetch('/api/superadmin/ai-providers/test/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ provider: providerId, test_only: true })
                    })

                    const data = await res.json()
                    const latency = Date.now() - start

                    results.push({
                        provider: providerId,
                        name: config.name,
                        success: data.valid || false,
                        error: data.error,
                        latency,
                        models: data.models?.map((m: any) => m.id || m.model_id)
                    })
                } catch (error: any) {
                    results.push({
                        provider: providerId,
                        name: config.name,
                        success: false,
                        error: error.message
                    })
                }

                setProviderStatuses([...results])
            }

            const successCount = results.filter(r => r.success).length
            if (successCount === results.length) {
                toast.success(`All ${successCount} providers connected!`, { id: 'provider-test' })
            } else if (successCount > 0) {
                toast.success(`${successCount}/${results.length} providers connected`, { id: 'provider-test' })
            } else {
                toast.error('No providers could connect', { id: 'provider-test' })
            }
        } catch (error) {
            toast.error('Test failed', { id: 'provider-test' })
        } finally {
            setIsTesting(false)
        }
    }

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const start = Date.now()

            const res = await fetch('/api/superadmin/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.content,
                    provider: selectedProvider,
                    model: selectedModel,
                    history: messages.slice(-10)
                })
            })

            const data = await res.json()
            const latency = Date.now() - start

            if (!res.ok) throw new Error(data.error || 'Failed to get response')

            const assistantMessage: Message = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: data.content || data.message,
                provider: selectedProvider,
                model: selectedModel || data.model,
                tokens: data.usage,
                cost: data.cost,
                latency,
                timestamp: new Date()
            }

            setMessages(prev => [...prev, assistantMessage])
        } catch (error: any) {
            toast.error(error.message)
            const errorMessage: Message = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: `Error: ${error.message}`,
                provider: selectedProvider,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
        toast.success('Copied!')
    }

    const clearChat = () => {
        setMessages([])
        toast.success('Chat cleared')
    }

    return (
        <div className="h-full flex flex-col bg-background rounded-[var(--radius-lg)] border border-border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surfaceElevated flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold">AI Test Chat</h3>
                        <p className="text-xs text-muted-foreground">Test AI providers and models</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={testAllProviders}
                        disabled={isTesting}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surfaceElevated hover:bg-surfaceElevated transition-colors text-sm"
                    >
                        {isTesting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Activity className="w-4 h-4" />
                        )}
                        Test All
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                        <Settings className="w-4 h-4" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={clearChat}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>

            {/* Provider Status Panel */}
            <AnimatePresence>
                {providerStatuses.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b border-border overflow-hidden"
                    >
                        <div className="p-4 bg-muted/20">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                {providerStatuses.map((status, i) => (
                                    <motion.div
                                        key={status.provider}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className={`p-3 rounded-xl border ${status.success
                                            ? 'bg-surfaceElevated border-border'
                                            : 'bg-destructive/10 border-destructive/30'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">
                                                {PROVIDER_CONFIG[status.provider as keyof typeof PROVIDER_CONFIG]?.icon}
                                            </span>
                                            {status.success ? (
                                                <CheckCircle className="w-4 h-4 text-success" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-destructive" />
                                            )}
                                        </div>
                                        <div className="text-xs font-medium">{status.name}</div>
                                        {status.latency && (
                                            <div className="text-xs text-muted-foreground">{status.latency}ms</div>
                                        )}
                                        {status.error && (
                                            <div className="text-xs text-destructive truncate" title={status.error}>
                                                {status.error.substring(0, 30)}...
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Settings Panel */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b border-border overflow-hidden"
                    >
                        <div className="p-4 bg-muted/20 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Provider</label>
                                    <select
                                        value={selectedProvider}
                                        onChange={(e) => {
                                            setSelectedProvider(e.target.value)
                                            const models = availableModels[e.target.value]
                                            setSelectedModel(models?.[0] || '')
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                                    >
                                        {Object.entries(PROVIDER_CONFIG).map(([id, config]) => (
                                            <option key={id} value={id}>
                                                {config.icon} {config.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">Model</label>
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                                    >
                                        {(availableModels[selectedProvider] || []).map(model => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                        {(!availableModels[selectedProvider] || availableModels[selectedProvider].length === 0) && (
                                            <option value="">No models available</option>
                                        )}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">No messages yet</p>
                            <p className="text-sm">Start a conversation to test AI providers</p>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[80%] ${message.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                    } rounded-[var(--radius-lg)] px-4 py-3`}
                                >
                                    <div className="whitespace-pre-wrap">{message.content}</div>

                                    {message.role === 'assistant' && (message.provider || message.tokens) && (
                                        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30 text-xs opacity-70">
                                            {message.provider && (
                                                <span className="flex items-center gap-1">
                                                    <span>{PROVIDER_CONFIG[message.provider as keyof typeof PROVIDER_CONFIG]?.icon}</span>
                                                    {message.model}
                                                </span>
                                            )}
                                            {message.latency && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {message.latency}ms
                                                </span>
                                            )}
                                            {message.tokens && (
                                                <span className="flex items-center gap-1">
                                                    <Zap className="w-3 h-3" />
                                                    {message.tokens.input + message.tokens.output} tokens
                                                </span>
                                            )}
                                            {message.cost && (
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" />
                                                    ${message.cost.toFixed(4)}
                                                </span>
                                            )}
                                            <button
                                                onClick={() => copyToClipboard(message.content, message.id)}
                                                className="hover:opacity-100 opacity-50 transition-opacity"
                                            >
                                                {copiedId === message.id ? (
                                                    <Check className="w-3 h-3" />
                                                ) : (
                                                    <Copy className="w-3 h-3" />
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-muted/30">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-xs">
                        <span>{PROVIDER_CONFIG[selectedProvider as keyof typeof PROVIDER_CONFIG]?.icon}</span>
                        <span className="font-medium">{selectedModel || 'No model'}</span>
                        <ChevronDown className="w-3 h-3" />
                    </div>

                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder="Type a message to test AI..."
                            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/50 pr-12"
                            disabled={isLoading}
                        />
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </motion.button>
                    </div>
                </div>
            </div>
        </div>
    )
}
