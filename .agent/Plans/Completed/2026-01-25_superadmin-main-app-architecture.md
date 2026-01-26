# 🏗️ Superadmin + Main App Architecture Plan

**Status:** Active  
**Created:** 2026-01-15  
**Priority:** High

---

## 📋 Objective

Build a two-tier application structure:
1. **Superadmin** (`/superadmin`) - Platform control for you + 2-3 others
2. **Main App** (`/`) - Customer-facing Market Writer tool

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│            PLATFORM TIER (Superadmin)                  │
│  Route: /superadmin/*                                  │
│  Access: platform_admins table (3-4 people)           │
│  Auth: Separate login (/superadmin/login)             │
│                                                        │
│  Features:                                             │
│  ├─ License Management (sell, gift, assign plans)    │
│  ├─ Organization Management (create, view all)        │
│  ├─ User Management (view all, login as user)        │
│  ├─ Worker Orchestration (deploy, clone, monitor)     │
│  ├─ System Health (uptime, performance, errors)       │
│  ├─ Platform Analytics (MRR, churn, usage)           │
│  ├─ Billing Integration (Stripe dashboard)            │
│  └─ API Management (REST API keys, rate limits)       │
└────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────┐
│            CUSTOMER TIER (Main App)                    │
│  Route: /*                                             │
│  Access: users table (all customers, RLS applied)     │
│  Auth: Standard login (/login)                         │
│                                                        │
│  Features:                                             │
│  ├─ Onboarding (create organization)                  │
│  ├─ Knowledge Base Manager                            │
│  ├─ Market Writer Dashboard                           │
│  ├─ Run History & Analytics                           │
│  ├─ Team Management (add/remove team members)         │
│  ├─ Settings (org preferences, theme, etc.)          │
│  └─ Billing (view plan, usage, upgrade)              │
└────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication & Authorization

### **1. Superadmin Auth**

**Login Flow:**
```
/superadmin/login 
  ↓
Separate credentials (from platform_admins table)
  ↓
Set session: localStorage.setItem('superadmin_session', ...)
  ↓
Redirect to /superadmin/dashboard
```

**Middleware:**
```typescript
// middleware.ts
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/superadmin')) {
    const session = req.cookies.get('superadmin_session');
    
    if (!session) {
      return NextResponse.redirect(new URL('/superadmin/login', req.url));
    }
    
    // Verify session with database
    const isValid = await verifySuperadminSession(session.value);
    if (!isValid) {
      return NextResponse.redirect(new URL('/superadmin/login', req.url));
    }
  }
}
```

---

### **2. Customer Auth (Supabase)**

**Login Flow:**
```
/login
  ↓
Supabase Auth (email/password, OAuth)
  ↓
Check if user has organization
  ├─ NO → Redirect to /onboarding
  └─ YES → Redirect to /dashboard
```

**RLS Applied:**
- All queries automatically scoped to user's org
- Users can't see other organizations
- Database enforces isolation

---

### **3. "Login as User" (Impersonation)**

**From Superadmin Dashboard:**
```typescript
// UserManagement.tsx
const loginAsUser = async (userId: string) => {
  // Create impersonation session
  const { data, error } = await supabase.rpc('impersonate_user', {
    target_user_id: userId,
    admin_id: superAdminUser.id
  });
  
  if (error) {
    toast.error('Failed to impersonate user');
    return;
  }
  
  // Store impersonation flag
  localStorage.setItem('impersonation_mode', 'true');
  localStorage.setItem('impersonation_admin_id', superAdminUser.id);
  
  // Open main app in new tab as that user
  window.open('/', '_blank');
};
```

**Impersonation Banner (in Main App):**
```tsx
// Show banner if in impersonation mode
{impersonationMode && (
  <div className="bg-warning text-white p-sm text-center">
    ⚠️ Impersonating: {user.email} | 
    <button onClick={exitImpersonation}>Exit</button>
  </div>
)}
```

---

## 📄 Routing Structure

### **Superadmin Routes**

```
/superadmin
  ├─ /login                    # Superadmin login
  ├─ /dashboard                # Overview (stats, charts)
  ├─ /organizations            # All orgs list, create new
  │   └─ /[id]                 # Org details, edit, delete
  ├─ /users                    # All users across orgs
  │   └─ /[id]                 # User details, login as user
  ├─ /licenses                 # Sell/gift licenses
  │   ├─ /create               # Create new license/org
  │   ├─ /assign               # Assign plan to org
  │   └─ /history              # License transaction history
  ├─ /workers                  # Worker orchestration
  │   ├─ /deploy               # Deploy new worker
  │   ├─ /clone                # Clone existing worker
  │   └─ /monitor              # Worker health dashboard
  ├─ /system                   # System health & logs
  ├─ /analytics                # Platform-wide usage stats
  ├─ /billing                  # Stripe integration, payments
  └─ /api-management           # REST API keys, rate limits
```

---

### **Main App Routes**

```
/
  ├─ /                        # Public landing page
  ├─ /login                   # Customer login
  ├─ /signup                  # Customer signup
  ├─ /onboarding              # First-time setup (create org)
  ├─ /dashboard               # Main dashboard (after login)
  ├─ /knowledge-base          # KB manager
  │   ├─ /upload              # Upload KB JSON
  │   ├─ /edit/[id]           # Edit KB
  │   └─ /history             # KB versions
  ├─ /writer                  # Market Writer
  │   ├─ /run                 # Trigger run
  │   ├─ /history             # Run history
  │   └─ /output/[id]         # View generated content
  ├─ /analytics               # Analytics dashboard
  ├─ /team                    # Team management
  │   ├─ /members             # List team members
  │   ├─ /invite              # Invite new member
  │   └─ /roles               # Manage roles/permissions
  ├─ /settings                # Org settings
  │   ├─ /profile             # Org profile
  │   ├─ /billing             # View plan, usage
  │   └─ /preferences         # Theme, notifications
  └─ /billing                 # Billing portal
      ├─ /upgrade             # Upgrade plan
      └─ /payment             # Payment methods
```

---

## 🎯 Key Features

### **1. License Management (Superadmin)**

**Create License/Organization:**
```tsx
// /superadmin/licenses/create

<form onSubmit={createOrganization}>
  <input name="org_name" placeholder="Organization Name" />
  <input name="slug" placeholder="URL slug" />
  
  <select name="plan">
    <option value="free">Free (Gift)</option>
    <option value="starter">Starter ($99/mo)</option>
    <option value="pro">Pro ($299/mo)</option>
    <option value="enterprise">Enterprise (Custom)</option>
  </select>
  
  <input name="owner_email" placeholder="Owner Email" />
  <input name="owner_name" placeholder="Owner Name" />
  
  {/* Custom Quotas */}
  <input name="max_kbs" type="number" placeholder="Max KBs" />
  <input name="max_runs_per_month" type="number" />
  <input name="max_team_members" type="number" />
  
  <button type="submit">Create Organization</button>
