# 🎨 Theme System Architecture Plan

**Status:** Active  
**Created:** 2026-01-15  
**Owner:** Anwesh  

---

## 📋 Objective

Create a comprehensive, production-grade theme system with:
- **3 Theme Variants:** Minimalist, Aqua, Modern
- **2 Modes:** Light, Dark
- **Complete Design Tokens:** Colors, typography, spacing, micro-interactions
- **Database-Persisted:** User preferences stored in Supabase
- **Theme-Aware Components:** Zero hardcoded styles

---

## 🎯 Design Philosophy

### **Minimalist Theme**
- **Vibe:** Clean, spacious, uncluttered
- **Colors:** Neutral grays, subtle accents
- **Typography:** Sans-serif, generous line-height
- **Spacing:** Lots of whitespace
- **Animations:** Subtle, smooth transitions (150-200ms)
- **Borders:** Thin (1px), light
- **Shadows:** Minimal, soft

### **Aqua Theme**
- **Vibe:** Oceanic, calming, professional
- **Colors:** Blues, teals, cyan accents
- **Typography:** Modern sans-serif, balanced
- **Spacing:** Balanced (not too tight, not too loose)
- **Animations:** Fluid, wave-like transitions (200-300ms)
- **Borders:** Medium (1-2px), blue-tinted
- **Shadows:** Medium depth, cool tones

### **Modern Theme**
- **Vibe:** Bold, vibrant, energetic
- **Colors:** High contrast, vibrant accents (purple, orange, pink)
- **Typography:** Bold headings, tight tracking
- **Spacing:** Compact, efficient
- **Animations:** Snappy, bouncy (100-150ms)
- **Borders:** Thick (2-3px), bold accents
- **Shadows:** Deep, dramatic

---

## 🏗️ Architecture

### **Technology Stack**
```
CSS Variables (for runtime theme switching)
    ↓
Tailwind Config (extends with theme tokens)
    ↓
ThemeContext (React Context for state management)
    ↓
Components (consume theme via className utilities)
```

---

## 🎨 Design Token System

### **Color Palette Structure**

Each theme (Minimalist, Aqua, Modern) × Each mode (Light, Dark) has:

```typescript
interface ThemeColors {
  // Core
  primary: string;
  secondary: string;
  accent: string;
  
  // Backgrounds
  background: string;      // Page background
  surface: string;         // Card/panel background
  surfaceHover: string;    // Interactive surface hover
  
  // Text
  textPrimary: string;     // Main text
  textSecondary: string;   // Subtle text
  textTertiary: string;    // Disabled/placeholder
  
  // Borders
  border: string;          // Default border
  borderHover: string;     // Interactive border
  borderFocus: string;     // Focused border
  
  // States
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Functional
  overlay: string;         // Modal backdrop
  shadow: string;          // Box shadow color
}
```

### **Complete Color Definitions**

#### **Minimalist Theme**

**Light Mode:**
```css
--color-primary: #1f2937;        /* Gray-800 */
--color-secondary: #6b7280;      /* Gray-500 */
--color-accent: #3b82f6;         /* Blue-500 */

--color-background: #ffffff;
--color-surface: #f9fafb;        /* Gray-50 */
--color-surface-hover: #f3f4f6;  /* Gray-100 */

--color-text-primary: #111827;   /* Gray-900 */
--color-text-secondary: #6b7280; /* Gray-500 */
--color-text-tertiary: #9ca3af;  /* Gray-400 */

--color-border: #e5e7eb;         /* Gray-200 */
--color-border-hover: #d1d5db;   /* Gray-300 */
--color-border-focus: #3b82f6;   /* Blue-500 */

--color-success: #10b981;        /* Green-500 */
--color-warning: #f59e0b;        /* Amber-500 */
--color-error: #ef4444;          /* Red-500 */
--color-info: #3b82f6;           /* Blue-500 */

--color-overlay: rgba(0, 0, 0, 0.3);
--color-shadow: rgba(0, 0, 0, 0.1);
```

