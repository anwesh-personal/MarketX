# KB Generator: Onboarding Questionnaire → 22-Section Knowledge Base Pipeline

**Date:** 2026-04-10
**Status:** Stage 4 Complete — Review UI Built
**Author:** Antigravity AI + Anwesh
**Stakeholders:** Tommy, Fran, Anwesh

### Implementation Progress

| Stage | Status | Key Files |
|-------|--------|-----------|
| 1: Database + API | ✅ Complete | `migrations/00000000000062_kb_onboarding_questionnaire.sql`, `api/kb/onboarding/` (5 routes) |
| 2: Questionnaire UI | ✅ Complete | `components/kb-onboarding/` (wizard + 9 steps + primitives + types) |
| 3: Generation Engine | ✅ Complete | `processors/kb/kb-section-prompts.ts`, `kb-generation-orchestrator.ts`, `kb-generation-worker.ts` |
| 4: Review UI | ✅ Complete | `components/kb-review/` (KBReviewEditor + SectionViewer + FailureBanner) |
| 5: Sections API | 🔨 Next | `api/kb/onboarding/sections/route.ts` — approve/reject/edit/lock actions |
| 6: Integration | ⬜ Pending | Wire locked KB to MarketWriter agents |

---

## Executive Summary

This plan defines how the Axiom platform will automatically generate a complete, 22-section Master Knowledge Base for every new partner — equivalent in depth and quality to the 141-page IIInfrastructure Master Knowledge Base v2.

**The pipeline:**
1. A structured multi-step onboarding questionnaire collects core business intelligence from the partner
2. Mandatory artifact uploads (sales decks, case studies, transcripts) provide real-world evidence
3. A constraint enforcement gate validates that inputs meet quality standards before proceeding
4. A sequential, section-by-section AI generation pipeline builds each KB section — each section building on the ones before it
5. A human review loop allows Tommy/team to review, edit, approve, or reject each section
6. The KB is locked and becomes the source of truth for all MarketWriter operations

**What this replaces:** Manual KB creation by Tommy (hours/days of work per partner)
**What this produces:** A production-ready Master Knowledge Base that governs targeting, messaging, conversations, learning, and execution

---

## Reference Documents

| Document | Location | Purpose |
|----------|----------|---------|
| IIInfrastructure Master Knowledge Base v2 | `Documentation/IIInfrastructure Master Knowledge Base v2.docx.txt` | The gold standard — 22-section, 241KB output the system must produce |
| Onboarding Steps (IIInfrastructure) | `Documentation/Onboarding Steps (IIInfrastructure).txt` | Tommy's 8-phase onboarding process definition |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     ONBOARDING PIPELINE                         │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐ │
│  │ Phase 1  │───│Phase 1.5 │───│ Phase 2  │───│ Phase 2.5    │ │
│  │ INTAKE   │   │CONSTRAINT│   │   KB     │   │ REVIEW &     │ │
│  │          │   │ENFORCE   │   │GENERATION│   │ LOCK         │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────────┘ │
│       │              │              │               │           │
│  9 Steps        Hard Gate     22 Sections     Section-by-      │
│  + Artifacts    Must Pass     Sequential      Section          │
│                               AI Pipeline     Approval         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: INTAKE — Structured Collection

### Design Principles
- Each questionnaire step maps directly to specific KB sections
- Multi-segment ICP support — partners can define as many ICP segments as needed
- Buying roles are defined per ICP segment, not globally
- Artifacts are MANDATORY, not optional
- Progress is saved after each step (resume-able)
- Every field has a help tooltip explaining why it matters

---

### Step 1: Company & Offer Identity
**Maps to:** KB Section 1 (Company/Offer Identity), KB Section 4 (Offer Details)
**Purpose:** Establish the fundamental truth about who this company is and what it sells

| # | Field | Type | Required | Validation | Maps To |
|---|-------|------|----------|------------|---------|
| 1.1 | Company name | Text | ✅ | Non-empty, 2-100 chars | S1.1 |
| 1.2 | Company website URL | URL | ✅ | Valid URL | S11, research source |
| 1.3 | One-sentence company description | Text | ✅ | 10-200 chars | S1.3 |
| 1.4 | What does your company do? (full description) | Textarea | ✅ | Min 50 chars | S1.2 |
| 1.5 | What business category do you operate in? | Text | ✅ | Non-empty | S1.4 |
| 1.6 | What do you sell? Describe your core product or service in detail. | Textarea | ✅ | Min 100 chars | S1.8, S4 |
| 1.7 | What problem does your product/service solve? Be specific — what does the world look like before vs after someone uses your solution? | Textarea | ✅ | Min 100 chars | S1.5 |
| 1.8 | Why does your company exist? What's the mission beyond making money? | Textarea | ✅ | Min 50 chars | S1.7 |
| 1.9 | What is your pricing model? | Select: Subscription, One-time, Usage-based, Performance-based, Retainer, Custom/Hybrid | ✅ | Must select | S4, S18 |
| 1.10 | What is your typical deal size or annual contract value? | Text | ✅ | Non-empty | S18 economic model |
| 1.11 | What is your delivery timeline after a customer signs? | Text | ✅ | Non-empty | S4 |
| 1.12 | What specific components does your offer include? (List everything the customer gets) | Textarea | ✅ | Min 50 chars | S4.1-4.8 |

