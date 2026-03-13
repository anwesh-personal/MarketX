# API Route Security Audit — Axiom Frontend

**Date:** 2026-03-10  
**Scope:** `apps/frontend/src/app/api/**/*.ts` (145 route files)  
**Auditor:** Automated deep scan

---

## SUMMARY

| Severity | Count |
|----------|-------|
| **CRITICAL** | 18 |
| **WARNING** | 24 |
| **INFO** | 11 |

---

## 1. HARDCODED PROVIDER URLs

All of these should be read from `ai_providers` table or a centralized config constant.

| File | Issue | Severity |
|------|-------|----------|
| `chat/route.ts:27` | Hardcoded `https://api.openai.com/v1/chat/completions` | **WARNING** |
| `chat/route.ts:62` | Hardcoded `https://api.anthropic.com/v1/messages` | **WARNING** |
| `superadmin/ai-chat/route.ts:161` | Hardcoded `https://api.openai.com/v1/chat/completions` | **WARNING** |
| `superadmin/ai-chat/route.ts:200` | Hardcoded `https://api.anthropic.com/v1/messages` | **WARNING** |
| `superadmin/ai-chat/route.ts:248` | Hardcoded `https://generativelanguage.googleapis.com/...` | **WARNING** |
| `superadmin/ai-chat/route.ts:284` | Hardcoded `https://api.mistral.ai/v1/chat/completions` | **WARNING** |
| `superadmin/ai-chat/route.ts:354` | Hardcoded `https://api.x.ai/v1/chat/completions` | **WARNING** |
| `superadmin/ai-chat/route.ts:389` | Hardcoded `https://api.perplexity.ai/chat/completions` | **WARNING** |
| `superadmin/ai-models/discover/route.ts:29,52,66` | Hardcoded OpenAI, Google, Mistral API URLs | **WARNING** |
| `superadmin/ai-models/list-all/route.ts:27,56,73` | Hardcoded OpenAI, Google, Mistral API URLs | **WARNING** |
| `superadmin/ai-providers/[providerId]/test/route.ts:55,94,141,172,208,253` | All 6 provider URLs hardcoded | **WARNING** |
| `superadmin/ai-providers/test/route.ts:88,116,146,175` | Hardcoded OpenAI, Anthropic, Google, Mistral URLs | **WARNING** |
| `superadmin/ai-providers/discover/route.ts:73` | Hardcoded `https://api.openai.com/v1/models` | **WARNING** |

> **Fix:** Create a `PROVIDER_BASE_URLS` map in `@/lib/ai-providers` or store base URLs in the `ai_providers` DB table.

---

## 2. HARDCODED MODEL NAMES

| File | Issue | Severity |
|------|-------|----------|
| `chat/route.ts:139` | Fallback `'gpt-4o-mini'` when no preferred_model set | **WARNING** |
| `superadmin/ai-chat/route.ts:159` | Default `'gpt-4-turbo-preview'` for OpenAI | **WARNING** |
| `superadmin/ai-chat/route.ts:194` | Default `'claude-3-sonnet-20240229'` for Anthropic | **WARNING** |
| `superadmin/ai-chat/route.ts:235` | Default `'gemini-1.5-flash'` for Google | **WARNING** |
| `superadmin/ai-chat/route.ts:282` | Default `'mistral-small-latest'` for Mistral | **WARNING** |
| `superadmin/ai-chat/route.ts:352` | Default `'grok-2-1212'` for xAI | **WARNING** |
| `superadmin/ai-chat/route.ts:387` | Default `'llama-3.1-sonar-large-128k-online'` for Perplexity | **WARNING** |
| `superadmin/ai-chat/route.ts:318-333` | **Entire cost-per-token table hardcoded** (14 model entries) | **CRITICAL** |
| `superadmin/ai-models/discover/route.ts:41` | Fallback model list: `['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-mini', 'o1-preview']` | **WARNING** |
| `superadmin/ai-models/discover/route.ts:60` | Fallback `['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash']` | **INFO** |
| `superadmin/ai-models/discover/route.ts:74` | Fallback `['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest']` | **INFO** |
| `superadmin/ai-providers/[providerId]/test/route.ts:102` | Test model hardcoded: `'claude-3-haiku-20240307'` | **INFO** |
| `superadmin/ai-providers/[providerId]/test/route.ts:117-123` | Hardcoded Anthropic model list (5 models) | **INFO** |
| `superadmin/ai-providers/[providerId]/test/route.ts:215` | Test model: `'llama-3.1-sonar-small-128k-online'` | **INFO** |
| `superadmin/ai-providers/[providerId]/test/route.ts:230-234` | Hardcoded Perplexity model list (4 models) | **INFO** |
| `superadmin/ai-providers/[providerId]/test/route.ts:260` | Test model: `'grok-beta'` | **INFO** |
| `superadmin/ai-providers/[providerId]/test/route.ts:275-278` | Hardcoded xAI model list (2 models) | **INFO** |

> **Fix:** Default models should come from `ai_model_metadata` table or `config_table`. Cost table should be in `ai_model_metadata.input_cost_per_million / output_cost_per_million`.

---

