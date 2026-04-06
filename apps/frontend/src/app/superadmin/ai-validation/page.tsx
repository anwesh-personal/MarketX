'use client'

import React, { useState, useEffect } from 'react'
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    Loader2,
    Play,
    RefreshCw,
    Zap,
    Clock,
    Shield,
    Eye,
    Wrench,
    CheckCheck,
    Ban
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
    is_active: boolean
    test_passed: boolean | null
    test_error: string | null
    last_tested: string | null
    supports_vision: boolean
    supports_function_calling: boolean
    supports_streaming: boolean
}

interface TestResult {
    model_id: string
    passed: boolean
    error?: string
    latency?: number
    response?: string
}

export default function AIValidationPage() {
    const [providers, setProviders] = useState<AIProvider[]>([])
    const [models, setModels] = useState<AIModel[]>([])
    const [loading, setLoading] = useState(true)
    const [testingAll, setTestingAll] = useState(false)
    const [testingModel, setTestingModel] = useState<string | null>(null)
    const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
    const [selectedProvider, setSelectedProvider] = useState<string>('all')

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
                setProviders(data.providers || [])
            }

            // Load models with test status
            const modelsRes = await superadminFetch('/api/superadmin/ai-models')
            if (modelsRes.ok) {
                const data = await modelsRes.json()
                setModels(data.models || [])
            }
        } catch (error) {
            console.error('Failed to load data:', error)
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    // Test a single model
    const testModel = async (model: AIModel) => {
        setTestingModel(model.model_id)

        try {
            const startTime = Date.now()

            const res = await superadminFetch('/api/superadmin/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: model.provider,
                    model: model.model_id,
                    messages: [{ role: 'user', content: 'Hello! Please respond with "OK" to confirm you are working.' }],
                    max_tokens: 50
                })
            })

            const latency = Date.now() - startTime
            const data = await res.json()

            const passed = res.ok && (data.content || data.message)

            const result: TestResult = {
                model_id: model.model_id,
                passed,
                latency,
                response: data.content || data.message,
                error: !passed ? (data.error || 'No response') : undefined
            }

            setTestResults(prev => ({ ...prev, [model.model_id]: result }))

            // Update model in database
            await superadminFetch('/api/superadmin/ai-models', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: model.id,
                    test_passed: passed,
                    test_error: result.error || null,
                    last_tested: new Date().toISOString()
                })
            })

            if (passed) {
                toast.success(`✅ ${model.model_name} passed`)
            } else {
                toast.error(`❌ ${model.model_name} failed: ${result.error}`)
            }

        } catch (error: any) {
            const result: TestResult = {
                model_id: model.model_id,
                passed: false,
                error: error.message || 'Connection failed'
            }
            setTestResults(prev => ({ ...prev, [model.model_id]: result }))
            toast.error(`❌ ${model.model_name} failed: ${error.message}`)
        } finally {
            setTestingModel(null)
        }
    }

    // Test all models for a provider
    const testProvider = async (providerType: string) => {
        const providerModels = models.filter(m => m.provider === providerType && m.is_active)

        for (const model of providerModels) {
            await testModel(model)
            // Small delay between tests
            await new Promise(r => setTimeout(r, 500))
        }
    }

    // Test all active models
    const testAllModels = async () => {
        setTestingAll(true)
        const activeModels = models.filter(m => m.is_active)

        toast(`Testing ${activeModels.length} models...`)

        for (const model of activeModels) {
            await testModel(model)
            await new Promise(r => setTimeout(r, 500))
        }

        const passedCount = Object.values(testResults).filter(r => r.passed).length
        toast.success(`Testing complete: ${passedCount}/${activeModels.length} passed`)

        setTestingAll(false)
    }

    // Filter models by provider
    const filteredModels = selectedProvider === 'all'
        ? models
        : models.filter(m => m.provider === selectedProvider)

    // Stats
    const activeModels = models.filter(m => m.is_active)
    const testedModels = models.filter(m => m.test_passed !== null)
    const passedModels = models.filter(m => m.test_passed === true)
    const failedModels = models.filter(m => m.test_passed === false)

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-info" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-textPrimary">🛡️ AI Validation</h1>
                    <p className="text-textTertiary mt-1">Test and validate AI models before enabling</p>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={loadData}
                        className="flex items-center space-x-2 bg-surface hover:bg-surfaceHover text-textPrimary px-4 py-2 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Refresh</span>
                    </button>

                    <button
                        onClick={testAllModels}
                        disabled={testingAll}
                        className="btn btn-primary px-4 py-2 rounded-lg"
                    >
                        {testingAll ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                        <span>{testingAll ? 'Testing...' : 'Test All Models'}</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-info-muted rounded-lg">
                            <Zap className="w-5 h-5 text-info" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-textPrimary">{activeModels.length}</div>
                            <div className="text-sm text-textTertiary">Active Models</div>
                        </div>
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-accent/30 rounded-lg">
                            <Shield className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-textPrimary">{testedModels.length}</div>
                            <div className="text-sm text-textTertiary">Tested</div>
                        </div>
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-success-muted rounded-lg">
                            <CheckCheck className="w-5 h-5 text-success" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-textPrimary">{passedModels.length}</div>
                            <div className="text-sm text-textTertiary">Passed</div>
                        </div>
                    </div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-error-muted rounded-lg">
                            <Ban className="w-5 h-5 text-error" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-textPrimary">{failedModels.length}</div>
                            <div className="text-sm text-textTertiary">Failed</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Provider Filter */}
            <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-textTertiary">Filter by Provider:</span>
                    <select
                        value={selectedProvider}
                        onChange={(e) => setSelectedProvider(e.target.value)}
                        className="bg-surfaceHover border border-border rounded-lg px-3 py-1.5 text-textPrimary text-sm"
                    >
                        <option value="all">All Providers</option>
                        {providers.map(p => (
                            <option key={p.id} value={p.provider_type}>
                                {p.provider_type.charAt(0).toUpperCase() + p.provider_type.slice(1)}
                            </option>
                        ))}
                    </select>

                    {selectedProvider !== 'all' && (
                        <button
                            onClick={() => testProvider(selectedProvider)}
                            disabled={testingModel !== null}
                            className="btn btn-primary btn-sm rounded-lg"
                        >
                            <Play className="w-3 h-3" />
                            <span>Test All {selectedProvider}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Models Table */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-background">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-textTertiary uppercase tracking-wider">Model</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-textTertiary uppercase tracking-wider">Provider</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-textTertiary uppercase tracking-wider">Capabilities</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-textTertiary uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-textTertiary uppercase tracking-wider">Last Tested</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-textTertiary uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredModels.map((model) => {
                            const result = testResults[model.model_id]
                            const isTesting = testingModel === model.model_id

                            return (
                                <tr key={model.id} className="hover:bg-surfaceHover">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="text-sm font-medium text-textPrimary">{model.model_name}</div>
                                            <div className="text-xs text-textTertiary">{model.model_id}</div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-surfaceHover text-textTertiary rounded text-xs capitalize">
                                            {model.provider}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            {model.supports_vision && (
                                                <span title="Vision" className="p-1 bg-accent/30 rounded">
                                                    <Eye className="w-3 h-3 text-accent" />
                                                </span>
                                            )}
                                            {model.supports_function_calling && (
                                                <span title="Function Calling" className="p-1 bg-info-muted rounded">
                                                    <Wrench className="w-3 h-3 text-info" />
                                                </span>
                                            )}
                                            {model.supports_streaming && (
                                                <span title="Streaming" className="p-1 bg-success-muted rounded">
                                                    <Zap className="w-3 h-3 text-success" />
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        {isTesting ? (
                                            <span className="flex items-center space-x-1 text-info">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-xs">Testing...</span>
                                            </span>
                                        ) : result ? (
                                            result.passed ? (
                                                <span className="flex items-center space-x-1 text-success">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="text-xs">{result.latency}ms</span>
                                                </span>
                                            ) : (
                                                <span className="flex items-center space-x-1 text-error" title={result.error}>
                                                    <XCircle className="w-4 h-4" />
                                                    <span className="text-xs truncate max-w-[100px]">{result.error}</span>
                                                </span>
                                            )
                                        ) : model.test_passed !== null ? (
                                            model.test_passed ? (
                                                <span className="flex items-center space-x-1 text-success">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="text-xs">Passed</span>
                                                </span>
                                            ) : (
                                                <span className="flex items-center space-x-1 text-error" title={model.test_error || ''}>
                                                    <XCircle className="w-4 h-4" />
                                                    <span className="text-xs">Failed</span>
                                                </span>
                                            )
                                        ) : (
                                            <span className="flex items-center space-x-1 text-textTertiary">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span className="text-xs">Not tested</span>
                                            </span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-sm text-textTertiary">
                                        {model.last_tested ? (
                                            <span className="flex items-center space-x-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{new Date(model.last_tested).toLocaleString()}</span>
                                            </span>
                                        ) : (
                                            <span className="text-textSecondary">Never</span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => testModel(model)}
                                            disabled={isTesting || testingAll}
                                            className="btn btn-primary btn-sm rounded-lg ml-auto"
                                        >
                                            {isTesting ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Play className="w-3 h-3" />
                                            )}
                                            <span>Test</span>
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                {filteredModels.length === 0 && (
                    <div className="p-8 text-center text-textTertiary">
                        No models found. Add AI providers first.
                    </div>
                )}
            </div>
        </div>
    )
}