**Help text examples:**
- 1.7: "Don't say 'we help companies grow.' Say 'Companies waste $X on Y because Z. We fix that by doing W, which results in A, B, C.'"
- 1.10: "Even if it varies, give us a range. '$5K-$15K per month' or '$50K first year average' — we need this to build your economic model."

---

### Step 2: Ideal Customer Profile (ICP) Segments
**Maps to:** KB Section 2 (Buyer/Fit/Adoption), KB Section 3 (InMarket Behavior Intelligence)
**Purpose:** Define WHO the system targets — with full multi-segment support

**IMPORTANT:** This step is REPEATABLE. The partner defines one ICP segment at a time, then adds more. Each segment gets its own row in the `kb_icp_segments` table. A minimum of 1 segment is required. Maximum recommended: 5.

**Per ICP Segment:**

| # | Field | Type | Required | Validation | Maps To |
|---|-------|------|----------|------------|---------|
| 2.1 | Segment name (internal label) | Text | ✅ | Non-empty | S2 segment label |
| 2.2 | Target industries | Multi-select + custom text | ✅ | At least 1 | S2 ICP filtering |
| 2.3 | Company size (headcount) | Multi-select: 1-10, 11-50, 51-200, 201-500, 501-1000, 1000-5000, 5000+ | ✅ | At least 1 | S2 firmographics |
| 2.4 | Revenue range | Multi-select: <$1M, $1M-$10M (SMB), $10M-$100M (LMM), $100M-$1B (MM), >$1B (ENT) | ✅ | At least 1 | S2 revenue band |
| 2.5 | Target geographies | Multi-select: US, Canada, UK, EU, APAC, LATAM, Global + custom | ✅ | At least 1 | S2, S3 |
| 2.6 | What pain points does this segment experience? (list specific problems) | Textarea | ✅ | Min 50 chars | S2, S6 angles |
| 2.7 | What triggers this segment to start looking for a solution? (buying triggers) | Textarea | ✅ | Min 50 chars | S3 readiness behaviors |
| 2.8 | What decision criteria does this segment use to evaluate solutions? | Textarea | ✅ | Min 30 chars | S2, S9 CTA |
| 2.9 | Are there any companies or sub-segments you explicitly EXCLUDE? | Textarea | ❌ | — | S2 exclusions |

**After all segments defined:**

| # | Field | Type | Required | Validation | Maps To |
|---|-------|------|----------|------------|---------|
| 2.10 | What conditions typically need to be true inside a company for them to say yes to you? | Textarea | ✅ | Min 50 chars | S2 adoption conditions |
| 2.11 | What usually stops companies from buying even when the fit is strong? | Textarea | ✅ | Min 50 chars | S2 blockers |
| 2.12 | What sales environments make your solution strongest? | Textarea | ❌ | — | S2 strong fit |
| 2.13 | What sales environments are a poor fit? | Textarea | ❌ | — | S2 poor fit |
| 2.14 | What internal capabilities must the client have to succeed with your solution? | Textarea | ❌ | — | S2 prerequisites |

---

### Step 3: Buying Roles & Committee Architecture
**Maps to:** KB Section 2 (Buying Unit Map), KB Section 20 (Deal Conversion)
**Purpose:** Define WHO makes the buying decision — per ICP segment

**IMPORTANT:** This step repeats PER ICP SEGMENT defined in Step 2. Different segments may have completely different buying committees.

**Per ICP Segment:**

| # | Field | Type | Required | Validation | Maps To |
|---|-------|------|----------|------------|---------|
| 3.1 | Economic Buyer — who approves budget? (title/role) | Text | ✅ | Non-empty | S2 buying unit |
| 3.2 | Economic Buyer — what are their primary concerns? | Textarea | ✅ | Min 30 chars | S20 role messaging |
| 3.3 | Champion — who pushes the deal internally? (title/role) | Text | ✅ | Non-empty | S2 buying unit |
| 3.4 | Champion — what motivates them to push? | Textarea | ✅ | Min 30 chars | S20 role messaging |
| 3.5 | Operational Owner — who uses the solution daily? (title/role) | Text | ✅ | Non-empty | S2 buying unit |
| 3.6 | Operational Owner — what are their primary concerns? | Textarea | ✅ | Min 30 chars | S20 role messaging |
| 3.7 | Technical/Operational Evaluator (title/role) | Text | ❌ | — | S2 buying unit |
| 3.8 | Technical Evaluator — what do they evaluate? | Textarea | ❌ | — | S20 role messaging |
| 3.9 | Resistor/Skeptic — who typically blocks or resists? Why? | Textarea | ❌ | — | S2, S7 friction |

