# Display

The three-line readout at the top of the calculator: expression so far, the number being typed, and a live preview of the running result.

Lines, all right aligned with tabular figures: expression (`display-expression`, `text-muted`), number (`display-number`, `text`), preview (`display-preview`, `text-faint`). Min height 196px, padding 52px 8px 14px, `radius-key`, `aria-live="polite"`.

States:

- Typing: `12 + 7 ×` / `4` / `= 76`.
- Result: `12 + 7 × 4 =` / `76` in `display-result` + `result-text` (dark adds `shadow-result-text`) on `result-surface` with an inset 1px `glass-border`. Preview empty.
- Error: attempted expression, then a circled-i icon and `Cannot divide by zero.` (`display-error`, wraps), then `Press AC or type a number to start again.` No red.
- Long number: never overflow or wrap. Start at clamp(48px, 23% of width, 80px), step down 2px until it fits, floor 18px. Expression shrinks 18→12px, then ellipsis. Re-fit on state change, resize and font load.

Format with thousands separators and the true minus sign (−).
