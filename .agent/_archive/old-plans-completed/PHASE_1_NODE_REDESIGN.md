# Phase 1: Node Redesign

> **Status**: 🟡 IN PROGRESS
> **Duration**: 3-4 days
> **Dependencies**: None
> **Last Updated**: 2026-01-26

---

## Objective

Redesign the node palette to match V1 requirements. Define proper node types with clear input/output contracts.

---

## Current State

**20 nodes exist** in `node_palette` table, but they're generic:
- `generate-llm` - Just "call AI" with no KB awareness
- `retrieve-kb` - Exists but KB schema is incomplete
- Missing: Resolution nodes, Content-type-specific generators

---

## Target State

**~25 nodes** organized by actual function:

### Tier 1: Triggers (3)
| node_id | name | description |
|---------|------|-------------|
| `webhook-trigger` | Webhook Trigger | Receive data from n8n/external systems |
| `schedule-trigger` | Schedule Trigger | Cron-based execution (e.g., daily 6 AM) |
| `manual-trigger` | Manual Trigger | On-demand testing and execution |

### Tier 2: Resolvers (5) - NEW
| node_id | name | description |
|---------|------|-------------|
| `resolve-icp` | Resolve ICP | Match input to ICP segment from KB |
| `resolve-offer` | Resolve Offer | Match input to Offer from KB |
| `resolve-angle` | Select Angle | Choose angle based on KB preferences |
| `resolve-blueprint` | Select Blueprint | Choose blueprint for content type |
| `resolve-cta` | Select CTA | Choose CTA based on routing rules |

### Tier 3: Generators (5) - SPECIFIC
| node_id | name | description |
|---------|------|-------------|
| `generate-website-page` | Generate Page | Single page with sections |
| `generate-website-bundle` | Generate Website | Multi-page bundle with routing |
| `generate-email-flow` | Generate Email Flow | Email sequence with delays |
| `generate-email-reply` | Generate Reply | Contextual reply with strategy |
| `generate-social-post` | Generate Social | Platform-specific post |

### Tier 4: Processors (4)
| node_id | name | description |
|---------|------|-------------|
| `analyze-intent` | Analyze Intent | Detect intent from input |
| `web-search` | Web Research | Fetch external context |
| `seo-optimize` | SEO Optimizer | Optimize content for search |
| `add-content-locker` | Content Locker | Add gating hooks |

### Tier 5: Validators (2)
| node_id | name | description |
|---------|------|-------------|
| `validate-constitution` | Constitution Check | Check guardrails |
| `validate-quality` | Quality Gate | Check quality score |

### Tier 6: Conditions (3)
| node_id | name | description |
|---------|------|-------------|
| `route-by-stage` | Route by Stage | Branch by buyer awareness |
| `route-by-validation` | Route by Validation | Branch by pass/fail |
| `route-by-type` | Route by Content Type | Branch by requested type |

### Tier 7: Outputs (3)
| node_id | name | description |
|---------|------|-------------|
| `output-webhook` | Send Webhook | Return to caller |
| `output-store` | Store Content | Save to DB |
| `output-analytics` | Log Analytics | Record for learning loop |

---

## Tasks

### Task 1.1: Define Node Schemas
**Files to create:**
```
apps/backend/src/schemas/nodes/
├── index.ts                    # Export all
├── trigger.schemas.ts          # Trigger node I/O
├── resolver.schemas.ts         # Resolver node I/O
├── generator.schemas.ts        # Generator node I/O
├── processor.schemas.ts        # Processor node I/O
├── validator.schemas.ts        # Validator node I/O
├── condition.schemas.ts        # Condition node I/O
└── output.schemas.ts           # Output node I/O
```

**Schema structure (Zod):**
```typescript
// Example: resolve-icp
export const ResolveICPInput = z.object({
    industry_hint: z.string().optional(),
    job_title_hint: z.string().optional(),
    company_size_hint: z.enum(['SMB', 'MM', 'ENT']).optional(),
    raw_signal: z.string().optional(), // e.g., email domain
});

export const ResolveICPOutput = z.object({
    icp_id: z.string(),
    segment: ICPSegmentSchema, // Full resolved ICP object
    confidence: z.number().min(0).max(1),
    match_reason: z.string(),
});
```

### Task 1.2: Update Database Seed
**File to modify:**
```
apps/frontend/supabase/migrations/20260124000001_create_workflow_engine_tables.sql
```

**Changes:**
- Delete existing `INSERT INTO node_palette` statements
- Add new node definitions with proper categories
- Update `features` and `capabilities` JSONB

### Task 1.3: Update Frontend Node Mapping
**File to modify:**
```
apps/frontend/src/components/WorkflowBuilder/AxiomNodes.tsx
```

**Changes:**
- Update `NODE_PALETTE` const with new node types
- Add new icons for resolver nodes (e.g., `Target`, `Tag`, `Compass`)
- Update `CATEGORY_ICONS` for new resolver category

### Task 1.4: Create Node Configuration Panels
**File to modify:**
```
apps/frontend/src/components/WorkflowBuilder/NodeConfigurationModal.tsx
```

**Changes:**
- Add config panels for each new node type
- Resolver nodes: minimal config (just previews resolved data)
- Generator nodes: template selection, output format options
- Condition nodes: branch configuration

---

## Validation Checklist

- [ ] All 25 nodes defined in database
- [ ] All nodes have Zod schemas (input/output)
- [ ] Frontend renders all nodes correctly
- [ ] Node configuration modal works for each type
- [ ] No TypeScript errors
- [ ] Migration runs without errors

---

## Rollback Plan

If issues arise:
1. Revert migration (delete new nodes, re-add old ones)
2. Revert `AxiomNodes.tsx` to previous state
3. Revert `NodeConfigurationModal.tsx`

---

## Notes

- Resolver nodes are the KEY innovation - they explicitly surface KB lookup steps
- Generator nodes will be wired in Phase 3
- This phase is schema-only - no execution logic yet
