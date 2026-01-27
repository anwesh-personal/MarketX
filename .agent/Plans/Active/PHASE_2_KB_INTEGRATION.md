# Phase 2: KB Integration

> **Status**: ✅ COMPLETE
> **Duration**: Completed 2026-01-27
> **Dependencies**: Phase 1 (Node Redesign)

---

## Objective

Complete the Knowledge Base schema and create resolution functions that the Resolver nodes will use.

---

## Current State

**KB COMPLETE:**
- ✅ Brand (full - brand_name_exact, voice_rules, compliance)
- ✅ ICP Library (full - 10 fields including firm_size, buying_triggers)
- ✅ Offer Library (full - differentiators, proof_points, pricing_model)
- ✅ Page Blueprints (full - page_type, buyer_stage, required_sections)
- ✅ **Angles Library** - COMPLETE (axis, narrative, applies_to)
- ✅ **CTAs Library** - COMPLETE (cta_type, label, destination)
- ✅ **Layouts** - COMPLETE (layout_id, structure)
- ✅ **Email Flow Blueprints** - COMPLETE (goal, sequence_structure)
- ✅ **Reply Playbooks** - COMPLETE (scenarios, strategies)
- ✅ **Social Blueprints** - COMPLETE (platform, post_type)
- ✅ **Routing Rules** - COMPLETE (if/then rules)
- ✅ **Testing Config** - COMPLETE (per-content-type settings)
- ✅ **Guardrails** - COMPLETE (paused_patterns)
- ✅ **Learning** - COMPLETE (history, preferences)

---

## Target State

Complete KB schema matching `01-kb.docx` from client requirements.

---

## Tasks

### Task 2.1: Complete KB Zod Schemas

**File to create/update:**
```
apps/backend/src/schemas/kb.schema.ts
```

**Schemas to add:**

```typescript
// Angles Library
export const AngleSchema = z.object({
    angle_id: z.string(),
    axis: z.enum(['risk', 'speed', 'control', 'loss', 'upside', 'identity']),
    name: z.string(),
    narrative: z.string(),
    applies_to: z.object({
        icp_ids: z.array(z.string()).optional(),
        buyer_stages: z.array(BuyerStageSchema).optional(),
        offer_ids: z.array(z.string()).optional(),
    }).optional(),
});

// CTAs Library
export const CTASchema = z.object({
    cta_id: z.string(),
    cta_type: z.enum(['REPLY', 'CLICK', 'BOOK_CALL', 'DOWNLOAD', 'OTHER']),
    label: z.string(),
    destination_type: z.string(),
    destination_slug: z.string(),
    applies_to: AppliesTo.optional(),
});

// Layouts
export const LayoutSchema = z.object({
    layout_id: z.string(),
    name: z.string(),
    structure: z.array(z.string()), // ['hero', 'features', 'proof', 'cta']
    page_types: z.array(z.string()),
    applies_to: AppliesTo.optional(),
});

// Email Flow Blueprints
export const EmailFlowBlueprintSchema = z.object({
    flow_blueprint_id: z.string(),
    name: z.string(),
    goal: z.enum(['MEANINGFUL_REPLY', 'CLICK', 'BOOK_CALL']),
    length_range: z.object({ min: z.number(), max: z.number() }),
    sequence_structure: z.array(z.string()), // ['intro', 'value', 'proof', 'ask']
    default_cta_type: CTATypeSchema,
    recommended_angle_axes: z.array(AngleAxisSchema),
    applies_to: AppliesTo.optional(),
});

// Reply Playbooks
export const ReplyPlaybookSchema = z.object({
    playbook_id: z.string(),
    name: z.string(),
    scenarios: z.array(z.object({
        scenario_id: z.string(),
        description: z.string(),
        allowed_strategy_ids: z.array(z.string()),
    })),
    applies_to: AppliesTo.optional(),
});

// Reply Strategies
export const ReplyStrategySchema = z.object({
    strategy_id: z.string(),
    strategy_type: z.enum([
        'CLARIFYING_QUESTION_FIRST',
        'GUIDANCE_FIRST',
        'PAGE_FIRST',
        'CALENDAR_FIRST',
        'TWO_STEP_ESCALATION'
    ]),
    rules: z.array(z.string()),
    applies_to: AppliesTo.optional(),
});

// Social Pillars
export const SocialPillarSchema = z.object({
    pillar_id: z.string(),
    name: z.string(),
    description: z.string(),
    applies_to: AppliesTo.optional(),
});

// Social Post Blueprints
export const SocialPostBlueprintSchema = z.object({
    post_blueprint_id: z.string(),
    platform: z.enum(['LinkedIn', 'X', 'YouTube']),
    post_type: z.enum(['insight', 'narrative', 'comparison', 'proof', 'objection']),
    structure_rules: z.array(z.string()),
    applies_to: AppliesTo.optional(),
});

// Routing Rules
export const RoutingRuleSchema = z.object({
    rule_id: z.string(),
    if: z.object({
        entry_page_type: z.string().optional(),
        buyer_stage: BuyerStageSchema.optional(),
        icp_id: z.string().optional(),
    }),
    then: z.object({
        next_destination_slug: z.string(),
        preferred_cta_id: z.string().optional(),
    }),
});
```

