# Session Log — 2026-03-10

## Objective

Production hardening of Brain path with strict multi-tenant safety, provider abstraction, grounded responses, and execution traceability.

## Completed Changes

1. B-01 hard cleanup
- Removed final legacy direct OpenAI streaming path from brain agent base.
- Enforced abstraction-only provider usage in active brain execution path.

2. B-02 bounded agentic execution
- Migrated `/api/brain/chat` runtime to `brainOrchestrator.handleTurn()`.
- Enabled bounded loop controls (`max_turns`, per-turn tool cap, total tool cap).
- Wired org agent config (`preferred_provider`, `preferred_model`, `max_turns`).
- Added tool loading via `ToolLoader` (granted + enabled tools only).

3. Multi-tenant integrity hardening
- Conversation ownership check for provided `conversationId` (`org_id` + `user_id`).
- Org-scoped message history reads.
- `messages` persistence now includes `org_id` and `user_id`.
- Org-bound tool permission check in orchestrator.

4. B-03 grounding + knowledge gap path
- Added strict grounding policy enforcement in final response path.
- Added retrieval-failure gap upsert path to `knowledge_gaps` in chat route.
- Propagated `gapDetected` and `gapConfidence` metadata to logs/response metadata.

5. Generate-email tool productionization
- Replaced placeholder response with real queue dispatch.
- Added org-scoped template/engine resolution.
- Added `engine_run_logs` audit entry creation.
- Enqueued real `engine-execution` job with traceable IDs.

6. Streaming observability upgrade
- Added `onEvent` callback to `handleTurn()`.
- Emitted real-time events for `turn_start`, `llm_response`, `tool_result`, `final`.
- Updated SSE route to stream orchestration events instead of opaque buffer-only behavior.

7. Hydration mismatch fix (Next.js runtime)
- Root cause: non-deterministic theme initialization between SSR and client hydration in `ThemeContext`.
- Fix: made initial theme state deterministic for SSR/first hydration render.
- Added post-mount client theme resolution (`localStorage`/DOM/system) via effect.
- Result: server and client initial markup now align; theme preference is applied immediately after mount without hydration mismatch.

8. Brain chat SSE protocol hardening
- Added `conversationId` to streamed payloads and done event.
- Added final stream metadata in `done` event (`turnsUsed`, `tokensUsed`, `toolsUsed`, gap metadata).
- Added `X-Conversation-Id` response header for streaming route parity with frontend expectations.

9. Worker type-safety and runtime UX hardening
- Fixed workers TypeScript blocker in `apps/workers/src/processors/conversation/summarizer.ts`:
  - removed stray invalid statements
  - switched to singleton `aiService` import (no invalid class import/new usage)
- Re-ran workers typecheck: pass.
- Fixed chat UI streaming behavior in `apps/frontend/src/app/(main)/brain-chat/page.tsx`:
  - while streaming, partial assistant content is now rendered incrementally
  - fallback spinner appears only before first streamed token
  - added subtle streaming cursor indicator

10. Migration governance lock
- Audited migration trees and confirmed parallel drift exists:
  - `supabase/migrations` (canonical)
  - `database/migrations` (legacy/parallel)
  - `apps/frontend/supabase/migrations` (parallel)
- Added explicit source-of-truth policy file:
  - `supabase/MIGRATION_SOURCE_OF_TRUTH.md`
- Added non-executable guard READMEs in non-canonical folders to prevent accidental pushes.

## Validation Notes

- IDE lints on modified files: clean.
- Frontend lint script blocked by interactive Next.js ESLint setup prompt.
- Workers typecheck now passes after summarizer fix (`npm run typecheck` in `apps/workers`).

## Open Validation Tasks

1. Run live smoke for `/api/brain/chat`:
- verify event sequence in SSE
- verify strict grounding disclosure on low-confidence query
- verify `knowledge_gaps` upsert on retrieval-failure path

2. Run live tool smoke for `generate_email`:
- verify `engine_run_logs` row creation
- verify queue job creation and worker consumption
- verify final output persistence path

## Live Validation Attempt (Blocked)

- Attempted browser-based runtime validation on localhost.
- Found app at login gate (`/login`) with no active authenticated session available to automation.
- Because of auth gate, could not run:
  - Brain chat SSE event verification
  - strict grounding live response check
  - generate_email end-to-end trigger from UI
- Next step: run same validation immediately after authenticated session is active.

## Current Status

- B-01: complete
- B-02: implemented, pending live validation
- B-03: implemented, pending live validation

## Governance Update (Max-2 Migration Sources, Non-Overlapping)

