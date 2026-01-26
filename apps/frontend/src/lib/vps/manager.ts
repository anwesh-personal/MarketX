import { Client } from 'ssh2';

/**
 * VPS Manager - SSH-based remote worker control
 * Manages PM2 processes on remote VPS servers
 */

export interface VPSConfig {
    host: string;
    port: number;
    username: string;
    password: string;
}

export interface WorkerStatus {
    id: number;
    name: string;
    status: 'online' | 'stopped' | 'errored';
    uptime: string;
    cpu: string;
    memory: string;
    restarts: number;
}

export interface CommandResult {
    success: boolean;
    output: string;
    error?: string;
}

export class VPSManager {
    private config: VPSConfig;

    constructor(config: VPSConfig) {
        this.config = config;
    }

    /**
     * Execute command via SSH
     */
    private async executeCommand(command: string): Promise<CommandResult> {
        return new Promise((resolve) => {
            const conn = new Client();
            let output = '';
            let errorOutput = '';

            conn.on('ready', () => {
                conn.exec(command, (err, stream) => {
                    if (err) {
                        conn.end();
                        return resolve({
                            success: false,
                            output: '',
                            error: err.message,
                        });
                    }

                    stream.on('close', () => {
                        conn.end();
                        resolve({
                            success: errorOutput.length === 0,
                            output: output.trim(),
                            error: errorOutput.trim() || undefined,
                        });
                    });

                    stream.on('data', (data: Buffer) => {
                        output += data.toString();
                    });

                    stream.stderr.on('data', (data: Buffer) => {
                        errorOutput += data.toString();
                    });
                });
            });

            conn.on('error', (err) => {
                resolve({
                    success: false,
                    output: '',
                    error: err.message,
                });
            });

            conn.connect({
                host: this.config.host,
                port: this.config.port,
                username: this.config.username,
                password: this.config.password,
            });
        });
    }

    /**
     * List all PM2 processes
     */
    async listWorkers(): Promise<WorkerStatus[]> {
        const result = await this.executeCommand('pm2 jlist');

        if (!result.success) {
            throw new Error(result.error || 'Failed to list workers');
        }

        try {
            const processes = JSON.parse(result.output);
            return processes.map((proc: any) => ({
                id: proc.pm_id,
                name: proc.name,
                status: proc.pm2_env.status,
                uptime: this.formatUptime(proc.pm2_env.pm_uptime),
                cpu: `${proc.monit.cpu}%`,
                memory: this.formatMemory(proc.monit.memory),
                restarts: proc.pm2_env.restart_time,
            }));
        } catch (parseError) {
            throw new Error('Failed to parse PM2 output');
        }
    }

    /**
     * Start a worker
     */
    async startWorker(nameOrId: string): Promise<CommandResult> {
        return this.executeCommand(`pm2 start ${nameOrId}`);
    }

    /**
     * Stop a worker
     */
    async stopWorker(nameOrId: string): Promise<CommandResult> {
        return this.executeCommand(`pm2 stop ${nameOrId}`);
    }

    /**
     * Restart a worker
     */
    async restartWorker(nameOrId: string): Promise<CommandResult> {
        return this.executeCommand(`pm2 restart ${nameOrId}`);
    }

    /**
     * Delete a worker
     */
    async deleteWorker(nameOrId: string): Promise<CommandResult> {
        return this.executeCommand(`pm2 delete ${nameOrId}`);
    }

    /**
     * Get worker logs
     */
    async getWorkerLogs(nameOrId: string, lines: number = 50): Promise<string> {
        const result = await this.executeCommand(`pm2 logs ${nameOrId} --lines ${lines} --nostream`);
        return result.output;
    }

    /**
     * Deploy code to VPS
     */
    async deployCode(projectPath: string, branch: string = 'main'): Promise<CommandResult> {
        const commands = [
            `cd ${projectPath}`,
            `git fetch origin`,
            `git checkout ${branch}`,
            `git pull origin ${branch}`,
            `npm install --production`,
            `pm2 restart all`,
        ].join(' && ');

        return this.executeCommand(commands);
    }

    /**
     * Get system info
     */
    async getSystemInfo(): Promise<{
        os: string;
        node: string;
        pm2: string;
        uptime: string;
    }> {
        const result = await this.executeCommand(
            'echo "OS: $(uname -a)" && echo "Node: $(node --version)" && echo "PM2: $(pm2 --version)" && echo "Uptime: $(uptime -p)"'
        );

        const lines = result.output.split('\n');
        return {
            os: lines[0]?.replace('OS: ', '') || 'Unknown',
            node: lines[1]?.replace('Node: ', '') || 'Unknown',
            pm2: lines[2]?.replace('PM2: ', '') || 'Unknown',
            uptime: lines[3]?.replace('Uptime: ', '') || 'Unknown',
        };
    }

    /**
     * Format uptime
     */
    private formatUptime(timestamp: number): string {
        if (!timestamp) return '0s';

        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    /**
     * Format memory
     */
    private formatMemory(bytes: number): string {
        const mb = bytes / (1024 * 1024);
        if (mb > 1024) {
            return `${(mb / 1024).toFixed(1)}GB`;
        }
        return `${mb.toFixed(1)}MB`;
    }
}

/**
 * Get VPS Manager instance by server ID
 * Fetches credentials from database
 */
export async function getVPSManager(serverId?: string): Promise<VPSManager> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();

    let query = supabase
        .from('vps_servers')
        .select('*')
        .eq('status', 'active');

    if (serverId) {
        query = query.eq('id', serverId);
    } else {
        // Get first active server if no ID specified
        query = query.limit(1);
    }

    const { data: server, error } = await query.single();

    if (error || !server) {
        throw new Error('No active VPS server configured. Add a server in VPS Management.');
    }

    return new VPSManager({
        host: server.host,
        port: server.port || 22,
        username: server.username,
        password: server.password || '',
    });
}

/**
 * Get all available VPS servers
 */
export async function getVPSServers() {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();

    const { data: servers, error } = await supabase
        .from('vps_servers')
        .select('id, name, host, status')
        .order('created_at', { ascending: false });

    if (error) throw error;

    return servers || [];
}
