# Calculator — Build Plan

This is the single source of truth for the build. Follow it in order and tick items off as they are done.
If something in this plan turns out to be wrong or impossible, **stop, tell the user, and update this file**
rather than silently doing something different.

Source documents:
- PRD: the problem statement PDF (kept outside the repository); its requirements are copied verbatim in §1.
- Decisions: agreed with the user in conversation (recorded in §2)

---

## 1. PRD requirements (verbatim checklist)

Every item below must be satisfied. §11 maps each one to the step that delivers it.

**Objective:** full-stack calculator, **React frontend** + **backend microservice**. The frontend consumes the backend API
to perform arithmetic. Focus on clean design, maintainable code, testable architecture.

| ID | Requirement (from PRD) |
|---|---|
| F1 | Operations: Addition, Subtraction, Multiplication, Division |
| F2 | Optional ops: Exponentiation, Square Root, Percentage *(user chose: include all three)* |
| F3 | Frontend: intuitive UI for entering input and displaying results |
| F4 | Frontend: input validation and error handling |
| F5 | Frontend: responsive design (basic mobile support) |
| B1 | Backend: expose REST endpoints for calculator operations |
| B2 | Backend: validate input and handle edge cases (division by zero, invalid data) |
| B3 | Backend: return results in JSON |
| N1 | Clean, readable, idiomatic code (frontend and backend) |
| N2 | Unit tests covering key functionality for **both** layers |
| N3 | Documentation: setup instructions, API usage, design rationale |
| N4 | Dockerfile for full-stack deployment *(optional in PRD, **required** by user)* |
| C1 | Frontend: React, TypeScript |
| C2 | Backend: Go |
| D1 | Frontend + backend code in one Git repository *(built locally; the user creates the repository and pushes at the end)* |
| D2 | README: setup instructions, how to run frontend and backend, API call examples, design decisions/assumptions |
| D3 | Unit tests **and coverage report** |
| D4 | Dockerfile to run frontend + backend together |
| I1 | Prioritise correctness, clarity, maintainability over extra features |
| I2 | Share all prompts used → `PROMPTS.md` *(the prompts used to plan, design, build and improve the project; GitHub setup and small layout tweaks left out)* |

---

## 2. Decisions agreed with the user

| # | Decision |
|---|---|
| U1 | Operations = exactly the PRD list: add, subtract, multiply, divide, power, square root, percentage. **No others.** |
| U2 | Input style = **phone-style** (immediate execution, left-to-right, no operator precedence). `2 + 3 × 4 = 20`. |
| U3 | **Live preview**: while typing, show the running result in a faded colour below the input, updated **instantly on every keystroke** (no debounce). On `=`, the result becomes large and highlighted. |
| U4 | Percentage is simple: `x%` → `x / 100`. `50%` → `0.5`. |
| U5 | Visual style = **frosted glass** (glassmorphism), aesthetic, unique, easy on the eyes. Chosen design: the user's "Pastel Morning & Aurora Night" design system (§6.6). |
| U6 | Light + dark theme with a toggle. |
| U7 | History tape, saved in the browser (`localStorage`), survives refresh, has a "Clear" button. |
| U8 | Full keyboard-only operation. |
| U9 | Works on mobile, tablet and laptop. |
| U10 | No authentication, no accounts. |
| U11 | Docker only (no hosting). User experience: install Docker → run one command → open `http://localhost:8080`. |
| U12 | Swagger (OpenAPI) documentation for the API. |
| U13 | Local only while building: Claude does **not** run `git init`. The user sets up Git, creates the repository and pushes. |
| U14 | Clean and maintainable, nothing extra. |
| U15 | Thorough testing, including hunting for unknown edge cases. |
| U16 | The 5 earlier recommendations are accepted: simple monorepo + stdlib Go server; single `/calculate` endpoint + `/health`; pure-function state logic; history tape + keyboard + themes + screen-reader announcements; single Docker image where Go serves the UI. |
| U17 | (after testing) **Display while typing:** the bright main line shows the whole expression (`12 + 5`); the faded line below shows its running result (`= 17`). After `=`, the result is bright and highlighted, with the finished expression small above it. Replaces the U3 layout where the big line held only the current number. |
| U18 | **Backspace never gets stuck:** it deletes typed digits, then steps back over the operator and the previous number (`12 + 5` → `12 +` → `12` → `1` → `0`). After a result it returns to the expression for editing. On `√9` / `18%` it undoes the √ / % (back to `9`). After an error it goes back to the input that failed (`8 ÷ 0`) so it can be fixed. |
| U19 | **A lone √ or % is finished by `=`** and saved to history (`9 r =` → `√9 = 3`). Nothing is saved before `=`. A plain number alone (typed, recalled or ±) with `=` is still a no-op. |
| U20 | **`t` switches light/dark theme.** `h` also closes the history sheet when it is open. |
| U22 | **History hidden until asked for, on every screen size.** The history button (top-left of the display) and `h` show/hide it. Wide screens: the calculator sits centred alone; opening history slides it left and fades the panel in beside it (non-modal, typing continues, recalling a row keeps it open; closes with the button, `h` or its ×). Narrow screens: bottom sheet, as before. **No page scrolling on laptops/tablets:** key height also follows the window height (never below the 44px touch target). Replaces "history = side panel always visible ≥760px". |
| U21 | **√ pressed before a number waits for it:** `12 +` √ 9 → `12 + √9` (= 15); also at the very start (√ 9 → `√9`). √ after a number still applies to it (`9` √ → `√9`). Replaces "applies to the running total". Same idea for `±` before a number (`12 +` ± 5 → `12 + −5`); `%` before a number does nothing (it belongs after a number). With only `√`/`−` so far, `%`, a second `√`, operators and `=` do nothing. |
| U23 | **Number keys show a clear press,** like the other keys: `key-digit-pressed` is darker than the key in light mode and brighter in dark mode (it was a barely visible opacity drop). **Arrow keys move focus around the keypad** grid (no wrap; a two-cell key is one stop); Tab order is unchanged, and Enter presses a key reached with the arrows. |
| U24 | **A number typed right after `%` multiplies it,** like phone calculators: `32 % 2` reads `32% × 2` = 0.64 (it used to drop `32%` and start a new number). The × is a real operator press, so it runs left to right (`12 + 32% 2` = `(12 + 0.32) × 2`) and Backspace undoes it. Only `%`: a digit after `√9` still starts a new number. `x% = x ÷ 100` (U4) is unchanged, so `32 + 2%` is still 32.02. |

