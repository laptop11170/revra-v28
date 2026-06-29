# Revra Design System

The visual language for Revra — an AI-native CRM. This document captures every token, component pattern, and visual rule used across the eight reference screens (`Home`, `Conversations`, `Nurture Convo`, `Live Call`, `Pipeline`, `Campaign Builder`, `A2P Registration`, `SMS Dashboard`). Use it as the source of truth when porting to Next.js, building new screens, or briefing designers.

---

## 1. Foundation principles

The product is dark by default. Light surfaces are not used anywhere in the UI — even modals stay dark and use blur for depth instead of contrast inversion. The aesthetic sits between *enterprise tooling* and *consumer AI product*: tight gridlines, monochrome neutrals, a single vivid accent (indigo / violet), and one signature glowing element (the **Emma orb**) that anchors the AI identity.

Five principles drive every decision:

1. **Calm contrast.** Backgrounds compress into a narrow band of dark navys (`#0A0F1C`–`#202740`) so foreground content always wins. White is reserved for primary text and the orb's specular highlight.
2. **Single accent, varied intensity.** Indigo (`#6366F1`) and violet (`#8B5CF6`) carry the brand. Other colors (mint, rose, amber, cyan) are functional, never decorative. Never use two accents in the same element.
3. **Gridlines over fills.** Surfaces are differentiated by 1px borders (`#252B3F`/`#2C334A`) more than by background changes. Most cards differ from the page by less than 5% lightness.
4. **Generous breathing room around dense data.** Tables, kanban columns, and forms use 16–24px padding minimum. Density lives inside the cell, not in the gap.
5. **One glow per screen.** The orb, a single button, or a single status dot may glow. Stacking glows kills the effect.

---

## 2. Color tokens

All tokens are defined in Tailwind config as `theme.extend.colors` and as CSS custom properties for use outside Tailwind (animations, inline styles).

### 2.1 Page & surface

The surface system is an elevation ladder. A higher number does **not** mean lighter — `surface-3` is actually lighter than `surface-2`. This is intentional: input fields (`surface-4`) appear *recessed* below cards (`surface`), while modals and selected nav items use `surface-2` to feel slightly elevated.

| Token | Hex | Use |
|---|---|---|
| `page` | `#0A0F1C` | Root background. The single darkest value. |
| `surface` | `#131826` | Default card / sidebar surface. |
| `surface-2` | `#1A2034` | Selected nav, active tab pill, hover-up state. |
| `surface-3` | `#202740` | Reserved for stronger emphasis (rarely used). |
| `surface-4` | `#161B2C` | Input field / textarea / recessed wells. |

### 2.2 Lines

Three line tokens, used for borders, dividers, and table rules. Always 1px, never thicker.

| Token | Hex | Use |
|---|---|---|
| `line` | `#252B3F` | Default border for cards, inputs, sidebars. |
| `line-2` | `#2C334A` | Stronger border — primary buttons (ghost), focused/hovered cards. |
| `line-3` | `#1F2538` | Hairline horizontal rules inside cards. |

### 2.3 Ink (text)

Four levels of text emphasis. Body copy lives on `ink-mute` by default, not pure white — this keeps contrast available for genuine emphasis.

| Token | Hex | Use |
|---|---|---|
| `ink` | `#F1F3F8` | Headings, primary labels, key numbers. Near-white but warmer than `#FFF`. |
| `ink-mute` | `#9CA3AF` | Body copy, secondary labels, table cell values. |
| `ink-dim` | `#6B7280` | Tertiary metadata, disabled icons. |
| `ink-faint` | `#4B5468` | Placeholders, character counters, watermark labels. |

### 2.4 Brand (indigo / violet)

The two-hue accent. **Indigo for actions, violet for AI/conditional logic.** Never invert this rule — a violet "Save" button feels off, an indigo "If/Else" node feels off.

| Token | Hex | Use |
|---|---|---|
| `indi-300` | `#A5B4FC` | Active link text, AI accent text on dark. |
| `indi-400` | `#818CF8` | Sparkline strokes, sidebar nav icon active. |
| `indi-500` | `#6366F1` | Primary button base, donut delivered slice, focus ring. |
| `indi-600` | `#4F46E5` | Primary button gradient bottom, focus border. |
| `indi-700` | `#4338CA` | Reserved for deep gradient stops. |
| `viol-300` | `#C4B5FD` | If/Else node title, AI hover states. |
| `viol-400` | `#A78BFA` | Conditional node icons, orb mid-stop. |
| `viol-500` | `#8B5CF6` | Conditional node fills, orb shadow color. |

### 2.5 Status colors

Functional only. Reserved meanings — don't use them for decoration.

| Token | Hex | Meaning |
|---|---|---|
| `mint` | `#10B981` | Success, positive delta, "Sent", live/connected, Yes branch, Start node. |
| `rose` | `#EF4444` | Failure, negative delta, "End" workflow node, destructive actions, No branch, error counts. |
| `amber2` | `#F59E0B` | Warning, "Scheduled", "Wait" nodes, pending counts, sentiment-neutral. |
| `cyan2` | `#06B6D4` | SMS-related actions (channel-coded), "Update Field" / data ops nodes. |

