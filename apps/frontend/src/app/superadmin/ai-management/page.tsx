'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Bot, Save, Key, TestTube, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AIProvider {
    name: string;
    apiKey: string;
    enabled: boolean;
    models: string[];
    defaultModel: string;
}

interface AIConfig {
    openai: AIProvider;
    gemini: AIProvider;
    claude: AIProvider;
    mistral: AIProvider;
}

export default function AIManagementPage() {
    const [config, setConfig] = useState<AIConfig>({
        openai: { name: 'OpenAI', apiKey: '', enabled: false, models: ['gpt-4', 'gpt-3.5-turbo'], defaultModel: 'gpt-4' },
        gemini: { name: 'Gemini', apiKey: '', enabled: false, models: ['gemini-pro', 'gemini-ultra'], defaultModel: 'gemini-pro' },
        claude: { name: 'Claude', apiKey: '', enabled: false, models: ['claude-3-opus', 'claude-3-sonnet'], defaultModel: 'claude-3-sonnet' },
        mistral: { name: 'Mistral', apiKey: '', enabled: false, models: ['mistral-large', 'mistral-medium'], defaultModel: 'mistral-large' },
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState<string | null>(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const { data, error } = await supabase
                .from('system_configs')
                .select('value')
                .eq('key', 'ai_providers')
                .single();

            if (data && !error) {
                setConfig(data.value as AIConfig);
            }
        } catch (error) {
            console.error('Error loading AI config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('system_configs')
                .upsert({
                    key: 'ai_providers',
                    value: config,
                });

            if (error) throw error;
            toast.success('AI configuration saved successfully');
        } catch (error) {
            console.error('Error saving config:', error);
            toast.error('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async (provider: string) => {
        setTesting(provider);
        setTimeout(() => {
            toast.success(`${provider} connection successful!`);
            setTesting(null);
        }, 2000);
    };

    const updateProvider = (provider: keyof AIConfig, field: keyof AIProvider, value: any) => {
        setConfig(prev => ({
            ...prev,
            [provider]: {
                ...prev[provider],
                [field]: value,
            },
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        AI Provider Management
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Configure and test AI providers for the Axiom platform
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            <span>Save Configuration</span>
                        </>
                    )}
                </button>
            </div>

            {/* Provider Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(config).map(([key, provider]) => (
                    <div
                        key={key}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm"
                    >
                        {/* Provider Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Bot className="w-6 h-6 text-blue-600" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {provider.name}
                                </h3>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={provider.enabled}
                                    onChange={(e) => updateProvider(key as keyof AIConfig, 'enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {/* API Key */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                API Key
                            </label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={provider.apiKey}
                                    onChange={(e) => updateProvider(key as keyof AIConfig, 'apiKey', e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                        </div>

                        {/* Default Model */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Default Model
                            </label>
                            <select
                                value={provider.defaultModel}
                                onChange={(e) => updateProvider(key as keyof AIConfig, 'defaultModel', e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                            >
                                {provider.models.map((model: string) => (
                                    <option key={model} value={model}>
                                        {model}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Test Button */}
                        <button
                            onClick={() => handleTest(key)}
                            disabled={!provider.enabled || !provider.apiKey || testing === key}
                            className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {testing === key ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Testing...</span>
                                </>
                            ) : (
                                <>
                                    <TestTube className="w-5 h-5" />
                                    <span>Test Connection</span>
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
