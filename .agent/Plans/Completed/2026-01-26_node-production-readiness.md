# Node Production Readiness Analysis

> **Generated**: 2026-01-26  
> **Total Nodes**: 36 nodes across 8 categories

---

## SUMMARY

| Category | Count | Frontend Config | Backend Handler | Production Ready |
|----------|-------|-----------------|-----------------|------------------|
| **Trigger** | 4 | ✅ TriggerConfig.tsx | ✅ executeTriggerNode | ✅ YES |
| **Resolver** | 5 | ✅ ResolverConfig.tsx | ✅ executeResolverNode + kbResolutionService | ✅ YES |
| **Generator** | 5 | ⚠️ AIConfig only | ✅ executeGeneratorNode | ⚠️ PARTIAL |
| **Validator** | 3 | ⚠️ AIConfig only | ✅ executeValidatorNode | ⚠️ PARTIAL |
| **Enricher** | 4 | ❌ JSON only | ⚠️ executeProcessNode (shared) | ❌ NO |
| **Transform** | 3 | ❌ JSON only | ⚠️ executeProcessNode (shared) | ❌ NO |
| **Output** | 4 | ❌ JSON only | ⚠️ executeOutputNode (basic) | ❌ NO |
| **Utility** | 8 | ❌ JSON only | ⚠️ executeConditionNode (basic) | ❌ NO |

---

## DETAILED STATUS

### ✅ TRIGGER NODES (Production Ready)

| Node | Frontend | Backend | Status |
|------|----------|---------|--------|
| `trigger-webhook` | ✅ URL, Auth, Schema | ✅ Passthrough | ✅ Ready |
| `trigger-schedule` | ✅ Frequency, Cron, TZ | ✅ Passthrough | ✅ Ready |
| `trigger-manual` | ✅ Input Fields Builder | ✅ Passthrough | ✅ Ready |
| `trigger-email-inbound` | ✅ Mailbox, Filters | ✅ Passthrough | ✅ Ready |

**Note**: Backend handlers work, but actual trigger mechanisms (webhook listener, cron scheduler, email polling) need infrastructure integration.

---

### ✅ RESOLVER NODES (Production Ready)

| Node | Frontend | Backend | Status |
|------|----------|---------|--------|
| `resolve-icp` | ✅ ICP hints, selection mode | ✅ kbResolutionService.resolveICP | ✅ Ready |
| `resolve-offer` | ✅ Offer hints | ✅ kbResolutionService.resolveOffer | ✅ Ready |
| `resolve-angle` | ✅ Buyer stage, axis | ✅ kbResolutionService.selectAngle | ✅ Ready |
| `resolve-blueprint` | ✅ Content type, page type | ✅ kbResolutionService.selectBlueprint | ✅ Ready |
| `resolve-cta` | ✅ CTA type, context | ✅ kbResolutionService.selectCTA | ✅ Ready |

---

### ⚠️ GENERATOR NODES (Partial - Need GeneratorConfig)

| Node | Frontend | Backend | Gap |
|------|----------|---------|-----|
| `generate-email-reply` | AIConfig | ✅ Full | Need: replyStyle, includeSignature |
| `generate-email-flow` | AIConfig | ✅ Full | Need: sequenceLength, cadence, A/B variants |
| `generate-website-page` | AIConfig | ✅ Full | Need: pageType, seoOptimize, sections |
| `generate-website-bundle` | AIConfig | ✅ Full | Need: pages array, linkStrategy |
| `generate-social-post` | AIConfig | ✅ Full | Need: platform, hashtags, imagePrompt |

**Action**: Create `GeneratorConfig.tsx` with type-specific fields

---

### ⚠️ VALIDATOR NODES (Partial - Need ValidatorConfig)

| Node | Frontend | Backend | Gap |
|------|----------|---------|-----|
| `validate-quality` | AIConfig | ✅ Full | Need: passThreshold, failAction |
| `validate-constitution` | AIConfig | ✅ Full | Need: constitution selector, strictMode |
| `analyze-intent` | AIConfig | ✅ Full | Need: intent categories, minConfidence |

**Action**: Create `ValidatorConfig.tsx` with validation-specific fields

---

### ❌ ENRICHER NODES (Not Ready)

