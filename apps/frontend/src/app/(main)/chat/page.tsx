'use client';

import React, { useState, useEffect } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { createClient } from '@/lib/supabase/client';
import { Bot, Loader2 } from 'lucide-react';

export default function ChatPage() {
    const [brains, setBrains]         = useState<any[]>([]);
    const [selectedBrain, setSelectedBrain] = useState<string | null>(null);
    const [orgId, setOrgId]           = useState<string | null>(null);
    const [loading, setLoading]       = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

            const { data: profile } = await supabase
                .from('users')
                .select('org_id')
                .eq('id', user.id)
                .single();
            if (profile?.org_id) setOrgId(profile.org_id);

            const response = await fetch('/api/brain/templates');
            if (response.ok) {
                const data = await response.json();
                setBrains(data.templates || []);
                if (data.templates?.length > 0) {
                    setSelectedBrain(data.templates[0].id);
                }
            }
        } catch (error) {
            console.error('Failed to load chat data:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectedBrainData = brains.find(b => b.id === selectedBrain);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
        );
    }

    if (brains.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="w-20 h-20 rounded-full bg-surfaceHover flex items-center justify-center mb-6">
                    <Bot className="w-10 h-10 text-textTertiary" />
                </div>
                <h2 className="text-2xl font-bold font-display text-textPrimary mb-2">No Brains Available</h2>
                <p className="text-textSecondary mb-8 max-w-sm text-center">Create a brain template in the superadmin panel to start chatting.</p>
                <a
                    href="/superadmin/brains"
                    className="btn btn-primary"
                >
                    Go to Brain Management
                </a>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col premium-card !p-0 overflow-hidden">
            {/* Brain Selector */}
            <div className="bg-surface/80 backdrop-blur-md border-b border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(var(--color-accent-rgb),0.1)] flex items-center justify-center text-accent">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-textPrimary font-display">Chat Interface</h2>
                        <p className="text-xs text-textSecondary">Select a brain to interact with</p>
                    </div>
                </div>
                <select
                    value={selectedBrain || ''}
                    onChange={(e) => setSelectedBrain(e.target.value)}
                    className="
                        w-64
                        bg-background border border-border rounded-[var(--radius-md)]
                        px-4 py-2 text-sm font-medium text-textPrimary
                        focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50
                        transition-all cursor-pointer
                    "
                >
                    {brains.map(brain => (
                        <option key={brain.id} value={brain.id}>
                            {brain.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Chat Interface */}
            {selectedBrain && selectedBrainData && (
                <div className="flex-1 bg-background/50 relative">
                    <ChatInterface
                        brainId={selectedBrain}
                        organizationId={orgId || ''}
                        brainName={selectedBrainData.name}
                        systemPrompt={selectedBrainData.system_prompt}
                    />
                </div>
            )}
        </div>
    );
}
