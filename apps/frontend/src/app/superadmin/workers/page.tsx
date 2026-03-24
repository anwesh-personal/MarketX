'use client';

import React, { useState, useEffect } from 'react';
import {
    Server,
    Activity,
    Settings,
    Terminal,
    FileCode,
    RefreshCw,
    Loader2,
    HardDrive,
    Rocket,
} from 'lucide-react';
import { WorkerGrid } from '@/components/workers/WorkerGrid';
import { TemplateManager } from '@/components/workers/TemplateManager';
import { DeploymentCreator } from '@/components/workers/DeploymentCreator';
import { DeploymentConfig } from '@/components/workers/DeploymentConfig';
import { LogsViewer } from '@/components/workers/LogsViewer';
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';

type Tab = 'grid' | 'templates' | 'deploy' | 'logs' | 'settings';

export default function WorkerControlDashboard() {
    const { fetchWithAuth } = useSuperadminAuth();
    const [activeTab, setActiveTab] = useState<Tab>('grid');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30000);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    // VPS State
    const [vpsServers, setVpsServers] = useState<any[]>([]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);

    // Load VPS servers on mount
    useEffect(() => {
        loadVPSServers();
    }, []);

    const loadVPSServers = async () => {
        setLoading(true);
        try {
            const response = await fetchWithAuth('/api/superadmin/vps/servers');
            if (response.ok) {
                const data = await response.json();
                setVpsServers(data.servers || []);
                if (data.servers?.length > 0 && !selectedServer) {
                    setSelectedServer(data.servers[0].id);
                }
            }
        } catch (error) {
            console.error('Failed to load VPS servers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setLastRefresh(new Date());
        loadVPSServers();
    };

    const tabs = [
        { id: 'grid' as Tab, label: 'Worker Grid', icon: Server },
        { id: 'templates' as Tab, label: 'Templates', icon: FileCode },
        { id: 'deploy' as Tab, label: 'Deploy', icon: Rocket },
        { id: 'logs' as Tab, label: 'Logs', icon: Terminal },
        { id: 'settings' as Tab, label: 'Settings', icon: Settings },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="bg-surface border-b border-border px-lg py-md">
                <div className="flex items-center justify-between mb-md">
                    <div className="flex items-center gap-md">
                        <Activity className="w-6 h-6 text-primary" />
                        <h1 className="text-2xl font-bold text-textPrimary">Worker Management</h1>
                        <span className="flex items-center gap-sm px-md py-xs bg-accent/10 text-accent rounded-[var(--radius-md)] text-xs font-medium">
                            <HardDrive className="w-3 h-3" />
                            VPS
                        </span>
                    </div>
                    <div className="flex items-center gap-md">
                        {/* Auto-refresh toggle */}
                        <label className="flex items-center gap-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="w-4 h-4 rounded border-border accent-primary"
                            />
                            <span className="text-sm text-textSecondary">Auto-refresh</span>
                        </label>

                        {/* Manual refresh */}
                        <button
                            onClick={handleRefresh}
                            className="p-sm rounded-[var(--radius-md)] text-textSecondary hover:text-textPrimary hover:bg-surfaceHover transition-colors"
                            title="Refresh now"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>

                        {/* Last refresh time */}
                        <span className="text-xs text-textTertiary">
                            Last: {lastRefresh.toLocaleTimeString()}
                        </span>
                    </div>
                </div>

                {/* Server selector */}
                {vpsServers.length > 0 && (
                    <div className="flex items-center gap-md">
                        <label className="text-sm font-medium text-textSecondary">VPS Server:</label>
                        <select
                            value={selectedServer || ''}
                            onChange={(e) => setSelectedServer(e.target.value)}
                            className="
                                bg-background border border-border rounded-[var(--radius-md)]
                                px-md py-sm text-textPrimary
                                focus:outline-none focus:ring-2 focus:ring-primary/50
                            "
                        >
                            {vpsServers.map(server => (
                                <option key={server.id} value={server.id}>
                                    {server.name} ({server.host})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Empty State — no VPS servers */}
            {vpsServers.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <HardDrive className="w-16 h-16 text-textTertiary mb-lg opacity-50" />
                    <h2 className="text-2xl font-bold text-textPrimary mb-sm">No VPS Servers Configured</h2>
                    <p className="text-textSecondary mb-lg">Add a VPS server in Infrastructure settings to get started.</p>
                    <button
                        className="btn btn-primary flex items-center gap-sm"
                        onClick={() => window.location.href = '/superadmin/infrastructure'}
                    >
                        <Settings className="w-4 h-4" />
                        Go to Infrastructure
                    </button>
                </div>
            )}

            {/* Show content when servers exist */}
            {vpsServers.length > 0 && (
                <>
                    {/* Tab Navigation */}
                    <div className="bg-surface border-b border-border">
                        <div className="flex gap-xs px-lg">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            flex items-center gap-sm px-lg py-md
                                            border-b-2 transition-all
                                            ${isActive
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-textSecondary hover:text-textPrimary'
                                            }
                                        `}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="font-medium">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-auto">
                        {activeTab === 'grid' && (
                            <WorkerGrid
                                serverId={selectedServer}
                                autoRefresh={autoRefresh}
                                refreshInterval={refreshInterval}
                                onRefresh={handleRefresh}
                            />
                        )}

                        {activeTab === 'templates' && (
                            <TemplateManager />
                        )}

                        {activeTab === 'deploy' && (
                            <DeploymentCreator
                                serverId={selectedServer}
                            />
                        )}

                        {activeTab === 'logs' && (
                            <LogsViewer
                                serverId={selectedServer}
                            />
                        )}

                        {activeTab === 'settings' && (
                            <DeploymentConfig />
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
