# 🚀 PHASE 0 KICKOFF - Immediate Actions

**Date:** 2026-01-16  
**Status:** READY TO START  
**Priority:** 🔴 CRITICAL FOUNDATION

---

## ✅ Pre-Flight Checklist

### **Before You Start:**
- [ ] Read `PHASE_0_LEKHIKA_AI_PORT.md` completely
- [ ] Review `AXIOM_COMPLETE_ANALYSIS_2026-01-16.md`
- [ ] Understand all rules (NO band-aids, NO hardcoded colors, NO TODOs)
- [ ] Coffee/chai ready ☕

---

## 📅 Day-by-Day Breakdown

### **Day 1: Theme System Foundation**
**Time: 6-8 hours**

- [ ] Create `apps/frontend/src/styles/theme.ts`
  - Complete color palettes (primary, secondary, accent, neutral)
  - Typography system
  - Spacing scale
  - Border radius
  - Shadows (including glow effects)
  - Gradients
  - Z-index layers
  
- [ ] Create `apps/frontend/src/styles/globals.css`
  - CSS variables from theme
  - Custom scrollbar
  - Focus styles
  - Selection colors
  
- [ ] Update `tailwind.config.ts`
  - Extend with theme colors
  - Custom spacing
  - Custom shadows

**Validation:**
```bash
# No hardcoded colors in new files
grep -r "bg-blue\|text-red\|border-green" apps/frontend/src/styles/
# Should return NOTHING
```

---

### **Day 2: Refactor Existing Components**
**Time: 8-10 hours**

- [ ] Audit all existing components for hardcoded colors
  ```bash
  grep -r "bg-\|text-\|border-" apps/frontend/src/components/ | grep -v "theme\|primary\|secondary\|neutral\|accent"
  ```

- [ ] Refactor components to use theme:
  - [ ] `apps/frontend/src/components/superadmin/Sidebar.tsx`
  - [ ] `apps/frontend/src/components/superadmin/StatCard.tsx`
  - [ ] `apps/frontend/src/app/superadmin/page.tsx` (Dashboard)
  - [ ] All modals (CreateOrg, EditUser, etc.)
  - [ ] Any other components with hardcoded colors

**Example Refactor:**
```tsx
// ❌ BEFORE
<div className="bg-blue-500 text-white hover:bg-blue-600">

// ✅ AFTER
<div className="bg-primary-500 text-white hover:bg-primary-600">
```

**Validation:**
```bash
# Run this - should be ZERO results
grep -r "bg-blue-\|bg-red-\|bg-green-\|bg-yellow-\|bg-purple-" apps/frontend/src/ | wc -l
```

---

### **Day 3: AI Provider Management (Complete Port)**
**Time: 8-10 hours**

- [ ] Create `apps/frontend/src/lib/ai-providers.ts`
  - Complete provider configs (6 providers)
  - `getActiveProvider()` with failover
  - `validateAndDiscoverProvider()` for all 6 providers
  - `trackProviderUsage()` with auto-disable logic
  
- [ ] Update existing AI Provider UI (`/superadmin/ai-providers`)
  - Use theme colors (remove hardcoded gradients)
  - Add validation status animations
  - Show discovered models
  
- [ ] Refactor all LLM calls to use provider system:
  - [ ] `apps/workers/src/utils/embeddings.ts`
  - [ ] `apps/frontend/src/services/brain/RAGOrchestrator.ts`
  - [ ] Any other files with `process.env.OPENAI_API_KEY`

**Critical Check:**
```bash
# This should return ZERO
grep -r "process.env.OPENAI_API_KEY\|process.env.ANTHROPIC" apps/
```

**Validation:**
- [ ] Can add OpenAI key → validates → discovers models
- [ ] Can add Anthropic key → validates → discovers models
- [ ] Failover works (disable key 1, system uses key 2)
- [ ] Usage tracking increments correctly
- [ ] Failure tracking increments and auto-disables after 5 failures

---

### **Day 4: Worker Infrastructure**
**Time: 6-8 hours**

- [ ] Create `ecosystem.config.js` (root)
  - Main worker (all types)
  - Individual workers for scaling
  - Cron for learning worker (6 AM Eastern)
  
- [ ] Create `deploy-workers.sh`
  - Build script
  - Archive creation
  - SCP upload
  - Remote deployment
  - PM2 reload
  
- [ ] Update worker entry points to use AI Provider system:
  - [ ] `apps/workers/src/processors/kb/kb-processor.ts`
  - [ ] `apps/workers/src/processors/conversation/summarizer.ts`
  
- [ ] Test locally:
  ```bash
  pm2 start ecosystem.config.js
  pm2 logs axiom-workers
  pm2 status
  ```

**Validation:**
- [ ] Workers start without errors
- [ ] Workers use AI Provider system (not hardcoded keys)
- [ ] PM2 shows all workers running
- [ ] Logs show successful job processing

---

### **Day 5-6: Component Library**
**Time: 12-16 hours**

Create theme-governed components:

- [ ] `apps/frontend/src/components/ui/Button.tsx`
  - Variants: primary, secondary, outline, ghost, danger
  - Sizes: sm, md, lg
  - Loading state
  - Icon support
  - Framer Motion animations
  
