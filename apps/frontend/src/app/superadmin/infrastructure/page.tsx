'use client'

/**
 * Infrastructure Settings — Superadmin
 *
 * Full control over:
 *   1. Deployment target (Local / VPS / Railway / Dedicated)
 *   2. Redis / BullMQ connection
 *   3. Worker API URL + health
 *   4. AI API keys (per provider, test, enable/disable)
 *   5. Queue concurrency per queue
 *   6. VPS / Dedicated server credentials
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
    Server, Database, Key, Zap, Activity, CheckCircle,
    XCircle, Loader2, RefreshCw, Save, AlertCircle, Eye,
    EyeOff, X, TestTube, Cloud, HardDrive, Cpu, Globe,
    Shield, Settings, RotateCcw, Clock, Copy, Check,
    Terminal, Wifi, WifiOff, ChevronDown, ChevronUp, Plus,
} from 'lucide-react'
import { useSuperadminAuth } from '@/lib/useSuperadminAuth'

// ── Types ─────────────────────────────────────────────────────

interface DeploymentConfig {
    id?: string
    active_target: 'local' | 'vps' | 'railway' | 'dedicated'
    redis_url_set: boolean
    redis_password_set: boolean
    redis_tls: boolean
    redis_db: number
    redis_status: string
    redis_last_ping: string | null
    redis_error: string | null
    worker_api_url: string | null
    worker_api_secret_set: boolean
    worker_status: string
    worker_last_ping: string | null
    railway_token_set: boolean
    railway_project_id: string | null
    railway_service_id: string | null
    railway_environment: string
    railway_domain: string | null
    vps_server_id: string | null
    dedicated_host: string | null
    dedicated_port: number
    dedicated_username: string | null
    dedicated_password_set: boolean
    dedicated_ssh_key_set: boolean
    auto_scale_enabled: boolean
    min_workers: number
    max_workers: number
    queue_concurrency: Record<string, number>
    last_deployment_at: string | null
    last_deployment_status: string | null
}

interface AIKeyRow {
    provider: string
    api_key_preview: string | null
    api_key_set: boolean
    base_url: string | null
    is_active: boolean
    last_tested: string | null
    test_status: string
    test_model: string | null
    test_error: string | null
    notes: string | null
    updated_at: string | null
}

const PROVIDER_INFO: Record<string, { label: string; color: string; testModel: string; placeholder: string }> = {
    openai:     { label: 'OpenAI',     color: 'text-green-400',  testModel: 'gpt-4o-mini',               placeholder: 'sk-...' },
    anthropic:  { label: 'Anthropic',  color: 'text-amber-400',  testModel: 'claude-3-5-haiku-20241022',  placeholder: 'sk-ant-...' },
    google:     { label: 'Google AI',  color: 'text-blue-400',   testModel: 'gemini-2.0-flash',           placeholder: 'AIza...' },
    xai:        { label: 'xAI / Grok', color: 'text-purple-400', testModel: 'grok-2-1212',                placeholder: 'xai-...' },
    mistral:    { label: 'Mistral',    color: 'text-orange-400', testModel: 'mistral-large-latest',       placeholder: 'key...' },
    perplexity: { label: 'Perplexity', color: 'text-cyan-400',   testModel: 'llama-3.1-sonar-large-128k-online', placeholder: 'pplx-...' },
}

const TARGET_OPTIONS = [
    { value: 'local',     label: 'Local Dev',     icon: Terminal, desc: 'localhost:3100 — for development only' },
    { value: 'vps',       label: 'VPS',           icon: Server,   desc: 'Your existing VPS server (SSH managed)' },
    { value: 'railway',   label: 'Railway',       icon: Cloud,    desc: 'Railway.app managed container' },
    { value: 'dedicated', label: 'Dedicated',     icon: HardDrive,desc: 'New dedicated server (coming in 12-24h)' },
]

const QUEUE_LABELS: Record<string, string> = {
    'engine-execution':   'Engine Execution',
    'kb-processor':       'KB Processor',
    'conversation':       'Conversation',
    'analytics':          'Analytics',
    'dream-state':        'Dream State',
    'fine-tuning':        'Fine-Tuning',
    'learning-loop':      'Learning Loop',
    'workflow-execution': 'Workflow Execution',
}

// ── Status badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
        ok:            { cls: 'bg-success/10 text-success border-success/20',   icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Connected' },
        error:         { cls: 'bg-error/10 text-error border-error/20',         icon: <XCircle className="w-3.5 h-3.5" />,     label: 'Error' },
        unconfigured:  { cls: 'bg-muted/20 text-textSecondary border-border',   icon: <Settings className="w-3.5 h-3.5" />,    label: 'Not Configured' },
        testing:       { cls: 'bg-info/10 text-info border-info/20',            icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: 'Testing...' },
        untested:      { cls: 'bg-muted/20 text-textSecondary border-border',   icon: <Clock className="w-3.5 h-3.5" />,        label: 'Not Tested' },
    }
    const s = map[status] || map.untested
    return (
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${s.cls}`}>
            {s.icon} {s.label}
        </span>
    )
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function InfrastructurePage() {
    const { fetchWithAuth } = useSuperadminAuth()
    const [loading, setLoading]             = useState(true)
    const [saving, setSaving]               = useState<string | null>(null)
    const [testing, setTesting]             = useState<string | null>(null)
    const [error, setError]                 = useState<string | null>(null)
    const [toast, setToast]                 = useState<string | null>(null)
    const [deployment, setDeployment]       = useState<DeploymentConfig | null>(null)
    const [aiKeys, setAiKeys]               = useState<AIKeyRow[]>([])
    const [vpsServers, setVpsServers]       = useState<any[]>([])
    const [activeTab, setActiveTab]         = useState<'target' | 'redis' | 'worker' | 'ai' | 'queues'>('target')
    const [showSecrets, setShowSecrets]     = useState<Record<string, boolean>>({})
    const [newKey, setNewKey]               = useState<Record<string, string>>({}) // provider → value being entered

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetchWithAuth('/api/superadmin/infrastructure')
            if (res.ok) {
                const data = await res.json()
                setDeployment(data.deployment)
                setAiKeys(data.ai_keys || [])
                setVpsServers(data.vps_servers || [])
            }
        } finally { setLoading(false) }
    }, [fetchWithAuth])

    useEffect(() => { load() }, [load])

    const saveField = async (section: string, fields: Record<string, any>) => {
        setSaving(section)
        try {
            const res = await fetchWithAuth('/api/superadmin/infrastructure', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section, ...fields }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            showToast('Saved successfully')
            load()
        } catch (e: any) { setError(e.message) }
        finally { setSaving(null) }
    }

    const runTest = async (testType: string, extra?: Record<string, any>) => {
        setTesting(testType)
        try {
            const res = await fetchWithAuth('/api/superadmin/infrastructure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ test: testType, ...extra }),
            })
            const data = await res.json()
            if (data.ok) showToast(`✓ ${testType} connection successful`)
            else setError(data.error || `${testType} test failed`)
            load()
        } catch (e: any) { setError(e.message) }
        finally { setTesting(null) }
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
    )

    const TABS = [
        { id: 'target', label: 'Deployment Target', icon: Server },
        { id: 'redis',  label: 'Redis / BullMQ',    icon: Database },
        { id: 'worker', label: 'Worker API',         icon: Cpu },
        { id: 'ai',     label: 'AI Keys',            icon: Key },
        { id: 'queues', label: 'Queue Settings',     icon: Zap },
    ] as const

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
                            <Settings className="w-6 h-6 text-accent" />
                        </div>
                        <h1 className="text-3xl font-bold font-display text-textPrimary">Infrastructure</h1>
                    </div>
                    <p className="text-textSecondary ml-1">
                        All infrastructure config stored in DB — no hardcoded env vars. Change anything here, live.
                    </p>
                </div>
                <button onClick={load} className="btn btn-ghost btn-icon"><RefreshCw className="w-4 h-4" /></button>
            </div>

            {/* Status bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatusCard label="Redis" status={deployment?.redis_status || 'unconfigured'} detail={deployment?.redis_last_ping ? `Last ping: ${new Date(deployment.redis_last_ping).toLocaleTimeString()}` : 'Never tested'} />
                <StatusCard label="Worker API" status={deployment?.worker_status || 'unconfigured'} detail={deployment?.worker_api_url || 'Not configured'} />
                <StatusCard label="Target" status="ok" detail={deployment?.active_target?.toUpperCase() || 'LOCAL'} custom />
                <StatusCard label="AI Keys" status={aiKeys.filter(k => k.test_status === 'ok').length > 0 ? 'ok' : 'unconfigured'} detail={`${aiKeys.filter(k => k.api_key_set && k.is_active).length} active`} />
            </div>

            {/* Tabs */}
            <div className="premium-card overflow-hidden">
                <div className="flex border-b border-border overflow-x-auto">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all flex-shrink-0 ${activeTab === t.id ? 'border-accent text-accent bg-accent/5' : 'border-transparent text-textSecondary hover:text-textPrimary'}`}>
                            <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {activeTab === 'target' && deployment && (
                        <TargetTab deployment={deployment} vpsServers={vpsServers} onSave={saveField} saving={saving} testing={testing} onTest={runTest} />
                    )}
                    {activeTab === 'redis' && deployment && (
                        <RedisTab deployment={deployment} onSave={saveField} saving={saving} testing={testing} onTest={runTest} show={showSecrets} toggleShow={k => setShowSecrets(p => ({ ...p, [k]: !p[k] }))} />
                    )}
                    {activeTab === 'worker' && deployment && (
                        <WorkerTab deployment={deployment} onSave={saveField} saving={saving} testing={testing} onTest={runTest} show={showSecrets} toggleShow={k => setShowSecrets(p => ({ ...p, [k]: !p[k] }))} />
                    )}
                    {activeTab === 'ai' && (
                        <AIKeysTab aiKeys={aiKeys} onSave={saveField} saving={saving} testing={testing} onTest={runTest} show={showSecrets} toggleShow={k => setShowSecrets(p => ({ ...p, [k]: !p[k] }))} newKey={newKey} setNewKey={setNewKey} />
                    )}
                    {activeTab === 'queues' && deployment && (
                        <QueuesTab deployment={deployment} onSave={saveField} saving={saving} />
                    )}
                </div>
            </div>

            {/* Errors */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-success/90 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 z-50">
                    <CheckCircle className="w-4 h-4" /> {toast}
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// STATUS CARD (mini)
// ═══════════════════════════════════════════════════════════════

function StatusCard({ label, status, detail, custom }: { label: string; status: string; detail: string; custom?: boolean }) {
    const isOk = status === 'ok'
    const isErr = status === 'error'
    return (
        <div className="premium-card !p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isOk ? 'bg-success/10' : isErr ? 'bg-error/10' : 'bg-muted/20'}`}>
                {isOk ? <Wifi className={`w-5 h-5 text-success`} /> : isErr ? <WifiOff className="w-5 h-5 text-error" /> : <Settings className="w-5 h-5 text-textTertiary" />}
            </div>
            <div className="min-w-0">
                <p className="text-xs text-textSecondary">{label}</p>
                <p className={`text-sm font-semibold truncate ${isOk ? 'text-success' : isErr ? 'text-error' : 'text-textPrimary'}`}>{custom ? detail : (isOk ? 'Connected' : isErr ? 'Error' : detail)}</p>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// TARGET TAB
