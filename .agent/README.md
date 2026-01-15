# 🧠 AGENT BRIEFING: WORKING WITH ANWESH

**Last Updated:** 2026-01-15  
**Project:** Axiom Engine (Lekhika + Axiom Integration)

---

## 👤 DEVELOPER PROFILE

**Name:** Anwesh Rath  
**Cognitive Profile:** ADHD + 168 IQ  
**Working Style:** High intelligence, pattern recognition, needs perfect organization  

**What This Means for You (AI Agent):**
- Anwesh sees patterns and architectural flaws instantly
- Needs visuals, diagrams, and precise documentation
- Everything must be organized, documented, and professional
- No tolerance for band-aids, hardcoded values, or poor architecture

---

## 🚫 ABSOLUTE RULES (NON-NEGOTIABLE)

### **1. NO CODE WITHOUT PERMISSION**
- **NEVER** start coding without explicit permission
- When asked a question, **RESPOND** - don't code
- Explain options, wait for decision, THEN code

### **2. NO ASSUMPTIONS**
- If something is unclear, **ASK**
- Don't guess what Anwesh wants
- Don't fill in gaps with your "best judgment"

### **3. NO BAND-AIDS**
- No temporary fixes
- No "we'll fix this later" solutions
- No workarounds that hide the real issue
- **Production-grade from day 1**

### **4. NO HARDCODED BULLSHIT**
- Everything configurable
- No magic numbers
- No inline secrets
- Proper environment variables

### **5. NO BAD ARCHITECTURE**
- **No God files** (massive files doing everything)
- Proper separation of concerns
- Clean, modular, refactorable code
- Professional naming conventions

### **6. DOCUMENTATION IS PARAMOUNT**
- Document before coding
- Architecture diagrams required
- Update docs as you build
- Session logs must include fuck-ups (failures are learning)

---

## ✅ QUALITY STANDARDS

### **Code Quality:**
- ✅ Production-grade, enterprise-level code
- ✅ TypeScript strict mode (no `any`)
- ✅ Proper error handling
- ✅ Structured logging
- ✅ Clean, readable, maintainable

### **Architecture:**
- ✅ Modular, composable
- ✅ Separation of concerns
- ✅ Refactoring-friendly
- ✅ Follows SOLID principles
- ✅ Scalable from day 1

### **Documentation:**
- ✅ Visual diagrams (architecture, flow, etc.)
- ✅ Precise, up-to-date
- ✅ Includes rationale (WHY, not just WHAT)
- ✅ Organized in proper folders

---

## 📁 PROJECT STRUCTURE

```
.agent/
├── README.md                 ← You're here
├── Plans/
│   ├── Active/              ← Current implementation plans
│   └── Completed/           ← Finished plans (archived)
├── Sessions/                ← Session logs (EVERYTHING, including failures)
└── Handovers/              ← Context for next agent
```

### **How to Use This:**

#### **Plans/**
- Each plan is a markdown file
- Must include:
  - Goal/Objective
  - Architecture diagrams
  - Implementation steps
  - **To-Do List** (with ~~strikethrough~~ for completed items)
  - Dependencies
  - Success criteria

#### **Sessions/**
- One file per session
- Must include:
  - Date/time
  - What was discussed
  - What was built
  - **Fuck-ups** (what went wrong, why, how it was fixed)
  - Decisions made (and why)
  - **To-Do List** with progress tracking

#### **Handovers/**
- Written for the NEXT agent
- Complete context
- What's working
- What's not working
- What needs to be done next
- Critical gotchas

---

## 🎯 ANWESH'S WORKING PROCESS

### **Phase 1: Understand**
Anwesh will:
- Ask questions
- Share requirements (often from clients/partners)
- Discuss architecture

**You should:**
- Answer questions clearly
- Ask clarifying questions
- **Wait for permission before coding**

### **Phase 2: Plan**
Anwesh will:
- Review your architecture proposal
- Give feedback
- Approve or request changes

**You should:**
- Create detailed plans (in `.agent/Plans/Active/`)
- Include diagrams
- Show trade-offs
- **Wait for approval**

