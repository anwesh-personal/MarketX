# 🧠 AXIOM WORKFLOW CAPABILITIES & ENGINE-BRAIN INTEGRATION

## What Your Workflows Can Do

### 1. EMAIL WORKFLOWS
- **Email Writing** - Write professional emails based on:
  - Recipient type (prospect, customer, partner)
  - Tone (formal, casual, urgent)
  - Purpose (follow-up, introduction, pitch)
  - Industry/context
- **Email Sanitization** - Clean up drafts, fix grammar, improve clarity
- **Email Rewriting** - Transform existing emails for different audiences
- **A/B Split Testing** - Generate multiple variations:
  - Different subject lines
  - Different CTAs
  - Different opening hooks
  - Different lengths

### 2. EMAIL SEQUENCES
- **Onboarding Sequences** - 5-7 email welcome series
- **Nurture Sequences** - Educational drip campaigns
- **Sales Sequences** - Pre-sale to close automation
- **Re-engagement** - Win-back inactive subscribers
- **Post-Purchase** - Upsell/cross-sell automation

### 3. COPYWRITING WORKFLOWS
- **Sales Copy** - Headlines, bullets, CTAs
- **Sales Pages** - Long-form conversion pages
- **Landing Pages** - Lead capture optimization
- **Ad Copy** - Facebook, Google, LinkedIn ads
- **VSL Scripts** - Video sales letter scripts

### 4. CONTENT WORKFLOWS
- **Blog Posts** - SEO-optimized articles
- **Social Media** - Platform-specific posts
- **LinkedIn Posts** - Professional thought leadership
- **Twitter Threads** - Viral thread generation
- **YouTube Scripts** - Video content scripts

---

## 🔗 ENGINE ↔ BRAIN INTEGRATION

### How They Talk:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER CHAT SESSION                            │
│                                                                      │
│  User: "Write me an email to follow up with the prospect"           │
│                              ↓                                       │
├─────────────────────────────────────────────────────────────────────┤
│                           🧠 BRAIN                                   │
│                                                                      │
│  1. Receives message via /api/brain/chat                            │
│  2. Retrieves context: user profile, org settings, KB data          │
│  3. Determines intent: "email_generation"                           │
│  4. Looks up assigned workflow engines for this user/org            │
│  5. Finds: "Email Writer Engine" (cloned for this org)              │
│                              ↓                                       │
├─────────────────────────────────────────────────────────────────────┤
│                         ⚙️ ENGINE                                    │
│                                                                      │
│  6. Engine has workflow: Trigger → Analyze → KB Retrieve →          │
│                          Generate → Preview → Output                 │
│                                                                      │
│  7. Each node executes:                                              │
│     - Trigger: Manual (chat initiated)                               │
│     - Analyze Intent: Uses AI to understand request                  │
│     - KB Retrieve: Pulls relevant org knowledge                      │
│     - Generate: Uses org's AI providers (w/ fallback)                │
│     - Preview: (optional) Shows draft for approval                   │
│     - Output: Returns to Brain                                       │
│                              ↓                                       │
├─────────────────────────────────────────────────────────────────────┤
│                         🧠 BRAIN (Response)                          │
│                                                                      │
│  8. Receives generated email from Engine                             │
│  9. Formats response with proper styling                             │
│  10. Sends back to user via WebSocket/SSE                           │
│                              ↓                                       │
├─────────────────────────────────────────────────────────────────────┤
│                         USER SEES                                    │
│                                                                      │
│  "Here's a follow-up email for your prospect:                       │
│                                                                      │
│   Subject: Quick follow-up on our conversation...                    │
│                                                                      │
│   Hi [Name],                                                         │
│   ..."                                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Database Flow:

```sql
-- 1. User sends message
INSERT INTO conversations (user_id, org_id, message) VALUES (...);

-- 2. Brain checks user's assigned engines
SELECT ei.* FROM engine_instances ei
JOIN user_brain_assignments uba ON uba.brain_id = ei.id
WHERE uba.user_id = :user_id AND ei.status = 'active';

-- 3. Engine executes using org's AI providers
SELECT ap.* FROM ai_providers ap
JOIN engine_api_key_mappings eakm ON eakm.provider_id = ap.id
WHERE eakm.engine_id = :engine_id
ORDER BY eakm.priority DESC;

-- 4. Log usage
INSERT INTO ai_usage_log (provider_id, brain_id, user_id, org_id, ...)
VALUES (...);
```

