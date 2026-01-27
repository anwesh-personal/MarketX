import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/superadmin/stats
 * Fetch real platform statistics from database
 * NO STUBS - queries actual data with correct schema
 */
export async function GET(request: NextRequest) {
    try {
        // Active Organizations (is_active = true)
        const { count: activeOrgs, error: orgsError } = await supabase
            .from('organizations')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        if (orgsError) throw orgsError;

        // Total Users (all users across all orgs)
        const { count: totalUsers, error: usersError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (usersError) throw usersError;

        // Total Knowledge Bases
        const { count: totalKbs, error: kbsError } = await supabase
            .from('knowledge_bases')
            .select('*', { count: 'exact', head: true });

        if (kbsError) throw kbsError;

        // Total Runs (from engine_run_logs table)
        const { count: totalRuns, error: runsError } = await supabase
            .from('engine_run_logs')
            .select('*', { count: 'exact', head: true });

        if (runsError) throw runsError;

        // Runs in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: runsLast30Days, error: runs30Error } = await supabase
            .from('engine_run_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString());

        if (runs30Error) throw runs30Error;

        // Runs this month (current calendar month)
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const { count: runsThisMonth, error: runsMonthError } = await supabase
            .from('engine_run_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', firstDayOfMonth.toISOString());

        if (runsMonthError) throw runsMonthError;

        // MRR Calculation (sum of active org licenses)
        const { data: activeOrgLicenses, error: licenseError } = await supabase
            .from('organizations')
            .select('id, license_tier')
            .eq('is_active', true);

        if (licenseError) throw licenseError;

        // Calculate MRR based on license tiers
        const tierPricing: Record<string, number> = {
            'hobby': 0,        // Free tier
            'pro': 29,         // $29/month
            'enterprise': 99,  // $99/month
        };

        const mrr = (activeOrgLicenses || []).reduce((sum, org) => {
            const tier = org.license_tier || 'hobby';
            return sum + (tierPricing[tier] || 0);
        }, 0);

        // Return real data
        return NextResponse.json({
            success: true,
            stats: {
                active_orgs: activeOrgs || 0,
                total_users: totalUsers || 0,
                total_kbs: totalKbs || 0,
                total_runs: totalRuns || 0,
                runs_last_30_days: runsLast30Days || 0,
                runs_this_month: runsThisMonth || 0,
                mrr_usd: mrr,
            },
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
