/**
 * Bootstrap Server Client
 * Replaces ssh2 with HTTP calls to existing Bootstrap server
 * Server: http://103.190.93.28:3000 (Lekhika's working bootstrap)
 */

export interface BootstrapWorker {
    name: string;
    pm_id: number;
    pid: number;
    status: 'online' | 'stopped' | 'errored' | 'launching';
    uptime: number;
    restarts: number;
    memory: number;
    cpu: number;
    script: string;
    port?: number;
    type: 'standard' | 'lean' | 'queue' | 'bootstrap';
}

export interface BootstrapSystemInfo {
    os: string;
    node: string;
    pm2: string;
    uptime: string;
}

export class BootstrapClient {
    private baseUrl: string;

    constructor(host: string, port: number = 3000) {
        this.baseUrl = `http://${host}:${port}`;
    }

    /**
     * List all PM2 processes
     */
    async listWorkers(): Promise<BootstrapWorker[]> {
        try {
            const response = await fetch(`${this.baseUrl}/pm2/list`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`Bootstrap API error: ${response.status}`);
            }

            const data = await response.json();
            return data.processes || [];
        } catch (error: any) {
            console.error('BootstrapClient.listWorkers error:', error);
            throw new Error(`Failed to list workers: ${error.message}`);
        }
    }

    /**
     * Start a PM2 worker
     */
    async startWorker(workerName: string): Promise<{ success: boolean; output?: string; error?: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/pm2/${workerName}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || `HTTP ${response.status}`,
                };
            }

            return {
                success: data.success || false,
                output: data.output,
            };
        } catch (error: any) {
            console.error('BootstrapClient.startWorker error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Stop a PM2 worker
     */
    async stopWorker(workerName: string): Promise<{ success: boolean; output?: string; error?: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/pm2/${workerName}/stop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || `HTTP ${response.status}`,
                };
            }

            return {
                success: data.success || false,
                output: data.output,
            };
        } catch (error: any) {
            console.error('BootstrapClient.stopWorker error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Restart a PM2 worker
     */
    async restartWorker(workerName: string): Promise<{ success: boolean; output?: string; error?: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/pm2/${workerName}/restart`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || `HTTP ${response.status}`,
                };
            }

            return {
                success: data.success || false,
                output: data.output,
            };
        } catch (error: any) {
            console.error('BootstrapClient.restartWorker error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Delete a PM2 worker (permanent stop)
     */
    async deleteWorker(workerName: string): Promise<{ success: boolean; output?: string; error?: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/pm2/${workerName}/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || `HTTP ${response.status}`,
                };
            }

            return {
                success: data.success || false,
                output: data.output,
            };
        } catch (error: any) {
            console.error('BootstrapClient.deleteWorker error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get system information
     */
    async getSystemInfo(): Promise<BootstrapSystemInfo> {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`Bootstrap health check failed: ${response.status}`);
            }

            const data = await response.json();

            // Bootstrap health doesn't return full system info
            // So we'll return basic info
            return {
                os: 'Linux',
                node: 'Unknown',
                pm2: 'Unknown',
                uptime: 'Unknown',
            };
        } catch (error: any) {
            console.error('BootstrapClient.getSystemInfo error:', error);
            throw new Error(`Failed to get system info: ${error.message}`);
        }
    }

    /**
     * Start all workers from ecosystem
     */
    async startAllWorkers(): Promise<{ success: boolean; output?: string; error?: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/pm2/start-all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || `HTTP ${response.status}`,
                };
            }

            return {
                success: data.success || false,
                output: data.output,
            };
        } catch (error: any) {
            console.error('BootstrapClient.startAllWorkers error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

/**
 * Get Bootstrap client instance
 */
export async function getBootstrapClient(serverId?: string): Promise<BootstrapClient> {
    // If serverId provided, fetch from database
    if (serverId) {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = createClient();

        const { data: server, error } = await supabase
            .from('vps_servers')
            .select('*')
            .eq('id', serverId)
            .eq('status', 'active')
            .single();

        if (error || !server) {
            throw new Error('VPS server not found or inactive');
        }

        return new BootstrapClient(server.host, 3000);
    }

    // Default: Use first active server
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();

    const { data: server, error } = await supabase
        .from('vps_servers')
        .select('*')
        .eq('status', 'active')
        .limit(1)
        .single();

    if (error || !server) {
        // Fallback to env var — set WORKER_VPS_HOST in Vercel/production
        const fallbackHost = process.env.WORKER_VPS_HOST;
        if (!fallbackHost) {
            throw new Error(
                'No VPS servers configured. Add one in Superadmin → Infrastructure, ' +
                'or set WORKER_VPS_HOST env var.'
            );
        }
        return new BootstrapClient(fallbackHost, parseInt(process.env.WORKER_VPS_BOOTSTRAP_PORT || '3000'));
    }

    return new BootstrapClient(server.host, 3000);
}
