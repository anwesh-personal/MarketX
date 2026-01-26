/**
 * NODE SCHEMAS
 * Zod schemas defining input/output contracts for all workflow nodes.
 * 
 * DESIGN PRINCIPLES:
 * - Every node has explicit input and output types
 * - Outputs are structured (not raw strings)
 * - Schemas are compositional (reuse common types)
 * - Future node types extend the base patterns
 */

import { z } from 'zod';

// ============================================================================
// COMMON TYPES (Reused across nodes)
// ============================================================================

export const BuyerStageSchema = z.enum([
    'UNAWARE',
    'PROBLEM_AWARE',
    'SOLUTION_AWARE',
    'PRODUCT_AWARE',
    'MOST_AWARE'
]);

export const ContentTypeSchema = z.enum([
    'website_page',
    'website_bundle',
    'email_flow',
    'email_reply',
    'social_post',
    // Future extensions:
    'podcast_script',
    'webinar_outline',
    'case_study',
    'whitepaper',
    'ad_copy',
]);

export const PlatformSchema = z.enum([
    'LinkedIn',
    'X',
    'YouTube',
    'Instagram',
    'TikTok',
    'Facebook',
]);

export const AngleAxisSchema = z.enum([
    'risk',
    'speed',
    'control',
    'loss',
    'upside',
    'identity',
]);

// Confidence score for resolution operations
export const ConfidenceSchema = z.number().min(0).max(1);

// Base metadata for all node outputs
export const NodeOutputMetaSchema = z.object({
    nodeId: z.string(),
    nodeType: z.string(),
    executedAt: z.string().datetime(),
    durationMs: z.number().optional(),
});

// ============================================================================
// TRIGGER NODE SCHEMAS
// ============================================================================

export const WebhookTriggerInputSchema = z.object({
    headers: z.record(z.string()).optional(),
    body: z.any(),
    query: z.record(z.string()).optional(),
    method: z.enum(['GET', 'POST', 'PUT']).optional(),
});

export const WebhookTriggerOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    payload: z.any(),
    source: z.string().optional(),
    receivedAt: z.string().datetime(),
});

export const ScheduleTriggerInputSchema = z.object({
    scheduleExpression: z.string(), // Cron format
    timezone: z.string().default('America/New_York'),
    lastRunAt: z.string().datetime().optional(),
});

export const ScheduleTriggerOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    triggeredAt: z.string().datetime(),
    isScheduled: z.literal(true),
    previousCalendarDay: z.string(), // YYYY-MM-DD
});

export const ManualTriggerInputSchema = z.object({
    testMode: z.boolean().default(false),
    mockData: z.any().optional(),
});

export const ManualTriggerOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    triggeredBy: z.string().optional(), // User ID
    testMode: z.boolean(),
    input: z.any(),
});

// ============================================================================
// RESOLVER NODE SCHEMAS
// These nodes query the KB and return structured context
// ============================================================================

// --- Resolve ICP ---
export const ResolveICPInputSchema = z.object({
    // Hints for matching
    industryHint: z.string().optional(),
    jobTitleHint: z.string().optional(),
    companySizeHint: z.enum(['SMB', 'LMM', 'MM', 'ENT']).optional(),
    revenueHint: z.string().optional(),
    // Direct specification (if known)
    icpId: z.string().optional(),
    // Raw signal for AI matching
    rawSignal: z.string().optional(), // e.g., email domain, LinkedIn profile
});

export const ResolveICPOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    icpId: z.string(),
    segment: z.object({
        icp_id: z.string(),
        name: z.string(),
        industry_group_norm: z.string(),
        seniority_norm: z.string(),
        revenue_band_norm: z.string().optional(),
        pain_points: z.array(z.string()),
        job_titles: z.array(z.string()),
        buying_triggers: z.array(z.string()).optional(),
        decision_criteria: z.array(z.string()).optional(),
    }),
    confidence: ConfidenceSchema,
    matchReason: z.string(),
});

// --- Resolve Offer ---
export const ResolveOfferInputSchema = z.object({
    // Hints for matching
    categoryHint: z.string().optional(),
    priceRangeHint: z.string().optional(),
    // Direct specification
    offerId: z.string().optional(),
    // Context-based matching
    icpId: z.string().optional(), // Match best offer for this ICP
});

export const ResolveOfferOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    offerId: z.string(),
    offer: z.object({
        offer_id: z.string(),
        offer_name: z.string(),
        category: z.string(),
        value_proposition: z.string(),
        differentiators: z.array(z.string()),
        pricing_model: z.string().optional(),
        delivery_timeline: z.string().optional(),
        proof_points: z.array(z.string()),
    }),
    confidence: ConfidenceSchema,
    matchReason: z.string(),
});