---

### Step 4: Sales Process & Qualification
**Maps to:** KB Section 9 (CTA Logic), KB Section 20 (Deal Conversion)
**Purpose:** Define what happens AFTER the system generates a conversation

| # | Field | Type | Required | Validation | Maps To |
|---|-------|------|----------|------------|---------|
| 4.1 | Walk us through your sales process step by step — what happens after a meeting is booked? | Textarea | ✅ | Min 100 chars | S20 |
| 4.2 | What makes a lead "qualified"? List your qualification criteria. | Textarea | ✅ | Min 50 chars | S9 CTA logic |
| 4.3 | What makes a lead "disqualified"? List your disqualification criteria. | Textarea | ✅ | Min 30 chars | S9 filtering |
| 4.4 | What is your typical sales cycle length? | Select: <1 week, 1-4 weeks, 1-3 months, 3-6 months, 6-12 months, 12+ months | ✅ | Must select | S20 |
| 4.5 | How many stakeholders are typically involved in a buying decision? | Select: 1, 2-3, 4-6, 7+ | ✅ | Must select | S20 buying unit |
| 4.6 | What is your current sales team capacity? How many qualified conversations can they handle per week? | Text | ✅ | Non-empty | S9, pacing |
| 4.7 | What does a winning deal look like? Describe a recent closed deal from first touch to close. | Textarea | ❌ | — | S20 |

---

### Step 5: Value Proposition & Proof
**Maps to:** KB Section 5 (Positioning & Narrative), KB Section 1 (Differentiation)
**Purpose:** Establish WHY someone buys and PROVE it

| # | Field | Type | Required | Validation | Maps To |
|---|-------|------|----------|------------|---------|
| 5.1 | Why does someone actually buy from you? Not marketing speak — the real reason they sign. | Textarea | ✅ | Min 50 chars | S5 core narrative |
| 5.2 | What specific, measurable outcomes do your customers achieve? (numbers, timelines, percentages) | Textarea | ✅ | Min 50 chars | S5 proof points |
| 5.3 | What is the #1 reason customers choose you over alternatives? | Textarea | ✅ | Min 30 chars | S1.10 |
| 5.4 | What is the #1 reason prospects DON'T choose you? | Textarea | ✅ | Min 30 chars | S7 primary objection |
| 5.5 | Who do you compete against? List direct competitors. | Textarea | ✅ | Min 20 chars | S1.12 |
| 5.6 | Who do you compete against indirectly? (internal buildouts, status quo, different approaches) | Textarea | ❌ | — | S1.12 |
| 5.7 | How should prospects perceive your company? What impression should they have? | Textarea | ❌ | — | S1.11 |
| 5.8 | What claims can you NEVER make? (legal, regulatory, compliance constraints) | Textarea | ❌ | — | S8 guardrails |
| 5.9 | What disclosures or disclaimers are required in your communications? | Textarea | ❌ | — | S8 compliance |

---

### Step 6: Objections & Friction
**Maps to:** KB Section 7 (Objections & Friction)
**Purpose:** Catalog every source of buyer hesitation so the system can address them

| # | Field | Type | Required | Validation | Maps To |
|---|-------|------|----------|------------|---------|
| 6.1 | List your top 5 objections heard most in sales conversations. | Textarea (numbered list) | ✅ | Min 5 items | S7.1 primary |
| 6.2 | For each objection above, how do you typically handle it? What's your best response? | Textarea | ✅ | Min 100 chars | S7 response patterns |
| 6.3 | What worries do prospects have about switching to you? (implementation risk, change management, etc.) | Textarea | ✅ | Min 30 chars | S7 operational |
| 6.4 | What economic concerns do prospects typically raise? (cost, ROI uncertainty, budget allocation) | Textarea | ❌ | — | S7.2 economic |
| 6.5 | What trust/credibility concerns come up? (proof of results, sustainability, vendor alignment) | Textarea | ❌ | — | S7.4 trust |
| 6.6 | What common misconceptions exist about your product or category? | Textarea | ❌ | — | S7 category mistakes |
| 6.7 | What competitor claims do you need to counter? | Textarea | ❌ | — | S5 market contrast |

---

### Step 7: Voice, Tone & Communication Style
**Maps to:** KB Section 5 (Narrative), KB Section 8 (Compliance), KB Section 10 (AI Reply)
**Purpose:** Define HOW the system speaks on behalf of this partner

