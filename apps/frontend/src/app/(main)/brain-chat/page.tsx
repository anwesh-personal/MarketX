'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Brain, Loader2, Copy, Check, RotateCcw, Download, Settings } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

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

// ============================================================
// BRAIN CHAT PAGE
// ============================================================

export default function BrainChatPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [conversationId, setConversationId] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

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

    // Send message
    const sendMessage = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: input,
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
                    message: input,
                    conversationId: conversationId || undefined,
                    stream: true
                })
            })

            if (!response.ok) throw new Error('Failed to get response')

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
                                            ? { ...msg, isStreaming: false }
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

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <header className="border-b border-border/40 backdrop-blur-xl bg-background/80 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Brain className="w-8 h-8 text-primary" />
                            <Sparkles className="w-4 h-4 text-primary absolute -top-1 -right-1 animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                                Axiom Brain
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                Powered by intelligent multi-agent AI
                            </p>
                        </div>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-muted/50 transition-all duration-200 hover:scale-105 active:scale-95">
                        <Settings className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {messages.length === 0 ? (
                        <EmptyState />
                    ) : (
                        messages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
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
                            placeholder="Ask anything... (Shift + Enter for new line)"
                            rows={1}
                            className="w-full resize-none rounded-2xl border border-border/60 bg-background/50 px-6 py-4 pr-14 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200 max-h-32 overflow-y-auto hover:bg-background/80"
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            className="absolute right-3 bottom-3 p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-3">
                        Axiom Brain can make mistakes. Verify important information.
                    </p>
                </div>
            </div>
        </div>
    )
}

// ============================================================
// MESSAGE BUBBLE COMPONENT
// ============================================================

function MessageBubble({ message }: { message: Message }) {
    const [copied, setCopied] = useState(false)
    const isUser = message.role === 'user'

    const copyToClipboard = () => {
        navigator.clipboard.writeText(message.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className={`flex gap-4 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isUser
                    ? 'bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20'
                    : 'bg-gradient-to-br from-muted to-muted/50 border border-border/40'
                }`}>
                {isUser ? (
                    <span className="text-sm font-semibold text-primary">You</span>
                ) : (
                    <Brain className="w-5 h-5 text-primary" />
                )}
            </div>

            {/* Content */}
            <div className={`flex-1 max-w-3xl space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                {/* Message */}
                <div className={`rounded-2xl px-5 py-3.5 ${isUser
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted/50 border border-border/40 backdrop-blur-sm'
                    } transition-all duration-200 hover:shadow-md`}>
                    {message.isStreaming ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                    ) : isUser ? (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                                components={{
                                    code({ node, inline, className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || '')
                                        return !inline && match ? (
                                            <SyntaxHighlighter
                                                style={oneDark}
                                                language={match[1]}
                                                PreTag="div"
                                                className="rounded-lg !bg-background/50 !mt-2 !mb-2"
                                                {...props}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <code className="bg-muted px-1.5 py-0.5 rounded text-xs" {...props}>
                                                {children}
                                            </code>
                                        )
                                    }
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Actions & Metadata */}
                <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span>{new Date(message.timestamp).toLocaleTimeString()}</span>

                    {message.metadata?.agentType && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {message.metadata.agentType}
                        </span>
                    )}

                    {!isUser && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={copyToClipboard}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                title="Copy"
                            >
                                {copied ? (
                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                            </button>
                            <button
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                title="Regenerate"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {message.metadata?.responseTime && (
                        <span className="text-xs opacity-70">
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

function EmptyState() {
    const suggestions = [
        { icon: '✍️', text: 'Write a blog post about AI trends', color: 'from-blue-500/20 to-purple-500/20' },
        { icon: '📊', text: 'Analyze my recent data', color: 'from-green-500/20 to-emerald-500/20' },
        { icon: '🎯', text: 'Help me set productivity goals', color: 'from-orange-500/20 to-red-500/20' },
        { icon: '💡', text: 'Explain quantum computing', color: 'from-pink-500/20 to-purple-500/20' }
    ]

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent blur-3xl" />
                <Brain className="w-20 h-20 text-primary relative" />
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
                    Hello! I'm your Axiom Brain
                </h2>
                <p className="text-muted-foreground max-w-md">
                    I can write content, analyze data, set goals, and answer questions using your knowledge base.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestions.map((suggestion, i) => (
                    <button
                        key={i}
                        className={`group p-4 rounded-xl border border-border/40 bg-gradient-to-br ${suggestion.color} hover:border-primary/40 transition-all duration-300 hover:scale-105 hover:shadow-lg text-left`}
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
