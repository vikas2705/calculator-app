# Key

A keypad button in one of four roles: digit (neutral glass), function (quiet tint), operator (secondary accent) or equals (the solid hero).

| Role | Keys | Fill / label | Label style |
| --- | --- | --- | --- |
| Digit | 0–9, . | `key-digit` / `key-digit-text` | `key-digit-label` |
| Function | AC, ⌫, %, √, ± | `key-fn` / `key-fn-text` | `key-fn-label` |
| Operator | ÷ × − + xʸ | `key-op` / `key-op-text` | `key-op-label` |
| Equals | = | `key-eq` / `key-eq-text`, `shadow-eq` | `key-eq-label` |

All keys: `<button type="button">` with an `aria-label`, `radius-key`, 1px `glass-border`, inset `glass-highlight`, height from the keypad row (58–72px). Hover uses the role's `*-hover` token. Pressed (`:active`, or `is-pressed` for 140ms when triggered from the keyboard): `scale(.94)`; digits switch to `key-digit-pressed`, the other roles darken with `filter: brightness(.92–.94)`. Focus: `3px solid var(--focus-ring)`, offset 3px. ⌫ is a stroke icon (1.7px), 26px.
