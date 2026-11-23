/**
 * Test double for the Go backend: same operations, same error codes and
 * messages, computed in-process. Used only by tests.
 */
import type { CalcResult } from '../api/calculatorApi'
import type { CalcRequest } from '../domain/operations'

const mathError = (code: string, message: string): CalcResult => ({ ok: false, error: { code, message } })

export function fakeCalculate({ operation, operands }: CalcRequest): CalcResult {
  const [a = NaN, b = NaN] = operands
  if (operation === 'divide' && b === 0) return mathError('DIVISION_BY_ZERO', 'Cannot divide by zero.')
  if (operation === 'power' && a === 0 && b < 0) return mathError('DIVISION_BY_ZERO', 'Cannot divide by zero.')
  if (operation === 'sqrt' && a < 0) {
    return mathError('NEGATIVE_SQRT', 'Cannot take the square root of a negative number.')
  }

  const results = {
    add: () => a + b,
    subtract: () => a - b,
    multiply: () => a * b,
    divide: () => a / b,
    power: () => a ** b,
    sqrt: () => Math.sqrt(a),
    percentage: () => a / 100,
  }
  const value = results[operation]()
  if (Number.isNaN(value)) return mathError('UNDEFINED_RESULT', 'The result is undefined.')
  if (!Number.isFinite(value)) return mathError('OVERFLOW', 'The result is too large.')
  return { ok: true, value: value === 0 ? 0 : value }
}