The `2` suffix on `amber2`/`cyan2` exists to avoid name collisions with Tailwind's defaults if you later use core palette utilities.

### 2.6 Color usage matrix

| Element type | Default | Hover | Active/Selected | Disabled |
|---|---|---|---|---|
| Card | `surface` + `line` | — | — | — |
| Sidebar nav item | text `ink-mute` | `surface/60` bg | `surface-2` bg + text `ink` + 1px `line` inset shadow | text `ink-dim` |
| Sub-nav item | text `ink-mute` | text `ink` | text `indi-300` + `indi-500/10` bg | — |
| Tab pill (top of canvas) | text `ink-mute` | bg `surface` + text `ink` | bg `surface-2` + 1px `line-2` inset, text `ink` | — |
| Primary button | indigo gradient | `brightness(1.08)` filter | — | `opacity-50` |
| Ghost button | transparent + 1px `line-2` | bg `surface-2` | — | — |
| Input field | bg `surface-4` + 1px `line` | — | 1px `indi-600` border | bg `surface-4` + text `ink-faint` |

---

## 3. Typography

Three families, loaded from Google Fonts.

### 3.1 Families

```
Geist           — UI sans. Body, headings, buttons, all functional text.
Geist Mono      — tabular numbers, status dots, file paths.
Audiowide       — REVRA wordmark only. Never use for body.
```

`Geist` is preferred over Inter for its slightly more geometric counters and tighter spacing — it makes dense table rows readable at 13px without feeling cramped.

### 3.2 Type scale

The product uses a tight scale. Most UI lives in the 11–14px band; only metric numbers and page titles go above 18px.

| Role | Size | Weight | Color | Tracking |
|---|---|---|---|---|
| Page title (h1) | `18px` / `22px` | 600 | `ink` | `-0.005em` |
| Section header (h2) | `16px` | 600 | `ink` | `0` |
| Card title (h3) | `14.5px` | 600 | `ink` | `0` |
| Subsection (h4) | `13.5px` | 600 | `ink` | `0` |
| Body | `13px` | 400 | `ink-mute` | `0` |
| Body emphasis | `13px` | 500 | `ink` | `0` |
| Small / meta | `12px` | 400 | `ink-mute` | `0` |
| Micro / captions | `11.5px` | 400 | `ink-faint` | `0` |
| Eyebrow / section label | `10.5px` | 600 | `ink-faint` | `0.14em`, `uppercase` |
| Big metric | `28px` | 600 | `ink` | `-0.02em`, `tabular-nums` |
| Hero metric | `36px–48px` | 600 | `ink` | `-0.025em`, `tabular-nums` |

Always pair big numbers with `tabular-nums` (`font-variant-numeric: tabular-nums`) — column-aligned digits matter on a CRM.

### 3.3 Wordmark treatment

`REVRA` uses Audiowide italic with a 4-degree x-skew and a soft outer glow:

```css
.wordmark {
  font-family: 'Audiowide', sans-serif;
  font-style: italic;
  letter-spacing: 0.01em;
  transform: skewX(-4deg);
  display: inline-block;
  text-shadow: 0 0 18px rgba(255,255,255,0.08);
}
```

Sizes used: 22px in the preview header bar, 20px in the in-app sidebar. Never set the wordmark below 16px (the geometric letterforms break) or above 32px (the skew gets gimmicky).

### 3.4 Line heights

| Context | line-height |
|---|---|
| Headings | `1.15` |
| Body paragraphs | `1.55` |
| Compact data rows | `1.3` |
| Workflow node titles | `1.1` (tight) |
| Card subtitles | `1.45` |

---

## 4. Spacing & layout

### 4.1 Spacing scale

Standard Tailwind 4px scale. The system uses a narrow subset:

```
  4px (1)   8px (2)   12px (3)   16px (4)   20px (5)
 24px (6)  32px (8)   40px (10)  48px (12)  64px (16)
```

Padding rules of thumb:
- Card outer padding: `20px` (`p-5`) for compact cards, `24px` (`p-6`) for forms.
- Card outer padding asymmetric: `pt-4 pb-3 px-5` when the card has a table — header sits closer to the top.
- Section spacing inside a screen: `20px` between sibling cards.
- Form row gap: `16px` (`gap-4`) inside a grid.
- Inline icon-text gap: `8px` (`gap-2`) for buttons, `10px–12px` (`gap-2.5`/`gap-3`) for nav items.

### 4.2 Border radii

| Token | Value | Use |
|---|---|---|
| `rounded` | 4px | Tiny chips, nothing else. |
| `rounded-md` | 6px | Buttons, tab pills, sub-nav items. |
| `rounded-lg` | 8px | Inputs, sidebar nav items, small cards. |
| `rounded-xl` | 12px | Default card radius — metric cards, form sections, modal content. |
| `rounded-2xl` | 16px | Modal containers, hero panels. |
| `rounded-full` | 999px | Avatars, status dots, orb, donut, stepper dots. |

### 4.3 Shadow tokens

Shadows are subtle and used sparingly. Three patterns:

