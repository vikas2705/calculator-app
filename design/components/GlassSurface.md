# GlassSurface

The frosted surface every panel is made of: translucent fill, 26px backdrop blur with 150% saturation, a 1px light border, an inset top highlight and a layered soft shadow.

Use `glass` for content surfaces (calculator card, intro panel, desktop history) and `glass-strong` for chrome that floats over moving content (sticky top bar, mobile history sheet, shortcuts overlay card).

```css
background: var(--glass);
-webkit-backdrop-filter: blur(26px) saturate(150%);
backdrop-filter: blur(26px) saturate(150%);
border: 1px solid var(--glass-border);
box-shadow: inset 0 1px 0 var(--glass-highlight), var(--shadow-glass);
```

Radii by role: card 28 (`radius-card`), panel 24 (`radius-panel`), top bar 22 (`radius-bar`). Text always sits on glass, never on the bare gradient.