---

## 3. Numeric rules (decided; verified with Node)

Both JavaScript `number` and Go `float64` are IEEE-754 doubles, so the limits are identical on both sides.

Verified facts:
- 15-digit integers are stored exactly (`999999999999999` → `999999999999999`).
- 16-digit integers are not (`9999999999999999` → `10000000000000000`).
- `(0.1 + 0.2).toPrecision(15)` → `0.3`; `(1.1 * 3).toPrecision(15)` → `3.3`.
- Largest double ≈ `1.7976931348623157e308`.

Rules:
1. **Input limit:** an entry may have at most **15 significant digits** (leading zeros and the `.` do not count) **and** at most
   **15 digits after the decimal point**. Key presses beyond this are ignored, and the number gives a brief "shake" (skipped under reduced motion).
2. **Display rounding:** every result is shown rounded to **15 significant digits**, with trailing zeros removed.
3. **Scientific notation** when `|x| >= 1e15` or `0 < |x| < 1e-9`, e.g. `1.23456789e+20`.
4. **Thousands separators** in the display (`1,234,567.5`), including while typing (a trailing `.` is preserved, e.g. `1,234.`). Negative numbers use the true minus sign `−` (U+2212).
5. **The backend accepts any finite double.** Chained results can legitimately exceed 15 digits (e.g. `1e20` reused as the next
   operand), so the 15-digit rule is an *input* rule enforced by the frontend only.
6. **Backend result checks:** `+Inf` / `-Inf` → `OVERFLOW` error. `NaN` → `UNDEFINED_RESULT` error. `-0` → normalised to `0`.
   This is required: Go's `encoding/json` cannot encode `Inf`/`NaN` and would otherwise fail.

---

## 4. Architecture

```
Browser ──(HTTP, same origin)──▶ Go server :8080
                                   ├─ POST /api/v1/calculate   → math
                                   ├─ GET  /health             → liveness
                                   ├─ GET  /docs               → Swagger UI
                                   ├─ GET  /openapi.json       → OpenAPI spec
                                   └─ GET  /*                  → built React app (static files)
```

- The frontend **never performs arithmetic**. It only edits the typed text (digits, `.`, ± sign toggle, backspace) and formats numbers for display.
  Every operation (including the live preview) is a backend call.
- Dev mode: Vite dev server proxies `/api` → `localhost:8080`, so **no CORS middleware** is needed anywhere.
- Production (Docker): one container. Go serves both the API and the built static files.

### Folder layout

