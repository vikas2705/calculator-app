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

const byKeyboardKey = new Map(KEYPAD.flatMap((key) => key.keyboard.map((k) => [k, key] as const)))

export function keyForKeyboard(key: string): KeyDef | undefined {
  return byKeyboardKey.get(key)
}
