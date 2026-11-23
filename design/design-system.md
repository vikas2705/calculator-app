# Calculator – Pastel Morning & Aurora Night

A frosted-glass phone-style calculator with two looks that share one layout: Pastel Morning is the light theme and Aurora Night is the dark theme. This document is the build spec. Follow it, and the token values in `tokens.json`, exactly.

## How to use this system (for Claude Code and other builders)

1. Read this README end to end, then `tokens.json`. Every colour, size, radius and shadow below is a token there, in two themes: `light` (Pastel Morning) and `dark` (Aurora Night).
2. Open the reference implementation at `assets/Reference/calculator-pastel-aurora.html`. It is a single self-contained HTML page that renders everything described here, so where this text and the file disagree, the file shows the intended result and the tokens give the exact values.
3. Each part of the UI has its own card under Components (GlassSurface, Display, Key, Keypad, HistoryPanel, IconButton, ShortcutsOverlay) with guidelines and a live preview in both themes.
4. The reference page is a visual prototype: its keypad only animates. A real build must also implement the behaviour in "Calculation behaviour" below. The four-way state switcher in the reference (Typing / Result / Error / Long number) exists only to preview states; leave it out of the product.

Expose tokens as CSS custom properties named exactly as the tokens (`--key-eq`, `--glass`, `--radius-key` …), with light values on `:root, [data-theme="light"]` and dark values on `[data-theme="dark"]`. Never hard-code a hex in a component.

## Themes

| | Light · Pastel Morning | Dark · Aurora Night |
| --- | --- | --- |
| Mood | Friendly and fresh: milky glass over a peach, lilac and baby-blue sunrise | Calm and futuristic: a deep night sky with slow glowing light |
| Ground | `linear-gradient(135deg, bg-gradient-1 0%, bg-gradient-2 50%, bg-gradient-3 100%)` | `radial-gradient(120% 90% at 50% 0%, bg-gradient-1 0%, bg-gradient-2 55%, bg-gradient-3 100%)` |
| Blobs | peach, lilac, baby blue at 0.75 | teal, violet, magenta at 0.6 |
| Equals | warm coral `#FF7A66`, soft coral lift | teal `#2DD4BF`, glowing |
| Operators | baby-blue glass, navy label | violet glass, lavender label |

Initial theme follows `prefers-color-scheme`. The sun/moon button (and the `t` key) switches; once the person switches by hand, that choice wins over the system setting for the session. Persisting it (localStorage) is fine in the real app. Set `<meta name="theme-color">` to `bg-base` of the active theme.

## Visual foundations

### Background

A fixed full-viewport layer behind everything (`position: fixed; inset: 0; z-index: -1`) painted with the theme's gradient, holding three blob circles:

| Blob | Size | Position | Fill | Drift (alternate, ease-in-out, infinite) |
| --- | --- | --- | --- | --- |
| 1 | 70vmax | top −28vmax, left −22vmax | `radial-gradient(circle, blob-1 0%, transparent 62%)` | 26s to `translate(14vmax, 10vmax) scale(1.12)` |
| 2 | 75vmax | bottom −32vmax, right −26vmax | same with `blob-2` | 32s to `translate(−12vmax, −9vmax) scale(1.08)` |
| 3 | 55vmax | top 25%, left 35% | same with `blob-3` | 38s to `translate(−16vmax, 6vmax) scale(.9)` |

Under `prefers-reduced-motion: reduce` the blobs do not animate (they still show).

### Glass recipe

Every surface (top bar, intro panel, calculator card, history panel, sheet, overlay card) is built the same way:

```css
.glass {
  background: var(--glass);            /* --glass-strong for top bar, sheet, overlay */
  -webkit-backdrop-filter: blur(26px) saturate(150%);
  backdrop-filter: blur(26px) saturate(150%);
  border: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 0 var(--glass-highlight), var(--shadow-glass);
}
```