### **Phase 3: Build**
Anwesh will:
- Give explicit permission to code
- Monitor progress
- Provide feedback

**You should:**
- Code to production standards
- Update documentation as you go
- Track progress in session logs
- **Never assume, always confirm**

### **Phase 4: Document**
Anwesh will:
- Review documentation
- Request clarifications

**You should:**
- Keep docs up-to-date
- Log everything (wins and losses)
- Prepare handover for next agent

---

## 🧬 TECHNICAL PREFERENCES

### **From Lekhika Analysis:**

**Tech Stack:**
- **Frontend:** React (Vite), TailwindCSS, React Flow
- **Backend:** Node.js, Express, TypeScript
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Queue:** BullMQ + Redis
- **Workers:** PM2 for process management
- **Deployment:** VPS via automated scripts

**Architecture Patterns:**
- ✅ Multi-tenant SaaS from day 1
- ✅ Worker-based async execution
- ✅ Queue-driven job processing
- ✅ Visual workflow orchestration (React Flow)
- ✅ Row-Level Security (RLS) for data isolation
- ✅ Multi-AI provider support with failover

**Code Organization:**
- ✅ Modular services (one service, one responsibility)
- ✅ Centralized configuration
- ✅ Proper error handling
- ✅ Structured logging (JSON format)
- ✅ No console.log in production

---

## 🎨 COMMUNICATION STYLE

### **What Anwesh Expects:**

**When You Respond:**
- ✅ Be precise and thorough
- ✅ Use markdown formatting
- ✅ Include diagrams when helpful
- ✅ Show trade-offs, not just one option
- ✅ Be honest about limitations

**What Anwesh Doesn't Want:**
- ❌ Vague answers
- ❌ "I'll just code it" without permission
- ❌ Assumptions about requirements
- ❌ Oversimplification
- ❌ Band-aid solutions

---

## 📊 SESSION LOG TEMPLATE

Use this for every session:

```markdown
# Session: [Date] - [Brief Description]

## 📋 Objective
What we're trying to achieve

## 💬 Discussion
- Question asked
- Answer provided
- Decisions made

## ✅ Completed
- ~~Task 1~~
- ~~Task 2~~

## 🚧 In Progress
- [ ] Task 3
- [ ] Task 4

## ❌ Fuck-Ups
- What went wrong
- Why it happened
- How it was fixed
- Lesson learned

## 🎯 Next Steps
- [ ] Next task
- [ ] Next decision needed

## 📝 Notes
Any additional context
```

---

## 🔥 CRITICAL INSIGHTS

### **From Current Project:**

1. **Lekhika + Axiom Integration**
   - Lekhika = Existing AI workflow platform (production-ready)
   - Axiom = New Market Writer system (self-improving KB)
   - Goal: Merge into unified SaaS platform

2. **Current State:**
   - ✅ Database schema designed (multi-tenant)
   - ✅ Migrations created (3 migrations)
   - ✅ Zod schemas built (production-grade)
   - ✅ Architecture documented
   - 🚧 Awaiting implementation of Axiom workers

3. **Key Decisions Made:**
   - Using Lekhika's existing worker infrastructure
   - Adding Axiom as new worker types in PM2
   - Extending React Flow with Axiom node types
   - Unified Supabase database with RLS

---

## 🤝 HANDOVER PROTOCOL

### **When Ending a Session:**

1. **Update Session Log**
   - Mark completed items with ~~strikethrough~~
   - Document any fuck-ups
   - List what's next

2. **Update Plans**
   - Move completed plans to `Completed/`
   - Update active plans with progress

3. **Create Handover Document**
   - Complete context for next agent
   - Critical state information
   - What not to do (gotchas)

---

## 💡 FINAL NOTES

**Remember:**
- Anwesh is brilliant and sees everything
- Documentation is not optional
- Quality over speed
- No shortcuts, no band-aids
- When in doubt, **ASK**

**If You're Unsure:**
1. Stop
2. Ask a clarifying question
3. Wait for explicit permission
4. Then proceed with confidence

---

**Welcome to the team. Build something amazing.** 🚀

---

_This document should be read by EVERY agent working on this project._
