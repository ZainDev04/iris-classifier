# Design system for Iris // KNN

UI rules for the Iris classifier web app. They come from the Glitch design brief, adjusted where the brief conflicts with WCAG 2.2 AA.

## 1. Context and goals

In one sentence: a dark, glitch-styled, single-page ML demo that stays fast, works from the keyboard and reads well on every screen from 320 px up.

| | |
|---|---|
| Surface | Single-page Flask app, no build step |
| Audience | Recruiters, interviewers and other students. They skim first and dig later. |
| Theme | Dark only (`color-scheme: dark`) |
| Fonts | System Helvetica Neue stack, no web-font requests |
| Accessibility target | WCAG 2.2 AA |

## 2. Tokens and foundations

All tokens are defined on `:root` in `web/static/css/style.css`. Components must reference tokens, never raw values.

### Colour

| Token | Value | Use | Contrast on black |
|---|---|---|---|
| `--color-surface-base` | `#000000` | Page background (brief: `surface.base`) | |
| `--color-surface-raised` | `#0a0a0a` | Panels, alternate sections | |
| `--color-surface-overlay` | `#121212` | Hover fills, tooltips, toasts | |
| `--color-surface-inset` | `#050505` | Inputs, code blocks | |
| `--color-border` | `#262626` | Default hairlines | |
| `--color-border-strong` | `#545454` | Input borders, stronger dividers. This is the brief's `text.primary`, reused for borders (see section 7). | |
| `--color-text-primary` | `#f2f2f2` | Body and headings | 18.1 : 1 |
| `--color-text-secondary` | `#a6a6a6` | Supporting copy | 8.6 : 1 |
| `--color-text-muted` | `#8a8a8a` | Labels, captions | 5.9 : 1 |
| `--color-accent` | `#82b440` | Brand green (brief: `surface.muted`) | 7.6 : 1, and 4.6 : 1 for black text on it |
| `--color-accent-strong` | `#6f9a37` | Hard shadow colour (brief: `shadow.1`) | |
| `--color-link` | `#a8d46b` | Links | 10.4 : 1 |
| `--color-danger` | `#ff7070` | Errors | 6.4 : 1 |
| `--color-warning` | `#f2b544` | Out-of-range warnings | 11 : 1 |
| `--color-setosa` | `#74a636` | Categorical series 1 | |
| `--color-versicolor` | `#d9566f` | Categorical series 2 | |
| `--color-virginica` | `#2f8fd6` | Categorical series 3 | |

The three species colours were checked with a colour-vision-deficiency validator (OKLab delta E) against the black surface. They pass the lightness band, the chroma floor, the protan, deutan and tritan separation checks and the normal-vision floor. Colour is never the only carrier of identity: every series also has a text label or a legend entry.

### Typography