// ═══════════════════════════════════════════════════════════════

function TargetTab({ deployment, vpsServers, onSave, saving, testing, onTest }: any) {
    const [target, setTarget] = useState(deployment.active_target || 'local')
    const [label, setLabel] = useState(deployment.active_target_label || '')
    const [vpsServerId, setVpsServerId] = useState(deployment.vps_server_id || '')
    const [dedicatedHost, setDedicatedHost] = useState(deployment.dedicated_host || '')
    const [dedicatedPort, setDedicatedPort] = useState(deployment.dedicated_port || 22)
    const [dedicatedUser, setDedicatedUser] = useState(deployment.dedicated_username || '')
    const [dedicatedPass, setDedicatedPass] = useState('')
    const [railwayToken, setRailwayToken] = useState('')
    const [railwayProjectId, setRailwayProjectId] = useState(deployment.railway_project_id || '')
    const [railwayServiceId, setRailwayServiceId] = useState(deployment.railway_service_id || '')
    const [railwayEnv, setRailwayEnv] = useState(deployment.railway_environment || 'production')
    const [railwayDomain, setRailwayDomain] = useState(deployment.railway_domain || '')

    const save = () => {
        const updates: Record<string, any> = { active_target: target, active_target_label: label || null }
        if (target === 'vps') updates.vps_server_id = vpsServerId || null
        if (target === 'dedicated') {
            updates.dedicated_host = dedicatedHost || null
            updates.dedicated_port = dedicatedPort
            updates.dedicated_username = dedicatedUser || null
            if (dedicatedPass) updates.dedicated_password = dedicatedPass
        }
        if (target === 'railway') {
            if (railwayToken) updates.railway_token = railwayToken
            updates.railway_project_id = railwayProjectId || null
            updates.railway_service_id = railwayServiceId || null
            updates.railway_environment = railwayEnv
            updates.railway_domain = railwayDomain || null
        }
        onSave('target', updates)
    }

    return (
        <div className="space-y-6">
            <div>
                <p className="label-sm mb-4">Where are workers running?</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {TARGET_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => setTarget(opt.value)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm transition-all ${target === opt.value ? 'border-accent bg-accent/10 text-accent' : 'border-border text-textSecondary hover:border-accent/40'}`}>
                            <opt.icon className="w-6 h-6" />
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-xs text-center opacity-70">{opt.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Label */}
            <Field label="Custom Label (optional)" value={label} onChange={setLabel} placeholder="e.g. Railway Production" />

            {/* VPS server picker */}
            {target === 'vps' && (
                <div className="space-y-3 p-4 rounded-xl border border-border bg-surfaceHover">
                    <p className="text-sm font-semibold text-textPrimary flex items-center gap-2"><Server className="w-4 h-4" /> VPS Server</p>
                    <select value={vpsServerId} onChange={e => setVpsServerId(e.target.value)} className="input w-full">
                        <option value="">— Select VPS Server —</option>
                        {vpsServers.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.host})</option>)}
                    </select>
                    {vpsServers.length === 0 && <p className="text-xs text-warning">No VPS servers configured. Go to Workers → VPS Management to add one.</p>}
                    <button onClick={() => onTest('vps')} className="btn btn-ghost btn-sm" disabled={testing === 'vps'}>
                        {testing === 'vps' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />} Test Connection
                    </button>
                </div>
            )}

            {/* Railway config */}
            {target === 'railway' && (
                <div className="space-y-4 p-4 rounded-xl border border-border bg-surfaceHover">
                    <p className="text-sm font-semibold text-textPrimary flex items-center gap-2"><Cloud className="w-4 h-4" /> Railway Config</p>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="API Token" value={railwayToken} onChange={setRailwayToken} placeholder={deployment.railway_token_set ? '••••••••' : 'railway_token_...'} type="password" />
                        <Field label="Project ID" value={railwayProjectId} onChange={setRailwayProjectId} placeholder="project-uuid" />
                        <Field label="Service ID" value={railwayServiceId} onChange={setRailwayServiceId} placeholder="service-uuid" />
                        <Field label="Environment" value={railwayEnv} onChange={setRailwayEnv} placeholder="production" />
                        <div className="col-span-2">
                            <Field label="Worker Domain (Railway auto-assigns)" value={railwayDomain} onChange={setRailwayDomain} placeholder="axiom-workers.up.railway.app" />
                        </div>
                    </div>
                </div>
            )}

            {/* Dedicated server */}
            {target === 'dedicated' && (
                <div className="space-y-4 p-4 rounded-xl border border-border bg-surfaceHover">
                    <p className="text-sm font-semibold text-textPrimary flex items-center gap-2"><HardDrive className="w-4 h-4" /> Dedicated Server</p>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Host / IP" value={dedicatedHost} onChange={setDedicatedHost} placeholder="203.x.x.x" />
                        <Field label="SSH Port" value={String(dedicatedPort)} onChange={v => setDedicatedPort(parseInt(v) || 22)} placeholder="22" />
                        <Field label="Username" value={dedicatedUser} onChange={setDedicatedUser} placeholder="root" />
                        <Field label="Password" value={dedicatedPass} onChange={setDedicatedPass} placeholder={deployment.dedicated_password_set ? '••••••••' : 'ssh password'} type="password" />
                    </div>
                    <button onClick={() => onTest('vps')} className="btn btn-ghost btn-sm" disabled={testing === 'vps'}>
                        {testing === 'vps' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />} Test SSH Connection
                    </button>
                </div>
            )}

            <div className="flex justify-end">
                <button onClick={save} className="btn btn-primary" disabled={saving === 'target'}>
                    {saving === 'target' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Target
                </button>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// REDIS TAB
// ═══════════════════════════════════════════════════════════════

function RedisTab({ deployment, onSave, saving, testing, onTest, show, toggleShow }: any) {
    const [redisUrl, setRedisUrl] = useState('')
    const [redisPass, setRedisPass] = useState('')
    const [redisTls, setRedisTls] = useState(deployment.redis_tls || false)
    const [redisDb, setRedisDb] = useState(deployment.redis_db || 0)

    const save = () => onSave('redis', {
        ...(redisUrl ? { redis_url: redisUrl } : {}),
        ...(redisPass ? { redis_password: redisPass } : {}),
        redis_tls: redisTls,
        redis_db: redisDb,
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-textPrimary">Redis / BullMQ Connection</h3>
                    <p className="text-sm text-textSecondary">Used by all workers and the writer queue. Railway provides a managed Redis add-on.</p>
                </div>
                <StatusBadge status={deployment.redis_status} />
            </div>

            {deployment.redis_error && (
                <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">{deployment.redis_error}</div>
            )}

            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="label-sm flex items-center gap-2 justify-between">
                        <span>Redis URL {deployment.redis_url_set && <span className="text-success text-xs ml-1">● set</span>}</span>
                        <button onClick={() => toggleShow('redis_url')} className="text-xs text-textTertiary hover:text-textSecondary">
                            {show.redis_url ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                    </label>
                    <input
                        type={show.redis_url ? 'text' : 'password'}
                        value={redisUrl}
                        onChange={e => setRedisUrl(e.target.value)}
                        placeholder={deployment.redis_url_set ? '(already set — enter new to update)' : 'redis://user:pass@host:6379'}
                        className="input w-full font-mono text-sm"
                    />
                    <p className="text-xs text-textTertiary">Railway: rediss://default:password@host:port (note: rediss:// for TLS)</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="label-sm">Password (if separate)</label>
                        <input type="password" value={redisPass} onChange={e => setRedisPass(e.target.value)} placeholder={deployment.redis_password_set ? '(set)' : 'optional'} className="input w-full" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="label-sm">Database Index</label>
                        <input type="number" min={0} max={15} value={redisDb} onChange={e => setRedisDb(parseInt(e.target.value))} className="input w-full" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="label-sm">TLS</label>
                        <button onClick={() => setRedisTls((p: boolean) => !p)} className={`flex items-center gap-2 w-full p-2.5 rounded-lg border transition-all ${redisTls ? 'border-accent/40 bg-accent/5 text-accent' : 'border-border text-textSecondary'}`}>
                            <Shield className="w-4 h-4" /> {redisTls ? 'TLS Enabled' : 'No TLS'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button onClick={() => onTest('redis')} className="btn btn-secondary" disabled={testing === 'redis'}>
                    {testing === 'redis' ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />} Test Connection
                </button>
                <button onClick={save} className="btn btn-primary" disabled={saving === 'redis'}>
                    {saving === 'redis' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </button>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// WORKER API TAB
// ═══════════════════════════════════════════════════════════════

function WorkerTab({ deployment, onSave, saving, testing, onTest, show, toggleShow }: any) {
    const [workerUrl, setWorkerUrl] = useState(deployment.worker_api_url || '')
    const [workerSecret, setWorkerSecret] = useState('')

    const save = () => onSave('worker', {
        worker_api_url: workerUrl || null,
        ...(workerSecret ? { worker_api_secret: workerSecret } : {}),
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-textPrimary">Worker Management API</h3>
                    <p className="text-sm text-textSecondary">The workers expose a management API on port 3100. This is how superadmin monitors queues and triggers actions.</p>
                </div>
                <StatusBadge status={deployment.worker_status} />
            </div>

            <div className="space-y-4">
                <Field label="Worker API URL" value={workerUrl} onChange={setWorkerUrl}
                    placeholder="https://axiom-workers.up.railway.app or http://103.x.x.x:3100" />
                <div className="space-y-1.5">
                    <label className="label-sm">API Secret (optional auth header)</label>
                    <input type="password" value={workerSecret} onChange={e => setWorkerSecret(e.target.value)}
                        placeholder={deployment.worker_api_secret_set ? '(set — enter to update)' : 'optional secret'} className="input w-full" />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button onClick={() => onTest('worker')} className="btn btn-secondary" disabled={testing === 'worker'}>
                    {testing === 'worker' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />} Test Health
                </button>
                <button onClick={save} className="btn btn-primary" disabled={saving === 'worker'}>
                    {saving === 'worker' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </button>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// AI KEYS TAB
// ═══════════════════════════════════════════════════════════════

function AIKeysTab({ aiKeys, onSave, saving, testing, onTest, show, toggleShow, newKey, setNewKey }: any) {
    const providers = Object.keys(PROVIDER_INFO)
    const keyMap = Object.fromEntries(aiKeys.map((k: AIKeyRow) => [k.provider, k]))

    const saveKey = (provider: string) => {
        if (!newKey[provider]?.trim()) return
        onSave('ai_key', { provider, api_key: newKey[provider].trim() })
        setNewKey((p: any) => ({ ...p, [provider]: '' }))
    }

    const removeKey = (provider: string) => {
        if (confirm(`Remove ${PROVIDER_INFO[provider]?.label} key?`)) {
            onSave('ai_key', { provider, delete: true })
        }
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-textSecondary">These keys are used by Brain agents, Writer, and all AI features. Stored in DB — no env vars needed.</p>

            {providers.map(provider => {
                const info = PROVIDER_INFO[provider]
                const existing = keyMap[provider]
                const isSet = existing?.api_key_set
                const testStatus = existing?.test_status || 'untested'

                return (
                    <div key={provider} className={`p-4 rounded-xl border transition-all ${isSet ? 'border-border bg-surface' : 'border-border/50 bg-surfaceHover'}`}>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <p className={`font-semibold text-textPrimary`}>{info.label}</p>
                                    {isSet && <StatusBadge status={testStatus} />}
                                    {!isSet && <span className="text-xs text-textTertiary px-2 py-0.5 rounded-full border border-border">Not configured</span>}
                                </div>
                                {isSet && existing?.test_model && (
                                    <p className="text-xs text-textSecondary mt-0.5">Last tested: {existing.test_model}{existing.test_error ? ` — ${existing.test_error}` : ''}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {isSet && (
                                    <button onClick={() => onTest('ai_key', { provider })} className="btn btn-ghost btn-sm" disabled={testing === `ai_key_${provider}`}>
                                        {testing === `ai_key_${provider}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" />}
                                        Test
                                    </button>
                                )}
                                {isSet && (
                                    <button onClick={() => removeKey(provider)} className="btn btn-ghost btn-icon btn-sm text-error">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Key input */}
                        <div className="flex gap-2">
                            <input
                                type={show[provider] ? 'text' : 'password'}
                                value={newKey[provider] || ''}
                                onChange={e => setNewKey((p: any) => ({ ...p, [provider]: e.target.value }))}
                                placeholder={isSet ? '(set — enter new key to update)' : info.placeholder}
                                className={`input flex-1 font-mono text-sm ${info.color}`}
                            />
                            <button onClick={() => toggleShow(provider)} className="btn btn-ghost btn-icon btn-sm">
                                {show[provider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => saveKey(provider)}
                                className="btn btn-primary btn-sm"
                                disabled={!newKey[provider]?.trim() || saving === 'ai_key'}
                            >
                                {saving === 'ai_key' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isSet ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// QUEUES TAB
// ═══════════════════════════════════════════════════════════════

function QueuesTab({ deployment, onSave, saving }: any) {
    const [concurrency, setConcurrency] = useState<Record<string, number>>(
        deployment.queue_concurrency || {}
    )

    const update = (queue: string, val: number) =>
        setConcurrency(p => ({ ...p, [queue]: Math.max(1, Math.min(50, val)) }))

    return (
        <div className="space-y-5">
            <div>
                <h3 className="font-semibold text-textPrimary mb-1">Queue Concurrency</h3>
                <p className="text-sm text-textSecondary">How many jobs each queue processes simultaneously. Higher = faster but more resource usage.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {Object.entries(QUEUE_LABELS).map(([queue, label]) => (
                    <div key={queue} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-textPrimary">{label}</label>
                            <span className="text-sm font-bold text-accent">{concurrency[queue] || 1}</span>
                        </div>
                        <input
                            type="range" min={1} max={20} step={1}
                            value={concurrency[queue] || 1}
                            onChange={e => update(queue, parseInt(e.target.value))}
                            className="w-full accent-accent"
                        />
                        <div className="flex justify-between text-xs text-textTertiary">
                            <span>1 (sequential)</span><span>20 (heavy)</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end">
                <button onClick={() => onSave('queues', { queue_concurrency: concurrency })} className="btn btn-primary" disabled={saving === 'queues'}>
                    {saving === 'queues' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Concurrency
                </button>
            </div>
        </div>
    )
}

// ── Shared field component ────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text' }: {
    label: string; value: string; onChange: (v: string) => void
    placeholder?: string; type?: string
}) {
    return (
        <div className="space-y-1.5">
            <label className="label-sm">{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input w-full" />
        </div>
    )
}
