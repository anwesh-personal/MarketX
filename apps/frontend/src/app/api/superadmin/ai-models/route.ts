import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperadmin } from '@/lib/superadmin-middleware';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all AI models
export async function GET(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const provider = searchParams.get('provider');
        const is_active = searchParams.get('is_active');

        let query = supabase
            .from('ai_model_metadata')
            .select('*')
            .order('created_at', { ascending: false });

        if (provider) {
            query = query.eq('provider', provider);
        }

        if (is_active !== null) {
            query = query.eq('is_active', is_active === 'true');
        }

        const { data: models, error } = await query;

        if (error) throw error;

        return NextResponse.json({ models, count: models?.length || 0 });
    } catch (error: any) {
        console.error('Error fetching AI models:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// POST - Create/Upsert AI model metadata
export async function POST(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const {
            provider,
            model_id,
            model_name,
            key_name,
            input_cost_per_million,
            output_cost_per_million,
            context_window_tokens,
            tokens_per_page,
            max_output_tokens,
            specialties,
            description,
            supports_vision,
            supports_function_calling,
            supports_streaming,
            is_active,
            test_passed,
            test_error,
            org_id,
            user_id,
        } = body;

        // Validate required fields
        if (!provider || !model_id) {
            return NextResponse.json(
                { error: 'Provider and model_id required' },
                { status: 400 }
            );
        }

        // Create composite key
        const key_model = `${key_name || 'default'}_${model_id}`;

        // Upsert (insert or update if exists)
        const { data, error } = await supabase
            .from('ai_model_metadata')
            .upsert({
                provider,
                model_id,
                model_name: model_name || model_id,
                key_name,
                key_model,
                input_cost_per_million,
                output_cost_per_million,
                context_window_tokens,
                tokens_per_page,
                max_output_tokens,
                specialties,
                description,
                supports_vision: supports_vision ?? false,
                supports_function_calling: supports_function_calling ?? false,
                supports_streaming: supports_streaming ?? true,
                is_active: is_active ?? true,
                test_passed,
                test_error,
                last_tested: test_passed !== undefined ? new Date().toISOString() : null,
                org_id,
                user_id,
            }, {
                onConflict: 'key_model',
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ model: data });
    } catch (error: any) {
        console.error('Error creating/updating AI model:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// PATCH - Update AI model metadata
export async function PATCH(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Model ID required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('ai_model_metadata')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ model: data });
    } catch (error: any) {
        console.error('Error updating AI model:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Delete AI model or cleanup untested models
export async function DELETE(request: NextRequest) {
    try {
        const admin = await getSuperadmin(request);
        if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const cleanupUntested = searchParams.get('cleanup_untested');

        // Special mode: cleanup all untested seed models
        if (cleanupUntested === 'true') {
            const { data, error } = await supabase
                .from('ai_model_metadata')
                .delete()
                .is('test_passed', null)
                .select();

            if (error) throw error;

            return NextResponse.json({
                success: true,
                deleted: data?.length || 0,
                message: `Deleted ${data?.length || 0} untested seed models`
            });
        }

        if (!id) {
            return NextResponse.json(
                { error: 'Model ID required' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('ai_model_metadata')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting AI model:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
