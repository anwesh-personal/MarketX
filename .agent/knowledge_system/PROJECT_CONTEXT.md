# Project Context

> Core understanding of the Axiom project - stakeholders, requirements, and source documents.

---

## Stakeholders

| Name | Role | Notes |
|------|------|-------|
| **Tommy** | Business / Money | The client. Has the business needs and funding. |
| **Nino** | Original Developer | Built the original InMarket Traffic (IMT) system architecture. Axiom/MarketWriter is built on top of/alongside his work. |
| **Fran** | Bridge / Connector | Anwesh's friend. Tommy's most trusted. Facilitates communication between all parties. |
| **Anwesh** | Lead Developer | Building Axiom. You. |

---

## Project Identity

- **Project Name**: AXIOM (The Intelligence Layer)
- **Client System**: InMarket Traffic (IMT)
- **Sub-Project**: MarketWriter (content generation)

---

## Source Documents

### 1. Client Requirements (`COMPLETE_CLIENT_REQUIREMENTS.md`)
The comprehensive V1 scope documentation. Key points:

**Core Philosophy**: "Writer executes. Analytics observes. KB learns."

**V1 Must Generate:**
- Websites (multiple pages with structure)
- Email Flows (sequences)
- Email Replies (contextual responses)
- Social Content (LinkedIn, X, YouTube)

**Primary Metric**: BOOKED_CALL (this is success!)

**Learning Loop**: Daily at 06:00 (America/New_York), analyzes PREVIOUS_CALENDAR_DAY only

**The Knowledge Base Contains:**
1. Brand (voice rules, compliance, forbidden claims)
2. ICP Library (segments with pain points, job titles, buying triggers)
3. Offer Library (value props, differentiators, proof points)
4. Content Libraries:
   - Angles Library (6 axes: risk, speed, control, loss, upside, identity)
   - CTAs Library
   - Layouts
   - Email Flow Blueprints
   - Subject/First-Line Variants
   - Reply Playbooks & Strategies
   - Social Pillars & Post Blueprints
5. Routing Rules
6. Testing Configuration
7. Guardrails (paused patterns)
8. Learning (history + preferences)

---

### 2. Workflow Builder Architecture (`AXIOM_WORKFLOW_BUILDER.html`)
Interactive HTML presentation showing the visual workflow builder system:
- Drag-and-drop node editor
- Execution flow: Trigger → Analyze → Retrieve KB → Generate LLM → Validate Constitution → Output
- Clone/deploy workflows to multiple engines
- Real-time execution logging

---

### 3. AXIOM Presentation V3 (`AXIOM_PRESENTATION_V3.html`)
Main presentation document with tabs:
- Overview
- IMT (InMarket Traffic integration)
- Architecture
- Constitution (validation rules)
- Workflows
- Visual Flow
- Learning (self-healing loop)
- Nerd Talk (technical deep dive)
- Roadmap

Uses external content file: `AXIOM_CONTENT_COMPLETE.js`

---

## Architecture Understanding

### The Three Pillars (Strictly Separated)
1. **Writer** - Executes (generates content deterministically from KB rules)
2. **Analytics** - Observes (records performance data)
3. **KB (Knowledge Base)** - Learns (the ONLY place where learning happens)

### The Loop
```
KB Rules → Writer Generates → Content Deployed → Analytics Records
     ↑                                                    ↓
     └── Learning Loop Updates KB (Daily 6 AM) ←─────────┘
```

### V1 Exclusions (Phase 2+)
- ❌ Autonomous optimization
- ❌ Real-time learning
- ❌ Agent coordination systems
- ❌ Predictive scoring
- ❌ Autonomous social posting (generation only)
- ❌ Identity-level personalization

---

## Current Build Status

### What's Built:
- ✅ Infrastructure (monorepo, backend, frontend)
- ✅ Workflow Builder UI (React Flow based)
- ✅ Workflow Execution Service (topological ordering)
- ✅ Writer Personas (10 legendary copywriters)
- ✅ Input Variable System (consolidated)
- ✅ Theme System (multi-theme support)
- ✅ Worker Infrastructure (DreamState, FineTuning, LearningLoop)
- ✅ AI Provider abstraction (OpenAI, Anthropic, Google)

### What's Pending:
- ⏳ Complete KB Schemas (Angles, CTAs, Layouts, Email Blueprints, etc.)
- ⏳ Email Flow Generation
- ⏳ Social Post Generation
- ⏳ Analytics Pipeline
- ⏳ Full Learning Loop with policies
- ⏳ Brain-Workflow Integration
- ⏳ Worker Deployment (VPS/Railway)
- ⏳ MailWiz Integration

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `COMPLETE_CLIENT_REQUIREMENTS.md` | Original client requirements breakdown |
| `AXIOM_WORKFLOW_BUILDER.html` | Visual workflow builder presentation |
| `AXIOM_PRESENTATION_V3.html` | Main architecture presentation |
| `AXIOM_CONTENT_COMPLETE.js` | Content for presentation slides |
| `Documentation/` | API docs, architecture notes |
| `.agent/knowledge_system/` | Persistent agent context |

---

*Last Updated: 2026-01-26*
