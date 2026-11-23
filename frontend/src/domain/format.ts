/**
 * Number formatting for the display and history.
 *
 * Numbers are IEEE-754 doubles, which hold 15 significant digits exactly.
 * Rounding to 15 hides binary noise (0.1 + 0.2 → 0.3) without changing any
 * number the user could have typed.
 */
export const SIGNIFICANT_DIGITS = 15

/** Outside [1e-9, 1e15) numbers switch to scientific notation so they stay readable. */
const SCIENTIFIC_ABOVE = 1e15
const SCIENTIFIC_BELOW = 1e-9

/** The true minus sign (U+2212), as the design system requires. */
export const MINUS = '−'

const grouped = new Intl.NumberFormat('en-US', { maximumSignificantDigits: SIGNIFICANT_DIGITS })

/** Formats a finite number, e.g. 1234567.5 → "1,234,567.5", -2 → "−2", 1e21 → "1e+21". */
export function formatNumber(value: number): string {
  // Rounding the largest doubles up to 15 digits overflows to Infinity
  // (1.7976931348623157e308 → 1.79769313486232e308), so keep the original then.
  const roundedUp = Number(value.toPrecision(SIGNIFICANT_DIGITS))
  const rounded = Number.isFinite(roundedUp) ? roundedUp : value
  if (rounded === 0) return '0' // also covers -0

  const magnitude = Math.abs(rounded)
  const text =
    magnitude >= SCIENTIFIC_ABOVE || magnitude < SCIENTIFIC_BELOW
      ? toScientific(rounded)
      : grouped.format(rounded)
  return text.replaceAll('-', MINUS)
}

function toScientific(value: number): string {
  const [mantissa = '', exponent = ''] = value.toExponential(SIGNIFICANT_DIGITS - 1).split('e')
  return `${mantissa.replace(/\.?0+$/, '')}e${exponent}`
}

/**
 * Formats text the user is still typing. Unlike formatNumber it keeps what was
 * typed, including a trailing "." or trailing zeros: "-1234.50" → "−1,234.50".
 */
export function formatTyped(text: string): string {
  const negative = text.startsWith('-')
  const [integer = '', fraction] = (negative ? text.slice(1) : text).split('.')
  const withSeparators = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (negative ? MINUS : '') + withSeparators + (fraction === undefined ? '' : `.${fraction}`)
}