- Locked migration governance to max-2 logical sources:
  - Source A (active executable): `supabase/migrations`
  - Source B (frozen legacy reference): `database/migrations` + `apps/frontend/supabase/migrations`
- Updated `supabase/MIGRATION_SOURCE_OF_TRUTH.md` with explicit conflict-resolution map and execution checklist.
- Strengthened non-canonical guard READMEs to prevent accidental execution from legacy folders.

## Plan Execution Update (A-02 Compatibility Mapping)

- Implemented `supabase/migrations/00000000000013_partner_org_compat.sql`.
- Added deterministic status mapper from `organizations.status` to `partner.status`:
  - `active -> active`
  - `suspended -> suspended`
  - `cancelled -> archived`
- Added idempotent backfill to create missing `partner` rows from existing `organizations`.
- Added `organizations` trigger sync to keep `partner` aligned on insert/update (`name`, `status`).
- Added explicit compatibility view `public.partner_organization_map` for dual-term (`organization_id` / `partner_id`) consumers.

## Plan Execution Update (Canonical Port of Pending 024-028)

- Clarified migration intent: pending files must be migrated, but from canonical chain.
- Ported pending legacy migrations into `supabase/migrations` for direct remote migration path:
  - `00000000000014_brain_agents.sql`
  - `00000000000015_prompt_layers.sql`
  - `00000000000016_brain_tools_registry.sql`
  - `00000000000017_kb_pipeline.sql`
  - `00000000000018_brain_learning.sql`
- Maintained `028` FK alignment with canonical RS:OS table name (`belief(id)`).

## Remote Migration Status Update

- User confirmed manual remote application succeeded for:
  - `00000000000012_rs_os_core.sql`
  - `00000000000013_partner_org_compat.sql`
  - `00000000000014_brain_agents.sql`
  - `00000000000015_prompt_layers.sql`
  - `00000000000016_brain_tools_registry.sql`
  - `00000000000017_kb_pipeline.sql`
  - `00000000000018_brain_learning.sql`
- Next execution moved to Phase B live validation (B-02/B-03 + generate_email path).

## Build-First Directive Update

- Validation tasks moved to tech debt bucket for this session so implementation can continue without pause.
- Backlog statuses updated:
  - `A-06` marked deferred (tech debt)
  - `B-02` validation marked deferred (tech debt)
  - `B-03` validation marked deferred (tech debt)
- Started Phase 1 implementation:
  - Added `apps/frontend/src/app/api/briefs/generate/route.ts`
  - Endpoint creates immutable brief + exactly two beliefs (champion/challenger) + competition pair
  - Enforces org scoping via `users.org_id` and admin/owner write permission

## Phase 1 Progress (Execution Continued)

- Added `apps/frontend/src/app/api/flows/generate/route.ts`.
- Endpoint generates initial belief-bound 4-email block (steps 1-4) with subject A/B variants.
- Flow is persisted in `flow` and step rows in `flow_step` under strict partner scope.
- Added rollback behavior if step creation fails (deletes parent flow record).

## Phase 1 Progress (Angle System)

- Added canonical migration `supabase/migrations/00000000000019_angle_system.sql`:
  - `offer_angles` table (7-angle per offer model)
  - `offer_angle_hooks` table (3-4 hooks per angle support)
  - partner/org-scoped RLS policies
- Added API `apps/frontend/src/app/api/angles/route.ts`:
  - `POST` seeds 7 canonical angles + default hooks for an offer
  - `GET` returns seeded angles with hooks for an offer
- Updated `apps/frontend/src/app/api/briefs/generate/route.ts`:
  - validates provided angle against seeded `offer_angles`
  - auto-picks first active seeded angle when angle is not passed

## Phase 1 Progress (Superadmin Brief Manager)

- Added `apps/frontend/src/app/api/superadmin/briefs/route.ts`:
  - `GET` lists briefs with paired beliefs + competition summary
  - `GET ?mode=options&org_id=...` returns offer/icp options for brief creation
  - `POST` creates brief + champion/challenger beliefs + competition pair under selected org
- Added `apps/frontend/src/app/api/superadmin/briefs/[id]/lock/route.ts`:
  - locks brief by setting `locked_fields.immutable_after_launch = true` with audit metadata
- Added `apps/frontend/src/app/superadmin/briefs/page.tsx`:
  - create/view/filter/lock brief flows
  - displays champion/challenger belief pair and allocation snapshot

## Phase 1 Progress (Reply Classification Service)

- Added `apps/frontend/src/app/api/replies/classify/route.ts`.
- Endpoint classifies inbound replies into canonical labels:
  - Interested, Clarification, Objection, Timing, Referral, Negative, Noise
