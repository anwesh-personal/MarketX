import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperadmin } from '@/lib/superadmin-middleware';
import { DEFAULT_BILLING_PLAN_PRICING } from '@/lib/config-defaults';

/**
 * GET /api/superadmin/stats
 * Fetch real platform statistics from database
 * NO STUBS - queries actual data with correct schema
 */
export async function GET(request: NextRequest) {
    try {
        await requireSuperadmin(request);

        // Validate environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;



        if (!supabaseUrl || !serviceKey) {
            throw new Error(`Missing environment variables: ${!supabaseUrl ? 'SUPABASE_URL' : ''} ${!serviceKey ? 'SERVICE_KEY' : ''}`);
        }

        // Create Supabase client with service role
        const supabase = createClient(supabaseUrl, serviceKey);



        // Active Organizations (status = 'active')
        const { data: activeOrgsData, error: orgsError } = await supabase
            .from('organizations')
            .select('id')
            .eq('status', 'active');


        if (orgsError) throw orgsError;
        const activeOrgs = activeOrgsData?.length || 0;

        // Total Users (all users across all orgs)
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id');


        if (usersError) throw usersError;
        const totalUsers = usersData?.length || 0;

        // Total Knowledge Bases
        const { data: kbsData, error: kbsError } = await supabase
            .from('knowledge_bases')
            .select('id');


        if (kbsError) throw kbsError;
        const totalKbs = kbsData?.length || 0;

        // Total Runs (from engine_run_logs table)
        const { data: runsData, error: runsError } = await supabase
            .from('engine_run_logs')
            .select('id');


        if (runsError) throw runsError;
        const totalRuns = runsData?.length || 0;

        // Runs in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: runs30Data, error: runs30Error } = await supabase
            .from('engine_run_logs')
            .select('id')
            .gte('started_at', thirtyDaysAgo.toISOString());

        if (runs30Error) throw runs30Error;
        const runsLast30Days = runs30Data?.length || 0;

        // Runs in PREVIOUS 30 days (for trend comparison)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const { data: runsPrev30Data } = await supabase
            .from('engine_run_logs')
            .select('id')
            .gte('started_at', sixtyDaysAgo.toISOString())
            .lt('started_at', thirtyDaysAgo.toISOString());

        const runsPrev30Days = runsPrev30Data?.length || 0;
        const runsGrowth = runsPrev30Days > 0
            ? ((runsLast30Days - runsPrev30Days) / runsPrev30Days) * 100
            : 0;

        // Runs this month (current calendar month)
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const { data: runsMonthData, error: runsMonthError } = await supabase
            .from('engine_run_logs')
            .select('id')
            .gte('started_at', firstDayOfMonth.toISOString());

        if (runsMonthError) throw runsMonthError;
        const runsThisMonth = runsMonthData?.length || 0;

        // Previous month's MRR for growth comparison
        const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // MRR Calculation — read pricing from config_table (single source of truth)
        const { data: activeOrgPlans, error: licenseError } = await supabase
            .from('organizations')
            .select('id, plan')
            .eq('status', 'active');

        if (licenseError) throw licenseError;

        // Load DB-driven pricing, fall back to config-defaults
        const { data: pricingConfig } = await supabase
            .from('config_table')
            .select('value')
            .eq('key', 'billing_plan_pricing')
            .single();

        const planPricing: Record<string, number> =
            pricingConfig?.value?.value || pricingConfig?.value || DEFAULT_BILLING_PLAN_PRICING;

        const mrr = (activeOrgPlans || []).reduce((sum, org) => {
            const plan = (org.plan || 'free').toLowerCase();
            return sum + (planPricing[plan] || 0);
        }, 0);

        // Return real data
        const finalStats = {
            active_orgs: activeOrgs || 0,
            total_users: totalUsers || 0,
            total_kbs: totalKbs || 0,
            total_runs: totalRuns || 0,
            runs_last_30_days: runsLast30Days || 0,
            runs_this_month: runsThisMonth || 0,
            mrr_usd: mrr,
            trends: {
                runs_growth: Math.round(runsGrowth * 10) / 10,
            },
        };



        return NextResponse.json({
            success: true,
            stats: finalStats,
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error('Stats API Error:', error);
        return NextResponse.json(
            {
                error: error.message || 'Failed to fetch platform stats',
                // Return structure even on error so dashboard doesn't break
                stats: {
                    active_orgs: 0,
                    total_users: 0,
                    total_kbs: 0,
                    total_runs: 0,
                    runs_last_30_days: 0,
                    runs_this_month: 0,
                    mrr_usd: 0,
                },
            },
            { status: 500 }
        );
    }
}
