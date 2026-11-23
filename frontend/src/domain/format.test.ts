import { describe, expect, it } from 'vitest'
import { formatNumber, formatTyped } from './format'

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [-0, '0'],
    [5, '5'],
    [-5, '−5'],
    [2.5, '2.5'],
    [1234567.5, '1,234,567.5'],
    [-1234567.5, '−1,234,567.5'],
    [999, '999'],
    [1000, '1,000'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected)
  })

  it.each([
    [0.1 + 0.2, '0.3'],
    [1.1 * 3, '3.3'],
    [4.35 * 100, '435'],
    [0.1 + 0.7, '0.8'],
  ])('hides float noise: %s → %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected)
  })

  it('keeps all 15 significant digits a user can type', () => {
    expect(formatNumber(123456789012345)).toBe('123,456,789,012,345')
    expect(formatNumber(1234567890.12345)).toBe('1,234,567,890.12345')
  })

  it.each([
    [1e15, '1e+15'],
    [1.5e20, '1.5e+20'],
    [-2.5e300, '−2.5e+300'],
    [1.7976931348623157e308, '1.79769313486232e+308'],
    [1e-10, '1e−10'],
    [-1.25e-12, '−1.25e−12'],
    [5e-324, '4.94065645841247e−324'],
  ])('uses scientific notation outside [1e-9, 1e15): %s → %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected)
  })

  it('switches at the thresholds', () => {
    expect(formatNumber(999999999999999)).toBe('999,999,999,999,999')
    expect(formatNumber(1e-9)).toBe('0.000000001')
    expect(formatNumber(9.99e-10)).toBe('9.99e−10')
  })

  it('decides notation after rounding, so a value that rounds up to 1e15 is scientific', () => {
    expect(formatNumber(999999999999999.9)).toBe('1e+15')
  })
})

describe('formatTyped', () => {
  it.each([
    ['0', '0'],
    ['0.', '0.'],
    ['12.', '12.'],
    ['1.50', '1.50'],
    ['1234', '1,234'],
    ['1234567.0001', '1,234,567.0001'],
    ['-1234.5', '−1,234.5'],
    ['-0.', '−0.'],
    ['123456789012345', '123,456,789,012,345'],
  ])('keeps what was typed: %s → %s', (text, expected) => {
    expect(formatTyped(text)).toBe(expected)
  })
})
