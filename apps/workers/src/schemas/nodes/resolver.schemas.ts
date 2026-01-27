/**
 * RESOLVER NODE SCHEMAS
 * Input/Output contracts for KB resolution nodes
 * 
 * These are the KEY innovation - they explicitly surface KB lookup steps
 * instead of hiding them inside generic AI calls.
 */

import { z } from 'zod';

// ============================================================================
// RESOLVE ICP (Ideal Customer Profile)
// ============================================================================

export const ResolveICPInput = z.object({
    /** Industry hint from input */
    industryHint: z.string().optional(),
    /** Job title hint */
    jobTitleHint: z.string().optional(),
    /** Company size hint */
    companySizeHint: z.enum(['SMB', 'MM', 'ENT', 'Startup', 'Enterprise']).optional(),
    /** Raw signal (e.g., email domain, company name) */
    rawSignal: z.string().optional(),
    /** Force specific ICP ID */
    forceIcpId: z.string().optional(),
});

export const ResolveICPOutput = z.object({
    /** Matched ICP ID */
    icpId: z.string(),
    /** Full resolved ICP segment */
    segment: z.object({
        id: z.string(),
        name: z.string(),
        industry: z.string(),
        companySize: z.string(),
        painPoints: z.array(z.string()),
        goals: z.array(z.string()),
        buyingCriteria: z.array(z.string()),
        decisionMakers: z.array(z.string()),
    }),
    /** Match confidence (0-1) */
    confidence: z.number().min(0).max(1),
    /** Reason for match */
    matchReason: z.string(),
});

export type ResolveICPInputType = z.infer<typeof ResolveICPInput>;
export type ResolveICPOutputType = z.infer<typeof ResolveICPOutput>;

// ============================================================================
// RESOLVE OFFER
// ============================================================================

export const ResolveOfferInput = z.object({
    /** ICP ID to match offer for */
    icpId: z.string().optional(),
    /** Stage in buyer journey */
    buyerStage: z.enum(['unaware', 'problem_aware', 'solution_aware', 'product_aware', 'most_aware']).optional(),
    /** Content type being generated */
    contentType: z.string().optional(),
    /** Force specific offer ID */
    forceOfferId: z.string().optional(),
});

export const ResolveOfferOutput = z.object({
    /** Matched offer ID */
    offerId: z.string(),
    /** Full offer details */
    offer: z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        valueProposition: z.string(),
        pricing: z.string().optional(),
        features: z.array(z.string()),
        benefits: z.array(z.string()),
        targetStages: z.array(z.string()),
    }),
    /** Match confidence */
    confidence: z.number().min(0).max(1),
    /** Positioning notes for this ICP */
    positioningNotes: z.string().optional(),
});

export type ResolveOfferInputType = z.infer<typeof ResolveOfferInput>;
export type ResolveOfferOutputType = z.infer<typeof ResolveOfferOutput>;

// ============================================================================
// RESOLVE ANGLE
// ============================================================================

export const ResolveAngleInput = z.object({
    /** ICP ID for angle selection */
    icpId: z.string().optional(),
    /** Offer ID for angle selection */
    offerId: z.string().optional(),
    /** Content medium */
    medium: z.enum(['email', 'web', 'social', 'ads', 'chat']).optional(),
    /** Preferred angle type */
    preferredType: z.enum(['pain', 'gain', 'fear', 'authority', 'social_proof', 'urgency']).optional(),
});

export const ResolveAngleOutput = z.object({
    /** Selected angle ID */
    angleId: z.string(),
    /** Angle details */
    angle: z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        hook: z.string(),
        emotionalTrigger: z.string(),
        proofPoints: z.array(z.string()),
    }),
    /** Why this angle was selected */
    selectionReason: z.string(),
    /** Alternative angles considered */
    alternatives: z.array(z.object({
        id: z.string(),
        name: z.string(),
        score: z.number(),
    })).optional(),
});

export type ResolveAngleInputType = z.infer<typeof ResolveAngleInput>;
export type ResolveAngleOutputType = z.infer<typeof ResolveAngleOutput>;

// ============================================================================
// RESOLVE BLUEPRINT
// ============================================================================

export const ResolveBlueprintInput = z.object({
    /** Content type */
    contentType: z.enum(['email', 'landing_page', 'blog_post', 'social_post', 'ad_copy', 'email_flow']),
    /** Target length */
    targetLength: z.enum(['short', 'medium', 'long']).optional(),
    /** Format preference */
    format: z.string().optional(),
    /** Force specific blueprint ID */
    forceBlueprintId: z.string().optional(),
});

export const ResolveBlueprintOutput = z.object({
    /** Blueprint ID */
    blueprintId: z.string(),
    /** Blueprint details */
    blueprint: z.object({
        id: z.string(),
        name: z.string(),
        contentType: z.string(),
        structure: z.array(z.object({
            section: z.string(),
            purpose: z.string(),
            guidelines: z.string(),
        })),
        exampleOutput: z.string().optional(),
    }),
    /** Usage notes */
    notes: z.string().optional(),
});

export type ResolveBlueprintInputType = z.infer<typeof ResolveBlueprintInput>;
export type ResolveBlueprintOutputType = z.infer<typeof ResolveBlueprintOutput>;

// ============================================================================
// RESOLVE CTA
// ============================================================================

export const ResolveCTAInput = z.object({
    /** Offer ID for CTA matching */
    offerId: z.string().optional(),
    /** Buyer stage */
    buyerStage: z.string().optional(),
    /** Content type */
    contentType: z.string().optional(),
    /** CTA position in content */
    position: z.enum(['primary', 'secondary', 'tertiary']).optional(),
});

export const ResolveCTAOutput = z.object({
    /** CTA ID */
    ctaId: z.string(),
    /** CTA details */
    cta: z.object({
        id: z.string(),
        text: z.string(),
        action: z.string(),
        url: z.string().optional(),
        urgency: z.enum(['low', 'medium', 'high']),
        style: z.string().optional(),
    }),
    /** Variations available */
    variations: z.array(z.string()).optional(),
});

export type ResolveCTAInputType = z.infer<typeof ResolveCTAInput>;
export type ResolveCTAOutputType = z.infer<typeof ResolveCTAOutput>;