</form>
```

**Backend API Endpoint:**
```typescript
// apps/backend/src/routes/superadmin.ts

router.post('/organizations/create', verifySuperadmin, async (req, res) => {
  const { org_name, slug, plan, owner_email, owner_name, quotas } = req.body;
  
  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: org_name,
      slug,
      plan,
      status: 'active',
      max_kbs: quotas.max_kbs,
      max_runs_per_month: quotas.max_runs_per_month,
      max_team_members: quotas.max_team_members
    })
    .select()
    .single();
  
  if (orgError) {
    return res.status(500).json({ error: orgError.message });
  }
  
  // Create owner user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: owner_email,
    password: generateTempPassword(),
    email_confirm: true
  });
  
  if (authError) {
    return res.status(500).json({ error: authError.message });
  }
  
  // Add user to organization
  await supabase.from('users').insert({
    id: authUser.id,
    org_id: org.id,
    email: owner_email,
    full_name: owner_name,
    role: 'owner',
    can_upload_kb: true,
    can_trigger_runs: true,
    can_manage_team: true
  });
  
  // Send welcome email with temporary password
  await sendWelcomeEmail(owner_email, org_name, tempPassword);
  
  res.json({ success: true, org, user: authUser });
});
```

---

### **2. User Management with Impersonation**

**User List (Superadmin):**
```tsx
// /superadmin/users

