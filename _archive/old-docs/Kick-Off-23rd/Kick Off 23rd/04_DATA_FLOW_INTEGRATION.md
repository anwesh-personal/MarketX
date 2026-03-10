# 📊 DATA FLOW & INTEGRATION — HOW EVERYTHING CONNECTS
## System Integration Document

---

## 🔄 THE COMPLETE DATA FLOW

```
╔═════════════════════════════════════════════════════════════════════════╗
║                        COMPLETE SYSTEM FLOW                             ║
╠═════════════════════════════════════════════════════════════════════════╣
║                                                                         ║
║   ┌──────────────────────────────────────────────────────────────────┐  ║
║   │                     1. CONTENT GENERATION                        │  ║
║   ├──────────────────────────────────────────────────────────────────┤  ║
║   │                                                                  │  ║
║   │   SUPERADMIN                                                     │  ║
║   │   uploads KB + Rules                                             │  ║
║   │         │                                                        │  ║
║   │         ↓                                                        │  ║
║   │   ┌──────────┐                                                   │  ║
║   │   │  AXIOM   │  Generates:                                       │  ║
║   │   │  BRAIN   │  • Email sequences                                │  ║
║   │   │          │  • Email replies                                  │  ║
║   │   │          │  • Landing pages                                  │  ║
║   │   │          │  • Social posts                                   │  ║
║   │   └────┬─────┘                                                   │  ║
║   │        │                                                         │  ║
║   │        ↓                                                         │  ║
║   │   ┌──────────┐                                                   │  ║
║   │   │ CAMPAIGN │  Sequences activated                              │  ║
║   │   │ MANAGER  │  in n8n/Mailwiz                                   │  ║
║   │   └────┬─────┘                                                   │  ║
║   │        │                                                         │  ║
║   └────────┼─────────────────────────────────────────────────────────┘  ║
║            │                                                            ║
║            ↓                                                            ║
║   ┌──────────────────────────────────────────────────────────────────┐  ║
║   │                     2. EMAIL DELIVERY                            │  ║
║   ├──────────────────────────────────────────────────────────────────┤  ║
║   │                                                                  │  ║
║   │   ┌──────────┐                                                   │  ║
║   │   │ MAILWIZ  │  Sends emails to ICP list                         │  ║
║   │   │          │  (Millions per month)                             │  ║
║   │   └────┬─────┘                                                   │  ║
║   │        │                                                         │  ║
║   │        ↓                                                         │  ║
║   │   ┌──────────┐                                                   │  ║
║   │   │   ICP    │  Recipients receive emails                        │  ║
║   │   │  LIST    │  from Identity Graph                              │  ║
║   │   └────┬─────┘                                                   │  ║
║   │        │                                                         │  ║
║   └────────┼─────────────────────────────────────────────────────────┘  ║
║            │                                                            ║
║            ↓                                                            ║
║   ┌──────────────────────────────────────────────────────────────────┐  ║
║   │                     3. ENGAGEMENT                                │  ║
║   ├──────────────────────────────────────────────────────────────────┤  ║
║   │                                                                  │  ║
║   │   Recipients may:                                                │  ║
║   │   ├── CLICK → Verified, identity-linked                         │  ║
║   │   ├── REPLY → Triggers reply workflow                            │  ║
║   │   ├── BOUNCE → Deliverability issue                              │  ║
║   │   ├── UNSUBSCRIBE → List health signal                           │  ║
║   │   └── BOOK CALL → Primary success metric!                        │  ║
║   │                                                                  │  ║
║   └────────┬─────────────────────────────────────────────────────────┘  ║
║            │                                                            ║
║            ↓                                                            ║
║   ┌──────────────────────────────────────────────────────────────────┐  ║
║   │                     4. REPLY HANDLING                            │  ║
║   ├──────────────────────────────────────────────────────────────────┤  ║
║   │                                                                  │  ║
║   │   ┌──────────┐      ┌──────────┐      ┌──────────┐               │  ║
║   │   │ MAILWIZ  │ ───► │   n8n    │ ───► │  AXIOM   │               │  ║
║   │   │ receives │      │ triggers │      │ generates│               │  ║
║   │   │  reply   │      │ workflow │      │  reply   │               │  ║
║   │   └──────────┘      └──────────┘      └────┬─────┘               │  ║
║   │                                            │                     │  ║
║   │                                            ↓                     │  ║
║   │                                      ┌──────────┐                │  ║
║   │                                      │ MAILWIZ  │                │  ║
║   │                                      │  sends   │                │  ║
║   │                                      │  reply   │                │  ║
║   │                                      └──────────┘                │  ║
║   │                                                                  │  ║
║   └────────┬─────────────────────────────────────────────────────────┘  ║
║            │                                                            ║
║            ↓                                                            ║
║   ┌──────────────────────────────────────────────────────────────────┐  ║
║   │                     5. ANALYTICS COLLECTION                      │  ║
║   ├──────────────────────────────────────────────────────────────────┤  ║
║   │                                                                  │  ║
║   │   Events collected:                                              │  ║
║   │   ├── Clicks (with identity)                                     │  ║
║   │   ├── Replies (with sentiment)                                   │  ║
║   │   ├── Booked Calls (conversions)                                 │  ║
║   │   ├── Bounces                                                    │  ║
║   │   ├── Unsubscribes                                               │  ║
║   │   └── Complaints                                                 │  ║
║   │                                                                  │  ║
║   │   Grouped by:                                                    │  ║
║   │   ├── ICP segment                                                │  ║
║   │   ├── Offer                                                      │  ║
║   │   ├── Angle used                                                 │  ║
║   │   ├── Content variant                                            │  ║
║   │   └── Buyer stage                                                │  ║
║   │                                                                  │  ║
║   └────────┬─────────────────────────────────────────────────────────┘  ║
║            │                                                            ║
║            ↓                                                            ║
║   ┌──────────────────────────────────────────────────────────────────┐  ║
║   │                     6. LEARNING LOOP                             │  ║
║   ├──────────────────────────────────────────────────────────────────┤  ║
║   │                                                                  │  ║
║   │   DAILY @ 06:00 AM Eastern                                       │  ║
║   │                                                                  │  ║
║   │   ┌──────────┐      ┌──────────┐      ┌──────────┐               │  ║
║   │   │  INGEST  │ ───► │ EVALUATE │ ───► │  UPDATE  │               │  ║
║   │   │yesterday's│     │performance│     │    KB    │               │  ║
║   │   │  stats   │      │ vs rules │      │preferences│              │  ║
║   │   └──────────┘      └──────────┘      └────┬─────┘               │  ║
║   │                                            │                     │  ║
║   │                                            ↓                     │  ║
║   │                                     Tomorrow's content           │  ║
║   │                                     is smarter                   │  ║
║   │                                                                  │  ║
║   └──────────────────────────────────────────────────────────────────┘  ║
║                                                                         ║
╚═════════════════════════════════════════════════════════════════════════╝
```