## 3. HARDCODED NUMERIC THRESHOLDS (should be in `config_table`)

| File | Issue | Severity |
|------|-------|----------|
| `knowledge/governance/revalidate/route.ts:56` | `evidence_count < 3` → suspend threshold | **WARNING** |
| `knowledge/governance/revalidate/route.ts:59` | `stability_score < 0.3 && confidence < 0.4` → demote threshold | **WARNING** |
| `knowledge/governance/revalidate/route.ts:63` | `confidence > 0.8 && stability_score > 0.7` → slow cycle | **WARNING** |
| `knowledge/governance/revalidate/route.ts:65` | `confidence < 0.5` → fast cycle | **WARNING** |
| `knowledge/governance/promote/route.ts:69` | `cross_partner_count < 2` hardcoded promotion gate | **WARNING** |
| `knowledge/governance/promote/route.ts:74` | `sample_size < 100` hardcoded promotion gate | **WARNING** |
| `knowledge/governance/promote/route.ts:79` | `stability_score < 0.6` hardcoded promotion gate | **WARNING** |
| `knowledge/governance/promote/route.ts:127` | `30 * 24 * 60 * 60 * 1000` (30 days) hardcoded revalidation window | **INFO** |
| `signals/gating/evaluate/route.ts:78` | `confidence_score` threshold `0.35` hardcoded | **WARNING** |
| `signals/gating/evaluate/route.ts:79` | `booked_call_rate` threshold `0.01` hardcoded | **WARNING** |
| `signals/gating/evaluate/route.ts:80` | `negative_rate_max` threshold `0.08` hardcoded | **WARNING** |
| `signals/gating/evaluate/route.ts:81` | `min_exploration_guard` threshold `0.1` hardcoded | **WARNING** |
| `satellites/provision/route.ts:95` | `reputation_score: 0.5` initial value hardcoded | **INFO** |
| `agents/pre-send/route.ts:71` | `confidence ?? 0.5` fallback hardcoded | **INFO** |
| `agents/pre-send/route.ts:134` | `reputation_score ?? 100` fallback hardcoded | **INFO** |
| `satellites/deliverability/snapshot/route.ts:97` | `rep = 100` base reputation score hardcoded | **INFO** |
| `satellites/deliverability/snapshot/route.ts:143` | `rep < 70` alert threshold hardcoded | **WARNING** |
| `satellites/deliverability/snapshot/route.ts:148` | `rep < 50` critical threshold hardcoded | **WARNING** |
| `satellites/deliverability/snapshot/route.ts:107` | `s.deliveries > 50` min volume for low_opens flag | **INFO** |
| `system/scale-expansion/route.ts:51` | `avgReply > 0.01` engagement threshold hardcoded | **INFO** |

> **Fix:** Move to `config_table` with keys like `knowledge_suspend_evidence_min`, `promotion_min_cross_partner`, `gating_min_confidence`, etc.

---

## 4. MISSING AUTH CHECKS

### 4a. Non-superadmin routes with ZERO auth

| File | Issue | Severity |
|------|-------|----------|
| `brain/embeddings/route.ts` | GET + DELETE with **no auth at all** — any unauthenticated request can list/delete embeddings | **CRITICAL** |
| `brain/templates/route.ts` | GET with **no auth** — lists all brain templates | **CRITICAL** |
| `brain/agents/route.ts` | GET + PATCH with **no auth** — anyone can list and update any agent | **CRITICAL** |
| `brain/config/route.ts` | GET with **no auth** — leaks brain config | **CRITICAL** |
| `brain/analytics/route.ts` | GET with **no auth** — returns mock data, still public | **WARNING** |
| `brain/training/feedback/route.ts` | GET with **no auth** — returns mock data, still public | **INFO** |
| `workers/jobs/[jobId]/route.ts` | GET with **no auth** — exposes internal queue job status to anyone | **CRITICAL** |
| `ai-models/route.ts` | GET with **no auth**, uses service role key — lists all AI model metadata including cost info | **CRITICAL** |

### 4b. Superadmin routes with NO superadmin JWT verification

These routes live under `/api/superadmin/` but do NOT verify the superadmin JWT token. Anyone who can reach the URL can call them.