// --- Resolve Angle ---
export const ResolveAngleInputSchema = z.object({
    icpId: z.string(),
    offerId: z.string().optional(),
    buyerStage: BuyerStageSchema.optional(),
    // Preference override
    preferredAxis: AngleAxisSchema.optional(),
});

export const ResolveAngleOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    angleId: z.string(),
    angle: z.object({
        angle_id: z.string(),
        name: z.string(),
        axis: AngleAxisSchema,
        narrative: z.string(),
    }),
    selectionReason: z.string(), // "KB preference" or "Default for ICP"
    wasKBPreference: z.boolean(),
});

// --- Resolve Blueprint ---
export const ResolveBlueprintInputSchema = z.object({
    contentType: ContentTypeSchema,
    // Type-specific filters
    pageType: z.string().optional(), // For website: LANDING, HOW_IT_WORKS, etc.
    flowGoal: z.enum(['MEANINGFUL_REPLY', 'CLICK', 'BOOK_CALL']).optional(),
    platform: PlatformSchema.optional(),
    postType: z.string().optional(),
    // Context
    icpId: z.string().optional(),
    buyerStage: BuyerStageSchema.optional(),
});

export const ResolveBlueprintOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    blueprintId: z.string(),
    blueprintType: ContentTypeSchema,
    blueprint: z.any(), // Type varies by content type
    layoutId: z.string().optional(),
    layout: z.object({
        layout_id: z.string(),
        structure: z.array(z.string()),
    }).optional(),
});

// --- Resolve CTA ---
export const ResolveCTAInputSchema = z.object({
    context: z.object({
        pageType: z.string().optional(),
        buyerStage: BuyerStageSchema.optional(),
        icpId: z.string().optional(),
        entryPoint: z.string().optional(),
    }),
    preferredType: z.enum(['REPLY', 'CLICK', 'BOOK_CALL', 'DOWNLOAD', 'OTHER']).optional(),
});

export const ResolveCTAOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    ctaId: z.string(),
    cta: z.object({
        cta_id: z.string(),
        cta_type: z.enum(['REPLY', 'CLICK', 'BOOK_CALL', 'DOWNLOAD', 'OTHER']),
        label: z.string(),
        destination_type: z.string(),
        destination_slug: z.string(),
    }),
    routingContext: z.object({
        nextPageSlug: z.string().optional(),
        condition: z.string().optional(),
    }).optional(),
});

// ============================================================================
// GENERATOR NODE SCHEMAS
// These nodes produce content using KB context
// ============================================================================

// Base input shared by all generators
export const GeneratorBaseInputSchema = z.object({
    icp: ResolveICPOutputSchema.shape.segment,
    offer: ResolveOfferOutputSchema.shape.offer.optional(),
    angle: ResolveAngleOutputSchema.shape.angle,
    kbId: z.string(), // Reference to full KB
});

// --- Generate Website Page ---
export const GenerateWebsitePageInputSchema = GeneratorBaseInputSchema.extend({
    pageType: z.string(),
    blueprint: z.any(),
    layout: z.object({
        layout_id: z.string(),
        structure: z.array(z.string()),
    }),
    cta: ResolveCTAOutputSchema.shape.cta,
    buyerStage: BuyerStageSchema,
});

export const ContentSectionSchema = z.object({
    sectionId: z.string(),
    sectionType: z.string(),
    contentMarkdown: z.string(),
});

export const PageOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    pageId: z.string(),
    variantId: z.string(),
    slug: z.string(),
    pageType: z.string(),
    buyerStage: BuyerStageSchema,
    layoutId: z.string(),
    angleId: z.string(),
    contentSections: z.array(ContentSectionSchema),
    primaryCta: z.object({
        ctaType: z.string(),
        label: z.string(),
        destinationSlug: z.string(),
    }),
    supportingCtas: z.array(z.object({
        ctaType: z.string(),
        label: z.string(),
        destinationSlug: z.string(),
    })),
    routingSuggestions: z.array(z.object({
        nextPageSlug: z.string(),
        condition: z.string(),
    })),
});

// --- Generate Website Bundle ---
export const GenerateWebsiteBundleInputSchema = GeneratorBaseInputSchema.extend({
    pageTypes: z.array(z.string()),
    includeRouting: z.boolean().default(true),
});