**Dark Mode:**
```css
--color-primary: #f3f4f6;        /* Gray-100 */
--color-secondary: #9ca3af;      /* Gray-400 */
--color-accent: #60a5fa;         /* Blue-400 */

--color-background: #0f172a;     /* Slate-900 */
--color-surface: #1e293b;        /* Slate-800 */
--color-surface-hover: #334155;  /* Slate-700 */

--color-text-primary: #f1f5f9;   /* Slate-100 */
--color-text-secondary: #94a3b8; /* Slate-400 */
--color-text-tertiary: #64748b;  /* Slate-500 */

--color-border: #334155;         /* Slate-700 */
--color-border-hover: #475569;   /* Slate-600 */
--color-border-focus: #60a5fa;   /* Blue-400 */

--color-success: #34d399;        /* Green-400 */
--color-warning: #fbbf24;        /* Amber-400 */
--color-error: #f87171;          /* Red-400 */
--color-info: #60a5fa;           /* Blue-400 */

--color-overlay: rgba(0, 0, 0, 0.6);
--color-shadow: rgba(0, 0, 0, 0.5);
```

#### **Aqua Theme**

**Light Mode:**
```css
--color-primary: #0891b2;        /* Cyan-600 */
--color-secondary: #06b6d4;      /* Cyan-500 */
--color-accent: #8b5cf6;         /* Violet-500 */

--color-background: #f0fdfa;     /* Teal-50 */
--color-surface: #ffffff;
--color-surface-hover: #ccfbf1;  /* Teal-100 */

--color-text-primary: #134e4a;   /* Teal-900 */
--color-text-secondary: #0f766e; /* Teal-700 */
--color-text-tertiary: #2dd4bf;  /* Teal-400 */

--color-border: #5eead4;         /* Teal-300 */
--color-border-hover: #2dd4bf;   /* Teal-400 */
--color-border-focus: #0891b2;   /* Cyan-600 */

--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #ef4444;
--color-info: #06b6d4;

--color-overlay: rgba(6, 182, 212, 0.2);
--color-shadow: rgba(6, 182, 212, 0.15);
```

**Dark Mode:**
```css
--color-primary: #22d3ee;        /* Cyan-400 */
--color-secondary: #67e8f9;      /* Cyan-300 */
--color-accent: #a78bfa;         /* Violet-400 */

--color-background: #042f2e;     /* Teal-950 */
--color-surface: #134e4a;        /* Teal-900 */
--color-surface-hover: #115e59;  /* Teal-800 */

--color-text-primary: #ccfbf1;   /* Teal-100 */
--color-text-secondary: #5eead4; /* Teal-300 */
--color-text-tertiary: #2dd4bf;  /* Teal-400 */

--color-border: #0f766e;         /* Teal-700 */
--color-border-hover: #14b8a6;   /* Teal-500 */
--color-border-focus: #22d3ee;   /* Cyan-400 */

--color-success: #34d399;
--color-warning: #fbbf24;
--color-error: #f87171;
--color-info: #22d3ee;

--color-overlay: rgba(6, 182, 212, 0.4);
--color-shadow: rgba(6, 182, 212, 0.3);
```

#### **Modern Theme**

**Light Mode:**
```css
--color-primary: #8b5cf6;        /* Violet-500 */
--color-secondary: #ec4899;      /* Pink-500 */
--color-accent: #f97316;         /* Orange-500 */

--color-background: #faf5ff;     /* Purple-50 */
--color-surface: #ffffff;
--color-surface-hover: #f3e8ff;  /* Purple-100 */

--color-text-primary: #1e1b4b;   /* Indigo-950 */
--color-text-secondary: #6366f1; /* Indigo-500 */
--color-text-tertiary: #a78bfa;  /* Violet-400 */

--color-border: #c4b5fd;         /* Violet-300 */
--color-border-hover: #a78bfa;   /* Violet-400 */
--color-border-focus: #8b5cf6;   /* Violet-500 */

--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #ef4444;
--color-info: #6366f1;

--color-overlay: rgba(139, 92, 246, 0.2);
--color-shadow: rgba(139, 92, 246, 0.2);
```

**Dark Mode:**
```css
--color-primary: #a78bfa;        /* Violet-400 */
--color-secondary: #f472b6;      /* Pink-400 */
--color-accent: #fb923c;         /* Orange-400 */

--color-background: #1e1b4b;     /* Indigo-950 */
--color-surface: #312e81;        /* Indigo-900 */
--color-surface-hover: #3730a3;  /* Indigo-800 */

--color-text-primary: #e0e7ff;   /* Indigo-100 */
--color-text-secondary: #c7d2fe; /* Indigo-200 */
--color-text-tertiary: #a5b4fc;  /* Indigo-300 */

--color-border: #4f46e5;         /* Indigo-600 */
--color-border-hover: #6366f1;   /* Indigo-500 */
--color-border-focus: #a78bfa;   /* Violet-400 */

--color-success: #34d399;
--color-warning: #fbbf24;
--color-error: #f87171;
--color-info: #818cf8;

--color-overlay: rgba(139, 92, 246, 0.4);
--color-shadow: rgba(139, 92, 246, 0.35);
```

