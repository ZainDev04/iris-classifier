# Design system — Iris // KNN

Implementation-ready UI guidance for the Iris classifier web app, derived from the **Glitch** design brief and adapted where the brief conflicts with WCAG 2.2 AA.

## 1. Context and goals

**Intent in one sentence:** a dark, glitch-flavoured, single-page ML demo that stays fast, keyboard-first and legible on every screen from 320 px up.

| | |
|---|---|
| Surface | Single-page Flask app, no build step |
| Audience | Recruiters, interviewers, fellow students — people who skim first and dig later |
| Theme | Dark only (`color-scheme: dark`) |
| Fonts | System Helvetica Neue stack; no web-font requests |
| Accessibility target | WCAG 2.2 AA |

## 2. Tokens and foundations

All tokens live on `:root` in `web/static/css/style.css`. Components **must** reference tokens, never raw values.

### Colour

| Token | Value | Use |
|---|---|---|
| `--color-surface-base` | `#000000` | Page background (brief: `surface.base`) |
| `--color-surface-raised` | `#0a0a0a` | Panels, alternate sections |
| `--color-surface-overlay` | `#121212` | Hover fills, tooltips, toasts |
| `--color-surface-inset` | `#050505` | Inputs, code blocks |
| `--color-border` | `#262626` | Default hairlines |
| `--color-border-strong` | `#545454` | Input borders, emphasised dividers (brief's `text.primary`, repurposed — see §7) |
| `--color-text-primary` | `#f2f2f2` | Body and headings — 18.1 : 1 on black |
| `--color-text-secondary` | `#a6a6a6` | Supporting copy — 8.6 : 1 |
| `--color-text-muted` | `#8a8a8a` | Labels, captions — 5.9 : 1 |
| `--color-accent` | `#82b440` | Brand green (brief: `surface.muted`) — 7.6 : 1 on black, 4.6 : 1 for black text on it |
| `--color-accent-strong` | `#6f9a37` | Hard shadow colour (brief: `shadow.1`) |
| `--color-link` | `#a8d46b` | Links — 10.4 : 1 |
| `--color-danger` | `#ff7070` | Errors — 6.4 : 1 |
| `--color-warning` | `#f2b544` | Out-of-range warnings — 11 : 1 |
| `--color-setosa` | `#74a636` | Categorical series 1 |
| `--color-versicolor` | `#d9566f` | Categorical series 2 |
| `--color-virginica` | `#2f8fd6` | Categorical series 3 |

The three species colours were checked with a CVD validator (OKLab ΔE) on the black surface: lightness band, chroma floor, protan/deutan/tritan separation and normal-vision floor all pass. Colour is never the only carrier of identity — every series also has a text label or legend entry.

### Typography

| Token | Value |
|---|---|
| `--font-primary` | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| `--font-mono` | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` — numbers, code, axis ticks |
| `--text-xs / sm / md / lg / xl` | 12 / 14 / 16 / 20 / 26 px |
| `--text-2xl` | `clamp(28px, 4vw, 40px)` — section titles |
| `--text-display` | `clamp(34px, 8vw, 84px)` — hero only |
| Base | 16 px / 400 / 1.5 line-height |

### Spacing, radius, shadow, motion

- Spacing scale (5 px base): `--space-1…20` = 5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100 px. No off-scale values.
- `--radius-xs: 4px` on everything rectangular; `--radius-pill` for the switch only.
- `--shadow-1: 0 2px 0 0 rgb(111 154 55)` — the brief's hard offset shadow, used on primary buttons and step numbers; `--shadow-2` (4 px) on hover.
- Motion: `--motion-fast 150ms`, `--motion-base 250ms`, `--motion-slow 600ms`, `--ease-out cubic-bezier(.16,1,.3,1)`. Glitch effects use `steps(2, end)`.
- Touch target: `--tap: 44px` minimum on every interactive element.

### Breakpoints

| Range | Layout changes |
|---|---|
| ≤ 360 px | Stat strip 1 column |
| ≤ 480 px | Full-width hero buttons, 2-column preset chips, compact confusion matrix |
| ≤ 767 px | Hamburger navigation, single-column grids, smaller nav height, tighter tables |
| ≤ 1023 px | Predict grid and API cards single column, pipeline steps 2 columns |
| ≥ 1440 px | Container widens to 1280 px |

Every layout **must** render with zero horizontal overflow at 320, 360, 390, 412, 430, 480, 767 and 1024 px.

## 3. Component rules

Every interactive component defines **default, hover, focus-visible, active, disabled, loading and error** states. Focus-visible is one global rule: 2 px accent outline, 3 px offset. Hover styles never replace focus styles.

### Button (`.btn`)

- Anatomy: label, optional arrow/spinner. Min-height 44 px, uppercase 14 px bold, 4 px radius.
- Variants: `btn-primary` (accent fill, black text, hard shadow) · `btn-ghost` (transparent, strong border).
- States: hover lifts 2 px and deepens the shadow; active drops 1 px and removes the shadow; disabled 45 % opacity + `not-allowed`; loading (`.is-loading`) shows the spinner, sets `aria-busy`, blocks pointer events.
- Keyboard: Enter/Space. Pointer and touch identical. Long labels wrap; never truncate.

### Range + number field (`.field`)

- Anatomy: label, number input with unit, range slider with min/max bounds, error line.
- The two inputs are always in sync; the number input is the source of truth for the API call.
- Range fill uses `--pct` set from JS (CSSOM only — CSP-safe). Thumb 20 px, hit area 44 px tall.
- Keyboard: arrows step 0.1, Page Up/Down and Home/End native. `aria-valuetext` announces "x.x centimetres".
- Error state: `.is-invalid` red border, message in `role="alert"`, submit refuses and focuses the first invalid field. Values outside the dataset range are **warnings** (rendered in the result), not errors — only ≤ 0 or > 30 cm are rejected.
- Disabled: 40 % opacity, `not-allowed`.

### Preset chip (`.chip`)

- 40 px tall, species dot + label. Hover raises 1 px with accent border; active state (`.is-active`) shows an inset accent ring until any slider changes.
- Chips wrap to two columns below 480 px.

### Switch (`.switch`)

- Native checkbox visually hidden; track/thumb are presentational. Focus ring drawn on the track via `:focus-visible + .switch-track`.
- Toggling shows a toast confirming the mode.

### Result panel (`.panel-result`)

- `data-state` = `empty | loading | result | error`. Exactly one `[data-view]` is visible.
- The panel has a visually hidden `role="status"` live region announcing "Predicted X with Y % confidence" or "Prediction failed".
- Loading pulses the border; the previous result stays visible until the new one arrives (no flash of empty).
- Error view includes the server message and a retry button.
- Species name flashes the glitch treatment once when the class changes (not on every prediction).

### Navigation (`.nav`)

- Sticky, blurred, 60 px (56 px mobile). Below 768 px a `button[aria-expanded][aria-controls]` toggles the menu.
- Escape closes the menu and returns focus to the toggle; clicking outside closes it; every link closes it.
- Anchored sections use `scroll-padding-top` so headings are never hidden under the bar.

### Tabs (`.tabs`)

- `role="tablist"` / `role="tab"` / `role="tabpanel"`; roving `tabindex`; Left/Right/Home/End move and activate.

### Charts (`.chart`)

- Inline SVG sized to the container width so type is always rendered at true size; re-rendered on resize (debounced 200 ms).
- Marks: 2 px lines, ≥ 8 px markers, 2 px surface ring on scatter dots, 2 px gaps between grouped bars, rounded data-ends only.
- Hover layer on every chart: crosshair + tooltip on the line chart, per-mark tooltip on dots and bars. Tooltip is `role="tooltip"`, pointer-events none, kept inside the viewport.
- Each chart container has an `aria-label` describing what it shows and, for the scatter, the current input position. Legends are real lists.
- Text inside charts uses text tokens; series colour appears only on marks and swatches.

### Tables

- Real `<table>` with `scope`d headers, wrapped in `.table-scroll` for horizontal overflow on narrow screens. Mono, tabular numerals for numbers.

### Confusion matrix (`.cm`)

- CSS grid with `role="table"` → `role="row"` (`display: contents`) → `columnheader | rowheader | cell`. Cells are focusable and carry a full `aria-label` ("2 virginica samples predicted as versicolor").
- Sequential fill: one hue (accent) scaled by `--v` from 0.05 to 0.7 alpha.

### Toast, tooltip, skip link

- Toast: `role="status"`, auto-dismiss 2.6 s, error variant with danger border.
- Skip link is the first focusable element and becomes visible on focus.

## 4. Accessibility acceptance criteria

Each item is pass/fail in implementation:

1. Every text/background pair in the token table measures ≥ 4.5 : 1 (≥ 3 : 1 for ≥ 24 px or bold ≥ 19 px text). *Check with a contrast tool against `#000`, `#0a0a0a`, `#121212`.*
2. Tab through the whole page: every control reachable in visual order, every one shows the accent focus ring, none traps focus.
3. With a screen reader, run a prediction: the result is announced once, without the visible panel duplicating it.
4. Sliders report a value in centimetres, not a bare number.
5. The mobile menu toggle exposes `aria-expanded` that flips on toggle, and Escape closes it.
6. Tabs respond to arrow keys and only the selected tab is in the tab order.
7. The confusion matrix reads as a table with headers; Lighthouse `aria-required-children/parent` pass.
8. `prefers-reduced-motion: reduce` removes count-ups, glitch layers, reveal transitions and bar/line draw-in.
9. All targets ≥ 44 × 44 px on touch.
10. Page has one `<h1>`, sequential headings, `lang`, meta description and a skip link.
11. Lighthouse accessibility = 100 on mobile and desktop.

## 5. Content and tone

Concise, confident, implementation-focused. Sentence case everywhere except uppercase micro-labels.

| Do | Don't |
|---|---|
| "Predict species" | "Submit" |
| "Sepal length 9.5 cm is outside the training range (4.3–7.9 cm); confidence may be unreliable." | "Warning: bad value" |
| "Could not reach the server. Check your connection and try again." | "Error 500" |
| "The 5 nearest neighbours — 4 of 5 voted versicolor" | "Neighbors" |

Numbers use tabular monospaced digits. Units are always spelled out on first use ("centimetres") and abbreviated after ("cm").

## 6. Anti-patterns (prohibited)

- Raw hex values in component CSS; new spacing or font sizes outside the scale.
- Removing or recolouring the focus ring; `outline: none` without a replacement.
- Colour-only meaning (species, status) without a label, icon or pattern.
- Inline `style=""` attributes or inline `<script>` — they break the CSP.
- Third-party fonts, analytics or CDN scripts.
- Static chart images — every chart is derived from the API.
- Dual y-axes, rainbow or cycled palettes, a number on every data point.
- Animations that run for users who asked for reduced motion.

## 7. Deviations from the brief and migration notes

| Brief token | Brief value | Decision |
|---|---|---|
| `color.text.primary` | `#545454` | 2.4 : 1 on black — fails AA. Used for **borders** (`--color-border-strong`); body text uses `#f2f2f2`. |
| `color.text.secondary` | `#0000ee` | 2.2 : 1 on black. Replaced by `--color-link #a8d46b`. |
| `color.text.tertiary` | `#ffffff` | Softened to `#f2f2f2` to reduce halation on pure black. |
| `font.family.primary` | Helvetica Neue | Kept, via the system stack — no font download. |
| `radius.xs`, `shadow.1`, `space.*` | as specified | Kept verbatim. |

Migration from v1 (Inter / navy / light theme): all v1 class names were retired; legacy API routes (`/predict`, `/stats`) are preserved so old links work.

## 8. QA checklist

- [ ] `python -m pytest` green
- [ ] Lighthouse mobile + desktop: 4 × 100
- [ ] Widths 320 / 360 / 390 / 412 / 430 / 480 / 767 / 1024 / 1440: no horizontal scroll, no clipped controls
- [ ] Keyboard-only run-through: nav, sliders, presets, switch, submit, tabs, axis selects, copy buttons
- [ ] Screen-reader run-through of a prediction
- [ ] Reduced-motion mode: no animation
- [ ] Network offline: error view and retry work; charts fail gracefully with a toast
- [ ] Invalid input (`abc`, `-1`, `99`): inline error, no request sent
- [ ] Out-of-range input (`9.5` sepal length): prediction returned with a warning
- [ ] Browser console clean of errors and CSP violations
