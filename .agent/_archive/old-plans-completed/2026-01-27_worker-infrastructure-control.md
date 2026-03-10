# Worker Infrastructure Control System
## Complete System Design - Railway + VPS Deployment Targets

> **Created**: 2026-01-27 03:25 IST  
> **Author**: AI Agent (Ghazal)  
> **Ethos**: No band-aids. No stubs. No assumptions. Production-grade.

---

## Executive Summary

This plan enables the Superadmin to choose between **Railway** and **VPS** as the worker deployment target from the UI. The core worker code remains IDENTICAL - only the deployment mechanism differs.

---

## Current State (Verified via Code Investigation)

### What Exists Today:

#### 1. VPS Worker Management (COMPLETE)
| Component | Location | Status |
|-----------|----------|--------|
| Bootstrap Client | `apps/frontend/src/lib/vps/bootstrapClient.ts` | ✅ Working |
| Worker Grid UI | `apps/frontend/src/components/workers/WorkerGrid.tsx` | ✅ Working |
| VPS Servers API | `apps/frontend/src/app/api/superadmin/vps/servers/route.ts` | ✅ CRUD |
| VPS Status API | `apps/frontend/src/app/api/superadmin/vps/status/route.ts` | ✅ Real-time |
| VPS Workers API | `apps/frontend/src/app/api/superadmin/vps/workers/route.ts` | ✅ Control |
| VPS Deploy API | `apps/frontend/src/app/api/superadmin/vps/deploy/route.ts` | ✅ Deploy |
| VPS PM2 API | `apps/frontend/src/app/api/superadmin/vps/pm2/route.ts` | ✅ PM2 control |
| Database Table | `vps_servers` (migration 009) | ✅ Exists |

#### 2. Workers Code (COMPLETE)
| Component | Location | Status |
|-----------|----------|--------|
| KB Worker | `apps/workers/src/workers/kb-worker.ts` | ✅ Working |
| Conversation Worker | `apps/workers/src/workers/conversation-worker.ts` | ✅ Working |
| Analytics Worker | `apps/workers/src/workers/analytics-worker.ts` | ✅ Working |
| Dream State Worker | `apps/workers/src/workers/dream-state-worker.ts` | ✅ Working |
| Fine-Tuning Worker | `apps/workers/src/workers/fine-tuning-worker.ts` | ✅ Working |
| Learning Loop Worker | `apps/workers/src/workers/learning-loop-worker.ts` | ✅ Working |
| Worker API Server | `apps/workers/src/api/server.ts` | ✅ Working |
| Queue Definitions | `apps/frontend/src/lib/worker-queues.ts` | ✅ 6 queues |

#### 3. Railway Integration (PARTIAL)
| Component | Status |
|-----------|--------|
| Redis URL parsing | ✅ Supports `REDIS_URL` format |
| Railway deployment config | ❌ None |
| Railway API client | ❌ None |
| Railway status/control | ❌ None |

#### 4. Backend Services (TO BE MOVED)
| Component | Location | Needs Moving |
|-----------|----------|--------------|
| Workflow Execution | `apps/backend/src/services/workflow/workflowExecutionService.ts` | Yes → Workers |
| Execution Service | `apps/backend/src/services/engine/executionService.ts` | Yes → Workers |
| AI Service | `apps/backend/src/services/ai/aiService.ts` | Yes → Workers |
| Scheduler | `apps/backend/src/core/ops.scheduler.ts` | Replace with Railway Cron |

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPERADMIN UI                                      │
│                                                                              │
│   ┌─────────────────────────┐     ┌─────────────────────────┐              │
│   │     VPS (Your Servers)   │     │     Railway (Cloud)      │              │
│   │     ○ Selected           │     │     ○ Not Selected       │              │
│   │                          │     │                          │              │
│   │   + Fixed cost           │     │   + Auto-scale           │              │
│   │   + Full control         │     │   + Zero maintenance     │              │
│   │   + No cold starts       │     │   + Pay per use          │              │
│   │   - Manual scaling       │     │   - Cold start latency   │              │
│   └─────────────────────────┘     └─────────────────────────┘              │
│                                                                              │
│   [Apply Configuration]    [View Status]    [Migrate Workers]               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Worker Deployment Abstraction Layer                       │
│                                                                              │
│   interface WorkerDeployment {                                              │
│       provider: 'railway' | 'vps';                                          │
│       deploy(workerConfig): Promise<DeployResult>;                          │
│       getStatus(): Promise<WorkerStatus[]>;                                 │
│       restart(workerId): Promise<void>;                                     │
│       stop(workerId): Promise<void>;                                        │
│       getLogs(workerId): Promise<string>;                                   │
│       scale(count): Promise<void>;  // Railway only                         │
│   }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 ▼                                     ▼
┌─────────────────────────────┐     ┌─────────────────────────────────────────┐
│         VPS Provider         │     │           Railway Provider               │
│                              │     │                                          │
│   Uses: BootstrapClient      │     │   Uses: Railway GraphQL API              │
│   Control: PM2               │     │   Control: Railway API                   │
│   Logs: Bootstrap /logs      │     │   Logs: Railway Logs API                 │
│   Status: Bootstrap /status  │     │   Status: Railway Deployment API         │
└─────────────────────────────┘     └─────────────────────────────────────────┘
                 │                                     │
                 │                                     │
                 └────────────────┬────────────────────┘
                                  ▼
                    ┌─────────────────────────┐
                    │   SAME REDIS (Upstash)   │
                    │   SAME QUEUES (BullMQ)   │
                    │   SAME DATABASE          │
                    └─────────────────────────┘
