# Forensic Audit: UI/UX Workflow & Bundle Changes (2026-03-16)

**Scope:** Changes made for “premium, smooth, self-explanatory, theme-aware” workflow and engine-bundle UI.

---

## 1. Hardcodes (found and status)

| Location | Issue | Severity | Status |
|----------|--------|----------|--------|
| `workflow-manager.css` `.wm-toolbar-title-icon` | `#7C3AED` and `white` in gradient | Medium | **FIXED** — now uses `var(--color-accent-secondary)` and `var(--color-on-accent)` |
| `workflow-manager.css` execution status badges (lines ~1749–1760) | Fallbacks `#3b82f6`, `#10b981`, `#ef4444` in `var(--color-info, #3b82f6)` etc. | Low | **Left as-is** — defensive fallbacks if a theme omits vars; all current themes define these |
| `workflow-manager.css` `.add-node-modal` | `var(--shadow-xl, 0 25px 60px -12px rgba(0,0,0,0.25))` | Low | **Acceptable** — graceful degradation |
| `workflow-manager.css` line 2997 | `var(--color-success-hover, #059669)` | Medium | **Pre-existing** — `--color-success-hover` is not defined in `globals.css`; fallback used. Prefer adding token or using `--color-success` |

---

## 2. Wrong / missing design tokens (pre-existing in workflow-manager.css)

| Token used | Actual in globals | Count | Recommendation |
|------------|-------------------|--------|----------------|
| `--color-text-muted` | **Not defined** (globals has `--color-text-tertiary`) | 50+ | Either add `--color-text-muted` in globals as alias for `--color-text-tertiary`, or replace all `--color-text-muted` with `--color-text-tertiary` in workflow-manager.css |
| `--color-success-hover` | **Not defined** | 1 | Add to globals or use `--color-success` |

These were **not introduced** by the recent UI/UX pass; they are existing inconsistencies in the Workflow Manager styles.

---

## 3. Magic numbers (no design tokens)

**workflow-manager.css** uses raw values instead of design tokens in many places:

- **Durations:** `0.2s ease`, `0.3s` — globals define `--duration-fast`, `--duration-normal`, `--duration-slow`, `--easing`.
- **Spacing:** `8px`, `12px`, `16px`, `20px`, `24px`, `padding: 20px 24px` — globals define `--spacing-*`, `--radius-sm` etc.
- **Sizes:** `font-size: 14px`, `1.125rem`, `border-radius: 8px` — globals define `--text-*`, `--radius-*`.

**Verdict:** Inconsistent with design system. Not band-aids, but lowers maintainability and theme consistency. Pre-existing; not introduced by this pass.

---

## 4. Band-aids / bad coding ethics

- **No band-aids identified** in the recent changes (no error swallowing, no “hide the bug” fixes).
- **Aria and copy:** Labels and descriptions are real, not placeholders.
- **Empty state steps:** Real product copy (workflow → bundle → deploy), not stub text.
- **Theme pills:** Switched to semantic tokens (accent, accent-secondary, warning); no fake or one-off colours.

---

## 5. Stubs / mocks / placeholders

- **None** in the changed UI copy or behaviour. Helper text (“Required. The pipeline that runs when this engine is invoked.”), empty state steps, and “Copy the API key above — it’s shown only once.” are final copy.
- **Add Node modal** description: “Click a card to add it to the canvas.” — accurate, not a placeholder.

---

## 6. Accessibility half-measures

- **Modals:** Have `role="dialog"`, `aria-modal="true"`, `aria-labelledby` and matching `id` on titles. **No** `aria-describedby` on Deploy/Customize where a short description could help; optional improvement.
- **Execution modal:** Status row has `aria-live="polite"` and `title` on badge — good.
- **Focus trap:** Modals do **not** trap focus or restore focus on close; keyboard users can tab out. Consider adding focus trap for full compliance (e.g. WCAG 2.2).

---

## 7. Summary and recommendations

| Category | Result |
|----------|--------|
| **Hardcodes** | One fixed (toolbar icon). Rest are fallbacks or pre-existing. |
| **Wrong tokens** | `--color-text-muted` (50+ uses) and `--color-success-hover` (1 use) are undefined; recommend aligning with globals. |
| **Magic numbers** | Widespread in workflow-manager.css; recommend gradual replacement with `--spacing-*`, `--duration-*`, `--radius-*`, `--text-*`. |
| **Band-aids / stubs** | None identified in this pass. |
| **A11y** | Solid labelling; focus management in modals can be improved. |

**Suggested next steps (in order):**

1. Add `--color-text-muted` to `globals.css` (alias to `--color-text-tertiary`) so existing workflow-manager.css does not rely on an undefined variable.
2. Add `--color-success-hover` to globals (or remove its use and use `--color-success`).
3. Optionally remove hex fallbacks from execution status badges (e.g. `var(--color-info)` only) if all themes are guaranteed to define them.
4. Incrementally replace magic numbers in workflow-manager.css with design tokens.
5. Add focus trap and focus restore for Create Bundle, Deploy, Customize, Execution, and Add Node modals.
