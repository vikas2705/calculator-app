/**
 * The calculator as a pure state machine.
 *
 * Phone-style: operations run left to right as they are entered, with no
 * operator precedence (2 + 3 × 4 = 20). The frontend never does arithmetic;
 * whenever a key needs maths, `transition` returns a `compute` step holding
 * the backend request plus what to do with its answer (which may be another
 * step, e.g. "12 + √9 =" needs √9 first, then 12 + 3). That keeps this
 * module synchronous and fully testable without a network.
 *
 * √ and % apply to the current number. √ (and ±) pressed before a number is
 * typed wait for the next one: "12 +", √, 9 reads "12 + √9".
 *
 * Backspace can always step back: typed characters are deleted one at a
 * time, and every committed step (operator, √, %, =, an error) remembers the
 * state before it in `previous`, so it can be undone without new maths.
 */
import { appendDecimalPoint, appendDigit, exceedsLimit, toggleSign, type Digit } from './entry'
import { formatNumber, formatTyped } from './format'
import {
  OPERATOR_SYMBOL,
  type BinaryOperation,
  type CalcRequest,
  type UnaryOperation,
} from './operations'

/** The operand currently on screen. */
export type Entry =
  /**
   * A number being typed, e.g. "12.5". `sqrt`: √ was pressed before the
   * number, so it is applied when the number is used ("√9"). Until the first
   * digit, `text` is "" or "-" (± pressed first).
   */
  | { kind: 'typed'; text: string; sqrt?: true }
  /** The answer of √ or %, or a recalled history value. `label` is how it reads in the expression, e.g. "√144". */
  | { kind: 'computed'; value: number; label: string }

type TypedEntry = Extract<Entry, { kind: 'typed' }>

export interface CalculatorState {
  mode: 'input' | 'result' | 'error'
  /** Running total. Set together with `pendingOp` once an operator is pressed. */
  accumulator: number | null
  pendingOp: BinaryOperation | null
  /** null right after an operator, while waiting for the next operand. */
  entry: Entry | null
  /** Committed part of the expression line, without the pending operator. In result/error mode, the full line. */
  expression: string
  /** The answer, in result mode. */
  result: number | null
  /** The message, in error mode. */
  error: string | null
  /** The last backend call failed to connect. Input is kept so the user can retry. */
  connectionLost: boolean
  /** The state before the last committed step; Backspace returns to it. */
  previous: CalculatorState | null
}

export type Input =
  | { type: 'digit'; digit: Digit }
  | { type: 'decimal' }
  | { type: 'negate' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'operator'; op: BinaryOperation }
  | { type: 'unary'; op: UnaryOperation }
  | { type: 'equals' }
  | { type: 'recall'; value: number }

/** A finished calculation, for the history tape. */
export interface HistoryRecord {
  expression: string
  result: number
}

export interface Outcome {
  state: CalculatorState
  record?: HistoryRecord
  /** A digit was refused because the entry is at its length limit (the display shakes). */
  rejected?: boolean
}

export type Failure = { kind: 'math'; message: string } | { kind: 'connection' }

export type ComputeStep = {
  kind: 'compute'
  request: CalcRequest
  /** What happens with the answer: the final outcome, or the next calculation. */
  onResult: (value: number) => Step
  onFailure: (failure: Failure) => Outcome
}

export type Step = { kind: 'done'; outcome: Outcome } | ComputeStep

export const initialState: CalculatorState = {
  mode: 'input',
  accumulator: null,
  pendingOp: null,
  entry: { kind: 'typed', text: '0' },
  expression: '',
  result: null,
  error: null,
  connectionLost: false,
  previous: null,
}

export function transition(current: CalculatorState, input: Input): Step {
  // Any key dismisses a connection notice; the input underneath is intact.
  const state = current.connectionLost ? { ...current, connectionLost: false } : current

  switch (input.type) {
    case 'clear':
      return done(initialState)
    case 'digit':
      if (state.mode === 'input' && state.entry?.kind === 'typed' && exceedsLimit(state.entry.text, input.digit)) {
        return { kind: 'done', outcome: { state, rejected: true } }
      }
      return done(editEntry(state, (text) => appendDigit(text, input.digit), input.digit))
    case 'decimal':
      return done(editEntry(state, appendDecimalPoint, '0.'))
    case 'backspace':
      return done(backspace(state))
    case 'negate':
      return done(negate(state))
    case 'recall':
      return done(after(state, withEntry(state.mode === 'input' ? state : initialState, computed(input.value))))
    case 'operator':
      return pressOperator(state, input.op)
    case 'unary':
      return pressUnary(state, input.op)
    case 'equals':
      return pressEquals(state)
  }
}

