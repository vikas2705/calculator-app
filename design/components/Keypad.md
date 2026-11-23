# Keypad

The 4×6 key grid inside the calculator card, with equals spanning two rows and zero spanning two columns.

```
AC  ⌫   %   ÷
√   xʸ  ±   ×
7   8   9   −
4   5   6   +
1   2   3   =
0   0   .   =
```

Grid: `repeat(4, minmax(0, 1fr))`, `grid-auto-rows: clamp(58px, 15vw, 72px)`, gap `clamp(8px, 2.4vw, 12px)`. The card around it is `glass`, `radius-card`, padding `clamp(14px, 4vw, 22px)`, display above with a 14px gap. No other keys: no memory, trig or scientific panel.

Arrow keys move focus around the grid from a focused key: one step per press, no wrap-around at the edges, and a two-cell key counts as one stop (up from 0 is 1, left from = is 3). Tab still visits every key in reading order. Enter or Space presses the focused key.
