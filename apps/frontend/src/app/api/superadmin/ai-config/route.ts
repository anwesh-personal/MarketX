import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Load AI config
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('system_configs')
            .select('value')
            .eq('key', 'ai_providers')
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return NextResponse.json({ config: data?.value || null });
    } catch (error) {
        console.error('AI config GET error:', error);
        return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
    }
}

// POST - Save AI config
export async function POST(request: NextRequest) {
    try {
        const { config } = await request.json();

        const { error } = await supabase
            .from('system_configs')
            .upsert({
                key: 'ai_providers',
                value: config,
                updated_at: new Date().toISOString(),
            });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('AI config POST error:', error);
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
}