---

## ✍️ Typography System

### **Font Families**

**Minimalist:**
```css
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
--font-display: 'Inter', sans-serif;
```

**Aqua:**
```css
--font-sans: 'Outfit', system-ui, sans-serif;
--font-mono: 'Fira Code', monospace;
--font-display: 'Poppins', sans-serif;
```

**Modern:**
```css
--font-sans: 'Space Grotesk', system-ui, sans-serif;
--font-mono: 'Source Code Pro', monospace;
--font-display: 'Montserrat', sans-serif;
```

### **Type Scale**

**Minimalist (generous):**
```css
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */

--line-height-tight: 1.25;
--line-height-normal: 1.75;
--line-height-loose: 2;
```

**Aqua (balanced):**
```css
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
--text-4xl: 2.25rem;

--line-height-tight: 1.375;
--line-height-normal: 1.625;
--line-height-loose: 1.875;
```

**Modern (compact, bold):**
```css
--text-xs: 0.6875rem;    /* 11px */
--text-sm: 0.8125rem;    /* 13px */
--text-base: 0.9375rem;  /* 15px */
--text-lg: 1.0625rem;    /* 17px */
--text-xl: 1.1875rem;    /* 19px */
--text-2xl: 1.4375rem;   /* 23px */
--text-3xl: 1.75rem;     /* 28px */
--text-4xl: 2.125rem;    /* 34px */

--line-height-tight: 1.125;
--line-height-normal: 1.5;
--line-height-loose: 1.75;

--font-weight-heading: 700;  /* Bolder headings */
```

---

## 📏 Spacing System

**Minimalist (spacious):**
```css
--spacing-xs: 0.5rem;    /* 8px */
--spacing-sm: 0.75rem;   /* 12px */
--spacing-md: 1.5rem;    /* 24px */
--spacing-lg: 2.5rem;    /* 40px */
--spacing-xl: 4rem;      /* 64px */
--spacing-2xl: 6rem;     /* 96px */
```

**Aqua (balanced):**
```css
--spacing-xs: 0.375rem;  /* 6px */
--spacing-sm: 0.625rem;  /* 10px */
--spacing-md: 1.25rem;   /* 20px */
--spacing-lg: 2rem;      /* 32px */
--spacing-xl: 3rem;      /* 48px */
--spacing-2xl: 4.5rem;   /* 72px */
```

**Modern (compact):**
```css
--spacing-xs: 0.25rem;   /* 4px */
--spacing-sm: 0.5rem;    /* 8px */
--spacing-md: 1rem;      /* 16px */
--spacing-lg: 1.5rem;    /* 24px */
--spacing-xl: 2.5rem;    /* 40px */
--spacing-2xl: 3.5rem;   /* 56px */
```

---

## 🎭 Micro-Interactions

### **Animation Durations**

**Minimalist:**
```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--easing: cubic-bezier(0.4, 0, 0.2, 1);  /* ease-in-out */
```

**Aqua:**
```css
--duration-fast: 200ms;
--duration-normal: 300ms;
--duration-slow: 400ms;
--easing: cubic-bezier(0.34, 1.56, 0.64, 1);  /* gentle bounce */
```

**Modern:**
```css
--duration-fast: 100ms;
--duration-normal: 150ms;
--duration-slow: 200ms;
--easing: cubic-bezier(0.68, -0.55, 0.265, 1.55);  /* snappy bounce */
```

### **Transition Properties**

All themes use:
```css
transition: all var(--duration-normal) var(--easing);
```

Applied to:
- Button hover/active states
- Card hover elevations
- Modal open/close
- Dropdown expand/collapse
- Input focus states

---

## 🔲 Border & Shadow System

### **Border Radius**

**Minimalist:**
```css
--radius-sm: 0.25rem;   /* 4px */
--radius-md: 0.5rem;    /* 8px */
--radius-lg: 0.75rem;   /* 12px */
--radius-xl: 1rem;      /* 16px */
--radius-full: 9999px;
```

**Aqua:**
```css
--radius-sm: 0.5rem;    /* 8px */
--radius-md: 0.75rem;   /* 12px */
--radius-lg: 1rem;      /* 16px */
--radius-xl: 1.5rem;    /* 24px */
--radius-full: 9999px;
```

**Modern:**
```css
--radius-sm: 0.125rem;  /* 2px */
--radius-md: 0.25rem;   /* 4px */
--radius-lg: 0.5rem;    /* 8px */
--radius-xl: 0.75rem;   /* 12px */
--radius-full: 9999px;
```