- Uses `AIProviderService.generateChat()` with org-scoped provider chain (no direct provider call).
- Persists classification as `signal_event` (`event_type = reply`) with structured metadata payload.
- Includes deterministic heuristic fallback if model output is invalid/unavailable, while still persisting event audit trail.

## Phase 2 Progress (Signal Ingestion Start)

- Added `apps/frontend/src/app/api/signals/ingest/route.ts`.
- Endpoint ingests canonical signal events with strict org scoping and entity validation:
  - required IDs: `offer_id`, `icp_id`, `brief_id`, `belief_id`
  - optional IDs: `flow_id`, `flow_step_id`
  - allowed event types: `send`, `reply`, `click`, `booking`, `show`, `revenue`, `bounce`, `complaint`, `open`
- Persists to `signal_event` with audit metadata and event timestamp.

## Phase 2 Progress (Confidence + Hybrid Gating)

- Added worker confidence engine:
  - `apps/workers/src/processors/analytics/confidence-engine.ts`
  - computes belief confidence from `signal_event` using `config_table.confidence_formula_v1` weights
  - updates `belief.confidence_score` in batch scope (org or global)
- Extended analytics worker route:
  - `apps/workers/src/processors/analytics/aggregator.ts` now supports `type = belief-confidence`
- Added queue helper + enqueue endpoint:
  - `apps/frontend/src/lib/queues.ts` -> `enqueueBeliefConfidenceRecompute()`
  - `apps/frontend/src/app/api/signals/confidence/recompute/route.ts`
- Added Hybrid Gating evaluation scaffold endpoint:
  - `apps/frontend/src/app/api/signals/gating/evaluate/route.ts`
  - computes gate checks from recent signals + config thresholds
  - persists results into `belief_gate_snapshot`

## Phase 2 Progress (Allocation Engine)

- Added worker allocation engine:
  - `apps/workers/src/processors/analytics/allocation-engine.ts`
  - processes active `belief_competition` pairs after gate pass checks
  - applies stepwise allocation shifts using:
    - `config_table.allocation_min_exploration`
    - `config_table.allocation_step_size` (fallback default 0.1)
  - updates both `belief_competition` and corresponding `belief.allocation_weight`
- Extended analytics aggregator for `type = allocation-engine`.
- Added queue helper + API trigger:
  - `apps/frontend/src/lib/queues.ts` -> `enqueueAllocationRebalance()`
  - `apps/frontend/src/app/api/signals/allocation/rebalance/route.ts`

## Phase 2 Progress (Webhook Ingestion)

- Added migration `supabase/migrations/00000000000020_meeting_events.sql`:
  - new canonical `meeting` table for booking lifecycle + org/belief linkage
- Added Mailgun delivery webhook receiver:
  - `apps/frontend/src/app/api/webhooks/email/mailgun/route.ts`
  - verifies Mailgun signature (`MAILGUN_WEBHOOK_SIGNING_KEY`)
  - maps provider events to canonical signal events and writes `signal_event`
- Added SES delivery webhook receiver:
  - `apps/frontend/src/app/api/webhooks/email/ses/route.ts`
  - verifies SNS signature and supports subscription confirmation
  - maps SES events to canonical signal events and writes `signal_event`
- Added CRM booking webhook receiver:
  - `apps/frontend/src/app/api/webhooks/crm/booking/route.ts`
  - verifies shared secret (`CRM_BOOKING_WEBHOOK_SECRET`)
  - writes booking record to `meeting` and booking event to `signal_event`

## Phase 3 Progress (ICP Construction Service)

- Added `apps/frontend/src/app/api/icp/construct/route.ts`.
- Endpoint enforces org scope + admin/owner auth and creates canonical ICP records.
- Accepts structured segmentation input (taxonomy segments, firmographics, persona, intent, exclusions).
- Persists full construction output in `icp.criteria` with quality coverage scoring metadata.

## Phase 3 Progress (Identity Sourcing + Contact Decisions)

- Added canonical migration `supabase/migrations/00000000000021_identity_sourcing_and_decisions.sql`:
  - `global_contact_suppression`
  - `partner_contact_suppression`
  - `identity_pool`
  - `contact_decisions`
- Added identity sourcing API:
  - `apps/frontend/src/app/api/identity/source/route.ts`
  - applies suppression + ICP fit filters and upserts identities into `identity_pool`
- Added contact decision API:
  - `apps/frontend/src/app/api/contact/decide/route.ts`
  - evaluates each identity and writes auditable decisions (`CONTACT_NOW`, `DELAY`, `SUPPRESS`) into `contact_decisions`

## Phase 3 Progress (Superadmin ICP Manager)

