'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Zap,
    Database,
    ArrowRight,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface KnowledgeBase {
    id: string;
    name: string;
    version: number;
    data: any;
}

export default function NewRunPage() {
    const router = useRouter();
    const supabase = createClient();
    const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userId, setUserId] = useState('');
    const [formData, setFormData] = useState({
        kb_id: '',
        prompt: '',
        settings: {
            tone: 'professional',
            length: 'medium',
        },
    });

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }

        setUserId(user.id);
        await loadKBs(user.id);
    };

    const loadKBs = async (userId: string) => {
        try {
            setIsLoading(true);

            // Get user's org
            const { data: userData } = await supabase
                .from('users')
                .select('org_id')
                .eq('id', userId)
                .single();

            if (!userData) return;

            // Get KBs
            const { data: kbsData } = await supabase
                .from('knowledge_bases')
                .select('id, name, version, data')
                .eq('org_id', userData.org_id)
                .order('name');

            setKbs(kbsData || []);

        } catch (error) {
            console.error('Failed to load KBs:', error);
            toast.error('Failed to load knowledge bases');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.kb_id) {
            toast.error('Please select a knowledge base');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/writer/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kb_id: formData.kb_id,
                    prompt: formData.prompt,
                    settings: formData.settings,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.error || 'Failed to start run');
            }

            toast.success('Writer job queued. You can track it on the Writer Studio.');
            router.push(data.executionId ? `/writer?execution=${data.executionId}` : '/writer');
        } catch (error: any) {
            console.error('Failed to create run:', error);
            toast.error(error.message || 'Failed to create run');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-lg">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-textPrimary mb-xs">
                    Create New Run
                </h1>
                <p className="text-textSecondary">
                    Generate content using your knowledge bases
                </p>
            </div>

            {/* No KBs Warning */}
            {kbs.length === 0 && (
                <div className="card bg-warning/10 border-warning">
                    <div className="flex items-start gap-sm">
                        <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-xs" />
                        <div>
                            <p className="text-sm font-semibold text-textPrimary mb-xs">
                                No Knowledge Bases Found
                            </p>
                            <p className="text-sm text-textSecondary mb-sm">
                                You need to upload at least one knowledge base before creating a run.
                            </p>
                            <button
                                onClick={() => router.push('/kb-manager')}
                                className="
                                    text-sm font-medium text-warning
                                    hover:underline
                                "
                            >
                                Upload Knowledge Base →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-lg">
                {/* Knowledge Base Selection */}
                <div className="card">
                    <h2 className="text-xl font-bold text-textPrimary mb-md">
                        Select Knowledge Base
                    </h2>

                    {kbs.length > 0 ? (
                        <div className="grid grid-cols-1 gap-sm">
                            {kbs.map((kb) => (
                                <label
                                    key={kb.id}
                                    className={`
                                        flex items-start gap-md
                                        p-md
                                        border-2 rounded-[var(--radius-md)]
                                        cursor-pointer
                                        transition-all
                                        ${formData.kb_id === kb.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-borderHover hover:bg-surfaceHover'
                                        }
                                    `}
                                >
                                    <input
                                        type="radio"
                                        name="kb_id"
                                        value={kb.id}
                                        checked={formData.kb_id === kb.id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, kb_id: e.target.value }))}
                                        className="mt-xs"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-sm mb-xs">
                                            <Database className="w-5 h-5 text-info" />
                                            <h3 className="font-bold text-textPrimary">{kb.name}</h3>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-textSecondary text-center py-md">
                            No knowledge bases available
                        </p>
                    )}
                </div>

                {/* Settings */}
                <div className="card">
                    <h2 className="text-xl font-bold text-textPrimary mb-md">
                        Content Settings
                    </h2>

                    <div className="space-y-md">
                        {/* Tone */}
                        <div>
                            <label className="block text-sm font-semibold text-textPrimary mb-xs">
                                Tone
                            </label>
                            <select
                                value={formData.settings.tone}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    settings: { ...prev.settings, tone: e.target.value }
                                }))}
                                className="
                                    w-full px-md py-sm
                                    bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all
                                "
                            >
                                <option value="professional">Professional</option>
                                <option value="casual">Casual</option>
                                <option value="formal">Formal</option>
                                <option value="friendly">Friendly</option>
                                <option value="technical">Technical</option>
                            </select>
                        </div>

                        {/* Length */}
                        <div>
                            <label className="block text-sm font-semibold text-textPrimary mb-xs">
                                Length
                            </label>
                            <select
                                value={formData.settings.length}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    settings: { ...prev.settings, length: e.target.value }
                                }))}
                                className="
                                    w-full px-md py-sm
                                    bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all
                                "
                            >
                                <option value="short">Short (500 words)</option>
                                <option value="medium">Medium (1000 words)</option>
                                <option value="long">Long (2000+ words)</option>
                            </select>
                        </div>

                        {/* Custom Prompt (Optional) */}
                        <div>
                            <label className="block text-sm font-semibold text-textPrimary mb-xs">
                                Custom Instructions (Optional)
                            </label>
                            <textarea
                                value={formData.prompt}
                                onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                                className="
                                    w-full px-md py-sm
                                    bg-background text-textPrimary
                                    border border-border rounded-[var(--radius-md)]
                                    focus:outline-none focus:ring-2 focus:ring-borderFocus
                                    transition-all
                                    min-h-[120px]
                                "
                                placeholder="Add any specific instructions for content generation..."
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-md pt-md border-t border-border">
                    <button
                        type="button"
                        onClick={() => router.push('/writer')}
                        disabled={isSubmitting}
                        className="
                            px-lg py-sm
                            text-textSecondary font-semibold
                            hover:bg-surfaceHover
                            rounded-[var(--radius-md)]
                            transition-all
                        "
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={isSubmitting || !formData.kb_id}
                        className="
                            flex items-center gap-sm
                            btn btn-primary font-semibold
                            hover:opacity-90
                            active:scale-[0.98]
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all
                        "
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Creating...</span>
                            </>
                        ) : (
                            <>
                                <Zap className="w-5 h-5" />
                                <span>Create Run</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
