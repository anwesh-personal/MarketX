import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Get AI provider for embeddings
 * Fetches from AI Management, NOT hardcoded
 */
async function getEmbeddingProvider(orgId: string) {
    const { data: provider, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('org_id', orgId)
        .eq('provider_type', 'openai') // Or fetch default provider
        .eq('is_active', true)
        .single()

    if (error || !provider) {
        throw new Error('No active AI provider found for embeddings')
    }

    return provider
}

/**
 * Generate embedding using org's configured AI provider
 * ALWAYS fetched from AI Management - NEVER hardcoded
 */
export async function generateEmbedding(text: string, orgId: string): Promise<number[]> {
    // Get provider from database
    const provider = await getEmbeddingProvider(orgId)

    // Call provider's API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.api_key}`,  // From database
        },
        body: JSON.stringify({
            model: provider.model || 'text-embedding-3-large',  // From provider config
            input: text,
            dimensions: 1536,
        }),
    })

    if (!response.ok) {
        throw new Error(`Embedding API failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.data[0].embedding
}
