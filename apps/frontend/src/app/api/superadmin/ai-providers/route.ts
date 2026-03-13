import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSuperadmin } from '@/lib/superadmin-middleware';
import { encryptSecret, maskSecret, shouldPersistSecret } from '@/lib/secrets';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all AI providers
export async function GET(request: NextRequest) {
    try {
        await requireSuperadmin(request);
        const { data: providers, error } = await supabase
            .from('ai_providers')
            .select('id, provider, name, api_key, description, is_active, failures, usage_count, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            providers: (providers || []).map((provider) => ({
                ...provider,
                api_key: maskSecret(provider.api_key),
                has_api_key: Boolean(provider.api_key),
            })),
        });
    } catch (error: any) {
        console.error('Error fetching AI providers:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST - Create new AI provider
 * 
 * Validates API key and discovers models before saving
 * Integrates with AIProviderService for proper validation
 */
export async function POST(request: NextRequest) {
    try {
        await requireSuperadmin(request);
        const body = await request.json();
        const { provider, name, api_key, description } = body;

        // Validate required fields
        if (!provider || !name || !api_key) {
            return NextResponse.json(
                { error: 'Missing required fields: provider, name, api_key' },
                { status: 400 }
            );
        }

        // Validate provider type
        const validProviders = ['openai', 'anthropic', 'google', 'mistral', 'perplexity', 'xai'];
        if (!validProviders.includes(provider)) {
            return NextResponse.json(
                { error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` },
                { status: 400 }
            );
        }

        // Step 1: Validate API key and discover models (service layer)
        const { aiProviderService } = await import('@/services/ai');
        const validation = await aiProviderService.validateAndDiscover(provider, api_key);

        if (!validation.valid) {
            return NextResponse.json(
                {
                    error: 'API key validation failed',
                    details: validation.error,
                    provider: validation.provider
                },
                { status: 400 }
            );
        }

        // Step 2: Save to database with discovered models
        const { data, error } = await supabase
            .from('ai_providers')
            .insert({
                provider,
                name,
                api_key: encryptSecret(api_key),
                description: description || null,
                is_active: true,
                models_discovered: validation.models || [],
                priority: 0,
                usage_count: 0,
                failures: 0
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            provider: data,
            validation: {
                models_discovered: validation.models?.length || 0,
                message: validation.message
            }
        });
    } catch (error: any) {
        console.error('Error creating AI provider:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create AI provider' },
            { status: 500 }
        );
    }
}

// PATCH - Update AI provider
export async function PATCH(request: NextRequest) {
    try {
        await requireSuperadmin(request);
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Provider ID required' },
                { status: 400 }
            );
        }

        if (typeof updates.api_key === 'string') {
            if (shouldPersistSecret(updates.api_key)) {
                updates.api_key = encryptSecret(updates.api_key)
            } else {
                delete updates.api_key
            }
        }

        const { data, error } = await supabase
            .from('ai_providers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            provider: data ? { ...data, api_key: maskSecret(data.api_key), has_api_key: Boolean(data.api_key) } : null,
        });
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
        await requireSuperadmin(request);
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