Keys reuse the 1px `glass-border` and the inset highlight, but not the blur (they sit on the card's blur).

### Colour roles

Digits are neutral glass (`key-digit`). Operators (÷ × − + xʸ) take the secondary accent (`key-op`). Functions (AC, ⌫, %, √, ±) take the quiet tint (`key-fn`). Equals is the only solid fill on screen (`key-eq` with `shadow-eq`), so it is always the first thing the eye finds. The equals colour is also the result highlight (`result-text`, `result-surface`). Focus uses `focus-ring` everywhere.

All text sits on glass, never directly on the gradient, which is what keeps contrast at WCAG AA in both themes. Do not lighten `text-faint` further to make the preview line look fainter; fade it with size instead.

### Typography

One family, Figtree (Google Fonts, weights 400/500/600/700), with the fallback stack in `tokens.json`. All numbers in the display and history use tabular figures: `font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1`. Styles are listed under Typography in `tokens.json`. Sentence case everywhere, no all-caps labels.

### Shape, space and elevation

Radii step down with hierarchy: 28 card, 24 panel, 22 top bar, 20 key and display, 14 icon buttons, 12 segments and text buttons, 9 kbd. Every interactive target is at least 44×44px. Elevation comes only from `shadow-glass`, `shadow-eq` and the inset highlight; no other shadows.

## Layout

```
≥760px                                   <760px
┌──────────── top bar ─────────────┐     ┌──── top bar ────┐
│ Calculator            ☀/☾   ?    │     │ Calculator ☀ ?  │
└──────────────────────────────────┘     ├─────────────────┤
┌──────── intro panel ─────────────┐     │ intro panel     │
│ Pastel Morning                   │     ├─────────────────┤
│ mood line                        │     │ ⟲   display     │
└──────────────────────────────────┘     │ keypad          │
┌─ calculator ─┐  ┌── history ──┐        │                 │
│   display    │  │ History Clear│        └─────────────────┘
│   keypad     │  │ rows…        │        history = bottom sheet
└──────────────┘  └──────────────┘        opened by ⟲
```

- Page: `max-width: 1180px`, centred, padding 18px 16px 56px (12px sides under 400px). No horizontal scrolling from 360px to 1440px.
- Top bar: floating and sticky, `top: calc(env(safe-area-inset-top) + 10px)`, width `calc(100% − 20px)`, max 1180px, `radius-bar`, `glass-strong`, z-index 20. Brand on the left; theme toggle and help on the right.
- Intro panel: max-width 812px, centred, theme name (`title`) and mood line (`body`, max 46ch, `text-muted`).
- Stage grid: one column (max 420px) under 760px; `minmax(0, 400px) minmax(0, 320px)` from 760px; `420px 360px` with a 32px gap from 1024px. History is `position: sticky; top: 120px` on wide layouts.
- Safe areas: `viewport-fit=cover`, `:root` padded by `env(safe-area-inset-top/bottom)`, the sheet adds `env(safe-area-inset-bottom)` to its bottom padding.

## Components

### Calculator card

`glass`, `radius-card`, padding `clamp(14px, 4vw, 22px)`. Contains the history icon button (narrow only, absolutely placed top-left), the display, then the keypad.

### Display (three lines, right aligned)

1. Expression, `display-expression`, `text-muted`: `12 + 7 ×`
2. Number, `display-number`, `text`: `4`
3. Live preview, `display-preview`, `text-faint`: `= 76`

Minimum height 196px, padding 52px 8px 14px, `radius-key`, aligned to the bottom. It is an `aria-live="polite"` region.

States:

- Typing: the three lines above.
- Result (after =): expression becomes `12 + 7 × 4 =`, the number becomes the answer in `display-result` and `result-text` (dark theme adds `shadow-result-text`), preview is empty, and the display gets `result-surface` plus `inset 0 0 0 1px glass-border`.
- Error: expression shows what was attempted (`8 ÷ 0`); the number line is replaced by a small circled-i icon and `Cannot divide by zero.` in `display-error` (wraps, does not shrink); the preview line becomes the next step, `Press AC or type a number to start again.` (15px, `text-muted`, wraps). No red, no shaking.
- Long numbers: never overflow. Shrink to fit: start at clamp(48px, 23% of the display width, 80px) and step down 2px until `scrollWidth ≤ clientWidth`, floor 18px. Expression line: 18px down to 12px, then ellipsis. Re-fit on state change, resize, and after fonts load. Example: `1,234,567,890.12345`.

Numbers use thousands separators (`1,234,567.5`) and the true minus sign `−` (U+2212).

### Keypad

A 4-column grid, `grid-auto-rows: clamp(58px, 15vw, 72px)`, gap `clamp(8px, 2.4vw, 12px)`:

| | col 1 | col 2 | col 3 | col 4 |
| --- | --- | --- | --- | --- |
| row 1 | AC (fn) | ⌫ (fn) | % (fn) | ÷ (op) |
| row 2 | √ (fn) | xʸ (op) | ± (fn) | × (op) |
| row 3 | 7 | 8 | 9 | − (op) |
| row 4 | 4 | 5 | 6 | + (op) |
| row 5 | 1 | 2 | 3 | = (eq, spans rows 5–6) |
| row 6 | 0 (spans 2 columns) | | . | |

Every key is a real `<button type="button">` with an `aria-label` (`All clear`, `Delete last digit`, `Percent`, `Divide`, `Square root`, `Power`, `Change sign`, `Multiply`, `Subtract`, `Add`, `Equals`, `Decimal point`, digits by value).

Key states: hover swaps to the `*-hover` token; pressed (`:active` or a 140ms `is-pressed` class set from the keyboard) applies `scale(.94)` and `key-digit-pressed` (fn/op/eq use `filter: brightness(.92–.94)`); transitions 120ms transform, 150ms background.

### History

A list of finished calculations, newest first. Each row: expression (`history-expression`, `text-muted`) above the result (`history-result`), right aligned, rows divided by a 1px `glass-border` line, `radius-control`. Header: `History` (`panel-title`) and a `Clear` text button.

- ≥760px: a side panel next to the calculator (`glass`, `radius-panel`, max-height `calc(100vh − 150px)`, list scrolls).
- <760px: a bottom sheet (`glass-strong`, radius 28px 28px 0 0, max-height 72vh) opened by the history icon button on the card. It slides up in 280ms `cubic-bezier(.2, .8, .2, 1)` over a `scrim`; a 44×5px handle sits on top; a close button appears in its header. It is `role="dialog" aria-modal="true"`, traps Tab, closes on Esc, scrim tap or close, and returns focus to the history button. When closed it is `inert`.
- Empty state: `No calculations yet. Finish a calculation with = and it appears here.`
- Clear empties the list and disables itself.

### Top-bar controls

Icon buttons: 44×44, `radius-control`, `key-digit` fill, `glass-border`. Theme toggle shows the sun in dark (action: go light) and the moon in light; its `aria-label` says what it will do (`Switch to light theme (Pastel Morning)`). The help button shows `?` and opens the shortcuts overlay.

### Shortcuts overlay

A modal (`role="dialog" aria-modal="true"`) centred over `scrim`, card max 480px, `glass-strong`, `radius-card`. Focus moves to its close button, Tab stays inside, Esc or a click outside closes and returns focus. Content, as kbd chips plus a muted description:

| Keys | Action |
| --- | --- |
| 0–9, . | Type a number |
| + − * / | Add, subtract, multiply, divide |
| ^ | Power |
| % | Percent |
| r | Square root |
| n | Change sign (±) |
| Enter or = | Equals |
| Backspace | Delete last digit |
| Esc | Clear (AC); closes an open sheet or overlay first |
| ↑ ↓ ← → | Move focus between keys on the keypad grid |
| h | Show or hide history |
| t | Switch light and dark theme |
| ? | Show this help |

Keyboard input flashes the matching on-screen key. Ignore shortcuts when Ctrl, Cmd or Alt is held, and let Enter/Space activate a focused button normally.

## Calculation behaviour (real app)

- Evaluate left to right as entered, with no operator precedence: `2 + 3 × 4 = 20`, `12 + 7 × 4 = 76`.
- The preview line shows the running left-to-right result after each operand.
- Pressing an operator right after another replaces it.
- xʸ is a binary operator (`2 ^ 10 = 1,024`).
- √ applies to the current entry immediately (`√144 = 12`).
- % turns the current entry into a fraction of 100 (`250 × 18% = 45`). A number typed right after it multiplies (`32% 2` reads `32% × 2` = 0.64).
- ± flips the sign of the current entry.
- ⌫ removes the last typed character; AC clears everything.
- Errors (division by zero, √ of a negative, overflow) show the Error state with plain, specific wording, e.g. `Cannot divide by zero.`, `Cannot take the square root of a negative number.`
- Every `=` adds a row to history.
- Round to 12 significant digits for display to avoid float noise.

## Accessibility

- Text meets WCAG AA (4.5:1, 3:1 at 24px+) on glass in both themes; the token pairs above are chosen for that.
- Every interactive element: visible `:focus-visible` outline `3px solid var(--focus-ring)`, offset 3px, and an `aria-label`.
- Decorative SVG gets `aria-hidden="true"`; icon-only buttons are labelled.
- Respect `prefers-reduced-motion` (stop the blobs, drop transitions).
- Large tap targets: keys ≥58px tall, controls ≥44px.

## Voice and copy

Plain, short, sentence case. Errors say what happened and what to do, never apologise. No login, no ads, no marketing copy.

## Don'ts

Do not add extra operations (no trig, memory or scientific panel). Do not put text straight on the gradient. Do not use a solid fill on any key except equals. Do not let numbers overflow or wrap in Typing or Result. Do not add gradients, glows or shadows beyond the tokens.
