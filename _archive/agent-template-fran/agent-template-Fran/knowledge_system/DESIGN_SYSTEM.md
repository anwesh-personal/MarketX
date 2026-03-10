# Design System

> Visual & UX guidelines. Everything built should follow these principles.

---

## Design Philosophy

### Core Principles

1. **Premium, Not MVP** - Build it like it costs money
2. **Micro-Animations** - Subtle motion enhances experience
3. **Consistency** - Same patterns everywhere
4. **Accessibility** - Works for everyone
5. **No Placeholders** - Real content only

---

## Colors

### Brand Colors

```css
--primary: #[hex];         /* Main brand color */
--primary-light: #[hex];   /* Lighter variant */
--primary-dark: #[hex];    /* Darker variant */
--secondary: #[hex];       /* Accent color */
```

### Neutrals

```css
--background: #[hex];      /* Page background */
--surface: #[hex];         /* Card/component backgrounds */
--text-primary: #[hex];    /* Main text */
--text-secondary: #[hex];  /* Muted text */
--border: #[hex];          /* Borders and dividers */
```

### Semantic Colors

```css
--success: #[hex];
--warning: #[hex];
--error: #[hex];
--info: #[hex];
```

### Dark Mode

```css
/* Invert or define dark mode variants */
--background-dark: #[hex];
--surface-dark: #[hex];
--text-primary-dark: #[hex];
```

---

## Typography

### Font Families

```css
--font-heading: 'Inter', sans-serif;
--font-body: 'Inter', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Font Sizes

| Name | Size | Use Case |
|------|------|----------|
| xs | 12px | Captions |
| sm | 14px | Small text |
| base | 16px | Body text |
| lg | 18px | Lead text |
| xl | 20px | H4 |
| 2xl | 24px | H3 |
| 3xl | 30px | H2 |
| 4xl | 36px | H1 |

### Font Weights

- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

---

## Spacing

Use consistent spacing multiples:

| Name | Size |
|------|------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| 2xl | 48px |
| 3xl | 64px |

---

## Border Radius

| Name | Size | Use Case |
|------|------|----------|
| sm | 4px | Buttons, inputs |
| md | 8px | Cards |
| lg | 12px | Modals |
| xl | 16px | Large containers |
| full | 9999px | Pills, avatars |

---

## Shadows

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
--shadow-xl: 0 20px 25px rgba(0,0,0,0.15);
```

---

## Animations

### Durations

- Fast: 150ms
- Normal: 300ms
- Slow: 500ms

### Easing

```css
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Common Animations

- Fade in: opacity 0 → 1
- Slide up: translateY(10px) → 0
- Scale: scale(0.95) → 1
- Hover lift: translateY(-2px) + shadow increase

---

## Component Patterns

### Buttons

- Solid primary for main actions
- Outline for secondary actions
- Ghost for tertiary actions
- Always have hover/active states
- Include loading state

### Cards

- Subtle border or shadow
- Consistent padding (md or lg)
- Hover effect for interactive cards

### Forms

- Clear labels
- Helpful placeholder text
- Visible focus states
- Error states with icon + message

### Modals

- Backdrop with blur
- Centered with max-width
- Close button top-right
- Trap focus inside

---

## Responsive Breakpoints

| Name | Size | Target |
|------|------|--------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |
| 2xl | 1536px | Extra large |

---

## Icons

- Use [Icon Library Name] consistently
- Size: 16px (small), 20px (default), 24px (large)
- Match icon weight to font weight

---

## Images

- Use WebP format for better compression
- Always include alt text
- Lazy load below-the-fold images
- Use appropriate sizes for different screens

---

*All new components must follow this design system.*