---

## 🔗 API ENDPOINTS (Axiom ↔ IMT)

### Endpoints Axiom Must Expose:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/brain/input` | POST | Receive content generation request |
| `/api/brain/status/{job_id}` | GET | Check job status |
| `/api/brain/output/{job_id}` | GET | Fetch completed output |
| `/api/brain/webhooks/stats` | POST | Receive analytics from Mailwiz |

### Detailed API Specs:

#### POST /api/brain/input
```json
{
  "type": "email_reply | email_flow | landing_page | social",
  
  // For email_reply:
  "incoming_email": {
    "from": "john@company.com",
    "subject": "Re: Your message",
    "body": "...",
    "thread_id": "..."
  },
  "sender_context": {
    "icp_id": "...",
    "buyer_stage": "CONSIDERATION",
    "previous_interactions": [...]
  },
  
  // For content generation:
  "generation_request": {
    "icp_id": "...",
    "offer_id": "...",
    "buyer_stage": "...",
    "count": 5
  }
}

// Response:
{
  "job_id": "uuid",
  "status": "queued",
  "estimated_completion": "2026-01-23T22:00:00Z"
}
```

#### GET /api/brain/status/{job_id}
```json
// Response:
{
  "job_id": "uuid",
  "status": "pending | processing | done | failed",
  "progress": 75,
  "created_at": "...",
  "updated_at": "..."
}
```

#### GET /api/brain/output/{job_id}
```json
// Response for email_reply:
{
  "job_id": "uuid",
  "type": "email_reply",
  "output": {
    "reply_markdown": "...",
    "reply_html": "...",
    "cta_included": true,
    "cta_type": "BOOK_CALL",
    "validation_passed": true,
    "scenario_detected": "pricing_question",
    "strategy_used": "CLARIFYING_QUESTION_FIRST"
  },
  "metadata": {
    "processing_time_ms": 2340,
    "model_used": "gemini-1.5-pro",
    "kb_version": "1.0.0",
    "constitution_checks_passed": 12
  }
}
```

#### POST /api/brain/webhooks/stats
```json
// Payload from Mailwiz/IMT:
{
  "date": "2026-01-22",
  "events": [
    {
      "event_type": "CLICK",
      "email_id": "...",
      "variant_id": "...",
      "recipient_id": "...",
      "timestamp": "...",
      "metadata": {...}
    },
    {
      "event_type": "BOOKED_CALL",
      "email_id": "...",
      "recipient_id": "...",
      "calendar_link": "...",
      "timestamp": "..."
    }
  ]
}

// Response:
{
  "received": 42,
  "processed": 42,
  "errors": []
}
```

---

## 📅 DAILY SCHEDULE

```
┌─────────────────────────────────────────────────────────────┐
│                 DAILY OPERATIONS TIMELINE                   │
│                   (America/New_York)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   00:00 - 05:59  │  Emails sending, events collecting       │
│                  │                                          │
│   ─────────────────────────────────────────────────────────│
│                                                             │
│   06:00          │  ★ LEARNING LOOP RUNS ★                  │
│                  │  - Ingest yesterday's stats              │
│                  │  - Evaluate performance                  │
│                  │  - Update KB preferences                 │
│                  │  - Pause underperformers                 │
│                  │                                          │
│   ─────────────────────────────────────────────────────────│
│                                                             │
│   06:15 - 08:00  │  New content generated with learnings    │
│                  │                                          │
│   ─────────────────────────────────────────────────────────│
│                                                             │
│   08:00 - 18:00  │  Peak sending hours                      │
│                  │  Replies handled in real-time            │
│                  │                                          │
│   ─────────────────────────────────────────────────────────│
│                                                             │
│   18:00 - 23:59  │  Evening sends, events accumulating      │
│                  │                                          │
│   ─────────────────────────────────────────────────────────│
│                                                             │
│   REPEAT                                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 SECURITY CONSIDERATIONS

| Concern | Solution |
|---------|----------|
| API Authentication | JWT tokens with expiry |
| Webhook Validation | HMAC signatures |
| Data Isolation | Org-based row-level security |
| PII Handling | Encrypt at rest, minimize storage |
| Rate Limiting | Per-org, per-endpoint limits |

---

*Document: Integration & Data Flow | January 23rd, 2026*
