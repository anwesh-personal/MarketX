'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatInterfaceProps {
    brainId: string;
    organizationId: string;
    userId?: string;
    brainName?: string;
    systemPrompt?: string;
}

export function ChatInterface({
    brainId,
    organizationId,
    userId,
    brainName = 'AI Assistant',
    systemPrompt,
}: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brain_id: brainId,
                    organization_id: organizationId,
                    user_id: userId,
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                    stream: false,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to get response');
            }

            const data = await response.json();

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.message,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);

        } catch (err: any) {
            console.error('Chat error:', err);
            setError(err.message || 'Failed to send message');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="
                flex items-center gap-md p-lg
                bg-surface border-b border-border
                shadow-sm
            ">
                <div className="
                    w-10 h-10 rounded-full
                    bg-gradient-to-br from-primary to-accent
                    flex items-center justify-center
                    shadow-md
                ">
                    <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-textPrimary">{brainName}</h2>
                    {systemPrompt && (
                        <p className="text-xs text-textTertiary line-clamp-1">{systemPrompt}</p>
                    )}
                </div>
                <Sparkles className="w-5 h-5 text-accent" />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-lg space-y-lg">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Bot className="w-16 h-16 text-textTertiary mb-md opacity-50" />
                        <h3 className="text-xl font-bold text-textPrimary mb-sm">Start a Conversation</h3>
                        <p className="text-textSecondary max-w-md">
                            Ask me anything! I'm here to help you with your questions and tasks.
                        </p>
                    </div>
                )}

                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex gap-md ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {message.role === 'assistant' && (
                            <div className="
                                w-8 h-8 rounded-full shrink-0
                                bg-surfaceElevated flex items-center justify-center
                            ">
                                <Bot className="w-4 h-4 text-primary" />
                            </div>
                        )}

                        <div className={`
                            max-w-[70%] rounded-[var(--radius-lg)] px-lg py-md
                            ${message.role === 'user'
                                ? 'bg-primary text-white'
                                : 'bg-surface text-textPrimary border border-border'
                            }
                        `}>
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            <p className={`
                                text-xs mt-xs
                                ${message.role === 'user' ? 'text-white/70' : 'text-textTertiary'}
                            `}>
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>

                        {message.role === 'user' && (
                            <div className="
                                w-8 h-8 rounded-full shrink-0
                                bg-accent/10 flex items-center justify-center
                            ">
                                <User className="w-4 h-4 text-accent" />
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-md justify-start">
                        <div className="
                            w-8 h-8 rounded-full shrink-0
                            bg-surfaceElevated flex items-center justify-center
                        ">
                            <Bot className="w-4 h-4 text-primary" />
                        </div>
                        <div className="
                            bg-surface border border-border rounded-[var(--radius-lg)]
                            px-lg py-md flex items-center gap-sm
                        ">
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            <span className="text-textSecondary">Thinking...</span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="
                        bg-surfaceElevated border border-border rounded-[var(--radius-lg)]
                        px-lg py-md text-error text-sm
                    ">
                        {error}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border bg-surface p-lg">
                <div className="flex gap-md items-end">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        disabled={isLoading}
                        rows={1}
                        className="
                            flex-1 resize-none
                            bg-background border border-border
                            rounded-[var(--radius-lg)] px-lg py-md
                            text-textPrimary placeholder:text-textTertiary
                            focus:outline-none focus:ring-2 focus:ring-primary/50
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all
                        "
                        style={{ minHeight: '44px', maxHeight: '120px' }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="
                            shrink-0 w-11 h-11
                            bg-primary hover:bg-primary/90
                            text-white rounded-[var(--radius-lg)]
                            flex items-center justify-center
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200
                            active:scale-95
                            shadow-md hover:shadow-lg
                        "
                        title="Send message"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
