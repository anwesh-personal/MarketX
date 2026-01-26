# Phase 4: Workflow Templates

> **Status**: 🟢 COMPLETE
> **Duration**: 2-3 days
> **Dependencies**: Phase 3 (Generator Nodes)

---

## Objective

Rebuild the 10 seed workflow templates using the new proper node types. Each template should be a complete, executable workflow for a specific content generation use case.

---

## Current State

**10 templates exist** in database seed, but they use:
- Generic `generate-llm` nodes
- No resolver nodes
- Placeholder configurations

---

## Target State

**10 templates** with:
- Proper resolver chain (ICP → Offer → Angle → Blueprint → CTA)
- Content-type-specific generators
- Constitution validation
- Proper output handling

---

## Template Specifications

### Template 1: Email Reply Engine

**Purpose:** Respond to incoming emails using scenario matching

**Node Flow:**
```
webhook-trigger
    ↓
analyze-intent (detect scenario: pricing_question, timeline, objection, etc.)
    ↓
resolve-icp (from email domain/context)
    ↓
resolve-offer (based on thread context)
    ↓
[Select Playbook & Strategy based on scenario]
    ↓
generate-email-reply
    ↓
validate-constitution
    ↓
output-webhook (return to n8n)
```

**Nodes (8):**
| ID | Type | Label |
|----|------|-------|
| trigger-1 | webhook-trigger | Email Received |
| analyze-1 | analyze-intent | Detect Scenario |
| resolve-icp-1 | resolve-icp | Identify Sender |
| resolve-offer-1 | resolve-offer | Match Offer |
| generate-1 | generate-email-reply | Generate Reply |
| validate-1 | validate-constitution | Constitution Check |
| output-1 | output-webhook | Return to n8n |
| output-log | output-analytics | Log for Learning |

---

### Template 2: Email Flow Generator

**Purpose:** Generate multi-email nurture sequences

**Node Flow:**
```
manual-trigger
    ↓
[Input: ICP, Offer, Goal, Email Count]
    ↓
resolve-icp
    ↓
resolve-offer
    ↓
resolve-angle
    ↓
resolve-blueprint (email_flow type)
    ↓
generate-email-flow
    ↓
validate-constitution
    ↓
output-store
```

**Nodes (10):**
| ID | Type | Label |
|----|------|-------|
| trigger-1 | manual-trigger | Start |
| resolve-icp-1 | resolve-icp | Select ICP |
| resolve-offer-1 | resolve-offer | Select Offer |
| resolve-angle-1 | resolve-angle | Select Angle |
| resolve-bp-1 | resolve-blueprint | Select Flow Blueprint |
| generate-1 | generate-email-flow | Generate Sequence |
| validate-1 | validate-constitution | Validate |
| output-store-1 | output-store | Store Flow |
| output-log-1 | output-analytics | Log Generation |

---

### Template 3: Blog + Social Engine

**Purpose:** Generate SEO blog post with matching social posts

**Node Flow:**
```
manual-trigger
    ↓
[Input: Topic, Pillar, Platform targets]
    ↓
resolve-icp (content audience)
    ↓
resolve-angle
    ↓
web-search (research topic)
    ↓
generate-website-page (blog post as page)
    ↓
├── generate-social-post (LinkedIn)
├── generate-social-post (X)
└── generate-social-post (YouTube)
    ↓
validate-constitution (all content)
    ↓
output-store
```

---

### Template 4: Social Multi-Platform

**Purpose:** Create platform-specific social content from single brief

**Node Flow:**
```
manual-trigger
    ↓
[Input: Brief, Pillar, Tone]
    ↓
resolve-angle
    ↓
├── generate-social-post (LinkedIn)
├── generate-social-post (X)  
└── generate-social-post (YouTube)
    ↓
validate-constitution
    ↓
output-store
```

---

### Template 5: Sales Copy Engine

**Purpose:** Generate high-converting sales copy

**Node Flow:**
```
manual-trigger
    ↓
resolve-icp
    ↓
resolve-offer
    ↓
resolve-angle (persuasion angle)
    ↓
generate-website-page (sales copy format)
    ↓
validate-constitution ("no hype" check)
    ↓
output-store
```

---

### Template 6: VSL Script Writer

**Purpose:** Generate Video Sales Letter scripts

**Node Flow:**
```
manual-trigger
    ↓
resolve-icp
    ↓
resolve-offer
    ↓
resolve-angle
    ↓
generate-website-page (VSL script structure)
    ↓
validate-constitution (claims check)
    ↓
output-store
```

---

### Template 7: Landing Page Builder

**Purpose:** Generate complete landing page with copy + structure