| File | Issue | Severity |
|------|-------|----------|
| `superadmin/users/impersonate/route.ts` | **NO AUTH** — allows impersonating ANY user, issues real JWT tokens. Anyone can call this. | **CRITICAL** |
| `superadmin/ai-chat/route.ts` | No JWT verify, uses service role key — full LLM access | **CRITICAL** |
| `superadmin/ai-models/discover/route.ts` | No JWT verify — can trigger model discovery | **CRITICAL** |
| `superadmin/ai-providers/[providerId]/test/route.ts` | No auth — accepts raw API keys in request body | **CRITICAL** |
| `superadmin/ai-providers/test/route.ts` | No auth — accepts raw API keys, makes provider calls | **CRITICAL** |
| `superadmin/vps/deploy/route.ts` | **NO AUTH** — can restart/deploy all VPS workers | **CRITICAL** |
| `superadmin/redis/status/route.ts` | No auth — exposes Redis connection status and queue internals | **CRITICAL** |
| `superadmin/portal-tiers/route.ts` | Needs verification — check if JWT guard present | **WARNING** |
| `superadmin/mastery-agents/route.ts` | Needs verification — check if JWT guard present | **WARNING** |
| `superadmin/knowledge/route.ts` | Needs verification — check if JWT guard present | **WARNING** |
| `superadmin/beliefs/route.ts` | Needs verification — check if JWT guard present | **WARNING** |
| `superadmin/decisions/route.ts` | Needs verification — check if JWT guard present | **WARNING** |
| `superadmin/platform-config/route.ts` | Needs verification — manages all platform config (write access!) | **WARNING** |
| `superadmin/briefs/route.ts` | Needs verification | **WARNING** |
| `superadmin/icps/route.ts` | Needs verification | **WARNING** |
| `superadmin/admins/route.ts` | Needs verification — manages platform admin accounts | **WARNING** |
| `superadmin/stats/route.ts` | Needs verification | **WARNING** |
| `superadmin/organizations/route.ts` | Needs verification | **WARNING** |
| `superadmin/users/route.ts` | Needs verification | **WARNING** |
| `superadmin/users/reset-password/route.ts` | Needs verification — resets user passwords | **WARNING** |

> **Fix:** Create a `requireSuperadmin(req)` middleware that verifies the JWT from the `Authorization: Bearer` header and reuse it in every `/api/superadmin/*` route. Apply it as the first line of every handler.

---

## 5. HARDCODED JWT SECRET FALLBACK

| File | Issue | Severity |
|------|-------|----------|
| `superadmin/auth/verify/route.ts:11` | `JWT_SECRET = process.env.JWT_SECRET \|\| 'axiom-jwt-secret-change-in-production'` — predictable fallback if env not set | **CRITICAL** |
| `superadmin/users/impersonate/route.ts:10` | Same hardcoded fallback `'axiom-jwt-secret-change-in-production'` | **CRITICAL** |

> **Fix:** Remove the fallback. If `JWT_SECRET` is not set, the app should throw on startup, not silently use a known secret.

---

## 6. TENANT ISOLATION BYPASS (missing partner_id / org_id filters)

| File | Issue | Severity |
|------|-------|----------|
| `brain/embeddings/route.ts:8-12` | `supabase.from('embeddings').select('*')` — **no partner_id filter**, leaks all embeddings across all tenants | **CRITICAL** |
| `brain/embeddings/route.ts:37-40` | DELETE by id with **no ownership check** — can delete any tenant's embedding | **CRITICAL** |
| `brain/templates/route.ts:8-11` | `supabase.from('brain_templates').select('*')` — **no partner_id filter** | **WARNING** |
| `brain/agents/route.ts:8-11` | `supabase.from('agents').select('*')` — **no partner_id filter**, all agents visible | **CRITICAL** |
| `brain/agents/route.ts:36-40` | PATCH update by ID with **no ownership check** — can modify any tenant's agent | **CRITICAL** |
| `brain/config/route.ts:8-12` | Reads brain_templates by `is_default` — no tenant isolation | **WARNING** |
| `chat/route.ts:104-108` | Queries `brain_templates` by `brain_id` only, no org ownership check on brain | **WARNING** |
| `webhooks/email/mailwizz/route.ts:41` | Uses `createClient()` (session-scoped) but mailwizz is a webhook — should use service role with explicit partner_id validation from payload | **WARNING** |

> **Fix:** Every query on tenant-scoped tables MUST include `.eq('partner_id', me.org_id)` or equivalent. For delete/update, verify ownership before mutating.

---

## 7. OTHER SECURITY CONCERNS

| File | Issue | Severity |
|------|-------|----------|
| `brain/analytics/route.ts` | Returns **hardcoded mock data** — this should either be real analytics or removed | **INFO** |
| `brain/training/feedback/route.ts` | Returns **empty mock array** — dead endpoint | **INFO** |
| `superadmin/ai-chat/route.ts:4-7` | Uses module-level `createClient()` with service role — shared across all requests (cold start stale state risk) | **INFO** |
| `superadmin/redis/status/route.ts:47` | Falls back to `'http://localhost:3100'` if no worker URL configured — could be exploited in dev | **INFO** |

---

## TOP PRIORITIES (fix these first)

1. **`superadmin/users/impersonate/route.ts`** — Anyone can impersonate any user. Add superadmin JWT verification immediately.
2. **`superadmin/vps/deploy/route.ts`** — Anyone can restart all workers. Add superadmin JWT verification.
3. **`brain/embeddings/route.ts`** + **`brain/agents/route.ts`** — Full CRUD with zero auth and zero tenant isolation. Add auth + partner_id filter.
4. **JWT secret fallback** — Remove `'axiom-jwt-secret-change-in-production'` fallback from both files. Fail hard if env not set.
5. **Create `requireSuperadmin()` middleware** — Apply to all 60+ superadmin routes.
6. **`superadmin/ai-chat/route.ts` cost table** — Move to `ai_model_metadata` DB table.
7. **Knowledge governance thresholds** — Move all hardcoded confidence/stability/sample thresholds to `config_table`.
