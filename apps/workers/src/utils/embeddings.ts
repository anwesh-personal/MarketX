import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Provider endpoint mapping
const EMBEDDING_ENDPOINTS: Record<string, string> = {
    openai: 'https://api.openai.com/v1/embeddings',
    // Add other providers as needed
}

/**
 * Get AI provider for embeddings
 * Fetches from AI Management, NOT hardcoded
 * Tries org-specific first, then falls back to platform-level
 */
async function getEmbeddingProvider(orgId: string) {
    // Try org-specific provider first
    let { data: provider, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .is('auto_disabled_at', null)
        .order('priority', { ascending: true })
        .limit(1)
        .single()

    // Fall back to platform-level provider
    if (error || !provider) {
        const { data: platformProvider, error: platformError } = await supabase
            .from('ai_providers')
            .select('*')
            .is('org_id', null)
            .eq('is_active', true)
            .is('auto_disabled_at', null)
            .order('priority', { ascending: true })
            .limit(1)
            .single()

        if (platformError || !platformProvider) {
            throw new Error('No active AI provider found for embeddings')
        }
        provider = platformProvider
    }

    return provider
}

/**
 * Generate embedding using org's configured AI provider
 * Routes to correct provider endpoint based on provider type
 */
export async function generateEmbedding(text: string, orgId: string): Promise<number[]> {
    // Get provider from database
    const provider = await getEmbeddingProvider(orgId)
    const providerType = provider.provider || 'openai'
    const endpoint = EMBEDDING_ENDPOINTS[providerType] || EMBEDDING_ENDPOINTS.openai

    // Call provider's API
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.api_key}`,
        },
        body: JSON.stringify({
            model: provider.selected_model || 'text-embedding-3-large',
            input: text,
            dimensions: 1536,
        }),
    })

    if (!response.ok) {
        throw new Error(`Embedding API failed: ${response.statusText}`)
    }

    const result = await response.json() as { data: Array<{ embedding: number[] }> }
    return result.data[0].embedding
}