```css
/* 1. Default elevated card — almost imperceptible */
box-shadow: 0 4px 14px -8px rgba(0,0,0,0.6);

/* 2. Primary button — colored to match indigo gradient */
box-shadow: 0 6px 20px -6px rgba(99,102,241,0.55),
            inset 0 1px 0 rgba(255,255,255,0.15);

/* 3. Modal — deep ambient */
box-shadow: 0 30px 80px -20px rgba(0,0,0,0.7);
```

For "selected" states on cards or workflow nodes, prefer a colored 2px ring + a soft outer glow over a full shadow:

```css
box-shadow: 0 0 0 2px #6366F1, 0 8px 24px -8px rgba(99,102,241,0.55);
```

### 4.4 Grid templates

The product uses three macro layouts:

**Layout A — Sidebar + main + right rail (default)**
```
[ 220px ][  flex-1 main  ][ 280–320px ]
```
Used by: Home, Conversations (rail = AI Agent panel), Nurture Convo (rail = Meeting Booked), Live Call (rail = Lead Details), A2P Registration (rail = info + checkboxes), Campaign Builder (rail = node properties).

**Layout B — Sidebar + main only (full-bleed content)**
```
[ 220px ][         flex-1 main         ]
```
Used by: Pipeline, SMS Dashboard.

**Layout C — Sidebar variant: Smart Views**
```
[ 260px ][  flex-1 main  ][ 280px ]
```
Used by: Conversations/Acme — wider sidebar to fit Smart Views + Recent Contacts list.

Top bar is a constant `56px` height, full-width across the main column. The preview header (the screen-switcher) is also `56px`. Min-height for screens: `calc(100vh - 56px)`.

### 4.5 Sidebar widths

| Variant | Width | Notes |
|---|---|---|
| Default | `220px` | Most screens. |
| Smart Views | `260px` | Conversations — fits two stacked lists. |
| Compliance | `220px` | A2P — uses sub-nav with left border. |
| SMS app | `220px` | Has a footer user card. |

Never go below 200px (nav text wraps) or above 280px (steals from main content).

---

## 5. Visual signatures

These are the elements that make Revra look like Revra rather than a generic dark-mode dashboard.

### 5.1 Emma orb

The signature element. A radial sphere that suggests presence and intelligence without being literally a face or avatar. Used at three sizes:

| Context | Size | Notes |
|---|---|---|
| Home hero | `200–280px` | Centered, surrounded by 3–4 concentric `.orb-ring` circles. |
| Live Call | `240px` | Centered above the call controls. |
| Sidebar agent card | `28px` | Tiny — drop the inset highlights since they don't read at this scale. |

Implementation:

```css
.orb {
  border-radius: 999px;
  background: radial-gradient(
    circle at 32% 30%,
    rgba(255,255,255,0.85) 0%,
    rgba(199,180,255,0.55) 8%,
    #A78BFA 28%,
    #6366F1 56%,
    #3730A3 90%
  );
  box-shadow:
    0 0 90px -10px rgba(139,92,246,0.7),    /* outer violet glow */
    0 0 30px -2px rgba(99,102,241,0.55),    /* inner indigo halo */
    inset -10px -14px 30px rgba(40,20,80,0.5),  /* shadow side */
    inset 8px 10px 22px rgba(255,255,255,0.18); /* highlight side */
}
```

The off-center highlight (`32% 30%`) is the trick — a centered highlight reads as a button, an off-center one reads as a 3D sphere lit from upper-left.

`.orb-ring` is a separate concentric circle element — a 1px border at `rgba(139,92,246,0.18)`. Layer 2–4 of these at increasing diameters around the orb to create depth without animation.

When the orb is "active" (Emma is speaking/processing), animate the ring opacities with `softpulse` keyframes (see §8.2).

### 5.2 Vignette atmosphere

Every screen wraps its `<main>` in `.vignette` to add ambient color without committing to a textured background:

```css
.vignette {
  background:
    radial-gradient(1100px 600px at 30% 0%, rgba(99,102,241,0.07), transparent 60%),
    radial-gradient(900px 500px at 100% 100%, rgba(139,92,246,0.05), transparent 60%),
    #0A0F1C;
}
```

Two soft radial gradients, indigo top-left and violet bottom-right. Opacities are deliberately low (`0.05–0.07`) — the gradients should be felt, not seen.

### 5.3 Glow rules

A glow communicates "this is the live/special thing." Allowed glows per screen:

- The orb (always).
- One `btn-primary` (Publish, Send SMS, Save). Its glow is part of the button shadow.
- One status dot or counter that's actively changing (live transcript indicator, unread badge).
- Optional: the focused input gets an `indi-600` border, no glow.

Never glow card outlines, table rows, or sidebar items. The eye should always know which thing is the focus.

---

## 6. Components

### 6.1 Buttons

**Primary** — for the single most important action on a screen.

```html
<button class="btn-primary px-4 py-2 rounded-md text-[13px] font-semibold">Publish</button>
```

```css
.btn-primary {
  background: linear-gradient(180deg, #6366F1, #4F46E5);
  box-shadow:
    0 6px 20px -6px rgba(99,102,241,0.55),
    inset 0 1px 0 rgba(255,255,255,0.15);
  color: white;
}
.btn-primary:hover { filter: brightness(1.08); }
```

