'use client';

import React, { useState, useEffect } from 'react';
import {
    Server,
    Activity,
    Settings,
    Terminal,
    FileCode,
    RefreshCw,
    AlertCircle,
    Loader2,
    Cloud,
    HardDrive,
    CheckCircle2,
    XCircle,
    Rocket,
    ExternalLink
} from 'lucide-react';
import { WorkerGrid } from '@/components/workers/WorkerGrid';
import { TemplateManager } from '@/components/workers/TemplateManager';
import { DeploymentCreator } from '@/components/workers/DeploymentCreator';
import { DeploymentConfig } from '@/components/workers/DeploymentConfig';
import { LogsViewer } from '@/components/workers/LogsViewer';
import { useSuperadminAuth } from '@/lib/useSuperadminAuth';

type Tab = 'grid' | 'templates' | 'deploy' | 'logs' | 'settings';
type Provider = 'vps' | 'railway';

interface RailwayStatus {
    name: string;
    status: 'online' | 'building' | 'deploying' | 'crashed' | 'stopped';
    deploymentId: string;
    createdAt: string;
}

export default function WorkerControlDashboard() {
    const { fetchWithAuth } = useSuperadminAuth();
    const [provider, setProvider] = useState<Provider>('vps');
    const [activeTab, setActiveTab] = useState<Tab>('grid');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30000);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    // VPS State
    const [vpsServers, setVpsServers] = useState<any[]>([]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);

    // Railway State
    const [railwayConfigured, setRailwayConfigured] = useState(false);
    const [railwayStatus, setRailwayStatus] = useState<RailwayStatus[]>([]);
    const [railwayLoading, setRailwayLoading] = useState(false);

    const [loading, setLoading] = useState(true);

    // Load initial data
    useEffect(() => {
        loadProviderData();
    }, [provider]);

    const loadProviderData = async () => {
        setLoading(true);
        try {
            // Check active provider from config first
            const configRes = await fetchWithAuth('/api/superadmin/workers/config');
            if (configRes.ok) {
                const configData = await configRes.json();
                const activeTarget = configData.config?.active_target || 'vps';

                // Only set if we're on the first mount (no provider change yet)
                if (loading && provider === 'vps' && activeTarget === 'railway') {
                    setProvider('railway');
                    // Stop here as setProvider will trigger another loadProviderData via useEffect
                    return;
                }
            }

            if (provider === 'vps') {
                await loadVPSServers();
            } else {
                await loadRailwayStatus();
            }
        } catch (error) {
            console.error('Failed to load provider data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadVPSServers = async () => {
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
        }
    };

    const loadRailwayStatus = async () => {
        setRailwayLoading(true);
        try {
            const response = await fetchWithAuth('/api/superadmin/workers/config');
            if (response.ok) {
                const data = await response.json();
                const config = data.config;
                setRailwayConfigured(!!(config?.railway_token && config?.railway_project_id));

                if (config?.railway_token && config?.railway_project_id) {
                    // Fetch Railway status
                    const statusRes = await fetchWithAuth('/api/superadmin/workers/status?provider=railway');
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        setRailwayStatus(statusData.workers || []);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load Railway status:', error);
        } finally {
            setRailwayLoading(false);
        }
    };

    const handleRefresh = () => {
        setLastRefresh(new Date());
        loadProviderData();
    };

    const handleRedeploy = async () => {
        try {
            const res = await fetchWithAuth('/api/superadmin/workers/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'redeploy', provider: 'railway' })
            });
            if (res.ok) {
                setTimeout(() => loadRailwayStatus(), 2000);
            }
        } catch (error) {
            console.error('Redeploy failed:', error);
        }
    };

    const tabs = [
        { id: 'grid' as Tab, label: 'Worker Grid', icon: Server },
        { id: 'templates' as Tab, label: 'Templates', icon: FileCode },
        { id: 'deploy' as Tab, label: 'Deploy', icon: Rocket },
        { id: 'logs' as Tab, label: 'Logs', icon: Terminal },
        { id: 'settings' as Tab, label: 'Settings', icon: Settings },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-success';
            case 'building':
            case 'deploying': return 'text-warning';
            case 'crashed': return 'text-error';
            default: return 'text-textTertiary';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'online': return <CheckCircle2 className="w-5 h-5 text-success" />;
            case 'building':
            case 'deploying': return <Loader2 className="w-5 h-5 text-warning animate-spin" />;
            case 'crashed': return <XCircle className="w-5 h-5 text-error" />;
            default: return <AlertCircle className="w-5 h-5 text-textTertiary" />;
        }
    };

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
                    </div>
                    <div className="flex items-center gap-md">
                        {/* Provider Toggle - THE MAIN FEATURE */}
                        <div className="flex items-center bg-background rounded-[var(--radius-lg)] p-1 border border-border">
                            <button
                                onClick={() => setProvider('vps')}
                                className={`
                                    flex items-center gap-sm px-md py-sm rounded-[var(--radius-md)]
                                    font-medium text-sm transition-all
                                    ${provider === 'vps'
                                        ? 'bg-accent text-onAccent shadow-md'
                                        : 'text-textSecondary hover:text-textPrimary'
                                    }
                                `}
                            >
                                <HardDrive className="w-4 h-4" />
                                VPS
                            </button>
                            <button
                                onClick={() => setProvider('railway')}
                                className={`
                                    flex items-center gap-sm px-md py-sm rounded-[var(--radius-md)]
                                    font-medium text-sm transition-all
                                    ${provider === 'railway'
                                        ? 'bg-accent text-onAccent shadow-md'
                                        : 'text-textSecondary hover:text-textPrimary'
                                    }
                                `}
                            >
                                <Cloud className="w-4 h-4" />
                                Railway
                            </button>
                        </div>

                        <div className="w-px h-6 bg-border" />

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

                {/* Provider-specific controls */}
                {provider === 'vps' && vpsServers.length > 0 && (
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

                {provider === 'railway' && railwayConfigured && (
                    <div className="flex items-center gap-md">
                        <div className="flex items-center gap-sm text-sm">
                            <Cloud className="w-4 h-4 text-primary" />
                            <span className="text-textSecondary">Railway Status:</span>
                            {railwayStatus.length > 0 ? (
                                <div className="flex items-center gap-sm">
                                    {getStatusIcon(railwayStatus[0].status)}
                                    <span className={`font-medium capitalize ${getStatusColor(railwayStatus[0].status)}`}>
                                        {railwayStatus[0].status}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-textTertiary">No deployments</span>
                            )}
                        </div>
                        <button
                            onClick={handleRedeploy}
                            className="flex items-center gap-xs px-sm py-xs bg-primary/10 text-primary rounded-[var(--radius-md)] hover:bg-primary/20 transition-colors text-sm"
                        >
                            <Rocket className="w-3 h-3" />
                            Redeploy
                        </button>
                        <a
                            href="https://railway.app/dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-xs text-xs text-textTertiary hover:text-primary transition-colors"
                        >
                            Open Dashboard <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                )}
            </div>

            {/* Empty States */}
            {provider === 'vps' && vpsServers.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <HardDrive className="w-16 h-16 text-textTertiary mb-lg opacity-50" />
                    <h2 className="text-2xl font-bold text-textPrimary mb-sm">No VPS Servers Configured</h2>
                    <p className="text-textSecondary mb-lg">Add a VPS server or switch to Railway</p>
                    <div className="flex gap-md">
                        <button className="btn btn-secondary" onClick={() => alert('Coming soon — VPS server registration modal is under development.')}>Add VPS Server</button>
                        <button
                            onClick={() => setProvider('railway')}
                            className="btn btn-primary flex items-center gap-sm"
                        >
                            <Cloud className="w-4 h-4" />
                            Use Railway Instead
                        </button>
                    </div>
                </div>
            )}

            {provider === 'railway' && !railwayConfigured && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Cloud className="w-16 h-16 text-textTertiary mb-lg opacity-50" />
                    <h2 className="text-2xl font-bold text-textPrimary mb-sm">Railway Not Configured</h2>
                    <p className="text-textSecondary mb-lg max-w-md text-center">
                        Configure your Railway API token and project details to deploy workers to the cloud.
                    </p>
                    <div className="flex gap-md">
                        <button
                            onClick={() => setActiveTab('settings')}
                            className="btn btn-primary flex items-center gap-sm"
                        >
                            <Settings className="w-4 h-4" />
                            Configure Railway
                        </button>
                        <button
                            onClick={() => setProvider('vps')}
                            className="btn btn-secondary flex items-center gap-sm"
                        >
                            <HardDrive className="w-4 h-4" />
                            Use VPS Instead
                        </button>
                    </div>
                </div>
            )}

            {/* Show content when provider is configured */}
            {((provider === 'vps' && vpsServers.length > 0) || (provider === 'railway' && railwayConfigured)) && (
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
                                serverId={provider === 'vps' ? selectedServer : 'railway'}
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
                                serverId={provider === 'vps' ? selectedServer : 'railway'}
                            />
                        )}

                        {activeTab === 'logs' && (
                            <LogsViewer
                                serverId={provider === 'vps' ? selectedServer : 'railway'}
                            />
                        )}

                        {activeTab === 'settings' && (
                            <DeploymentConfig />
                        )}
                    </div>
                </>
            )}

            {/* Show settings tab if Railway not configured but selected */}
            {provider === 'railway' && !railwayConfigured && activeTab === 'settings' && (
                <>
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
                    <div className="flex-1 overflow-auto">
                        <DeploymentConfig />
                    </div>
                </>
            )}
        </div>
    );
}