/** The live preview: the calculation = would run now, or null when there is nothing to calculate. */
export function previewStep(state: CalculatorState): ComputeStep | null {
  if (state.mode !== 'input' || state.connectionLost) return null
  const step = pressEquals(state)
  return step.kind === 'compute' ? step : null
}

/** The faded line for a finished preview: "= 15", or the error that = would show. */
export function previewText({ state }: Outcome): string {
  if (state.connectionLost) return CONNECTION_MESSAGE
  if (state.mode === 'error') return state.error ?? ''
  if (state.mode === 'result' && state.result !== null) return `= ${formatNumber(state.result)}`
  return ''
}

/* ---------- Typing ---------- */

/**
 * Applies a text edit to a typed entry (keeping a waiting √). A new operand
 * starts from `fresh` after =, after an error, after an operator, or over a
 * computed value.
 */
function editEntry(state: CalculatorState, edit: (text: string) => string, fresh: string): CalculatorState {
  if (state.mode !== 'input') return withEntry(initialState, typed(fresh))
  if (state.entry?.kind !== 'typed') return withEntry(state, typed(fresh))
  return withEntry(state, { ...state.entry, text: edit(state.entry.text) })
}

function negate(state: CalculatorState): CalculatorState {
  if (state.mode === 'result' && state.result !== null) {
    return after(state, withEntry(initialState, computed(flipSign(state.result))))
  }
  if (state.mode !== 'input') return state
  const { entry } = state
  if (entry === null) return withEntry(state, typed('-')) // "12 +", ± → "12 + −": the next number is negative
  if (entry.kind === 'typed') return withEntry(state, { ...entry, text: toggleSign(entry.text) })
  return after(state, withEntry(state, computed(flipSign(entry.value))))
}

/**
 * Deletes the last thing typed (a character, then a waiting √); otherwise
 * undoes the last committed step (an operator, √, %, =, or the step that
 * caused an error).
 */
function backspace(state: CalculatorState): CalculatorState {
  const { entry } = state
  if (state.mode !== 'input' || entry?.kind !== 'typed') return state.previous ?? state

  const next: TypedEntry = entry.text !== '' ? { ...entry, text: entry.text.slice(0, -1) } : typed('')
  if (next.text !== '' || next.sqrt) return withEntry(state, next)
  // Nothing left: the second operand disappears ("12 + 5" → "12 +"); the first one stops at "0".
  if (state.pendingOp !== null) return { ...state, entry: null, previous: beforeOperand(state) }
  return withEntry(state, typed('0'))
}

/**
 * The state before the operator that opened the current operand. Steps taken
 * inside the operand (a √ that was then typed over, a recalled value) are
 * skipped, so "12 + √9", typed over with 5, then deleted, goes back to "12".
 */
function beforeOperand(state: CalculatorState): CalculatorState | null {
  let snapshot = state.previous
  while (
    snapshot !== null &&
    snapshot.mode === 'input' &&
    snapshot.accumulator === state.accumulator &&
    snapshot.pendingOp === state.pendingOp &&
    snapshot.expression === state.expression
  ) {
    snapshot = snapshot.previous
  }
  return snapshot
}

/* ---------- Keys that need the backend ---------- */

function pressOperator(state: CalculatorState, op: BinaryOperation): Step {
  if (state.mode === 'error') return done(state)

  if (state.mode === 'result' && state.result !== null) {
    const expression = formatNumber(state.result)
    return done(after(state, { ...initialState, accumulator: state.result, pendingOp: op, entry: null, expression }))
  }

  const { entry } = state
  // Operator right after another: replace it (Backspace still goes back past it).
  if (entry === null) return done({ ...state, pendingOp: op })
  if (!hasNumber(entry)) return done(state) // "12 + √": the number comes first

  return withNumber(state, entry, (resolved, operand) => {
    const { accumulator, pendingOp } = resolved
    if (accumulator === null || pendingOp === null) {
      const expression = entryLabel(operand)
      return done(after(state, { ...resolved, accumulator: entryValue(operand), pendingOp: op, entry: null, expression }))
    }
    const line = `${pendingLine(resolved)} ${entryLabel(operand)}`
    return compute(
      { operation: pendingOp, operands: [accumulator, entryValue(operand)] },
      (value) => done(after(state, { ...resolved, accumulator: value, pendingOp: op, entry: null, expression: line })),
      state,
      line,
    )
  })
}

