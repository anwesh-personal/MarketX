# 02 — Current State Audit

**Date:** 9 March 2026

This is the honest inventory of what exists in the codebase right now.

---

## What EXISTS and WORKS

### Frontend Infrastructure
| Component | Path | Status |
|-----------|------|--------|
| Next.js 14 App Router | `apps/frontend/` | ✅ Running |
| Theme System (5 variants × day/night) | `src/contexts/ThemeContext.tsx` + CSS | ✅ Complete |
| ThemeSelector component | `src/components/ThemeSelector.tsx` | ✅ Complete |
| Theme-specific micro-interactions | `src/styles/theme-interactions.css` | ✅ Complete |
| Login page | `src/app/login/page.tsx` | ✅ Working |
| Superadmin layout + routing | `src/app/superadmin/` | ✅ Working |
| Main app layout + routing | `src/app/(main)/` | ✅ Working |
| MarketX OS visual page | `src/app/marketx-os/page.tsx` | ✅ Working |
| Logo component (day/night aware) | `src/components/MailWriterLogo.tsx` | ✅ Working |

### Superadmin UI Pages
| Page | Status |
|------|--------|
| Dashboard | ✅ |
| Brain management (`/superadmin/brains`, `/brains/[id]`) | ✅ |
| Prompt library | ✅ |
| Tool registry | ✅ |
| AI providers | ✅ |
| AI playground | ✅ |
| AI validation | ✅ |
| AI management | ✅ |
| Engine management | ✅ |
| Workflow builder | ✅ |
| Knowledge base | ✅ |
| Redis management | ✅ |
| Workers | ✅ |
| Organizations | ✅ |
| Users | ✅ |
| Licenses | ✅ |
| VPS | ✅ |
| Analytics | ✅ |

### Brain System (Partial)
| Component | Path | Status |
|-----------|------|--------|
| Brain chat (RAG + multi-agent) | `src/app/(main)/brain-chat/` + `api/brain/chat/` | ✅ Works (one-shot, not agentic loop) |
| Brain templates + org assignments | `supabase/migrations/00000000000003_brain_system.sql` | ✅ Schema exists |
| Brain agents table | `database/migrations/024_brain_agents.sql` | ✅ Schema exists |
| Prompt layers table | `database/migrations/025_prompt_layers.sql` | ✅ Schema exists |
| Brain tools registry | `database/migrations/026_brain_tools_registry.sql` | ✅ Schema + seed |
| KB pipeline | `database/migrations/027_kb_pipeline.sql` | ✅ Schema exists |
| Brain learning tables | `database/migrations/028_brain_learning.sql` | ⚠️ Has FK to `beliefs(id)` which does not exist |
| PromptAssembler | `src/services/brain/PromptAssembler.ts` | ✅ Exists |
| ToolLoader + ToolExecutor | `src/services/brain/tools/` | ✅ Exists |
| AI Provider abstraction | `src/services/ai/AIProviderService.ts` | ✅ Exists (but bypassed by hardcoded OpenAI in RAG) |
| Deploy agent API | `api/superadmin/agents/deploy/route.ts` | ✅ Exists |

### Workers
| Worker | Status |
|--------|--------|
| Workflow execution worker | ✅ Started |
| Engine execution worker | ✅ Started |
| Learning loop worker | ⚠️ Exists but only updates KB metadata |
| Dream state worker | ⚠️ Exists but returns hardcoded strings |
| Fine-tuning worker | ⚠️ Exists but simulates, does not call providers |

### API Routes (IMT Integration — now orphaned)
| Route | Status |
|-------|--------|
| `POST /api/imt/clients` | ✅ Works (creates org, sets client_id) |
| `POST /api/imt/icps` | ✅ Works (stores ICP linked to org) |
| `GET /api/imt/email/flows` | ✅ Works (returns generated email flows) |

---

## What EXISTS as PLAN ONLY (no code)

