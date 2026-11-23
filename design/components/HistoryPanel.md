# HistoryPanel

Past calculations, newest first, with a Clear button: a side panel on wide screens and a bottom sheet on phones.

Rows: expression (`history-expression`, `text-muted`) over result (`history-result`), right aligned, tabular figures, divided by 1px `glass-border`. Header: `History` (`panel-title`) and a `Clear` text button (44px tall, `radius-segment`).

- ≥760px: beside the calculator; `glass`, `radius-panel`, sticky at top 120px, max-height `calc(100vh − 150px)`, list scrolls.
- <760px: bottom sheet opened by the history icon on the calculator card. `glass-strong`, radius 28px 28px 0 0, max-height 72vh, a 44×5px handle, a close icon button, over `scrim`. Slides up in 280ms `cubic-bezier(.2,.8,.2,1)` (instant with reduced motion). `role="dialog" aria-modal="true"`, focus trapped, Esc / scrim / close dismiss and return focus; `inert` while closed.
- Empty: `No calculations yet. Finish a calculation with = and it appears here.` Clear disables itself.
