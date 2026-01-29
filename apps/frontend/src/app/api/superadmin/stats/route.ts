import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/superadmin/stats
 * Fetch real platform statistics from database
 * NO STUBS - queries actual data with correct schema
 */
export async function GET(request: NextRequest) {
    try {
        // Validate environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        console.log('[STATS API] Environment check:', {
            hasUrl: !!supabaseUrl,
            hasKey: !!serviceKey,
            urlPrefix: supabaseUrl?.substring(0, 20)
        });

        if (!supabaseUrl || !serviceKey) {
            throw new Error(`Missing environment variables: ${!supabaseUrl ? 'SUPABASE_URL' : ''} ${!serviceKey ? 'SERVICE_KEY' : ''}`);
        }

        // Create Supabase client with service role
        const supabase = createClient(supabaseUrl, serviceKey);

        console.log('[STATS API] Starting stats fetch...');

        // Active Organizations (status = 'active')
        const { data: activeOrgsData, error: orgsError } = await supabase
            .from('organizations')
            .select('id')
            .eq('status', 'active');

        console.log('[STATS API] Active Orgs Query:', { count: activeOrgsData?.length, error: orgsError });
        if (orgsError) throw orgsError;
        const activeOrgs = activeOrgsData?.length || 0;

        // Total Users (all users across all orgs)
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id');

        console.log('[STATS API] Total Users Query:', { count: usersData?.length, error: usersError });
        if (usersError) throw usersError;
        const totalUsers = usersData?.length || 0;

        // Total Knowledge Bases
        const { data: kbsData, error: kbsError } = await supabase
            .from('knowledge_bases')
            .select('id');

        console.log('[STATS API] Total KBs Query:', { count: kbsData?.length, error: kbsError });
        if (kbsError) throw kbsError;
        const totalKbs = kbsData?.length || 0;

        // Total Runs (from engine_run_logs table)
        const { data: runsData, error: runsError } = await supabase
            .from('engine_run_logs')
            .select('id');

        console.log('[STATS API] Total Runs Query:', { count: runsData?.length, error: runsError });
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

        // Runs this month (current calendar month)
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const { data: runsMonthData, error: runsMonthError } = await supabase
            .from('engine_run_logs')
            .select('id')
            .gte('started_at', firstDayOfMonth.toISOString());

        if (runsMonthError) throw runsMonthError;
        const runsThisMonth = runsMonthData?.length || 0;

        // MRR Calculation (sum of active org plans)
        const { data: activeOrgPlans, error: licenseError } = await supabase
            .from('organizations')
            .select('id, plan')
            .eq('status', 'active');

        if (licenseError) throw licenseError;

        // Calculate MRR based on plans
        const planPricing: Record<string, number> = {
            'free': 0,         // Free tier
            'starter': 19,     // $19/month
            'pro': 49,         // $49/month
            'enterprise': 199, // $199/month
        };

        const mrr = (activeOrgPlans || []).reduce((sum, org) => {
            const plan = org.plan || 'free';
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
        };

        console.log('[STATS API] Final stats to return:', finalStats);

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
