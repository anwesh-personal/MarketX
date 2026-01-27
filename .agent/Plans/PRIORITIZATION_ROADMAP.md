# Axiom Development Roadmap - Prioritized
**Date**: 2026-01-27  
**Based on**: Current system state, cost/benefit, and user goals

---

## 🚀 IMMEDIATE (This Week)

### Priority 1: Deploy Workers to Railway
**Plan**: `WORKER_DEPLOYMENT_PLAN.md`  
**Effort**: 45 minutes (user setup)  
**Impact**: 🔥🔥🔥 CRITICAL  
**Why First**:
- Gets workers into production
- Enables all Brain features (Dream State, Learning Loop, Fine-Tuning)
- Unblocks backend consolidation
- Only $5-10/month
- BLOCKED on user creating Railway account

**Action Required**:
```
1. User: Create Railway account (https://railway.app)
2. User: Add Hobby plan ($5/month)
3. User: Create Redis service
4. Agent: Deploy workers
5. Agent: Configure environment variables
```

**Dependencies**: None  
**Blocks**: Backend Consolidation, Worker Infrastructure Control

---

## 🏗️ FOUNDATIONAL (Next 2 Weeks)

### Priority 2: Backend → Workers Consolidation
**Plan**: `2026-01-27_backend-to-workers-consolidation.md`  
**Effort**: 12-16 hours  
**Impact**: 🔥🔥 HIGH  
**Why Second**:
- Eliminates 1 service (backend) entirely
- Saves $5-10/month ongoing
- Simplifies architecture (2 services instead of 3)
- All execution via BullMQ (cleaner)
- Sets stage for scalability

**Phases**:
1. Add workflow + engine execution queues (2 hrs)
2. Port execution services to workers (6 hrs)
3. Update frontend API routes (3 hrs)
4. Railway cron setup (1 hr)
5. Delete backend folder (30 min)
6. Testing (2-3 hrs)

**Dependencies**: Workers deployed to Railway  
**Blocks**: Nothing (but makes everything cleaner)

---

### Priority 3: Finish Superadmin Panel
**Plan**: `superadmin-remaining.md`  
**Effort**: 4-6 hours  
**Impact**: 🔥 MEDIUM  
**Why Third**:
- Polish existing features
- Make superadmin panel production-ready
- Complete user management
- Enable impersonation for debugging

**Tasks**:
- [ ] Stats API for dashboard (1 hr)
- [ ] Organization CRUD APIs (2 hrs)
- [ ] Impersonation workflow (2 hrs)
- [ ] Polish + testing (1 hr)

**Dependencies**: None  
**Blocks**: Nothing

---

## 🎛️ INFRASTRUCTURE (Month 1-2)

### Priority 4: Worker Infrastructure Control
**Plan**: `2026-01-27_worker-infrastructure-control.md`  
**Effort**: 8-10 hours  
**Impact**: 🟡 MEDIUM  
**Why Fourth**:
- Gives UI control over Railway vs VPS
- Enables cost optimization
- Future-proofs infrastructure choices
- Not urgent if Railway works well

**Components**:
- Database table (1 hr)
- Railway API client (3 hrs)
- Deployment abstraction (2 hrs)
- Superadmin UI (2 hrs)
- Testing (1-2 hrs)

**Dependencies**: Workers on Railway, Backend consolidated  
**Blocks**: Nothing

---

## 🧰 TECHNICAL DEBT (Month 2-3)

### Priority 5: Node Hydration
**Plan**: `NODE_HYDRATION_PLAN.md`  
**Effort**: 4-6 hours  
**Impact**: 🟡 MEDIUM  
**Why Fifth**:
- Standardizes node data structure
- Makes workflow execution more reliable
- Technical debt that will bite later
- Not urgent but important

**Tasks**:
- [ ] Create hydration utility (2 hrs)
- [ ] Update node types (1 hr)
- [ ] Migrate existing workflows (2 hrs)
- [ ] Testing (1 hr)

**Dependencies**: None  
**Blocks**: Node Redesign

---

### Priority 6: Phase 1 - Node Redesign
**Plan**: `PHASE_1_NODE_REDESIGN.md`  
**Effort**: 8-10 hours  
**Impact**: 🟡 MEDIUM  
**Why Sixth**:
- Improves node system architecture
- Makes adding new nodes easier
- Long-term maintainability
- Can be done incrementally

**Dependencies**: Node Hydration  
**Blocks**: Nothing

---

## 🎨 ENHANCEMENTS (Month 3+)

### Priority 7: KB Integration (Phase 2)
**Plan**: `PHASE_2_KB_INTEGRATION.md`  
**Effort**: 10-12 hours  
**Impact**: 🟢 LOW (Enhancement)  
**Why Seventh**:
- Enhances existing KB features
- Not blocking anything
- Nice-to-have improvement
- Can wait for user feedback

**Dependencies**: Node work  
**Blocks**: Nothing

---

### Priority 8: Workflow Builder Overhaul
**Plan**: `WORKFLOW_BUILDER_OVERHAUL.md`  
**Effort**: 6-8 hours  
**Impact**: 🟢 LOW (Polish)  
**Why Last**:
- Current builder works fine
- Pure UI enhancement
- Not affecting functionality
- Lowest priority

**Dependencies**: None  
**Blocks**: Nothing

---

## 📅 Suggested Timeline

### Week 1 (Now)
- ✅ **Done**: AI Model Discovery
- ⏳ **Blocked**: Worker Deployment (needs user Railway setup)

### Week 2-3
- 🎯 Backend → Workers Consolidation (12-16 hrs)
- 🎯 Finish Superadmin (4-6 hrs)
- **Total**: ~20 hours work

### Week 4-5
- 🎯 Worker Infrastructure Control (8-10 hrs)
- 🎯 Node Hydration (4-6 hrs)
- **Total**: ~15 hours work

### Month 2
- 🎯 Node Redesign (8-10 hrs)
- 🎯 KB Integration (10-12 hrs)
- **Total**: ~20 hours work

### Month 3+
- 🎯 Workflow Builder Overhaul (6-8 hrs)
- 🎯 Any new features/requests

---

## 💡 Quick Wins (Can Do Anytime)

These are small tasks that can be done between big projects:

1. **Add more AI providers** (1-2 hrs each)
   - Groq
   - Cohere
   - DeepSeek

2. **Dashboard stats polish** (2 hrs)
   - Better visualizations
   - More metrics

3. **Error handling improvements** (ongoing)
   - Better error messages
   - Logging improvements

4. **Documentation** (ongoing)
   - API docs
   - Architecture diagrams
   - Workflow tutorials

---

## 🎯 Recommended Action RIGHT NOW

**Option A: Wait for Railway Setup** (BLOCKED)
- User needs to create Railway account
- Agent can't proceed without it

**Option B: Start Backend Consolidation Prep**
- Won't deploy until Railway ready
- Can write the code now
- Test locally

**Option C: Finish Superadmin Polish**
- Independent of worker deployment
- 4-6 hours to complete
- Makes superadmin production-ready

---

**My Recommendation**: **Option C - Finish Superadmin**

Why:
1. Not blocked on anything
2. Quick win (4-6 hours)
3. Makes existing features complete
4. Can test immediately
5. User can create Railway account in parallel

Then when Railway is ready → Deploy workers → Then consolidate backend.

---

*Last Updated: 2026-01-27 21:15 IST*
