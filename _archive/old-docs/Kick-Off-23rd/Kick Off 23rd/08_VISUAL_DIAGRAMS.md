# 🎨 VISUAL DIAGRAMS — For Presentations
## ASCII Diagrams for Documentation

---

## 1. THE BIG PICTURE

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║                              INMARKET TRAFFIC ECOSYSTEM                               ║
║                                                                                       ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                       ║
║    ┌─────────────────────────────────────────────────────────────────────────────┐    ║
║    │                           CLIENT (B2B COMPANY)                              │    ║
║    │                                                                             │    ║
║    │   "I want to reach my entire ICP and start real conversations"              │    ║
║    │                                                                             │    ║
║    └──────────────────────────────────┬──────────────────────────────────────────┘    ║
║                                       │                                               ║
║                                       │ Pays CPC                                      ║
║                                       ▼                                               ║
║    ╔═════════════════════════════════════════════════════════════════════════════╗    ║
║    ║                                                                             ║    ║
║    ║                           INMARKET TRAFFIC                                  ║    ║
║    ║                                                                             ║    ║
║    ║    ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐     ║    ║
║    ║    │  IDENTITY  │    │  BEHAVIOR  │    │   EMAIL    │    │   **A X    ║     ║    ║
║    ║    │   GRAPH    │    │   INTEL    │    │   INFRA    │    │   I O M**  ║     ║    ║
║    ║    │            │    │            │    │ (Mailwiz)  │    │            ║     ║    ║
║    ║    │  WHO they  │    │  WHEN to   │    │   HOW to   │    │  WHAT to   ║     ║    ║
║    ║    │    are     │    │   reach    │    │   send     │    │    say     ║     ║    ║
║    ║    └────────────┘    └────────────┘    └────────────┘    └────────────┘     ║    ║
║    ║                                                                             ║    ║
║    ╚═════════════════════════════════════════════════════════════════════════════╝    ║
║                                       │                                               ║
║                                       │ Sends Emails                                  ║
║                                       ▼                                               ║
║    ┌─────────────────────────────────────────────────────────────────────────────┐    ║
║    │                              ICP RECIPIENTS                                 │    ║
║    │                                                                             │    ║
║    │   ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐          │    ║
║    │   │   READ    │    │  CLICK    │    │  REPLY    │    │   BOOK    │          │    ║
║    │   │           │───►│ (verified)│───►│           │───►│   CALL    │          │    ║
║    │   │           │    │           │    │           │    │    ★★★    │          │    ║
║    │   └───────────┘    └───────────┘    └───────────┘    └───────────┘          │    ║
║    │                                                                             │    ║
║    └─────────────────────────────────────────────────────────────────────────────┘    ║
║                                       │                                               ║
║                                       │ Stats feedback                                ║
║                                       ▼                                               ║
║    ┌─────────────────────────────────────────────────────────────────────────────┐    ║
║    │                              LEARNING LOOP                                  │    ║
║    │                                                                             │    ║
║    │   Stats ──► Evaluate ──► Update KB ──► Better content tomorrow              │    ║
║    │                                                                             │    ║
║    └─────────────────────────────────────────────────────────────────────────────┘    ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. AXIOM BRAIN ARCHITECTURE

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║                                   AXIOM BRAIN                                         ║
║                        "Self-Healing Constitutional AI Engine"                        ║
║                                                                                       ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                       ║
║                              ┌─────────────────────┐                                  ║
║                              │       INPUTS        │                                  ║
║                              │  • Email to reply   │                                  ║
║                              │  • Content request  │                                  ║
║                              │  • Stats data       │                                  ║
║                              └──────────┬──────────┘                                  ║
║                                         │                                             ║
║                                         ▼                                             ║
║    ┌───────────────────────────────────────────────────────────────────────────────┐  ║
║    │                              KNOWLEDGE LAYER                                  │  ║
║    │                                                                               │  ║
║    │    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │  ║
║    │    │   KB    │  │ CONSTI- │  │  ICP    │  │ ANGLES  │  │ STRATE- │            │  ║
║    │    │ (Brand, │  │ TUTION  │  │ Library │  │ Library │  │  GIES   │            │  ║
║    │    │ Offers) │  │ (Rules) │  │         │  │         │  │         │            │  ║
║    │    └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │  ║
║    │         │            │            │            │            │                 │  ║
║    │         └────────────┴────────────┴────────────┴────────────┘                 │  ║
║    │                                   │                                           │  ║
║    │                                   ▼                                           │  ║
║    │                          ┌─────────────────┐                                  │  ║
║    │                          │  VECTOR STORE   │                                  │  ║
║    │                          │  (Embeddings)   │                                  │  ║
║    │                          └────────┬────────┘                                  │  ║
║    │                                   │                                           │  ║
║    └───────────────────────────────────┼───────────────────────────────────────────┘  ║
║                                        │                                              ║
║                                        ▼                                              ║
║    ┌───────────────────────────────────────────────────────────────────────────────┐  ║
║    │                             INTELLIGENCE LAYER                                │  ║
║    │                                                                               │  ║
║    │                                                                               │  ║
║    │    ┌──────────────────────────────────────────────────────────────────────┐   │  ║
║    │    │                       WORKFLOW ENGINE                                │   │  ║
║    │    │                                                                      │   │  ║
║    │    │   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐             │   │  ║
║    │    │   │ ANALYZE │──►│RETRIEVE │──►│GENERATE │──►│VALIDATE │             │   │  ║
║    │    │   │ (Claude)│   │  (RAG)  │   │(Gemini) │   │ (Const.)│             │   │  ║
║    │    │   └─────────┘   └─────────┘   └─────────┘   └────┬────┘             │   │  ║
║    │    │                                                  │                   │   │  ║
║    │    │                                          ┌───────┴───────┐           │   │  ║
║    │    │                                          │               │           │   │  ║
║    │    │                                     [PASS]          [FAIL]           │   │  ║
║    │    │                                          │               │           │   │  ║
║    │    │                                          ▼               ▼           │   │  ║
║    │    │                                     ┌────────┐     ┌────────┐        │   │  ║
║    │    │                                     │ OUTPUT │     │ REJECT │        │   │  ║
║    │    │                                     └────────┘     └────────┘        │   │  ║
║    │    │                                                                      │   │  ║
║    │    └──────────────────────────────────────────────────────────────────────┘   │  ║
║    │                                                                               │  ║
║    └───────────────────────────────────────────────────────────────────────────────┘  ║
║                                        │                                              ║
║                                        ▼                                              ║
║    ┌───────────────────────────────────────────────────────────────────────────────┐  ║
║    │                              LEARNING LAYER                                   │  ║
║    │                                                                               │  ║
║    │    ┌────────────┐        ┌────────────┐        ┌────────────┐                 │  ║
║    │    │   INGEST   │───────►│  EVALUATE  │───────►│   UPDATE   │                 │  ║
║    │    │   STATS    │        │ PERFORMANCE│        │     KB     │                 │  ║
║    │    └────────────┘        └────────────┘        └────────────┘                 │  ║
║    │                                                                               │  ║
║    │    Daily @ 06:00 AM ET    Apply rules           Create preferences            │  ║
║    │                                                                               │  ║
║    └───────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 3. REPLY GENERATION FLOW

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│                              EMAIL REPLY GENERATION                                 │
│                          "Cognitive Sequence Enforced"                              │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│    INCOMING EMAIL                                                                   │
│    ┌──────────────────────────────────────────────────────────────────────────┐    │
│    │ From: prospect@company.com                                               │    │
│    │ Subject: Re: Quick question about your service                           │    │
│    │                                                                          │    │
│    │ "What does this actually cost? We've been burned by hidden fees before." │    │
│    └──────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                           │
│                                        ▼                                           │
│    ┌──────────────────────────────────────────────────────────────────────────┐    │
│    │                         STEP 1: ANALYZE                                  │    │
│    │                                                                          │    │
│    │    Scenario detected: pricing_question                                   │    │
│    │    Subtext detected: trust_concern (burned before)                       │    │
│    │    Buyer stage: CONSIDERATION                                            │    │
│    │    Strategy selected: CLARIFYING_QUESTION_FIRST                          │    │
│    └──────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                           │
│                                        ▼                                           │
│    ┌──────────────────────────────────────────────────────────────────────────┐    │
│    │                         STEP 2: RETRIEVE                                 │    │
│    │                                                                          │    │
│    │    From KB:                                                              │    │
│    │    • Offer: CPC model (pay only for verified clicks)                     │    │
│    │    • Angle: risk_001 (risk of hidden costs elsewhere)                    │    │
│    │    • Constitution: No specific pricing claims                            │    │
│    │    • Strategy rules: Ask clarifying question first                       │    │
│    └──────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                           │
│                                        ▼                                           │
│    ┌──────────────────────────────────────────────────────────────────────────┐    │
│    │                         STEP 3: GENERATE                                 │    │
│    │                                                                          │    │
│    │    Following COGNITIVE SEQUENCE:                                         │    │
│    │                                                                          │    │
│    │    1. REFLECTION:                                                        │    │
│    │       "I can hear the frustration about hidden fees..."                  │    │
│    │                                                                          │    │
│    │    2. CLARIFICATION:                                                     │    │
│    │       "The decision you're really making is whether to pay for..."       │    │
│    │                                                                          │    │
│    │    3. REFRAME:                                                           │    │
│    │       "A clearer way to think about this: we only charge when..."        │    │
│    │                                                                          │    │
│    │    4. CHOICE:                                                            │    │
│    │       "If you'd like, we could walk through how pricing works..."        │    │
│    │                                                                          │    │
│    └──────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                           │
│                                        ▼                                           │
│    ┌──────────────────────────────────────────────────────────────────────────┐    │
│    │                         STEP 4: VALIDATE                                 │    │
│    │                                                                          │    │
│    │    Constitution checks:                                                  │    │
│    │    ☑ Has all 4 cognitive steps                                           │    │
│    │    ☑ No guaranteed outcomes                                              │    │
│    │    ☑ No urgency/scarcity tactics                                         │    │
│    │    ☑ No specific pricing promises                                        │    │
│    │    ☑ Choice is optional and self-directed                                │    │
│    │                                                                          │    │
│    │    RESULT: ✅ APPROVED                                                   │    │
│    └──────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                           │
│                                        ▼                                           │
│    GENERATED REPLY                                                                 │
│    ┌──────────────────────────────────────────────────────────────────────────┐    │
│    │                                                                          │    │
│    │ I hear you — getting burned by hidden fees is frustrating, and it        │    │
│    │ makes complete sense that you'd want clarity upfront.                    │    │
│    │                                                                          │    │
│    │ The core decision here is actually about what you're paying for.         │    │
│    │ Most services charge for impressions or "leads" that may or may not      │    │
│    │ turn into anything real.                                                 │    │
│    │                                                                          │    │
│    │ Our model is different: you only pay when someone actually clicks,       │    │
│    │ and that click produces a full buyer record with their identity.         │    │
│    │ No clicks, no charge. No hidden fees, no minimums.                       │    │
│    │                                                                          │    │
│    │ If it would be helpful, I could walk you through exactly how pricing     │    │
│    │ works for your specific situation — just let me know.                    │    │
│    │                                                                          │    │
│    └──────────────────────────────────────────────────────────────────────────┘    │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. LEARNING LOOP CYCLE

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    │    DAILY LEARNING LOOP @ 06:00 AM ET    │
                    │                                         │
                    └─────────────────────────────────────────┘
                                        │
                                        ▼
     ┌──────────────────────────────────────────────────────────────────────────┐
     │                                                                          │
     │    ╔════════════════════════════════════════════════════════════════╗    │
     │    ║                    1. INGEST YESTERDAY'S DATA                  ║    │
     │    ╚════════════════════════════════════════════════════════════════╝    │
     │                                                                          │
     │    From Mailwiz:                                                         │
     │    • 10,000 emails sent                                                  │
     │    • 342 clicks                                                          │
     │    • 89 replies                                                          │
     │    • 12 booked calls                                                     │
     │    • 15 bounces                                                          │
     │    • 3 unsubscribes                                                      │
     │                                                                          │
     └──────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
     ┌──────────────────────────────────────────────────────────────────────────┐
     │                                                                          │
     │    ╔════════════════════════════════════════════════════════════════╗    │
     │    ║                    2. GROUP & CALCULATE                        ║    │
     │    ╚════════════════════════════════════════════════════════════════╝    │
     │                                                                          │
     │    By ICP + Angle + Variant:                                             │
     │                                                                          │
     │    ┌─────────────────────────────────────────────────────────────────┐   │
     │    │ Enterprise + risk_001 + variant_A:                              │   │
     │    │   booked_call_rate = 3.2%  ✓ ABOVE THRESHOLD                    │   │
     │    │   bounce_rate = 0.8%       ✓ HEALTHY                            │   │
     │    ├─────────────────────────────────────────────────────────────────┤   │
     │    │ Enterprise + control_001 + variant_B:                           │   │
     │    │   booked_call_rate = 0.4%  ✗ BELOW THRESHOLD                    │   │
     │    │   bounce_rate = 1.2%       ✓ HEALTHY                            │   │
     │    ├─────────────────────────────────────────────────────────────────┤   │
     │    │ SMB + speed_001 + variant_C:                                    │   │
     │    │   booked_call_rate = 1.8%  ~ AVERAGE                            │   │
     │    │   bounce_rate = 18.5%      ✗ BREACH - PAUSE!                    │   │
     │    └─────────────────────────────────────────────────────────────────┘   │
     │                                                                          │
     └──────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
     ┌──────────────────────────────────────────────────────────────────────────┐
     │                                                                          │
     │    ╔════════════════════════════════════════════════════════════════╗    │
     │    ║                    3. APPLY RULES                              ║    │
     │    ╚════════════════════════════════════════════════════════════════╝    │
     │                                                                          │
     │    PROMOTION:                                                            │
     │    ┌────────────────────────────────────────────────────────────────┐    │
     │    │ ✅ PROMOTE risk_001 for Enterprise ICP                         │    │
     │    │    Reason: 3.2% booked_call_rate (8x higher than average)      │    │
     │    │    Action: CREATE preference PREFER_ANGLE                       │    │
     │    └────────────────────────────────────────────────────────────────┘    │
     │                                                                          │
     │    DEMOTION:                                                             │
     │    ┌────────────────────────────────────────────────────────────────┐    │
     │    │ ⬇️  DEMOTE control_001 for Enterprise ICP                       │    │
     │    │    Reason: 0.4% booked_call_rate (below threshold)              │    │
     │    │    Action: REDUCE weight in selection                           │    │
     │    └────────────────────────────────────────────────────────────────┘    │
     │                                                                          │
     │    SAFETY PAUSE:                                                         │
     │    ┌────────────────────────────────────────────────────────────────┐    │
     │    │ 🛑 PAUSE variant_C for SMB + speed_001                          │    │
     │    │    Reason: Bounce rate 18.5% exceeds 15% threshold              │    │
     │    │    Action: ADD to paused_patterns, 7 day cooldown               │    │
     │    └────────────────────────────────────────────────────────────────┘    │
     │                                                                          │
     └──────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
     ┌──────────────────────────────────────────────────────────────────────────┐
     │                                                                          │
     │    ╔════════════════════════════════════════════════════════════════╗    │
     │    ║                    4. UPDATE KB                                ║    │
     │    ╚════════════════════════════════════════════════════════════════╝    │
     │                                                                          │
     │    New preferences added:                                                │
     │    ┌────────────────────────────────────────────────────────────────┐    │
     │    │ {                                                              │    │
     │    │   "pref_id": "pref_2026-01-23_001",                            │    │
     │    │   "preference_type": "PREFER_ANGLE",                           │    │
     │    │   "preferred_ids": ["risk_001"],                               │    │
     │    │   "applies_to": { "icp_id": "ent_001" },                        │    │
     │    │   "reason": "3.2% booked_call_rate in 7-day window",           │    │
     │    │   "created_at": "2026-01-23T06:00:00Z"                          │    │
     │    │ }                                                              │    │
     │    └────────────────────────────────────────────────────────────────┘    │
     │                                                                          │
     │    Learning history logged:                                              │
     │    ┌────────────────────────────────────────────────────────────────┐    │
     │    │ • Promoted 1 angle for Enterprise                              │    │
     │    │ • Demoted 1 angle for Enterprise                               │    │
     │    │ • Paused 1 variant for SMB (safety breach)                     │    │
     │    │ • Net effect: +2.8% expected improvement                       │    │
     │    └────────────────────────────────────────────────────────────────┘    │
     │                                                                          │
     └──────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    │   TOMORROW'S CONTENT IS NOW SMARTER     │
                    │                                         │
                    │   • Enterprise emails will favor risk   │
                    │     angle over control angle            │
                    │                                         │
                    │   • SMB emails will skip the paused     │
                    │     variant entirely                    │
                    │                                         │
                    │   • System improves every single day    │
                    │                                         │
                    └─────────────────────────────────────────┘
```

---

*Document: Visual Diagrams | January 23rd, 2026*