- Added superadmin ICP APIs:
  - `apps/frontend/src/app/api/superadmin/icps/route.ts` (list/create/options)
  - `apps/frontend/src/app/api/superadmin/icps/[id]/source/route.ts`
  - `apps/frontend/src/app/api/superadmin/icps/[id]/decide/route.ts`
- Added ICP Manager UI:
  - `apps/frontend/src/app/superadmin/icp-manager/page.tsx`
  - supports ICP create, identity sourcing run, and contact-decision run with live counts
- Finalized superadmin-auth integration for ICP manager stack using `getSuperadmin` token flow on all `/api/superadmin/icps*` routes.

## Phase 4 Progress (Satellite Management Start)

- Added migration `supabase/migrations/00000000000022_satellite_management.sql`:
  - `sending_domains`
  - `sending_satellites`
  - operational statuses, verification/warmup state, and send-cap controls
- Added provisioning API:
  - `apps/frontend/src/app/api/satellites/provision/route.ts`
  - bulk provisions domains + generated mailbox satellites per partner
- Added management API:
  - `apps/frontend/src/app/api/satellites/route.ts`
  - lists domains/satellites and updates satellite operational state (`status`, `daily_send_cap`, `is_active`)

## Phase 4 Progress (Send Pacing Engine)

- Added pacing check endpoint:
  - `apps/frontend/src/app/api/satellites/pacing/check/route.ts`
  - evaluates requested sends against effective daily cap (min of satellite cap, global config cap)
  - applies warmup ramp fraction for satellites in warming state
  - returns approved send count, remaining capacity, and warmup metadata
- Added send recording endpoint:
  - `apps/frontend/src/app/api/satellites/pacing/record/route.ts`
  - increments `current_daily_sent`, advances `warmup_day` for warming satellites
  - auto-transitions satellite status: `provisioning -> warming -> active` as warmup completes
- Added daily reset endpoint:
  - `apps/frontend/src/app/api/satellites/pacing/reset-daily/route.ts`
  - resets `current_daily_sent` to 0 for all satellites in an org (scheduled cron or manual trigger)
  - admin/owner/superadmin gated

## Phase 4 Progress (Deliverability Monitoring)

- Added migration `supabase/migrations/00000000000023_deliverability_monitoring.sql`:
  - `deliverability_snapshots` table with computed columns (bounce_rate, complaint_rate, open_rate, click_rate)
  - `deliverability_alerts` table with severity levels and acknowledgement tracking
- Added snapshot generation endpoint:
  - `apps/frontend/src/app/api/satellites/deliverability/snapshot/route.ts`
  - aggregates `signal_event` data per satellite per day
  - computes reputation score with configurable penalty weights from `config_table`
  - auto-generates critical/warning alerts for high bounce/complaint rates and reputation drops
- Added deliverability dashboard endpoint:
  - `apps/frontend/src/app/api/satellites/deliverability/route.ts`
  - returns period summary (sends, bounces, complaints, opens, clicks, rates, avg reputation)
  - returns daily snapshot history and unacknowledged alerts
- Added alert acknowledgement endpoint:
  - `apps/frontend/src/app/api/satellites/deliverability/alerts/acknowledge/route.ts`
  - bulk acknowledge alerts with user audit trail

## Phase 4 Progress (Domain Management)

- Added domain management APIs:
  - `apps/frontend/src/app/api/domains/route.ts` (GET list with nested satellites, POST create with DNS record generation)
  - `apps/frontend/src/app/api/domains/[id]/route.ts` (GET detail, PATCH update, DELETE with active-satellite guard)
  - `apps/frontend/src/app/api/domains/[id]/verify/route.ts` (POST triggers DNS verification check)
- Domain creation auto-generates required DNS records (SPF, DKIM, DMARC) based on provider (Mailgun, SES, Mailwizz)
- Supports domain deactivation, warmup status management, and safe deletion with satellite dependency checks

## Phase 4 Progress (Mailwizz Integration)

- Added Mailwizz webhook receiver:
  - `apps/frontend/src/app/api/webhooks/email/mailwizz/route.ts`
  - supports HMAC-SHA256 signature verification (x-mw-signature/x-mailwizz-signature) or Bearer token fallback
  - maps Mailwizz events (delivery, open, click, bounce, complaint, hard_bounce, soft_bounce) to canonical signal types
  - handles batch event payloads
  - extracts required IDs (partner_id, offer_id, icp_id, brief_id, belief_id) from custom fields or root payload
  - persists as `signal_event` with full Mailwizz metadata (campaign_uid, subscriber email, bounce type)

## Phase 4 — COMPLETE