| # | Field | Type | Required | Validation | Maps To |
|---|-------|------|----------|------------|---------|
| 7.1 | How would you describe your brand's communication style? | Multi-select: Professional, Conversational, Technical, Bold/Direct, Consultative, Friendly, Formal | ✅ | At least 1 | S5, S10 |
| 7.2 | Provide 2-3 examples of messages/emails that represent your ideal tone of voice. | Textarea | ✅ | Min 50 chars | S5 narrative, S10 |
| 7.3 | Are there any words, phrases, or styles you absolutely want to AVOID? | Textarea | ❌ | — | S8 forbidden |
| 7.4 | Are there any words, phrases, or framings you want the system to always USE? | Textarea | ❌ | — | S5 soundbites |
| 7.5 | When a buyer is hostile or aggressive, how should the system respond? | Select: Disengage immediately, Respond once politely then disengage, Attempt to redirect, Escalate to human | ✅ | Must select | S8, S10 |

---

### Step 8: Conversion Infrastructure
**Maps to:** KB Section 9 (CTA Logic), KB Section 11 (Funnels, Links & Destinations)
**Purpose:** Define WHERE conversations convert and HOW meetings are booked

| # | Field | Type | Required | Validation | Maps To |
|---|-------|------|----------|------------|---------|
| 8.1 | What is the primary conversion action? | Select: Book a call, Request a demo, Download a resource, Reply to email, Fill out a form, Other | ✅ | Must select | S9 CTA type |
| 8.2 | Booking/scheduling URL | URL | ✅ | Valid URL | S11 |
| 8.3 | Who should meetings be scheduled with? (name and role) | Text | ✅ | Non-empty | S11 routing |
| 8.4 | Preferred meeting length | Select: 15 min, 30 min, 45 min, 60 min | ✅ | Must select | S11 |
| 8.5 | Landing page URL (if different from main website) | URL | ❌ | Valid URL if provided | S11 |
| 8.6 | Do you have any secondary CTAs? (e.g., download a whitepaper, watch a video) | Text | ❌ | — | S9 secondary |
| 8.7 | What information should be collected before a meeting? (company name, role, current solution, etc.) | Textarea | ❌ | — | S11 qualification |

---

### Step 9: Supporting Materials (Artifact Upload)
**Maps to:** All sections — provides depth, evidence, and real-world language
**Purpose:** "Questionnaire = structure. Artifacts = evidence and reality. Both are required."

**MANDATORY:** At least ONE artifact category must have at least one upload. Without real materials, the KB will lack the depth and evidence quality required for effective messaging.

| # | Upload Category | Type | Required | Maps To |
|---|----------------|------|----------|---------|
| 9.1 | Sales decks / pitch decks | File upload (multi, PDF/PPTX/DOCX) | At least 1 category total | S1, S4, S5 |
| 9.2 | Case studies / success stories | File upload (multi) | At least 1 category total | S5 proof, S7 credibility |
| 9.3 | Objection handling documents / battlecards | File upload (multi) | At least 1 category total | S7 |
| 9.4 | Competitive positioning documents | File upload (multi) | — | S1.12, S5 contrast |
| 9.5 | Call recordings or transcripts | File upload (multi, audio/text) | — | S7, S10, real buyer language |
| 9.6 | Historical email campaigns / outbound sequences | File upload (multi) | — | S6 angles, S12 |
| 9.7 | Website content export / key pages | File upload or URLs | — | S1, S5 |
| 9.8 | Internal process documents / playbooks | File upload (multi) | — | S4, S20 |
| 9.9 | CRM export or pipeline data | File upload (CSV/XLSX) | — | S13, S18, S20 |

**Validation rule:** `count(uploads across 9.1-9.9) >= 1` — if zero artifacts, onboarding blocks with message: "To generate a high-quality Knowledge Base, we need at least one supporting document — a sales deck, case study, or competitor analysis. Upload your strongest material."

---

## Phase 1.5: CONSTRAINT ENFORCEMENT (Hard Gate)

**Purpose:** Ensure all inputs meet the minimum standard required for the system to function.
**Principle:** We do not accept inputs that will break the system.

This phase runs AUTOMATICALLY after Phase 1 submission. It is a hard gate — KB generation does not begin until all constraints pass.

### Validation Rules

