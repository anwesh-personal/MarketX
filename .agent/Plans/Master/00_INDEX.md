# MarketX Master Plan — Index

**Date:** 9 March 2026
**Author:** Zara (AI Architect) for Anwesh Rath
**Status:** Canonical — replaces all prior roadmaps

---

## Document Map

| # | File | Contents |
|---|------|----------|
| 00 | `00_INDEX.md` | This file — table of contents and reading order |
| 01 | `01_VISION_AND_ARCHITECTURE.md` | What MarketX is, the 3-engine model, multi-tenant structure, and how everything connects |
| 02 | `02_CURRENT_STATE_AUDIT.md` | Honest inventory of what exists in code, what is plan-only, and what is broken |
| 03 | `03_RS_OS_SCHEMA.md` | Complete RS:OS database schema — Brief, Belief, Flow, Asset, Signal, Promotion — mapped from Tommy's Tech Spec + Data Model |
| 04 | `04_MASTERY_AGENTS.md` | The 9-agent Mastery Agent stack, knowledge scoping (Local/Candidate/Global), governance, and where we improve on Tommy's design |
| 05 | `05_MARKET_WRITER_ENGINE.md` | Angle system, Brief generation, Flow generation, Extension rules, Belief competition |
| 06 | `06_MARKET_BUILDER_ENGINE.md` | Lead sourcing, ICP construction, identity hygiene, contact decision |
| 07 | `07_MARKET_SURFACE_ENGINE.md` | Email delivery, satellite infrastructure, send pacing, deliverability governance |
| 08 | `08_MEASUREMENT_AND_DASHBOARDS.md` | The 12-section measurement system, dashboard hierarchy, rollup strategy |
| 09 | `09_BRAIN_ARCHITECTURE.md` | Per-partner Brain deployment, prompt stack, tool registry, agentic loop, self-healing, knowledge gap detection |
| 10 | `10_BUILD_SEQUENCE.md` | Phase-by-phase build order with timelines, dependencies, and deliverables |
| 11 | `11_TOMMYS_INPUT_ASSESSMENT.md` | Honest assessment of every Tommy document — what is gold, what is noise, and where we do it better |
| 12 | `12_PRODUCTION_BLOWOUT_PLAN.md` | No-band-aid production blueprint: orchestration, guardrails, reliability SLOs, and go-live gates |
| 13 | `13_EXECUTION_BACKLOG.md` | Live execution tracker with status, owners, dependencies, and daily updates |

---

## Active / Handover Plans (Plans/Active/)

When joining or getting stuck, read the **active** plan first:

| File | Purpose |
|------|---------|
| **`AXIOM_ARCHITECTURE_MAIL_WRITER_MAILWIZ_PLAN.md`** | End-to-end architecture audit, Mail Writer fix list, MTA feedback loop (provider-agnostic), Phase 1 & 2 priorities. **Start here for current execution context.** |

---

## Reading Order

1. Start with `01_VISION_AND_ARCHITECTURE.md` for the big picture
2. Read `02_CURRENT_STATE_AUDIT.md` to understand where we actually are
3. Read `10_BUILD_SEQUENCE.md` for the phase-by-phase execution plan
4. Reference individual engine/system files (03–09) as needed during implementation
5. Read `11_TOMMYS_INPUT_ASSESSMENT.md` for architectural decision rationale
6. Execute from `12_PRODUCTION_BLOWOUT_PLAN.md` for production hardening and launch discipline
7. Operate day-to-day from `13_EXECUTION_BACKLOG.md` and update after every material change

---

## Source Documents (Tommy's Input)

All plans incorporate and cross-reference these Tommy documents from `Documentation/`:

**RS:OS Core (folder 1)**
- RS Operating Workflow
- RS Governance Manual
- RS OS Technical Implementation Spec

**MarketWriter System (folder 2)**
- MarketWriter Angle System
- MarketWriter Brief + Tracking System
- MarketWriter Brief Template
- Flow Extension Rules (Canonical)
- Angle Architecture & Governance
- MW Website Build Specs (Company, Email Destination, SEO, Social Media)

**Measurement & Dashboard (folder 3)**
- Measurement & Dashboard System (Canonical)
- Belief Tracking & Promotion Dashboard
- Dashboard Architecture

**Implementation Guides (folder 4)**
- Implementation Mapping Document
- Engineering Implementation Checklist
- Testing Charter (Rev Share Doctrine)
- MarketWriter Data Model

**Mastery Agents (folder 5)**
- IIInfrastructure Acquisition Learning System
- Mastery Agent Blueprint
- Mastery Agent Learning Architecture (Canonical)
- Canonical Acquisition Agent Stack Spec
- Local/Global Knowledge Base Schema (Canonical)
- Learning Governance and Promotion Policy (Canonical)
- Acquisition Control-Point Framework
- The 5 Control Points III Must Build First
- The 12 Highest-Leverage Acquisition Control Points
- The 3 Biggest Network-Effect Control Points
