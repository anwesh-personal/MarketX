# Superadmin vs User — Flow (as implemented)

Based on the current codebase. Two **separate** entry points and auth systems.

---

## 0. What the project is (simple) — and are the pieces actually tied?

**In one line:** Axiom is the app layer of **MarketX** — a multi-tenant GTM platform where **orgs** get a “brain” (agents, RAG, learning), **knowledge bases**, **writer**, and **analytics**, while **superadmin** manages those orgs, licenses, AI providers, engines, and platform config.

**Are they tied together?**

- **Yes, for the part that’s built.**  
  - Same **Supabase** DB.  
  - **User** logs in (Supabase Auth) → `users.org_id` → dashboard/KB/brain APIs all use that **org** (runs, knowledge_bases, agents, embeddings, etc.).  
  - **Superadmin** manages the same **organizations**, **users**, **license_transactions**, **engine_instances**, **ai_providers**, etc. So: one data model, two UIs — ops (superadmin) vs tenant (user app).

- **But the “whole thing” in the vision is bigger.**  
  - Vision = three engines (Market Builder, Market Writer, Market Surface), belief promotion ladder (HYP→GW), signal, ICP, briefs, satellites.  
  - In the app today: you have **org + user + brain + KB + writer + analytics + superadmin**. The full belief/signal/ICP/satellite machinery is in **plans and schema** (e.g. RS:OS, `belief` table); not every piece of that is yet wired end‑to‑end in the UI.

**So:** For “platform ops + tenant product,” the pieces **are** tied: same DB, same org, user flow uses org_id everywhere it needs to, superadmin manages that data. For the **full** MarketX product vision, it’s partially built — the foundation and ops are connected; the rest is in progress.

---

## 1. Superadmin flow

### Entry and routing

| URL | What happens |
|-----|----------------|
| `/` | Root redirects to **`/login`** (user login), not superadmin. |
| `/superadmin` | **Redirects to `/superadmin/login`** (no layout, no sidebar). |
| `/superadmin/login` | Login form only; no sidebar. After success → **`/superadmin/dashboard`**. |
| Any other `/superadmin/*` | Wrapped by **superadmin layout** (sidebar + nav). If not logged in or session invalid → redirect to `/superadmin/login`. |

So: **superadmin always starts at `/superadmin` or `/superadmin/login`**, and after login lands on the dashboard.

### Auth (superadmin)

- **Storage:** Session in **localStorage** under key `superadmin_session` (from `superadmin-auth.ts`).
- **Identity:** **`platform_admins`** table (email + `password_hash`). Not Supabase Auth.
- **Login:**  
  - User submits email/password on `/superadmin/login`.  
  - **POST `/api/superadmin/auth/login`** → looks up `platform_admins` by email, compares password with bcrypt, returns a **JWT** (signed with `JWT_SECRET`, 7d expiry, payload: `adminId`, `email`, `type: 'superadmin'`).  
  - Frontend stores `{ adminId, email, token, expiresAt }` in localStorage and redirects to `/superadmin/dashboard`.
- **Every protected page:**  
  - Layout (or page) runs: `isAuthenticated()` (session + token not expired) → then **`validateSession()`** = **POST `/api/superadmin/auth/verify`** with `Authorization: Bearer <token>`.  
  - If 401 or invalid → clear session and redirect to `/superadmin/login`.  
  - If valid → render page; API calls use **`Authorization: Bearer <token>`**.
- **APIs:** All under **`/api/superadmin/*`**. Each route uses **`requireSuperadmin(request)`** (from `superadmin-middleware.ts`): reads Bearer token, verifies JWT with `JWT_SECRET`, checks `type === 'superadmin'`. No Supabase Auth for superadmin.

So: **superadmin = platform_admins + JWT in localStorage + verify on each load + Bearer on every superadmin API.**

### Layout and nav (after login)

- **Layout:** `apps/frontend/src/app/superadmin/layout.tsx`.  
  - Renders **sidebar + top bar** (logo, theme selector, user pill, logout).  
  - **Login page is excluded** from this layout (renders only the login form).  
  - All other `/superadmin/*` routes get this layout and the nav below.
- **Nav items (sidebar):**
  - **Platform:** Dashboard, Organizations, Users  
  - **Engines:** Workflow Manager, Engine Instances  
  - **AI & Models:** AI Providers, AI Models, Brain Management  
  - **System:** Background Jobs (Redis), Workers, Licenses, Analytics, Settings  

Additional superadmin pages that exist but are **not** in the sidebar (reachable by direct URL or from other pages): e.g. prompt-library, tool-registry, mastery-agents, belief-dashboard, icp-manager, briefs, ai-playground, ai-validation, engines/[id], organizations/[id].

### Data and APIs

