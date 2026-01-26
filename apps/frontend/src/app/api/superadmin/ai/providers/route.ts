/**
 * AI PROVIDERS API
 * Fetches providers and models from database
 * NO HARDCODING - All data from ai_providers table
 * Models come from ai_model_pricing table or models_discovered JSONB
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSuperadmin } from '@/lib/superadmin-middleware';

export const dynamic = 'force-dynamic';

// ============================================================================
// GET: List all AI providers with their models
// ============================================================================

export async function GET(request: NextRequest) {
    try {
        // Verify superadmin token
        const admin = await getSuperadmin(request);
        if (!admin) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get('active') !== 'false';
        const includeModels = searchParams.get('includeModels') !== 'false';

        // Fetch providers from ai_providers table
        // Schema from 006_ai_provider_system.sql:
        // id, provider, name, api_key, description, is_active, created_at, updated_at,
        // usage_count, failures, last_used_at, last_failure_at, auto_disabled_at, 
        // models_discovered (JSONB), priority
        let providerQuery = supabase
            .from('ai_providers')
            .select('id, provider, name, description, is_active, created_at, updated_at, models_discovered, priority')
            .order('provider', { ascending: true })
            .order('priority', { ascending: false })
            .order('name', { ascending: true });

        if (activeOnly) {
            providerQuery = providerQuery.eq('is_active', true);
        }

        const { data: providers, error: providerError } = await providerQuery;

        if (providerError) {
            console.error('Error fetching providers:', providerError);
            return NextResponse.json(
                { success: false, message: 'Failed to fetch providers', error: providerError.message },
                { status: 500 }
            );
        }

        // Transform providers and get models from ai_model_pricing
        let providersList = (providers || []).map(p => ({
            ...p,
            provider_type: p.provider,  // Map 'provider' to 'provider_type' for UI
            display_name: p.name,       // Use 'name' as display_name
            models: [] as any[],
        }));

        // If includeModels, get model info from ai_model_pricing table
        if (includeModels && providersList.length > 0) {
            const providerTypes = [...new Set(providersList.map(p => p.provider))];

            // Fetch available models from ai_model_pricing
            const { data: pricingModels, error: pricingError } = await supabase
                .from('ai_model_pricing')
                .select('*')
                .in('provider', providerTypes)
                .eq('is_active', true)
                .order('model_id', { ascending: true });

            if (pricingError) {
                console.error('Error fetching model pricing:', pricingError);
            }

            // Group pricing by provider
            const pricingByProvider: Record<string, any[]> = {};
            (pricingModels || []).forEach(model => {
                if (!pricingByProvider[model.provider]) {
                    pricingByProvider[model.provider] = [];
                }
                pricingByProvider[model.provider].push({
                    id: model.id,
                    provider: model.provider,
                    model_id: model.model_id,
                    model_name: model.model_id, // Use model_id as name
                    key_name: model.provider,
                    input_cost_per_million: (model.input_cost_per_1k_tokens || 0) * 1000,
                    output_cost_per_million: (model.output_cost_per_1k_tokens || 0) * 1000,
                    is_active: model.is_active,
                });
            });

            // Attach models to providers
            providersList = providersList.map(provider => {
                // Use models from pricing table, fallback to models_discovered
                let models = pricingByProvider[provider.provider] || [];

                // If no pricing models, try models_discovered JSONB
                if (models.length === 0 && provider.models_discovered && Array.isArray(provider.models_discovered)) {
                    models = provider.models_discovered.map((m: any, idx: number) => ({
                        id: `discovered-${provider.id}-${idx}`,
                        provider: provider.provider,
                        model_id: m.id || m.model_id || m,
                        model_name: m.name || m.id || m.model_id || m,
                        key_name: provider.provider,
                        is_active: true,
                    }));
                }

                return {
                    ...provider,
                    models,
                };
            });
        }

        // Group by provider type for UI
        const groupedByType: Record<string, any[]> = {};
        providersList.forEach(provider => {
            const type = provider.provider_type || provider.provider || 'other';
            if (!groupedByType[type]) {
                groupedByType[type] = [];
            }
            groupedByType[type].push(provider);
        });

        return NextResponse.json({
            success: true,
            data: providersList,
            grouped: groupedByType,
            count: providersList.length,
        });
    } catch (error: any) {
        console.error('AI Providers API error:', error);
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
