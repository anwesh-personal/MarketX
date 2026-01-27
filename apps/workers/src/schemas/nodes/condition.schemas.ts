/**
 * CONDITION NODE SCHEMAS
 * Input/Output contracts for flow control/routing nodes
 */

import { z } from 'zod';

// ============================================================================
// ROUTE BY STAGE (Buyer Journey)
// ============================================================================

export const RouteByStageInput = z.object({
    /** Current stage detected */
    stage: z.enum(['unaware', 'problem_aware', 'solution_aware', 'product_aware', 'most_aware']).optional(),
    /** Data to analyze for stage detection */
    analysisData: z.string().optional(),
    /** ICP context for better detection */
    icpContext: z.record(z.string(), z.any()).optional(),
});

export const RouteByStageOutput = z.object({
    /** Detected/confirmed stage */
    stage: z.string(),
    /** Confidence in detection */
    confidence: z.number().min(0).max(1),
    /** Recommended path (branch key) */
    recommendedPath: z.string(),
    /** Stage indicators found */
    indicators: z.array(z.string()),
    /** Continue to this branch */
    branch: z.string(),
});

export type RouteByStageInputType = z.infer<typeof RouteByStageInput>;
export type RouteByStageOutputType = z.infer<typeof RouteByStageOutput>;

// ============================================================================
// ROUTE BY VALIDATION
// ============================================================================

export const RouteByValidationInput = z.object({
    /** Validation result from previous node */
    validationResult: z.object({
        passed: z.boolean(),
        score: z.number().optional(),
        violations: z.array(z.any()).optional(),
    }),
    /** Pass threshold (if using score) */
    passThreshold: z.number().optional(),
});

export const RouteByValidationOutput = z.object({
    /** Which branch to take */
    branch: z.enum(['pass', 'fail', 'review']),
    /** Reason for routing decision */
    reason: z.string(),
    /** Pass the original result through */
    validationDetails: z.record(z.string(), z.any()).optional(),
});

export type RouteByValidationInputType = z.infer<typeof RouteByValidationInput>;
export type RouteByValidationOutputType = z.infer<typeof RouteByValidationOutput>;

// ============================================================================
// ROUTE BY CONTENT TYPE
// ============================================================================

export const RouteByContentTypeInput = z.object({
    /** Requested content type */
    contentType: z.string(),
    /** Supported content types (branches) */
    supportedTypes: z.array(z.string()).optional(),
    /** Default branch if type not recognized */
    defaultBranch: z.string().optional(),
});

export const RouteByContentTypeOutput = z.object({
    /** Content type normalized */
    contentType: z.string(),
    /** Branch to route to */
    branch: z.string(),
    /** Is this a recognized type */
    isRecognized: z.boolean(),
});

export type RouteByContentTypeInputType = z.infer<typeof RouteByContentTypeInput>;
export type RouteByContentTypeOutputType = z.infer<typeof RouteByContentTypeOutput>;

// ============================================================================
// IF-ELSE CONDITION
// ============================================================================

export const IfElseConditionInput = z.object({
    /** Value to evaluate */
    value: z.any(),
    /** Condition type */
    conditionType: z.enum([
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'greater_than',
        'less_than',
        'is_empty',
        'is_not_empty',
        'regex_match',
        'starts_with',
        'ends_with',
        'is_true',
        'is_false',
    ]),
    /** Comparison value */
    compareValue: z.any().optional(),
    /** Case sensitive (for string ops) */
    caseSensitive: z.boolean().default(false),
});

export const IfElseConditionOutput = z.object({
    /** Result of condition evaluation */
    result: z.boolean(),
    /** Which branch to take */
    branch: z.enum(['if', 'else']),
    /** Evaluation details */
    evaluationDetails: z.object({
        value: z.any(),
        condition: z.string(),
        compareValue: z.any(),
    }),
});

export type IfElseConditionInputType = z.infer<typeof IfElseConditionInput>;
export type IfElseConditionOutputType = z.infer<typeof IfElseConditionOutput>;

// ============================================================================
// SWITCH CONDITION
// ============================================================================

export const SwitchConditionInput = z.object({
    /** Value to switch on */
    value: z.any(),
    /** Cases to match */
    cases: z.array(z.object({
        value: z.any(),
        branch: z.string(),
    })),
    /** Default branch */
    defaultBranch: z.string().default('default'),
});

export const SwitchConditionOutput = z.object({
    /** Matched branch */
    branch: z.string(),
    /** Was a case matched (vs default) */
    matched: z.boolean(),
    /** Original value */
    value: z.any(),
});

export type SwitchConditionInputType = z.infer<typeof SwitchConditionInput>;
export type SwitchConditionOutputType = z.infer<typeof SwitchConditionOutput>;

// ============================================================================
// LOOP FOREACH
// ============================================================================

export const LoopForeachInput = z.object({
    /** Array to iterate */
    items: z.array(z.any()),
    /** Max iterations (safety limit) */
    maxIterations: z.number().optional(),
    /** Batch size (for parallel processing) */
    batchSize: z.number().optional(),
});

export const LoopForeachOutput = z.object({
    /** Current item */
    item: z.any(),
    /** Current index (0-based) */
    index: z.number(),
    /** Total items */
    total: z.number(),
    /** Is this the last item */
    isLast: z.boolean(),
    /** Is this the first item */
    isFirst: z.boolean(),
});

export type LoopForeachInputType = z.infer<typeof LoopForeachInput>;
export type LoopForeachOutputType = z.infer<typeof LoopForeachOutput>;

// ============================================================================
// DELAY/WAIT
// ============================================================================

export const DelayWaitInput = z.object({
    /** Duration value */
    duration: z.number(),
    /** Duration unit */
    unit: z.enum(['milliseconds', 'seconds', 'minutes', 'hours', 'days']),
    /** Continue at specific time (alternative to duration) */
    continueAt: z.string().optional(),
});

export const DelayWaitOutput = z.object({
    /** When delay started */
    delayStarted: z.string(),
    /** When delay ended */
    delayEnded: z.string(),
    /** Actual duration in ms */
    actualDurationMs: z.number(),
});

export type DelayWaitInputType = z.infer<typeof DelayWaitInput>;
export type DelayWaitOutputType = z.infer<typeof DelayWaitOutput>;
