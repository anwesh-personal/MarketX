# 03 — RS:OS Database Schema

**Source:** Tommy's MarketWriter Data Model (canonical) + RS OS Technical Implementation Spec
**Status:** NOT YET CREATED — this is the Phase 0 migration spec

---

## Entity Relationship Overview

```
partner ──┬── offer
          ├── icp ──── brief ──┬── belief ──┬── flow ──── flow_step
          │                    │            │            └── asset
          │                    │            └── belief_competition
          │                    └── config_table
          ├── sending_identity
          └── signal_event ──── meeting ──── opportunity ──── revenue_event
                              └── belief_gate_snapshot
                              └── belief_promotion_log
                              └── belief_daily_rollup
```

---

## Core Tables (Phase 0 Migration)

### partner
Maps to existing `organizations` table. We add missing fields via ALTER or create a view.
- partner_id (PK) = organizations.id
- partner_name = organizations.name
- status (active, paused, terminated)
- scale_tier
- monthly_fee
- rev_share_percent
- created_at, updated_at

### offer
- offer_id (PK, UUID)
- partner_id (FK → partner)
- offer_name
- offer_category (optional)
- primary_cta_type (book_call, opt_in, other)
- created_at, updated_at
- Index: (partner_id)

### icp
Replaces/extends `imt_icps`. Immutable segmentation object.
- icp_id (PK, UUID)
- partner_id (FK → partner)
- icp_name
- icp_definition_version
- firmographics_json (industry, company_size, revenue_band, geo)
- persona_scope_json (titles, seniority, roles)
- exclusions_json
- data_constraints_json
- created_at, updated_at
- Index: (partner_id), (icp_definition_version)

### brief
Immutable after launch. One brief = one ICP = one belief competition.
- brief_id (PK, UUID)
- parent_brief_id (FK → brief, nullable)
- partner_id (FK → partner)
- offer_id (FK → offer)
- icp_id (FK → icp)
- status (draft, active, retired)
- created_by
- created_at
- locked_at (nullable)
- immutable_after_launch (bool, default true)
- icp_lock_block_json
- test_intent_json
- decision_movement_json
- angle_meta_json
- signal_config_json
- extension_intent_json
- governance_locks_json
- Index: (partner_id, offer_id, icp_id), (status), (parent_brief_id)

### belief
The atomic unit of testing and promotion.
- belief_id (PK, UUID)
- partner_id (FK → partner)
- offer_id (FK → offer)
- icp_id (FK → icp)
- brief_id (FK → brief)
- belief_role (champion, challenger)
- parent_belief_id (FK → belief, nullable)
- status (hypothesis, testing, active, retired, suppressed)
- current_belief_text
- desired_belief_text
- belief_shift_statement
- decision_movement_text
- angle_class
- angle_name
- must_say_json
- must_not_say_json
- forbidden_claims_json
- compliance_notes_json
- promotion_state (HYP, TEST, SW, IW, RW, GW)
- confidence_score (float)
- allocation_pct (int)
- durability_start_date
- promotion_eligible (bool)
- created_at, updated_at
- Index: (partner_id, offer_id), (icp_id), (brief_id), (promotion_state), (belief_role), (status)
- Constraint: UNIQUE(brief_id, belief_role)

### belief_competition
- competition_id (PK, UUID)
- partner_id, offer_id, icp_id, brief_id
- champion_belief_id (FK → belief)
- challenger_belief_id (FK → belief)
- champion_allocation_pct
- challenger_allocation_pct
- status (active, closed)
- created_at, updated_at
- Index: (brief_id), (status)

### flow
- flow_id (PK, UUID)
- partner_id, offer_id, icp_id, brief_id, belief_id (all FK)
- flow_type (outbound_email, inbound_nurture, retargeting)
- status (draft, active, paused, retired)
- entry_criteria_json
- exit_criteria_json
- sequence_count
- created_at, updated_at, launched_at
- Index: (belief_id), (brief_id), (status)

### flow_step
- flow_step_id (PK, UUID)
- flow_id (FK → flow)
- step_number (int)
- asset_id (FK → asset)
- created_at
- Index: (flow_id, step_number)