| Node | Frontend | Backend | Gap |
|------|----------|---------|-----|
| `enrich-web-search` | JSON | ✅ executeProcessNode | Need: maxResults, summarize, sources |
| `enrich-company-data` | JSON | ❌ Stub | Need: provider (clearbit?), fields selector |
| `enrich-contact-data` | JSON | ❌ Stub | Need: provider, verification options |
| `enrich-context` | JSON | ❌ Stub | Need: source selector (kb, previous, external) |

**Action**: 
1. Create `EnricherConfig.tsx` with provider/field selectors
2. Backend needs actual enrichment integrations (Clearbit, Apollo, etc.)

---

### ❌ TRANSFORM NODES (Not Ready)

| Node | Frontend | Backend | Gap |
|------|----------|---------|-----|
| `transform-locker` | JSON | ⚠️ Shared | Need: unlockMethod, gatedContent selector |
| `transform-format` | JSON | ⚠️ Shared | Need: outputFormat selector |
| `transform-personalize` | JSON | ⚠️ Shared | Need: variable mapping UI |

**Action**: Create `TransformConfig.tsx` with format/personalization options

---

### ❌ OUTPUT NODES (Not Ready)

| Node | Frontend | Backend | Gap |
|------|----------|---------|-----|
| `output-webhook` | JSON | ⚠️ Basic | Need: URL, method, headers, retries |
| `output-store` | JSON | ⚠️ Basic | Need: table selector, field mapping |
| `output-email` | JSON | ⚠️ Basic | Need: to/cc/bcc, template, provider |
| `output-analytics` | JSON | ⚠️ Basic | Need: eventName, properties mapping |

**Action**: 
1. Create `OutputConfig.tsx` with destination-specific forms
2. Backend needs actual output implementations (HTTP, Supabase, Resend)

---

### ❌ UTILITY NODES (Not Ready)

| Node | Frontend | Backend | Gap |
|------|----------|---------|-----|
| `condition-if-else` | JSON | ⚠️ Basic | Need: expression builder UI |
| `condition-switch` | JSON | ❌ Stub | Need: cases array builder |
| `loop-foreach` | JSON | ❌ Stub | Need: array selector, iterator config |
| `merge-combine` | JSON | ❌ Stub | Need: wait mode, merge strategy |
| `delay-wait` | JSON | ❌ Stub | Need: duration, unit selector |
| `human-review` | JSON | ❌ Stub | Need: approvers, timeout, actions |
| `error-handler` | JSON | ❌ Stub | Need: catch config, retry logic |
| `split-parallel` | JSON | ❌ Stub | Need: branch count, clone toggle |

**Action**: 
1. Create `UtilityConfig.tsx` with condition builder, loop config
2. Backend needs actual control flow implementation

---

## PRIORITY ORDER

### P0 - Already Done ✅
1. ~~TriggerConfig~~ ✅
2. ~~ResolverConfig~~ ✅

### P1 - High Impact, Required for MVP
3. **GeneratorConfig** - The money maker
4. **ValidatorConfig** - Quality gates
5. **OutputConfig** - Actually sends results

### P2 - Nice to Have
6. **EnricherConfig** - Requires external APIs
7. **TransformConfig** - Format conversion

### P3 - Advanced Features
8. **UtilityConfig** - Complex control flow

---

## NEXT IMPLEMENTATION

### GeneratorConfig.tsx (P1)

Each generator type needs:

**Common Fields:**
- AI Config (provider, model, temperature, maxTokens) ← Already have AIConfig
- System prompt ← Already have
- Output format (text, html, markdown, json)
- Constitution selector

**Type-Specific:**

| Node | Extra Fields |
|------|--------------|
| `generate-email-reply` | replyStyle (formal/casual), includeSignature, maxLength |
| `generate-email-flow` | sequenceLength (1-10), daysBetween, flowGoal |
| `generate-website-page` | pageType, seoTitle, seoDescription, sections toggle |
| `generate-website-bundle` | pages array builder, navigation style |
| `generate-social-post` | platform(s), hashtags toggle, emojiLevel, imagePrompt |

---

## BACKEND GAPS

| Area | Current | Needed |
|------|---------|--------|
| Output nodes | Returns data | Actually send (HTTP, email) |
| Enricher nodes | Stub | External API integrations |
| Utility nodes | Basic condition | Full control flow |
| Loop nodes | Not implemented | Iterator with state |
| Human review | Not implemented | Pause + resume infrastructure |

---

*This analysis drives the implementation roadmap.*