- [ ] `apps/frontend/src/components/ui/Input.tsx`
  - Variants: default, error, success
  - Label, helper text, error text
  - Icon support
  
- [ ] `apps/frontend/src/components/ui/Modal.tsx`
  - Backdrop with blur
  - Animation: slide-up + fade
  - Close button
  - Header, body, footer sections
  
- [ ] `apps/frontend/src/components/ui/Card.tsx`
  - Variants: default, elevated, outlined
  - Hover effects
  
- [ ] `apps/frontend/src/components/ui/Badge.tsx`
  - Variants: success, warning, error, info, neutral
  - Sizes: sm, md
  
- [ ] `apps/frontend/src/components/ui/Select.tsx`
  - Custom dropdown
  - Search support
  - Multi-select option
  
- [ ] `apps/frontend/src/components/ui/Tooltip.tsx`
  - Position: top, bottom, left, right
  - Arrow
  
- [ ] `apps/frontend/src/components/ui/Toast.tsx`
  - Notification system
  - Position: top-right, bottom-right, etc.
  - Auto-dismiss

**All components MUST:**
- Use theme colors ONLY
- Have Framer Motion animations
- Be fully TypeScript typed
- Be accessible (ARIA labels, keyboard nav)
- Have proper focus states

**Validation:**
```bash
# No hardcoded colors in UI components
grep -r "bg-\|text-\|border-" apps/frontend/src/components/ui/ | grep -v "theme\|primary\|secondary"
# Should be EMPTY
```

---

### **Day 7: Documentation & Cleanup**
**Time: 4-6 hours**

- [ ] Create `Documentation/LEKHIKA_PORT_GUIDE.md`
  - Theme system usage guide
  - Component library examples
  - AI Provider integration guide
  - Worker deployment guide
  
- [ ] Create `Documentation/DESIGN_SYSTEM.md`
  - Color palette reference
  - Typography scale
  - Component showcase
  - Do's and Don'ts
  
- [ ] Update existing docs:
  - [ ] Remove any references to hardcoded keys
  - [ ] Add theme system examples
  
- [ ] Final cleanup:
  ```bash
  # Remove any TODO comments
  grep -r "TODO\|FIXME\|HACK" apps/ --exclude-dir=node_modules
  # Address each one - either implement or create GitHub issue
  ```

- [ ] Run full codebase audit:
  ```bash
  # Hardcoded colors check
  grep -r "bg-blue\|bg-red\|bg-green\|bg-yellow\|bg-purple\|bg-pink" apps/frontend/src/ --exclude-dir=node_modules | wc -l
  # Should be 0
  
  # Hardcoded API keys check  
  grep -r "process.env.*API_KEY" apps/ --exclude-dir=node_modules --exclude="*.md"
  # Should ONLY show env loading, not usage
  
  # TODO check
  grep -r "TODO" apps/ --exclude-dir=node_modules --exclude="*.md"
  # Should be 0
  ```

---

## ✅ Final Validation Checklist

Before marking Phase 0 complete:

### **Theme System**
- [ ] `theme.ts` exists with complete palettes
- [ ] All colors are theme-governed
- [ ] Typography system defined
- [ ] Spacing scale defined
- [ ] Shadows and gradients defined
- [ ] CSS variables in `globals.css`
- [ ] Tailwind config extends theme

### **AI Provider Management**
- [ ] All 6 providers configured (OpenAI, Anthropic, Google, Mistral, Perplexity, XAI)
- [ ] Validation works for each provider
- [ ] Model discovery works
- [ ] Failover logic tested
- [ ] Usage tracking works
- [ ] Failure count auto-disable works
- [ ] ZERO hardcoded API keys in codebase

### **Worker Infrastructure**
- [ ] `ecosystem.config.js` complete
- [ ] `deploy-workers.sh` tested
- [ ] Workers run successfully with PM2
- [ ] Workers use AI Provider system
- [ ] Graceful shutdown works
- [ ] Logs are clean

### **Component Library**
- [ ] 8+ base components created
- [ ] All use theme colors
- [ ] All have Framer Motion animations
- [ ] All are TypeScript strict
- [ ] All are accessible
- [ ] Documentation exists

### **Code Quality**
- [ ] ZERO hardcoded colors
- [ ] ZERO hardcoded API keys
- [ ] ZERO TODOs in code
- [ ] ZERO band-aids or fallbacks
- [ ] All TypeScript errors resolved
- [ ] All lint errors resolved

### **Documentation**
- [ ] Lekhika Port Guide complete
- [ ] Design System documented
- [ ] Component examples provided
- [ ] Worker deployment guide written

---

## 🚀 Ready to Start?

1. **Pull latest code**
   ```bash
   cd /Users/anweshrath/Documents/Tommy-Fran/Axiom
   git status
   git pull
   ```

2. **Create feature branch**
   ```bash
   git checkout -b phase-0/lekhika-ai-port
   ```

3. **Start Day 1**
   - Create `apps/frontend/src/styles/theme.ts`
   - Let's build something MARVEL-worthy 🔥

---

**Rules:**
- NO compromises
- NO shortcuts  
- NO "we'll fix it later"
- Build it RIGHT the first time

**Remember:**
You're not working for a boss. You're THE BOSS.  
Build accordingly. 💪

---

**LET'S FUCKING GO.** 🚀