```
calculator/
├─ docs/PLAN.md                    # this file
├─ README.md
├─ Dockerfile
├─ compose.yaml                    # enables `docker compose up --build`
├─ .dockerignore
├─ backend/
│  ├─ go.mod
│  ├─ cmd/server/main.go           # config (PORT, STATIC_DIR), wiring, graceful shutdown
│  ├─ internal/calculator/
│  │  ├─ calculator.go             # pure math: Operation type, Calculate(op, operands) (float64, error)
│  │  ├─ errors.go                 # typed domain errors
│  │  └─ calculator_test.go
│  ├─ internal/api/
│  │  ├─ handler.go                # POST /api/v1/calculate: decode → validate → calculate → JSON
│  │  ├─ response.go               # writeJSON / writeError helpers, error→status mapping
│  │  ├─ routes.go                 # mux: api, health, docs, static files
│  │  ├─ logging.go                # one log line per request
│  │  ├─ handler_test.go
│  │  ├─ routes_test.go
│  │  └─ fuzz_test.go
│  └─ internal/docs/
│     ├─ openapi.json              # hand-written OpenAPI 3 spec (embedded with go:embed)
│     ├─ swagger.html              # tiny page that loads Swagger UI
│     └─ docs.go
└─ frontend/
   ├─ package.json, vite.config.ts, tsconfig*.json, index.html
   └─ src/
      ├─ main.tsx, App.tsx
      ├─ api/calculatorApi.ts      # the ONLY module that calls fetch
      ├─ domain/
      │  ├─ entry.ts               # typed-input rules (digit limits, decimal, sign, backspace)
      │  ├─ format.ts              # number → display string (§3 rules 2–4)
      │  ├─ calculatorState.ts     # pure state + reducer (see §6)
      │  └─ operations.ts          # operation ids, symbols, key bindings
      ├─ hooks/
      │  ├─ useCalculator.ts       # reducer + serialized async action queue + live preview
      │  ├─ useKeyboard.ts         # global key → action mapping
      │  ├─ useHistory.ts          # localStorage-backed history
      │  └─ useTheme.ts            # light/dark, persisted
      ├─ components/
      │  ├─ Calculator.tsx, Display.tsx, Keypad.tsx, Key.tsx,
      │  ├─ HistoryTape.tsx, ThemeToggle.tsx, ShortcutsDialog.tsx
      └─ styles/
         ├─ tokens.css             # ALL colours, blur, radii, shadows (light + dark); palette swap = this file only
         └─ global.css
```

---

## 5. Backend specification

**Stack:** Go (version installed via Homebrew; record the exact version in the README). Standard library only for the server
(`net/http` with method-based route patterns, `encoding/json`, `log/slog`). No web framework.

### 5.1 Endpoint: `POST /api/v1/calculate`

Request:
```json
{ "operation": "divide", "operands": [10, 4] }
```
Success `200`:
```json
{ "result": 2.5 }
```
Error (always this shape):
```json
{ "error": { "code": "DIVISION_BY_ZERO", "message": "Cannot divide by zero." } }
```

| operation | operands | Math | Domain errors |
|---|---|---|---|
| `add` | 2 | a + b | OVERFLOW |
| `subtract` | 2 | a − b | OVERFLOW |
| `multiply` | 2 | a × b | OVERFLOW |
| `divide` | 2 | a ÷ b | DIVISION_BY_ZERO when b = 0; OVERFLOW |
| `power` | 2 | aᵇ | DIVISION_BY_ZERO when a = 0 and b < 0; UNDEFINED_RESULT when the result is NaN (e.g. (−8)^0.5); OVERFLOW |
| `sqrt` | 1 | √a | NEGATIVE_SQRT when a < 0 |
| `percentage` | 1 | a ÷ 100 | — |

### 5.2 Validation and error codes

