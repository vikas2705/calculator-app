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
