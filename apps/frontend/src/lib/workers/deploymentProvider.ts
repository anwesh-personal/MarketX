/**
 * Unified Worker Deployment Provider
 * Abstracts Railway vs VPS implementation details
 */

import { BootstrapClient, BootstrapWorker, getBootstrapClient } from '@/lib/vps/bootstrapClient';
import { RailwayClient, getRailwayClient } from '@/lib/railway/railwayClient';
import { createClient } from '@/lib/supabase/server';

export interface WorkerStatus {
    name: string;
    status: 'online' | 'stopped' | 'building' | 'deploying' | 'crashed' | 'errored';
    uptime?: string;
    cpu?: string;
    memory?: string;
    restarts?: number;
    deploymentId?: string;
    provider: 'railway' | 'vps';
}

export interface DeploymentStats {
    total: number;
    online: number;
    stopped: number;
    errored: number;
    provider: 'railway' | 'vps';
}

export interface DeploymentProvider {
    provider: 'railway' | 'vps';

    getStatus(): Promise<{ workers: WorkerStatus[]; stats: DeploymentStats }>;
    restart(workerName: string): Promise<{ success: boolean; error?: string }>;
    stop(workerName: string): Promise<{ success: boolean; error?: string }>;
    start(workerName: string): Promise<{ success: boolean; error?: string }>;
    getLogs(workerName: string): Promise<string>;
    deploy(): Promise<{ success: boolean; error?: string }>;
}

/**
 * VPS Deployment Provider
 */
class VPSDeploymentProvider implements DeploymentProvider {
    provider: 'vps' = 'vps';
    private client: BootstrapClient;

    constructor(client: BootstrapClient) {
        this.client = client;
    }

    async getStatus(): Promise<{ workers: WorkerStatus[]; stats: DeploymentStats }> {
        const workers = await this.client.listWorkers();

        const mapped: WorkerStatus[] = workers.map((w: BootstrapWorker) => ({
            name: w.name,
            status: w.status === 'online' ? 'online' :
                w.status === 'stopped' ? 'stopped' : 'errored',
            uptime: this.formatUptime(w.uptime),
            cpu: `${(w.cpu || 0).toFixed(1)}%`,
            memory: this.formatMemory(w.memory || 0),
            restarts: w.restarts,
            provider: 'vps' as const,
        }));

        const stats: DeploymentStats = {
            total: workers.length,
            online: workers.filter((w: BootstrapWorker) => w.status === 'online').length,
            stopped: workers.filter((w: BootstrapWorker) => w.status === 'stopped').length,
            errored: workers.filter((w: BootstrapWorker) => w.status === 'errored').length,
            provider: 'vps',
        };

        return { workers: mapped, stats };
    }

    async restart(workerName: string): Promise<{ success: boolean; error?: string }> {
        return this.client.restartWorker(workerName);
    }

    async stop(workerName: string): Promise<{ success: boolean; error?: string }> {
        return this.client.stopWorker(workerName);
    }

    async start(workerName: string): Promise<{ success: boolean; error?: string }> {
        return this.client.startWorker(workerName);
    }

    async getLogs(workerName: string): Promise<string> {
        // TODO: Implement via Bootstrap API
        return 'Logs available via SSH: pm2 logs ' + workerName;
    }

    async deploy(): Promise<{ success: boolean; error?: string }> {
        return this.client.startAllWorkers();
    }

    private formatUptime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    }

    private formatMemory(bytes: number): string {
        const mb = bytes / (1024 * 1024);
        if (mb > 1024) return `${(mb / 1024).toFixed(1)}G`;
        return `${mb.toFixed(0)}M`;
    }
}

/**
 * Railway Deployment Provider
 */
class RailwayDeploymentProvider implements DeploymentProvider {
    provider: 'railway' = 'railway';
    private client: RailwayClient;

    constructor(client: RailwayClient) {
        this.client = client;
    }

    async getStatus(): Promise<{ workers: WorkerStatus[]; stats: DeploymentStats }> {
        const workers = await this.client.getStatus();

        const mapped: WorkerStatus[] = workers.map(w => ({
            name: w.name,
            status: w.status,
            deploymentId: w.deploymentId,
            provider: 'railway' as const,
        }));

        const stats: DeploymentStats = {
            total: workers.length,
            online: workers.filter(w => w.status === 'online').length,
            stopped: workers.filter(w => w.status === 'stopped').length,
            errored: workers.filter(w => ['crashed', 'errored'].includes(w.status)).length,
            provider: 'railway',
        };

        return { workers: mapped, stats };
    }

    async restart(workerName: string): Promise<{ success: boolean; error?: string }> {
        return this.client.restart();
    }

    async stop(workerName: string): Promise<{ success: boolean; error?: string }> {
        // Railway doesn't have individual stop - would need to scale to 0
        return { success: false, error: 'Use Railway dashboard to stop service' };
    }

    async start(workerName: string): Promise<{ success: boolean; error?: string }> {
        return this.client.redeploy();
    }

    async getLogs(workerName: string): Promise<string> {
        return this.client.getLogs();
    }

    async deploy(): Promise<{ success: boolean; error?: string }> {
        return this.client.redeploy();
    }
}

/**
 * Get the active deployment provider based on config
 */
export async function getDeploymentProvider(): Promise<DeploymentProvider> {
    const supabase = createClient();

    const { data: config, error } = await supabase
        .from('worker_deployment_config')
        .select('active_provider, vps_server_id')
        .single();

    if (error || !config) {
        // Default to VPS
        const bootstrap = await getBootstrapClient();
        return new VPSDeploymentProvider(bootstrap);
    }

    if (config.active_provider === 'railway') {
        const railwayClient = await getRailwayClient();
        if (railwayClient && railwayClient.isConfigured()) {
            return new RailwayDeploymentProvider(railwayClient);
        }
        // Fallback to VPS if Railway not configured
        console.warn('Railway not configured, falling back to VPS');
    }

    const bootstrap = await getBootstrapClient(config.vps_server_id || undefined);
    return new VPSDeploymentProvider(bootstrap);
}
