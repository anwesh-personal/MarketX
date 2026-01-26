'use client';

import React, { useState, useEffect } from 'react';
import { Rocket, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface DeploymentCreatorProps {
    serverId: string | null;
}

export function DeploymentCreator({ serverId }: DeploymentCreatorProps) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [formData, setFormData] = useState({
        name: '',
        port: '3001',
        memory: '1G',
        instances: '1',
        environmentVars: {} as Record<string, string>,
    });
    const [deploying, setDeploying] = useState(false);
    const [envVarKey, setEnvVarKey] = useState('');
    const [envVarValue, setEnvVarValue] = useState('');

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const response = await fetch('/api/superadmin/worker-templates');
            if (response.ok) {
                const data = await response.json();
                setTemplates(data.templates || []);
            }
        } catch (error) {
            toast.error('Failed to load templates');
        }
    };

    const handleAddEnvVar = () => {
        if (!envVarKey.trim()) return;
        setFormData({
            ...formData,
            environmentVars: {
                ...formData.environmentVars,
                [envVarKey]: envVarValue,
            },
        });
        setEnvVarKey('');
        setEnvVarValue('');
    };

    const handleRemoveEnvVar = (key: string) => {
        const newVars = { ...formData.environmentVars };
        delete newVars[key];
        setFormData({ ...formData, environmentVars: newVars });
    };

    const handleDeploy = async () => {
        if (!selectedTemplate || !formData.name || !serverId) {
            toast.error('Please fill all required fields');
            return;
        }

        setDeploying(true);
        try {
            const response = await fetch('/api/superadmin/worker-deployments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template_id: selectedTemplate,
                    vps_server_id: serverId,
                    name: formData.name,
                    environment_vars: {
                        ...formData.environmentVars,
                        PORT: formData.port,
                    },
                    pm2_config: {
                        max_memory_restart: formData.memory,
                        instances: parseInt(formData.instances),
                    },
                }),
            });

            if (response.ok) {
                toast.success('Deployment initiated! Check Worker Grid for status.');
                // Reset form
                setFormData({
                    name: '',
                    port: '3001',
                    memory: '1G',
                    instances: '1',
                    environmentVars: {},
                });
                setSelectedTemplate('');
            } else {
                const error = await response.json();
                toast.error(error.error || 'Deployment failed');
            }
        } catch (error) {
            toast.error('Failed to deploy worker');
        } finally {
            setDeploying(false);
        }
    };

    const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

    return (
        <div className="p-lg max-w-4xl mx-auto">
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg">
                <h2 className="text-xl font-bold text-textPrimary mb-lg flex items-center gap-sm">
                    <Rocket className="w-5 h-5 text-primary" />
                    Deploy New Worker
                </h2>

                <div className="space-y-lg">
                    {/* Template Selection */}
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-xs">
                            Select Template *
                        </label>
                        <select
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            className="w-full px-md py-sm bg-background border border-border rounded-[var(--radius-md)] text-textPrimary"
                        >
                            <option value="">Choose a template...</option>
                            {templates.map(template => (
                                <option key={template.id} value={template.id}>
                                    {template.name} ({template.worker_type})
                                </option>
                            ))}
                        </select>
                        {selectedTemplateData && (
                            <p className="text-xs text-textTertiary mt-xs">
                                {selectedTemplateData.description}
                            </p>
                        )}
                    </div>

                    {/* Worker Name */}
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-xs">
                            Worker Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-md py-sm bg-background border border-border rounded-[var(--radius-md)] text-textPrimary"
                            placeholder="e.g., my-custom-worker"
                        />
                        <p className="text-xs text-textTertiary mt-xs">
                            Lowercase, no spaces. Used as PM2 process name.
                        </p>
                    </div>

                    {/* Configuration Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                        {/* Port */}
                        <div>
                            <label className="block text-sm font-medium text-textSecondary mb-xs">Port</label>
                            <input
                                type="number"
                                value={formData.port}
                                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                                className="w-full px-md py-sm bg-background border border-border rounded-[var(--radius-md)] text-textPrimary"
                            />
                        </div>

                        {/* Memory Limit */}
                        <div>
                            <label className="block text-sm font-medium text-textSecondary mb-xs">Memory Limit</label>
                            <select
                                value={formData.memory}
                                onChange={(e) => setFormData({ ...formData, memory: e.target.value })}
                                className="w-full px-md py-sm bg-background border border-border rounded-[var(--radius-md)] text-textPrimary"
                            >
                                <option value="500M">500 MB</option>
                                <option value="1G">1 GB</option>
                                <option value="2G">2 GB</option>
                                <option value="3G">3 GB</option>
                                <option value="4G">4 GB</option>
                            </select>
                        </div>

                        {/* Instances */}
                        <div>
                            <label className="block text-sm font-medium text-textSecondary mb-xs">Instances</label>
                            <select
                                value={formData.instances}
                                onChange={(e) => setFormData({ ...formData, instances: e.target.value })}
                                className="w-full px-md py-sm bg-background border border-border rounded-[var(--radius-md)] text-textPrimary"
                            >
                                <option value="1">1 (Fork mode)</option>
                                <option value="2">2</option>
                                <option value="4">4</option>
                                <option value="max">Max (Cluster mode)</option>
                            </select>
                        </div>
                    </div>

                    {/* Environment Variables */}
                    <div>
                        <label className="block text-sm font-medium text-textSecondary mb-xs">
                            Environment Variables
                        </label>

                        {/* Add Env Var */}
                        <div className="flex gap-sm mb-sm">
                            <input
                                type="text"
                                value={envVarKey}
                                onChange={(e) => setEnvVarKey(e.target.value)}
                                placeholder="KEY"
                                className="flex-1 px-md py-sm bg-background border border-border rounded-[var(--radius-md)] text-textPrimary"
                            />
                            <input
                                type="text"
                                value={envVarValue}
                                onChange={(e) => setEnvVarValue(e.target.value)}
                                placeholder="value"
                                className="flex-1 px-md py-sm bg-background border border-border rounded-[var(--radius-md)] text-textPrimary"
                            />
                            <button
                                onClick={handleAddEnvVar}
                                className="btn btn-secondary"
                            >
                                Add
                            </button>
                        </div>

                        {/* Show Env Vars */}
                        {Object.keys(formData.environmentVars).length > 0 && (
                            <div className="bg-background border border-border rounded-[var(--radius-md)] p-sm space-y-xs">
                                {Object.entries(formData.environmentVars).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between text-sm">
                                        <span className="font-mono text-textPrimary">
                                            {key}={value}
                                        </span>
                                        <button
                                            onClick={() => handleRemoveEnvVar(key)}
                                            className="text-error hover:underline text-xs"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Deploy Button */}
                    <div className="flex items-center justify-end gap-md pt-md border-t border-border">
                        <button
                            onClick={handleDeploy}
                            disabled={deploying || !selectedTemplate || !formData.name || !serverId}
                            className="btn btn-primary"
                        >
                            {deploying ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Deploying...
                                </>
                            ) : (
                                <>
                                    <Rocket className="w-4 h-4" />
                                    Deploy Worker
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
