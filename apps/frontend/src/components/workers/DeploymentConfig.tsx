'use client';

import React, { useState, useEffect } from 'react';
import {
    Server,
    Cloud,
    Check,
    AlertCircle,
    Loader2,
    Save
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DeploymentConfigData {
    active_provider: 'railway' | 'vps';
    railway_project_id?: string;
    railway_service_id?: string;
    railway_environment?: string;
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

export function DeploymentConfig() {
    const [config, setConfig] = useState<DeploymentConfigData | null>(null);
    const [vpsServers, setVpsServers] = useState<VPSServer[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [selectedProvider, setSelectedProvider] = useState<'railway' | 'vps'>('vps');
    const [railwayToken, setRailwayToken] = useState('');
    const [railwayProject, setRailwayProject] = useState('');
    const [railwayService, setRailwayService] = useState('');
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
                setSelectedProvider(data.config.active_provider);
                setRailwayProject(data.config.railway_project_id || '');
                setRailwayService(data.config.railway_service_id || '');
                setVpsServerId(data.config.vps_server_id || '');
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

    const saveConfig = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/superadmin/workers/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    active_provider: selectedProvider,
                    railway_token: railwayToken || undefined,
                    railway_project_id: railwayProject || undefined,
                    railway_service_id: railwayService || undefined,
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
                        <div>
                            <label className="block text-sm text-textSecondary mb-xs">
                                Railway API Token
                            </label>
                            <input
                                type="password"
                                value={railwayToken}
                                onChange={(e) => setRailwayToken(e.target.value)}
                                placeholder="Enter Railway API token"
                                className="input w-full"
                            />
                            <p className="text-xs text-textTertiary mt-1">
                                Get from: Railway Dashboard → Settings → API Tokens
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-md">
                            <div>
                                <label className="block text-sm text-textSecondary mb-xs">
                                    Project ID
                                </label>
                                <input
                                    type="text"
                                    value={railwayProject}
                                    onChange={(e) => setRailwayProject(e.target.value)}
                                    placeholder="e.g., abc123..."
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-textSecondary mb-xs">
                                    Service ID
                                </label>
                                <input
                                    type="text"
                                    value={railwayService}
                                    onChange={(e) => setRailwayService(e.target.value)}
                                    placeholder="e.g., def456..."
                                    className="input w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status indicator */}
            <div className="flex items-center gap-sm text-sm">
                {config?.railway_configured || (selectedProvider === 'vps' && vpsServerId) ? (
                    <>
                        <Check className="w-4 h-4 text-success" />
                        <span className="text-success">
                            {selectedProvider === 'railway' ? 'Railway' : 'VPS'} configured
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