export const WebsiteBundleOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    type: z.literal('website_bundle'),
    bundleId: z.string(),
    generatedAt: z.string().datetime(),
    pages: z.array(PageOutputSchema.omit({ meta: true })),
    routingMap: z.record(z.string(), z.string()).optional(),
});

// --- Generate Email Flow ---
export const GenerateEmailFlowInputSchema = GeneratorBaseInputSchema.extend({
    flowBlueprint: z.object({
        flow_blueprint_id: z.string(),
        goal: z.enum(['MEANINGFUL_REPLY', 'CLICK', 'BOOK_CALL']),
        length_range: z.object({ min: z.number(), max: z.number() }),
        sequence_structure: z.array(z.string()),
        default_cta_type: z.string(),
    }),
    emailCount: z.number().min(1).max(10).optional(),
});

export const EmailOutputSchema = z.object({
    emailId: z.string(),
    position: z.number(),
    subjectVariantId: z.string(),
    subject: z.string(),
    firstLine: z.string(),
    bodyMarkdown: z.string(),
    cta: z.object({
        ctaType: z.string(),
        label: z.string(),
        destinationSlug: z.string(),
    }).nullable(),
    delayFromPreviousHours: z.number(),
});

export const EmailFlowBundleOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    type: z.literal('email_flow_bundle'),
    bundleId: z.string(),
    generatedAt: z.string().datetime(),
    flows: z.array(z.object({
        flowId: z.string(),
        variantId: z.string(),
        flowBlueprintId: z.string(),
        goal: z.string(),
        angleId: z.string(),
        sequence: z.array(EmailOutputSchema),
    })),
});

// --- Generate Email Reply ---
export const GenerateEmailReplyInputSchema = z.object({
    incomingEmail: z.object({
        subject: z.string(),
        body: z.string(),
        sender: z.string(),
        threadContext: z.array(z.string()).optional(),
    }),
    detectedScenario: z.string(),
    playbook: z.object({
        playbook_id: z.string(),
        scenarios: z.array(z.object({
            scenario_id: z.string(),
            allowed_strategy_ids: z.array(z.string()),
        })),
    }),
    strategy: z.object({
        strategy_id: z.string(),
        strategy_type: z.enum([
            'CLARIFYING_QUESTION_FIRST',
            'GUIDANCE_FIRST',
            'PAGE_FIRST',
            'CALENDAR_FIRST',
            'TWO_STEP_ESCALATION',
        ]),
        rules: z.array(z.string()),
    }),
    kbId: z.string(),
});

export const EmailReplyOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    type: z.literal('email_reply_bundle'),
    bundleId: z.string(),
    generatedAt: z.string().datetime(),
    replies: z.array(z.object({
        replyId: z.string(),
        variantId: z.string(),
        scenarioId: z.string(),
        strategyId: z.string(),
        replyMarkdown: z.string(),
        cta: z.object({
            ctaType: z.string(),
            label: z.string(),
            destinationSlug: z.string(),
        }).nullable(),
    })),
});

// --- Generate Social Post ---
export const GenerateSocialPostInputSchema = GeneratorBaseInputSchema.extend({
    platform: PlatformSchema,
    postBlueprint: z.object({
        post_blueprint_id: z.string(),
        platform: PlatformSchema,
        post_type: z.enum(['insight', 'narrative', 'comparison', 'proof', 'objection']),
        structure_rules: z.array(z.string()),
    }),
    pillar: z.object({
        pillar_id: z.string(),
        name: z.string(),
        description: z.string(),
    }).optional(),
});

export const SocialPostOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    type: z.literal('social_post_bundle'),
    bundleId: z.string(),
    generatedAt: z.string().datetime(),
    posts: z.array(z.object({
        postId: z.string(),
        variantId: z.string(),
        platform: PlatformSchema,
        postType: z.string(),
        pillarId: z.string().optional(),
        angleId: z.string(),
        contentMarkdown: z.string(),
        hashtags: z.array(z.string()),
        cta: z.object({
            ctaType: z.string(),
            label: z.string(),
            destinationSlug: z.string(),
        }).nullable(),
    })),
});

// ============================================================================
// PROCESSOR NODE SCHEMAS
// ============================================================================

// --- Analyze Intent ---
export const AnalyzeIntentInputSchema = z.object({
    content: z.string(),
    contentType: z.enum(['email', 'chat', 'form_submission', 'social_mention']),
    context: z.record(z.string()).optional(),
});

