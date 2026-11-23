/**
 * The keypad, in design-system order, and the keyboard keys that trigger each
 * button. One list drives both the on-screen keypad and keyboard input, so
 * they cannot drift apart.
 */
import type { Input } from './calculator'
import type { Digit } from './entry'

export type KeyRole = 'digit' | 'fn' | 'op' | 'eq'

export interface KeyDef {
  id: string
  label: string
  ariaLabel: string
  role: KeyRole
  input: Input
  /** `KeyboardEvent.key` values that press this key. */
  keyboard: string[]
  /** Equals spans two rows; zero spans two columns. */
  span?: 'rows' | 'columns'
}

const digit = (d: Digit): KeyDef => ({
  id: d,
  label: d,
  ariaLabel: d,
  role: 'digit',
  input: { type: 'digit', digit: d },
  keyboard: [d],
  span: d === '0' ? 'columns' : undefined,
})

export const KEYPAD: KeyDef[] = [
  { id: 'clear', label: 'AC', ariaLabel: 'All clear', role: 'fn', input: { type: 'clear' }, keyboard: ['Escape', 'Delete'] },
  { id: 'backspace', label: '⌫', ariaLabel: 'Delete last digit', role: 'fn', input: { type: 'backspace' }, keyboard: ['Backspace'] },
  { id: 'percentage', label: '%', ariaLabel: 'Percent', role: 'fn', input: { type: 'unary', op: 'percentage' }, keyboard: ['%'] },
  { id: 'divide', label: '÷', ariaLabel: 'Divide', role: 'op', input: { type: 'operator', op: 'divide' }, keyboard: ['/'] },

  { id: 'sqrt', label: '√', ariaLabel: 'Square root', role: 'fn', input: { type: 'unary', op: 'sqrt' }, keyboard: ['r', 'R'] },
  { id: 'power', label: 'xʸ', ariaLabel: 'Power', role: 'op', input: { type: 'operator', op: 'power' }, keyboard: ['^'] },
  { id: 'negate', label: '±', ariaLabel: 'Change sign', role: 'fn', input: { type: 'negate' }, keyboard: ['n', 'N'] },
  { id: 'multiply', label: '×', ariaLabel: 'Multiply', role: 'op', input: { type: 'operator', op: 'multiply' }, keyboard: ['*'] },

  digit('7'), digit('8'), digit('9'),
  { id: 'subtract', label: '−', ariaLabel: 'Subtract', role: 'op', input: { type: 'operator', op: 'subtract' }, keyboard: ['-'] },

  digit('4'), digit('5'), digit('6'),
  { id: 'add', label: '+', ariaLabel: 'Add', role: 'op', input: { type: 'operator', op: 'add' }, keyboard: ['+'] },

  digit('1'), digit('2'), digit('3'),
  { id: 'equals', label: '=', ariaLabel: 'Equals', role: 'eq', input: { type: 'equals' }, keyboard: ['Enter', '='], span: 'rows' },

  digit('0'),
  // "," too: number pads on many European layouts type a comma.
  { id: 'decimal', label: '.', ariaLabel: 'Decimal point', role: 'digit', input: { type: 'decimal' }, keyboard: ['.', ','] },
]

/**
 * Where each key sits on the 4×6 grid (design/components/Keypad.md), by id.
 * A key that spans two cells is listed in both. Arrow keys move focus on this grid.
 */
export const KEYPAD_GRID: readonly (readonly string[])[] = [
  ['clear', 'backspace', 'percentage', 'divide'],
  ['sqrt', 'power', 'negate', 'multiply'],
  ['7', '8', '9', 'subtract'],
  ['4', '5', '6', 'add'],
  ['1', '2', '3', 'equals'],
  ['0', '0', 'decimal', 'equals'],
]

export type Direction = 'up' | 'down' | 'left' | 'right'

const ARROWS = new Map<string, Direction>([
  ['ArrowUp', 'up'],
  ['ArrowDown', 'down'],
  ['ArrowLeft', 'left'],
  ['ArrowRight', 'right'],
])

/** The direction an arrow key (`KeyboardEvent.key`) moves focus, or undefined for other keys. */
export function arrowDirection(key: string): Direction | undefined {
  return ARROWS.get(key)
}

const STEP: Record<Direction, readonly [row: number, column: number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
}

/**
 * The id of the key one step from `id` in `direction`, or undefined at the
 * edge of the grid (focus does not wrap around). A two-cell key is stepped
 * over as one key and is left from its top-left cell, so up from 0 is 1 and
 * left from = is 3.
 */
export function neighborKey(id: string, direction: Direction): string | undefined {
  let row = KEYPAD_GRID.findIndex((cells) => cells.includes(id))
  let column = KEYPAD_GRID[row]?.indexOf(id) ?? -1
  if (column === -1) return undefined
  const [rowStep, columnStep] = STEP[direction]
  do {
    row += rowStep
    column += columnStep
  } while (KEYPAD_GRID[row]?.[column] === id)
  return KEYPAD_GRID[row]?.[column]
}

const byKeyboardKey = new Map(KEYPAD.flatMap((key) => key.keyboard.map((k) => [k, key] as const)))

export function keyForKeyboard(key: string): KeyDef | undefined {
  return byKeyboardKey.get(key)
}