### asset
- asset_id (PK, UUID)
- partner_id, offer_id, icp_id, brief_id, belief_id (all FK)
- asset_type (email_flow, email, web_page, seo_page, social_post, social_traffic_page, reply_handler, other)
- channel (email, website, seo, social)
- platform (nullable)
- objective (native, traffic, convert, inform)
- primary_cta_type
- status (draft, published, retired)
- content_body (text) OR content_ref (pointer)
- hook_text, title_text, url (nullable)
- subject_line, variant_id (email-specific, nullable)
- page_category, keyword_primary, keyword_long_tail (page-specific, nullable)
- created_by, created_at, updated_at
- Index: (belief_id), (brief_id), (asset_type), (channel), (status)

### signal_event
- signal_event_id (PK, UUID)
- timestamp
- partner_id, offer_id, icp_id, brief_id, belief_id (required)
- asset_id, flow_id, flow_step_id, person_id (optional)
- channel (email, website, seo, social, sales)
- event_type (delivered, open, click, reply, unsubscribe, complaint, bounce, page_view, dwell_time, scroll_depth, cta_click, form_submit, booking_initiated, booking_completed, show, opportunity_created, revenue)
- event_value_num (nullable)
- event_value_text (nullable)
- metadata_json
- Index: (belief_id, timestamp), (asset_id, timestamp), (event_type, timestamp), (partner_id, offer_id, timestamp)

### config_table
- config_id (PK)
- minimum_send_threshold
- minimum_reply_threshold
- minimum_booked_call_threshold
- durability_days
- statistical_confidence_threshold
- allocation_step_size
- minimum_exploration_percentage
- confidence_weight_w1, w2, w3, w4
- version
- created_at, updated_at

---

## Phase 2 Tables

### belief_gate_snapshot
- gate_snapshot_id (PK, UUID)
- belief_id (FK), timestamp
- promotion_state_at_time
- sends_count, clicks_count, booked_calls_count, qualified_booked_calls_count
- qualified_booked_call_rate, positive_reply_rate, show_rate
- complaint_rate, unsubscribe_rate, bounce_rate
- window_complete (bool), regression_flag (bool)
- confidence_score
- gate_status (pass, watch, fail), gate_reason
- Index: (belief_id, timestamp), (gate_status)

### belief_promotion_log
- promotion_log_id (PK, UUID)
- belief_id, from_state, to_state
- triggered_by (system/user), reason, timestamp
- Index: (belief_id, timestamp)

---

## Phase 3 Tables

### meeting
- meeting_id (PK, UUID)
- partner_id, offer_id, icp_id, brief_id, belief_id, asset_id, person_id
- scheduled_at, meeting_type, qualified_flag, show_flag, notes
- Index: (belief_id, scheduled_at), (qualified_flag)

### opportunity
- opportunity_id (PK, UUID)
- partner_id, offer_id, icp_id, brief_id, belief_id
- created_at, stage, amount, close_date, won_flag
- Index: (belief_id), (won_flag)

### revenue_event
- revenue_event_id (PK, UUID)
- partner_id, offer_id, icp_id, brief_id, belief_id, opportunity_id
- amount, timestamp, attribution_model
- Index: (belief_id, timestamp)

---

## Phase 4 Tables

### sending_identity
- sending_identity_id (PK, UUID)
- partner_id, identity_type (domain, mailbox, ip_pool)
- identifier, status (warming, active, paused, burned)
- created_at, updated_at
- Index: (partner_id, status)

---

## Phase 5 Tables

### belief_daily_rollup
- belief_id + date (composite PK)
- sends, opens, clicks, replies, positive_replies
- booked_calls, qualified_booked_calls, revenue
- complaint_rate, unsubscribe_rate, bounce_rate
- computed_at

---

## RLS Policy

Every table scoped by `partner_id`. Supabase RLS policies:
- Partners can only read/write their own rows
- Superadmin can read/write all
- Global KB readable by all partners (via separate policy)
- `config_table` readable by all, writable by superadmin only
