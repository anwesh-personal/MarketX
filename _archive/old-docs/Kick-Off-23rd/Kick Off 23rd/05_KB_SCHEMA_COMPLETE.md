# 📋 KNOWLEDGE BASE SCHEMA — COMPLETE SPECIFICATION
## What Goes Into the KB (From Client Docs)

---

## 🎯 OVERVIEW

The KB is the **source of truth** for all content generation. It contains:

1. **Brand** - Voice, compliance, forbidden claims
2. **ICP Library** - Customer segments
3. **Offer Library** - Products/services
4. **Content Libraries** - Angles, CTAs, blueprints
5. **Routing Rules** - Navigation logic
6. **Testing Config** - A/B test settings
7. **Guardrails** - Safety rules
8. **Learning** - What the system has learned

---

## 1️⃣ BRAND SCHEMA

```json
{
  "brand": {
    "brand_name_exact": "InMarket",
    "brand_name_variations_allowed": [],
    "brand_name_forbidden": ["InMarketTraffic", "In Market"],
    
    "voice_rules": [
      {
        "rule_id": "voice_001",
        "description": "Never use hype language",
        "examples_forbidden": ["revolutionary", "game-changing", "best-in-class"],
        "examples_preferred": ["effective", "reliable", "clear"]
      },
      {
        "rule_id": "voice_002",
        "description": "Always clarify, never convince",
        "applies_to": ["email_replies", "landing_pages"]
      }
    ],
    
    "compliance": {
      "forbidden_claims": [
        "guaranteed results",
        "specific ROI numbers",
        "competitor comparisons"
      ],
      "required_disclosures": [],
      "regulatory_notes": []
    }
  }
}
```

---

## 2️⃣ ICP LIBRARY SCHEMA

```json
{
  "icp_library": {
    "segments": [
      {
        "icp_id": "ent_saas_001",
        "name": "Enterprise SaaS Companies",
        "industry_group_norm": "SOFTWARE",
        
        "firm_size": {
          "min_employees": 500,
          "max_employees": 10000
        },
        
        "revenue_band_norm": "ENT",
        "seniority_norm": "EXEC",
        
        "job_titles": [
          "VP Marketing",
          "CMO",
          "Head of Demand Gen"
        ],
        
        "pain_points": [
          "Unpredictable pipeline",
          "High CAC",
          "Weak intent signals"
        ],
        
        "buying_triggers": [
          "New funding round",
          "Leadership change in marketing",
          "Missed quarterly targets"
        ],
        
        "decision_criteria": [
          "Clear ROI visibility",
          "Integration with existing stack",
          "Speed to first results"
        ],
        
        "buyer_stages": ["AWARENESS", "CONSIDERATION", "EVALUATION", "RISK_RESOLUTION", "READY"],
        
        "is_active": true
      }
    ]
  }
}
```

---

## 3️⃣ OFFER LIBRARY SCHEMA

```json
{
  "offer_library": {
    "offers": [
      {
        "offer_id": "core_cpc_001",
        "offer_name": "Identity-Linked CPC",
        "category": "CORE_SERVICE",
        
        "value_proposition": "Pay only for verified clicks that produce buyer records",
        
        "differentiators": [
          "No wasted spend on anonymous traffic",
          "Full buyer identity with every click",
          "Owned data, not rented"
        ],
        
        "pricing_model": "CPC",
        "delivery_timeline": "Conversations within days",
        
        "proof_points": [
          {
            "type": "MECHANISM",
            "statement": "Every click triggers identity enrichment"
          },
          {
            "type": "OWNERSHIP",
            "statement": "We own our identity graph"
          }
        ],
        
        "applies_to": {
          "icp_ids": ["*"],
          "buyer_stages": ["CONSIDERATION", "EVALUATION"]
        },
        
        "is_active": true
      }
    ]
  }
}
```

---

## 4️⃣ CONTENT LIBRARIES

### 4.1 Angles Library