function pressUnary(state: CalculatorState, op: UnaryOperation): Step {
  if (state.mode === 'error') return done(state)

  if (state.mode === 'result' && state.result !== null) {
    const label = unaryLabel(op, formatNumber(state.result))
    return compute(
      { operation: op, operands: [state.result] },
      (value) => done(after(state, withEntry(initialState, { kind: 'computed', value, label }))),
      state,
      label,
    )
  }

  const { entry } = state
  const noNumberYet = entry === null || isUntouchedStart(state)
  // No number yet ("12 +" or the opening 0): √ waits for the next one; % has nothing to apply to.
  if (noNumberYet) return done(op === 'sqrt' ? withEntry(state, { kind: 'typed', text: '', sqrt: true }) : state)
  // Only "√" or "−" so far: wait for a digit.
  if (!hasNumber(entry)) return done(state)

  return withNumber(state, entry, (resolved, operand) => {
    const label = unaryLabel(op, entryLabel(operand))
    return compute(
      { operation: op, operands: [entryValue(operand)] },
      (value) => done(after(state, withEntry(resolved, { kind: 'computed', value, label }))),
      state,
      joinLine(pendingLine(state), label),
    )
  })
}

function pressEquals(state: CalculatorState): Step {
  if (state.mode !== 'input' || state.entry === null || !hasNumber(state.entry)) return done(state)

  return withNumber(state, state.entry, (resolved, operand) => {
    const { accumulator, pendingOp } = resolved
    if (accumulator !== null && pendingOp !== null) {
      const line = `${pendingLine(resolved)} ${entryLabel(operand)}`
      return compute(
        { operation: pendingOp, operands: [accumulator, entryValue(operand)] },
        (value) => ({ kind: 'done', outcome: finish(state, line, value) }),
        state,
        line,
      )
    }
    // A lone √ or %, e.g. "√9": already calculated, so = just finishes it.
    if (isUnaryResult(operand)) return { kind: 'done', outcome: finish(state, operand.label, operand.value) }
    return done(state) // a plain number: nothing to calculate
  })
}

function finish(before: CalculatorState, line: string, value: number): Outcome {
  const expression = `${line} =`
  return {
    state: after(before, { ...initialState, mode: 'result', entry: null, expression, result: value }),
    record: { expression, result: value },
  }
}

/**
 * Continues with the operand as a finished number. A waiting √ ("√9") is
 * calculated first; then `then` gets the state with √9 as a computed entry.
 * Snapshots and failures still refer to `state`, so Backspace and errors
 * return to "√9" as typed.
 */
function withNumber(
  state: CalculatorState,
  entry: Entry,
  then: (resolved: CalculatorState, operand: Entry) => Step,
): Step {
  if (entry.kind !== 'typed' || !entry.sqrt) return then(state, entry)
  const operandValue = Number(entry.text)
  const label = unaryLabel('sqrt', formatNumber(operandValue))
  return compute(
    { operation: 'sqrt', operands: [operandValue] },
    (value) => {
      const operand: Entry = { kind: 'computed', value, label }
      return then(withEntry(state, operand), operand)
    },
    state,
    joinLine(pendingLine(state), label),
  )
}

/* ---------- Helpers ---------- */

function compute(
  request: CalcRequest,
  onResult: (value: number) => Step,
  before: CalculatorState,
  attempted: string,
): Step {
  return {
    kind: 'compute',
    request,
    onResult,
    onFailure: (failure) =>
      failure.kind === 'connection'
        ? { state: { ...before, connectionLost: true } }
        : {
            state: after(before, {
              ...initialState,
              mode: 'error',
              entry: null,
              expression: attempted,
              error: failure.message,
            }),
          },
  }
}

function done(state: CalculatorState): Step {
  return { kind: 'done', outcome: { state } }
}

function withEntry(state: CalculatorState, entry: Entry): CalculatorState {
  return { ...state, entry }
}

/** `next`, remembering `before` so Backspace can return to it. */
function after(before: CalculatorState, next: CalculatorState): CalculatorState {
  return { ...next, previous: before }
}

