# 🗺️ IMPLEMENTATION ROADMAP — WHAT TO BUILD & WHEN
## Phased Development Plan

---

## 📊 CURRENT STATUS

### ✅ COMPLETED (Foundation)

| Component | Status | Notes |
|-----------|--------|-------|
| Supabase Database Setup | ✅ Done | PostgreSQL + pgvector |
| Authentication System | ✅ Done | Superadmin JWT + User Supabase Auth |
| AI Provider Management | ✅ Done | Multi-provider, key rotation |
| Brain Template System | ✅ Done | Config-driven brains per org |
| Vector Store | ✅ Done | pgvector embeddings |
| Embedding Generation | ✅ Done | OpenAI + Cohere support |
| BullMQ Worker System | ✅ Done | Background job processing |
| Superadmin UI | ✅ Done | Dashboard, orgs, users, AI management |
| Theme System | ✅ Done | Premium design system |

---

## 🚀 PHASE 1: KB & CONSTITUTION (Week 1-2)

**Goal:** The brain has something to think with.

### Deliverables:

```
┌─────────────────────────────────────────────────────────────┐
│                      PHASE 1 DELIVERABLES                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1.1 KB Database Tables                                    │
│   ├── kb_brands                                             │
│   ├── kb_icps                                               │
│   ├── kb_offers                                             │
│   ├── kb_angles                                             │
│   ├── kb_ctas                                               │
│   ├── kb_email_flow_blueprints                              │
│   ├── kb_reply_playbooks                                    │
│   ├── kb_reply_strategies                                   │
│   ├── kb_subject_firstline_variants                         │
│   └── kb_routing_rules                                      │
│                                                             │
│   1.2 Constitution System                                   │
│   ├── constitution_rules table                              │
│   ├── ConstitutionValidator service                         │
│   └── Integration with generation pipeline                  │
│                                                             │
│   1.3 KB Management UI                                      │
│   ├── Brand editor                                          │
│   ├── ICP manager                                           │
│   ├── Offer editor                                          │
│   ├── Angle library                                         │
│   └── Import/export functionality                           │
│                                                             │
│   1.4 KB Embedding Pipeline                                 │
│   ├── Auto-embed KB entries on save                         │
│   ├── Chunk KB appropriately                                │
│   └── Store in vector table                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Success Criteria:
- [ ] All KB schemas implemented in database
- [ ] Constitution rules loadable and checkable
- [ ] UI for managing KB
- [ ] KB content embedded and searchable

---

## 🚀 PHASE 2: WRITER ENGINE (Week 3-4)

**Goal:** Generate content from KB.

### Deliverables:

```
┌─────────────────────────────────────────────────────────────┐
│                      PHASE 2 DELIVERABLES                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   2.1 Workflow Engine Core                                  │
│   ├── Node execution framework                              │
│   ├── Pipeline orchestration                                │
│   ├── Error handling & retry logic                          │
│   └── Progress tracking                                     │
│                                                             │
│   2.2 Generation Nodes                                      │
│   ├── AnalyzeNode (intent classification)                   │
│   ├── RetrieveNode (RAG from KB)                            │
│   ├── GenerateNode (LLM content generation)                 │
│   ├── ValidateNode (constitution check)                     │
│   └── OutputNode (format and store)                         │
│                                                             │
│   2.3 Email Flow Generation                                 │
│   ├── Blueprint resolution                                  │
│   ├── Sequence generation                                   │
│   ├── Subject/first-line variant creation                   │
│   └── CTA selection based on routing                        │
│                                                             │
│   2.4 Reply Generation                                      │
│   ├── Scenario detection                                    │
│   ├── Strategy selection                                    │
│   ├── Cognitive sequence enforcement                        │
│   └── Link qualification logic                              │
│                                                             │
│   2.5 Landing Page Generation                               │
│   ├── Page blueprint resolution                             │
│   ├── Section content generation                            │
│   ├── CTA placement                                         │
│   └── HTML/Tailwind output                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Success Criteria:
- [ ] Can generate email sequences from KB
- [ ] Can generate replies following cognitive sequence
- [ ] All outputs pass constitution validation
- [ ] Outputs stored and retrievable

---

## 🚀 PHASE 3: IMT INTEGRATION (Week 5-6)

**Goal:** Connect to their infrastructure.

### Deliverables:

