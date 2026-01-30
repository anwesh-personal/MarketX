'use client';

import React, { useState, useEffect } from 'react';
import { Terminal, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface LogsViewerProps {
    serverId: string | null;
}

export function LogsViewer({ serverId }: LogsViewerProps) {
    const [workers, setWorkers] = useState<any[]>([]);
    const [selectedWorker, setSelectedWorker] = useState<string>('');
    const [logs, setLogs] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);

    useEffect(() => {
        loadWorkers();
    }, [serverId]);

    useEffect(() => {
        if (autoRefresh && selectedWorker) {
            const interval = setInterval(loadLogs, 5000);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, selectedWorker]);

    const loadWorkers = async () => {
        try {
            const params = new URLSearchParams();
            let url = '/api/superadmin/vps/pm2';

            if (serverId === 'railway') {
                url = '/api/superadmin/workers/status';
            } else if (serverId) {
                params.append('server_id', serverId);
            }

            const response = await fetch(`${url}?${params}`);
            if (response.ok) {
                const data = await response.json();
                // Both APIs return workers/processes array
                setWorkers(data.workers || data.processes || []);
            }
        } catch (error) {
            console.error('Failed to load workers:', error);
        }
    };

    const loadLogs = async () => {
        if (!selectedWorker) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({ lines: '100' });
            let url = '/api/superadmin/vps/pm2/logs';

            if (serverId === 'railway') {
                url = '/api/superadmin/workers/logs';
                params.append('workerName', selectedWorker);
            } else {
                params.append('process_name', selectedWorker);
                if (serverId) params.append('server_id', serverId);
            }

            const response = await fetch(`${url}?${params}`);
            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs || 'No logs available');
            } else {
                setLogs('Failed to load logs');
            }
        } catch (error) {
            setLogs('Error loading logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedWorker) {
            loadLogs();
        }
    }, [selectedWorker]);

    return (
        <div className="p-lg h-full flex flex-col">
            <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-lg flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-md">
                    <h2 className="text-xl font-bold text-textPrimary flex items-center gap-sm">
                        <Terminal className="w-5 h-5 text-primary" />
                        Worker Logs
                    </h2>
                    <label className="flex items-center gap-sm cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <span className="text-sm text-textSecondary">Auto-refresh (5s)</span>
                    </label>
                </div>

                {/* Worker Selector */}
                <div className="mb-md">
                    <select
                        value={selectedWorker}
                        onChange={(e) => setSelectedWorker(e.target.value)}
                        className="w-full px-md py-sm bg-background border border-border rounded-[var(--radius-md)] text-textPrimary"
                    >
                        <option value="">Select a worker...</option>
                        {workers.map(worker => (
                            <option key={worker.name} value={worker.name}>
                                {worker.name} ({worker.status})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Logs Display */}
                <div className="flex-1 bg-background border border-border rounded-[var(--radius-md)] p-md overflow-auto font-mono text-sm">
                    {loading && !logs ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                    ) : !selectedWorker ? (
                        <div className="flex flex-col items-center justify-center h-full text-textTertiary">
                            <Terminal className="w-12 h-12 mb-md opacity-50" />
                            <p>Select a worker to view logs</p>
                        </div>
                    ) : (
                        <pre className="text-textPrimary whitespace-pre-wrap">{logs}</pre>
                    )}
                </div>
            </div>
        </div>
    );
}
