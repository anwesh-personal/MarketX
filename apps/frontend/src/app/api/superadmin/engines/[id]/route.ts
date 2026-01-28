import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperadmin } from '@/lib/superadmin-middleware';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await getSuperadmin(request);

        const { data: engine, error } = await supabase
            .from('engine_instances')
            .select(`
                *,
                template:workflow_templates(id, name),
                organization:organizations(id, name),
                constitution:constitutions(id, name)
            `)
            .eq('id', params.id)
            .single();

        if (error) throw error;

        // Flatten
        const flatEngine = {
            ...engine,
            template_name: engine.template?.name || null,
            org_name: engine.organization?.name || null,
        };

        return NextResponse.json({ engine: flatEngine });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
