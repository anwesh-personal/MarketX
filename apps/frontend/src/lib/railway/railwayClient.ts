/**
 * Railway API Client
 * Uses Railway's GraphQL API for deployment management
 */

interface RailwayDeployment {
    id: string;
    status: 'BUILDING' | 'DEPLOYING' | 'SUCCESS' | 'FAILED' | 'CRASHED' | 'REMOVED';
    createdAt: string;
}

interface RailwayService {
    id: string;
    name: string;
    deployments: RailwayDeployment[];
}

interface RailwayWorkerStatus {
    name: string;
    status: 'online' | 'building' | 'deploying' | 'crashed' | 'stopped';
    deploymentId: string;
    createdAt: string;
    logs?: string;
}

export class RailwayClient {
    private apiToken: string;
    private projectId: string;
    private serviceId: string;
    private baseUrl = 'https://backboard.railway.app/graphql/v2';

    constructor(token: string, projectId: string, serviceId: string) {
        this.apiToken = token;
        this.projectId = projectId;
        this.serviceId = serviceId;
    }

    /**
     * Execute GraphQL query
     */
    private async query(query: string, variables?: Record<string, any>): Promise<any> {
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiToken}`,
            },
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
            throw new Error(`Railway API error: ${response.status}`);
        }

        const data = await response.json();
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }

        return data.data;
    }

    /**
     * Get current deployment status
     */
    async getStatus(): Promise<RailwayWorkerStatus[]> {
        const result = await this.query(`
            query GetService($serviceId: String!) {
                service(id: $serviceId) {
                    id
                    name
                    deployments(first: 1) {
                        edges {
                            node {
                                id
                                status
                                createdAt
                            }
                        }
                    }
                }
            }
        `, { serviceId: this.serviceId });

        const service = result.service;
        const deployment = service.deployments.edges[0]?.node;

        if (!deployment) {
            return [];
        }

        const statusMap: Record<string, 'online' | 'building' | 'deploying' | 'crashed' | 'stopped'> = {
            'SUCCESS': 'online',
            'BUILDING': 'building',
            'DEPLOYING': 'deploying',
            'FAILED': 'crashed',
            'CRASHED': 'crashed',
            'REMOVED': 'stopped',
        };

        return [{
            name: service.name,
            status: statusMap[deployment.status] || 'stopped',
            deploymentId: deployment.id,
            createdAt: deployment.createdAt,
        }];
    }

    /**
     * Trigger new deployment (redeploy)
     */
    async redeploy(): Promise<{ success: boolean; deploymentId?: string; error?: string }> {
        try {
            const result = await this.query(`
                mutation ServiceInstanceRedeploy($serviceId: String!, $environmentId: String) {
                    serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
                }
            `, { serviceId: this.serviceId });

            return {
                success: true,
                deploymentId: result.serviceInstanceRedeploy,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get deployment logs
     */
    async getLogs(deploymentId?: string): Promise<string> {
        // Railway logs require WebSocket connection for real-time
        // For now, return a message to check Railway dashboard
        return 'View full logs at Railway Dashboard: https://railway.app/dashboard';
    }

    /**
     * Restart service
     */
    async restart(): Promise<{ success: boolean; error?: string }> {
        return this.redeploy();
    }

    /**
     * Check if Railway is configured
     */
    isConfigured(): boolean {
        return !!(this.apiToken && this.projectId && this.serviceId);
    }
}

/**
 * Get Railway client from database config
 */
export async function getRailwayClient(): Promise<RailwayClient | null> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();

    const { data: config, error } = await supabase
        .from('worker_deployment_config')
        .select('railway_token, railway_project_id, railway_service_id')
        .single();

    if (error || !config?.railway_token) {
        return null;
    }

    return new RailwayClient(
        config.railway_token,
        config.railway_project_id,
        config.railway_service_id
    );
}
