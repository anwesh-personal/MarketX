import { createClient } from '@supabase/supabase-js'
import {
    DEFAULT_BILLING_PLAN_PRICING,
    DEFAULT_BILLING_TIER_WEIGHT,
} from '@/lib/config-defaults'

export type AnalyticsRange = '24h' | '7d' | '30d' | '90d'

export interface AnalyticsPoint {
    bucket_key: string
    period: string
    total_runs: number
    total_orgs: number
    active_users: number
    kb_uploads: number
    api_calls: number
}

export interface AnalyticsMetrics {
    total_organizations: number
    total_users: number
    total_runs_today: number
    total_runs_this_month: number
    avg_runs_per_org: number
    most_active_org: string
    total_api_calls: number
    total_kb_uploads: number
    run_growth_percent: number
    org_activation_rate: number
}

export interface LicenseTransactionRecord {
    id: string
    org_id: string | null
    org_name: string
    transaction_type: string
    from_tier: string | null
    to_tier: string | null
    price_usd: number | null
    quota_changes: Record<string, unknown> | null
    notes: string | null
    created_at: string
    admin_email: string
}

export interface LicenseStats {
    total_transactions: number
    total_revenue: number
    upgrades_count: number
    downgrades_count: number
    active_paid_orgs: number
    mrr: number
    new_organizations: number
    average_contract_value: number
}

interface Bucket {
    key: string
    label: string
    start: Date
    end: Date
}

type RunLogRow = {
    started_at: string | null
    created_at?: string | null
    org_id: string | null
}

type UsageLogRow = {
    timestamp: string | null
    organization_id: string | null
    user_id: string | null
}

type KnowledgeBaseRow = {
    created_at: string | null
    org_id: string | null
}

type OrganizationRow = {
    id: string
    name: string | null
    status?: string | null
    plan?: string | null
    created_at?: string | null
}

type UserRow = {
    id: string
}

type LicenseTransactionRow = {
    id: string
    org_id: string | null
    transaction_type: string | null
    from_plan: string | null
    to_plan: string | null
    price_usd: number | null
    quota_changes: Record<string, unknown> | null
    notes: string | null
    created_at: string | null
    admin_id?: string | null
}

type PlatformAdminRow = {
    id: string
    email: string | null
}

export function getSupabaseAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase configuration for superadmin insights')
    }

    return createClient(supabaseUrl, serviceKey)
}

function normalizeRange(value: string | null): AnalyticsRange {
    if (value === '24h' || value === '7d' || value === '30d' || value === '90d') {
        return value
    }

    return '7d'
}

export function parseAnalyticsRange(value: string | null): AnalyticsRange {
    return normalizeRange(value)
}

function startOfHour(date: Date) {
    const next = new Date(date)
    next.setMinutes(0, 0, 0)
    return next
}

function startOfDay(date: Date) {
    const next = new Date(date)
    next.setHours(0, 0, 0, 0)
    return next
}

function addHours(date: Date, amount: number) {
    const next = new Date(date)
    next.setHours(next.getHours() + amount)
    return next
}

function addDays(date: Date, amount: number) {
    const next = new Date(date)
    next.setDate(next.getDate() + amount)
    return next
}

function formatBucketLabel(date: Date, range: AnalyticsRange) {
    if (range === '24h') {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
        }).format(date)
    }

    if (range === '90d') {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
        }).format(date)
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
    }).format(date)
}

function buildBuckets(range: AnalyticsRange, now = new Date()): Bucket[] {
    if (range === '24h') {
        const firstBucket = startOfHour(addHours(now, -23))

        return Array.from({ length: 24 }, (_, index) => {
            const start = addHours(firstBucket, index)
            const end = addHours(start, 1)

            return {
                key: start.toISOString(),
                label: formatBucketLabel(start, range),
                start,
                end,
            }
        })
    }

    if (range === '7d') {
        const firstBucket = startOfDay(addDays(now, -6))

        return Array.from({ length: 7 }, (_, index) => {
            const start = addDays(firstBucket, index)
            const end = addDays(start, 1)

            return {
                key: start.toISOString(),
                label: formatBucketLabel(start, range),
                start,
                end,
            }
        })
    }

    if (range === '30d') {
        const firstBucket = startOfDay(addDays(now, -27))

        return Array.from({ length: 10 }, (_, index) => {
            const start = addDays(firstBucket, index * 3)
            const end = addDays(start, 3)

            return {
                key: start.toISOString(),
                label: formatBucketLabel(start, range),
                start,
                end,
            }
        })
    }

    const firstBucket = startOfDay(addDays(now, -84))

    return Array.from({ length: 13 }, (_, index) => {
        const start = addDays(firstBucket, index * 7)
        const end = addDays(start, 7)

        return {
            key: start.toISOString(),
            label: formatBucketLabel(start, range),
            start,
            end,
        }
    })
}

