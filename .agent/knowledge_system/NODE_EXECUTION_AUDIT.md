# AXIOM NODE EXECUTION AUDIT
**Last Updated:** 2026-01-27 13:00 IST (by Ghazal)

---

## 📋 SUMMARY

| Category | Node Types | Handler Status | Live Logic |
|----------|------------|----------------|------------|
| **Triggers** | 4 V2 + 4 Legacy | ✅ Handler exists | ⚠️ Passthrough only |
| **Resolvers** | 5 V2 | ✅ Handler exists | ✅ KB resolution works |
| **Generators** | 5 V2 | ✅ Handler exists | ✅ AI calls work |
| **Processors** | 5 V2 + 3 Legacy | ✅ Handler exists | ✅ AI calls work |
| **Transforms** | 3 V2 + 3 Legacy | ✅ Handler exists | ⚠️ Routes to process |
| **Validators** | 2 V2 | ✅ Handler exists | ✅ Quality + Constitution |
| **Conditions** | 8 V2 + 4 Legacy | ✅ Handler exists | ⚠️ Basic logic only |
| **Outputs** | 4 V2 + 3 Legacy | ✅ Handler exists | ⚠️ Passthrough only |
| **Inputs** | 3 Legacy | ✅ Handler exists | ✅ Works |
| **KB** | 1 Legacy | ✅ Handler exists | ⚠️ Text search only |

**Total:** 36 node types in configuration, all have handlers in `executeNode()`

---

## ✅ FULLY WORKING (Real Logic)

### Resolver Nodes (5 types)
| Node Type | Handler | Logic |
|-----------|---------|-------|
| `resolve-icp` | `executeResolverNode` | ✅ Uses `kbResolutionService.resolveICP()` |
| `resolve-offer` | `executeResolverNode` | ✅ Uses `kbResolutionService.resolveOffer()` |
| `resolve-angle` | `executeResolverNode` | ✅ Uses `kbResolutionService.selectAngle()` |
| `resolve-blueprint` | `executeResolverNode` | ✅ Uses `kbResolutionService.selectBlueprint()` |
| `resolve-cta` | `executeResolverNode` | ✅ Uses `kbResolutionService.selectCTA()` |

### Generator Nodes (5 types)
| Node Type | Handler | Logic |
|-----------|---------|-------|
| `generate-website-page` | `executeGeneratorNode` | ✅ AI call with `contentGeneratorService` |
| `generate-website-bundle` | `executeGeneratorNode` | ✅ AI call with `contentGeneratorService` |
| `generate-email-flow` | `executeGeneratorNode` | ✅ AI call with `contentGeneratorService` |
| `generate-email-reply` | `executeGeneratorNode` | ✅ AI call with `contentGeneratorService` |
| `generate-social-post` | `executeGeneratorNode` | ✅ AI call with `contentGeneratorService` |

### Validator Nodes (2 types)
| Node Type | Handler | Logic |
|-----------|---------|-------|
| `validate-quality` | `executeValidatorNode` → `executeQualityValidation` | ✅ Quality metrics check |
| `validate-constitution` | `executeValidatorNode` → `executeConstitutionValidation` | ✅ KB guardrails + rules |

### Processor Nodes (8 types)
| Node Type | Handler | Logic |
|-----------|---------|-------|
| `analyze-intent` | `executeProcessNode` | ✅ AI intent analysis |
| `enrich-web-search` | `executeProcessNode` | ✅ AI-powered search prompt |
| `enrich-company-data` | `executeProcessNode` | ✅ AI enrichment |
| `enrich-contact-data` | `executeProcessNode` | ✅ AI enrichment |
| `enrich-context` | `executeProcessNode` | ✅ AI context building |
| `web-search` | `executeProcessNode` | ✅ Legacy, AI-powered |
| `seo-optimize` | `executeProcessNode` | ✅ Legacy, AI-powered |
| `generate-llm` | `executeProcessNode` | ✅ Legacy, AI-powered |

---

## ⚠️ PASSTHROUGH / STUB (Handler exists, minimal logic)

### Trigger Nodes (8 types)
| Node Type | Handler | Current Logic | Needed |
|-----------|---------|---------------|--------|
| `trigger-webhook` | `executeTriggerNode` | Returns input as-is | External webhook listener |
| `trigger-schedule` | `executeTriggerNode` | Returns input as-is | Cron job integration |
| `trigger-manual` | `executeTriggerNode` | Returns input as-is | ✅ Works (manual is passthrough) |
| `trigger-email-inbound` | `executeTriggerNode` | Returns input as-is | MailWiz integration |
| `webhook-trigger` | `executeTriggerNode` | Legacy alias | - |
| `schedule-trigger` | `executeTriggerNode` | Legacy alias | - |
| `manual-trigger` | `executeTriggerNode` | Legacy alias | - |
| `email-trigger` | `executeTriggerNode` | Legacy alias | - |

