# Axiom (MarketX) — Deep Audit: Part 2
## Auth, Onboarding, Superadmin & Pages

---

## Auth System

### User Auth (Supabase)
- **Login:** `/login` → `supabase.auth.signInWithPassword()` → redirect to `/dashboard`
- **Root page** (`/`): Redirects to `/login` immediately
- **Session check:** Each `(main)/*` page calls `supabase.auth.getUser()` on mount — if no user, redirects to `/login`
- **Logout:** Calls `supabase.auth.signOut()` → redirects to `/login`
- **No sign-up page** — Login says "Don't have an account? Contact Admin" (correct for B2B)

> [!NOTE]
> Auth is clean. Supabase handles token rotation. No custom JWT logic for user auth.

### Superadmin Auth (Separate System)
- **Login:** `/superadmin/login` → POST `/api/superadmin/auth/login` → custom JWT
- **Session:** Stored via `saveSession()` in `lib/superadmin-auth.ts` (localStorage-based)
- **Token:** Custom JWT signed with `JWT_SECRET` env var

> [!WARNING]
> **`JWT_SECRET` is currently set to `axiom-jwt-secret-change-in-production`.**
> This is a placeholder. MUST be changed before go-live to a random 256-bit key.

---

## Onboarding Flow

**Route:** `POST /api/onboarding/complete`

### What happens on completion:
1. ✅ Authenticates user via Supabase
2. ✅ Looks up user's `org_id` from `users` table
3. ✅ Builds Knowledge Base from company data → inserts into `knowledge_bases`
4. ✅ Creates ICP records in `icp` table
5. ✅ Creates Offer record in `offer` table
6. ✅ Updates all `brain_agents` domain prompts with onboarding context
7. ✅ Creates constitution rules (voice/style) in `constitution_rules`
8. ✅ Builds initial brain memories in `brain_memories`
9. ✅ Marks `onboarding_completed = true` in `users` table
10. ✅ Generates sample email via AI provider (graceful fallback if no AI configured)

### Dashboard Integration:
- Dashboard checks `onboarding_completed` on load
- Shows modal if incomplete + progress bar
- "Continue Setup" button to resume
- Tracks `onboarding_sessions` for partial saves

> [!TIP]
> Onboarding is production-grade. Well-structured, graceful error handling, fallback email when AI isn't configured. No stubs.

---

## Superadmin Panel

**33 pages** under `/superadmin/`:

| Page | Purpose |
|------|---------|
| `agents` | Agent management |
| `ai-management` | AI model configuration |
| `ai-playground` | Test AI generation |
| `ai-providers` | Provider keys (OpenAI, Anthropic, Google) |
| `ai-validation` | AI output validation |
| `analytics` | Platform-wide analytics |
| `belief-dashboard` | Belief system viewer |
| `brains/`, `brains/[id]` | Brain instance management |
| `briefs` | Brief templates |
| `dashboard` | Admin overview |
| `email-providers` | MailWizz/SES/Mailgun config |
| `engine-bundles` | Engine bundle manager |
| `engines/`, `engines/[id]` | Engine CRUD |
| `icp-manager` | ICP profile manager |
| `infrastructure` | VPS/server status |
| `licenses` | License management |
| `mastery-agents` | Mastery agent config |
| `organizations/`, `[id]` | Org management |
| `platform-config` | Global settings |
| `portal-tiers` | Tier configuration |
| `prompt-library` | Prompt templates |
| `redis` | Redis queue viewer |
| `settings` | Admin settings |
| `tool-registry` | Brain tool registry |
| `users` | User management |
| `workers` | Worker status dashboard |
| `workflow-manager` | Workflow CRUD |

> [!IMPORTANT]
> This is a massive admin panel — 33 pages. It covers every aspect of the platform.
> The scope suggests this is designed for multi-tenant SaaS operation, not just internal use.

---

## Main App Pages

| Page | What it does | Status |
|------|-------------|--------|
| `/dashboard` | Welcome, stats, onboarding check, recent runs | ✅ Solid |
| `/portal` | Partner portal view | Need to verify |
| `/writer` | AI content studio (run history) | ✅ Lists runs from DB |
| `/writer/new` | Create new AI content run | ✅ Full form |
| `/kb-manager` | Knowledge base CRUD | ✅ Full CRUD |
| `/brain-chat` | Chat with Brain AI | ✅ Full chat UI |
| `/brain-control` | Brain config, agents, embeddings | ✅ Complex, feature-rich |
| `/learning` | Learning loop viewer | Need to verify |
| `/analytics` | Campaign analytics | Need to verify |
| `/settings` | User preferences | ✅ Basic settings |
| `/mastery-agents` | Mastery agent management | Need to verify |
| `/marketx-os` | OS-level dashboard | Need to verify |
| `/system-map` | Interactive architecture map | ✅ Documentation page |

---

## Issues Found in Auth/Pages

### 1. No Password Reset Flow
- Login page has no "Forgot Password?" link
- Supabase supports `resetPasswordForEmail()` but it's not implemented
- **Severity:** Medium — users will be locked out if they forget password

### 2. JWT Secret is Placeholder
- `JWT_SECRET=axiom-jwt-secret-change-in-production`
- Used for superadmin auth tokens
- **Severity:** HIGH — security vulnerability in production

### 3. VPS_HOST Points to Wrong Server
- `.env.local` has `VPS_HOST=103.190.93.28` (Lekhika VPS)
- Should point to RackNerd VPS (`107.172.56.66`) when workers move there
- **Severity:** Medium — infrastructure page will show wrong data

### 4. No OPENAI_API_KEY in .env.local
- AI features (Brain Chat, Writer, onboarding email generation) require an AI provider key
- Without it, all AI features fall through to fallback/error states
- **Severity:** HIGH — core functionality is non-functional

### 5. No REDIS_URL in .env.local
- Workers and job dispatch won't function
- Any engine execution, KB processing, dream state cycles → queued to nowhere
- **Severity:** HIGH — background processing is dead
