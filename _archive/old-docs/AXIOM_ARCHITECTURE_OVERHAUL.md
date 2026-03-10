# AXIOM ARCHITECTURE OVERHAUL
**Date:** January 25, 2026
**Focus:** Input Consolidation & Professional Prompts

## 🎯 What Changed

### 1. **Input Variables Overhaul** (`axiomVariables.ts`)

All user-facing inputs are now consolidated in the **Input Node**. No more scattered configs in Process nodes.

#### Input Categories:

| Category | Variables |
|----------|-----------|
| **Basic** | campaign_name, campaign_goal, customer_name, target_audience, industry_niche |
| **Content** | customer_pain_points, customer_desires, product_service_name, product_description, unique_mechanism, offer_price, offer_deadline, guarantee, call_to_action |
| **Style** | writer_style, content_tone, content_format, word_count_target |
| **Advanced** | customer_profile_kb, brand_voice_guidelines, competitors_to_avoid, existing_assets |

**Key Addition: `writer_style`** - Dropdown with all legendary copywriters:
- Dan Kennedy (No B.S. Direct Response)
- Frank Kern (Conversational NLP)
- Gary Halbert (Raw Emotional Storytelling)
- Eugene Schwartz (Mechanism-Focused)
- David Ogilvy (Fact-Based Elegance)
- Joseph Sugarman (Slippery Slope)
- Claude Hopkins (Scientific Advertising)
- Russell Brunson (Story Selling)
- Alex Hormozi (Value Stacking)
- Modern Expert (Balanced Best Practices)

---

### 2. **Professional Prompt System** (`workflowExecutionService.ts`)

#### Writer Personas
Each writer style is now a **full persona prompt** with:
- Core Identity
- Writing Style (5+ specific techniques)
- Mandatory Elements
- Psychological Triggers

Example (Dan Kennedy):
```
YOUR CORE IDENTITY:
- Gruff, direct, and unapologetic. You care about RESULTS, not feelings.
- You despise "brand awareness." You care about LEADS and SALES.
- You are the authority. You are the prize.

YOUR WRITING STYLE:
1. Use ALL CAPS for emphasis on key words.
2. Use ellipsis... to keep the reader moving fast.
3. Create a sharp divide between "smart few" and "ignorant herd."
4. Agitate the pain HARD before offering the cure.
5. Include multiple P.S. sections with urgency.
```

#### Dynamic Prompt Building
The execution service now:
1. Reads `writer_style` from user input
2. Dynamically loads the corresponding persona prompt
3. Builds a comprehensive content brief with ALL input variables
4. Generates content matching the selected style

---

### 3. **Node-Specific Prompts**

| Node Type | Prompt Focus |
|-----------|--------------|
| `analyze-intent` | Audience psychographics, objection forecast, angle recommendations |
| `generate-llm` | Full content brief with persona, pain points, offer details |
| `validate-constitution` | 10-point quality checklist, JSON output |
| `web-search` | Industry stats, competitor analysis, trending topics |
| `seo-optimizer` | Title tags, meta descriptions, heading structure |

---

## 📂 Files Modified

1. **`apps/frontend/src/data/axiomVariables.ts`**
   - Complete rewrite
   - All user inputs in `inputVariables`
   - Added `writer_style`, `customer_pain_points`, `customer_desires`, product fields
   - Removed redundant `processVariables`

2. **`apps/backend/src/services/workflow/workflowExecutionService.ts`**
   - Added `getWriterPersonaPrompt()` with 10 legendary personas
   - Rewrote all prompt builders with professional structure
   - `executeProcessNode()` now reads `writer_style` from userInput
   - Dynamic model selection from userInput

---

## 🔄 How It Works Now

```
SALES TEAM FLOW:
┌─────────────────────────────────────────────────────────────────┐
│  1. Fill Input Form (ALL user-facing choices here)              │
│     • Campaign Goal, Target Audience                            │
│     • Pain Points, Desires                                      │
│     • Product Name, Description, Mechanism                      │
│     • Writer Style (e.g., "Dan Kennedy")                        │
│     • Content Tone, Format                                      │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Workflow Executes (Zero manual intervention)                 │
│     • analyze-intent: Understands the campaign                  │
│     • generate-llm: Uses Dan Kennedy persona + all input data   │
│     • validate-constitution: Checks quality                     │
│     • output: Sends to MailWiz/Buffer/VPS                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Feedback Loop (MailWiz metrics → Brain → Improvement)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ What to Do Next

### Frontend Updates Needed:
1. Update `NodeConfigurationModal.tsx` to render the new input variables
2. Update the Input Node to show categories (Basic, Content, Style, Advanced)
3. Remove AI config from Process nodes (it's now automatic)

### Testing:
1. Run a workflow with different `writer_style` selections
2. Verify the output matches the selected persona
3. Check that all input variables are properly passed to the prompts

---

## 🚀 The System is Now Professional

- **Single touchpoint** for sales team (Input Form)
- **Dynamic personas** selected at runtime
- **Professional prompts** for every node type
- **Zero configuration** needed on Process nodes