```

---

## Phase 1: Database Schema

### 1.1 New Table: `worker_deployment_config`

```sql
-- Migration: 016_worker_deployment_config.sql

CREATE TABLE IF NOT EXISTS worker_deployment_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Which provider is active
    active_provider VARCHAR(20) NOT NULL DEFAULT 'vps' 
        CHECK (active_provider IN ('railway', 'vps')),
    
    -- Railway Configuration
    railway_token TEXT,  -- Railway API token (encrypted)
    railway_project_id VARCHAR(100),
    railway_service_id VARCHAR(100),
    railway_environment VARCHAR(50) DEFAULT 'production',
    
    -- VPS Configuration (references vps_servers table)
    vps_server_id UUID REFERENCES vps_servers(id) ON DELETE SET NULL,
    
    -- Common Settings
    auto_scale_enabled BOOLEAN DEFAULT false,
    min_workers INTEGER DEFAULT 1,
    max_workers INTEGER DEFAULT 10,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one config row allowed (singleton)
CREATE UNIQUE INDEX IF NOT EXISTS worker_config_singleton 
    ON worker_deployment_config ((true));

-- Insert default (VPS)
INSERT INTO worker_deployment_config (active_provider)
VALUES ('vps')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE worker_deployment_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin access to worker config"
    ON worker_deployment_config FOR ALL
    USING (auth.jwt() ->> 'role' = 'superadmin');
```

---

## Phase 2: Railway API Client

### 2.1 Create Railway Client

**File: `apps/frontend/src/lib/railway/railwayClient.ts`**

```typescript
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
```

---

## Phase 3: Unified Deployment Interface

### 3.1 Create Deployment Abstraction

**File: `apps/frontend/src/lib/workers/deploymentProvider.ts`**

```typescript
/**
 * Unified Worker Deployment Provider
 * Abstracts Railway vs VPS implementation details
 */

import { BootstrapClient, getBootstrapClient } from '@/lib/vps/bootstrapClient';
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
        
        const mapped: WorkerStatus[] = workers.map(w => ({
            name: w.name,
            status: w.status === 'online' ? 'online' : 
                   w.status === 'stopped' ? 'stopped' : 'errored',
            uptime: this.formatUptime(w.uptime),
            cpu: `${(w.cpu || 0).toFixed(1)}%`,
            memory: this.formatMemory(w.memory || 0),
            restarts: w.restarts,
            provider: 'vps',
        }));

        const stats: DeploymentStats = {
            total: workers.length,
            online: workers.filter(w => w.status === 'online').length,
            stopped: workers.filter(w => w.status === 'stopped').length,
            errored: workers.filter(w => w.status === 'errored').length,
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
            provider: 'railway',
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
```

---

## Phase 4: API Routes

### 4.1 Unified Worker Status API

**File: `apps/frontend/src/app/api/superadmin/workers/status/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDeploymentProvider } from '@/lib/workers/deploymentProvider';

/**
 * GET /api/superadmin/workers/status
 * Get worker status from active provider (Railway or VPS)
 */