function typed(text: string): TypedEntry {
  return { kind: 'typed', text }
}

/** False while only a waiting "√" or "−" has been entered. */
function hasNumber(entry: Entry): boolean {
  return entry.kind === 'computed' || /\d/.test(entry.text)
}

/** The opening "0" (or a first number deleted back to it): nothing has been typed yet. */
function isUntouchedStart(state: CalculatorState): boolean {
  const { entry } = state
  return state.accumulator === null && entry?.kind === 'typed' && entry.text === '0' && !entry.sqrt
}

/** The answer of √ or % (not a plain number such as a recalled value). */
function isUnaryResult(entry: Entry | null): entry is Extract<Entry, { kind: 'computed' }> {
  return entry?.kind === 'computed' && !PLAIN_NUMBER.test(entry.label)
}

function computed(value: number): Entry {
  return { kind: 'computed', value, label: formatNumber(value) }
}

function flipSign(value: number): number {
  return value === 0 ? 0 : -value
}

/** The value of a finished operand (never one with a waiting √). */
function entryValue(entry: Entry): number {
  return entry.kind === 'typed' ? Number(entry.text) : entry.value
}

/** How an operand reads in the expression line: "5." becomes "5", "1.50" becomes "1.5". */
function entryLabel(entry: Entry): string {
  return entry.kind === 'typed' ? formatNumber(Number(entry.text)) : entry.label
}

/** The committed expression plus the pending operator, e.g. "12 + 7 ×". */
function pendingLine(state: CalculatorState): string {
  if (state.pendingOp === null) return state.expression
  return `${state.expression} ${OPERATOR_SYMBOL[state.pendingOp]}`
}

function joinLine(left: string, right: string): string {
  return left === '' ? right : `${left} ${right}`
}

const PLAIN_NUMBER = /^−?[\d,.]+(e[+−]\d+)?$/

/** "√144", "18%"; anything that is not a plain number is bracketed: "√(√16)". */
function unaryLabel(op: UnaryOperation, operand: string): string {
  const inner = PLAIN_NUMBER.test(operand) ? operand : `(${operand})`
  return op === 'sqrt' ? `√${inner}` : `${inner}%`
}

/* ---------- What the display shows ---------- */

export interface DisplayModel {
  variant: 'typing' | 'result' | 'error'
  expression: string
  main: string
  /** Faded third line: the live preview, or what to do next after an error. */
  hint: string
}

export const CONNECTION_MESSAGE = 'Cannot reach the calculator service.'
const CONNECTION_HINT = 'Check that it is running, then try again.'
const ERROR_HINT = 'Press ⌫ to go back and fix it, or AC to start again.'

/**
 * Maps state (plus the live preview line) to the three display lines.
 * While typing, the bright line is the whole expression ("12 + 5") and the
 * faded line is its running result ("= 17"). After =, the result is bright
 * and the finished expression moves to the small line above it.
 */
export function toDisplay(state: CalculatorState, preview: string): DisplayModel {
  if (state.connectionLost) {
    return { variant: 'error', expression: typingLine(state), main: CONNECTION_MESSAGE, hint: CONNECTION_HINT }
  }
  if (state.mode === 'error') {
    return { variant: 'error', expression: state.expression, main: state.error ?? '', hint: ERROR_HINT }
  }
  if (state.mode === 'result' && state.result !== null) {
    return { variant: 'result', expression: state.expression, main: formatNumber(state.result), hint: '' }
  }
  return { variant: 'typing', expression: '', main: typingLine(state), hint: preview || knownResult(state) }
}

/** The expression being built, including the operand being typed: "12 + 5", "12 +", "12 + √9", "√9". */
function typingLine(state: CalculatorState): string {
  const { entry } = state
  if (entry === null) return pendingLine(state) || '0'
  const operand = entry.kind === 'typed' ? (entry.sqrt ? '√' : '') + formatTyped(entry.text) : entry.label
  return joinLine(pendingLine(state), operand)
}

/** A running result that needs no backend call: "12 + 5 ×" → "= 17", "12 + √" → "= 12", "√9" → "= 3". */
function knownResult(state: CalculatorState): string {
  const { entry, accumulator } = state
  if (accumulator !== null && (entry === null || !hasNumber(entry))) return `= ${formatNumber(accumulator)}`
  if (accumulator === null && isUnaryResult(entry)) return `= ${formatNumber(entry.value)}`
  return ''
}