### Transform Nodes (6 types)
| Node Type | Handler | Current Logic | Needed |
|-----------|---------|---------------|--------|
| `transform-locker` | `executeProcessNode` | AI-based transform | ✅ Minimal |
| `transform-format` | `executeProcessNode` | AI-based transform | ✅ Minimal |
| `transform-personalize` | `executeProcessNode` | AI-based transform | ✅ Minimal |
| `add-content-locker` | `executeProcessNode` | Legacy | - |
| `content-locker` | `executeProcessNode` | Legacy | - |
| `seo-optimizer` | `executeProcessNode` | Legacy | - |

### Condition Nodes (12 types)
| Node Type | Handler | Current Logic | Needed |
|-----------|---------|---------------|--------|
| `condition-if-else` | `executeConditionNode` | Basic condition eval | Real branching logic |
| `condition-switch` | `executeConditionNode` | Basic | Multi-branch routing |
| `loop-foreach` | `executeConditionNode` | ⚠️ Stub | Iteration logic |
| `merge-combine` | `executeConditionNode` | ⚠️ Stub | Merge multiple inputs |
| `delay-wait` | `executeConditionNode` | ⚠️ Stub | Sleep/delay |
| `human-review` | `executeConditionNode` | ⚠️ Stub | Pause for human |
| `error-handler` | `executeConditionNode` | ⚠️ Stub | Error routing |
| `split-parallel` | `executeConditionNode` | ⚠️ Stub | Parallel execution |
| `route-by-stage` | `executeConditionNode` | Legacy | - |
| `route-by-validation` | `executeConditionNode` | Legacy | - |
| `route-by-type` | `executeConditionNode` | Legacy | - |
| `logic-gate` | `executeConditionNode` | Legacy | - |

### Output Nodes (7 types)
| Node Type | Handler | Current Logic | Needed |
|-----------|---------|---------------|--------|
| `output-webhook` | `executeOutputNode` | Returns aggregated | HTTP POST to webhook |
| `output-store` | `executeOutputNode` | Returns aggregated | Save to DB |
| `output-email` | `executeOutputNode` | Returns aggregated | Email send |
| `output-analytics` | `executeOutputNode` | Returns aggregated | Analytics tracking |
| `output-n8n` | `executeOutputNode` | Legacy | n8n integration |
| `output-export` | `executeOutputNode` | Legacy | File export |
| `output-schedule` | `executeOutputNode` | Legacy | Schedule output |

### KB Retrieval (1 type)
| Node Type | Handler | Current Logic | Needed |
|-----------|---------|---------------|--------|
| `retrieve-kb` | `executeKBNode` | Text search | Vector search (embeddings) |

---

## 🔧 WHAT NEEDS WORK

### Priority 1: Output Nodes (for workflows to actually DO something)
- `output-webhook`: Need actual HTTP POST
- `output-store`: Need Supabase insert
- `output-email`: Need email service integration

### Priority 2: Trigger Nodes (for workflows to be triggered)
- `trigger-webhook`: Need webhook endpoint listener
- `trigger-email-inbound`: Need MailWiz integration
- `trigger-schedule`: Need cron/scheduler

### Priority 3: Condition Nodes (for branching)
- `loop-foreach`: Iteration over arrays
- `split-parallel`: Parallel node execution
- `merge-combine`: Combine parallel outputs

### Priority 4: KB Vector Search
- `retrieve-kb`: Embeddings-based semantic search

---

## 📊 PIPELINE DATA FLOW

```
User Input
    │
    ▼
┌─────────────────────────────────────────────────────┐
│ pipelineData = {                                    │
│   userInput: { ... original input, NEVER LOST ... }│
│   nodeOutputs: { [nodeId]: NodeOutput, ... }        │
│   lastNodeOutput: NodeOutput | null                 │
│   kb: KnowledgeBase | null                          │
│   engineConfig: { ... } | null                      │
│   constitution: { ... } | null                      │
│   tokenUsage: { totalTokens, totalCost, totalWords }│
│   tokenLedger: [ { nodeId, tokens, cost, ... } ]    │
│ }                                                   │
└─────────────────────────────────────────────────────┘
    │
    ▼
[ Node 1 ] ──→ [ Node 2 ] ──→ [ Node 3 ] ──→ [ Output ]
    │              │              │
    └──────────────┴──────────────┘
           Each node can read:
           - userInput (original)
           - nodeOutputs[prevNodeId]
           - lastNodeOutput
           - kb (if engine has KB)
```

---

## ✅ WHAT'S CONFIRMED WORKING

1. **Topological Sort**: Nodes execute in dependency order
2. **Resolver → Generator Pipeline**: KB resolution feeds into content generation
3. **AI Calls**: Working with OpenAI, Anthropic, Google, Perplexity
4. **Token Tracking**: Tokens, cost, ledger all tracked
5. **Checkpointing**: Execution state saved for resume
6. **Stop/Pause/Resume**: Execution control works
7. **Progress Callbacks**: Sent (but no WebSocket to receive them)
8. **Constitution Validation**: Uses KB guardrails + brand rules

---

*Audit by Ghazal | 2026-01-27 13:00 IST*