All Phase 4 items implemented:
1. Satellite Management (provisioning + CRUD)
2. Send Pacing Engine (check/record/reset with warmup ramp)
3. Deliverability Monitoring (snapshots + reputation + alerts)
4. Domain Management (DNS generation + verification + lifecycle)
5. Email Provider Integration (Mailgun + SES + Mailwizz webhooks)

Next: Phase 5 — Promotion Engine + Flow Extension

## Enterprise Provider & Config Infrastructure

- Added migration `supabase/migrations/00000000000024_email_provider_configs.sql`:
  - `email_provider_configs` table: modular, per-org or global provider records
  - Supports: Mailwizz, Mailgun, SES, SendGrid, Postmark, SparkPost, SMTP, Custom
  - Full credential storage (API keys, secrets, SMTP creds, webhooks)
  - Per-provider operational limits (max sends/day, max sends/hour, batch size, rate limit/sec)
  - Per-provider warmup config (enabled, start volume, increment %, target days)
  - Health tracking (status, failures, totals)
  - Seeded 19 new platform config keys into `config_table` for all previously-hardcoded values

- Added shared config loader utility:
  - `apps/frontend/src/lib/platform-config.ts`
  - `getConfigValue()` and `getConfigValues()` with 60s in-memory cache
  - Throws on missing keys (fail-fast, no silent fallbacks)
  - `invalidateConfigCache()` called on writes via platform-config API

- Added Superadmin Provider Management API:
  - `apps/frontend/src/app/api/superadmin/providers/route.ts` (GET list / POST create)
  - `apps/frontend/src/app/api/superadmin/providers/[id]/route.ts` (GET / PATCH / DELETE)
  - `apps/frontend/src/app/api/superadmin/providers/[id]/test/route.ts` (POST — live connection test per provider type)
  - Secrets masked in GET responses, masked values ignored on PATCH
  - Active provider guard on DELETE

- Added Superadmin Platform Config API:
  - `apps/frontend/src/app/api/superadmin/platform-config/route.ts` (GET categorized / PUT single or bulk / DELETE)
  - Config keys grouped by category: send_pacing, deliverability, domains, confidence, allocation, promotion
  - Protected keys guard on DELETE
  - Cache invalidation on every write

- Added Superadmin Email Provider UI:
  - `apps/frontend/src/app/superadmin/email-providers/page.tsx`
  - Full CRUD: add/edit/test/activate/deactivate/delete
  - Scope filter (Global / Per-Org / All)
  - Expandable cards with stats (sent/bounced/complained), warmup config, connection info
  - Provider type color-coded badges, health status indicators
  - Modal form with sections: Basic, API Creds, SMTP, Webhook, Limits, Warmup, Notes

- Added Superadmin Platform Config UI:
  - `apps/frontend/src/app/superadmin/platform-config/page.tsx`
  - Accordion-style category sections with icons
  - Inline editing per config key with save/discard per row
  - Bulk "Save All" for batch updates
  - Dirty state tracking with unsaved changes warning
  - Custom config key creation form
  - Multi-line JSON editing for complex values (e.g. confidence formula weights)

- Refactored all operational endpoints to read from DB config (zero hardcoded defaults):
  - `satellites/pacing/check` → reads `send_pacing_global_daily_cap`, `send_pacing_warmup_min_volume`
  - `satellites/deliverability/snapshot` → reads all 8 deliverability threshold keys individually
  - `domains` POST → reads `domain_default_warmup_days`, `domain_max_domains_per_org` (+ enforces domain limit)
  - `satellites/provision` → reads `send_pacing_global_daily_cap`, `send_pacing_warmup_default_days`, `domain_max_satellites_per_domain`, `domain_max_domains_per_org` (+ enforces limits)
  - Provider list on provisioning expanded to include all provider types (mailwizz, sendgrid, postmark, sparkpost, smtp, custom)

## Phase 5 Progress (Promotion Engine)

- Added manual promotion API:
  - `apps/frontend/src/app/api/beliefs/promote/route.ts`
  - Enforces valid transition map (HYP→TEST→SW→IW→RW→GW, plus PAUSED transitions)
  - Runs full 5-gate check before promotion (sample size, confidence, negative rate, booked call rate, min exploration)
  - All thresholds read from `config_table` via `getConfigValues()`
  - Persists `belief_gate_snapshot` on every evaluation attempt
  - Persists `belief_promotion_log` on every transition (success, blocked, or pause)
  - Supports `force: true` for admin gate bypass with full audit trail
- Added automated promotion worker:
  - `apps/workers/src/processors/analytics/promotion-engine.ts`
  - Evaluates all beliefs in TEST/SW/IW/RW status against gate conditions
  - Auto-promotes on pass, logs blocked reason on fail
  - Wired into analytics aggregator as `type = 'promotion-engine'`
