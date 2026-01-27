'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    Play,
    Pause,
    MessageSquare,
    Loader2,
    CheckCircle,
    Info,
    DollarSign,
    Sliders,
    Send,
    Copy,
    Download,
    Trash2,
    RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { superadminFetch } from '@/lib/superadmin-auth'

// Types
interface AIProvider {
    id: string
    provider_type: string
    name: string
    is_active: boolean
}

interface AIModel {
    id: string
    provider: string
    model_id: string
    model_name: string
    input_cost_per_million: number
    output_cost_per_million: number
    context_window_tokens: number
    is_active: boolean
}

interface Parameters {
    temperature: number
    maxTokens: number
    topP: number
    frequencyPenalty: number
    presencePenalty: number
}

interface HistoryEntry {
    id: number
    prompt: string
    response: string
    provider: string
    model: string
    parameters: Parameters
    timestamp: string
    duration: number
    tokensUsed: number
    cost: string
}

// Tooltip data
const PARAMETER_TOOLTIPS: Record<string, { title: string; description: string; details: string; economic: string }> = {
    temperature: {
        title: "Temperature",
        description: "Controls creativity vs consistency",
        details: "Lower (0.1-0.3) = More focused, consistent responses. Higher (0.7-1.0) = More creative, varied responses.",
        economic: "Higher temperature may require more tokens for coherent output, increasing costs by 10-20%."
    },
    maxTokens: {
        title: "Max Tokens",
        description: "Maximum length of the response",
        details: "1 token ≈ 4 characters. 2000 tokens ≈ 1500 words. Adjust based on your content needs.",
        economic: "Directly affects cost - each token costs money. Set appropriately to avoid waste."
    },
    topP: {
        title: "Top P (Nucleus Sampling)",
        description: "Controls diversity of word selection",
        details: "Lower values (0.1-0.5) = More focused vocabulary. Higher values (0.8-1.0) = More diverse word choices.",
        economic: "Extreme values may affect generation efficiency and token usage."
    },
    frequencyPenalty: {
        title: "Frequency Penalty",
        description: "Reduces repetition of frequent words",
        details: "0 = No penalty. Positive values reduce repetition. Negative values encourage repetition.",
        economic: "Higher penalties may increase generation time and token usage."
    },
    presencePenalty: {
        title: "Presence Penalty",
        description: "Encourages talking about new topics",
        details: "0 = No penalty. Positive values encourage new topics. Negative values focus on current topics.",
        economic: "Affects content diversity and may impact generation efficiency."
    }
}