| Token | Value |
|---|---|
| `--font-primary` | `"Helvetica Neue", Helvetica, Arial, sans-serif` |
| `--font-mono` | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` for numbers, code and axis ticks |
| `--text-xs / sm / md / lg / xl` | 12 / 14 / 16 / 20 / 26 px |
| `--text-2xl` | `clamp(28px, 4vw, 40px)` for section titles |
| `--text-display` | `clamp(34px, 8vw, 84px)` for the hero only |
| Base | 16 px, weight 400, line-height 1.5 |

### Spacing, radius, shadow, motion

- Spacing scale on a 5 px base: `--space-1` to `--space-20` are 5, 10, 15, 20, 25, 30, 40, 50, 60, 80 and 100 px. No off-scale values.
- `--radius-xs: 4px` on everything rectangular. `--radius-pill` is for the switch only.
- `--shadow-1: 0 2px 0 0 rgb(111 154 55)` is the brief's hard offset shadow, used on primary buttons and step numbers. `--shadow-2` (4 px) is the hover state.
- Motion: `--motion-fast` 150 ms, `--motion-base` 250 ms, `--motion-slow` 600 ms, `--ease-out cubic-bezier(.16,1,.3,1)`. Glitch effects use `steps(2, end)`.
- Touch target: `--tap: 44px` minimum on every interactive element.

### Breakpoints

| Range | Layout changes |
|---|---|
| up to 360 px | Stat strip in 1 column |
| up to 480 px | Full-width hero buttons, preset chips in 2 columns, compact confusion matrix |
| up to 767 px | Hamburger navigation, single-column grids, shorter nav bar, tighter tables |
| up to 1023 px | Predict grid and API cards in a single column, pipeline steps in 2 columns |
| 1440 px and up | Container widens to 1280 px |

Every layout must render with zero horizontal overflow at 320, 360, 390, 412, 430, 480, 767 and 1024 px.

## 3. Component rules

Every interactive component defines default, hover, focus-visible, active, disabled, loading and error states. Focus-visible is one global rule: a 2 px accent outline with a 3 px offset. Hover styles never replace focus styles.

### Button (`.btn`)

Anatomy: label, optional arrow or spinner. Minimum height 44 px, uppercase 14 px bold, 4 px radius. Two variants: `btn-primary` (accent fill, black text, hard shadow) and `btn-ghost` (transparent, strong border).

Hover lifts the button 2 px and deepens the shadow. Active drops it 1 px and removes the shadow. Disabled is 45 % opacity with a `not-allowed` cursor. Loading (`.is-loading`) shows the spinner, sets `aria-busy` and blocks pointer events. Enter and Space activate it. Pointer and touch behave the same. Long labels wrap and are never truncated.

### Range and number field (`.field`)

Anatomy: label, number input with unit, range slider with min and max bounds, error line. The two inputs stay in sync. The number input is the source of truth for the API call.

The range fill is driven by a `--pct` custom property set from JavaScript through the CSSOM, which keeps it CSP-safe. The thumb is 20 px and the hit area 44 px tall. Arrow keys step 0.1; Page Up, Page Down, Home and End work natively. `aria-valuetext` reads "x.x centimetres".

An invalid value adds `.is-invalid` (red border) and writes the message into a `role="alert"` element. Submit refuses and focuses the first invalid field. Values outside the dataset range are warnings shown in the result, not errors. Only values of 0 or below, or above 30 cm, are rejected. Disabled is 40 % opacity with `not-allowed`.

### Preset chip (`.chip`)

40 px tall, species dot plus label. Hover lifts it 1 px with an accent border. `.is-active` shows an inset accent ring until any slider changes. Chips wrap to two columns below 480 px.

### Switch (`.switch`)

The native checkbox is visually hidden; the track and thumb are presentational. The focus ring is drawn on the track through `:focus-visible + .switch-track`. Toggling shows a toast that confirms the mode.

### Result panel (`.panel-result`)

`data-state` is one of `empty`, `loading`, `result` or `error`, and exactly one `[data-view]` is visible. A visually hidden `role="status"` live region announces "Predicted X with Y % confidence" or "Prediction failed". Loading pulses the border while the previous result stays visible, so there is no flash of an empty panel. The error view shows the server message and a retry button. The species name runs the glitch animation once when the class changes, not on every prediction.

### Navigation (`.nav`)

Sticky, blurred, 60 px tall (56 px on mobile). Below 768 px a `button[aria-expanded][aria-controls]` toggles the menu. Escape closes the menu and returns focus to the toggle. Clicking outside closes it, and so does every link. Anchored sections use `scroll-padding-top` so headings never land under the bar.

### Tabs (`.tabs`)

`role="tablist"`, `role="tab"` and `role="tabpanel"` with a roving `tabindex`. Left, Right, Home and End move and activate.

### Charts (`.chart`)

Inline SVG sized to the container width so text is always drawn at true size, re-rendered on resize (debounced 200 ms). Lines are 2 px, markers at least 8 px, scatter dots carry a 2 px surface ring, grouped bars have 2 px gaps, and only the data end of a bar is rounded.

Every chart has a hover layer: crosshair plus tooltip on the line chart, a per-mark tooltip on dots and bars. The tooltip is `role="tooltip"`, has `pointer-events: none` and is kept inside the viewport. Each chart container carries an `aria-label` describing what it shows; the scatter label includes the current input position. Legends are real lists. Text inside charts uses text tokens; series colour appears only on marks and swatches.

### Tables

Real `<table>` elements with `scope`d headers, wrapped in `.table-scroll` for horizontal overflow on narrow screens. Numbers use the mono font with tabular digits.

### Confusion matrix (`.cm`)

A CSS grid with `role="table"`, `role="row"` (`display: contents`), then `columnheader`, `rowheader` and `cell`. Cells are focusable and carry a full `aria-label` such as "2 virginica samples predicted as versicolor". The fill is one hue (the accent) scaled by `--v` from 0.05 to 0.7 alpha.

### Motion

Motion has two jobs here: show data arriving, and answer the user's actions. Nothing loops except the periodic glitch on the hero title and the ripple on the query point, and nothing moves on its own once the page has settled.

On load and scroll:

- Hero title: JavaScript wraps each word in a clip mask (`.w > .w-in`), the words rise with a 90 ms stagger, then the glitch fires once. The `h1` itself does not fade or move, so the glitch layers stay aligned with the text.
- Sections and panels use `.reveal`, which fades up on entering the viewport with a 60 ms stagger between siblings. Stat values count up.
- Scatter dots sweep in left to right the first time the panel is on screen (delay is proportional to the x position, 600 ms across the width). The K-curve line draws itself and histogram bars grow from the baseline in the same way.
- Confusion matrix cells pop in one at a time (40 ms apart, scale 0.92 to 1), then the diagonal flashes once so the eye lands on the correct predictions.
- The nav takes an accent border once the hero is scrolled past. A 2 px underline slides between Predict, Performance, Pipeline and API to mark the section in view; on mobile it becomes a 3 px inset bar on the active link.

On interaction:

- Dragging a slider colours the number box and its digits accent for 220 ms after each change.
- A new prediction runs a thin line of the species colour along the top edge of the result panel and holds the border in that colour for 900 ms. The species name glitches only when the class changes.
- Buttons lift on hover with the hard offset shadow, the copy button confirms with a label change, and the switch thumb slides.

All of it uses the four motion tokens and `--ease-out`. Every entrance runs once (`IntersectionObserver` disconnects after the first hit) and clears its inline delays afterwards so hover transitions are not slowed down. Under `prefers-reduced-motion: reduce` the JavaScript skips the word split, the sweeps and the flashes, and the CSS shows everything in its final state.

### Toast, tooltip, skip link

The toast is `role="status"`, dismisses itself after 2.6 s, and has an error variant with a danger border. The skip link is the first focusable element and becomes visible on focus.

## 4. Accessibility acceptance criteria

Each item is pass or fail in implementation.

1. Every text and background pair in the token table measures at least 4.5 : 1 (3 : 1 for text at 24 px or larger, or bold at 19 px or larger). Check with a contrast tool against `#000`, `#0a0a0a` and `#121212`.
2. Tab through the whole page. Every control is reachable in visual order, every one shows the accent focus ring, and none traps focus.
3. With a screen reader, run a prediction. The result is announced once, and the visible panel does not duplicate it.
4. Sliders report a value in centimetres, not a bare number.
5. The mobile menu toggle exposes `aria-expanded`, it flips on toggle, and Escape closes the menu.
6. Tabs respond to arrow keys, and only the selected tab is in the tab order.
7. The confusion matrix reads as a table with headers, and Lighthouse's `aria-required-children` and `aria-required-parent` audits pass.
8. `prefers-reduced-motion: reduce` removes the count-ups, the glitch layers, the reveal transitions, the hero word entrance, the scatter sweep, the confusion matrix pop-in and flash, the result panel sweep, and the bar and line draw-in.
9. All targets are at least 44 by 44 px on touch.
10. The page has one `<h1>`, sequential heading levels, a `lang` attribute, a meta description and a skip link.
11. Lighthouse accessibility is 100 on mobile and desktop.

