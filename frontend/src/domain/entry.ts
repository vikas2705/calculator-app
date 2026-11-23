/**
 * Editing rules for the number being typed. The text is kept as the user
 * typed it (e.g. "0.50", "12.") and only parsed when it is used.
 */

/** A double holds 15 significant decimal digits exactly; more would be silently changed. */
export const MAX_SIGNIFICANT_DIGITS = 15
/** Caps tiny numbers so the entry cannot grow without bound (0.000…0001). */
export const MAX_DECIMAL_PLACES = 15

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

/** Appends a digit, or returns the text unchanged if that would exceed the limits. */
export function appendDigit(text: string, digit: Digit): string {
  const next = withDigit(text, digit)
  return isWithinLimits(next) ? next : text
}

/** True when appending this digit would break the length limits (the key is refused). */
export function exceedsLimit(text: string, digit: Digit): boolean {
  return !isWithinLimits(withDigit(text, digit))
}

function withDigit(text: string, digit: Digit): string {
  if (text === '0') return digit
  if (text === '-0') return `-${digit}`
  return text + digit
}

/** Adds a decimal point if there is none; with no digits yet ("" or "-"), it starts as "0." or "-0.". */
export function appendDecimalPoint(text: string): string {
  if (text === '' || text === '-') return `${text}0.`
  return text.includes('.') ? text : `${text}.`
}

/** Flips the sign. Plain zero has no sign, so "0" stays "0". Before any digit, "" ↔ "-". */
export function toggleSign(text: string): string {
  if (text === '0') return text
  return text.startsWith('-') ? text.slice(1) : `-${text}`
}

function isWithinLimits(text: string): boolean {
  const [integer = '', fraction = ''] = text.replace('-', '').split('.')
  const significant = (integer + fraction).replace(/^0+/, '')
  return significant.length <= MAX_SIGNIFICANT_DIGITS && fraction.length <= MAX_DECIMAL_PLACES
}