```json
{
  "angles_library": {
    "angles": [
      {
        "angle_id": "risk_001",
        "axis": "risk",
        "name": "Risk of Anonymous Traffic",
        "narrative": "You're paying for attention you can't trace back to real buyers",
        
        "applies_to": {
          "icp_ids": ["*"],
          "buyer_stages": ["AWARENESS", "CONSIDERATION"],
          "offer_ids": ["*"]
        },
        
        "is_active": true
      },
      {
        "angle_id": "control_001",
        "axis": "control",
        "name": "Market Access Control",
        "narrative": "Finally reach your entire market, not just whoever ads happen to find",
        
        "applies_to": {
          "icp_ids": ["ent_saas_001"],
          "buyer_stages": ["CONSIDERATION", "EVALUATION"]
        }
      }
    ]
  }
}
```

**Angle Axes:**
- `risk` - What they're risking by not acting
- `speed` - How fast they can see results
- `control` - Gaining control over outcomes
- `loss` - What they're losing today
- `upside` - What they could gain
- `identity` - Who they become

### 4.2 CTAs Library

```json
{
  "ctas_library": {
    "ctas": [
      {
        "cta_id": "cta_book_001",
        "cta_type": "BOOK_CALL",
        "label": "Book a conversation",
        "destination_type": "CALENDAR",
        "destination_slug": "/book",
        
        "applies_to": {
          "buyer_stages": ["EVALUATION", "READY"]
        }
      },
      {
        "cta_id": "cta_reply_001",
        "cta_type": "REPLY",
        "label": "Reply to this email",
        "destination_type": "EMAIL_REPLY",
        
        "applies_to": {
          "buyer_stages": ["AWARENESS", "CONSIDERATION"]
        }
      }
    ]
  }
}
```

**CTA Types:**
- `REPLY` - Reply to email
- `CLICK` - Visit a page
- `BOOK_CALL` - Schedule meeting
- `DOWNLOAD` - Get resource
- `OTHER` - Custom action

### 4.3 Email Flow Blueprints

```json
{
  "email_flow_blueprints": [
    {
      "flow_blueprint_id": "flow_intro_001",
      "name": "Initial Warm-Up Sequence",
      "goal": "MEANINGFUL_REPLY",
      
      "length_range": {
        "min": 3,
        "max": 5
      },
      
      "sequence_structure": [
        {
          "position": 1,
          "purpose": "intro",
          "delay_from_previous_hours": 0
        },
        {
          "position": 2,
          "purpose": "value",
          "delay_from_previous_hours": 48
        },
        {
          "position": 3,
          "purpose": "proof",
          "delay_from_previous_hours": 48
        },
        {
          "position": 4,
          "purpose": "ask",
          "delay_from_previous_hours": 72
        }
      ],
      
      "default_cta_type": "REPLY",
      "recommended_angle_axes": ["risk", "control"],
      
      "applies_to": {
        "icp_ids": ["*"],
        "buyer_stages": ["AWARENESS"]
      }
    }
  ]
}
```

### 4.4 Reply Playbooks & Strategies

```json
{
  "reply_playbooks": [
    {
      "playbook_id": "playbook_general_001",
      "name": "General Reply Playbook",
      
      "scenarios": [
        {
          "scenario_id": "pricing_question",
          "description": "Prospect asks about pricing or cost",
          "signal_words": ["price", "cost", "budget", "expensive", "afford"],
          "allowed_strategy_ids": ["strategy_clarify_first", "strategy_guidance_first"]
        },
        {
          "scenario_id": "timeline_question",
          "description": "Prospect asks about how long it takes",
          "signal_words": ["how long", "timeline", "when", "speed"],
          "allowed_strategy_ids": ["strategy_guidance_first"]
        },
        {
          "scenario_id": "objection_intent",
          "description": "Prospect expresses skepticism about intent data",
          "signal_words": ["intent", "data", "accuracy", "how do you know"],
          "allowed_strategy_ids": ["strategy_clarify_first", "strategy_two_step"]
        }
      ]
    }
  ],
  
  "reply_strategies": [
    {
      "strategy_id": "strategy_clarify_first",
      "strategy_type": "CLARIFYING_QUESTION_FIRST",
      "description": "Ask a clarifying question before providing information",
      
      "rules": [
        "Lead with understanding their specific situation",
        "Don't assume their context",
        "Keep question specific, not generic"
      ]
    },
    {
      "strategy_id": "strategy_guidance_first",
      "strategy_type": "GUIDANCE_FIRST",
      "description": "Provide helpful information directly",
      
      "rules": [
        "Answer their question directly",
        "Add context for understanding",
        "Offer next step if appropriate"
      ]
    },
    {
      "strategy_id": "strategy_two_step",
      "strategy_type": "TWO_STEP_ESCALATION",
      "description": "First reply clarifies, second reply offers action",
      
      "rules": [
        "Reply 1: clarify and explain",
        "Reply 2: offer next step if they respond positively"
      ]
    }
  ]
}
```