## 5. Content and tone

Plain sentences. Sentence case everywhere except uppercase micro-labels.

| Do | Don't |
|---|---|
| "Predict species" | "Submit" |
| "Sepal length 9.5 cm is outside the training range (4.3 to 7.9 cm); confidence may be unreliable." | "Warning: bad value" |
| "Could not reach the server. Check your connection and try again." | "Error 500" |
| "The 5 nearest neighbours (4 of 5 voted versicolor)" | "Neighbors" |

Numbers use tabular monospaced digits. Units are spelled out on first use ("centimetres") and abbreviated after that ("cm").

## 6. Anti-patterns

These are prohibited.

- Raw hex values in component CSS, or new spacing and font sizes outside the scale.
- Removing or recolouring the focus ring, or `outline: none` without a replacement.
- Colour as the only carrier of meaning (species, status) without a label, icon or pattern.
- Inline `style=""` attributes or inline `<script>`; they break the CSP.
- Third-party fonts, analytics or CDN scripts.
- Static chart images; every chart comes from the API.
- Dual y-axes, rainbow or cycled palettes, or a number on every data point.
- Animation that runs for users who asked for reduced motion.

## 7. Deviations from the brief and migration notes

| Brief token | Brief value | Decision |
|---|---|---|
| `color.text.primary` | `#545454` | 2.4 : 1 on black, which fails AA. Used for borders (`--color-border-strong`). Body text is `#f2f2f2`. |
| `color.text.secondary` | `#0000ee` | 2.2 : 1 on black. Replaced by `--color-link #a8d46b`. |
| `color.text.tertiary` | `#ffffff` | Softened to `#f2f2f2` to reduce halation on pure black. |
| `font.family.primary` | Helvetica Neue | Kept, through the system stack, so nothing is downloaded. |
| `radius.xs`, `shadow.1`, `space.*` | as specified | Kept as written. |

Migrating from v1 (Inter, navy, light theme): all v1 class names were retired. The v1 API routes `/predict` and `/stats` still work so old links do not break.

## 8. QA checklist

- [ ] `python -m pytest` passes
- [ ] Lighthouse mobile and desktop: 100 in all four categories
- [ ] Widths 320, 360, 390, 412, 430, 480, 767, 1024 and 1440 px: no horizontal scroll, no clipped controls
- [ ] Keyboard-only run-through: nav, sliders, presets, switch, submit, tabs, axis selects, copy buttons
- [ ] Screen-reader run-through of a prediction
- [ ] Reduced-motion mode: no animation
- [ ] Network offline: the error view and retry work; charts fail with a toast
- [ ] Invalid input (`abc`, `-1`, `99`): inline error, no request sent
- [ ] Out-of-range input (`9.5` sepal length): prediction returned with a warning
- [ ] Browser console has no errors and no CSP violations