- Added batch trigger API:
  - `apps/frontend/src/app/api/beliefs/promote/batch/route.ts`

## Phase 5 Progress (Flow Extension Service)

- Added flow extension API:
  - `apps/frontend/src/app/api/flows/extend/route.ts`
  - Block 2 (emails 5-8) and Block 3 (emails 9-12) extension support
  - Governance enforced:
    - Allowed mutations: friction_level, problem_specificity, idea_order, fit_clarity, urgency_tone, social_proof_depth
    - Forbidden mutations: offer, icp, belief_mixing, angle_change, core_hypothesis
  - Gate checks before extension: minimum sample size + confidence score
  - Flow version bumped on extension with full metadata audit
- Added post-12 reflection API:
  - `apps/frontend/src/app/api/flows/reflect/route.ts`
  - Sequential step enforcement (must follow last step number)
  - Belief expression continues indefinitely in reflection phase

## Phase 5 Progress (Extension Analysis)

- Added flow analysis API:
  - `apps/frontend/src/app/api/flows/[id]/analysis/route.ts`
  - Step-level engagement metrics: sends, opens, clicks, replies, bookings, bounces + rates
  - Engagement type mix per step: click-only, reply-only, click-and-reply, booking-direct
  - Account spread detection (unique accounts / sends ratio)
  - Reply composition analysis from signal metadata classifications
  - Block-level performance breakdown (Block 1, 2, 3, Reflection)

## Phase 5 Progress (Belief Dashboard)

- Added superadmin belief data API:
  - `apps/frontend/src/app/api/superadmin/beliefs/route.ts`
  - List view with status distribution counts
  - Detail view with promotion history, gate snapshots, competition pair, flows, signal counts
- Added superadmin Belief Dashboard UI:
  - `apps/frontend/src/app/superadmin/belief-dashboard/page.tsx`
  - Ladder overview grid (HYP/TEST/SW/IW/RW/GW/PAUSED counts)
  - Split layout: belief list (left) + detail panel (right)
  - Promotion actions: gated promote, force promote, pause, resume
  - Gate snapshot viewer with per-check pass/fail display
  - Promotion history timeline
  - Signal event counts, competition pair display
  - Status filter + org filter

## Phase 5 — COMPLETE

All Phase 5 items implemented:
1. Promotion Engine (manual + automated worker + batch trigger)
2. Flow Extension Service (Block 2, Block 3, governance rules, reflection phase)
3. Extension Analysis (step-level engagement, reply composition, account spread)
4. Superadmin Belief Dashboard (ladder view, scores, gates, promotion history)

Next: Phase 6 — Mastery Agents (first 5)

## Phase 6 Progress (Schema)

- Added migration `supabase/migrations/00000000000025_mastery_agents_schema.sql`:
  - `knowledge_object` table: 30+ field canonical model
    - 3 scopes: local, candidate_global, global
    - 10 object types: contact_pattern, timing_pattern, angle_performance, pacing_rule, reply_interpretation, etc.
    - Full evidence tracking: count, sources, confidence, sample_size, stability
    - Applicability filters: industries, geographies, seniorities, offer_types
    - Governance: promotion_status lifecycle (active → candidate → under_review → promoted → demoted → suspended → retired)
    - Cross-partner evidence fields for global promotion
    - Revalidation cycle scheduling (fast/medium/slow)
  - `agent_decision_log` table: full audit trail for every agent decision
    - Agent identity (type + version), inputs, outputs, confidence, reasoning
    - Knowledge objects referenced, locked constraints applied
    - Outcome tracking (filled after decision plays out)

## Phase 6 Progress (Agent Framework)

- Added `apps/frontend/src/services/mastery/MasteryAgentBase.ts`:
  - Abstract base class for all Mastery Agents
  - `readKnowledge()`: reads Local KB first, Global priors second. Never reads candidate_global.
  - `writeKnowledge()`: writes Local KB only (agents cannot write to global)
  - `updateKnowledge()`: updates existing local KB entries with new evidence
  - `logDecision()`: persists full audit trail to `agent_decision_log`
  - All 5 agents extend this base

## Phase 6 Progress (5 Agents Implemented)

1. **Contact Decision Agent** (`ContactDecisionAgent.ts`)
   - Decides WHO to contact from identity pool
   - Scoring: identity confidence, verification status, in-market signals, recency, previous outcomes
   - KB boost: industry patterns, seniority patterns from local/global knowledge
   - Output: CONTACT_NOW / DELAY / SUPPRESS