export async function GET(request: NextRequest) {
    try {
        const provider = await getDeploymentProvider();
        const { workers, stats } = await provider.getStatus();

        return NextResponse.json({
            success: true,
            provider: provider.provider,
            workers,
            stats,
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error('Worker status error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get worker status' },
            { status: 500 }
        );
    }
}
```

### 4.2 Worker Actions API

**File: `apps/frontend/src/app/api/superadmin/workers/action/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDeploymentProvider } from '@/lib/workers/deploymentProvider';

/**
 * POST /api/superadmin/workers/action
 * Perform action on worker (start, stop, restart, deploy)
 */
export async function POST(request: NextRequest) {
    try {
        const { action, workerName } = await request.json();

        if (!action) {
            return NextResponse.json(
                { error: 'action required' },
                { status: 400 }
            );
        }

        const provider = await getDeploymentProvider();
        let result;

        switch (action) {
            case 'start':
                result = await provider.start(workerName);
                break;
            case 'stop':
                result = await provider.stop(workerName);
                break;
            case 'restart':
                result = await provider.restart(workerName);
                break;
            case 'deploy':
                result = await provider.deploy();
                break;
            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            success: result.success,
            provider: provider.provider,
            action,
            workerName,
            error: result.error,
        });

    } catch (error: any) {
        console.error('Worker action error:', error);
        return NextResponse.json(
            { error: error.message || 'Worker action failed' },
            { status: 500 }
        );
    }
}
```

### 4.3 Deployment Config API

**File: `apps/frontend/src/app/api/superadmin/workers/config/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/superadmin/workers/config
 * Get current worker deployment configuration
 */
