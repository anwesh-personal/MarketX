# Phase 3: Generator Nodes

> **Status**: 🟢 COMPLETE
> **Duration**: 5-7 days
> **Dependencies**: Phase 2 (KB Integration)

---

## Objective

Connect generator nodes to the intelligent `writer.engine.ts` logic instead of generic LLM calls. Each generator produces content matching the client's output schemas.

---

## Current State

**`generate-llm` node:**
- Generic AI call via `aiService.call(prompt, options)`
- No KB awareness
- No structure enforcement
- Output is raw text

**`writer.engine.ts`:**
- KB-aware content assembly
- Deterministic section building
- Proper output schemas
- NOT connected to workflow builder

---

## Target State

**5 specialized generator nodes:**
- Each uses KB context from resolver nodes
- Each produces structured output matching client schemas
- Each uses `writer.engine.ts` logic (or similar)

---

## Generator Node Specifications

### 1. `generate-website-page`

**Input:**
```typescript
{
    icp: ICPSegment,              // From resolve-icp
    offer: Offer,                 // From resolve-offer
    angle: Angle,                 // From resolve-angle
    blueprint: PageBlueprint,     // From resolve-blueprint
    layout: Layout,               // From resolve-blueprint
    cta: CTA,                     // From resolve-cta
    kb: KnowledgeBase,           // Full KB reference
}
```

**Output:** `PageOutput` schema
```typescript
{
    page_id: string,
    variant_id: string,
    slug: string,
    page_type: string,
    buyer_stage: BuyerStage,
    layout_id: string,
    angle_id: string,
    content_sections: ContentSection[],
    primary_cta: CTAOutput,
    supporting_ctas: CTAOutput[],
    routing_suggestions: RoutingSuggestion[],
}
```

**Logic:**
1. Get layout structure from `layout.structure[]`
2. For each section type, call `buildSectionContent()`
3. Section builders use ICP pain points, offer value props, angle narrative
4. LLM only for the "creative glue" between structured elements
5. Apply brand voice rules from KB

---

### 2. `generate-website-bundle`

**Input:**
```typescript
{
    page_types: PageType[],       // ['LANDING', 'HOW_IT_WORKS', 'PRICING']
    icp: ICPSegment,
    offer: Offer,
    kb: KnowledgeBase,
}
```

**Output:** `WebsiteBundle` schema
```typescript
{
    type: 'website_bundle',
    bundle_id: string,
    generated_at: string,
    pages: PageOutput[],
    routing_map: RoutingMap,
}
```

**Logic:**
1. For each page_type, internally call `generate-website-page` logic
2. Build routing map based on KB routing rules
3. Ensure consistent variant_id across pages
4. Cross-reference CTAs to ensure proper linking

---

### 3. `generate-email-flow`

**Input:**
```typescript
{
    flow_blueprint: EmailFlowBlueprint,
    icp: ICPSegment,
    offer: Offer,
    angle: Angle,
    kb: KnowledgeBase,
    email_count: number,          // Override or use blueprint.length_range
}
```

**Output:** `EmailFlowBundle` schema
```typescript
{
    type: 'email_flow_bundle',
    bundle_id: string,
    generated_at: string,
    flows: [{
        flow_id: string,
        variant_id: string,
        flow_blueprint_id: string,
        goal: FlowGoal,
        angle_id: string,
        sequence: [{
            email_id: string,
            position: number,
            subject_variant_id: string,
            subject: string,
            first_line: string,
            body_markdown: string,
            cta: CTAOutput,
            delay_from_previous_hours: number,
        }],
    }],
}
```

**Logic:**
1. Determine email count from blueprint or override
2. Apply sequence_structure from blueprint
3. For each email position, generate:
   - Subject line (using subject_firstline_variants if available)
   - First line (opener)
   - Body (using angle narrative + offer value props)
   - CTA (based on position - soft early, hard late)
4. Apply delay rules (48h, 72h, etc.)
5. Ensure "soap opera" cohesion across emails

---

### 4. `generate-email-reply`

**Input:**
```typescript
{
    incoming_email: {
        subject: string,
        body: string,
        sender: string,
        thread_context?: string[],
    },
    detected_scenario: string,     // From analyze-intent
    playbook: ReplyPlaybook,
    strategy: ReplyStrategy,
    kb: KnowledgeBase,
}
```

**Output:** `EmailReplyBundle` schema
```typescript
{
    type: 'email_reply_bundle',
    bundle_id: string,
    generated_at: string,
    replies: [{
        reply_id: string,
        variant_id: string,
        scenario_id: string,
        strategy_id: string,
        reply_markdown: string,
        cta: CTAOutput | null,
    }],
}
```

**Logic:**
1. Match incoming email to scenario (pricing_question, timeline_question, etc.)
2. Select strategy from allowed_strategy_ids
3. Apply strategy rules:
   - CLARIFYING_QUESTION_FIRST: Ask before answering
   - GUIDANCE_FIRST: Give info, then CTA
   - CALENDAR_FIRST: Push to book call immediately
   - TWO_STEP_ESCALATION: Soft ask, then follow up
4. Generate reply using brand voice
5. Optionally A/B test different strategies

---

### 5. `generate-social-post`

**Input:**
```typescript
{
    platform: 'LinkedIn' | 'X' | 'YouTube',
    post_blueprint: SocialPostBlueprint,
    pillar: SocialPillar,
    angle: Angle,
    offer: Offer | null,          // Optional - not all posts are sales
    kb: KnowledgeBase,
}
```

