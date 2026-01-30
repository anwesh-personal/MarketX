'use client';

import React, { useState, useEffect } from 'react';
import {
    Server,
    Cloud,
    Check,
    AlertCircle,
    Loader2,
    Save,
    RefreshCw,
    ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DeploymentConfigData {
    active_provider: 'railway' | 'vps';
    railway_workspace_id?: string;
    railway_project_id?: string;
    railway_service_id?: string;
    railway_environment?: string;
    railway_domain?: string;
    railway_configured?: boolean;
    vps_server_id?: string;
    vps_server_name?: string;
    auto_scale_enabled?: boolean;
    min_workers?: number;
    max_workers?: number;
}

interface VPSServer {
    id: string;
    name: string;
    host: string;
    status: string;
}

interface RailwayService {
    id: string;
    name: string;
    projectId: string;
    projectName: string;
    environmentId: string;
    environmentName: string;
    domains: string[];
}

export function DeploymentConfig() {
    const [config, setConfig] = useState<DeploymentConfigData | null>(null);
    const [vpsServers, setVpsServers] = useState<VPSServer[]>([]);
    const [railwayServices, setRailwayServices] = useState<RailwayService[]>([]);
    const [railwayWorkspaces, setRailwayWorkspaces] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fetchingServices, setFetchingServices] = useState(false);
    const [fetchingWorkspaces, setFetchingWorkspaces] = useState(false);
    const [tokenSaved, setTokenSaved] = useState(false);

    // Form state
    const [selectedProvider, setSelectedProvider] = useState<'railway' | 'vps'>('vps');
    const [railwayToken, setRailwayToken] = useState('');
    const [railwayWorkspaceId, setRailwayWorkspaceId] = useState('');
    const [selectedServiceKey, setSelectedServiceKey] = useState('');
    const [vpsServerId, setVpsServerId] = useState('');

    useEffect(() => {
        loadConfig();
        loadVpsServers();
    }, []);

    const loadConfig = async () => {
        try {
            const response = await fetch('/api/superadmin/workers/config');
            if (response.ok) {
                const data = await response.json();
                setConfig(data.config);
                setSelectedProvider(data.config.active_target || 'vps');
                setVpsServerId(data.config.vps_server_id || '');
                setRailwayWorkspaceId(data.config.railway_workspace_id || '');
                setTokenSaved(!!(data.config.railway_project_id && data.config.railway_service_id));

                // If we have saved service info, set the key for display
                if (data.config.railway_service_id && data.config.railway_project_id) {
                    setSelectedServiceKey(`${data.config.railway_project_id}|${data.config.railway_service_id}`);
                }
            }
        } catch (error) {
            console.error('Failed to load config:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadVpsServers = async () => {
        try {
            const response = await fetch('/api/superadmin/vps/servers');
            if (response.ok) {
                const data = await response.json();
                setVpsServers(data.servers || []);
            }
        } catch (error) {
            console.error('Failed to load VPS servers:', error);
        }
    };

    const fetchRailwayServices = async () => {
        if (!railwayToken) {
            toast.error('Enter Railway API token first');
            return;
        }

        setFetchingServices(true);
        try {
            // Save token first
            const saveRes = await fetch('/api/superadmin/workers/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    active_provider: 'railway',
                    railway_token: railwayToken,
                }),
            });

            if (!saveRes.ok) {
                throw new Error('Failed to save config');
            }

            // Now fetch services
            const response = await fetch('/api/superadmin/workers/railway-services');
            if (response.ok) {
                const data = await response.json();
                setRailwayServices(data.services || []);
                setTokenSaved(true);

                if (data.services?.length === 0) {
                    toast.error('No services with domains found. Make sure your services have a public domain.');
                } else {
                    toast.success(`Found ${data.services.length} service(s)`);
                }
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to fetch services');
            }
        } catch (error: any) {
            console.error('Failed to fetch Railway services:', error);
            toast.error('Failed to fetch Railway services');
        } finally {
            setFetchingServices(false);
        }
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            // Parse selected service
            let projectId = '';
            let serviceId = '';
            let domain = '';
            let environment = 'production';

            if (selectedProvider === 'railway') {
                if (selectedServiceKey && railwayServices.length > 0) {
                    const parts = selectedServiceKey.split('|');
                    if (parts.length >= 2) {
                        projectId = parts[0];
                        serviceId = parts[1];

                        // Find the service to get its domain and environment
                        const selectedService = railwayServices.find(
                            s => s.projectId === projectId && s.id === serviceId
                        );
                        if (selectedService) {
                            domain = selectedService.domains[0] || '';
                            environment = selectedService.environmentName || 'production';
                        }
                    }
                } else if (config) {
                    // Preserve existing Railway configuration if no new selection was made
                    projectId = config.railway_project_id || '';
                    serviceId = config.railway_service_id || '';
                    domain = config.railway_domain || '';
                    environment = config.railway_environment || 'production';
                }
            }

            const response = await fetch('/api/superadmin/workers/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    active_provider: selectedProvider,
                    railway_token: railwayToken || undefined,
                    railway_workspace_id: railwayWorkspaceId || undefined,
                    railway_project_id: projectId || undefined,
                    railway_service_id: serviceId || undefined,
                    railway_environment: environment,
                    railway_domain: domain || undefined,
                    vps_server_id: vpsServerId || undefined,
                }),
            });

            if (response.ok) {
                toast.success('Configuration saved');
                loadConfig();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to save');
            }
        } catch (error) {
            toast.error('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-xl">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-lg space-y-lg">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-textPrimary">
                        Worker Deployment Configuration
                    </h2>
                    <p className="text-sm text-textSecondary mt-1">
                        Choose where your workers run
                    </p>
                </div>
                <button
                    onClick={saveConfig}
                    disabled={saving}
                    className="btn btn-primary"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Configuration
                        </>
                    )}
                </button>
            </div>

            {/* Provider Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {/* VPS Option */}
                <div
                    onClick={() => setSelectedProvider('vps')}
                    className={`
                        cursor-pointer border-2 rounded-[var(--radius-lg)] p-lg
                        transition-all
                        ${selectedProvider === 'vps'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-border-hover'}
                    `}
                >
                    <div className="flex items-start gap-md">
                        <div className={`
                            w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center
                            ${selectedProvider === 'vps' ? 'bg-primary/20' : 'bg-surface'}
                        `}>
                            <Server className={`w-6 h-6 ${selectedProvider === 'vps' ? 'text-primary' : 'text-textSecondary'}`} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-sm">
                                <h3 className="font-semibold text-textPrimary">VPS (Your Servers)</h3>
                                {selectedProvider === 'vps' && (
                                    <Check className="w-4 h-4 text-primary" />
                                )}
                            </div>
                            <p className="text-sm text-textSecondary mt-1">
                                Run workers on your own VPS with PM2
                            </p>
                            <ul className="text-xs text-textTertiary mt-2 space-y-1">
                                <li>+ Fixed monthly cost</li>
                                <li>+ Full control & SSH access</li>
                                <li>+ No cold starts</li>
                                <li>- Manual scaling</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Railway Option */}
                <div
                    onClick={() => setSelectedProvider('railway')}
                    className={`
                        cursor-pointer border-2 rounded-[var(--radius-lg)] p-lg
                        transition-all
                        ${selectedProvider === 'railway'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-border-hover'}
                    `}
                >
                    <div className="flex items-start gap-md">
                        <div className={`
                            w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center
                            ${selectedProvider === 'railway' ? 'bg-primary/20' : 'bg-surface'}
                        `}>
                            <Cloud className={`w-6 h-6 ${selectedProvider === 'railway' ? 'text-primary' : 'text-textSecondary'}`} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-sm">
                                <h3 className="font-semibold text-textPrimary">Railway (Cloud)</h3>
                                {selectedProvider === 'railway' && (
                                    <Check className="w-4 h-4 text-primary" />
                                )}
                            </div>
                            <p className="text-sm text-textSecondary mt-1">
                                Managed cloud deployment with auto-scaling
                            </p>
                            <ul className="text-xs text-textTertiary mt-2 space-y-1">
                                <li>+ Auto-scale on demand</li>
                                <li>+ Zero maintenance</li>
                                <li>+ Pay per use</li>
                                <li>- Possible cold starts</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Provider-specific configuration */}
            {selectedProvider === 'vps' && (
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                    <h3 className="font-semibold text-textPrimary mb-md">VPS Configuration</h3>
                    <div className="space-y-md">
                        <div>
                            <label className="block text-sm text-textSecondary mb-xs">
                                Select VPS Server
                            </label>
                            <select
                                value={vpsServerId}
                                onChange={(e) => setVpsServerId(e.target.value)}
                                className="input w-full"
                            >
                                <option value="">Select a server...</option>
                                {vpsServers.map(server => (
                                    <option key={server.id} value={server.id}>
                                        {server.name} ({server.host})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {selectedProvider === 'railway' && (
                <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                    <h3 className="font-semibold text-textPrimary mb-md">Railway Configuration</h3>
                    <div className="space-y-md">
                        {/* Step 1: Token Input */}
                        <div>
                            <label className="block text-sm text-textSecondary mb-xs">
                                Step 1: Railway API Token
                            </label>
                            <input
                                type="password"
                                value={railwayToken}
                                onChange={(e) => {
                                    setRailwayToken(e.target.value);
                                    setTokenSaved(false);
                                }}
                                placeholder="Enter Railway API token"
                                className="input w-full"
                            />
                            <div className="flex items-center gap-md mt-1">
                                <p className="text-xs text-textTertiary">
                                    Get from: Railway Dashboard → Settings → API Tokens
                                </p>
                                <a
                                    href="https://railway.com/account/tokens"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    Open Tokens Page <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>

                        {/* Step 2: Fetch Services */}
                        <div>
                            <button
                                onClick={fetchRailwayServices}
                                disabled={fetchingServices || !railwayToken}
                                className="btn btn-secondary w-full flex items-center justify-center gap-sm"
                            >
                                {fetchingServices ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                                {fetchingServices ? 'Fetching Services...' : 'Fetch Services from Railway'}
                            </button>
                            <p className="text-xs text-textTertiary mt-1">
                                Automatically discovers all your Railway services
                            </p>
                        </div>

                        {/* Step 3: Service Selection */}
                        {railwayServices.length > 0 && (
                            <div>
                                <label className="block text-sm text-textSecondary mb-xs">
                                    Step 3: Select Worker Service
                                </label>
                                <select
                                    value={selectedServiceKey}
                                    onChange={(e) => setSelectedServiceKey(e.target.value)}
                                    disabled={railwayServices.length === 0 && !config?.railway_service_id}
                                    className="input w-full"
                                >
                                    <option value="">
                                        {railwayServices.length === 0
                                            ? 'Enter token and click Fetch Services first...'
                                            : 'Select a service...'
                                        }
                                    </option>
                                    {railwayServices.map(service => (
                                        <option
                                            key={`${service.projectId}|${service.id}`}
                                            value={`${service.projectId}|${service.id}`}
                                        >
                                            {service.projectName} / {service.name} ({service.environmentName}) — {service.domains[0]}
                                        </option>
                                    ))}
                                </select>
                                {selectedServiceKey && railwayServices.length > 0 && (
                                    <p className="text-xs text-success mt-1 flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        Domain will be auto-saved: {
                                            railwayServices.find(s =>
                                                `${s.projectId}|${s.id}` === selectedServiceKey
                                            )?.domains[0]
                                        }
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Current Config Display */}
                        {config?.railway_domain && (
                            <div className="bg-background rounded-[var(--radius-md)] p-md border border-border">
                                <p className="text-xs text-textTertiary mb-1">Currently Configured:</p>
                                <p className="text-sm text-textPrimary font-mono">
                                    https://{config.railway_domain}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Status indicator */}
            <div className="flex items-center gap-sm text-sm">
                {(config?.railway_configured && config?.railway_domain) || (selectedProvider === 'vps' && vpsServerId) ? (
                    <>
                        <Check className="w-4 h-4 text-success" />
                        <span className="text-success">
                            {selectedProvider === 'railway'
                                ? `Railway configured: ${config?.railway_domain}`
                                : 'VPS configured'
                            }
                        </span>
                    </>
                ) : (
                    <>
                        <AlertCircle className="w-4 h-4 text-warning" />
                        <span className="text-warning">
                            Complete configuration above
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}
