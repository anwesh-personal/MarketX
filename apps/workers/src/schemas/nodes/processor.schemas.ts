/**
 * PROCESSOR NODE SCHEMAS
 * Input/Output contracts for content processing nodes
 */

import { z } from 'zod';

// ============================================================================
// ANALYZE INTENT
// ============================================================================

export const AnalyzeIntentInput = z.object({
    /** Text to analyze */
    text: z.string(),
    /** Context for better analysis */
    context: z.string().optional(),
    /** Available intents to classify into */
    availableIntents: z.array(z.string()).optional(),
});

export const AnalyzeIntentOutput = z.object({
    /** Primary detected intent */
    primaryIntent: z.string(),
    /** Confidence score */
    confidence: z.number().min(0).max(1),
    /** Secondary intents */
    secondaryIntents: z.array(z.object({
        intent: z.string(),
        confidence: z.number(),
    })).optional(),
    /** Extracted entities */
    entities: z.array(z.object({
        type: z.string(),
        value: z.string(),
        position: z.number().optional(),
    })).optional(),
    /** Sentiment */
    sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
    /** Urgency level */
    urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export type AnalyzeIntentInputType = z.infer<typeof AnalyzeIntentInput>;
export type AnalyzeIntentOutputType = z.infer<typeof AnalyzeIntentOutput>;

// ============================================================================
// WEB SEARCH
// ============================================================================

export const WebSearchInput = z.object({
    /** Search query */
    query: z.string(),
    /** Number of results */
    numResults: z.number().min(1).max(10).default(5),
    /** Filter by domain */
    domainFilter: z.array(z.string()).optional(),
    /** Date filter */
    dateFilter: z.enum(['day', 'week', 'month', 'year', 'any']).optional(),
    /** Search provider */
    provider: z.enum(['perplexity', 'tavily', 'serpapi']).optional(),
});

export const WebSearchOutput = z.object({
    /** Search results */
    results: z.array(z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
        publishedDate: z.string().optional(),
        source: z.string().optional(),
    })),
    /** Synthesized answer (if provider supports) */
    synthesizedAnswer: z.string().optional(),
    /** Total results found */
    totalResults: z.number().optional(),
});

export type WebSearchInputType = z.infer<typeof WebSearchInput>;
export type WebSearchOutputType = z.infer<typeof WebSearchOutput>;

// ============================================================================
// SEO OPTIMIZER
// ============================================================================

export const SeoOptimizerInput = z.object({
    /** Content to optimize */
    content: z.string(),
    /** Target keywords */
    targetKeywords: z.array(z.string()),
    /** Content type */
    contentType: z.enum(['article', 'landing_page', 'product_page', 'blog_post']).optional(),
    /** Target word count */
    targetWordCount: z.number().optional(),
});

export const SeoOptimizerOutput = z.object({
    /** Optimized content */
    optimizedContent: z.string(),
    /** SEO score (0-100) */
    seoScore: z.number().min(0).max(100),
    /** Suggested meta tags */
    metaTags: z.object({
        title: z.string(),
        description: z.string(),
        keywords: z.array(z.string()),
    }),
    /** Keyword density analysis */
    keywordDensity: z.record(z.string(), z.number()),
    /** Improvement suggestions */
    suggestions: z.array(z.object({
        type: z.string(),
        issue: z.string(),
        recommendation: z.string(),
    })),
});

export type SeoOptimizerInputType = z.infer<typeof SeoOptimizerInput>;
export type SeoOptimizerOutputType = z.infer<typeof SeoOptimizerOutput>;

// ============================================================================
// CONTENT LOCKER
// ============================================================================

export const ContentLockerInput = z.object({
    /** Content to add locks to */
    content: z.string(),
    /** Lock type */
    lockType: z.enum(['email_gate', 'paywall', 'social_share', 'progressive']),
    /** Lock position */
    position: z.enum(['start', 'middle', 'end', 'percentage']).default('middle'),
    /** Percentage position (if position is 'percentage') */
    percentagePosition: z.number().min(0).max(100).optional(),
    /** Lock styling */
    style: z.object({
        primaryColor: z.string().optional(),
        buttonText: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
    }).optional(),
});

export const ContentLockerOutput = z.object({
    /** Content with lock inserted */
    lockedContent: z.string(),
    /** Lock HTML (for external use) */
    lockHtml: z.string(),
    /** Lock position info */
    lockPosition: z.object({
        type: z.string(),
        insertedAt: z.number(),
    }),
});

export type ContentLockerInputType = z.infer<typeof ContentLockerInput>;
export type ContentLockerOutputType = z.infer<typeof ContentLockerOutput>;

// ============================================================================
// KB RETRIEVAL
// ============================================================================

export const KBRetrievalInput = z.object({
    /** Query for semantic search */
    query: z.string(),
    /** Knowledge base ID */
    kbId: z.string().optional(),
    /** Number of results to return */
    topK: z.number().min(1).max(20).default(5),
    /** Similarity threshold (0-1) */
    threshold: z.number().min(0).max(1).default(0.7),
    /** Filter by metadata */
    metadataFilter: z.record(z.string(), z.any()).optional(),
});

export const KBRetrievalOutput = z.object({
    /** Retrieved documents */
    documents: z.array(z.object({
        id: z.string(),
        content: z.string(),
        similarity: z.number(),
        metadata: z.record(z.string(), z.any()).optional(),
        source: z.string().optional(),
    })),
    /** Formatted context string (ready for LLM) */
    formattedContext: z.string(),
    /** Embedding tokens used */
    embeddingTokens: z.number().optional(),
});

export type KBRetrievalInputType = z.infer<typeof KBRetrievalInput>;
export type KBRetrievalOutputType = z.infer<typeof KBRetrievalOutput>;
