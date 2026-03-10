# Day 2: Component Refactoring - Execution Plan
**Date:** 2026-01-16 01:35 IST  
**Status:** In Progress

---

## 🔍 Audit Results

**Total Hardcoded Colors Found:**
- Background colors (bg-*): 35+ instances
- Text colors (text-*): 45+ instances  
- Border colors (border-*): 3+ instances

**Files Requiring Refactoring:**
1. `src/app/superadmin/redis/page.tsx` - 15+ instances
2. `src/app/superadmin/ai-providers/page.tsx` - 5+ instances
3. `src/app/(main)/brain-control/page.tsx` - 20+ instances
4. Additional component files (modals, sidebar, etc.)

---

## 🎯 Refactoring Strategy

### **Color Mapping:**
```typescript
// OLD → NEW (Theme-Based)
bg-blue-500     → bg-primary-500
bg-purple-500   → bg-secondary-500
bg-green-500    → bg-accent-500 OR bg-success
bg-red-500      → bg-error
bg-orange-500   → bg-warning
bg-gray-*       → bg-neutral-*

text-blue-500   → text-primary-500
text-green-500  → text-success
text-red-500    → text-error
text-orange-500 → text-warning

border-blue-500 → border-primary-500
border-green-500→ border-success
```

### **Semantic Mapping:**
- Success states → `bg-success`, `text-success`
- Error states → `bg-error`, `text-error`
- Warning states → `bg-warning`, `text-warning`
- Info/neutral → `bg-info`, `text-info`
- Primary actions → `bg-primary-*`
- Secondary actions → `bg-secondary-*`

---

## 📋 Execution Order

### **Priority 1: Core UI Pages**
1. [x] `superadmin/redis/page.tsx`  - ✅ Complete (15+ instances)
2. [x] `superadmin/ai-providers/page.tsx` - ✅ Complete (7 instances)
3. [ ] `(main)/brain-control/page.tsx` - In progress

### **Priority 2: Components**
4. [ ] `components/superadmin/Sidebar.tsx`
5. [ ] `components/superadmin/StatCard.tsx`
6. [ ] `components/modals/*`

### **Priority 3: Remaining Pages**
7. [ ] `superadmin/page.tsx` (Dashboard)
8. [ ] `superadmin/organizations/page.tsx`
9. [ ] `superadmin/users/page.tsx`
10. [ ] `(main)/dashboard/page.tsx`

---

## ✅ Validation Checklist

After each file:
- [ ] Zero hardcoded color classes
- [ ] Semantic color usage correct
- [ ] TypeScript compiles
- [ ] Visual appearance maintained
- [ ] Git commit with descriptive message

---

**Starting with:** `superadmin/redis/page.tsx` (most instances)