// Tooltip Component
function TooltipIcon({ param }: { param: string }) {
    const tooltip = PARAMETER_TOOLTIPS[param]
    if (!tooltip) return null

    return (
        <div className="group relative">
            <Info className="w-4 h-4 text-gray-400 hover:text-blue-400 cursor-help" />
            <div className="absolute left-0 top-6 w-80 bg-gray-900 border border-gray-600 rounded-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        <h4 className="font-semibold text-white">{tooltip.title}</h4>
                    </div>

                    <p className="text-sm text-gray-300">{tooltip.description}</p>
                    <p className="text-xs text-gray-400">{tooltip.details}</p>

                    <div className="flex items-start space-x-2 p-2 bg-yellow-900/20 border border-yellow-700/50 rounded">
                        <DollarSign className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-yellow-300">{tooltip.economic}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function AIPlaygroundPage() {
    // State
    const [providers, setProviders] = useState<AIProvider[]>([])
    const [models, setModels] = useState<AIModel[]>([])
    const [selectedProvider, setSelectedProvider] = useState<string>('')
    const [selectedModel, setSelectedModel] = useState<string>('')
    const [prompt, setPrompt] = useState('')
    const [systemPrompt, setSystemPrompt] = useState('')
    const [response, setResponse] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [history, setHistory] = useState<HistoryEntry[]>([])
    const [loading, setLoading] = useState(true)

    const [parameters, setParameters] = useState<Parameters>({
        temperature: 0.7,
        maxTokens: 2000,
        topP: 1.0,
        frequencyPenalty: 0,
        presencePenalty: 0
    })

    // Load providers and models
    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)

            // Load providers
            const providersRes = await superadminFetch('/api/superadmin/ai-providers')
            if (providersRes.ok) {
                const data = await providersRes.json()
                const activeProviders = (data.providers || []).filter((p: AIProvider) => p.is_active)
                setProviders(activeProviders)

                if (activeProviders.length > 0 && !selectedProvider) {
                    setSelectedProvider(activeProviders[0].provider_type)
                }
            }

            // Load models
            const modelsRes = await superadminFetch('/api/superadmin/ai-models?is_active=true')
            if (modelsRes.ok) {
                const data = await modelsRes.json()
                setModels(data.models || [])
            }
        } catch (error) {
            console.error('Failed to load data:', error)
            toast.error('Failed to load AI providers')
        } finally {
            setLoading(false)
        }
    }

    // Get models for selected provider
    const providerModels = models.filter(m => m.provider === selectedProvider)

    // Auto-select first model when provider changes
    useEffect(() => {
        if (providerModels.length > 0 && !providerModels.find(m => m.model_id === selectedModel)) {
            setSelectedModel(providerModels[0].model_id)
        }
    }, [selectedProvider, providerModels])

    // Get current model info
    const currentModel = models.find(m => m.model_id === selectedModel)

    // Calculate costs
    const getTokenContext = (tokens: number) => {
        const words = Math.round(tokens * 0.75)
        const pages = Math.round(words / 250) || 1
        return { words: words.toLocaleString(), pages }
    }

    const calculateEstimatedCost = () => {
        if (!currentModel) return '0.0000'
        const inputCost = (parameters.maxTokens / 1000000) * (currentModel.input_cost_per_million || 0)
        const outputCost = (parameters.maxTokens / 1000000) * (currentModel.output_cost_per_million || 0)
        return (inputCost + outputCost).toFixed(4)
    }

    // Handle generation
    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error('Please enter a prompt')
            return
        }

        if (!selectedProvider || !selectedModel) {
            toast.error('Please select a provider and model')
            return
        }

        setIsGenerating(true)
        setResponse('')
        const startTime = Date.now()

        try {
            const res = await superadminFetch('/api/superadmin/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: selectedProvider,
                    model: selectedModel,
                    messages: [
                        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                        { role: 'user', content: prompt }
                    ],
                    temperature: parameters.temperature,
                    max_tokens: parameters.maxTokens
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Generation failed')
            }

            const endTime = Date.now()
            const duration = endTime - startTime

            setResponse(data.content || data.message || '')

            // Add to history
            const historyEntry: HistoryEntry = {
                id: Date.now(),
                prompt: prompt.trim(),
                response: data.content || data.message || '',
                provider: selectedProvider,
                model: selectedModel,
                parameters: { ...parameters },
                timestamp: new Date().toISOString(),
                duration,
                tokensUsed: data.usage?.total_tokens || 0,
                cost: calculateEstimatedCost()
            }

            setHistory(prev => [historyEntry, ...prev].slice(0, 10))
            toast.success(`Generated in ${(duration / 1000).toFixed(1)}s`)

        } catch (error: any) {
            console.error('Generation error:', error)
            toast.error(error.message || 'Generation failed')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleStop = () => {
        setIsGenerating(false)
        toast('Generation stopped')
    }

    const handleClear = () => {
        setPrompt('')
        setResponse('')
    }

    const handleCopyResponse = () => {
        navigator.clipboard.writeText(response)
        toast.success('Copied to clipboard')
    }

    const handleDownloadResponse = () => {
        const blob = new Blob([response], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ai-response-${Date.now()}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Downloaded')
    }

    const tokenContext = getTokenContext(parameters.maxTokens)
    const activeProviderCount = providers.length

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">🎮 AI Playground</h1>
                    <p className="text-gray-400 mt-1">Test and experiment with AI models in real-time</p>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={loadData}
                        className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Refresh</span>
                    </button>

                    <div className="bg-green-900/20 border border-green-700/50 rounded-lg px-4 py-2">
                        <div className="flex items-center space-x-2 text-green-300">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">{activeProviderCount} providers ready</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Provider/Model Selection */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">AI Configuration</h3>

                        <div className="space-y-4">
                            {/* Provider */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Provider</label>
                                <select
                                    value={selectedProvider}
                                    onChange={(e) => setSelectedProvider(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                >
                                    {providers.map(p => (
                                        <option key={p.id} value={p.provider_type}>
                                            {p.provider_type.charAt(0).toUpperCase() + p.provider_type.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Model */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                >
                                    {providerModels.map(m => (
                                        <option key={m.id} value={m.model_id}>
                                            {m.model_name} (${m.input_cost_per_million}/${m.output_cost_per_million} per 1M)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* System Prompt */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">System Prompt (Optional)</label>
                                <textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    placeholder="You are a helpful assistant..."
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white h-20 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Parameters */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Parameters</h3>
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                            >
                                <Sliders className="w-4 h-4" />
                                <span>{showAdvanced ? 'Hide' : 'Show'} Advanced</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Temperature */}
                            <div>
                                <div className="flex items-center space-x-2 mb-2">
                                    <label className="text-sm font-medium text-gray-300">Temperature</label>
                                    <TooltipIcon param="temperature" />
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={parameters.temperature}
                                    onChange={(e) => setParameters(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>Focused</span>
                                    <span className="text-white font-medium">{parameters.temperature}</span>
                                    <span>Creative</span>
                                </div>
                            </div>

                            {/* Max Tokens */}
                            <div>
                                <div className="flex items-center space-x-2 mb-2">
                                    <label className="text-sm font-medium text-gray-300">Max Tokens</label>
                                    <TooltipIcon param="maxTokens" />
                                </div>
                                <input
                                    type="range"
                                    min="100"
                                    max="8000"
                                    step="100"
                                    value={parameters.maxTokens}
                                    onChange={(e) => setParameters(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>Short</span>
                                    <span className="text-white font-medium">{parameters.maxTokens}</span>
                                    <span>Long</span>
                                </div>

                                {/* Token Context */}
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <div className="bg-blue-900/20 border border-blue-700/50 rounded p-2 text-center">
                                        <div className="text-xs text-blue-300">Words</div>
                                        <div className="text-sm font-bold text-white">{tokenContext.words}</div>
                                    </div>
                                    <div className="bg-green-900/20 border border-green-700/50 rounded p-2 text-center">
                                        <div className="text-xs text-green-300">Pages</div>
                                        <div className="text-sm font-bold text-white">{tokenContext.pages}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Advanced Parameters */}
                            {showAdvanced && (
                                <>
                                    <div>
                                        <div className="flex items-center space-x-2 mb-2">
                                            <label className="text-sm font-medium text-gray-300">Top P</label>
                                            <TooltipIcon param="topP" />
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={parameters.topP}
                                            onChange={(e) => setParameters(prev => ({ ...prev, topP: parseFloat(e.target.value) }))}
                                            className="w-full"
                                        />
                                        <div className="text-center text-xs text-white font-medium">{parameters.topP}</div>
                                    </div>

                                    <div>
                                        <div className="flex items-center space-x-2 mb-2">
                                            <label className="text-sm font-medium text-gray-300">Frequency Penalty</label>
                                            <TooltipIcon param="frequencyPenalty" />
                                        </div>
                                        <input
                                            type="range"
                                            min="-2"
                                            max="2"
                                            step="0.1"
                                            value={parameters.frequencyPenalty}
                                            onChange={(e) => setParameters(prev => ({ ...prev, frequencyPenalty: parseFloat(e.target.value) }))}
                                            className="w-full"
                                        />
                                        <div className="text-center text-xs text-white font-medium">{parameters.frequencyPenalty}</div>
                                    </div>

                                    <div>
                                        <div className="flex items-center space-x-2 mb-2">
                                            <label className="text-sm font-medium text-gray-300">Presence Penalty</label>
                                            <TooltipIcon param="presencePenalty" />
                                        </div>
                                        <input
                                            type="range"
                                            min="-2"
                                            max="2"
                                            step="0.1"
                                            value={parameters.presencePenalty}
                                            onChange={(e) => setParameters(prev => ({ ...prev, presencePenalty: parseFloat(e.target.value) }))}
                                            className="w-full"
                                        />
                                        <div className="text-center text-xs text-white font-medium">{parameters.presencePenalty}</div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Cost Estimate */}
                        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded">
                            <div className="flex items-center space-x-2 text-yellow-300">
                                <DollarSign className="w-4 h-4" />
                                <span className="text-sm">
                                    Estimated cost: <strong>${calculateEstimatedCost()}</strong>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Playground */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Prompt Input */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Prompt</h3>
                            <button
                                onClick={handleClear}
                                className="text-gray-400 hover:text-white p-2"
                                title="Clear"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Enter your prompt here..."
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                        />

                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-gray-400">
                                {prompt.length} characters
                            </div>

                            <div className="flex items-center space-x-3">
                                {isGenerating ? (
                                    <button
                                        onClick={handleStop}
                                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                                    >
                                        <Pause className="w-4 h-4" />
                                        <span>Stop</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!prompt.trim() || !selectedProvider || !selectedModel}
                                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg"
                                    >
                                        <Send className="w-4 h-4" />
                                        <span>Generate</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Response */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Response</h3>

                            {response && (
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={handleCopyResponse}
                                        className="text-gray-400 hover:text-white p-2"
                                        title="Copy Response"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={handleDownloadResponse}
                                        className="text-gray-400 hover:text-white p-2"
                                        title="Download Response"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="min-h-[300px] bg-gray-900 border border-gray-600 rounded-lg p-4">
                            {isGenerating && (
                                <div className="flex items-center space-x-2 text-blue-400 mb-4">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">Generating response...</span>
                                </div>
                            )}

                            {response ? (
                                <div className="text-white whitespace-pre-wrap font-mono text-sm leading-relaxed">
                                    {response}
                                    {isGenerating && <span className="animate-pulse">|</span>}
                                </div>
                            ) : !isGenerating ? (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <div className="text-center">
                                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>Response will appear here</p>
                                        <p className="text-sm">Enter a prompt and click Generate to start</p>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* History */}
                    {history.length > 0 && (
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Recent Generations</h3>

                            <div className="space-y-4 max-h-64 overflow-y-auto">
                                {history.slice(0, 5).map((entry) => (
                                    <div key={entry.id} className="bg-gray-700 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm font-medium text-white capitalize">{entry.provider}</span>
                                                <span className="text-xs text-gray-400">{entry.model}</span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(entry.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>

                                            <div className="flex items-center space-x-4 text-xs text-gray-400">
                                                <span>{(entry.duration / 1000).toFixed(1)}s</span>
                                                <span>{entry.tokensUsed} tokens</span>
                                                <span>${entry.cost}</span>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-300 truncate">{entry.prompt}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
