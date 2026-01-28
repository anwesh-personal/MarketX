import { NextRequest, NextResponse } from 'next/server';
import { getSuperadmin } from '@/lib/superadmin-middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await getSuperadmin(req);

        // Get query params for pagination
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        const { data, error, count } = await supabase
            .from('engine_run_logs')
            .select('*', { count: 'exact' })
            .eq('engine_id', params.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return NextResponse.json({
            runs: data,
            total: count
        });

    } catch (error: any) {
        console.error('Error fetching engine runs:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch execution history' },
            { status: 500 }
        );
    }
}