<table>
  <thead>
    <tr>
      <th>User</th>
      <th>Organization</th>
      <th>Role</th>
      <th>Plan</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {users.map(user => (
      <tr key={user.id}>
        <td>{user.full_name} ({user.email})</td>
        <td>{user.organization.name}</td>
        <td>{user.role}</td>
        <td>{user.organization.plan}</td>
        <td>
          <button onClick={() => loginAsUser(user.id)}>
            Login as User
          </button>
          <button onClick={() => editUser(user)}>Edit</button>
          <button onClick={() => suspendUser(user.id)}>Suspend</button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

### **3. Onboarding Flow (First User Experience)**

**Route:** `/onboarding`

**Steps:**
```tsx
const OnboardingFlow = () => {
  const [step, setStep] = useState(1);
  
  return (
    <div>
      {step === 1 && <WelcomeStep />}
      {step === 2 && <CreateOrganization />}
      {step === 3 && <InviteTeam />}
      {step === 4 && <UploadFirstKB />}
      {step === 5 && <Complete />}
    </div>
  );
};
```

**Step 2: Create Organization**
```tsx
<form onSubmit={createOrg}>
  <input name="org_name" placeholder="Company Name" />
  <input name="slug" placeholder="yourcompany" />
  <select name="industry">
    <option>SaaS</option>
    <option>E-commerce</option>
    <option>Marketing Agency</option>
  </select>
  
  <button>Continue</button>
</form>
```

After completion → Redirect to `/dashboard`

---

### **4. Team Management (Agency License)**

**Route:** `/team`

**Invite Team Members:**
```tsx
<form onSubmit={inviteTeamMember}>
  <input name="email" placeholder="team@example.com" />
  <input name="full_name" placeholder="Full Name" />
  
  <select name="role">
    <option value="admin">Admin</option>
    <option value="member">Member</option>
    <option value="viewer">Viewer</option>
  </select>
  
  {/* Permissions */}
  <checkbox name="can_upload_kb">Can Upload KB</checkbox>
  <checkbox name="can_trigger_runs">Can Trigger Runs</checkbox>
  <checkbox name="can_view_analytics">Can View Analytics</checkbox>
  
  <button>Send Invite</button>
</form>
```

**Enforce Team Size Quota:**
```typescript
// Before inviting
const {  data: org } = await supabase
  .from('organizations')
  .select('current_team_size, max_team_members')
  .eq('id', userOrgId)
  .single();

if (org.current_team_size >= org.max_team_members) {
  toast.error('Team size limit reached. Upgrade plan to add more members.');
  return;
}
```

---

## 🔌 REST API Architecture

### **Why We Need It:**
- Licensing logic (not simple CRUD)
- Worker orchestration
- Stripe webhooks
- Rate limiting
- Custom business logic

### **API Structure:**

```
apps/backend/src/routes/
├── superadmin.ts          # Superadmin endpoints
│   ├── POST /organizations/create
│   ├── GET /organizations
│   ├── POST /users/impersonate
│   ├── POST /licenses/assign
│   └── GET /platform-stats
├── organizations.ts       # Org management (customer-facing)
│   ├── GET /my-organization
│   ├── PATCH /my-organization
│   └── GET /usage-stats
├── team.ts                # Team management
│   ├── POST /invite
│   ├── GET /members
│   ├── PATCH /members/:id
│   └── DELETE /members/:id
├── kb.ts                  # Knowledge Base
├── writer.ts              # Market Writer runs
├── analytics.ts           # Analytics
└── webhooks.ts            # Stripe webhooks
```

---

## 📦 Database Updates Needed

### **Add Impersonation Tracking:**

```sql
CREATE TABLE impersonation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES platform_admins(id),
  target_user_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  actions_taken JSONB, -- Track what admin did while impersonating
  ip_address VARCHAR(45)
);
```

### **Add License Transaction Log:**

```sql
CREATE TABLE license_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  admin_id UUID REFERENCES platform_admins(id),
  transaction_type VARCHAR(50), -- 'created', 'upgraded', 'downgraded', 'gifted', 'suspended'
  from_plan VARCHAR(50),
  to_plan VARCHAR(50),
  price_usd DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ Implementation Checklist

### **Phase 1: Superadmin Foundation**
- [ ] Create `/superadmin` route structure
- [ ] Build Superadmin login page
- [ ] Implement auth middleware
- [ ] Create Superadmin dashboard (overview)
- [ ] Add basic organization list

### **Phase 2: License Management**
- [ ] Build license creation form
- [ ] Implement org creation API
- [ ] Add plan assignment logic
- [ ] Create license transaction log
- [ ] Build org editing interface

### **Phase 3: User Management**
- [ ] List all users across orgs
- [ ] Implement "Login as User" (impersonation)
- [ ] Add impersonation logging
- [ ] Build user suspension feature
- [ ] Create user editing interface

### **Phase 4: Main App Flow**
- [ ] Build onboarding flow (4 steps)
- [ ] Create org creation for new users
- [ ] Implement team invitation system
- [ ] Add team member management
- [ ] Enforce team size quotas

### **Phase 5: REST API**
- [ ] Set up Express backend routes
- [ ] Implement superadmin endpoints
- [ ] Add team management endpoints
- [ ] Create license endpoints
- [ ] Add rate limiting

### **Phase 6: Integration**
- [ ] Connect Stripe for billing
- [ ] Add webhook handlers
- [ ] Implement usage tracking
- [ ] Build billing portal
- [ ] Add upgrade/downgrade flows

---

## 🎯 Success Criteria

- ✅ Superadmin can create organizations with custom quotas
- ✅ Superadmin can login as any user
- ✅ New users go through onboarding flow
- ✅ Organizations can invite team members
- ✅ Team size quotas are enforced
- ✅ RLS ensures org data isolation
- ✅ All actions are logged (audit trail)

---

**STATUS: AWAITING APPROVAL** ⏸️

_Review this plan. Tell me what to change or if I should proceed!_