function isActiveOrganization(org: OrganizationRow) {
    return (org.status || '').toLowerCase() === 'active'
}

function getOrganizationPlan(org: OrganizationRow) {
    return (org.plan || 'free').toLowerCase()
}

function getTierWeight(tier: string | null | undefined, tierWeight: Record<string, number>) {
    return tierWeight[(tier || 'free').toLowerCase()] ?? 0
}

async function getBillingConfig(
    supabase: ReturnType<typeof createClient>
): Promise<{ planPricing: Record<string, number>; tierWeight: Record<string, number> }> {
    const { data, error } = await supabase
        .from('config_table')
        .select('key, value')
        .in('key', ['billing_plan_pricing', 'billing_tier_weight'])

    if (error) {
        return {
            planPricing: DEFAULT_BILLING_PLAN_PRICING,
            tierWeight: DEFAULT_BILLING_TIER_WEIGHT,
        }
    }

    const rows = new Map((data || []).map((row: any) => [row.key, row.value?.value || row.value]))

    return {
        planPricing: rows.get('billing_plan_pricing') || DEFAULT_BILLING_PLAN_PRICING,
        tierWeight: rows.get('billing_tier_weight') || DEFAULT_BILLING_TIER_WEIGHT,
    }
}

function getBucketForDate(dateValue: string | null | undefined, buckets: Bucket[]) {
    if (!dateValue) return null

    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return null

    return buckets.find((bucket) => date >= bucket.start && date < bucket.end) ?? null
}

function getRangeWindow(range: AnalyticsRange, now = new Date()) {
    const buckets = buildBuckets(range, now)
    const start = buckets[0]?.start ?? now
    const end = buckets[buckets.length - 1]?.end ?? now

    return { start, end, buckets }
}

function calculateGrowthPercent(values: number[]) {
    if (values.length < 2) return 0

    const midpoint = Math.ceil(values.length / 2)
    const firstHalf = values.slice(0, midpoint).reduce((sum, value) => sum + value, 0)
    const secondHalf = values.slice(midpoint).reduce((sum, value) => sum + value, 0)

    if (firstHalf === 0) {
        return secondHalf > 0 ? 100 : 0
    }

    return Number((((secondHalf - firstHalf) / firstHalf) * 100).toFixed(1))
}

export async function fetchAnalyticsSeries(range: AnalyticsRange) {
    const supabase = getSupabaseAdminClient()
    const { start, end, buckets } = getRangeWindow(range)

    const [runsResult, usageResult, kbsResult] = await Promise.all([
        supabase
            .from('engine_run_logs')
            .select('started_at, created_at, org_id')
            .gte('started_at', start.toISOString())
            .lt('started_at', end.toISOString()),
        supabase
            .from('ai_usage_log')
            .select('timestamp, organization_id, user_id')
            .gte('timestamp', start.toISOString())
            .lt('timestamp', end.toISOString()),
        supabase
            .from('knowledge_bases')
            .select('created_at, org_id')
            .gte('created_at', start.toISOString())
            .lt('created_at', end.toISOString()),
    ])

    if (runsResult.error) throw runsResult.error
    if (usageResult.error) throw usageResult.error
    if (kbsResult.error) throw kbsResult.error

    const runLogs = (runsResult.data || []) as RunLogRow[]
    const usageLogs = (usageResult.data || []) as UsageLogRow[]
    const knowledgeBases = (kbsResult.data || []) as KnowledgeBaseRow[]

    const series = buckets.map((bucket) => {
        const bucketRuns = runLogs.filter((log) => getBucketForDate(log.started_at || log.created_at, [bucket]))
        const bucketUsage = usageLogs.filter((log) => getBucketForDate(log.timestamp, [bucket]))
        const bucketKnowledgeBases = knowledgeBases.filter((kb) => getBucketForDate(kb.created_at, [bucket]))

        return {
            bucket_key: bucket.key,
            period: bucket.label,
            total_runs: bucketRuns.length,
            total_orgs: new Set(bucketRuns.map((log) => log.org_id).filter(Boolean)).size,
            active_users: new Set(bucketUsage.map((log) => log.user_id).filter(Boolean)).size,
            kb_uploads: bucketKnowledgeBases.length,
            api_calls: bucketUsage.length,
        }
    })

    return {
        range,
        analytics: series,
        window: {
            start: start.toISOString(),
            end: end.toISOString(),
        },
    }
}