2. **Timing Window Agent** (`TimingWindowAgent.ts`)
   - Decides WHEN to send
   - KB-driven: best day/hour per industry/geography, avoid-days
   - Seniority adjustment (C-Suite gets earlier slots)
   - Output: ISO timestamp for optimal send time

3. **Angle Selection Agent** (`AngleSelectionAgent.ts`)
   - Decides WHICH belief angle to use
   - KB-driven: angle reply_rate, booking_rate, negative_rate performance data
   - Penalizes previously-used angles for diversity
   - Industry match bonuses
   - Output: selected angle_key with scores for all angles

4. **Send Pacing Agent** (`SendPacingAgent.ts`)
   - Decides HOW FAST to scale satellite delivery
   - Input: satellite health, reputation, bounce/complaint rates, warmup state
   - Actions: hold / increase / decrease / pause
   - Auto-pause on reputation < 40, reduce on high bounce/complaint
   - KB boost: pacing rules from learned patterns
   - Respects config_table limits as locked constraints

5. **Reply Meaning Agent** (`ReplyMeaningAgent.ts`)
   - Classifies reply intent beyond 7-label taxonomy
   - Keyword matching with weighted scoring across 8 signal categories
   - KB-driven: regex patterns from learned reply_interpretation knowledge
   - Outputs: label + recommended action (ESCALATE_TO_BOOKING, SEND_FOLLOW_UP, etc.)

## Phase 6 Progress (Pipeline Integration)

- Added unified agent execution API:
  - `apps/frontend/src/app/api/agents/execute/route.ts`
  - Accepts any agent_type + input, routes to correct agent instance

- Added pre-send pipeline:
  - `apps/frontend/src/app/api/agents/pre-send/route.ts`
  - Chains: Contact Decision → Timing Window → Angle Selection → Send Pacing
  - Short-circuits on SUPPRESS (contact) or PAUSE (pacing)
  - Returns full pipeline trace with all 4 agent decisions
  - Loads real data from identity_pool, satellites, deliverability_snapshots, offer_angles

- Added reply classification pipeline:
  - `apps/frontend/src/app/api/agents/classify-reply/route.ts`
  - Wires Reply Meaning Agent into inbound reply processing
  - Auto-persists classification as signal_event with full metadata

- Added decision log viewer:
  - `apps/frontend/src/app/api/superadmin/decisions/route.ts`
  - Filter by org, agent_type, entity_id
  - Returns agent distribution counts

## Phase 6 — COMPLETE

All Phase 6 items implemented:
1. Knowledge Object schema (30+ field canonical model, 3 scopes)
2. Agent Framework (base class, KB read/write, decision logging)
3. Decision Log table with full audit trail
4. 5 Mastery Agents with real decision logic
5. Pipeline integration (pre-send chain + reply classification)

Next: Phase 7 — Knowledge Governance + Remaining 4 Agents

## Phase 7 Progress (Knowledge Governance Engine)

- Added governance promotion API:
  - `apps/frontend/src/app/api/knowledge/governance/promote/route.ts`
  - Valid transition map: active → candidate → under_review → promoted → demoted/suspended/retired
  - No direct local-to-global jumps enforced
  - Promotion to global requires: cross_partner_count >= 2, sample_size >= 100, stability_score >= 0.6, no harmful side effects
  - On `promoted`: creates global copy (scope='global', partner_id=null) with promoted_from_id reference
  - Source object moves to candidate_global scope on candidate transition

- Added revalidation API:
  - `apps/frontend/src/app/api/knowledge/governance/revalidate/route.ts`
  - Processes knowledge objects past next_revalidation_at
  - Auto-suspends: stale objects (3x cycle with <3 evidence)
  - Auto-demotes: low confidence + low stability
  - Auto-adjusts cycle: high conf/stability → slow, low conf → fast
  - Schedules next revalidation per cycle duration

- Added KB CRUD API:
  - `apps/frontend/src/app/api/knowledge/route.ts`
  - GET: list knowledge objects (local for org, global for all, candidate_global)
  - POST: create local KB entries with revalidation scheduling

## Phase 7 Progress (Remaining 4 Agents)

6. **Buying Role Agent** (`BuyingRoleAgent.ts`)
   - Classifies: Decision Maker, Influencer, Champion, Gatekeeper, End User, Evaluator
   - Seniority mapping (C-Suite → Decision Maker, etc.)
   - Title keyword analysis (ceo, procurement, analyst, etc.)
   - Engagement history (forwards → Influencer/Champion, replies → Champion)
   - KB boost from department-role patterns

