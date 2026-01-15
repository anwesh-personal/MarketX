import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all AI providers
export async function GET(request: NextRequest) {
    try {
        const { data: providers, error } = await supabase
            .from('ai_providers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ providers });
    } catch (error: any) {
        console.error('Error fetching AI providers:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// POST - Create new AI provider
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { provider, name, api_key, description, org_id, user_id } = body;

        // Validate required fields
        if (!provider || !name || !api_key || !org_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('ai_providers')
            .insert({
                provider,
                name,
                api_key,
                description,
                org_id,
                user_id,
                is_active: true,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ provider: data });
    } catch (error: any) {
        console.error('Error creating AI provider:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// PATCH - Update AI provider
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Provider ID required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('ai_providers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ provider: data });
    } catch (error: any) {
        console.error('Error updating AI provider:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Delete AI provider
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Provider ID required' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('ai_providers')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting AI provider:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
