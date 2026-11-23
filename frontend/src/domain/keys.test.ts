import { describe, expect, it } from 'vitest'
import { arrowDirection, KEYPAD, KEYPAD_GRID, keyForKeyboard, neighborKey } from './keys'

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

describe('KEYPAD_GRID', () => {
  it('holds every key once, in keypad order, except the two-cell keys', () => {
    const cells = KEYPAD_GRID.flat()
    expect([...new Set(cells)]).toEqual(KEYPAD.map((k) => k.id))
    for (const key of KEYPAD) {
      expect(cells.filter((id) => id === key.id)).toHaveLength(key.span ? 2 : 1)
    }
  })

  it('places two-cell keys across the cells their span says', () => {
    for (const key of KEYPAD.filter((k) => k.span)) {
      const row = KEYPAD_GRID.findIndex((cells) => cells.includes(key.id))
      const column = KEYPAD_GRID[row]?.indexOf(key.id) ?? -1
      if (key.span === 'columns') expect(KEYPAD_GRID[row]?.[column + 1]).toBe(key.id)
      else expect(KEYPAD_GRID[row + 1]?.[column]).toBe(key.id)
    }
  })

  it('is 6 rows of 4', () => {
    expect(KEYPAD_GRID).toHaveLength(6)
    for (const row of KEYPAD_GRID) expect(row).toHaveLength(4)
  })
})

describe('neighborKey', () => {
  it.each([
    ['5', 'up', '8'],
    ['5', 'down', '2'],
    ['5', 'left', '4'],
    ['5', 'right', '6'],
    ['8', 'up', 'power'],
    ['2', 'down', '0'],
    ['1', 'down', '0'],
    ['0', 'up', '1'], // a wide key leaves from its left cell
    ['0', 'right', 'decimal'], // and is stepped over as one key
    ['decimal', 'left', '0'],
    ['decimal', 'right', 'equals'],
    ['3', 'right', 'equals'],
    ['add', 'down', 'equals'],
    ['equals', 'up', 'add'],
    ['equals', 'left', '3'], // a tall key leaves from its top cell
  ] as const)('%s %s → %s', (id, direction, expected) => {
    expect(neighborKey(id, direction)).toBe(expected)
  })

  it.each([
    ['clear', 'up'],
    ['clear', 'left'],
    ['divide', 'right'],
    ['0', 'left'],
    ['0', 'down'],
    ['decimal', 'down'],
    ['equals', 'down'],
    ['equals', 'right'],
  ] as const)('stops at the edge: %s %s', (id, direction) => {
    expect(neighborKey(id, direction)).toBeUndefined()
  })

  it('ignores unknown ids', () => {
    expect(neighborKey('nope', 'up')).toBeUndefined()
  })
})

describe('arrowDirection', () => {
  it('maps the four arrow keys and nothing else', () => {
    expect(arrowDirection('ArrowUp')).toBe('up')
    expect(arrowDirection('ArrowDown')).toBe('down')
    expect(arrowDirection('ArrowLeft')).toBe('left')
    expect(arrowDirection('ArrowRight')).toBe('right')
    expect(arrowDirection('Up')).toBeUndefined()
    expect(arrowDirection('toString')).toBeUndefined()
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