### **Border Width**

**Minimalist:**
```css
--border-width: 1px;
--border-width-thick: 1px;  /* No thick borders */
```

**Aqua:**
```css
--border-width: 1px;
--border-width-thick: 2px;
```

**Modern:**
```css
--border-width: 2px;
--border-width-thick: 3px;
```

### **Box Shadows**

**Minimalist (subtle):**
```css
--shadow-sm: 0 1px 2px 0 var(--color-shadow);
--shadow-md: 0 4px 6px -1px var(--color-shadow);
--shadow-lg: 0 10px 15px -3px var(--color-shadow);
--shadow-xl: 0 20px 25px -5px var(--color-shadow);
```

**Aqua (medium):**
```css
--shadow-sm: 0 2px 4px 0 var(--color-shadow);
--shadow-md: 0 6px 12px -2px var(--color-shadow);
--shadow-lg: 0 12px 24px -4px var(--color-shadow);
--shadow-xl: 0 25px 50px -12px var(--color-shadow);
```

**Modern (dramatic):**
```css
--shadow-sm: 0 3px 6px 0 var(--color-shadow);
--shadow-md: 0 8px 16px -2px var(--color-shadow);
--shadow-lg: 0 16px 32px -4px var(--color-shadow);
--shadow-xl: 0 32px 64px -12px var(--color-shadow);
```

---

## 💾 Database Schema

### **Add to Users Table**

```sql
ALTER TABLE users ADD COLUMN theme_preference VARCHAR(50) DEFAULT 'minimalist-light';
ALTER TABLE users ADD COLUMN theme_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Valid values: 'minimalist-light', 'minimalist-dark', 'aqua-light', 'aqua-dark', 'modern-light', 'modern-dark'
ALTER TABLE users ADD CONSTRAINT valid_theme 
  CHECK (theme_preference IN (
    'minimalist-light', 'minimalist-dark',
    'aqua-light', 'aqua-dark',
    'modern-light', 'modern-dark'
  ));
```

---

## ⚛️ ThemeContext Implementation

### **File Structure**
```
apps/frontend/src/
├── contexts/
│   └── ThemeContext.tsx
├── styles/
│   ├── themes/
│   │   ├── minimalist-light.css
│   │   ├── minimalist-dark.css
│   │   ├── aqua-light.css
│   │   ├── aqua-dark.css
│   │   ├── modern-light.css
│   │   └── modern-dark.css
│   └── globals.css
└── components/
    └── ThemeSelector.tsx
```

### **ThemeContext Interface**

```typescript
type ThemeVariant = 'minimalist' | 'aqua' | 'modern';
type ThemeMode = 'light' | 'dark';
type Theme = `${ThemeVariant}-${ThemeMode}`;

interface ThemeContextValue {
  // Current theme
  theme: Theme;
  variant: ThemeVariant;
  mode: ThemeMode;
  
  // Actions
  setTheme: (theme: Theme) => Promise<void>;
  setVariant: (variant: ThemeVariant) => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleMode: () => Promise<void>;
  
  // Loading state
  isLoading: boolean;
}
```

### **ThemeProvider Logic**

```typescript
const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('minimalist-light');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  // Load theme from database on mount
  useEffect(() => {
    if (user) {
      loadUserTheme();
    }
  }, [user]);
  
  const loadUserTheme = async () => {
    const { data } = await supabase
      .from('users')
      .select('theme_preference')
      .eq('id', user.id)
      .single();
    
    if (data?.theme_preference) {
      applyTheme(data.theme_preference);
    }
    setIsLoading(false);
  };
  
  const setTheme = async (newTheme: Theme) => {
    // Apply theme immediately (optimistic update)
    applyTheme(newTheme);
    
    // Persist to database
    await supabase
      .from('users')
      .update({ 
        theme_preference: newTheme,
        theme_updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
  };
  
  const applyTheme = (newTheme: Theme) => {
    // Set data attribute on <html> element
    document.documentElement.dataset.theme = newTheme;
    
    // Import theme CSS dynamically
    import(`@/styles/themes/${newTheme}.css`);
    
    setThemeState(newTheme);
  };
  
  // ... rest of implementation
};
```

---

## 🎨 Component Usage Pattern

### **Bad (Hardcoded):**
```tsx
<div className="bg-gray-900 text-white border-blue-500">
```

### **Good (Theme-Aware):**
```tsx
<div className="bg-background text-textPrimary border-borderFocus">
```

