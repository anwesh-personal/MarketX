'use client';

import React, { useState, useEffect } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { Bot, Loader2 } from 'lucide-react';

export default function ChatPage() {
    const [brains, setBrains] = useState<any[]>([]);
    const [selectedBrain, setSelectedBrain] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBrains();
    }, []);

    const loadBrains = async () => {
        try {
            const response = await fetch('/api/superadmin/brains');
            if (response.ok) {
                const data = await response.json();
                setBrains(data.brains || []);
                if (data.brains?.length > 0) {
                    setSelectedBrain(data.brains[0].id);
                }
            }
        } catch (error) {
            console.error('Failed to load brains:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectedBrainData = brains.find(b => b.id === selectedBrain);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (brains.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <Bot className="w-16 h-16 text-textTertiary mb-lg opacity-50" />
                <h2 className="text-2xl font-bold text-textPrimary mb-sm">No Brains Available</h2>
                <p className="text-textSecondary mb-lg">Create a brain template to start chatting</p>
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
        <div className="h-screen flex flex-col">
            {/* Brain Selector */}
            <div className="bg-surface border-b border-border p-md">
                <label className="block text-sm font-medium text-textSecondary mb-xs">
                    Select Brain
                </label>
                <select
                    value={selectedBrain || ''}
                    onChange={(e) => setSelectedBrain(e.target.value)}
                    className="
                        w-full max-w-sm
                        bg-background border border-border rounded-[var(--radius-md)]
                        px-md py-sm text-textPrimary
                        focus:outline-none focus:ring-2 focus:ring-primary/50
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
                <div className="flex-1">
                    <ChatInterface
                        brainId={selectedBrain}
                        organizationId="default-org" // Replace with actual org
                        brainName={selectedBrainData.name}
                        systemPrompt={selectedBrainData.system_prompt}
                    />
                </div>
            )}
        </div>
    );
}
