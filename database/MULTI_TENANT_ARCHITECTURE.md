# 🏢 MULTI-TENANT SAAS ARCHITECTURE

## Overview

Axiom Engine is architected for **multi-tenancy** from day 1, supporting:
- ✅ Multiple organizations (clients/companies)
- ✅ Team collaboration within orgs
- ✅ Subscription plans & licensing
- ✅ Row-Level Security (RLS) for data isolation
- ✅ Usage quotas & limits

---

## Data Model

```
Organizations (Tenants)
    ├── Users (Team Members)
    ├── Knowledge Bases
    ├── Runs
    ├── Generated Content
    ├── Analytics Events
    └── Learning History
```

**Every piece of data is scoped to an organization.**

---

## Subscription Plans

### **Free Tier**
- 1 Knowledge Base
- 10 runs/month
- 3 team members
- Community support

### **Starter ($99/month)**
- 3 Knowledge Bases
- 100 runs/month
- 10 team members
- Email support

### **Pro ($299/month)**
- 10 Knowledge Bases
- 500 runs/month
- 25 team members
- Priority support
- Advanced analytics

### **Enterprise (Custom)**
- Unlimited KBs
- Unlimited runs
- Unlimited team members
- Dedicated support
- Custom SLA
- On-premise option

---

## User Roles & Permissions

### **Owner**
- Full control
- Billing & subscription management
- Can delete organization
- Can manage all team members

### **Admin**
- Upload/edit Knowledge Bases
- Trigger runs (manual/scheduled)
- View all analytics
- Manage team members (except owner)

### **Member**
- Upload KB (if granted)
- Trigger runs (if granted)
- View analytics
- Cannot manage team

### **Viewer**
- View analytics only
- Read-only access
- No modifications

---

## Row-Level Security

**Every query is automatically scoped to the user's organization.**

Example:
```sql
-- User tries to query all KBs
SELECT * FROM knowledge_bases;

-- RLS policy automatically adds:
WHERE org_id IN (
  SELECT org_id FROM users WHERE id = auth.uid()
);
```

**Result:** Users only see their org's data. No cross-tenant data leaks!

---

## Quota Enforcement

Enforced at **backend layer** before allowing operations:

```typescript
// Before uploading KB
const org = await getOrganization(user.org_id);
if (org.current_kbs_count >= org.max_kbs) {
  throw new Error('KB quota exceeded. Upgrade plan.');
}

// Before triggering run
if (org.runs_this_month >= org.max_runs_per_month) {
  throw new Error('Monthly run limit reached. Upgrade or wait for reset.');
}
```

---

## Team Management

### **Inviting Users**
1. Admin sends invite (email)
2. User signs up with Supabase Auth
3. User auto-assigned to inviting org
4. Role & permissions set by admin

### **Removing Users**
- Owner/Admin can deactivate users
- User data (runs, etc.) remains for audit
- User can no longer access org

---

## Billing Integration

### **Stripe Integration**
```typescript
// After successful payment
await updateOrganization(org_id, {
  plan: 'pro',
  stripe_customer_id: customer.id,
  stripe_subscription_id: subscription.id,
  max_kbs: 10,
  max_runs_per_month: 500,
  max_team_members: 25
});
```

### **Usage Tracking**
- KB uploads increment `current_kbs_count`
- Runs increment `runs_this_month`
- Monthly cron resets `runs_this_month` on 1st of month

---

## Security Best Practices

### **✅ DO:**
- Use Supabase Auth for all authentication
- Always query via org-scoped endpoints
- Validate quotas before operations
- Log all admin actions for audit

### **❌ DON'T:**
- Bypass RLS with service role (except for system ops)
- Hard-code org_ids in frontend
- Trust client-side quota checks
- Share credentials across orgs

---

## Migration Path

### **Phase 1: Run Initial Migrations**
```bash
npm run migrate:up
```

This creates:
1. Base tables (knowledge_bases, runs, etc.)
2. Organizations & users tables
3. RLS policies
4. Helper functions

### **Phase 2: Enable Supabase Auth**
1. Enable Email/Password in Supabase Dashboard
2. Configure email templates
3. Set up OAuth (Google, GitHub, etc.) if needed

### **Phase 3: Seed First Organization**
```sql
-- Create demo org
INSERT INTO organizations (name, slug, plan, status)
VALUES ('Demo Company', 'demo', 'pro', 'active')
RETURNING id;

-- Create owner user
INSERT INTO users (id, org_id, email, full_name, role, can_upload_kb, can_trigger_runs, can_manage_team)
VALUES (
  'your-supabase-auth-user-id',
  'org-id-from-above',
  'you@example.com',
  'Your Name',
  'owner',
  true,
  true,
  true
);
```

---

## Frontend Implementation

### **Authentication Flow**
```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@company.com',
  password: 'secure-password',
  options: {
    data: {
      full_name: 'John Doe',
      org_name: 'Acme Corp', // Creates new org
    }
  }
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@company.com',
  password: 'secure-password',
});

// Get current user + org
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from('users')
  .select('*, organizations(*)')
  .eq('id', user.id)
  .single();
```

### **Org-Scoped Queries**
```typescript
// No need to specify org_id - RLS handles it!
const { data: kbs } = await supabase
  .from('knowledge_bases')
  .select('*');

// User only sees their org's KBs automatically
```

---

## License Validation

### **Backend Middleware**
```typescript
async function requirePlan(minPlan: 'starter' | 'pro' | 'enterprise') {
  const org = await getOrganization(req.user.org_id);
  
  const planHierarchy = { free: 0, starter: 1, pro: 2, enterprise: 3 };
  if (planHierarchy[org.plan] < planHierarchy[minPlan]) {
    throw new Error(`Requires ${minPlan} plan or higher`);
  }
}

// Usage
app.post('/api/runs/manual', requirePlan('pro'), async (req, res) => {
  // Only Pro+ plans can manually trigger runs
});
```

---

**Ready for SaaS!** This architecture supports:
- 🏢 Unlimited tenants
- 👥 Team collaboration
- 💳 Subscription billing
- 📊 Usage-based pricing
- 🔒 Enterprise-grade security

Next: Set up Stripe webhooks for automated plan management!
