# Axiom Superadmin - Remaining Implementation

## Status: Phase 4 Partially Complete

### ✅ COMPLETED
- [x] Login page (`/superadmin/login`)
- [x] Dashboard layout with sidebar
- [x] Dashboard page (stats cards)
- [x] Organizations page (grid view, filters)
- [x] Users page (table, impersonation)
- [x] Database schema (all 14 tables)
- [x] Auth API route (`/api/superadmin/auth/login`)
- [x] Theme system (6 themes)

### 🚧 IN PROGRESS / TODO

#### **1. Complete API Routes** (Next.js API Routes - Lekhika pattern)

**Priority 1:**
```
/api/superadmin/
├── stats/route.ts              ← Platform stats
├── organizations/
│   ├── route.ts                ← List/create orgs
│   └── [id]/route.ts           ← Get/update/delete org
├── users/
│   ├── route.ts                ← List users
│   └── impersonate/route.ts    ← Start/end impersonation
└── ai-config/
    ├── route.ts                ← Get/update AI config
    └── test/route.ts           ← Test AI provider
```

**All using Supabase client (service role key), NO separate backend!**

---

#### **2. AI Management Tab** (Copy from Lekhika)

**Reference:** `lekhika_4_8lwy03/src/components/SuperAdmin/AIManagement.jsx`

**Features needed:**
- Multi-provider config (OpenAI, Gemini, Claude, Mistral)
- API key management (add/remove/test)
- Model selection dropdowns
- Test playground
- Save to Supabase `system_configs` table

**Database table needed:**
```sql
CREATE TABLE system_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample config:
{
  "key": "ai_providers",
  "value": {
    "openai": {
      "api_keys": ["sk-..."],
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "default_model": "gpt-4"
    },
    "gemini": { ... },
    "claude": { ... }
  }
}
```

---

#### **3. Worker Dashboard** (if needed now)

**Reference:** `lekhika_4_8lwy03/src/components/SuperAdmin/WorkerControlDashboard.jsx`

**Features:**
- List active workers (from `workers` table)
- Worker status (active/idle/dead)
- Heartbeat monitoring
- Job queue status

**(Can do this later - not critical for launch)**

---

#### **4. System Config Tab**

**Settings to manage:**
- Platform name
- Default quotas (Free, Starter, Pro, Enterprise)
- Email templates
- Feature flags

**Store in `system_configs` table with keys:**
- `platform_settings`
- `default_quotas`
- `email_templates`
- `feature_flags`

---

## Implementation Order

### **Immediate (Next 1-2 hours):**

1. **AI Management Tab** - Most critical
   - Copy Lekhika's `AIManagement.jsx`
   - Adapt to Axiom (remove book-specific stuff)
   - Create `/api/superadmin/ai-config/route.ts`
   - Add `system_configs` table migration

2. **Stats API Route**
   - `/api/superadmin/stats/route.ts`
   - Query Supabase for counts
   - Calculate MRR

3. **Organizations API Routes**
   - `/api/superadmin/organizations/route.ts` (GET/POST)
   - Create org with audit log

4. **Users API Routes**
   - `/api/superadmin/users/route.ts` (GET)
   - `/api/superadmin/users/impersonate/route.ts` (POST)

### **Later (After core works):**

5. Worker dashboard
6. System config UI
7. Audit log viewer
8. License transaction history

---

## Key Principles (DON'T FUCK UP AGAIN)

1. **NO separate Express backend** - Everything is Next.js API routes
2. **Follow Lekhika patterns** - Don't invent new shit
3. **Use Supabase client** - Service role key in API routes
4. **All on port 3000** - Single server
5. **Workers on VPS** - Separate concern (PM2 later)

---

## Next Action

**Build AI Management tab exactly like Lekhika:**
- File: `/apps/frontend/src/app/superadmin/ai-management/page.tsx`
- Copy logic from Lekhika's `AIManagement.jsx`
- Adapt for Axiom use case
