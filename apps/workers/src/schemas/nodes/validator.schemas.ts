/**
 * VALIDATOR NODE SCHEMAS
 * Input/Output contracts for content validation nodes
 */

import { z } from 'zod';

// ============================================================================
// CONSTITUTION CHECK
// ============================================================================

export const ConstitutionCheckInput = z.object({
    /** Content to validate */
    content: z.string(),
    /** Constitution ID to validate against */
    constitutionId: z.string().optional(),
    /** Constitution rules (if not using ID) */
    rules: z.object({
        forbiddenTerms: z.array(z.string()).optional(),
        requiredTerms: z.array(z.string()).optional(),
        toneGuidelines: z.string().optional(),
        maxLength: z.number().optional(),
        minLength: z.number().optional(),
    }).optional(),
    /** Action on failure */
    onFailure: z.enum(['block', 'warn', 'rewrite']).default('warn'),
});

export const ConstitutionCheckOutput = z.object({
    /** Did content pass validation */
    passed: z.boolean(),
    /** Overall score (0-100) */
    score: z.number().min(0).max(100),
    /** Violations found */
    violations: z.array(z.object({
        type: z.enum(['forbidden_term', 'missing_required', 'tone_violation', 'length_violation', 'other']),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        description: z.string(),
        location: z.string().optional(),
        suggestion: z.string().optional(),
    })),
    /** Corrected content (if onFailure was 'rewrite') */
    correctedContent: z.string().optional(),
    /** Constitution applied */
    constitutionUsed: z.string().optional(),
});

export type ConstitutionCheckInputType = z.infer<typeof ConstitutionCheckInput>;
export type ConstitutionCheckOutputType = z.infer<typeof ConstitutionCheckOutput>;

// ============================================================================
// QUALITY GATE
// ============================================================================

export const QualityGateInput = z.object({
    /** Content to check */
    content: z.string(),
    /** Minimum quality score to pass */
    minimumScore: z.number().min(0).max(100).default(70),
    /** Quality dimensions to check */
    dimensions: z.array(z.enum([
        'readability',
        'grammar',
        'coherence',
        'relevance',
        'engagement',
        'accuracy',
        'originality',
    ])).optional(),
    /** Context for relevance check */
    context: z.string().optional(),
});

export const QualityGateOutput = z.object({
    /** Did content pass the gate */
    passed: z.boolean(),
    /** Overall quality score */
    overallScore: z.number().min(0).max(100),
    /** Scores by dimension */
    dimensionScores: z.record(z.string(), z.number()),
    /** Issues found */
    issues: z.array(z.object({
        dimension: z.string(),
        issue: z.string(),
        suggestion: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
    })),
    /** Recommended action */
    recommendation: z.enum(['approve', 'review', 'rewrite', 'reject']),
});

export type QualityGateInputType = z.infer<typeof QualityGateInput>;
export type QualityGateOutputType = z.infer<typeof QualityGateOutput>;

// ============================================================================
// FACT CHECK
// ============================================================================

export const FactCheckInput = z.object({
    /** Content to fact-check */
    content: z.string(),
    /** Claims to verify (if pre-extracted) */
    claims: z.array(z.string()).optional(),
    /** Sources to check against */
    trustedSources: z.array(z.string()).optional(),
    /** Use web search for verification */
    useWebSearch: z.boolean().default(false),
});

export const FactCheckOutput = z.object({
    /** Overall accuracy score */
    accuracyScore: z.number().min(0).max(100),
    /** Claims analyzed */
    claimsAnalyzed: z.array(z.object({
        claim: z.string(),
        verdict: z.enum(['verified', 'partially_true', 'unverified', 'false', 'opinion']),
        confidence: z.number(),
        source: z.string().optional(),
        explanation: z.string(),
    })),
    /** Summary */
    summary: z.string(),
    /** Recommendations */
    recommendations: z.array(z.string()),
});

export type FactCheckInputType = z.infer<typeof FactCheckInput>;
export type FactCheckOutputType = z.infer<typeof FactCheckOutput>;
