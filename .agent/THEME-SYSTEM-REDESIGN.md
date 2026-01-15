# 🎨 AXIOM THEME SYSTEM - COMPLETE REDESIGN

**This is EXPENSIVE, PREMIUM shit.** Each theme has a distinct personality with unique typography, spacing, animations, and micro-interactions.

---

## 🎭 **6 DISTINCT THEMES**

### **1. MINIMALIST (Light & Dark)**
**Philosophy:** "Less is more. Calm, spacious, refined."

**Typography:**
- Font: **Outfit** (geometric sans-serif)
- Sizes: Larger (17px base)
- Weights: Lighter (300-600)
- Line height: Generous (1.6)

**Spacing:**
- Generous (48px large, 80px xl)
- Lots of breathing room

**Borders & Radius:**
- Large radii (8/12/16px)
- Soft, rounded corners
- Thin borders (1px always)

**Shadows:**
- Minimal, diffused
- Soft glows

**Animations:**
- **SLOW** (200/350/500ms)
- Smooth, elegant easing
- Gentle: `translateY(-2px)` on hover
- Subtle: `scale(1.02)` hover, `0.99` active

**Micro-Interactions:**
- Vertical bar expands from top on nav hover
- Gentle slide right (6px)
- Soft glow on buttons
- Cards lift smoothly (4px up)
- Inputs gently expand (scale 1.01)

---

### **2. MODERN (Light & Dark)**
**Philosophy:** "Fast, sharp, tech-forward. Energetic and responsive."

**Typography:**
- Font: **Space Grotesk** (tech-forward humanist)
- Sizes: Smaller, tighter (15px base)
- Weights: Heavier (400-800)
- Line height: Compact (1.45)

**Spacing:**
- Tight, compact (32px large, 56px xl)
- Dense, information-rich

**Borders & Radius:**
- Sharp, minimal radii (4/6/8px)
- Angular feel
- Thick borders on emphasis (2px)

**Shadows:**
- Strong, defined
- Sharp edges
- Blue-tinted glows

**Animations:**
- **FAST** (100/150/250ms)
- Snappy, punchy easing
- Strong bounce
- Noticeable: `scale(1.05)` hover, `0.96` active

**Micro-Interactions:**
- Accent bar slides from right (gradient)
- Quick padding shift + border accent
- Gradient background on button hover
- Strong scale with glow
- Cards pop (2px up, scale 1.01)
- Border thickens on focus
- **Ripple effect** on button click

---

### **3. AQUA (Light & Dark)**
**Philosophy:** "Flowing, fluid, ocean-like. Smooth and calming."

**Typography:**
- Font: **Manrope** (rounded humanist)
- Sizes: Balanced (16px base)
- Weights: Medium (400-700)
- Line height: Comfortable (1.55)

**Spacing:**
- Balanced, flowing (44px large, 72px xl)
- Organic feel

**Borders & Radius:**
- Very rounded (10/14/20px)
- Fluid, organic shapes
- Slightly thicker borders (1.5px)

**Shadows:**
- Soft, diffused
- Cyan-tinted
- Glowing effects

**Animations:**
- **FLOWING** (150/300/450ms)
- Wave-like easing
- Gentle bounce
- Smooth: `scale(1.03)` hover, `0.98` active

**Micro-Interactions:**
- **Wave ripple** across nav item (gradient sweep)
- Rounded corners on hover
- Floating effect with colored glow
- Blurred gradient background
- Cards float + rotate (6px up, 0.5deg)
- Radial gradient overlay appears
- **Wave pulse** animation on input focus

---

## 📁 **File Structure**

```
/styles/themes/
  minimalist-dark.css    ← Outfit, slow, spacious
  minimalist-light.css   ← Same personality
  modern-dark.css        ← Space Grotesk, fast, sharp
  modern-light.css       ← Same personality
  aqua-dark.css          ← Manrope, flowing, organic
  aqua-light.css         ← Same personality

/styles/
  theme-interactions.css ← Theme-specific micro-interactions

/app/
  globals.css            ← Base setup + imports
```

---

## 🎬 **Theme-Specific Interactions**

### **Sidebar Navigation**
```css
.nav-item  /* Auto-applies theme-specific hover effects */
```

**Minimalist:** Vertical expand bar (left), slide right
**Modern:** Gradient bar (right), border accent, padding shift
**Aqua:** Wave sweep gradient, rounded glow

### **Buttons**
**Minimalist:** Soft glow, gentle lift
**Modern:** Strong scale, gradient overlay, ripple on click
**Aqua:** Floating blur, colored glow halo

### **Cards**
**Minimalist:** Subtle lift (4px)
**Modern:** Quick pop (2px + scale)
**Aqua:** Float + rotate (6px + 0.5deg)

### **Inputs (Focus)**
**Minimalist:** Gentle expand
**Modern:** Border thickens, instant accent
**Aqua:** Wave pulse animation

---

##  **CSS Variables Per Theme**

Each theme defines:
- `--hover-scale` (1.02 / 1.05 / 1.03)
- `--active-scale` (0.99 / 0.96 / 0.98)
- `--focus-ring-width` (3px / 2px / 2.5px)
- `--duration-fast/normal/slow` (VERY different)
- `--easing` / `--easing-smooth` / `--easing-bounce`

---

## ✅ **What's Different from Before**

### **Before:**
- ❌ Only colors changed
- ❌ Same fonts everywhere
- ❌ Same animations (250ms)
- ❌ Same spacing
- ❌ Same radii
- ❌ Generic interactions

### **Now:**
- ✅ **3 unique fonts** (Outfit, Space Grotesk, Manrope)
- ✅ **Different sizes** (17px / 15px / 16px base)
- ✅ **Different speeds** (500ms / 100ms / 300ms)
- ✅ **Different radii** (16px / 4px / 20px large)
- ✅ **Different spacing** (80px / 56px / 72px xl)
- ✅ **Unique hover effects** per theme
- ✅ **Theme-specific animations** (expand / ripple / wave)
- ✅ **Different shadow treatments**
- ✅ **Distinct button styles**
- ✅ **Unique nav interactions**

---

## 🚀 **Usage**

```tsx
// Buttons automatically get theme-specific interactions
<button className="...">Click Me</button>

// Navigation items get theme effects
<Link className="nav-item ...">Dashboard</Link>

// Cards get theme hovers
<div className="card">Content</div>
```

**The theme system handles everything automatically** based on `[data-theme]` attribute.

---

## 🎨 **Color Palettes**

### **Minimalist**
- Primary: Soft purple (#8b5cf6)
- Background: Deep black / Warm white
- Accent: Refined purple

### **Modern**
- Primary: Electric blue (#60a5fa)
- Background: Cool tech gray / Pure white
- Accent: Hot pink (#f472b6)

### **Aqua**
- Primary: Cyan-teal (#22d3ee)
- Background: Deep ocean / Coastal blue-green
- Accent: Soft purple (#a78bfa)

---

**This is production-quality, expensive design.** Each theme feels like a different product. 🔥
