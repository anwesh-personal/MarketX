import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        // Get counts from Supabase
        const [
            { count: activeOrgs },
            { count: totalUsers },
            { count: totalKbs },
            { count: totalRuns },
        ] = await Promise.all([
            supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('knowledge_bases').select('*', { count: 'exact', head: true }),
            supabase.from('runs').select('*', { count: 'exact', head: true }),
        ]);

        // Runs in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: runsLast30Days } = await supabase
            .from('runs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString());

        // Calculate MRR (Monthly Recurring Revenue)
        const { data: orgs } = await supabase
            .from('organizations')
            .select('plan')
            .eq('status', 'active');

        let mrrUsd = 0;
        const pricing: Record<string, number> = {
            free: 0,
            starter: 99,
            pro: 299,
            enterprise: 999, // Custom, but use this as base
        };

        orgs?.forEach(org => {
            mrrUsd += pricing[org.plan] || 0;
        });

        return NextResponse.json({
            stats: {
                active_orgs: activeOrgs || 0,
                total_users: totalUsers || 0,
                total_kbs: totalKbs || 0,
                total_runs: totalRuns || 0,
                runs_last_30_days: runsLast30Days || 0,
                runs_this_month: runsLast30Days || 0, // Same for now
                mrr_usd: mrrUsd,
            },
        });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