| Situation | HTTP status | code |
|---|---|---|
| Body is not valid JSON, is empty, has trailing data after the object, or a value has the wrong type (e.g. `"5"`) | 400 | `INVALID_JSON` |
| Unknown field in the body | 400 | `INVALID_JSON` |
| `operation` missing or not one of the 7 | 400 | `INVALID_OPERATION` |
| `operands` missing, wrong count for the operation, or contains `null` | 400 | `INVALID_OPERANDS` |
| A number in the JSON is out of double range (e.g. `1e999`) | 400 | `INVALID_JSON` |
| Body larger than 1 KiB | 413 | `PAYLOAD_TOO_LARGE` |
| Domain errors (table in §5.1) | 422 | `DIVISION_BY_ZERO` / `NEGATIVE_SQRT` / `UNDEFINED_RESULT` / `OVERFLOW` |
| Wrong HTTP method | 405 | `METHOD_NOT_ALLOWED` (JSON body; verify how Go's mux handles 405 and wrap it if it returns plain text) |
| Unexpected internal failure | 500 | `INTERNAL_ERROR` (never leak internals) |

Implementation notes:
- `operands` decodes into `[]*float64`, so that `null` can be detected. Go silently turns `null` into `0` for a plain `float64`,
  which would make `[5, null]` look like `5 ÷ 0`.
- Use `json.Decoder` with `DisallowUnknownFields()`, then check that a second `Decode` returns `io.EOF` (this rejects trailing data).
- `http.MaxBytesReader` enforces the 1 KiB limit.
- Content-Type is not enforced (keep it simple). Document this in the README.

### 5.3 Other routes
- `GET /health` → `200 {"status":"ok"}`
- `GET /openapi.json` → the embedded spec
- `GET /docs` → Swagger UI page that loads `/openapi.json`. Swagger UI assets come from a CDN, **pinned to an exact version
  looked up at implementation time**. Documented limitation: the `/docs` page needs internet; the calculator itself does not.
- `GET /*` → static files from `STATIC_DIR`; unknown paths → 404. Unknown `/api/...` paths → JSON 404.
  (No SPA fallback: the app is a single page with no client-side routes, so a fallback would be dead code.)

### 5.4 Server
- Config from env: `PORT` (default `8080`), `STATIC_DIR` (default `./static`).
- `http.Server` with sensible read/write/idle timeouts.
- Graceful shutdown on SIGINT/SIGTERM (so `docker stop` is clean).
- One structured log line per request (method, path, status, duration).

---

## 6. Frontend specification

**Stack:** React + TypeScript + Vite. Testing: Vitest, React Testing Library, `@testing-library/user-event`, jsdom,
`@vitest/coverage-v8`. Styling: plain CSS (CSS Modules + `tokens.css`). **No** Tailwind, state library or UI kit.
Font: Figtree, self-hosted through `@fontsource/figtree` (so Docker works offline).
Exact package versions are whatever the Vite scaffold and npm install at build time.

### 6.1 State (pure, in `calculatorState.ts`)

```
accumulator: number | null       // running total, always a backend result (or the first typed operand)
pendingOp:   'add'|'subtract'|'multiply'|'divide'|'power' | null
entry:       string              // what the user is typing, e.g. "12.5"; "" when waiting for the next operand
expression:  string              // display line 1, e.g. "12 + 7 ×"
preview:     { value } | { error } | null   // faded live result
result:      number | null       // set after "=" → highlighted display
error:       { code, message } | null       // blocking error after "=" or a commit
status:      'idle' | 'busy'
previous:    state | null        // (U18) the state before the last committed step; Backspace returns to it
```
(This is the planning sketch. The built version is `frontend/src/domain/calculator.ts`, whose doc comments are authoritative.)

### 6.2 Key behaviour (each row becomes at least one test)

| Input | Behaviour |
|---|---|
| digit | Start: replaces `"0"`. After `=` or an error: starts a new calculation. Ignored if it would break the §3 limits (+ shake). |
| `.` | Adds a decimal point if there is none; an empty entry becomes `"0."`. |
| `±` | Toggles a leading `-` on the entry (text edit, not math). No effect on `"0"`. Right after an operator, starts the next number as negative (`12 + −`, U21). Under a waiting √ it flips the number under the root (`√−4`). After `=`, applies to the result (which becomes the new entry). |
| `⌫` | (U18) Typed number: removes the last character. The first number stops at `"0"`; a second operand disappears completely when its last digit goes (`12 + 5` → `12 +`). Otherwise it undoes the last committed step — an operator (`12 +` → `12`), a `√`/`%` (`12 + √9` → `12 + 9`), a recalled value, `=` (back to `12 + 5`), or the step that caused an error (back to `8 ÷ 0`). Implementation: every committed step keeps the state before it (`previous`), so undo needs no backend call. A number typed over a `√` result deletes back to the operator, not to the `√`. A waiting `√` or `−` (U21) is deleted as one piece each: `12 + √−4` → `12 + √−` → `12 + √` → `12 +`. |
| `AC` / `Esc` | Full reset (history is not touched). |
| `+ − × ÷ ^` | Empty entry and an op already pending → **replace** the op. No accumulator → accumulator = entry. Otherwise backend(acc op entry) → new accumulator. After `=`, continues from the result. At the very start, uses `0` as the first operand. |
| `%`, `√` | Unary, applied to the current number via the backend; the entry becomes the result (shown as `√144`, `18%`). (U21) With no number yet — right after an operator, or the opening `0` — `√` waits for the next number (`12 + √`, then 9 → `12 + √9`; calculated when the number is used: by an operator, `=`, another √/%, or the preview), and `%` does nothing. After `=` → applies to the result and starts a new calculation. |
| `=` | With acc + op + entry → backend call, show highlighted result, add `"12 + 7 × 4 = 76"` to history. A lone `√`/`%` (`√9`) → already calculated, so it is shown highlighted and saved as `"√9 = 3"` (U19). A plain number with no pending op → no-op. Right after an operator → no-op. **Repeated `=` → no-op** (decision; documented). |
| Preview | The preview is exactly what `=` would calculate now (e.g. `12 + √9` → √9, then 12 + 3), re-run **on every change**; the previous run is aborted. Show it faded as `= 76`. If it is a domain error (e.g. ÷ 0), show the error message faded. Values already known need no call (`12 + 5 ×` → `= 17`). |
| Error | Shown softly in the display. Next digit starts fresh; `AC` clears; `⌫` goes back to the input that failed (U18); other keys are ignored. |

**Ordering guarantee:** commit actions (operators, `%`, `√`, `=`) go through a **single serialized async queue**, so fast typing
can never apply actions out of order. Preview requests are separate and cancellable (`AbortController`). Stale preview
responses are discarded.

**Network failure / timeout (5 s):** Error state with "Cannot reach the calculator service." / "Check that it is running, then press = to try again." Keep the user's input; `=` retries.

### 6.3 Keyboard map

| Key | Action |
|---|---|
| `0`–`9`, `.` (`,` also accepted) | type |
| `+` `-` `*` `/` | operators |
| `^` | power |
| `%` | percentage |
| `r` | square root |
| `n` | ± sign toggle |
| `Enter` or `=` | equals |
| `Backspace` | delete |
| `Escape` or `Delete` | clear (AC); Escape closes an open sheet/dialog first |
| `↑` `↓` `←` `→` | move focus between keypad keys, following the grid (U23) |
| `h` | show/hide history (U22: side panel beside the calculator on wide screens, sheet on narrow). Works while the sheet is open, to close it. |
| `t` | switch light/dark theme (U20). Also works while the sheet is open. |
| `?` | shortcuts dialog |

- Keys pressed with Ctrl, Cmd or Alt are ignored, so browser shortcuts (copy, reload) still work.
- **Edge case:** pressing Enter on a focused button fires the native click. Rule implemented: if the user reached the button
  with **Tab** or the **arrow keys**, Enter activates that button (once). After a mouse click, or after typing calculator keys, Enter means `=`.
  (CSS `:focus-visible` could not be used: Chrome turns it on for the focused element as soon as any key is pressed —
  found by the real-browser check, where clicking 7 + 2 then Enter gave 22.)
- Every button is reachable with Tab, has a visible focus ring, and has an `aria-label` (e.g. "divide", "square root").
- Number-pad keys produce the same `key` values, so they work automatically.

### 6.4 Display
- (U17) While typing: line 1 (small) is empty; line 2 (large, bright) is the whole expression being built, e.g. `12 + 5`, `12 +`, `√9`; line 3 (faded) is its running result: the live preview from the backend (`= 17`), or a value already known without a call (`12 + 5 ×` → `= 17`, `√9` → `= 3`).
- After `=`: line 1 is the finished expression (`12 + 5 =`); line 2 is the result, large, bright and highlighted.
- Error: line 1 is the attempted expression, line 2 the message, line 3 "Press ⌫ to go back and fix it, or AC to start again."
- Long lines: the font size steps down to fit; never wrap. Past the smallest size, the **start** is cut off so the end (where typing happens) stays visible. The faded line is never larger than line 2.
- The result region has `aria-live="polite"` so screen readers announce results.

### 6.5 History tape
- `localStorage` key `calculator.history.v1`, newest first, **capped at 50 entries**.
- Every read/write is wrapped in try/catch. Corrupt or invalid stored data → start empty (never crash).
- Clicking (or pressing Enter on) an entry loads its result as the current entry.
- (U22) Hidden until the history button or `h` opens it. ≥760px: side panel beside the centred calculator. <760px: bottom sheet.

### 6.6 Visual design — follow the design system for how things LOOK
**User rule: the design artifact is for UI only. It never changes behaviour or any decision agreed in this plan. If they conflict, this plan wins.**

**Source of truth:** the user's design system "Calculator – Pastel Morning & Aurora Night", copied locally to:
- `design/design-system.md` — the build spec (layout, components, states, a11y, copy, don'ts)
- `design/tokens.json` — every colour (light + dark), type style, spacing, radius, shadow, effect
- `design/components/*.md` — per-component guidelines
- the reference HTML `calculator-pastel-aurora.html` (kept outside the repository) — the visual reference; where text and file disagree, the file shows intent and the tokens give values

Rules taken from it (non-exhaustive — always re-read `design/design-system.md` when building a component):
- Light = **Pastel Morning**, dark = **Aurora Night**. Initial theme follows `prefers-color-scheme`; manual choice wins and is saved in `localStorage`. `<meta name="theme-color">` = `bg-base`.
- Tokens become CSS custom properties **named exactly as the tokens** (`--key-eq`, `--glass`, `--radius-key` …): light on `:root, [data-theme="light"]`, dark on `[data-theme="dark"]`. No hex in components.
- Layout: floating sticky top bar (brand "Calculator" as the page h1, theme toggle, help) → stage (calculator + history). **No intro panel** (the theme-name / mood-line section was removed at the user's request). No prototype state switcher. Breakpoints 760px / 1024px. History = side panel ≥760px, bottom sheet <760px, both hidden until opened (U22).
- Keypad grid exactly as the design (AC ⌫ % ÷ / √ xʸ ± × / 7 8 9 − / 4 5 6 + / 1 2 3 = / 0 . =).
- Font Figtree 400/500/600/700, tabular numerals in display and history. Self-hosted via `@fontsource/figtree` (same face, works offline in Docker).
- Display: shrink-to-fit algorithm from the design (start clamp(48px, 23% width, 80px), −2px steps, floor 18px; expression 18→12px then ellipsis); thousands separators and true minus sign `−` (U+2212).
- Error state: circled-i icon + specific message + "Press ⌫ to go back and fix it, or AC to start again." (U18). No red.
- Keyboard input flashes the matching key for 140ms. Esc closes an open sheet/dialog before it clears.
- Reduced motion: blobs stop, transitions drop.

---

## 7. Swagger / OpenAPI
- Hand-written `openapi.json` (OpenAPI 3) documenting: `/api/v1/calculate` (request/response schemas, the operation enum,
  every error code with an example), and `/health`.
- Served at `/openapi.json`, browsable at `/docs`. Swagger UI pinned to `swagger-ui-dist@5.34.1`.
- A Go test asserts that the spec's operation enum matches the operations the calculator supports, so docs and code cannot drift apart.

---

## 8. Docker
- Multi-stage `Dockerfile`:
  1. Node (LTS, alpine) builds the frontend.
  2. Go (alpine) builds a static binary (`CGO_ENABLED=0`).
  3. Final small alpine image with the binary + `static/`. Runs as a non-root user. `EXPOSE 8080`.
     `HEALTHCHECK` uses busybox `wget` on `/health`.
- Base image tags are pinned to exact versions looked up at implementation time.
- `compose.yaml` maps `8080:8080`. User command: **`docker compose up --build`** → open `http://localhost:8080`.
- `.dockerignore` excludes `node_modules`, `dist`, coverage output, and so on.

---

## 9. Testing plan

### Backend (`go test ./...`)
- `calculator_test.go`, table-driven tests covering every operation:
  - normal values, negatives, decimals, very large and very small values
  - overflow (`1e308 * 10`), `0^-1`, `(-8)^0.5`, `0^0` (= 1), `sqrt(-1)`, `sqrt(0)`, `-0` normalisation
  - percentage of negatives and decimals
- `handler_test.go` (`httptest`): every row of §5.2, success cases for all 7 operations, response content type, error JSON shape.
- `routes_test.go`: `/health`, `/openapi.json`, `/docs`, static files, unknown `/api/*` → JSON 404, 405 JSON.
- `fuzz_test.go`: Go native fuzzing (built-in random-input testing) on the handler. Invariants: never a 5xx, the response is
  always valid JSON, and any `result` is finite. Run for a fixed time (e.g. 60 s) during the edge-case sweep.
- Coverage: `go test -coverprofile=coverage.out ./...` + `go tool cover -html` → `backend/coverage/`. Target ≥ 90% (aim, not a gate).

### Frontend (`npm test`)
- `entry.test.ts`: the 15-digit / 15-decimal limits, leading zeros, a second `.`, `±`, backspace down to `"0"`, `"-"` handling.
- `format.test.ts`: 15-significant-digit rounding (`0.1 + 0.2`), scientific notation thresholds, separators, `-0`, trailing `.`.
- `calculatorState.test.ts`: every row of §6.2.
- `calculatorApi.test.ts` (mocked `fetch`): success, each error code, malformed response, network failure, timeout, abort.
- `useHistory.test.ts`: persist, cap at 50, clear, corrupt `localStorage`, `localStorage` throwing.
- Component tests (`user-event`, mocked API), **keyboard only**: `12+7*4=` → `76`; preview updates per keystroke;
  ÷ 0 shows an error; `Esc` clears; Enter on a focused button doesn't double-fire; shortcuts dialog opens with `?`;
  theme toggle; history load and clear.
- Coverage: `vitest run --coverage` → `frontend/coverage/`.

### Final edge-case sweep (before declaring done)
1. Run the fuzz test.
2. Manually check, in the real browser:
   - rapid typing
   - holding a key down (auto-repeat)
   - backend stopped mid-session
   - every §5.2 error through `curl`
   - all breakpoints
   - keyboard-only full flow
   - light/dark
   - reduced motion
   - a long result
   - a refresh keeping history
3. Build and run the Docker image from scratch, then smoke-test it with `curl` and the browser.
4. Record anything new found, fix it, and add a regression test (a test that stops the same bug coming back).

---

## 10. Build order (with checkpoints)

| Step | Work | Done when |
|---|---|---|
| 0 | ~~Go installed~~ ✅ done: `go1.27.4 darwin/arm64` (Node `v24.18.0`, Docker `28.4.0` already present); scaffold the folders | `go version` works |
| ✅ 1 | `internal/calculator` + tests | all green |
| ✅ 2 | `internal/api` handler, errors, routes, health + tests + fuzz | all green |
| ✅ 3 | OpenAPI spec + `/docs` + spec-drift test | `/docs` renders locally |
| ✅ 4 | `cmd/server` (config, timeouts, graceful shutdown, logging) | `curl` examples work |
| **✓ Checkpoint A** | Show the user the API working (`curl` + Swagger) | user OK |
| ✅ 5 | Frontend scaffold (Vite React TS), Vitest setup, Vite proxy | `npm test` runs |
| ✅ 6 | `domain/` (`entry`, `format`, `operations`, `calculatorState`) + tests | all green |
| ✅ 7 | `api/calculatorApi.ts` + `useCalculator` (queue + preview) + tests | all green |
| ✅ 8 | Components + keyboard + history + theme + glass styling exactly per the design system (§6.6) | works in the browser at all breakpoints |
| ✅ 9 | Component tests (keyboard-only flows) | all green |
| **✓ Checkpoint B** | Show the user screenshots (mobile / tablet / laptop, light + dark) | user OK |
| ✅ 10 | Dockerfile, `compose.yaml`, `.dockerignore`; build + smoke test | `docker compose up --build` works |
| ✅ 11 | Coverage reports for both layers | reports generated |
| ✅ 12 | README (§12), PROMPTS.md up to date | complete |
| ✅ 13 | Final edge-case sweep (§9) | nothing open |

---

## 11. Requirement traceability

| PRD / user ID | Delivered in |
|---|---|
| F1, F2, U1, U4 | §5.1, steps 1–2 |
| F3, U2, U3 | §6.1–6.4, steps 6–8 |
| F4 | §3 rule 1, §6.2, §6.3 (frontend); §5.2 (backend) |
| F5, U9 | §6.5–6.6, step 8, checkpoint B |
| B1, B3 | §5.1, step 2 |
| B2 | §5.2, §3 rule 6, step 2, fuzz test |
| N1, U14, I1 | §4 layout, stdlib only, no extra libraries |
| N2, D3, U15 | §9, steps 1–2, 6–7, 9, 11, 13 |
| N3, D2 | §12, step 12 |
| N4, D4, U11 | §8, step 10 |
| C1 / C2 | §6 / §5 |
| D1, U13 | §4 layout; Git set up by the user |
| I2 | PROMPTS.md (prompts used to plan, design, build and improve the project) |
| U5, U6 | §6.6, `tokens.css` |
| U7 | §6.5 |
| U8 | §6.3 |
| U10 | nothing to build, deliberately |
| U12 | §7, step 3 |

---

## 12. README outline (PRD D2)
1. What this is (one paragraph + screenshot)
2. Quick start with Docker (`docker compose up --build` → http://localhost:8080)
3. Local development: prerequisites (Go version, Node version), run the backend, run the frontend
4. Running tests + generating coverage (both layers)
5. API: endpoint, request/response, error codes table, `curl` examples for every operation and some errors, Swagger link (`/docs`)
6. Keyboard shortcuts
7. Design decisions and assumptions:
   - why phone-style
   - why the backend does all the math
   - the float64 limits (§3)
   - the 15-digit limit
   - the error status codes
   - stdlib-only Go
   - same-origin serving (no CORS)
   - repeated `=` as a no-op
   - Swagger UI needs internet
   - the history cap
8. Project structure

---

## 13. Deviations from the original plan (logged as they happen)
- **Spec is JSON, not YAML** (`openapi.json`). Go's standard library cannot parse YAML, and the spec-drift test needs to
  read the spec. JSON keeps the backend dependency-free. Swagger UI renders both identically.
- **No SPA fallback.** There is only one page, so it is not needed.
- **405 handling verified:** Go's mux would return a plain-text 405, so `/api/v1/calculate` has an explicit JSON 405 handler (with an `Allow: POST` header).

- **Design system vs plan (resolved by the user):** the design artifact is for UI only; every agreed plan decision stands.
  Behaviour that had briefly followed the design was reverted to the plan: 15-digit rounding (kept), shake on refused digits (restored),
  `Delete` = AC (restored), no `t`/`x` shortcuts (removed), `√`/`%` after an operator apply to the running total (restored),
  `=` with no pending operator is a no-op (restored). Pure-UI items kept from the design: tokens, layout, copy, history rows as styled
  buttons. Prototype-only pieces dropped: state switcher, sample history. The intro panel was removed at the user's request.
  With the intro panel gone, the side panel's sticky offset changed from the design's 120px to 90px so it lines up with the calculator
  (verified: both tops at 110px at 820/1024/1440px).
- **Frontend build deviations:**
  1. `formatNumber` keeps the unrounded value when rounding to 15 digits would overflow (1.7976931348623157e308 rounded up is Infinity) — bug found by unit test.
  2. Dev/test tooling verified at build time: Vite 8.3.8, React 19.3.1, TypeScript 7.0.2, Vitest 5.1.1, jsdom 31.0.1.
  3. Docker base images pinned (looked up on Docker Hub): `node:24.18.0-alpine3.24` (= local Node), `golang:1.27.4-alpine3.24` (= local Go), `alpine:3.24.4`.

- **Bug fixes and changes after user testing:** U17–U20 added (display shows the whole expression; Backspace steps back; lone √/% finished by `=`; `t` theme shortcut).
  Bug found while reproducing the `h` report: the bottom sheet stayed `visibility: hidden` for the first moment of its slide-in, so
  focus could not move into it (it stayed on the page behind), and `h` could not close it because shortcuts were off while it was open.
  Fixed: visibility switches at once when opening; `h`/`t` stay active while the sheet is open. Verified in real Chrome.

- **Desktop layout (U22, user request):** history button shown at every width; the wide stage animates
  `grid-template-columns` from `420px 0px` to `420px 360px` (400/320 from 760px) while the panel fades in, and clips
  sideways (`overflow-x: clip`) so the closed panel cannot widen the page (a 94px sideways overflow at 820px was found and
  fixed this way). Keys: `clamp(44px, min(15vw, (100dvh − 455px) / 6), 72px)`, where 455px is everything on the page
  except the 6 key rows (measured). Space around the calculator (user request): 24px below the top bar (was 38px) and
26px at the bottom (was 56px), the same 50px total the key formula assumes. The design's 58px minimum key height gives way to
  the 44px touch target on short windows. Also fixed: every page scrolled by 10px because the top bar's margin was added
  on top of `body { min-height: 100vh }` (`display: flow-root` on body). Measured: no vertical or sideways scroll at
  1470×800, 1440×900, 1366×768, 1280×720, 1024×768, 820×1180, 768×1024, 390×844; a 375×667 phone still scrolls 29px
  at the 44px key minimum.
- **Chained calculations (U21):** a `compute` step's answer may lead to another step (`12 + √9 =` → `sqrt(9)`, then `add(12, 3)`), and the hook runs them in order. Errors and Backspace refer to the input as typed (`12 + √9`).
- **History button on the result highlight (user request):** the narrow-screen history button sat exactly on the display's corner, so its outline collided with the highlighted result area's border. It now sits 8px inside the corner, and on a result its border is transparent. Verified at 320/393/700px in both themes.
- **History sheet animation (user request):** the scrim behind the phone sheet now fades in/out (0.28s) with the sheet's slide instead of appearing at once. Verified in Chrome.

- **Step 11–13:**
  1. Backend coverage is measured with `-coverpkg=./...`, because plain per-package numbers show `internal/docs` at 0%
     even though the `api` tests exercise it. Result: 91.9% (152 test cases). Frontend: 97.75% statements, 98.47% lines (199 tests); after U22, 97.76% / 98.48% (201 tests).
  2. Gap found by the coverage run: `cmd/server` had no tests. `run` now takes a context and a `getenv` function, so
     tests start the real server on a free port, check `/health` and static files, check that a port in use is
     reported, and check graceful shutdown. `main()` only wires OS signals to that context.
  3. Sweep results (all against the Docker image): fuzz 60 s each (~5.42 M API runs, ~21.58 M maths runs, no failures);
     34/34 `curl` cases (every §5.2 row and more); real-Chrome checks for held-down keys, backend stopped and restarted
     mid-session, reduced motion, long/tiny results at 320 px, full Tab order (26 stops, each named, each with a focus
     ring; after U22 the History button adds one stop, and the open panel adds Close, Clear and its rows); image rebuilt with `--no-cache` from a removed image (23.4 MB, user `app`, healthy). No app bugs found.
  4. The README's local-development steps were run as written (`go run ./cmd/server` + `npm run dev`; Vite on :5173
     proxied `/api` to :8080), and its `curl` outputs are real responses.
  5. README screenshots live in `docs/`.