**Output:** `SocialPostBundle` schema
```typescript
{
    type: 'social_post_bundle',
    bundle_id: string,
    generated_at: string,
    posts: [{
        post_id: string,
        variant_id: string,
        platform: string,
        post_type: string,
        pillar_id: string,
        angle_id: string,
        content_markdown: string,
        hashtags: string[],
        cta: CTAOutput | null,
    }],
}
```

**Logic:**
1. Apply platform-specific constraints:
   - LinkedIn: 3000 char limit, professional tone
   - X: 280 char limit (or thread), punchy tone
   - YouTube: Description + timestamps
2. Apply post_type structure_rules:
   - insight: Hook → Insight → Takeaway
   - narrative: Story → Lesson → CTA
   - comparison: Before/After, Us vs Them
   - proof: Result → Method → Action
3. Apply brand voice and angle
4. Generate hashtags (platform-appropriate)

---

## Tasks

### Task 3.1: Create Generator Service

**File to create:**
```
apps/backend/src/services/content/contentGeneratorService.ts
```

**Class structure:**
```typescript
class ContentGeneratorService {
    async generateWebsitePage(input: PageInput): Promise<PageOutput>;
    async generateWebsiteBundle(input: BundleInput): Promise<WebsiteBundle>;
    async generateEmailFlow(input: FlowInput): Promise<EmailFlowBundle>;
    async generateEmailReply(input: ReplyInput): Promise<EmailReplyBundle>;
    async generateSocialPost(input: SocialInput): Promise<SocialPostBundle>;
    
    // Internal helpers
    private buildSectionContent(sectionType: string, context: ContentContext): string;
    private applyBrandVoice(content: string, kb: KnowledgeBase): string;
    private generateWithLLM(prompt: string, constraints: LLMConstraints): Promise<string>;
}
```

### Task 3.2: Migrate logic from writer.engine.ts

**Files involved:**
```
apps/backend/src/core/writer.engine.ts     # Existing
apps/backend/src/services/content/...       # New
```

**Actions:**
1. Extract reusable functions from `writer.engine.ts`
2. Generalize section builders
3. Add new content types (email, social)
4. Maintain backward compatibility if needed

### Task 3.3: Wire Generator Nodes to Service

**File to modify:**
```
apps/backend/src/services/workflow/workflowExecutionService.ts
```

**Changes in `executeProcessNode()`:**
```typescript
case 'generate-website-page':
    return await contentGeneratorService.generateWebsitePage({
        icp: pipelineData.resolvedICP,
        offer: pipelineData.resolvedOffer,
        angle: pipelineData.selectedAngle,
        // ...
    });

case 'generate-email-flow':
    return await contentGeneratorService.generateEmailFlow({
        flow_blueprint: pipelineData.selectedBlueprint,
        // ...
    });

// ... etc
```

### Task 3.4: Output Schema Validation

**Add validation step:**
```typescript
// After generation, validate output
const result = await contentGeneratorService.generateWebsitePage(input);
const parsed = PageOutputSchema.safeParse(result);
if (!parsed.success) {
    throw new Error(`Generator output failed validation: ${parsed.error}`);
}
return parsed.data;
```

### Task 3.5: Create Prompt Templates for LLM

**File to create:**
```
apps/backend/src/services/content/promptTemplates/
├── websitePage.ts
├── emailFlow.ts
├── emailReply.ts
└── socialPost.ts
```

**Structure:**
```typescript
export function buildWebsitePagePrompt(context: PageContext): string {
    return `
You are generating a ${context.pageType} page.

TARGET AUDIENCE:
${formatICP(context.icp)}

OFFER:
${formatOffer(context.offer)}

ANGLE TO USE:
${context.angle.axis}: ${context.angle.narrative}

SECTIONS TO GENERATE:
${context.layout.structure.map(s => `- ${s}`).join('\n')}

BRAND VOICE RULES:
${context.kb.brand.voice_rules.join('\n')}

FORBIDDEN:
${context.kb.brand.compliance?.forbidden_claims?.join(', ') || 'None'}

Generate content for each section. Use the angle consistently throughout.
`;
}
```

---

## Validation Checklist

- [ ] ContentGeneratorService created with all methods
- [ ] All generators produce valid output per schema
- [ ] LLM calls use proper prompts with full context
- [ ] Brand voice rules applied
- [ ] Generator nodes execute in workflow
- [ ] Output flows to next node correctly
- [ ] Error handling for failed generations

---

## Test Cases

```typescript
// Test 1: Generate Landing Page
const page = await contentGeneratorService.generateWebsitePage({
    icp: sampleICP,
    offer: sampleOffer,
    angle: { axis: 'risk', ... },
    layout: { structure: ['hero', 'features', 'proof', 'cta'] },
});
expect(page.content_sections.length).toBe(4);
expect(page.primary_cta).toBeDefined();

// Test 2: Generate Email Flow
const flow = await contentGeneratorService.generateEmailFlow({
    email_count: 5,
    flow_blueprint: soapOperaBlueprint,
});
expect(flow.flows[0].sequence.length).toBe(5);
expect(flow.flows[0].sequence[0].position).toBe(1);

// Test 3: Full workflow execution
// trigger → resolve-icp → resolve-offer → generate-website-page → validate
```

---

## Notes

- LLM is used for "creative glue", NOT for structure decisions
- All structure comes from KB (blueprints, layouts, etc.)
- Variant generation (for A/B) can be added as optional flag
- Token usage should be tracked per generation