### Task 2.2: Create KB Resolution Service

**File to create:**
```
apps/backend/src/services/kb/kbResolutionService.ts
```

**Functions to implement:**

```typescript
class KBResolutionService {
    // Get active KB by org
    async getActiveKB(orgId: string): Promise<KnowledgeBase>;
    
    // Resolve ICP from hints
    async resolveICP(
        kb: KnowledgeBase,
        hints: { industry?: string; jobTitle?: string; companySize?: string }
    ): Promise<{ icp: ICPSegment; confidence: number; reason: string }>;
    
    // Resolve Offer from hints
    async resolveOffer(
        kb: KnowledgeBase,
        hints: { category?: string; offerId?: string }
    ): Promise<{ offer: Offer; confidence: number; reason: string }>;
    
    // Select Angle based on ICP, Offer, and KB preferences
    async selectAngle(
        kb: KnowledgeBase,
        icp: ICPSegment,
        offer: Offer,
        buyerStage: BuyerStage
    ): Promise<{ angle: Angle; reason: string }>;
    
    // Select Blueprint for content type
    async selectBlueprint(
        kb: KnowledgeBase,
        contentType: 'website' | 'email_flow' | 'email_reply' | 'social',
        context: { pageType?: string; platform?: string }
    ): Promise<Blueprint>;
    
    // Select CTA based on routing rules
    async selectCTA(
        kb: KnowledgeBase,
        context: { pageType: string; buyerStage: BuyerStage; icpId: string }
    ): Promise<CTA>;
    
    // Select Layout for page
    async selectLayout(
        kb: KnowledgeBase,
        pageType: string
    ): Promise<Layout>;
    
    // Get routing suggestions
    async getRoutingSuggestions(
        kb: KnowledgeBase,
        currentPage: string,
        buyerStage: BuyerStage
    ): Promise<{ nextPage: string; condition: string }[]>;
}
```

### Task 2.3: Update KB Database Table

**Migration to create:**
```
apps/frontend/supabase/migrations/20260126000001_extend_kb_schema.sql
```

**Changes:**
- Add JSONB columns for new sections OR
- Validate that existing `data` JSONB supports new structures
- Add indexes for common lookups

### Task 2.4: Create Sample KB JSON

**File to create:**
```
apps/backend/src/seed/sample_kb.json
```

**Contents:**
- Complete KB matching all schemas
- 3 ICP segments
- 2 Offers
- 6 Angles (one per axis)
- 5 CTAs
- 3 Layouts
- 2 Email Flow Blueprints
- 3 Reply Scenarios with Strategies
- 3 Social Pillars
- 5 Social Post Blueprints
- Routing rules

### Task 2.5: Wire Resolver Nodes to KB Service

**File to modify:**
```
apps/backend/src/services/workflow/workflowExecutionService.ts
```

**Changes:**
- Import `kbResolutionService`
- Add execution handlers for resolver nodes:
  - `resolve-icp` → `kbResolutionService.resolveICP()`
  - `resolve-offer` → `kbResolutionService.resolveOffer()`
  - `resolve-angle` → `kbResolutionService.selectAngle()`
  - `resolve-blueprint` → `kbResolutionService.selectBlueprint()`
  - `resolve-cta` → `kbResolutionService.selectCTA()`

---

## Validation Checklist

- [x] All Zod schemas defined and exported
- [x] KB Resolution Service created with all functions
- [x] Sample KB JSON validates against schema
- [x] Resolver nodes execute and return proper outputs
- [x] KB data flows through pipeline correctly
- [x] Integration tests pass

---

## Test Cases

```typescript
// Test 1: Resolve ICP
const result = await kbResolutionService.resolveICP(kb, {
    industry: 'SaaS',
    jobTitle: 'VP of Marketing',
    companySize: 'MM'
});
expect(result.icp).toBeDefined();
expect(result.confidence).toBeGreaterThan(0.5);

// Test 2: Select Angle with preference
// (KB has PREFER_ANGLE for this ICP)
const angle = await kbResolutionService.selectAngle(kb, icp, offer, 'CONSIDERATION');
expect(angle.reason).toContain('KB preference');

// Test 3: Full resolution chain
// webhook → resolve-icp → resolve-offer → resolve-angle → ...
```

---

## Notes

- KB preferences from learning loop should influence selection
- Default fallbacks when no preference exists
- Confidence scores help with debugging
- All resolutions are synchronous (no LLM calls)
