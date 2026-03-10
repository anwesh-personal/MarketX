# AXIOM - Architecture & Implementation Plan

## 🎯 Core Philosophy
**"Writer executes. Analytics observes. KB learns."**

---

## 📊 **Database Schema (Already Built)**
Based on `/complete-setup.sql`:

### **Organizations & Users**
- `organizations` - Multi-tenant orgs
- `users` - Org members with roles
- `team_invitations` - Invite system

### **Writer Engine (Core)**
- `runs` - Content generation executions
  - Stores prompts, outputs, AI model used
  - Status tracking (pending, running, completed, failed)
  - Token usage, costs
  
- `jobs` - Queued tasks for workers
  - Run execution, KB processing, analytics
  - Priority management

### **Knowledge Base System**
- `knowledge_bases` - Document collections per org
  - Upload files (PDF, DOC, TXT)
  - Embeddings for RAG
  - Version tracking

- `learning_rules` - Auto-extracted patterns
  - From successful runs
  - From analytics events
  - Applied to future runs

### **Analytics System**
- `analytics_events` - User behavior tracking
  - Event types, metadata
  - Conversion tracking
  
- `platform_usage_stats` - Aggregated metrics
  - Daily/monthly rollups

### **Workers**
- `workers` - Background job processors
  - Heartbeat monitoring
  - Type: writer, learning, analytics

---

## 🏗️ **Application Architecture**

### **Main App Pages** (Build These)

#### 1. **Dashboard** (`/dashboard`)
- **Purpose:** Mission control for content operations
- **Features:**
  - Quick stats (runs today, KB size, recent conversions)
  - Manual run trigger
  - Recent runs list
  - Quick actions (New Run, Upload KB, View Analytics)
  
#### 2. **Writer Studio** (`/writer`)
- **Purpose:** Create and manage content generation runs
- **Features:**
  - New run form (prompt, AI model selector, KB selector)
  - Run history with filtering
  - Output viewer
  - Cost tracking
  - Re-run with variations
  
#### 3. **Knowledge Base Manager** (`/kb-manager`)
- **Purpose:** Upload and manage learning documents
- **Features:**
  - File upload (drag-drop)
  - Document list with status
  - Embedding progress
  - Version management
  - Delete/archive
  
#### 4. **Analytics Dashboard** (`/analytics`)
- **Purpose:** Track events and conversions
- **Features:**
  - Event timeline
  - Conversion funnel
  - Custom event filtering
  - Export capabilities
  
#### 5. **Learning Loop** (`/learning`)
- **Purpose:** View and manage auto-extracted rules
- **Features:**
  - Extracted rules list
  - Approve/reject rules
  - Manual rule creation
  - Rule effectiveness metrics
  
#### 6. **Settings** (`/settings`)
- **Purpose:** Org configuration
- **Features:**
  - API keys management
  - Team members
  - Billing (if applicable)
  - Preferences

---

## 🎨 **Design System**
- **Use same theme system as Superadmin**
- **All theme variables**
- **Zero hardcoded colors**
- **Premium micro-interactions**
- **Responsive (mobile-first)**

---

## 🚀 **Implementation Priority**

### **Phase 1: Core Writer Flow** (DO THIS FIRST)
1. ✅ Writer Studio - New Run form
2. ✅ Writer Studio - Run History
3. ✅ Dashboard - Quick stats

### **Phase 2: Learning System**
4. ✅ KB Manager - File upload
5. ✅ KB Manager - Document list
6. ✅ Learning Loop - Rules viewer

### **Phase 3: Analytics**
7. ✅ Analytics Dashboard
8. ✅ Event tracking integration

### **Phase 4: Polish**
9. ✅ Settings page
10. ✅ Optimization & refinements

---

## 📁 **File Structure**

```
/app
  /dashboard -> Main landing
  /writer -> Writer Studio
  /kb-manager -> Knowledge Base
  /analytics -> Analytics Dashboard
  /learning -> Learning Loop
  /settings -> Org Settings
  
/components
  /writer -> Run forms, output viewers
  /kb -> Upload, file lists
  /analytics -> Charts, event lists
  /learning -> Rule cards
  /shared -> Buttons, inputs, etc.
```

---

## 🔗 **API Routes** (Need to Build)

### Writer Engine
- `POST /api/runs` - Create new run
- `GET /api/runs` - List runs
- `GET /api/runs/[id]` - Get run details
- `POST /api/runs/[id]/rerun` - Re-execute

### Knowledge Base
- `POST /api/kb/upload` - Upload document
- `GET /api/kb` - List documents
- `DELETE /api/kb/[id]` - Delete doc
- `POST /api/kb/[id]/embed` - Trigger embedding

### Analytics
- `POST /api/analytics/events` - Track event
- `GET /api/analytics/events` - List events
- `GET /api/analytics/stats` - Get aggregates

### Learning
- `GET /api/learning/rules` - List rules
- `POST /api/learning/rules` - Create rule
-`PATCH /api/learning/rules/[id]` - Approve/reject

---

## ✅ **Next Steps**

1. Build Writer Studio (complete flow)
2. Build KB Manager
3. Build Dashboard with real data
4. Build Analytics
5. Build Learning Loop
6. Build Settings

Let's GO! 🚀
