import { describe, expect, it } from 'vitest'
import { appendDecimalPoint, appendDigit, toggleSign, type Digit } from './entry'

const typeAll = (text: string, digits: string) =>
  [...digits].reduce((acc, d) => appendDigit(acc, d as Digit), text)

describe('appendDigit', () => {
  it('replaces a lone zero', () => {
    expect(appendDigit('0', '7')).toBe('7')
    expect(appendDigit('-0', '7')).toBe('-7')
  })

  it('does not stack leading zeros', () => {
    expect(appendDigit('0', '0')).toBe('0')
  })

  it('appends after a decimal point, including zeros', () => {
    expect(typeAll('0.', '05')).toBe('0.05')
  })

  it('allows exactly 15 significant digits', () => {
    expect(typeAll('0', '123456789012345')).toBe('123456789012345')
    expect(appendDigit('123456789012345', '6')).toBe('123456789012345')
  })

  it('counts integer trailing zeros as significant', () => {
    expect(appendDigit('100000000000000', '0')).toBe('100000000000000')
  })

  it('does not count leading zeros after the point as significant', () => {
    expect(typeAll('0.', '00012345678901234')).toBe('0.000123456789012')
  })

  it('caps decimal places at 15', () => {
    const fifteen = typeAll('0.', '000000000000001')
    expect(fifteen).toBe('0.000000000000001')
    expect(appendDigit(fifteen, '2')).toBe(fifteen)
  })

  it('ignores the sign when counting', () => {
    expect(typeAll('-1', '23456789012345')).toBe('-123456789012345')
    expect(appendDigit('-123456789012345', '6')).toBe('-123456789012345')
  })
})

describe('appendDecimalPoint', () => {
  it('adds one point only', () => {
    expect(appendDecimalPoint('12')).toBe('12.')
    expect(appendDecimalPoint('12.')).toBe('12.')
    expect(appendDecimalPoint('1.5')).toBe('1.5')
  })

  it('starts "0." when no digit is typed yet', () => {
    expect(appendDecimalPoint('')).toBe('0.')
    expect(appendDecimalPoint('-')).toBe('-0.')
  })
})

describe('toggleSign', () => {
  it('flips the sign', () => {
    expect(toggleSign('5')).toBe('-5')
    expect(toggleSign('-5')).toBe('5')
    expect(toggleSign('0.')).toBe('-0.')
  })

  it('leaves plain zero alone', () => {
    expect(toggleSign('0')).toBe('0')
  })

  it('before any digit, toggles a waiting minus', () => {
    expect(toggleSign('')).toBe('-')
    expect(toggleSign('-')).toBe('')
  })
})