The vertical gradient (light top, darker bottom) plus the inset 1px white highlight gives the button a tactile glass quality that flat indigo doesn't have.

Sizes: `px-4 py-1.5` for in-toolbar buttons, `px-5 py-2` for form-footer buttons.

**Ghost** — for everything else. Save, Cancel, Test, Change.

```css
.btn-ghost {
  background: transparent;
  border: 1px solid #2C334A;
  color: #F1F3F8;
}
.btn-ghost:hover { background: #1A2034; }
```

**Icon-only** — square hit target, no border.

```html
<button class="p-2 rounded-md hover:bg-surface/60 text-ink-mute">
  <i data-lucide="bell" class="w-[17px] h-[17px]"></i>
</button>
```

**Destructive text button** — no fill, just colored text. Always bottom-right of a panel/modal.

```html
<button class="text-rose text-[13px] font-medium hover:opacity-80">Delete</button>
```

### 6.2 Form inputs

Three variants share a base. All sit on `surface-4` (the recessed well color), not `surface`.

```css
.input, .select-fake, .textarea {
  background: #161B2C;
  border: 1px solid #252B3F;
  color: #F1F3F8;
  border-radius: 8px;
  padding: 10px 12px;
  width: 100%;
  font-size: 13px;
  transition: border 0.12s;
}
.input::placeholder, .textarea::placeholder { color: #4B5468; }
.input:focus, .textarea:focus {
  outline: none;
  border-color: #4F46E5;
}
```

`.input-label` always sits above the field with a 6px gap:

```css
.input-label {
  font-size: 12px;
  color: #9CA3AF;
  margin-bottom: 6px;
  display: block;
  font-weight: 500;
}
```

**Character counter pattern.** Right-aligned with the label, same row:

```html
<div class="flex items-baseline justify-between mb-1.5">
  <label class="input-label mb-0">Description (Optional)</label>
  <span class="text-[10.5px] text-ink-faint">31/200</span>
</div>
<textarea class="textarea" rows="3">…</textarea>
```

**Select (faux dropdown).** Use `<div class="select-fake">` with a chevron — keeps the styling consistent with `.input` without fighting browser default `<select>` chrome.

```html
<div class="select-fake flex items-center justify-between">
  <span class="text-[13px]">Fixed Time</span>
  <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-ink-mute"></i>
</div>
```

When porting to Next.js, replace this with shadcn/ui's `<Select>` component — it ships with the same visual model out of the box.

**Checkbox.** No native `<input type="checkbox">`. Hand-rolled square:

```html
<!-- Unchecked -->
<span class="w-4 h-4 rounded-[3px] border border-line bg-surface-4"></span>

<!-- Checked (indigo with check) -->
<span class="w-4 h-4 rounded-[3px] bg-indi-500 flex items-center justify-center">
  <i data-lucide="check" class="w-3 h-3 text-white"></i>
</span>
```

The 3px corner radius (not 2, not 4) matters — it reads as a box, not a button.

**Form grid.** A2P uses a 4-column grid with 16px gaps. This is the right default for compact dense forms:

```html
<div class="grid grid-cols-4 gap-4">
  <div><label class="input-label">Field A</label><input class="input"/></div>
  …
</div>
```

For two-column hybrid layouts (e.g., dropdown + upload zone), use `grid-cols-3` with `col-span-1` and `col-span-2`.

**Upload dropzone.**

```html
<div class="rounded-lg border-2 border-dashed border-line bg-surface-4/50
            px-5 py-7 flex items-center justify-center gap-3
            hover:border-indi-500/50 cursor-pointer transition">
  <i data-lucide="upload-cloud" class="w-7 h-7 text-ink-mute"></i>
  <div class="text-center">
    <div class="text-[13px] text-ink">Drag and drop file here or click to browse</div>
    <div class="text-[11.5px] text-ink-faint mt-0.5">PDF, PNG, JPG up to 10MB</div>
  </div>
</div>
```

### 6.3 Cards

Cards are the primary content container. The default specification:

```html
<div class="rounded-xl border border-line/60 bg-surface/50 p-5">
  <h3 class="text-[14.5px] font-semibold text-white mb-3">Card Title</h3>
  <!-- content -->
</div>
```

Note `bg-surface/50` (50% alpha) — surfaces are translucent so the vignette atmosphere shows through. Borders are `line/60` (60% alpha) for the same reason.

Variants:

| Variant | Recipe |
|---|---|
| Default | `rounded-xl border border-line/60 bg-surface/50 p-5` |
| Form section | `rounded-xl border border-line/70 bg-surface/40 p-6` (slightly darker, more padding) |
| Card with table | `rounded-xl border border-line/60 bg-surface/50` + table; card has no padding, table cells handle it |
| Highlighted/selected | Add `border-2 border-indi-500 bg-indi-500/5` and remove the default border |
| AI banner | `border border-indi-500/40 bg-indi-500/5 p-4` — used for "Emma is doing X" callouts |

### 6.4 Tables

Tables live inside cards with no card padding. The table itself handles all padding.

