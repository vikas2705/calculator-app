# ShortcutsOverlay

A modal listing every keyboard shortcut as kbd chips with a muted description, opened by the ? key or the help button.

Centred over `scrim`, card max 480px, `glass-strong`, `radius-card`, padding 22px, title `Keyboard shortcuts` (20px, 600). `role="dialog" aria-modal="true"`; focus goes to the close button, Tab stays inside, Esc or a click outside closes and returns focus to where it was.

Kbd chip: min 30×30, padding 0 8px, `radius-kbd`, `key-digit` fill, 1px `glass-border`, inset highlight plus a 2px bottom edge, 14px weight 500.

Keyboard input anywhere flashes the matching on-screen key for 140ms. Ignore shortcuts while Ctrl, Cmd or Alt is held; let Enter and Space activate a focused button normally. Esc closes an open overlay or sheet before it clears.
