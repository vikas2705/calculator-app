import { describe, expect, it } from 'vitest'
import { KEYPAD, keyForKeyboard } from './keys'

describe('KEYPAD', () => {
  it('follows the design-system layout', () => {
    expect(KEYPAD.map((k) => k.label)).toEqual([
      'AC', '⌫', '%', '÷',
      '√', 'xʸ', '±', '×',
      '7', '8', '9', '−',
      '4', '5', '6', '+',
      '1', '2', '3', '=',
      '0', '.',
    ])
  })

  it('has unique ids and keyboard keys', () => {
    const ids = KEYPAD.map((k) => k.id)
    const keyboardKeys = KEYPAD.flatMap((k) => k.keyboard)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(keyboardKeys).size).toBe(keyboardKeys.length)
  })

  it('labels every key for screen readers', () => {
    for (const key of KEYPAD) expect(key.ariaLabel).not.toBe('')
  })
})

describe('keyForKeyboard', () => {
  it.each([
    ['7', '7'],
    ['Enter', 'equals'],
    ['=', 'equals'],
    ['*', 'multiply'],
    ['/', 'divide'],
    ['-', 'subtract'],
    ['^', 'power'],
    ['%', 'percentage'],
    ['r', 'sqrt'],
    ['n', 'negate'],
    [',', 'decimal'],
    ['Backspace', 'backspace'],
    ['Escape', 'clear'],
    ['Delete', 'clear'],
  ])('%s presses %s', (key, id) => {
    expect(keyForKeyboard(key)?.id).toBe(id)
  })

  it('ignores unmapped keys', () => {
    expect(keyForKeyboard('a')).toBeUndefined()
    expect(keyForKeyboard('x')).toBeUndefined()
    expect(keyForKeyboard('t')).toBeUndefined()
    expect(keyForKeyboard('Tab')).toBeUndefined()
  })
})