| # | Constraint | Rule | Reject Examples | Pass Examples |
|---|-----------|------|-----------------|---------------|
| CE-1 | ICP Clarity | Each segment must have specific industry + size + at least 3 pain points | "SMBs", "Anyone who needs X", "All industries" | "SaaS companies, 50-500 employees, in healthcare, struggling with compliance automation" |
| CE-2 | Buying Role Definition | Each segment must have economic buyer + champion + operational owner defined with titles | "We sell to companies", "Decision makers" | "CFO approves budget, VP Ops champions internally, Director of Compliance uses daily" |
| CE-3 | Value Proposition Strength | Must contain: clear outcome + differentiation + reason to act now | "We save time and money", "Best in class solution" | "Reduces compliance audit prep from 6 weeks to 3 days. Only solution with automated evidence collection." |
| CE-4 | Proof Point Verification | Must have: at least 1 case study OR 1 transcript OR 1 quantified result in questionnaire answers | "We have happy customers" (no data) | "Acme Corp reduced churn by 34% in 90 days" or uploaded case study PDF |
| CE-5 | Sales Process Definition | Must have: clear qualification criteria + clear disqualification criteria | "We'll figure it out", "We qualify on the call" | "Qualified: >50 employees, compliance pain, budget approved. Disqualified: <$5M revenue, no regulatory requirement" |
| CE-6 | Objection Coverage | Must list at least 3 distinct objections with responses | "We don't get objections" | 5 objections with handling strategies |
| CE-7 | Artifact Completeness | At least 1 artifact uploaded | Zero uploads | Uploaded sales deck |

### Enforcement Behavior

```
FOR EACH constraint:
  IF fails:
    - Mark constraint as FAILED
    - Show specific field(s) that need work
    - Show example of what "passing" looks like
    - Show why this matters ("Without clear ICP, the system cannot target effectively")

IF any constraint FAILED:
  - Onboarding status = "NEEDS_REVISION"
  - Partner sees a dashboard showing passed/failed constraints
  - Partner can edit specific steps without losing progress
  - Re-validation runs automatically on save

IF all constraints PASS:
  - Onboarding status = "READY_FOR_GENERATION"
  - KB generation can begin
```

---

## Phase 2: KB GENERATION — Sequential, Section-by-Section AI Pipeline

### Design Principles

1. **Sequential generation** — each section builds on prior sections as context
2. **Section-specific prompts** — each section has its own tailored system prompt
3. **Multi-pass for large inputs** — long artifacts use the existing chunked extraction pipeline
4. **Partner-specific calibration** — even "template" sections get partner details injected
5. **Progress tracking** — partner sees real-time progress: "Generating Section 3 of 22..."
6. **Failure isolation** — if one section fails, others continue; failed section can be retried

### Generation Order and Dependencies

The 22 sections are generated in a specific order because later sections depend on earlier ones:

```
PASS 1: Foundation (no dependencies)
  → Section 1:  Company / Offer Identity
  → Section 4:  Offer Details

PASS 2: Buyer Intelligence (depends on Pass 1)
  → Section 2:  Buyer, Fit & Adoption Conditions
  → Section 3:  InMarket Behavior Intelligence [DRAFT — needs human review]

PASS 3: Positioning (depends on Pass 1 + 2)
  → Section 5:  Positioning & Narrative
  → Section 0:  Governing Principles

PASS 4: Messaging Strategy (depends on Pass 1-3)
  → Section 6:  Angles
  → Section 7:  Objections & Friction

PASS 5: Execution Framework (depends on Pass 1-4)
  → Section 8:  Compliance & Guardrails [Template + partner calibration]
  → Section 9:  CTA Logic
  → Section 10: AI Reply System [Template + partner calibration]
  → Section 11: Funnels, Links & Destinations

PASS 6: Operations (depends on Pass 1-5)
  → Section 12: Campaign Execution Notes [Template + partner calibration]
  → Section 13: Success Metrics [Template + partner targets]
  → Section 15: Execution Gates [Template + partner calibration]

PASS 7: Economics & Conversion (depends on all above)
  → Section 18: Economic Model & Performance Advantage
  → Section 19: Data-to-Action Decision System [Template + ICP calibration]
  → Section 20: Deal Conversion System

PASS 8: System Architecture (universal + partner context)
  → Section 14: Future-Proofing [Template]
  → Section 16: Derivation Rule [Template]
  → Section 17: Knowledge Evolution Rule [Template]
  → Section 21: Infrastructure Ownership & Cost Advantage [Template + partner framing]
  → Section 22: Learning Writeback & Promotion Rules [Template]
```

### Section Generation Detail

For each AI-generated section, the worker constructs:

```typescript
{
  systemPrompt: SECTION_SPECIFIC_PROMPT,        // unique per section
  priorSections: [...generatedSoFar],           // all previously generated sections as context
  questionnaireData: relevantFieldsForSection,   // specific questionnaire answers mapped to this section
  artifactExtractions: relevantExtracts,         // relevant extracted data from uploaded documents
  templateBase: templateIfApplicable,            // for template sections, the universal template to calibrate
  outputFormat: "structured_markdown"            // consistent output format
}
```

### Section Types

**TYPE A: AI-Generated from Questionnaire + Artifacts (Sections 0, 1, 2, 3, 4, 5, 6, 7, 9, 18, 20)**

These sections are fully generated by the AI using questionnaire answers, artifact extractions, and prior sections as context.