| Item | Document Source |
|------|---------------|
| RS:OS schema (Brief, Belief, Flow, Asset, Signal, etc.) | Tommy's Tech Spec + Data Model |
| Belief promotion engine (HYP→GW ladder) | Tommy's Governance Manual |
| Market Builder engine | Tommy's RS Operating Workflow |
| Market Surface engine | Tommy's RS Operating Workflow |
| 9 Mastery Agents | Tommy's Mastery Agent docs |
| 3-scope knowledge system (Local/Candidate/Global) | Tommy's KB Schema (Canonical) |
| Knowledge governance (promotion/demotion/rollback) | Tommy's Governance Policy |
| 12-section measurement system | Tommy's Measurement & Dashboard (Canonical) |
| Belief-bound email generation | Tommy's MW Brief + Tracking |
| Flow extension logic | Tommy's Flow Extension Rules |
| Angle system (7 angles per offer) | Tommy's MW Angle System |
| Client member portal | Roadmap Phase 7 |
| Email sending infrastructure | Roadmap Phase 0 |

---

## What is BROKEN or INCONSISTENT

| Issue | Impact | Fix Required |
|-------|--------|-------------|
| `028_brain_learning.sql` references `beliefs(id)` — table does not exist | Migration will fail | Must create RS:OS schema first |
| RAG orchestrator hardcodes OpenAI endpoints | Gemini/Anthropic brain configs silently fail | Route through AIProviderService |
| Brain chat is one-shot (no agentic loop) | Cannot do multi-turn tool calling | Implement function-calling loop |
| Learning Loop worker only updates KB metadata | Does not update Brain config or beliefs | Wire to proper knowledge objects |
| Dream State worker returns hardcoded strings | No actual LLM summarization | Implement real summary generation |
| Analyst + Coach agents are commented out | Cannot be reached from chat route | Uncomment and wire |
| Tailwind `dark:` utilities were OS-media driven | Now fixed to `[data-theme$="-night"]` | ✅ Fixed in this session |
| Old theme files (minimalist/modern/aqua) | Dead code | ✅ Deleted in this session |
| AnthropicProvider + OpenAIProvider had class body broken | Methods outside class | ✅ Fixed in this session |

---

## Migration State

### `supabase/migrations/` (Supabase-managed)
| Migration | What it creates |
|-----------|----------------|
| 00000000000001 | Platform core tables |
| 00000000000002 | Workflow system |
| 00000000000003 | Brain system (templates, org assignments) |
| 00000000000004 | Content system |
| 00000000000005 | Agent system |
| 00000000000006 | Analytics |
| 00000000000007 | Generated content |
| 00000000000008 | Node configs |
| 00000000000009 | Engine access |
| 00000000000010 | Organizations client_id |
| 00000000000011 | IMT ICPs table |

### `database/migrations/` (Manual/sequential)
| Migration | What it creates |
|-----------|----------------|
| 000–023 | Legacy platform, brain, agent, worker, workflow, RAG, vector tables |
| 024 | `brain_agents` (per-org/user agent config) |
| 025 | `prompt_layers` (reusable prompt building blocks) |
| 026 | `brain_tools_registry` (tool definitions + seed) |
| 027 | `kb_pipeline` (chunk processing, embedding queue) |
| 028 | `brain_learning` (memories, gaps, reflections, dream logs) — **BROKEN FK** |

### What is MISSING from migrations
| Table | Source Document | Priority |
|-------|----------------|----------|
| `partner` | Tommy's Data Model | Phase 1 |
| `offer` | Tommy's Data Model | Phase 1 |
| `icp` (RS:OS version) | Tommy's Data Model | Phase 1 |
| `brief` | Tommy's Data Model | Phase 1 |
| `belief` | Tommy's Data Model | Phase 1 |
| `belief_competition` | Tommy's Data Model | Phase 1 |
| `flow` | Tommy's Data Model | Phase 1 |
| `flow_step` | Tommy's Data Model | Phase 1 |
| `asset` | Tommy's Data Model | Phase 1 |
| `signal_event` | Tommy's Data Model | Phase 1 |
| `belief_gate_snapshot` | Tommy's Data Model | Phase 2 |
| `belief_promotion_log` | Tommy's Data Model | Phase 2 |
| `meeting` | Tommy's Data Model | Phase 3 |
| `opportunity` | Tommy's Data Model | Phase 3 |
| `revenue_event` | Tommy's Data Model | Phase 3 |
| `sending_identity` | Tommy's Data Model | Phase 4 |
| `belief_daily_rollup` | Tommy's Data Model | Phase 5 |
| `knowledge_object` (3-scope) | Tommy's KB Schema | Phase 6 |
| `knowledge_event` | Tommy's KB Schema | Phase 6 |
| `config_table` | Tommy's Tech Spec | Phase 1 |
