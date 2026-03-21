'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Sparkles, Brain, Loader2, Copy, Check, RotateCcw, Download, Settings, Upload, Save } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from '@/contexts/ThemeContext'
import { BrainBackground } from '@/components/BrainBackground'
import { useFeatureGate } from '@/lib/useFeatureGate'
import { UpgradeWall } from '@/components/UpgradeWall'

// ============================================================
// TYPES
// ============================================================

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    metadata?: {
        agentType?: string
        tokensUsed?: number
        responseTime?: number
        toolsUsed?: string[]
    }
    isStreaming?: boolean
}

interface ActiveRuntime {
    name: string
    templateVersion?: string
    toolsGranted?: string[]
}

// ============================================================
// BRAIN CHAT PAGE
// ============================================================

export default function BrainChatPage() {
    const router = useRouter()
    const { mode } = useTheme()
    const { allowed: canChatBrain, loading: gateLoading, tier } = useFeatureGate('can_chat_brain')
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [conversationId, setConversationId] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Active brain runtime (single source of truth — no selector)
    const [activeRuntime, setActiveRuntime] = useState<ActiveRuntime | null>(null)
    const [runtimeError, setRuntimeError] = useState<string | null>(null)

    // Push to brain
    const [showPushModal, setShowPushModal] = useState(false)
    const [pushing, setPushing] = useState(false)
    const [pushSuccess, setPushSuccess] = useState(false)
    const [brainsForPush, setBrainsForPush] = useState<Array<{ id: string; name: string; pricing_tier?: string }>>([])

    // Load active brain runtime for this org (governs entire account)
    useEffect(() => {
        const fetchRuntime = async () => {
            try {
                const res = await fetch('/api/brain/runtime')
                if (res.status === 404) {
                    setRuntimeError('No brain deployed for your organization. Ask your admin to deploy one.')
                    setActiveRuntime(null)
                    return
                }
                if (!res.ok) throw new Error('Failed to load brain')
                const data = await res.json()
                setActiveRuntime(data.runtime ? { name: data.runtime.name, templateVersion: data.runtime.templateVersion, toolsGranted: data.runtime.toolsGranted } : null)
                setRuntimeError(null)
            } catch (err) {
                console.error('Failed to fetch brain runtime:', err)
                setRuntimeError('Could not load brain. Sign in and try again.')
                setActiveRuntime(null)
            }
        }
        fetchRuntime()
    }, [])

    // Load templates only when opening Push-to-Brain modal
    useEffect(() => {
        if (!showPushModal) return
        fetch('/api/brain/templates')
            .then(r => r.json())
            .then(data => setBrainsForPush(data.templates || []))
            .catch(() => setBrainsForPush([]))
    }, [showPushModal])

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'
            inputRef.current.style.height = inputRef.current.scrollHeight + 'px'
        }
    }, [input])

    const sendMessageWithContent = async (content: string) => {
        if (!content.trim() || isLoading) return

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        try {
            const response = await fetch('/api/brain/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: content,
                    conversationId: conversationId || undefined,
                    stream: true
                })
            })

            if (!response.ok) throw new Error('Failed to get response')

            // Get conversation ID from response headers or first chunk
            const newConvId = response.headers.get('X-Conversation-Id')
            if (newConvId && !conversationId) {
                setConversationId(newConvId)
            }

            // Handle streaming
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            let assistantMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                isStreaming: true
            }

            setMessages(prev => [...prev, assistantMessage])

            while (reader) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))

                            // Save conversation ID from stream
                            if (data.conversationId && !conversationId) {
                                setConversationId(data.conversationId)
                            }

                            if (data.chunk) {
                                assistantMessage.content += data.chunk
                                setMessages(prev =>
                                    prev.map(msg =>
                                        msg.id === assistantMessage.id
                                            ? { ...msg, content: assistantMessage.content }
                                            : msg
                                    )
                                )
                            }

                            if (data.done) {
                                setMessages(prev =>
                                    prev.map(msg =>
                                        msg.id === assistantMessage.id
                                            ? { ...msg, isStreaming: false, metadata: data.metadata }
                                            : msg
                                    )
                                )
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '❌ Sorry, something went wrong. Please try again.',
                timestamp: new Date()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const sendMessage = () => sendMessageWithContent(input)

    const handleRegenerate = () => {
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
        if (!lastUserMsg || isLoading) return
        setMessages(prev => {
            const lastAssistantIdx = prev.map(m => m.role).lastIndexOf('assistant')
            if (lastAssistantIdx >= 0) return prev.filter((_, i) => i !== lastAssistantIdx)
            return prev
        })
        sendMessageWithContent(lastUserMsg.content)
    }

    // Push conversation to selected brain
    const pushToBrain = async (targetBrainId: string) => {
        if (!conversationId) return

        setPushing(true)
        try {
            const res = await fetch(`/api/conversations/${conversationId}/push-to-brain`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brainTemplateId: targetBrainId })
            })

            if (res.ok) {
                setPushSuccess(true)
                setTimeout(() => {
                    setShowPushModal(false)
                    setPushSuccess(false)
                }, 2000)
            }
        } catch (err) {
            console.error('Push failed:', err)
        } finally {
            setPushing(false)
        }
    }

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    // ── Feature gate ──
    if (gateLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }
    if (!canChatBrain) {
        return <UpgradeWall feature="Brain Chat" tier={tier} />
    }

    return (
        <div className="relative flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
            <BrainBackground opacity={0.22} animation="float" className="z-0" />
            {/* Header */}
            <header className="relative z-10 border-b border-border/40 backdrop-blur-xl bg-background/80 sticky top-0">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Brain className="w-8 h-8 text-primary" />
                            <Sparkles className="w-4 h-4 text-primary absolute -top-1 -right-1 animate-pulse" />
                        </div>

                        {/* Active brain (read-only — governed by org deployment) */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
                            <div>
                                <h1 className="text-lg font-bold text-foreground">
                                    {activeRuntime?.name ?? (runtimeError ? 'No brain deployed' : 'Loading...')}
                                </h1>
                                <p className="text-xs text-muted-foreground text-left">
                                    {activeRuntime?.templateVersion ? `v${activeRuntime.templateVersion}` : runtimeError ?? 'Your organization’s active brain'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Push to Brain Button */}
                        {conversationId && messages.length > 0 && (
                            <button
                                onClick={() => setShowPushModal(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(var(--color-accent-rgb),0.1)] hover:bg-[rgba(var(--color-accent-rgb),0.2)] text-accent transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                                <Upload className="w-4 h-4" />
                                <span className="text-sm font-medium">Push to Brain</span>
                            </button>
                        )}

                        <button
                            onClick={() => router.push('/brain-control')}
                            className="p-2 rounded-lg hover:bg-muted/50 transition-all duration-200 hover:scale-105 active:scale-95"
                            title="Brain Settings"
                        >
                            <Settings className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Push to Brain Modal */}
            {showPushModal && (
                <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
                    <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Push Conversation to Brain</h2>

                        {pushSuccess ? (
                            <div className="text-center py-8">
                                <Check className="w-16 h-16 text-success mx-auto mb-4" />
                                <p className="text-lg font-medium">Successfully Pushed!</p>
                                <p className="text-sm text-muted-foreground">The brain will learn from this conversation.</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Select which brain should learn from this conversation ({messages.length} messages).
                                </p>

                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {brainsForPush.map((brain) => (
                                        <button
                                            key={brain.id}
                                            onClick={() => pushToBrain(brain.id)}
                                            disabled={pushing}
                                            className="w-full p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="font-medium">{brain.name}</p>
                                                <p className="text-xs text-muted-foreground">{brain.pricing_tier ?? ''}</p>
                                            </div>
                                            {pushing ? (
                                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                            ) : (
                                                <Upload className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setShowPushModal(false)}
                                    className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {messages.length === 0 ? (
                        <EmptyState onSuggestionClick={(text) => setInput(text)} />
                    ) : (
                        messages.map((message, idx) => (
                            <MessageBubble key={message.id} message={message} onRegenerate={
                                message.role === 'assistant' && idx === messages.length - 1 && !isLoading
                                    ? handleRegenerate
                                    : undefined
                            } />
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="border-t border-border/40 backdrop-blur-xl bg-background/80 sticky bottom-0">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="relative group">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={`Ask ${activeRuntime?.name ?? 'the brain'}... (Shift + Enter for new line)`}
                            rows={1}
                            className="w-full resize-none rounded-2xl border border-border/60 bg-background/50 px-6 py-4 pr-14 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200 max-h-32 overflow-y-auto hover:bg-background/80"
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            className="absolute right-3 bottom-3 p-2.5 rounded-xl bg-accent text-onAccent disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-3">
                        {activeRuntime?.name ?? 'Brain'} • {conversationId ? 'Conversation saved' : 'New conversation'}
                    </p>
                </div>
            </div>
        </div>
    )
}

// ============================================================
// MESSAGE BUBBLE COMPONENT
// ============================================================

function MessageBubble({ message, onRegenerate }: { message: Message; onRegenerate?: () => void }) {
    const [copied, setCopied] = useState(false)
    const { mode } = useTheme()
    const isUser = message.role === 'user'

    const copyToClipboard = () => {
        navigator.clipboard.writeText(message.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="flex gap-4 group">
            {/* Avatar */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center ${isUser
                ? 'bg-accent/10 border border-accent/20'
                : 'bg-surface border border-border shadow-sm'
                }`}>
                {isUser ? (
                    <span className="text-sm font-semibold text-accent">You</span>
                ) : (
                    <Brain className="w-5 h-5 text-textSecondary" />
                )}
            </div>

            {/* Content */}
            <div className={`flex-1 max-w-3xl space-y-2 flex flex-col`}>
                {/* Message */}
                <div className={`rounded-[var(--radius-lg)] px-5 py-4 ${isUser
                    ? 'bg-gradient-to-br from-accent to-accent-secondary text-onAccent shadow-md'
                    : 'bg-surface border border-border shadow-sm'
                    } transition-all duration-200`}>
                    {message.isStreaming && !message.content.trim() ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className={`w-4 h-4 animate-spin ${isUser ? 'text-onAccent' : 'text-accent'}`} />
                            <span className="text-sm opacity-80">Thinking...</span>
                        </div>
                    ) : isUser ? (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    ) : (
                        <div className={`prose prose-sm max-w-none ${mode === 'night' ? 'prose-invert' : ''}`}>
                            <ReactMarkdown
                                components={{
                                    code(props) {
                                        const { className, children, ...rest } = props
                                        const match = /language-(\w+)/.exec(className || '')
                                        return match ? (
                                            <SyntaxHighlighter
                                                style={oneDark}
                                                language={match[1]}
                                                PreTag="div"
                                                className="rounded-[var(--radius-md)] !bg-background/50 !mt-2 !mb-2 border border-border"
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <code className="bg-surfaceHover px-1.5 py-0.5 rounded-[var(--radius-sm)] text-xs border border-border" {...rest}>
                                                {children}
                                            </code>
                                        )
                                    }
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                            {message.isStreaming && (
                                <span className="inline-block w-2 h-4 ml-1 align-middle bg-accent animate-pulse rounded-sm" />
                            )}
                        </div>
                    )}
                </div>

                {/* Actions & Metadata */}
                <div className="flex items-center gap-3 text-xs text-textTertiary pl-1">
                    <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                    {message.metadata?.agentType && (
                        <span className="badge badge-accent">
                            {message.metadata.agentType}
                        </span>
                    )}

                    {!isUser && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={copyToClipboard}
                                className="p-1 hover:text-textPrimary transition-colors"
                                title="Copy"
                            >
                                {copied ? (
                                    <Check className="w-3.5 h-3.5 text-success" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                            </button>
                            {onRegenerate && (
                                <button
                                    onClick={onRegenerate}
                                    className="p-1 hover:text-textPrimary transition-colors"
                                    title="Regenerate"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}

                    {message.metadata?.responseTime && (
                        <span className="text-xs opacity-70 ml-auto">
                            {message.metadata.responseTime}ms
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({ onSuggestionClick }: { onSuggestionClick?: (text: string) => void }) {
    const suggestions = [
        { icon: '✍️', text: 'Write a blog post about AI trends', color: 'from-[rgba(var(--color-accent-rgb),0.1)] to-[rgba(var(--color-accent-secondary-rgb),0.1)]' },
        { icon: '📊', text: 'Analyze my recent data', color: 'from-[rgba(var(--color-success-rgb),0.1)] to-[rgba(var(--color-success-rgb),0.05)]' },
        { icon: '🎯', text: 'Help me set productivity goals', color: 'from-[rgba(var(--color-warning-rgb),0.1)] to-[rgba(var(--color-error-rgb),0.1)]' },
        { icon: '💡', text: 'Explain quantum computing', color: 'from-[rgba(var(--color-accent-rgb),0.05)] to-[rgba(var(--color-accent-secondary-rgb),0.1)]' }
    ]

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent blur-3xl" />
                <Brain className="w-20 h-20 text-primary relative" />
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold font-display text-textPrimary">
                    Hello! I'm your Market Writer Brain
                </h2>
                <p className="text-muted-foreground max-w-md">
                    I can write content, analyze data, set goals, and answer questions using your knowledge base.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestions.map((suggestion, i) => (
                    <button
                        key={i}
                        onClick={() => onSuggestionClick?.(suggestion.text)}
                        className={`group p-4 rounded-xl border border-border/40 bg-gradient-to-br ${suggestion.color} hover:border-accent/40 transition-all duration-300 hover:scale-105 hover:shadow-lg text-left`}
                    >
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">{suggestion.icon}</span>
                            <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                                {suggestion.text}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}