Generation approach:
1. Build a section-specific system prompt that defines the exact output structure (mirroring Tommy's KB format)
2. Inject all relevant questionnaire answers as structured data
3. Inject any relevant artifact extractions (chunked extraction results)
4. Inject all previously generated sections as context
5. Call the AI via the existing provider resolution pipeline
6. Parse and validate the output matches the expected structure
7. Store as a draft pending review

Per-section prompts must enforce:
- Match Tommy's KB tone: authoritative, precise, structured
- Use the same heading hierarchy (Section X.Y format)
- Use the same bullet-point-heavy formatting
- Produce content of comparable depth (not shallow summaries)
- Reference other sections by number when cross-referencing

**TYPE B: Universal Template + Partner Calibration (Sections 8, 10, 12, 13, 14, 15, 16, 17, 19, 21, 22)**

These sections start from a pre-written template (extracted from Tommy's IIInfrastructure KB) and get calibrated with partner-specific details.

Calibration approach:
1. Load the universal template for this section
2. Identify placeholder points where partner data should be injected (company name, industry examples, compliance requirements, metric targets, ICP scoring rules)
3. Use AI to perform targeted calibration (NOT full rewrite)
4. Preserve the core structure and principles
5. Store as a draft pending review

**What gets calibrated per section:**

| Section | Universal Part | Partner-Calibrated Part |
|---------|---------------|------------------------|
| 8 - Compliance | Core behavioral principles, prompt injection protection, conversation control | Partner-specific forbidden claims, required disclosures |
| 10 - AI Reply | Reply classification codes (RC1-RC10), progression logic | Tone calibration, escalation triggers, partner-specific response patterns |
| 12 - Campaign | Structured testing principles, discipline rules | — (fully universal) |
| 13 - Metrics | Metric framework, signal hierarchy | Partner's target benchmarks, expected ranges |
| 14 - Future-Proofing | Channel independence, adaptability | — (fully universal) |
| 15 - Execution Gates | Gate checklist | — (fully universal) |
| 16 - Derivation | Canonical priority rules | — (fully universal) |
| 17 - Evolution | Learning governance process | — (fully universal) |
| 19 - Data-to-Action | Scoring framework, action triggers | ICP-specific signal weights, intent keywords, decay model |
| 21 - Infrastructure | III's infrastructure advantage | Framed from partner's perspective (what they gain) |
| 22 - Learning Writeback | Promotion rules, validation requirements | — (fully universal) |

---

## Phase 2.5: REVIEW & LOCK

**Purpose:** Human review before the KB becomes the source of truth

### Review Flow

```
FOR EACH section (0-22):
  1. Present the generated section to the reviewer (Tommy/team)
  2. Reviewer has 3 options:
     a. APPROVE — section is locked
     b. EDIT — inline editing, then approve
     c. REJECT — section is regenerated with optional feedback note
  3. If REJECTED:
     - Reviewer provides a note ("too generic", "missing X", "wrong tone")
     - System regenerates with the feedback injected into the prompt
     - Re-presents for review
  4. Track: who approved, when, any edit history

WHEN all 22 sections + Section 0 are APPROVED:
  - KB status = "LOCKED"
  - KB becomes the source of truth for MarketWriter operations
  - All agents reference this KB for messaging, targeting, conversation logic
  - KB version is recorded (v1.0)
```

### Review UI Design

- Sidebar navigation showing all 22 sections with status icons (Approved, Draft, Rejected, Generating)
- Main content area shows the full section text
- Inline edit mode with rich text editor
- "Approve Section" / "Request Regeneration" buttons
- Progress bar: "14 of 22 sections approved"
- Global "Lock Knowledge Base" button — only enabled when all sections are approved

---

## Database Schema

### New Tables

**Table: kb_questionnaire_responses**

Stores the structured questionnaire answers per organization.

```sql
CREATE TABLE kb_questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Step tracking
  current_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'needs_revision', 'ready_for_generation', 'generating', 'review', 'locked')),
  
  -- Step 1: Company & Offer
  company_name TEXT,
  company_website TEXT,
  one_sentence_description TEXT,
  full_description TEXT,
  business_category TEXT,
  core_product_description TEXT,
  problem_solved TEXT,
  company_mission TEXT,
  pricing_model TEXT,
  typical_deal_size TEXT,
  delivery_timeline TEXT,
  offer_components TEXT,
  
  -- Step 4: Sales Process
  sales_process_steps TEXT,
  qualification_criteria TEXT,
  disqualification_criteria TEXT,
  sales_cycle_length TEXT,
  stakeholder_count TEXT,
  sales_team_capacity TEXT,
  winning_deal_example TEXT,
  
  -- Step 5: Value Proposition
  real_buy_reason TEXT,
  measurable_outcomes TEXT,
  top_differentiator TEXT,
  top_rejection_reason TEXT,
  direct_competitors TEXT,
  indirect_competitors TEXT,
  desired_perception TEXT,
  forbidden_claims TEXT,
  required_disclosures TEXT,
  
  -- Step 6: Objections
  top_objections TEXT,
  objection_responses TEXT,
  switching_worries TEXT,
  economic_concerns TEXT,
  trust_concerns TEXT,
  category_misconceptions TEXT,
  competitor_claims_to_counter TEXT,
  
  -- Step 7: Voice & Tone
  communication_style JSONB,
  tone_examples TEXT,
  words_to_avoid TEXT,
  words_to_use TEXT,
  hostile_response_policy TEXT,
  
  -- Step 8: Conversion Infrastructure
  primary_cta_type TEXT,
  booking_url TEXT,
  meeting_owner TEXT,
  meeting_length TEXT,
  landing_page_url TEXT,
  secondary_ctas TEXT,
  pre_meeting_info TEXT,
  
  -- Step 2 global fields
  adoption_conditions TEXT,
  common_blockers TEXT,
  strongest_environments TEXT,
  poorest_fit_environments TEXT,
  client_prerequisites TEXT,
  
  -- Constraint enforcement results
  constraint_results JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ
);
```

**Table: kb_icp_segments**

Stores ICP segments — one row per segment per org.

```sql
CREATE TABLE kb_icp_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES kb_questionnaire_responses(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  
  segment_name TEXT NOT NULL,
  target_industries JSONB NOT NULL,
  company_size JSONB NOT NULL,
  revenue_range JSONB NOT NULL,
  geographies JSONB NOT NULL,
  pain_points TEXT NOT NULL,
  buying_triggers TEXT NOT NULL,
  decision_criteria TEXT NOT NULL,
  exclusions TEXT,
  
  -- Buying roles for THIS segment
  economic_buyer_title TEXT,
  economic_buyer_concerns TEXT,
  champion_title TEXT,
  champion_motivations TEXT,
  operational_owner_title TEXT,
  operational_owner_concerns TEXT,
  technical_evaluator_title TEXT,
  technical_evaluator_focus TEXT,
  resistor_description TEXT,
  
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Table: kb_master_sections**

Stores each generated KB section independently — supports section-by-section review.

```sql
CREATE TABLE kb_master_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  questionnaire_id UUID NOT NULL REFERENCES kb_questionnaire_responses(id),
  
  section_number INTEGER NOT NULL,
  section_title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating', 'draft', 'approved', 'rejected', 'locked')),
  
  generation_pass INTEGER NOT NULL,
  provider_used TEXT,
  model_used TEXT,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('ai_generated', 'template_calibrated', 'template_universal')),
  
  -- Review tracking
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  edit_history JSONB,
  
  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(org_id, section_number, version)
);
```

**Table: kb_artifact_uploads**

Tracks uploaded supporting materials.

```sql
CREATE TABLE kb_artifact_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES kb_questionnaire_responses(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  
  category TEXT NOT NULL CHECK (category IN (
    'sales_deck', 'case_study', 'objection_handling', 'competitive_positioning',
    'call_recording', 'email_campaigns', 'website_content', 'internal_docs', 'crm_data'
  )),
  
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  
  extraction_status TEXT DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  extraction_job_id UUID,
  extracted_text TEXT,
  extraction_result JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## File & Component Plan

### Frontend Components

```
apps/frontend/src/components/onboarding/
├── OnboardingWizard.tsx           — Main wizard container (step navigation, progress, save/resume)
├── steps/
│   ├── CompanyOfferStep.tsx       — Step 1: Company & Offer Identity
│   ├── ICPSegmentsStep.tsx        — Step 2: ICP Segments (repeatable segment cards)
│   ├── BuyingRolesStep.tsx        — Step 3: Buying Roles (per segment)
│   ├── SalesProcessStep.tsx       — Step 4: Sales Process & Qualification
│   ├── ValuePropositionStep.tsx   — Step 5: Value Proposition & Proof
│   ├── ObjectionsStep.tsx         — Step 6: Objections & Friction
│   ├── VoiceToneStep.tsx          — Step 7: Voice & Tone
│   ├── ConversionStep.tsx         — Step 8: Conversion Infrastructure
│   └── ArtifactUploadStep.tsx     — Step 9: Supporting Materials
├── ConstraintEnforcement.tsx      — Phase 1.5: Validation results dashboard
├── KBGenerationProgress.tsx       — Phase 2: Real-time generation progress
└── KBReviewEditor.tsx             — Phase 2.5: Section-by-section review UI
```

### API Routes

```
apps/frontend/src/app/api/onboarding/
├── questionnaire/
│   ├── route.ts                   — GET (load saved), POST (save step), PUT (submit all)
│   └── [id]/route.ts              — GET specific questionnaire
├── icp-segments/
│   ├── route.ts                   — GET (list), POST (add segment)
│   └── [id]/route.ts              — PUT (update), DELETE (remove segment)
├── artifacts/
│   ├── route.ts                   — POST (upload), GET (list)
│   └── [id]/route.ts              — DELETE (remove)
├── validate/
│   └── route.ts                   — POST (run constraint enforcement)
├── generate/
│   └── route.ts                   — POST (trigger KB generation), GET (poll progress)
└── review/
    ├── route.ts                   — GET (list all sections with status)
    └── [sectionNumber]/route.ts   — GET (section content), PUT (approve/reject/edit)
```

### Worker Processors

```
apps/workers/src/processors/kb/
├── kb-extraction-processor.ts     — EXISTING: Chunked document extraction
├── kb-generation-orchestrator.ts  — NEW: Orchestrates sequential section generation
├── kb-section-generator.ts        — NEW: Generates a single KB section
├── kb-constraint-validator.ts     — NEW: Runs constraint enforcement rules
└── kb-templates/
    ├── section-08-compliance.ts   — Universal template: Compliance & Guardrails
    ├── section-10-reply-system.ts — Universal template: AI Reply System
    ├── section-12-campaign.ts     — Universal template: Campaign Execution Notes
    ├── section-13-metrics.ts      — Universal template: Success Metrics
    ├── section-14-futureproof.ts  — Universal template: Future-Proofing
    ├── section-15-gates.ts        — Universal template: Execution Gates
    ├── section-16-derivation.ts   — Universal template: Derivation Rule
    ├── section-17-evolution.ts    — Universal template: Knowledge Evolution
    ├── section-19-data-action.ts  — Universal template: Data-to-Action
    ├── section-21-infra.ts        — Universal template: Infrastructure Ownership
    └── section-22-writeback.ts    — Universal template: Learning Writeback
```

### Database Migrations

```
supabase/migrations/
├── 00000000000031_kb_questionnaire.sql        — questionnaire_responses + icp_segments tables
├── 00000000000032_kb_master_sections.sql       — master_sections table
└── 00000000000033_kb_artifact_uploads.sql      — artifact_uploads table
```

---

## Implementation Order

### Stage 1: Database + API Foundation
1. Create migration 31: `kb_questionnaire_responses` + `kb_icp_segments`
2. Create migration 32: `kb_master_sections`
3. Create migration 33: `kb_artifact_uploads`
4. Build questionnaire API routes (CRUD)
5. Build ICP segments API routes (CRUD)
6. Build artifact upload API routes

### Stage 2: Questionnaire UI
7. Build `OnboardingWizard.tsx` container with step navigation
8. Build Steps 1-9 individually
9. Build save/resume logic (auto-save per step)
10. Build progress indicator

### Stage 3: Constraint Enforcement
11. Build `kb-constraint-validator.ts` processor
12. Build validation API route
13. Build `ConstraintEnforcement.tsx` UI

### Stage 4: KB Generation Pipeline
14. Extract universal templates from Tommy's IIInfrastructure KB
15. Build `kb-section-generator.ts` with per-section prompts
16. Build `kb-generation-orchestrator.ts` (sequential 8-pass pipeline)
17. Register new BullMQ queue: `KB_GENERATION`
18. Build generation API route with progress polling

### Stage 5: Review & Lock
19. Build `KBReviewEditor.tsx`
20. Build review API routes
21. Build approval/rejection/regeneration flow
22. Build KB lock mechanism

### Stage 6: Integration
23. Wire locked KB to MarketWriter agents
24. Wire locked KB to sequence generation
25. Deploy to production

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| AI generates shallow/generic content | HIGH | Section-specific prompts with Tommy's KB as the quality reference; sequential generation with prior sections as context |
| Questionnaire is too long / partners abandon | MEDIUM | Auto-save per step; progress indicator; help tooltips; required vs optional clearly marked |
| Constraint enforcement is too strict / too loose | MEDIUM | Start strict, loosen based on feedback; allow Tommy to override constraints manually |
| Section generation fails mid-pipeline | LOW | Failure isolation — each section independent; retry per section; doesn't block other sections |
| Template sections feel generic | MEDIUM | Partner-specific calibration for every template section; inject real examples from questionnaire |
| Review process bottleneck | MEDIUM | Email notification when KB is ready for review; batch approve option for template sections |

---

## Success Criteria

1. A new partner completes the onboarding questionnaire in under 45 minutes
2. The system generates a 22-section KB within 10 minutes
3. The generated KB is comparable in depth to Tommy's IIInfrastructure reference (not shallow summaries)
4. Tommy/team can review and lock a KB in under 30 minutes
5. The locked KB correctly governs all MarketWriter operations for that partner
