# Plan: Full Design System Sweep (Option A)

## Context

The `DESIGN_SYSTEM.md` specifies a dark/light dual-theme CRM with glassmorphism, purple (#a078ff) primary, cyan (#00cbe6) secondary, Space Grotesk typography, CSS variable-based theming, and entry animations. The current app has none of this — it's a plain light-only gray/neutral interface across all 33 pages. The user wants everything brought in line with the design system.

---

## Critical Files

| File | Change |
|------|--------|
| `app/globals.css` | Replace minimal CSS with full variable system + `.dark`/`.light` selectors |
| `context/theme-provider.tsx` | New — ThemeContext + useTheme hook + localStorage persistence |
| `app/layout.tsx` | Add `ThemeProvider`, import Space Grotesk font |
| `components/layouts/Shell.tsx` | Theme toggle button, theme-aware sidebar/topbar classes |
| All 33 page files | Replace hardcoded `bg-gray-*` / `text-gray-*` with theme-aware `cn()` conditionals |

---

## Implementation

### Phase 1: Foundation (theme infrastructure)

**`context/theme-provider.tsx`** — new file
- `ThemeContext` with `{ theme: "dark" | "light", toggleTheme }`
- `useTheme()` hook
- Reads/writes `localStorage` key `"revra-theme"`
- SSR-safe: defaults to `"dark"` if no stored preference
- Applies `class="dark"` or `class="light"` to `<html>` element via a small inline script in `layout.tsx` to prevent flash of unstyled content

**`app/globals.css`** — replace content
- Define all CSS variables under `.dark` and `.light` selectors matching DESIGN_SYSTEM.md exactly
- Dark mode vars: `--background`, `--surface`, `--surface-container-*`, `--primary`, `--secondary`, `--on-surface`, `--border`, `--muted-foreground`, etc.
- Light mode vars: same names, light-mode values
- Add `AnimationContainer` keyframes for `fadeUp`, `fadeDown`, `fadeLeft`, `fadeRight`, `scaleUp`
- Import `Space Grotesk` via Google Fonts (or `@font-face` if self-hosted)

**`app/layout.tsx`** — two small changes
1. Add `Space_Grotesk` from `next/font/google` alongside existing `Inter` + `JetBrains_Mono`
2. Wrap root with `<ThemeProvider>` — place it inside `<body>` before `ToastProvider`
3. Add inline `<script>` (dangerouslySetInnerHTML) that reads localStorage and sets `class="dark"` or `class="light"` on `<html>` before React hydrates

---

### Phase 2: Shell with Theme Toggle

**`components/layouts/Shell.tsx`**
- Import `useTheme()` hook
- Top bar: add a `Sun`/`Moon` toggle button next to NotificationBell
- Sidebar: replace `bg-white border-r border-gray-200` → theme-aware `bg-surface border-border`
- Sidebar nav items: replace hardcoded gray → theme-aware conditionals
- User avatar badge: replace gray background → theme-aware
- Main content area: replace `bg-gray-50` → `bg-background`
- `p-8` content padding stays (it works in both themes)

---

### Phase 3: Global `useTheme()` Component Sweep

Update every page component to:
1. Add `const { theme } = useTheme();` if not already present
2. Replace every hardcoded `bg-gray-*` / `border-gray-*` / `text-gray-*` / `text-gray-400` / `text-gray-500` etc. with theme-aware `cn()` conditionals
3. Replace `bg-white` on cards → theme-aware glassmorphism (backdrop-blur + surface-container + border)
4. Apply purple/cyan accent colors on key interactive elements (buttons, badges, active states)
5. Add `AnimationContainer` wrappers with staggered delays on card groups
6. Apply section badge pattern to page headers where appropriate

**Pages requiring heaviest updates** (many gray-isms):
- `app/user/page.tsx` — dashboard stats, briefing card, call queue, activity feed
- `app/user/pipeline/page.tsx` — kanban columns, lead cards
- `app/user/ai/page.tsx` — campaign cards, stats
- `app/user/calendar/page.tsx` — calendar grid, appointment cards
- `app/user/calls/active/page.tsx` — split-screen call interface
- `app/admin/` pages — all similar gray-heavy patterns
- `app/superadmin/` pages — same

**Priority pages for update:**
1. `app/user/page.tsx` (most visible, highest impact)
2. `app/user/ai/page.tsx` (Emma AI = brand feature)
3. `app/user/calls/active/page.tsx` (tech-panel style fits design system pattern #7)
4. `app/user/pipeline/page.tsx` (core workflow)
5. All remaining pages

---

### Phase 4: Theme-Aware Component Library (shared patterns)

Update these shared components to be fully theme-aware (so all pages benefit automatically):

| Component | Key Change |
|-----------|------------|
| `components/ui/card.tsx` | glassmorphism background, theme-aware border |
| `components/ui/badge.tsx` | darker/dimmer variants for dark mode |
| `components/ui/table.tsx` | `bg-surface` header, `bg-transparent` rows |
| `components/ui/modal.tsx` | backdrop blur + surface background |
| `components/ui/button.tsx` | gradient fill for primary variant |
| `components/ui/input.tsx` | dark-aware focus ring |
| `components/layouts/NotificationPanel.tsx` | theme-aware slide-over |
| `components/layouts/CommandPalette.tsx` | dark overlay, theme-aware list |

---

## Verification

1. `npm run build` — must pass 0 errors, 33 pages
2. Run `npm run dev`, open `http://localhost:3000`
3. Toggle dark/light via the new theme button in top bar
4. Verify: no flash of wrong theme on load
5. Visit: `/user`, `/user/ai`, `/user/pipeline`, `/user/calls/active`, `/admin`, `/superadmin`
6. Confirm: glassmorphism cards, purple/cyan accents, dark background, sidebar nav active states all correct in both themes
7. Verify RevRa AI chat overlay opens and backdrop dims correctly in both themes