export async function fetchAnalyticsMetrics() {
    const supabase = getSupabaseAdminClient()
    const now = new Date()
    const todayStart = startOfDay(now)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDaysAgo = addDays(now, -30)

    const [orgsResult, usersResult, runsTodayResult, runsMonthResult, runsThirtyResult, usageResult, kbsResult] = await Promise.all([
        supabase.from('organizations').select('id, name, status, plan, created_at'),
        supabase.from('users').select('id'),
        supabase
            .from('engine_run_logs')
            .select('id', { count: 'exact', head: true })
            .gte('started_at', todayStart.toISOString()),
        supabase
            .from('engine_run_logs')
            .select('org_id', { count: 'exact' })
            .gte('started_at', monthStart.toISOString()),
        supabase
            .from('engine_run_logs')
            .select('started_at')
            .gte('started_at', thirtyDaysAgo.toISOString()),
        supabase
            .from('ai_usage_log')
            .select('id', { count: 'exact', head: true })
            .gte('timestamp', monthStart.toISOString()),
        supabase
            .from('knowledge_bases')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', monthStart.toISOString()),
    ])

    if (orgsResult.error) throw orgsResult.error
    if (usersResult.error) throw usersResult.error
    if (runsTodayResult.error) throw runsTodayResult.error
    if (runsMonthResult.error) throw runsMonthResult.error
    if (runsThirtyResult.error) throw runsThirtyResult.error
    if (usageResult.error) throw usageResult.error
    if (kbsResult.error) throw kbsResult.error

    const organizations = (orgsResult.data || []) as OrganizationRow[]
    const users = (usersResult.data || []) as UserRow[]
    const runsThisMonth = (runsMonthResult.data || []) as Array<{ org_id: string | null }>
    const runsLastThirty = (runsThirtyResult.data || []) as Array<{ started_at: string | null }>

    const activeOrganizations = organizations.filter(isActiveOrganization)
    const mostActiveOrgCounts = new Map<string, number>()

    runsThisMonth.forEach((run) => {
        if (!run.org_id) return
        mostActiveOrgCounts.set(run.org_id, (mostActiveOrgCounts.get(run.org_id) || 0) + 1)
    })

    const mostActiveOrgId = Array.from(mostActiveOrgCounts.entries())
        .sort((left, right) => right[1] - left[1])[0]?.[0]

    const mostActiveOrg = organizations.find((org) => org.id === mostActiveOrgId)?.name || 'No activity yet'
    const avgRunsPerOrg = activeOrganizations.length > 0
        ? runsThisMonth.length / activeOrganizations.length
        : 0

    const runTrendValues = buildBuckets('30d')
        .map((bucket) => runsLastThirty.filter((run) => getBucketForDate(run.started_at, [bucket])).length)

    const activationRate = organizations.length > 0
        ? Number(((activeOrganizations.length / organizations.length) * 100).toFixed(1))
        : 0

    return {
        metrics: {
            total_organizations: organizations.length,
            total_users: users.length,
            total_runs_today: runsTodayResult.count || 0,
            total_runs_this_month: runsMonthResult.count || 0,
            avg_runs_per_org: Number(avgRunsPerOrg.toFixed(1)),
            most_active_org: mostActiveOrg,
            total_api_calls: usageResult.count || 0,
            total_kb_uploads: kbsResult.count || 0,
            run_growth_percent: calculateGrowthPercent(runTrendValues),
            org_activation_rate: activationRate,
        } satisfies AnalyticsMetrics,
        timestamp: now.toISOString(),
    }
}

function deriveTransactionTypeWithWeight(
    rawType: string | null,
    fromTier: string | null,
    toTier: string | null,
    tierWeight: Record<string, number>
) {
    if (rawType === 'created') return 'created'
    if (rawType === 'reactivated') return 'reactivated'
    if (rawType === 'suspended') return 'suspended'
    if (rawType === 'plan_changed') {
        const before = getTierWeight(fromTier, tierWeight)
        const after = getTierWeight(toTier, tierWeight)

        if (after > before) return 'upgraded'
        if (after < before) return 'downgraded'
        return 'plan_changed'
    }

    return rawType || 'updated'
}