---

## 🏗️ ARCHITECTURE LAYERS

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1: SUPERADMIN (You)                                          │
│  ────────────────────────────────────────────────────────────────── │
│  • Create workflow templates                                         │
│  • Configure nodes with AI, variables, prompts                       │
│  • Deploy templates as engines                                       │
│  • Clone engines to organizations                                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 2: ORGANIZATION                                              │
│  ────────────────────────────────────────────────────────────────── │
│  • Has cloned engines assigned                                       │
│  • Has own AI provider API keys                                      │
│  • Has own Knowledge Bases                                           │
│  • Has own Constitution/Guardrails                                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 3: USER                                                      │
│  ────────────────────────────────────────────────────────────────── │
│  • Interacts via Chat UI                                            │
│  • Brain routes requests to appropriate engines                      │
│  • Engines use org's resources (keys, KB, constitution)             │
│  • Results returned to user                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ NODE-BY-NODE BREAKDOWN

### TRIGGER NODES
| Node | Purpose | When Fires |
|------|---------|------------|
| `email-trigger` | Incoming email | Email received to monitored inbox |
| `manual-trigger` | User initiated | Chat message or button click |
| `schedule-trigger` | Scheduled runs | Cron/timer based |

### PROCESS NODES
| Node | Purpose | AI Models Used |
|------|---------|----------------|
| `analyze-intent` | Understand request | GPT-4o, Claude |
| `retrieve-kb` | Fetch relevant docs | Embeddings → Vector DB |
| `generate-llm` | Create content | Primary + Fallbacks |
| `validate-constitution` | Apply guardrails | Constitutional AI check |
| `web-search` | Research web | Perplexity/Tavily |
| `seo-optimizer` | Optimize for SEO | SEO-trained model |

### OUTPUT NODES
| Node | Purpose | Destination |
|------|---------|-------------|
| `output-n8n` | Webhook delivery | N8n, Zapier, Make |
| `output-store` | Save to DB | Supabase storage |
| `output-export` | File export | PDF, DOCX, MD |
| `output-schedule` | Schedule send | Delayed delivery |

---

## 🔧 IMMEDIATE FIXES NEEDED

### 1. Drag-Drop Not Working
The issue is likely in how nodes are being loaded. Need to check:
- Are positions being loaded correctly from DB?
- Is ReactFlow properly initialized?
- Are node types registered before rendering?

### 2. "Failed to fetch providers"
Fixed - was using wrong column names (`provider_type` instead of `provider`)

### 3. Hardcoded Models
Fixed - now fetching from `ai_providers` and `ai_model_metadata` tables

---

## 📋 COMPLETE WORKFLOW EXAMPLES

### Example 1: Email Writer Workflow
```
[Email Trigger] → [Analyze Intent] → [Retrieve KB] → [Generate Email] → [Preview] → [Output]
     ↓                   ↓                ↓                 ↓              ↓          ↓
  Incoming          Understand        Get context       Write email    Review     Send/Save
   email           what user wants    from KB        (w/ fallback)    (optional)
```

### Example 2: Sales Page Workflow
```
[Manual Trigger] → [Input Form] → [Research] → [Generate Outline] → [Generate Sections] → [SEO] → [Preview] → [Export]
       ↓                ↓             ↓               ↓                    ↓              ↓        ↓           ↓
    Button         Product info   Web search    Structure plan      Each section      Optimize   Review     PDF/HTML
     click           + audience                                    (hero, features,
                                                                   benefits, CTA)
```

### Example 3: Email Sequence Workflow  
```
[Manual Trigger] → [Sequence Config] → [Loop: Generate Each Email] → [Preview All] → [Schedule Output]
       ↓                  ↓                       ↓                       ↓               ↓
    Start            # emails,              For email 1...N:          Review all     Schedule
                    delay days,             - Generate subject           5 emails      delivery
                    sequence type           - Generate body
                                           - Add delay logic
```