export const AnalyzeIntentOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    primaryIntent: z.string(),
    detectedScenario: z.string().optional(),
    sentiment: z.enum(['positive', 'neutral', 'negative']),
    urgency: z.enum(['low', 'medium', 'high']),
    topics: z.array(z.string()),
    suggestedActions: z.array(z.string()),
    confidence: ConfidenceSchema,
});

// --- Web Search ---
export const WebSearchInputSchema = z.object({
    query: z.string(),
    maxResults: z.number().default(5),
    dateFilter: z.enum(['day', 'week', 'month', 'year', 'any']).optional(),
    domainFilter: z.array(z.string()).optional(),
});

export const WebSearchOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    query: z.string(),
    results: z.array(z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
        source: z.string(),
        publishedDate: z.string().optional(),
    })),
    synthesizedContext: z.string().optional(),
});

// --- SEO Optimize ---
export const SEOOptimizeInputSchema = z.object({
    content: z.string(),
    targetKeyword: z.string(),
    secondaryKeywords: z.array(z.string()).optional(),
    contentType: z.enum(['blog', 'landing_page', 'product_page']),
});

export const SEOOptimizeOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    optimizedContent: z.string(),
    metaTitle: z.string(),
    metaDescription: z.string(),
    headingStructure: z.array(z.object({
        level: z.number(),
        text: z.string(),
    })),
    keywordDensity: z.record(z.string(), z.number()),
    suggestions: z.array(z.string()),
    score: z.number().min(0).max(100),
});

// --- Content Locker ---
export const ContentLockerInputSchema = z.object({
    content: z.string(),
    gatePoints: z.array(z.object({
        afterSection: z.string(),
        gateType: z.enum(['email', 'social_share', 'payment']),
        unlockCondition: z.string(),
    })),
});

export const ContentLockerOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    gatedContent: z.string(),
    gates: z.array(z.object({
        gateId: z.string(),
        position: z.string(),
        gateType: z.string(),
        captureFields: z.array(z.string()),
    })),
    analyticsHooks: z.array(z.object({
        event: z.string(),
        gateId: z.string(),
    })),
});

// ============================================================================
// VALIDATOR NODE SCHEMAS
// ============================================================================

// --- Validate Constitution ---
export const ValidateConstitutionInputSchema = z.object({
    content: z.string(),
    constitutionId: z.string().optional(),
    rules: z.object({
        forbiddenTerms: z.array(z.string()).optional(),
        requiredElements: z.array(z.string()).optional(),
        toneRules: z.array(z.string()).optional(),
        complianceRules: z.array(z.string()).optional(),
    }).optional(),
});

export const ValidateConstitutionOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    isValid: z.boolean(),
    violations: z.array(z.object({
        ruleType: z.string(),
        rule: z.string(),
        location: z.string().optional(),
        severity: z.enum(['error', 'warning']),
        suggestion: z.string().optional(),
    })),
    score: z.number().min(0).max(100),
    autoFixedContent: z.string().optional(),
});

// --- Quality Gate ---
export const QualityGateInputSchema = z.object({
    content: z.string(),
    contentType: ContentTypeSchema,
    thresholds: z.object({
        minScore: z.number().default(70),
        maxIssues: z.number().default(3),
    }).optional(),
});

export const QualityGateOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    passed: z.boolean(),
    overallScore: z.number().min(0).max(100),
    dimensions: z.object({
        clarity: z.number(),
        engagement: z.number(),
        accuracy: z.number(),
        brandAlignment: z.number(),
    }),
    issues: z.array(z.object({
        type: z.string(),
        description: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
    })),
    recommendedAction: z.enum(['approve', 'review', 'reject']),
});

// ============================================================================
// CONDITION NODE SCHEMAS
// ============================================================================

// --- Route by Stage ---
export const RouteByStageInputSchema = z.object({
    buyerStage: BuyerStageSchema,
});

export const RouteByStageOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    selectedBranch: BuyerStageSchema,
    branchIndex: z.number(), // 0-4
});

// --- Route by Validation ---
export const RouteByValidationInputSchema = z.object({
    validationResult: z.object({
        isValid: z.boolean(),
        score: z.number().optional(),
    }),
});

export const RouteByValidationOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    selectedBranch: z.enum(['pass', 'fail']),
    branchIndex: z.number(), // 0 or 1
});

// --- Route by Type ---
export const RouteByTypeInputSchema = z.object({
    contentType: ContentTypeSchema,
});

export const RouteByTypeOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    selectedBranch: ContentTypeSchema,
    branchIndex: z.number(),
});

// ============================================================================
// OUTPUT NODE SCHEMAS
// ============================================================================