export async function fetchLicenseTransactions() {
    const supabase = getSupabaseAdminClient()
    const { tierWeight } = await getBillingConfig(supabase)

    const [transactionsResult, organizationsResult, adminsResult] = await Promise.all([
        supabase
            .from('license_transactions')
            .select('id, org_id, transaction_type, from_plan, to_plan, price_usd, quota_changes, notes, created_at, admin_id')
            .order('created_at', { ascending: false })
            .limit(250),
        supabase
            .from('organizations')
            .select('id, name'),
        supabase
            .from('platform_admins')
            .select('id, email'),
    ])

    if (transactionsResult.error) throw transactionsResult.error
    if (organizationsResult.error) throw organizationsResult.error
    if (adminsResult.error) throw adminsResult.error

    const organizations = new Map(
        ((organizationsResult.data || []) as Array<Pick<OrganizationRow, 'id' | 'name'>>)
            .map((org) => [org.id, org.name || 'Unknown organization'])
    )
    const admins = new Map(
        ((adminsResult.data || []) as PlatformAdminRow[])
            .map((admin) => [admin.id, admin.email || 'Unknown admin'])
    )

    const transactions = ((transactionsResult.data || []) as LicenseTransactionRow[]).map((transaction) => ({
        id: transaction.id,
        org_id: transaction.org_id,
        org_name: transaction.org_id ? (organizations.get(transaction.org_id) || 'Unknown organization') : 'Platform',
        transaction_type: deriveTransactionTypeWithWeight(transaction.transaction_type, transaction.from_plan, transaction.to_plan, tierWeight),
        from_tier: transaction.from_plan,
        to_tier: transaction.to_plan,
        price_usd: transaction.price_usd,
        quota_changes: transaction.quota_changes,
        notes: transaction.notes,
        created_at: transaction.created_at || new Date().toISOString(),
        admin_email: transaction.admin_id
            ? (admins.get(transaction.admin_id) || 'Unknown admin')
            : 'System',
    }))

    return { transactions }
}

export async function fetchLicenseStats() {
    const supabase = getSupabaseAdminClient()
    const { planPricing, tierWeight } = await getBillingConfig(supabase)

    const [transactionsResult, organizationsResult] = await Promise.all([
        supabase
            .from('license_transactions')
            .select('id, transaction_type, from_plan, to_plan, price_usd, created_at'),
        supabase
            .from('organizations')
            .select('id, status, plan, created_at'),
    ])

    if (transactionsResult.error) throw transactionsResult.error
    if (organizationsResult.error) throw organizationsResult.error

    const transactions = (transactionsResult.data || []) as Array<Pick<LicenseTransactionRow, 'id' | 'transaction_type' | 'from_plan' | 'to_plan' | 'price_usd' | 'created_at'>>
    const organizations = (organizationsResult.data || []) as OrganizationRow[]

    const upgradesCount = transactions.filter((transaction) =>
        deriveTransactionTypeWithWeight(transaction.transaction_type, transaction.from_plan, transaction.to_plan, tierWeight) === 'upgraded'
    ).length

    const downgradesCount = transactions.filter((transaction) =>
        deriveTransactionTypeWithWeight(transaction.transaction_type, transaction.from_plan, transaction.to_plan, tierWeight) === 'downgraded'
    ).length

    const totalRevenue = transactions.reduce((sum, transaction) => sum + (transaction.price_usd || 0), 0)
    const activePaidOrganizations = organizations.filter((org) =>
        isActiveOrganization(org) && planPricing[getOrganizationPlan(org)] > 0
    )
    const mrr = activePaidOrganizations.reduce((sum, org) => sum + (planPricing[getOrganizationPlan(org)] || 0), 0)

    const thirtyDaysAgo = addDays(new Date(), -30)
    const newOrganizations = organizations.filter((org) => {
        if (!org.created_at) return false
        return new Date(org.created_at) >= thirtyDaysAgo
    }).length

    const averageContractValue = transactions.length > 0
        ? totalRevenue / transactions.length
        : 0

    return {
        stats: {
            total_transactions: transactions.length,
            total_revenue: Number(totalRevenue.toFixed(2)),
            upgrades_count: upgradesCount,
            downgrades_count: downgradesCount,
            active_paid_orgs: activePaidOrganizations.length,
            mrr,
            new_organizations: newOrganizations,
            average_contract_value: Number(averageContractValue.toFixed(2)),
        } satisfies LicenseStats,
        timestamp: new Date().toISOString(),
    }
}