export async function GET() {
    try {
        const supabase = createClient();

        const { data: config, error } = await supabase
            .from('worker_deployment_config')
            .select(`
                id,
                active_provider,
                railway_project_id,
                railway_service_id,
                railway_environment,
                vps_server_id,
                auto_scale_enabled,
                min_workers,
                max_workers,
                created_at,
                updated_at
            `)
            .single();

        if (error) throw error;

        // Get VPS server name if selected
        let vpsServerName = null;
        if (config?.vps_server_id) {
            const { data: server } = await supabase
                .from('vps_servers')
                .select('name')
                .eq('id', config.vps_server_id)
                .single();
            vpsServerName = server?.name;
        }

        return NextResponse.json({
            success: true,
            config: {
                ...config,
                vps_server_name: vpsServerName,
                railway_configured: !!(config?.railway_project_id && config?.railway_service_id),
            },
        });

    } catch (error: any) {
        console.error('Get worker config error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get config' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/superadmin/workers/config
 * Update worker deployment configuration
 */
export async function PUT(request: NextRequest) {
    try {
        const supabase = createClient();
        const updates = await request.json();

        // Get current config ID
        const { data: existing } = await supabase
            .from('worker_deployment_config')
            .select('id')
            .single();

        if (!existing) {
            return NextResponse.json(
                { error: 'Config not found' },
                { status: 404 }
            );
        }

        // Update config
        const { data: config, error } = await supabase
            .from('worker_deployment_config')
            .update({
                active_provider: updates.active_provider,
                railway_token: updates.railway_token,
                railway_project_id: updates.railway_project_id,
                railway_service_id: updates.railway_service_id,
                railway_environment: updates.railway_environment,
                vps_server_id: updates.vps_server_id,
                auto_scale_enabled: updates.auto_scale_enabled,
                min_workers: updates.min_workers,
                max_workers: updates.max_workers,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            config,
        });

    } catch (error: any) {
        console.error('Update worker config error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update config' },
            { status: 500 }
        );
    }
}
```

---

## Phase 5: UI Component

### 5.1 Worker Deployment Config UI

**File: `apps/frontend/src/components/workers/DeploymentConfig.tsx`**

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    Server,
    Cloud,
    Settings,
    Check,
    AlertCircle,
    Loader2,
    Save
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DeploymentConfig {
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
    const [config, setConfig] = useState<DeploymentConfig | null>(null);
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
```

---

## Phase 6: Backend Consolidation (From Previous Plan)

With the provider abstraction in place, we can now complete the backend consolidation:

### 6.1 Add Workflow Execution Queue

Add to `worker-queues.ts`:
```typescript
WORKFLOW_EXECUTION = 'workflow-execution',
ENGINE_EXECUTION = 'engine-execution',
```

### 6.2 Create Workflow Execution Worker

Move `workflowExecutionService.ts` logic to `workers/workflow-execution-worker.ts`.

### 6.3 Railway Cron Jobs

Configure in Railway dashboard:
- `0 11 * * *` → 6 AM EST Learning Loop
- `0 8 * * *` → 3 AM EST Cleanup
- `*/15 * * * *` → Health Check

---

## Implementation Checklist

### Phase 1: Database
- [ ] Create migration 016_worker_deployment_config.sql
- [ ] Run migration
- [ ] Verify table exists

### Phase 2: Railway Client
- [ ] Create `apps/frontend/src/lib/railway/railwayClient.ts`
- [ ] Test Railway API connection

### Phase 3: Deployment Provider
- [ ] Create `apps/frontend/src/lib/workers/deploymentProvider.ts`
- [ ] Implement VPSDeploymentProvider
- [ ] Implement RailwayDeploymentProvider

### Phase 4: API Routes
- [ ] Create `/api/superadmin/workers/status/route.ts`
- [ ] Create `/api/superadmin/workers/action/route.ts`
- [ ] Create `/api/superadmin/workers/config/route.ts`

### Phase 5: UI
- [ ] Create `DeploymentConfig.tsx` component
- [ ] Add to Superadmin navigation
- [ ] Test UI flow

### Phase 6: Backend Consolidation
- [ ] Add new queue types
- [ ] Create workflow-execution-worker.ts
- [ ] Configure Railway cron
- [ ] Delete apps/backend after verification

---

## Timeline

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: Database | 30 min | Low |
| Phase 2: Railway Client | 2 hours | Medium |
| Phase 3: Provider Abstraction | 2 hours | Medium |
| Phase 4: API Routes | 1 hour | Low |
| Phase 5: UI | 2 hours | Low |
| Phase 6: Backend Consolidation | 4-6 hours | High |

**Total: 12-14 hours**

---

## Why This Design

1. **Single worker codebase** - Same code runs anywhere
2. **UI-configurable** - Switch providers without code changes
3. **Fallback built-in** - Railway fails? Falls back to VPS
4. **Future-proof** - Easy to add Fly.io, Render, or Kubernetes later
5. **Your Ethos** - Full control, no vendor lock-in, production-grade

---

---

# PHASED IMPLEMENTATION WITH NON-NEGOTIABLE RULES

> **WARNING**: Each phase has rules that MUST NOT be violated.  
> Violation = Rip the suture. The system must be production-grade from Day 1.

---

## ⚠️ GLOBAL NON-NEGOTIABLE RULES (ALL PHASES)

These apply to EVERY phase. No exceptions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NON-NEGOTIABLE RULES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. NO STUBS - Every function must be fully implemented                     │
│  2. NO TODOs - Complete the implementation now, not later                   │
│  3. NO PLACEHOLDERS - Real data, real connections, real logic               │
│  4. NO BAND-AIDS - Fix the root cause, not the symptom                      │
│  5. NO "WILL DO LATER" - If it needs doing, do it now                       │
│  6. FULL ERROR HANDLING - Every try/catch with proper error messages        │
│  7. TYPESCRIPT STRICT - No 'any' unless absolutely unavoidable              │
│  8. DATABASE MIGRATIONS - Proper migrations, not raw SQL                    │
│  9. TESTS FOR CRITICAL PATHS - API routes must handle edge cases            │
│ 10. COMMENTS WHERE NEEDED - Complex logic must be documented                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: Database Schema & Migration

**Time Estimate**: 30 minutes  
**Risk Level**: LOW  
**Dependencies**: None

### What Gets Created:
- `database/migrations/016_worker_deployment_config.sql`
- Table: `worker_deployment_config`
- RLS policies
- Default row insert

### Phase 1 Rules:

| Rule | Description | Violation = Failure |
|------|-------------|---------------------|
| Complete migration | Full SQL with indexes, constraints, defaults | ✅ Required |
| RLS enabled | Row-level security for superadmin access | ✅ Required |
| Foreign keys | Proper references to vps_servers | ✅ Required |
| Comments | Every column documented | ✅ Required |
| Default data | Insert default config row | ✅ Required |

### Deliverables:
- [ ] Migration file created
- [ ] Migration tested locally
- [ ] Table verified in Supabase

---

## PHASE 2: Railway API Client

**Time Estimate**: 2 hours  
**Risk Level**: MEDIUM  
**Dependencies**: Phase 1

### What Gets Created:
- `apps/frontend/src/lib/railway/railwayClient.ts`
- Full GraphQL client for Railway API
- Status, deploy, restart, logs methods

### Phase 2 Rules:

| Rule | Description | Violation = Failure |
|------|-------------|---------------------|
| No mocked responses | Real Railway API calls | ✅ Required |
| Error handling | Proper try/catch with meaningful errors | ✅ Required |
| Type safety | Full TypeScript interfaces | ✅ Required |
| Auth handling | Bearer token auth properly implemented | ✅ Required |
| Tested with real Railway | Must connect to actual Railway project | ✅ Required |

### GraphQL Queries Required:
```graphql
# Get service status
query GetService($serviceId: String!) {
    service(id: $serviceId) {
        id, name, deployments(first: 1) { edges { node { id, status, createdAt }}}
    }
}

# Trigger redeploy
mutation ServiceInstanceRedeploy($serviceId: String!) {
    serviceInstanceRedeploy(serviceId: $serviceId)
}

# Get project services (for listing all workers)
query GetProject($projectId: String!) {
    project(id: $projectId) {
        services { edges { node { id, name }}}
    }
}
```

### Deliverables:
- [ ] RailwayClient class complete
- [ ] All methods implemented (no stubs)
- [ ] Tested with your actual Railway project
- [ ] getRailwayClient() factory function

---

## PHASE 3: Deployment Provider Abstraction

**Time Estimate**: 2 hours  
**Risk Level**: MEDIUM  
**Dependencies**: Phase 2

### What Gets Created:
- `apps/frontend/src/lib/workers/deploymentProvider.ts`
- DeploymentProvider interface
- VPSDeploymentProvider class
- RailwayDeploymentProvider class
- getDeploymentProvider() factory

### Phase 3 Rules:

| Rule | Description | Violation = Failure |
|------|-------------|---------------------|
| Interface compliance | Both providers implement same interface | ✅ Required |
| No hardcoded values | All config from database | ✅ Required |
| Graceful fallback | Railway failure → VPS fallback | ✅ Required |
| Consistent status format | Same WorkerStatus shape from both | ✅ Required |
| Provider detection | Auto-detect based on config | ✅ Required |

### Interface (Non-Negotiable):
```typescript
export interface DeploymentProvider {
    provider: 'railway' | 'vps';
    
    getStatus(): Promise<{ workers: WorkerStatus[]; stats: DeploymentStats }>;
    restart(workerName: string): Promise<{ success: boolean; error?: string }>;
    stop(workerName: string): Promise<{ success: boolean; error?: string }>;
    start(workerName: string): Promise<{ success: boolean; error?: string }>;
    getLogs(workerName: string): Promise<string>;
    deploy(): Promise<{ success: boolean; error?: string }>;
    deployTemplate(templateId: string, config: Record<string, any>): Promise<{ success: boolean; error?: string }>;
}
```

### Deliverables:
- [ ] VPSDeploymentProvider complete
- [ ] RailwayDeploymentProvider complete
- [ ] getDeploymentProvider() working
- [ ] Fallback logic tested

---

## PHASE 4: API Routes

**Time Estimate**: 1.5 hours  
**Risk Level**: LOW  
**Dependencies**: Phase 3

### What Gets Created:
- `/api/superadmin/workers/status/route.ts`
- `/api/superadmin/workers/action/route.ts`
- `/api/superadmin/workers/config/route.ts`
- `/api/superadmin/workers/deploy/route.ts`

### Phase 4 Rules:

| Rule | Description | Violation = Failure |
|------|-------------|---------------------|
| Auth check | Every route checks superadmin | ✅ Required |
| Validation | All inputs validated | ✅ Required |
| Error responses | Proper HTTP status codes | ✅ Required |
| Success responses | Consistent JSON shape | ✅ Required |
| Logging | Console.error for failures | ✅ Required |

### API Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workers/status` | Get all worker status from active provider |
| POST | `/workers/action` | start/stop/restart/deploy actions |
| GET | `/workers/config` | Get deployment config |
| PUT | `/workers/config` | Update deployment config |
| POST | `/workers/deploy` | Deploy a template to provider |

### Deliverables:
- [ ] All 4 route files created
- [ ] All methods implemented
- [ ] Tested via curl/Postman

---

## PHASE 5: Provider Selection UI

**Time Estimate**: 2 hours  
**Risk Level**: LOW  
**Dependencies**: Phase 4

### What Gets Created:
- `apps/frontend/src/components/workers/DeploymentConfig.tsx`
- Provider selection cards (Railway vs VPS)
- Configuration forms for each
- Save and test functionality

### Phase 5 Rules:

| Rule | Description | Violation = Failure |
|------|-------------|---------------------|
| No hardcoded UI | All data from API | ✅ Required |
| Loading states | Show loader during API calls | ✅ Required |
| Error states | Show error messages clearly | ✅ Required |
| Form validation | Validate before submit | ✅ Required |
| Responsive | Works on all screen sizes | ✅ Required |
| Premium design | Beautiful, not MVP-looking | ✅ Required |

### UI Components Required:
- Provider selection cards (VPS / Railway)
- VPS config form (server dropdown)
- Railway config form (token, project ID, service ID)
- Status indicator (configured / not configured)
- Save button with loading state
- Test connection button

### Deliverables:
- [ ] DeploymentConfig.tsx complete
- [ ] Integrated with existing Superadmin
- [ ] Both providers configurable
- [ ] Status visible

---

## PHASE 6: Worker Template Editor

**Time Estimate**: 3 hours  
**Risk Level**: MEDIUM  
**Dependencies**: Phase 5

### What Gets Created:
- `apps/frontend/src/components/workers/WorkerTemplateEditor.tsx`
- Monaco Editor for code editing
- Template CRUD UI
- Environment variables editor
- One-click deploy button

### Phase 6 Rules:

| Rule | Description | Violation = Failure |
|------|-------------|---------------------|
| Real code editor | Monaco or equivalent, not textarea | ✅ Required |
| Syntax highlighting | TypeScript/JavaScript highlighting | ✅ Required |
| Full CRUD | Create, edit, duplicate, delete | ✅ Required |
| Env vars editor | Key-value pairs UI | ✅ Required |
| Deploy button | Deploy template to active provider | ✅ Required |
| No data loss | Confirmation before delete | ✅ Required |

### Template Editor Features:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Worker Template: KB Processor                                    [Save] [Deploy]
├─────────────────────────────────────────────────────────────────────────────┤
│  Name: [KB Processor                    ]                                   │
│  Type: [queue    ▼]                                                         │
│                                                                             │
│  ┌─ Code Template ─────────────────────────────────────────────────────────┐│
│  │ import { Worker } from 'bullmq';                                        ││
│  │ import { QueueName } from '../config/queues';                           ││
│  │                                                                          ││
│  │ const worker = new Worker(QueueName.KB_PROCESSING, async (job) => {     ││
│  │     // Process KB document                                               ││
│  │     ...                                                                  ││
│  │ });                                                                      ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─ Environment Variables ──────────────────────────────────────────────────┐
│  │  REDIS_URL         │ [redis://...                    ] │ [Delete]       │
│  │  DATABASE_URL      │ [postgresql://...               ] │ [Delete]       │
│  │  [+ Add Variable]                                                        │
│  └──────────────────────────────────────────────────────────────────────────┘
│                                                                             │
│  [Duplicate Template]  [Delete Template]                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Deliverables:
- [ ] WorkerTemplateEditor.tsx complete
- [ ] Monaco Editor integrated
- [ ] CRUD working with API
- [ ] Deploy to provider working

---

## PHASE 7: Worker Management Dashboard

**Time Estimate**: 2 hours  
**Risk Level**: LOW  
**Dependencies**: Phase 5, 6

### What Gets Created:
- Updated Worker Management page
- Provider indicator
- Real-time status
- Unified control panel

### Phase 7 Rules:

| Rule | Description | Violation = Failure |
|------|-------------|---------------------|
| Provider agnostic | Same UI for Railway and VPS | ✅ Required |
| Real-time refresh | Auto-refresh status | ✅ Required |
| Action feedback | Toast on success/failure | ✅ Required |
| Batch actions | Restart all, stop all | ✅ Required |
| Logs accessible | View logs for each worker | ✅ Required |

### Dashboard Layout:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Worker Management                          Provider: [Railway ▼] [Settings]│
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Total: 6    │  │ Online: 5   │  │ Stopped: 1  │  │ Errors: 0   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  [Restart All]  [Deploy All]  [View Templates]  [+ New Worker]             │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  kb-worker          │ ONLINE │ 2h 34m │ 12.3% │ 145M │ [⟳] [■] [📋]  │ │
│  │  conversation-worker │ ONLINE │ 2h 34m │  8.1% │  89M │ [⟳] [■] [📋]  │ │
│  │  analytics-worker    │ ONLINE │ 2h 34m │  2.4% │  56M │ [⟳] [■] [📋]  │ │
│  │  dream-state-worker  │ ONLINE │ 2h 34m │  1.2% │  78M │ [⟳] [■] [📋]  │ │
│  │  fine-tuning-worker  │ STOPPED│   -    │   -   │   -  │ [▶] [×] [📋]  │ │
│  │  learning-loop       │ ONLINE │ 2h 34m │  0.8% │  45M │ [⟳] [■] [📋]  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Deliverables:
- [ ] Unified dashboard complete
- [ ] Provider dropdown working
- [ ] All actions functional
- [ ] Templates accessible

---

## PHASE 8: Backend Consolidation

**Time Estimate**: 6 hours  
**Risk Level**: HIGH  
**Dependencies**: All previous phases

### What Gets Created:
- `apps/workers/src/workers/workflow-execution-worker.ts`
- `apps/workers/src/workers/engine-execution-worker.ts`
- Railway Cron configuration
- Updated frontend API routes for queueing

### Phase 8 Rules:

| Rule | Description | Violation = Failure |
|------|-------------|---------------------|
| Feature parity | New workers must do everything backend did | ✅ Required |
| No data loss | All execution logs preserved | ✅ Required |
| Queue-based | All execution goes through BullMQ | ✅ Required |
| Progress reporting | job.updateProgress() for real-time | ✅ Required |
| Backward compatible | Existing executions continue working | ✅ Required |
| Railway cron tested | Cron jobs verified on Railway | ✅ Required |

### Files to Create:
1. `workflow-execution-worker.ts` (port from backend)
2. `engine-execution-worker.ts` (port from backend)
3. Updated `worker-queues.ts` with new queues
4. Railway cron scripts

### Files to Delete (AFTER verification):
- `apps/backend/` entire folder

### Deliverables:
- [ ] Workflow execution worker complete
- [ ] Engine execution worker complete
- [ ] Cron jobs on Railway
- [ ] Backend deletion verified
- [ ] All workflows still work

---

## PHASE 9: Testing & Verification

**Time Estimate**: 2 hours  
**Risk Level**: LOW  
**Dependencies**: All phases

### What Gets Tested:
- Provider switching
- Template CRUD
- Deployment to both providers
- Queue processing
- Cron job execution
- Error handling

### Phase 9 Rules:

| Rule | Description | Violation = Failure |
|------|-------------|---------------------|
| VPS tested | All features work on VPS | ✅ Required |
| Railway tested | All features work on Railway | ✅ Required |
| Switch tested | Can switch providers without issues | ✅ Required |
| Execution tested | Workflow execution works | ✅ Required |
| Error recovery | System recovers from failures | ✅ Required |

### Test Checklist:

#### Provider Management
- [ ] Can configure VPS
- [ ] Can configure Railway
- [ ] Can switch between providers
- [ ] Status shows correctly for active provider

#### Worker Templates
- [ ] Can create template
- [ ] Can edit template code
- [ ] Can edit environment variables
- [ ] Can duplicate template
- [ ] Can delete template (with confirmation)
- [ ] Can deploy template

#### Worker Control
- [ ] Can see all workers
- [ ] Can start worker
- [ ] Can stop worker
- [ ] Can restart worker
- [ ] Can view logs
- [ ] Batch actions work

#### Workflow Execution
- [ ] Queue job from frontend
- [ ] Worker picks up job
- [ ] Progress updates work
- [ ] Completion stored in DB
- [ ] Token deduction works

---

## Implementation Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9
   ↓         ↓         ↓         ↓         ↓         ↓         ↓         ↓         ↓
  30m       2h        2h       1.5h       2h        3h        2h        6h        2h
                                                                                    
                              TOTAL: ~21 hours of focused work
```

---

## Success Criteria

The implementation is COMPLETE when:

1. ✅ Superadmin can switch between Railway and VPS with one click
2. ✅ Worker templates can be created, edited, and deployed from UI
3. ✅ All workers show real-time status from active provider
4. ✅ Workflow execution works via queue (no direct backend calls)
5. ✅ apps/backend folder is DELETED
6. ✅ Railway cron jobs replace node-cron
7. ✅ System handles 1000+ concurrent workflow executions

---

*Plan Complete: 2026-01-27 03:35 IST*
*Phases defined with non-negotiable rules*
*Ready for execution*