**Node Flow:**
```
manual-trigger
    ↓
resolve-icp
    ↓
resolve-offer
    ↓
resolve-angle
    ↓
resolve-blueprint (LANDING page)
    ↓
resolve-cta
    ↓
generate-website-page
    ↓
validate-constitution
    ↓
output-store
```

---

### Template 8: Sales Funnel Page Pack

**Purpose:** Generate complete funnel (Opt-in → Thank You → Sales → Confirm)

**Node Flow:**
```
manual-trigger
    ↓
resolve-icp
    ↓
resolve-offer
    ↓
generate-website-bundle
    ├── page_types: ['OPT_IN', 'THANK_YOU', 'SALES', 'ORDER_CONFIRM']
    ↓
validate-constitution (all pages)
    ↓
output-store
```

---

### Template 9: Mini Ebook Generator

**Purpose:** Generate lead magnet ebook with chapters

**Node Flow:**
```
manual-trigger
    ↓
[Input: Topic, Target Audience, Chapter Count]
    ↓
resolve-icp
    ↓
resolve-angle
    ↓
generate-website-page (Outline step)
    ↓
generate-website-bundle (Chapters as pages)
    ↓
add-content-locker (gate points)
    ↓
validate-constitution
    ↓
output-store
```

---

### Template 10: Gated Content Pack

**Purpose:** Generate ebook + checklist + cheat sheet bundle

**Node Flow:**
```
manual-trigger
    ↓
resolve-icp
    ↓
resolve-angle
    ↓
├── generate-website-page (Mini Ebook)
├── generate-website-page (Checklist)
└── generate-website-page (Cheat Sheet)
    ↓
add-content-locker (progressive unlock)
    ↓
validate-constitution
    ↓
output-store
```

---

## Tasks

### Task 4.1: Update Migration Seed Data

**File to modify:**
```
apps/frontend/supabase/migrations/20260124000001_create_workflow_engine_tables.sql
```

**Actions:**
1. Delete existing template INSERT statements
2. Add new templates with proper node structures
3. Ensure edges connect nodes correctly

### Task 4.2: Create Template JSON Files

**Directory to create:**
```
apps/backend/src/seed/templates/
├── email_reply_engine.json
├── email_flow_generator.json
├── blog_social_engine.json
├── social_multiplatform.json
├── sales_copy_engine.json
├── vsl_script_writer.json
├── landing_page_builder.json
├── sales_funnel_pack.json
├── mini_ebook_generator.json
└── gated_content_pack.json
```

**Format:**
```json
{
    "name": "Email Reply Engine v2",
    "description": "...",
    "status": "active",
    "nodes": [...],
    "edges": [...]
}
```

### Task 4.3: Build Template Validation Tool

**File to create:**
```
apps/backend/src/utils/validateWorkflowTemplate.ts
```

**Checks:**
1. All nodes have valid types (exist in node_palette)
2. All edges connect existing nodes
3. Graph is acyclic (DAG check)
4. Has exactly one trigger node
5. Has at least one output node
6. Resolver nodes come before generators
7. Validators come after generators

### Task 4.4: Test Template Execution

**Create test script:**
```
apps/backend/src/tests/templateExecution.test.ts
```

**For each template:**
1. Load template from DB
2. Create mock input
3. Execute workflow
4. Validate output schema
5. Check all nodes executed

---

## Validation Checklist

- [ ] All 10 templates updated in migration
- [ ] JSON files created for reference
- [ ] Validation tool passes all templates
- [ ] Each template executes end-to-end
- [ ] Output matches expected schema
- [ ] Execution logs show all nodes

---

## Template Testing Matrix

| Template | Mock Input | Expected Output | Status |
|----------|------------|-----------------|--------|
| Email Reply | Sample email | EmailReplyBundle | ⬜ |
| Email Flow | ICP + Offer | EmailFlowBundle | ⬜ |
| Blog + Social | Topic | PageOutput + SocialPosts | ⬜ |
| Social Multi | Brief | SocialPostBundle (3 platforms) | ⬜ |
| Sales Copy | Offer | PageOutput (sales format) | ⬜ |
| VSL Script | Product | PageOutput (VSL format) | ⬜ |
| Landing Page | ICP + Offer | PageOutput | ⬜ |
| Funnel Pack | Offer | WebsiteBundle (4 pages) | ⬜ |
| Mini Ebook | Topic | WebsiteBundle (chapters) | ⬜ |
| Gated Pack | Topic | Bundle + Locker config | ⬜ |

---

## Notes

- Templates are the "product" that users interact with
- Good templates = good UX
- Each template node should have meaningful labels (not "Node 1")
- Position nodes cleanly for visual clarity
- Include proper descriptions for each template
