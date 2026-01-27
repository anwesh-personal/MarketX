/**
 * GENERATOR NODE SCHEMAS
 * Input/Output contracts for content generation nodes
 */

import { z } from 'zod';

// ============================================================================
// COMMON GENERATOR CONFIG
// ============================================================================

export const GeneratorConfigBase = z.object({
    /** AI model to use */
    model: z.string().optional(),
    /** Temperature (0-2) */
    temperature: z.number().min(0).max(2).optional(),
    /** Max tokens */
    maxTokens: z.number().optional(),
    /** Constitution ID for guardrails */
    constitutionId: z.string().optional(),
});

// ============================================================================
// GENERATE WEBSITE PAGE
// ============================================================================

export const GenerateWebsitePageInput = z.object({
    /** Page type */
    pageType: z.enum(['landing', 'about', 'product', 'pricing', 'contact', 'blog_post']),
    /** Resolved context */
    icp: z.record(z.string(), z.any()).optional(),
    offer: z.record(z.string(), z.any()).optional(),
    angle: z.record(z.string(), z.any()).optional(),
    blueprint: z.record(z.string(), z.any()).optional(),
    /** Custom sections to include */
    sections: z.array(z.string()).optional(),
    /** Target word count */
    targetWords: z.number().optional(),
    /** Include SEO optimization */
    includeSeo: z.boolean().default(true),
}).merge(GeneratorConfigBase);

export const GenerateWebsitePageOutput = z.object({
    /** Generated HTML */
    html: z.string(),
    /** Plain text version */
    plainText: z.string(),
    /** SEO metadata */
    seo: z.object({
        title: z.string(),
        metaDescription: z.string(),
        keywords: z.array(z.string()),
        ogImage: z.string().optional(),
    }).optional(),
    /** Section breakdown */
    sections: z.array(z.object({
        id: z.string(),
        type: z.string(),
        content: z.string(),
    })),
    /** Token usage */
    tokensUsed: z.number(),
});

export type GenerateWebsitePageInputType = z.infer<typeof GenerateWebsitePageInput>;
export type GenerateWebsitePageOutputType = z.infer<typeof GenerateWebsitePageOutput>;

// ============================================================================
// GENERATE WEBSITE BUNDLE
// ============================================================================

export const GenerateWebsiteBundleInput = z.object({
    /** Pages to generate */
    pages: z.array(z.object({
        type: z.string(),
        path: z.string(),
        title: z.string(),
    })),
    /** Brand settings */
    brand: z.object({
        name: z.string(),
        primaryColor: z.string().optional(),
        logo: z.string().optional(),
    }).optional(),
    /** Include navigation */
    includeNav: z.boolean().default(true),
    /** Resolved context */
    icp: z.record(z.string(), z.any()).optional(),
    offer: z.record(z.string(), z.any()).optional(),
}).merge(GeneratorConfigBase);

export const GenerateWebsiteBundleOutput = z.object({
    /** Generated pages */
    pages: z.array(z.object({
        path: z.string(),
        title: z.string(),
        html: z.string(),
        plainText: z.string(),
    })),
    /** Navigation structure */
    navigation: z.array(z.object({
        label: z.string(),
        path: z.string(),
    })),
    /** Total tokens used */
    totalTokensUsed: z.number(),
});

export type GenerateWebsiteBundleInputType = z.infer<typeof GenerateWebsiteBundleInput>;
export type GenerateWebsiteBundleOutputType = z.infer<typeof GenerateWebsiteBundleOutput>;

// ============================================================================
// GENERATE EMAIL FLOW
// ============================================================================