### 4.5 Subject/First-Line Variants

```json
{
  "subject_firstline_variants": [
    {
      "variant_id": "sfv_001",
      "subject": "Quick question about your pipeline",
      "first_line": "I noticed you're hiring demand gen roles...",
      
      "applies_to": {
        "icp_ids": ["ent_saas_001"],
        "buyer_stages": ["AWARENESS"]
      },
      
      "is_active": true,
      "is_testing": true
    }
  ]
}
```

---

## 5️⃣ ROUTING RULES

```json
{
  "routing": {
    "defaults": [
      {
        "context": {
          "buyer_stage": "AWARENESS"
        },
        "destination_type": "EMAIL_REPLY",
        "cta_type": "REPLY"
      },
      {
        "context": {
          "buyer_stage": "EVALUATION"
        },
        "destination_type": "CALENDAR",
        "destination_slug": "/book",
        "cta_type": "BOOK_CALL"
      }
    ],
    
    "rules": [
      {
        "rule_id": "route_001",
        "if": {
          "entry_page_type": "LANDING",
          "buyer_stage": "CONSIDERATION"
        },
        "then": {
          "next_destination_slug": "/how-it-works",
          "preferred_cta_id": "cta_click_001"
        }
      }
    ]
  }
}
```

---

## 6️⃣ TESTING CONFIGURATION

```json
{
  "testing": {
    "pages": {
      "enabled": true,
      "max_variants": 3,
      "evaluation_window_days": 7,
      "min_sample_size": 100
    },
    
    "email_flows": {
      "enabled": true,
      "max_variants": 3,
      "evaluation_window_days": 14,
      "min_sample_size": 200
    },
    
    "email_replies": {
      "enabled": true,
      "max_variants": 2,
      "evaluation_window_days": 7,
      "min_sample_size": 50
    },
    
    "subject_firstline": {
      "enabled": true,
      "max_variants": 5,
      "evaluation_window_days": 7,
      "min_sample_size": 500
    }
  }
}
```

---

## 7️⃣ GUARDRAILS

```json
{
  "guardrails": {
    "thresholds": {
      "bounce_rate_max": 0.15,
      "unsubscribe_rate_max": 0.02,
      "complaint_rate_max": 0.001
    },
    
    "paused_patterns": [
      {
        "pattern_type": "SUBJECT_FIRSTLINE",
        "pattern_id": "sfv_003",
        "reason": "Bounce rate exceeded 15%",
        "paused_at": "2026-01-22T06:00:00Z",
        "paused_by": "LEARNING_LOOP"
      }
    ]
  }
}
```

---

## 8️⃣ LEARNING (Preferences)

```json
{
  "learning": {
    "history": [
      {
        "update_id": "upd_001",
        "timestamp": "2026-01-22T06:00:00Z",
        "source": "DAILY_RUN",
        "summary": "Promoted risk angle for Enterprise ICP",
        "evidence_refs": ["daily_stats_2026-01-21"]
      }
    ],
    
    "preferences": [
      {
        "pref_id": "pref_001",
        "preference_type": "PREFER_ANGLE",
        "preferred_ids": ["risk_001", "control_001"],
        
        "applies_to": {
          "icp_id": "ent_saas_001",
          "buyer_stage": "CONSIDERATION"
        },
        
        "reason": "2.5x higher booked_call_rate in evaluation window",
        "created_at": "2026-01-22T06:00:00Z",
        "expires_at": null
      }
    ]
  }
}
```

**Preference Types:**
- `PREFER_ANGLE`
- `PREFER_CTA`
- `PREFER_PAGE_TYPE`
- `PREFER_LAYOUT`
- `PREFER_FLOW_BLUEPRINT`
- `PREFER_REPLY_STRATEGY`
- `PREFER_SUBJECT_FIRSTLINE`
- `PREFER_SOCIAL_BLUEPRINT`

---

*Document: KB Schema Specification | January 23rd, 2026*