7. **Buyer Stage Agent** (`BuyerStageAgent.ts`)
   - Stages: Unaware → Problem Aware → Solution Aware → Product Aware → Most Aware → Evaluating → Decided
   - Signal-driven: sends/opens/clicks/replies/bookings progression
   - Reply classification integration (Interested → Most Aware, Objection → Evaluating)
   - In-market signals and sequence duration factors
   - KB engagement patterns for stage classification

8. **Uncertainty Resolution Agent** (`UncertaintyResolutionAgent.ts`)
   - 9 uncertainty types: problem_fit, solution_credibility, pricing_value, implementation_risk, etc.
   - Stage-driven scoring (early → problem_fit, late → pricing/authority)
   - Objection text analysis for specific uncertainty detection
   - KB-driven uncertainty boost patterns per buyer stage

9. **Sequence Progression Agent** (`SequenceProgressionAgent.ts`)
   - 7 actions: next_step, skip_to_cta, repeat_with_variation, escalate_channel, pause_sequence, end_sequence, extend_block
   - Booking → end, Interested → skip to CTA, Negative → end
   - No-open streak detection (3+ → pause/escalate, 5+ → end)
   - Block boundary detection for extension triggers
   - KB progression patterns with trigger conditions

- All 4 agents wired into `/api/agents/execute` route with full decision logging

## Phase 7 Progress (Network Learning Layer)

- Added network learning worker:
  - `apps/workers/src/processors/analytics/network-learning.ts`
  - Scans all local KB objects with confidence >= 0.5 and sample_size >= 20
  - Groups by pattern signature (object_type + title + pattern_data keys)
  - Creates candidate_global objects when pattern appears in >= 2 partners
  - Merges pattern_data: averages numerics, mode for strings
  - Updates existing candidates with fresh cross-partner evidence
  - Wired into analytics aggregator as `type = 'network-learning'`

## Phase 7 Progress (Global KB Management)

- Added superadmin KB management API:
  - `apps/frontend/src/app/api/superadmin/knowledge/route.ts`
  - GET: full listing with scope/type/status filters and distribution counts
  - PATCH: review and update governance fields (promotion_status, review_notes, revalidation_cycle, harmful_side_effects)
  - DELETE: remove knowledge objects

## Phase 7 — COMPLETE

All Phase 7 items implemented:
1. Knowledge Governance Engine (promotion lifecycle, evidence gates, revalidation)
2. Remaining 4 Agents (Buying Role, Buyer Stage, Uncertainty Resolution, Sequence Progression)
3. Network Learning Layer (cross-partner detection, candidate global creation)
4. Global KB (read-only for partners, write through governance, superadmin management)

Next: Phase 8 — Dashboards + Member Portal

## Dynamic Agent Management System

- Added migration `supabase/migrations/00000000000026_mastery_agent_configs.sql`:
  - `mastery_agent_configs` table: fully dynamic agent definitions
  - Per-org or global scope with unique key constraints
  - Configurable: scoring_rules (condition-based), keyword_rules (text matching), field_rules (input mapping)
  - KB integration settings (object types, min confidence, max objects, write permissions)
  - Pipeline positioning (pre_send, post_reply, pre_extension, periodic, on_demand + order)
  - Locked constraints, confidence formula, execution timeout, fallback output
  - 9 system agents seeded as global configs with full rule sets

- Added `DynamicAgentExecutor` (`services/mastery/DynamicAgentExecutor.ts`):
  - Loads agent config from DB (org-specific override → global fallback)
  - Generic rule engine: evaluates scoring rules with condition operators (==, !=, >, >=, <, <=, contains, in, exists)
  - Field mapping execution, keyword matching with hit-count scoring
  - KB integration: reads local-first then global, applies pattern_data to scores
  - Full decision logging to `agent_decision_log`

- Added Superadmin Agent Management API:
  - `apps/frontend/src/app/api/superadmin/mastery-agents/route.ts` (GET list / POST create)
  - `apps/frontend/src/app/api/superadmin/mastery-agents/[id]/route.ts` (GET detail + recent decisions / PATCH / DELETE)
  - System agents protected from deletion (deactivate only)

- Added Superadmin Mastery Agent Manager UI:
  - `apps/frontend/src/app/superadmin/mastery-agents/page.tsx`
  - Category filter (contact, timing, angle, pacing, reply, buying_role, etc.)
  - Expandable cards: agent key, version, pipeline stage, rule counts
  - Full CRUD: create/edit/duplicate/activate/deactivate/delete
  - JSON editors for scoring rules, keyword rules, field mapping rules
  - KB config: object types, min confidence, write permissions
  - Pipeline positioning: stage + order
  - Live test panel: input JSON → execute agent → see result
  - Duplicate agent for org-specific overrides