- **Data source:** Supabase (same DB as the rest of the app). Env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Typical pattern:** Page uses **`useSuperadminAuth()`** → **`fetchWithAuth('/api/superadmin/...')`** (adds Bearer token). API uses **`requireSuperadmin(request)`** then Supabase client (service role) to read/write.
- **Examples:**
  - Dashboard: **GET `/api/superadmin/stats`** (organizations, users, kbs, runs, MRR).
  - Analytics: **GET `/api/superadmin/analytics`**, **GET `/api/superadmin/analytics/metrics`**.
  - Licenses: **GET `/api/superadmin/licenses/transactions`**, **GET `/api/superadmin/licenses/stats`**.
  - Organizations: **GET/POST `/api/superadmin/organizations`**, **GET/PATCH `/api/superadmin/organizations/[id]`**.
  - Engines: **GET `/api/superadmin/engines`**, **GET/PATCH `/api/superadmin/engines/[id]`**, etc.

So: **superadmin flow = login (platform_admins + JWT) → layout + nav → pages that call `/api/superadmin/*` with Bearer token; backend validates JWT and talks to Supabase.**

---

## 2. User (main app) flow

### Entry and routing

| URL | What happens |
|-----|----------------|
| `/` | Redirects to **`/login`** (user login). |
| `/login` | **Supabase Auth** sign-in form. On success → **`/dashboard`**. |
| `/dashboard`, `/writer`, `/brain-control`, `/brain-chat`, `/kb-manager`, `/analytics`, `/learning`, `/settings` | Under **`(main)`** layout. If **no Supabase user** → redirect to **`/login`**. |

So: **user flow starts at `/` → `/login`**, then into the main app (dashboard, writer, brain, KB, etc.).

### Auth (user)

- **Identity:** **Supabase Auth** (email/password, OAuth, etc.). User record lives in Supabase Auth; app may also have a **`users`** table (e.g. `org_id`, `role`) linked to Auth.
- **Session:** Managed by **Supabase client** (cookies/session). No JWT in localStorage for the main app.
- **Check:** In **`(main)/layout.tsx`**, on load: **`supabase.auth.getUser()`**. If no user → **`router.push('/login')`**. If user → set email and render children (sidebar + page).
- **Logout:** **`supabase.auth.signOut()`** then redirect to `/login`.
- **APIs used by main app:** Typically **not** under `/api/superadmin/`. They use Supabase (client or server with user’s token/RLS) or other API routes that rely on Supabase Auth/session. Superadmin APIs are **not** used for normal user actions.

So: **user = Supabase Auth session; layout guards (main) routes; no superadmin JWT.**

### Layout and nav (after login)

- **Layout:** `apps/frontend/src/app/(main)/layout.tsx`.  
  - Sidebar + top bar (logo, theme, user, logout).  
  - **Nav items:** Dashboard, Writer Studio, Brain Control, Brain Chat, Knowledge Base, Analytics, Learning Loop, Settings.
- **Routes (examples):**
  - **Dashboard** (`/dashboard`) — org stats, recent runs, quotas (from Supabase / your backend).
  - **Writer Studio** (`/writer`, `/writer/new`) — content/writing flows.
  - **Brain Control** (`/brain-control`) — brain/agent configuration for the org/user.
  - **Brain Chat** (`/brain-chat`) — chat UI (e.g. RAG, agents).
  - **Knowledge Base** (`/kb-manager`) — KB management.
  - **Analytics** (`/analytics`) — org/user analytics.
  - **Settings** (`/settings`) — user/org settings.

So: **user flow = login (Supabase) → (main) layout + nav → dashboard and product pages; data from Supabase (and non-superadmin APIs).**

---

## 3. Side-by-side summary

| Aspect | Superadmin | User (main app) |
|--------|------------|------------------|
| **Entry** | `/superadmin` → `/superadmin/login` | `/` → `/login` |
| **Auth** | `platform_admins` + JWT in localStorage | Supabase Auth (session) |
| **Session check** | `validateSession()` → POST `/api/superadmin/auth/verify` | `supabase.auth.getUser()` |
| **Layout** | `superadmin/layout.tsx` (sidebar: Dashboard, Orgs, Users, Engines, AI, System) | `(main)/layout.tsx` (sidebar: Dashboard, Writer, Brain, KB, Analytics, Settings) |
| **APIs** | `/api/superadmin/*` + Bearer JWT; `requireSuperadmin(request)` | Supabase + non-superadmin APIs; no superadmin JWT |
| **DB / backend** | Same Supabase (service role for superadmin APIs) | Same Supabase (user context / RLS for user data) |
| **Default after login** | `/superadmin/dashboard` | `/dashboard` |

---

## 4. Important details

- **Two separate auth systems:** Superadmin never uses Supabase Auth for its own login; user never uses `platform_admins` or the superadmin JWT for app access.
- **Impersonation:** Superadmin can “impersonate” a user (e.g. **POST `/api/superadmin/users/impersonate`**); that is a superadmin-only action and returns a token/session the superadmin uses to act as that user (implementation may vary).
- **Theme:** Both flows share the same theme system (ThemeProvider, theme selector, CSS variables). Same app, different route trees and auth.

This is the flow of superadmin and user **based on what we have** in the repo.