### **With Tailwind Extended:**

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        textPrimary: 'var(--color-text-primary)',
        // ... all theme tokens
      },
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        // ... all spacing tokens
      }
    }
  }
};
```

**Usage:**
```tsx
<button className="
  bg-primary text-white 
  px-md py-sm 
  rounded-[var(--radius-md)]
  transition-all duration-[var(--duration-normal)]
  hover:shadow-[var(--shadow-md)]
">
  Click Me
</button>
```

---

## 🧩 Component Library Examples

### **Button Component**

```tsx
const Button = ({ variant = 'primary', children }) => {
  const baseStyles = `
    px-md py-sm
    rounded-[var(--radius-md)]
    font-medium
    transition-all
    duration-[var(--duration-normal)]
    ease-[var(--easing)]
  `;
  
  const variants = {
    primary: 'bg-primary text-white hover:shadow-md',
    secondary: 'bg-surface text-textPrimary border border-border hover:bg-surfaceHover',
    ghost: 'bg-transparent text-textPrimary hover:bg-surfaceHover',
  };
  
  return (
    <button className={`${baseStyles} ${variants[variant]}`}>
      {children}
    </button>
  );
};
```

### **Card Component**

```tsx
const Card = ({ children, hover = false }) => {
  return (
    <div className={`
      bg-surface
      border border-border
      rounded-[var(--radius-lg)]
      p-md
      shadow-[var(--shadow-sm)]
      ${hover ? 'transition-all duration-[var(--duration-normal)] hover:shadow-[var(--shadow-md)]' : ''}
    `}>
      {children}
    </div>
  );
};
```

---

## 🎛️ Theme Selector UI

### **Top Right Navigation**

```tsx
const ThemeSelector = () => {
  const { variant, mode, setVariant, toggleMode } = useTheme();
  
  return (
    <div className="flex items-center gap-sm">
      {/* Theme Variant Dropdown */}
      <select 
        value={variant}
        onChange={(e) => setVariant(e.target.value)}
        className="
          bg-surface 
          text-textPrimary 
          border border-border
          rounded-[var(--radius-md)]
          px-sm py-xs
          transition-all duration-[var(--duration-normal)]
          hover:border-borderHover
        "
      >
        <option value="minimalist">Minimalist</option>
        <option value="aqua">Aqua</option>
        <option value="modern">Modern</option>
      </select>
      
      {/* Day/Night Toggle */}
      <button
        onClick={toggleMode}
        className="
          p-sm
          bg-surface
          border border-border
          rounded-[var(--radius-md)]
          transition-all duration-[var(--duration-normal)]
          hover:bg-surfaceHover
        "
        aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {mode === 'light' ? '🌙' : '☀️'}
      </button>
    </div>
  );
};
```

---

## 📋 Implementation Checklist

### **Phase 1: Foundation**
- [ ] Create CSS variable files for all 6 themes
- [ ] Update Tailwind config to extend with theme tokens
- [ ] Create ThemeContext with database sync
- [ ] Add `theme_preference` column to users table
- [ ] Build ThemeSelector component

### **Phase 2: Component Migration**
- [ ] Audit existing components for hardcoded styles
- [ ] Create theme-aware base components (Button, Card, Input, etc.)
- [ ] Update layout components (Nav, Sidebar, etc.)
- [ ] Test all components in all 6 theme variations

### **Phase 3: Testing**
- [ ] Visual regression testing (screenshot all themes)
- [ ] Accessibility testing (contrast ratios for all themes)
- [ ] Performance testing (theme switching latency)
- [ ] Browser compatibility (CSS variables support)

### **Phase 4: Documentation**
- [ ] Component usage guide
- [ ] Theme token reference
- [ ] Design handoff docs for designers
- [ ] Storybook for component previews

---

## 📊 Success Criteria

- ✅ **Zero hardcoded colors** in any component
- ✅ **Instant theme switching** (< 100ms perceived latency)
- ✅ **Database persistence** of user preferences
- ✅ **All 6 theme combinations** look polished
- ✅ **WCAG AA contrast ratios** met for all themes
- ✅ **Developer experience**: Easy to create new theme-aware components

---

## 🚀 Next Steps

**Awaiting approval to proceed with:**
1. Database migration (add `theme_preference` to users table)
2. Create CSS variable files
3. Build ThemeContext + ThemeProvider
4. Build ThemeSelector component
5. Update existing components to be theme-aware

---

**STATUS: AWAITING APPROVAL** ⏸️

_No code will be written until explicit permission is granted._