// --- Output Webhook ---
export const OutputWebhookInputSchema = z.object({
    payload: z.any(),
    webhookUrl: z.string().url().optional(), // If not set, uses engine config
    headers: z.record(z.string()).optional(),
    method: z.enum(['POST', 'PUT']).default('POST'),
});

export const OutputWebhookOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    sent: z.boolean(),
    statusCode: z.number().optional(),
    responseBody: z.any().optional(),
    error: z.string().optional(),
});

// --- Output Store ---
export const OutputStoreInputSchema = z.object({
    content: z.any(),
    contentType: ContentTypeSchema,
    variantId: z.string(),
    metadata: z.record(z.any()).optional(),
    tags: z.array(z.string()).optional(),
});

export const OutputStoreOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    stored: z.boolean(),
    storageId: z.string(),
    version: z.number(),
    retrievalUrl: z.string().optional(),
});

// --- Output Analytics ---
export const OutputAnalyticsInputSchema = z.object({
    eventType: z.enum([
        'CONTENT_GENERATED',
        'VARIANT_CREATED',
        'VALIDATION_PASSED',
        'VALIDATION_FAILED',
        'WORKFLOW_COMPLETED',
    ]),
    assetType: ContentTypeSchema,
    assetId: z.string(),
    variantId: z.string(),
    context: z.object({
        icpId: z.string().optional(),
        offerId: z.string().optional(),
        angleId: z.string().optional(),
        buyerStage: BuyerStageSchema.optional(),
    }),
});

export const OutputAnalyticsOutputSchema = z.object({
    meta: NodeOutputMetaSchema,
    logged: z.boolean(),
    eventId: z.string(),
});

// ============================================================================
// TYPE EXPORTS (for TypeScript inference)
// ============================================================================

export type BuyerStage = z.infer<typeof BuyerStageSchema>;
export type ContentType = z.infer<typeof ContentTypeSchema>;
export type Platform = z.infer<typeof PlatformSchema>;
export type AngleAxis = z.infer<typeof AngleAxisSchema>;

// Trigger outputs
export type WebhookTriggerOutput = z.infer<typeof WebhookTriggerOutputSchema>;
export type ScheduleTriggerOutput = z.infer<typeof ScheduleTriggerOutputSchema>;
export type ManualTriggerOutput = z.infer<typeof ManualTriggerOutputSchema>;

// Resolver outputs
export type ResolveICPOutput = z.infer<typeof ResolveICPOutputSchema>;
export type ResolveOfferOutput = z.infer<typeof ResolveOfferOutputSchema>;
export type ResolveAngleOutput = z.infer<typeof ResolveAngleOutputSchema>;
export type ResolveBlueprintOutput = z.infer<typeof ResolveBlueprintOutputSchema>;
export type ResolveCTAOutput = z.infer<typeof ResolveCTAOutputSchema>;

// Generator outputs
export type PageOutput = z.infer<typeof PageOutputSchema>;
export type WebsiteBundleOutput = z.infer<typeof WebsiteBundleOutputSchema>;
export type EmailFlowBundleOutput = z.infer<typeof EmailFlowBundleOutputSchema>;
export type EmailReplyOutput = z.infer<typeof EmailReplyOutputSchema>;
export type SocialPostOutput = z.infer<typeof SocialPostOutputSchema>;

// Processor outputs
export type AnalyzeIntentOutput = z.infer<typeof AnalyzeIntentOutputSchema>;
export type WebSearchOutput = z.infer<typeof WebSearchOutputSchema>;
export type SEOOptimizeOutput = z.infer<typeof SEOOptimizeOutputSchema>;
export type ContentLockerOutput = z.infer<typeof ContentLockerOutputSchema>;

// Validator outputs
export type ValidateConstitutionOutput = z.infer<typeof ValidateConstitutionOutputSchema>;
export type QualityGateOutput = z.infer<typeof QualityGateOutputSchema>;

// Condition outputs
export type RouteByStageOutput = z.infer<typeof RouteByStageOutputSchema>;
export type RouteByValidationOutput = z.infer<typeof RouteByValidationOutputSchema>;
export type RouteByTypeOutput = z.infer<typeof RouteByTypeOutputSchema>;

// Output node outputs
export type OutputWebhookOutput = z.infer<typeof OutputWebhookOutputSchema>;
export type OutputStoreOutput = z.infer<typeof OutputStoreOutputSchema>;
export type OutputAnalyticsOutput = z.infer<typeof OutputAnalyticsOutputSchema>;