export const GenerateEmailFlowInput = z.object({
    /** Flow type */
    flowType: z.enum(['welcome', 'nurture', 'sales', 'onboarding', 're-engagement']),
    /** Number of emails in sequence */
    emailCount: z.number().min(1).max(10).default(5),
    /** Delays between emails */
    delays: z.array(z.object({
        value: z.number(),
        unit: z.enum(['hours', 'days']),
    })).optional(),
    /** Resolved context */
    icp: z.record(z.string(), z.any()).optional(),
    offer: z.record(z.string(), z.any()).optional(),
    angle: z.record(z.string(), z.any()).optional(),
}).merge(GeneratorConfigBase);

export const GenerateEmailFlowOutput = z.object({
    /** Flow name */
    flowName: z.string(),
    /** Emails in sequence */
    emails: z.array(z.object({
        position: z.number(),
        subject: z.string(),
        preheader: z.string().optional(),
        bodyHtml: z.string(),
        bodyText: z.string(),
        cta: z.object({
            text: z.string(),
            url: z.string(),
        }),
        delayAfterPrevious: z.object({
            value: z.number(),
            unit: z.string(),
        }).optional(),
    })),
    /** Total tokens used */
    totalTokensUsed: z.number(),
});

export type GenerateEmailFlowInputType = z.infer<typeof GenerateEmailFlowInput>;
export type GenerateEmailFlowOutputType = z.infer<typeof GenerateEmailFlowOutput>;

// ============================================================================
// GENERATE EMAIL REPLY
// ============================================================================

export const GenerateEmailReplyInput = z.object({
    /** Original email to reply to */
    originalEmail: z.object({
        from: z.string(),
        subject: z.string(),
        body: z.string(),
    }),
    /** Thread context (previous emails) */
    threadContext: z.array(z.string()).optional(),
    /** Detected intent */
    detectedIntent: z.string().optional(),
    /** Reply strategy */
    strategy: z.enum(['answer_question', 'schedule_call', 'provide_info', 'close_deal', 'handle_objection']).optional(),
    /** Resolved context */
    icp: z.record(z.string(), z.any()).optional(),
    offer: z.record(z.string(), z.any()).optional(),
}).merge(GeneratorConfigBase);

export const GenerateEmailReplyOutput = z.object({
    /** Reply subject (may include Re:) */
    subject: z.string(),
    /** Reply body HTML */
    bodyHtml: z.string(),
    /** Reply body plain text */
    bodyText: z.string(),
    /** Suggested follow-up actions */
    suggestedActions: z.array(z.string()).optional(),
    /** Tokens used */
    tokensUsed: z.number(),
});

export type GenerateEmailReplyInputType = z.infer<typeof GenerateEmailReplyInput>;
export type GenerateEmailReplyOutputType = z.infer<typeof GenerateEmailReplyOutput>;

// ============================================================================
// GENERATE SOCIAL POST
// ============================================================================

export const GenerateSocialPostInput = z.object({
    /** Platform */
    platform: z.enum(['linkedin', 'twitter', 'facebook', 'instagram', 'threads']),
    /** Post type */
    postType: z.enum(['thought_leadership', 'announcement', 'engagement', 'promotional', 'educational']),
    /** Topic/theme */
    topic: z.string(),
    /** Include hashtags */
    includeHashtags: z.boolean().default(true),
    /** Character limit override */
    characterLimit: z.number().optional(),
    /** Resolved context */
    icp: z.record(z.string(), z.any()).optional(),
    angle: z.record(z.string(), z.any()).optional(),
}).merge(GeneratorConfigBase);

export const GenerateSocialPostOutput = z.object({
    /** Post content */
    content: z.string(),
    /** Hashtags (separate for easy editing) */
    hashtags: z.array(z.string()),
    /** Character count */
    characterCount: z.number(),
    /** Suggested image prompt */
    imagePrompt: z.string().optional(),
    /** Best posting times */
    suggestedPostTimes: z.array(z.string()).optional(),
    /** Tokens used */
    tokensUsed: z.number(),
});

export type GenerateSocialPostInputType = z.infer<typeof GenerateSocialPostInput>;
export type GenerateSocialPostOutputType = z.infer<typeof GenerateSocialPostOutput>;