```
┌─────────────────────────────────────────────────────────────┐
│                      PHASE 3 DELIVERABLES                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   3.1 Public API                                            │
│   ├── POST /api/brain/input (job submission)                │
│   ├── GET /api/brain/status/:id (polling)                   │
│   ├── GET /api/brain/output/:id (retrieval)                 │
│   └── POST /api/brain/webhooks/stats (analytics ingest)     │
│                                                             │
│   3.2 Webhook Processing                                    │
│   ├── Mailwiz stats ingestion                               │
│   ├── Event normalization                                   │
│   ├── Storage in analytics tables                           │
│   └── Error handling & replay capability                    │
│                                                             │
│   3.3 Job Queue Integration                                 │
│   ├── BullMQ job creation from API                          │
│   ├── Worker assignment                                     │
│   ├── Status updates                                        │
│   └── Output storage                                        │
│                                                             │
│   3.4 Documentation for IMT                                 │
│   ├── API documentation                                     │
│   ├── Authentication guide                                  │
│   ├── Webhook format specification                          │
│   └── Integration examples                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Success Criteria:
- [ ] n8n can call Axiom API successfully
- [ ] Stats from Mailwiz flow into Axiom
- [ ] End-to-end reply generation working
- [ ] API documented for Nino's team

---

## 🚀 PHASE 4: LEARNING LOOP (Week 7-8)

**Goal:** The system gets smarter every day.

### Deliverables:

```
┌─────────────────────────────────────────────────────────────┐
│                      PHASE 4 DELIVERABLES                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   4.1 Analytics Pipeline                                    │
│   ├── Daily aggregation job (06:00 AM ET)                   │
│   ├── Grouping by ICP, offer, angle, variant                │
│   ├── Metric calculation (booked_call_rate, etc.)           │
│   └── Stats storage                                         │
│                                                             │
│   4.2 Learning Rules Engine                                 │
│   ├── Rule definition framework                             │
│   ├── Promotion rules (TOP_N, THRESHOLD)                    │
│   ├── Demotion rules (BOTTOM_N, THRESHOLD)                  │
│   └── Safety rules (guardrail breach → pause)               │
│                                                             │
│   4.3 KB Preference System                                  │
│   ├── Preference creation from rules                        │
│   ├── Preference application in generation                  │
│   ├── Preference expiry handling                            │
│   └── Preference history audit                              │
│                                                             │
│   4.4 Learning Dashboard                                    │
│   ├── Daily learning summary                                │
│   ├── Promotion/demotion log                                │
│   ├── Paused patterns view                                  │
│   └── Performance trends                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Success Criteria:
- [ ] Learning loop runs daily at 06:00 AM ET
- [ ] Preferences created based on performance
- [ ] Tomorrow's generation uses today's learnings
- [ ] Dashboard shows what the system learned

---

## 🚀 PHASE 5: TESTING & OPTIMIZATION (Week 9-10)

**Goal:** A/B testing and variant optimization.

### Deliverables:

```
┌─────────────────────────────────────────────────────────────┐
│                      PHASE 5 DELIVERABLES                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   5.1 A/B Testing Framework                                 │
│   ├── Variant assignment logic                              │
│   ├── Traffic splitting                                     │
│   ├── Statistical significance calculation                  │
│   └── Winner declaration                                    │
│                                                             │
│   5.2 Guardrail Automation                                  │
│   ├── Automatic pause on threshold breach                   │
│   ├── Cooldown period enforcement                           │
│   ├── Manual resume capability                              │
│   └── Alert system for breaches                             │
│                                                             │
│   5.3 Throttling System                                     │
│   ├── Max new variants per day                              │
│   ├── Max promotions/demotions per context                  │
│   ├── Max pauses per day                                    │
│   └── Override capability for admins                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📅 TIMELINE SUMMARY

```
Week 1-2:    KB & CONSTITUTION
             └── The brain has knowledge and rules

Week 3-4:    WRITER ENGINE  
             └── The brain can generate content

Week 5-6:    IMT INTEGRATION
             └── The brain connects to IMT

Week 7-8:    LEARNING LOOP
             └── The brain gets smarter daily

Week 9-10:   TESTING & OPTIMIZATION
             └── The brain optimizes continuously
```

---

## ⚠️ DEPENDENCIES

| Phase | Depends On |
|-------|------------|
| Phase 1 | None (independent) |
| Phase 2 | Phase 1 (needs KB to generate from) |
| Phase 3 | Phase 2 (needs generation to expose via API) |
| Phase 4 | Phase 3 (needs stats from IMT) |
| Phase 5 | Phase 4 (needs learning loop data) |

---

## 🎯 PRIORITIES (In Order)

1. **KB Schema** - Without this, nothing happens
2. **Reply Generation** - Their immediate ask
3. **IMT API** - So Nino can integrate
4. **Learning Loop** - What makes it self-healing
5. **Everything else** - Enhancements

---

*Document: Implementation Roadmap | January 23rd, 2026*