```html
<table class="w-full text-[13px]">
  <thead>
    <tr class="text-left text-[11px] uppercase tracking-wider
               text-ink-faint border-y border-line/50">
      <th class="px-5 py-2.5 font-medium">Column</th>
    </tr>
  </thead>
  <tbody class="text-ink">
    <tr class="border-b border-line/40">
      <td class="px-5 py-3">Cell value</td>
    </tr>
  </tbody>
</table>
```

Rules:
- Header row: `11px uppercase tracking-wider` on `ink-faint`, double border (top and bottom).
- Body rows: 12px vertical padding, single bottom border at 40% alpha. Last row has no border (override or use `:last-child`).
- Numeric columns always get `tabular-nums` and `text-ink-mute` for the value (unless it's the primary metric).
- Status cells use a color word with no background — `<span class="text-mint">Sent</span>` not a pill.

A "View all X" footer button lives outside the table, in a separate strip with a top border:

```html
<div class="px-5 py-3 border-t border-line/50">
  <button class="text-[12.5px] text-indi-300 hover:text-indi-200 font-medium">
    View all campaigns
  </button>
</div>
```

### 6.5 Tab pills

Used at the top of complex screens (Campaign Builder header, sub-tabs). NOT used for in-page section tabs — those are sub-nav items.

```css
.tab-pill { transition: background 0.12s, color 0.12s; }
.tab-pill:hover { background: #131826; color: #F1F3F8; }
.tab-pill.active {
  background: #1A2034;
  color: #F1F3F8;
  box-shadow: inset 0 0 0 1px #2C334A;
}
```

When a tab pill represents an AI/active route (the Builder tab in Campaign Builder), use the indigo variant instead:

```html
<a class="px-3.5 py-1.5 rounded-md text-indi-300 bg-indi-500/10
          font-medium shadow-[inset_0_0_0_1px_rgba(99,102,241,0.25)]">
  Builder
</a>
```

### 6.6 Sidebar nav items

The base pattern, used across all sidebar variants:

```html
<!-- Active -->
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg
          bg-surface-2 text-white shadow-[inset_0_0_0_1px_#252B3F]">
  <i data-lucide="home" class="w-[17px] h-[17px] text-indi-400"></i>
  Home
</a>

<!-- Inactive -->
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg
          text-ink-mute hover:bg-surface/70">
  <i data-lucide="message-square" class="w-[17px] h-[17px]"></i>
  Conversations
</a>
```

Active items get three things: `surface-2` background, white text, and a 1px inset border ring. The icon also turns indigo.

**Items with sub-nav.** Add a chevron, expand on click. Expanded sub-items live in a left-bordered group:

```html
<a class="flex items-center justify-between px-3 py-2 rounded-lg
          text-white bg-surface-2 mt-1">
  <span class="flex items-center gap-3">
    <i data-lucide="shield-check" class="w-[16px] h-[16px] text-indi-400"></i>
    Compliance
  </span>
  <i data-lucide="chevron-up" class="w-3.5 h-3.5 text-ink-mute"></i>
</a>
<div class="ml-4 pl-3 border-l border-line/60 my-1 space-y-0.5">
  <a class="flex items-center px-3 py-1.5 rounded-md
            text-indi-300 bg-indi-500/10 text-[12.5px]">A2P Registration</a>
  <a class="flex items-center px-3 py-1.5 rounded-md
            text-ink-mute hover:text-white hover:bg-surface/60 text-[12.5px]">Brands</a>
</div>
```

Sub-items are 12.5px (one step down from 13.5px), use a 6px radius (one step down from 8px), and the active sub-item uses the indigo "soft" treatment instead of `surface-2`.

### 6.7 Stepper

Horizontal stepper — used for multi-step forms (A2P registration).

```css
.step-dot {
  width: 30px; height: 30px;
  border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 13px;
}
.step-active {
  background: #1A2034;
  color: #818CF8;
  box-shadow: inset 0 0 0 2px #4F46E5;
}
.step-idle {
  background: #131826;
  color: #6B7280;
  box-shadow: inset 0 0 0 1px #252B3F;
}
```

Connectors between dots are a 36px × 1px `bg-line` element (`<div class="w-9 h-px bg-line"></div>`). Step labels sit to the right of each dot, not below.

### 6.8 Workflow nodes

Used in the Campaign Builder canvas. Base node:

```css
.node {
  background: #131826;
  border: 1px solid #252B3F;
  border-radius: 10px;
  padding: 8px 12px 8px 10px;
  display: flex; align-items: center; gap: 10px;
  min-width: 180px;
  box-shadow: 0 4px 14px -8px rgba(0,0,0,0.6);
}
.node-icon {
  width: 26px; height: 26px;
  border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.node-title { font-size: 12px; color: #F1F3F8; font-weight: 500; line-height: 1.1; }
.node-sub   { font-size: 11px; color: #6B7280; line-height: 1.2; margin-top: 2px; }
```

Color-code by type:

| Node type | Icon bg | Icon color | Title color |
|---|---|---|---|
| Start | `mint/15` | `mint` | `mint` |
| Send Email | `indi-500/15` | `indi-400` | `indi-300` |
| Send SMS | `cyan2/15` | `cyan2` | `cyan2` |
| Wait / Delay | `amber2/15` | `amber2` | `amber2` |
| If/Else / Split | `viol-500/15` | `viol-400` | `viol-300` |
| Add Tag / Tag ops | `mint/15` | `mint` | `mint` |
| Update Field / Data | `cyan2/15` | `cyan2` | `cyan2` |
| Add to List | `indi-500/15` | `indi-400` | `indi-300` |
| End | `rose/15` | `rose` | `rose` |

Selected node: add a 2px indigo ring + colored shadow:

```html
<div class="node" style="box-shadow: 0 0 0 2px #6366F1, 0 8px 24px -8px rgba(99,102,241,0.55);">
  …
</div>
```

Nodes with a "+" insertion handle add a small floating dot at the bottom-center:

```html
<div class="absolute -bottom-2 left-1/2 -translate-x-1/2
            w-4 h-4 rounded-full bg-surface-2 border border-line
            flex items-center justify-center">
  <i data-lucide="plus" class="w-2 h-2 text-ink-mute"></i>
</div>
```

**Connectors.** Use a single absolute-positioned SVG behind the nodes. Stroke `#3a4360`, 1.4px width, with a triangular arrowhead marker. Yes/No labels are `<text>` elements at branch joints — `mint` for Yes, `rose` for No.

### 6.9 Avatars

```css
.avatar {
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px;
  font-weight: 600;
}
```

Sizes: `w-7 h-7` (header chip), `w-8 h-8` (top-bar), `w-9 h-9` (sidebar footer), `w-10 h-10` (chat threads), `w-12 h-12` (modal subject card).

Color via tinted background + matching text:

| Initial | Background | Text |
|---|---|---|
| Default user | `bg-indi-500/25` | `text-indi-300` |
| Alt user | `bg-amber2/20` | `text-amber2` |
| Lead/contact | `bg-mint/20` | `text-mint` |
| Highlighted | `bg-rose/20` | `text-rose` |

Keep alpha at `/20` or `/25` so avatars feel like badges, not buttons.

### 6.10 Modal

```css
.backdrop {
  background: rgba(5,7,15,0.62);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
```

Modal container: `rounded-2xl bg-surface border border-line/70`, max-width `600–640px`, with the deep ambient shadow:

```css
box-shadow: 0 30px 80px -20px rgba(0,0,0,0.7);
```

Standard modal anatomy — header, body, footer, with the footer separated by a `border-t border-line/60`:

```html
<div class="absolute inset-0 backdrop z-30 flex items-start justify-center pt-[110px]">
  <div class="w-full max-w-[640px] rounded-2xl bg-surface border border-line/70
              shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 pt-5 pb-4">
      <h3 class="text-[18px] font-semibold text-white">Send Bulk SMS</h3>
      <button class="text-ink-mute hover:text-white p-1">
        <i data-lucide="x" class="w-[18px] h-[18px]"></i>
      </button>
    </div>
    <!-- Body -->
    <div class="px-6 pb-5 space-y-5">…</div>
    <!-- Footer -->
    <div class="px-6 py-4 border-t border-line/60 flex items-center justify-between">
      <!-- left: secondary toggle -->
      <!-- right: cancel + primary -->
    </div>
  </div>
</div>
```

Modals open ~110px from the top (not centered) so the header and the page context behind remain visible.

### 6.11 Sparklines

A 12-month or 4-week trendline on a metric card.

```css
.spark { stroke: #818CF8; stroke-width: 1.5; fill: none; }
```

```html
<svg viewBox="0 0 120 32" class="w-full h-8">
  <polyline class="spark" points="0,24 12,20 24,22 36,16 48,18 60,12 72,14 84,8 96,10 108,4 120,6"/>
</svg>
```

When a sparkline pairs with a positive delta, optionally fill underneath with the indigo at `0.08` alpha. Negative deltas: switch the stroke to `#EF4444`.

### 6.12 Donut chart

Used on SMS Activity card. CSS-only via conic-gradient + radial mask:

```css
.donut-wrap { width: 200px; height: 200px; position: relative; }
.donut-wrap .ring {
  position: absolute; inset: 0;
  border-radius: 999px;
  background: conic-gradient(
    #6366F1 0% 98.2%,
    #EF4444 98.2% 99.8%,
    #F59E0B 99.8% 100%
  );
  -webkit-mask: radial-gradient(circle, transparent 56%, black 57%);
          mask: radial-gradient(circle, transparent 56%, black 57%);
}
```

The center label sits absolute-positioned over the ring:

```html
<div class="absolute inset-0 flex flex-col items-center justify-center">
  <div class="text-[22px] font-semibold text-white tabular-nums">312,430</div>
  <div class="text-[11px] text-ink-mute">Total Sent</div>
</div>
```

When porting to Next.js, swap this for Recharts' `<PieChart>` with `innerRadius={56} outerRadius={100}` — the visual stays identical.

---

## 7. Iconography

Lucide is the only icon library used. ~17px is the default UI size; ~14px for sub-nav and inline icons; ~22–28px for hero/decorative.

### 7.1 Sizes

| Context | Size class | Pixel |
|---|---|---|
| Sidebar nav | `w-[17px] h-[17px]` | 17 |
| Sub-nav, inline body | `w-3.5 h-3.5` | 14 |
| Buttons | `w-4 h-4` | 16 |
| Workflow node | `w-3.5 h-3.5` | 14 (inside 26px chip) |
| Metric card chip | `w-[17px] h-[17px]` | 17 (inside 36px chip) |
| Hero / dropzone | `w-7 h-7` or `w-8 h-8` | 28–32 |

### 7.2 Color coding by category

| Category | Color | Icons |
|---|---|---|
| Email / sequences | `indi-400` | `mail`, `send`, `layers`, `list-plus` |
| SMS / messaging | `cyan2` | `message-square` (channel-coded throughout) |
| Voice / calls | `indi-400` (or status-dependent) | `phone`, `phone-call`, `mic`, `mic-off` |
| AI / Emma | `indi-300` / `viol-400` | `sparkles`, `bot`, `wand-2` |
| Conditional / branching | `viol-400` | `git-fork`, `git-branch`, `target` |
| Time / waiting | `amber2` | `clock`, `calendar`, `hourglass` |
| Success / data add | `mint` | `check`, `plus`, `tag`, `check-square` |
| Warning / pending | `amber2` | `alert-triangle`, `clock` |
| Destructive / removal | `rose` | `x`, `trash-2`, `tag` (when remove) |
| Data ops | `cyan2` | `edit-3`, `database`, `webhook` |
| Navigation / chrome | `ink-mute` (default) | `chevron-down`, `chevron-right`, `arrow-left`, `more-horizontal` |

### 7.3 Lucide as React

Porting `<i data-lucide="mail">` to Next.js:

```tsx
import { Mail } from 'lucide-react';
<Mail className="w-[17px] h-[17px] text-indi-400" />
```

Tree-shaking handles the rest — only imported icons ship.

---

## 8. Motion

Motion is used sparingly. The product feels calm because most things don't move.

### 8.1 Transition defaults

```
property         | duration | easing
-----------------|----------|--------
hover bg/text    | 120ms    | linear (default)
border on focus  | 120ms    | linear
modal enter      | 180ms    | cubic-bezier(0.2, 0, 0, 1)
sidebar collapse | 220ms    | cubic-bezier(0.2, 0, 0, 1)
```

Tailwind's `transition` (150ms) is fine as a default; reach for `transition-colors duration-150` on most interactive elements.

### 8.2 Pulse

The only continuous animation in the product. Used on live indicators (active call dot, "Emma is typing" indicator, unread badge when freshly arrived).

```css
@keyframes softpulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
.pulse-dot { animation: softpulse 2.2s ease-in-out infinite; }
```

The 2.2s cycle is deliberately slow — faster reads as anxious.

### 8.3 Loading states

- **Skeleton** — use `bg-surface-2` rectangles with no shimmer. Static skeletons feel calmer; shimmer feels gimmicky.
- **Inline spinner** — Lucide `loader-2` with `animate-spin` (1s linear), 14–16px, in `indi-400` or `ink-mute` depending on emphasis.
- **Progress bar** — 4px height, `bg-line` track, `bg-indi-500` fill, `rounded-full`. Animate width with 300ms ease-out.

---

## 9. Patterns by screen archetype

How the components above compose into the eight reference screens. Use these as templates for new screens.

### 9.1 AI conversation surface (Home, Conversations, Nurture, Live Call)

- Sidebar (default 220px or Smart Views 260px).
- Main column with chat thread or hero orb centered.
- Right rail (280–320px) with status panel: Today's Summary, AI Agent state, Meeting Booked confirmation, or Lead Details.
- Composer at the bottom of the main column when chat is interactive — `surface-4` background, suggestion chips above the input.

### 9.2 Data dashboard (Pipeline, SMS Dashboard)

- Sidebar (220px).
- 56px top bar with screen title left, help/notif/avatar right.
- Metric cards row: 4–5 cards, equal width (`grid-cols-4` or `grid-cols-5`). Each card 96px tall, `flex items-start justify-between`, label + big number left, icon chip right.
- Below: 2-col or 3-col content grid with tables and charts.

### 9.3 Multi-step form (A2P Registration)

- Sidebar (compliance variant with sub-nav).
- 56px top bar with back arrow + screen name.
- Page title + subtitle.
- Stepper row.
- Stacked form sections, each in a `rounded-xl` card with section header, subtitle, and field grid.
- Footer toolbar with Cancel left, Save Draft + Next right.
- Right info rail (320px) with explanatory copy + acknowledgment checkboxes.

### 9.4 Builder / canvas (Campaign Builder)

- Top header (60px) — back link + breadcrumb + draft badge left, tab pills center, action buttons right.
- Three-column body: Actions sidebar (220px), zoomable canvas (flex-1), Properties panel (280px).
- Canvas has its own micro-chrome: zoom controls top-left, status toggle top-right, minimap bottom-left.
- The canvas grid uses `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)` with `background-size: 22px 22px` for the dotted texture.

---

## 10. Accessibility

Dark UIs have specific failure modes. Rules to keep contrast working:

1. **Body text on `surface` must be `ink-mute` (`#9CA3AF`) or lighter** — `#9CA3AF` on `#131826` is 5.6:1, passing WCAG AA. `ink-dim` (`#6B7280`) is only 3.8:1 — use it for tertiary metadata only, never for body copy.
2. **Placeholder text uses `ink-faint` (`#4B5468`) — 2.4:1.** This fails AA but is acceptable for placeholders since they're transient. Never style real content this dim.
3. **Focus rings are visible.** `.input:focus` gets a 1px `indi-600` border. For keyboard-only buttons, add `focus-visible:ring-2 focus-visible:ring-indi-500 focus-visible:ring-offset-2 focus-visible:ring-offset-page`.
4. **Color is never the only signal.** Status cells pair the colored word ("Sent") with text. Workflow node types pair color with an icon and a label. Pipeline columns pair the column color with a count.
5. **Tap targets are 36px minimum.** Sidebar nav items at `py-2.5 px-3` give 40px. Icon-only buttons at `p-2` with a 17px icon give 33px — bump to `p-2.5` for primary nav use.
6. **Reduced motion.** Wrap `.pulse-dot` and any future animations in `@media (prefers-reduced-motion: no-preference)`.

---

## 11. Drop-in Tailwind config

Copy this block into `tailwind.config.ts` when porting to Next.js:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page:    '#0A0F1C',
        surface: { DEFAULT: '#131826', 2: '#1A2034', 3: '#202740', 4: '#161B2C' },
        line:    { DEFAULT: '#252B3F', 2: '#2C334A', 3: '#1F2538' },
        ink:     { DEFAULT: '#F1F3F8', mute: '#9CA3AF', dim: '#6B7280', faint: '#4B5468' },
        indi:    { 300: '#A5B4FC', 400: '#818CF8', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA' },
        viol:    { 300: '#C4B5FD', 400: '#A78BFA', 500: '#8B5CF6' },
        mint:    '#10B981',
        rose:    '#EF4444',
        amber2:  '#F59E0B',
        cyan2:   '#06B6D4',
      },
      fontFamily: {
        sans:     ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono:     ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        wordmark: ['var(--font-audiowide)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        softpulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.55' },
        },
      },
      animation: {
        softpulse: 'softpulse 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

Add the fonts via `next/font` in `app/layout.tsx`:

```tsx
import { Geist, Geist_Mono, Audiowide } from 'next/font/google';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
const audiowide = Audiowide({ subsets: ['latin'], weight: '400', variable: '--font-audiowide' });
```

The custom CSS classes (`.orb`, `.donut-wrap`, `.btn-primary`, `.btn-ghost`, `.vignette`, `.node`, `.input`, `.step-dot`, `.backdrop`, `.wordmark`) go into `app/globals.css` after the `@tailwind` directives.

---

## 12. Component inventory (porting checklist)

When rebuilding in Next.js, this is the order to extract things into reusable components:

1. **`<Sidebar variant="default | smart-views | compliance | sms">`** — single component, prop-driven nav config.
2. **`<TopBar title?, breadcrumb?, actions?>`** — 56px height, slot-based.
3. **`<Card>`, `<CardHeader>`, `<CardBody>`, `<CardFooter>`** — composable, uses the default `rounded-xl border-line/60 bg-surface/50`.
4. **`<Button variant="primary | ghost | icon | destructive" size="sm | md">`** — wraps the four button styles.
5. **`<Input>`, `<Textarea>`, `<Select>`, `<Checkbox>`** — port shadcn/ui versions with the token overrides above.
6. **`<MetricCard label, value, delta?, icon, sparkline?>`** — used 9+ times, biggest reuse win.
7. **`<Stepper steps, current>`** — A2P-style horizontal stepper.
8. **`<WorkflowNode type, title, subtitle, selected?>`** — reads `type` to pick color coding.
9. **`<Avatar initials, color, size>`** — initials + tinted bg.
10. **`<Modal title, footer, children>`** — backdrop + container, used for Bulk SMS and any future modal.
11. **`<Orb size="sm | md | lg" rings?>`** — the signature.
12. **`<Donut data, total, label>`** — wraps Recharts `PieChart`.

Once these twelve exist, every screen in the deck assembles in 50–150 lines of JSX.

---

## 13. Don'ts

A short list of things that break the system on sight:

- Don't use pure white (`#FFFFFF`) for text — it's harsh against the warm-cool surfaces. Always `ink` (`#F1F3F8`).
- Don't use Tailwind's default `slate`, `gray`, or `neutral` palettes — they'll subtly clash with the custom `surface`/`line` tokens.
- Don't add a second accent color (no green CTAs, no orange pills) — keep status colors functional.
- Don't increase border thickness above 1px on cards. 2px is reserved for selected/focused states.
- Don't stack glows. One glowing element per screen.
- Don't use uppercase outside of the eyebrow / section-label pattern — table headers and small caps are the *only* uppercase usage.
- Don't mix radii on adjacent elements — a `rounded-xl` card containing a `rounded-md` button is fine; a `rounded-lg` card next to a `rounded-2xl` card is not.
- Don't animate page transitions. The product feels fast because it doesn't perform speed.

---

*This document describes the system as built in `revra-dashboards.html`. When updating, update the HTML reference and this file in lockstep — the HTML is the canonical implementation, this Markdown is the canonical explanation.*
