import { describe, expect, it } from 'vitest'
import { fakeCalculate } from '../test/fakeBackend'
import {
  initialState,
  previewStep,
  previewText,
  toDisplay,
  transition,
  type CalculatorState,
  type HistoryRecord,
  type Input,
  type Outcome,
  type Step,
} from './calculator'
import { KEYPAD } from './keys'

type Backend = 'ok' | 'offline'

/** Runs a step's calculations with a fake backend, as the hook does with the real one. */
function run(step: Step, backend: Backend = 'ok', requests: string[] = []): Outcome {
  while (step.kind === 'compute') {
    requests.push(`${step.request.operation}(${step.request.operands.join(', ')})`)
    if (backend === 'offline') return step.onFailure({ kind: 'connection' })
    const result = fakeCalculate(step.request)
    if (!result.ok) return step.onFailure({ kind: 'math', message: result.error.message })
    step = step.onResult(result.value)
  }
  return step.outcome
}

/** Feeds key labels (e.g. "12+7×4=") through the state machine with a fake backend. */
function press(keys: string[], state: CalculatorState = initialState, backend: Backend = 'ok') {
  const records: HistoryRecord[] = []
  const requests: string[] = []
  for (const key of keys) {
    const outcome = run(transition(state, inputFor(key)), backend, requests)
    state = outcome.state
    if (outcome.record) records.push(outcome.record)
  }
  return { state, records, requests, display: toDisplay(state, '') }
}

/** The bright line after each key of `sequence`. */
function lines(sequence: string) {
  let state = initialState
  return [...sequence].map((key) => {
    state = press([key], state).state
    return toDisplay(state, '').main
  })
}

const LABELS: Record<string, string> = { '*': '×', '/': '÷', '-': '−', '^': 'xʸ', r: '√', n: '±', '<': '⌫', C: 'AC' }

function inputFor(key: string): Input {
  const label = LABELS[key] ?? key
  const def = KEYPAD.find((k) => k.label === label)
  if (!def) throw new Error(`no key ${key}`)
  return def.input
}

/** "12+7*4=" → ["1","2","+","7","*","4","="] */
const keys = (sequence: string) => [...sequence]

describe('phone-style evaluation (left to right, no precedence)', () => {
  it.each([
    ['2+3*4=', '20', '2 + 3 × 4 ='],
    ['12+7*4=', '76', '12 + 7 × 4 ='],
    ['1200/3-50=', '350', '1,200 ÷ 3 − 50 ='],
    ['2^10=', '1,024', '2 ^ 10 ='],
    ['10-25=', '−15', '10 − 25 ='],
    ['0.1+0.2=', '0.3', '0.1 + 0.2 ='],
  ])('%s → %s', (sequence, main, expression) => {
    const { display, records } = press(keys(sequence))
    expect(display).toMatchObject({ variant: 'result', main, expression })
    expect(records).toEqual([{ expression, result: expect.any(Number) }])
  })
})

describe('typing', () => {
  it('starts at 0 and replaces it', () => {
    expect(toDisplay(initialState, '').main).toBe('0')
    expect(press(keys('7')).display.main).toBe('7')
  })

  it('shows thousands separators while typing, keeping a trailing point', () => {
    expect(press(keys('1234.')).display.main).toBe('1,234.')
  })

  it('a leading decimal point becomes 0.', () => {
    expect(press(keys('.5')).display.main).toBe('0.5')
  })

  it('ignores a second decimal point', () => {
    expect(press(keys('1.2.3')).display.main).toBe('1.23')
  })

  it('stops at 15 significant digits', () => {
    expect(press(keys('1234567890123456789')).display.main).toBe('123,456,789,012,345')
  })

  it('flags a refused digit so the display can shake', () => {
    const full = press(keys('123456789012345')).state
    const refused = transition(full, { type: 'digit', digit: '6' })
    expect(refused).toEqual({ kind: 'done', outcome: { state: full, rejected: true } })

    const accepted = transition(press(keys('12')).state, { type: 'digit', digit: '3' })
    expect(accepted.kind === 'done' && accepted.outcome.rejected).toBeFalsy()
  })

  it('backspace deletes, and an emptied entry is 0', () => {
    expect(press(keys('123<')).display.main).toBe('12')
    expect(press(keys('5<<')).display.main).toBe('0')
  })

  it('± flips the typed sign and leaves 0 alone', () => {
    expect(press(keys('5n')).display.main).toBe('−5')
    expect(press(keys('5nn')).display.main).toBe('5')
    expect(press(keys('n')).display.main).toBe('0')
  })

  it('typed "5." reads as "5" once committed', () => {
    expect(press(keys('5.')).display.main).toBe('5.')
    expect(press(keys('5.+')).display.main).toBe('5 +')
  })

  it('AC resets everything', () => {
    expect(press(keys('12+7C')).state).toEqual(initialState)
  })
})

describe('the display while typing', () => {
  it('shows the whole expression on the bright line, with the running total faded below', () => {
    expect(press(keys('12+')).display).toEqual({ variant: 'typing', expression: '', main: '12 +', hint: '= 12' })
    expect(press(keys('12+5*')).display).toEqual({ variant: 'typing', expression: '', main: '12 + 5 ×', hint: '= 17' })
  })

  it('leaves the faded line to the live preview while an operand is typed', () => {
    // The live preview ("= 17") is fetched by the hook and passed in.
    expect(toDisplay(press(keys('12+5')).state, '= 17')).toEqual({
      variant: 'typing',
      expression: '',
      main: '12 + 5',
      hint: '= 17',
    })
  })

  it('shows no faded line for a plain number', () => {
    expect(press(keys('12')).display.hint).toBe('')
  })
})

describe('operators', () => {
  it('first operator commits the entry without a backend call', () => {
    const { state, display } = press(keys('12+'))
    expect(state).toMatchObject({ accumulator: 12, pendingOp: 'add', entry: null })
    expect(display.main).toBe('12 +')
  })

  it('chained operators keep the running total', () => {
    const { state, display } = press(keys('12+7*'))
    expect(state).toMatchObject({ accumulator: 19, pendingOp: 'multiply' })
    expect(display).toMatchObject({ main: '12 + 7 ×', hint: '= 19' })
  })

  it('an operator right after another replaces it', () => {
    const { state, display } = press(keys('12+-*'))
    expect(state.pendingOp).toBe('multiply')
    expect(display.main).toBe('12 ×')
  })

  it('an operator at the very start uses 0', () => {
    expect(press(keys('+5=')).display).toMatchObject({ main: '5', expression: '0 + 5 =' })
  })

  it('continues from a result', () => {
    expect(press(keys('2+3=*4=')).display).toMatchObject({ main: '20', expression: '5 × 4 =' })
  })
})

describe('equals', () => {
  it('does nothing without an operator', () => {
    const { state, records } = press(keys('5='))
    expect(state.mode).toBe('input')
    expect(records).toHaveLength(0)
  })

  it('does nothing right after an operator', () => {
    const { state, records } = press(keys('5+='))
    expect(state).toMatchObject({ mode: 'input', accumulator: 5, pendingOp: 'add' })
    expect(records).toHaveLength(0)
  })

  it('repeated = does nothing and adds no extra history', () => {
    const { display, records } = press(keys('2+3==='))
    expect(display.main).toBe('5')
    expect(records).toHaveLength(1)
  })

  it('a digit after a result starts a new calculation', () => {
    expect(press(keys('2+3=7')).display).toMatchObject({ variant: 'typing', main: '7', expression: '' })
  })

  it('a lone √ or % is finished by = and recorded', () => {
    const { display, records } = press(keys('9r='))
    expect(display).toMatchObject({ variant: 'result', main: '3', expression: '√9 =' })
    expect(records).toEqual([{ expression: '√9 =', result: 3 }])
    expect(press(keys('50%=')).records).toEqual([{ expression: '50% =', result: 0.5 }])
  })

  it('a recalled or negated value alone is a plain number: = does nothing', () => {
    const recalled = transition(initialState, { type: 'recall', value: 76 })
    if (recalled.kind !== 'done') throw new Error('recall should not compute')
    expect(press(keys('='), recalled.outcome.state).records).toHaveLength(0)
    expect(press(keys('9rn=')).records).toHaveLength(0)
  })
})

describe('unary keys', () => {
  it('√ is calculated at once and shows its answer faded', () => {
    const { state, display } = press(keys('144r'))
    expect(state.entry).toEqual({ kind: 'computed', value: 12, label: '√144' })
    expect(display).toMatchObject({ main: '√144', hint: '= 12', expression: '' })
  })

  it('a √ result is used as an operand', () => {
    expect(press(keys('144r+1=')).display).toMatchObject({ main: '13', expression: '√144 + 1 =' })
  })

  it('% turns the entry into a fraction of 100', () => {
    expect(press(keys('250*18%=')).display).toMatchObject({ main: '45', expression: '250 × 18% =' })
    expect(press(keys('50%')).display).toMatchObject({ main: '50%', hint: '= 0.5' })
  })

  it('nested unary operations are bracketed', () => {
    expect(press(keys('16rr+1=')).display).toMatchObject({ main: '3', expression: '√(√16) + 1 =' })
  })

  it('applies to a result', () => {
    expect(press(keys('8*2=r+1=')).display).toMatchObject({ main: '5', expression: '√16 + 1 =' })
  })


  it('a digit replaces a computed value', () => {
    expect(press(keys('9r5')).display.main).toBe('5')
    expect(press(keys('1+9r5')).display.main).toBe('1 + 5')
  })

  it('± negates a computed value', () => {
    expect(press(keys('9rn')).display.main).toBe('−3')
  })

  it('± after a result negates it and starts from there', () => {
    expect(press(keys('2+3=n+1=')).display).toMatchObject({ main: '−4', expression: '−5 + 1 =' })
  })

  it('± on a zero result stays 0, never −0', () => {
    expect(press(keys('5-5=n')).display.main).toBe('0')
  })
})

describe('a number typed right after % multiplies it (as on phones)', () => {
  it('32 % 2 reads "32% × 2" and = gives 0.64', () => {
    expect(press(keys('32%2')).display.main).toBe('32% × 2')
    const { display, records } = press(keys('32%2='))
    expect(display).toMatchObject({ variant: 'result', main: '0.64', expression: '32% × 2 =' })
    expect(records).toEqual([{ expression: '32% × 2 =', result: 0.64 }])
  })

  it('keeps typing into the new number, including a decimal point', () => {
    expect(press(keys('32%25=')).display).toMatchObject({ main: '8', expression: '32% × 25 =' })
    expect(press(keys('32%.5=')).display).toMatchObject({ main: '0.16', expression: '32% × 0.5 =' })
  })

  it('runs left to right after an earlier operator, like a pressed ×', () => {
    // (12 + 0.32) × 2
    expect(press(keys('12+32%2=')).display).toMatchObject({ main: '24.64', expression: '12 + 32% × 2 =' })
  })

  it('works on % of a result', () => {
    expect(press(keys('5+27=%2=')).display).toMatchObject({ main: '0.64', expression: '32% × 2 =' })
  })

  it('Backspace takes the number, then the ×, then the %', () => {
    expect(lines('32%2<<<')).toEqual(['3', '32', '32%', '32% × 2', '32% ×', '32%', '32'])
  })

  it('does not apply to √: a digit after √9 still starts a new number', () => {
    expect(press(keys('9r5')).display.main).toBe('5')
  })

  it('if the running total cannot be reached, keeps "12 + 32%" for a retry', () => {
    const before = press(keys('12+32%')).state
    const { state, display } = press(keys('2'), before, 'offline')
    expect(display).toMatchObject({ variant: 'error', main: 'Cannot reach the calculator service.' })
    expect({ ...state, connectionLost: false }).toEqual(before)
    expect(press(keys('2'), state).display.main).toBe('12 + 32% × 2')
  })
})

describe('√ and ± before a number wait for it', () => {
  it('right after an operator, √ applies to the next number typed', () => {
    expect(lines('12+r9=')).toEqual(['1', '12', '12 +', '12 + √', '12 + √9', '15'])
    const { display, records, requests } = press(keys('12+r9='))
    expect(display).toMatchObject({ variant: 'result', expression: '12 + √9 =' })
    expect(records).toEqual([{ expression: '12 + √9 =', result: 15 }])
    expect(requests).toEqual(['sqrt(9)', 'add(12, 3)']) // √9 first, then 12 + 3
  })

  it('at the very start, √ waits too', () => {
    expect(lines('r9=')).toEqual(['√', '√9', '3'])
    expect(press(keys('r9=')).records).toEqual([{ expression: '√9 =', result: 3 }])
  })

  it('a waiting √ shows the running total faded, and its number can be any typed number', () => {
    expect(press(keys('12+r')).display).toMatchObject({ main: '12 + √', hint: '= 12' })
    expect(press(keys('12+r1.44=')).display).toMatchObject({ main: '13.2', expression: '12 + √1.44 =' })
    expect(press(keys('12+r.25=')).display).toMatchObject({ main: '12.5', expression: '12 + √0.25 =' })
  })

  it('an operator after it calculates √ first, then the chain', () => {
    const { display, requests } = press(keys('12+r9*2='))
    expect(display).toMatchObject({ main: '30', expression: '12 + √9 × 2 =' })
    expect(requests).toEqual(['sqrt(9)', 'add(12, 3)', 'multiply(15, 2)'])
  })

  it('√ after the number still applies to it, and nests', () => {
    expect(press(keys('12+9r')).display.main).toBe('12 + √9')
    expect(press(keys('12+r16r=')).display).toMatchObject({ main: '14', expression: '12 + √(√16) =' })
  })

  it('± first makes the next number negative', () => {
    expect(lines('12+n5=')).toEqual(['1', '12', '12 +', '12 + −', '12 + −5', '7'])
    expect(press(keys('12+rn4')).display.main).toBe('12 + √−4')
  })

  it('with no number yet, %, a second √, operators and = do nothing', () => {
    for (const sequence of ['12+', '12+r', '12+n']) {
      const before = press(keys(sequence)).state
      for (const key of ['%', '=']) expect(press([key], before).state).toEqual(before)
    }
    for (const sequence of ['12+r', '12+n']) {
      const before = press(keys(sequence)).state
      for (const key of ['r', '+', '*']) expect(press([key], before).state).toEqual(before)
    }
    expect(press(keys('%')).state).toEqual(initialState)
  })

  it('a waiting √ of a negative number is an error that Backspace can fix', () => {
    const { state, display } = press(keys('12+rn4='))
    expect(display).toMatchObject({
      variant: 'error',
      expression: '12 + √−4',
      main: 'Cannot take the square root of a negative number.',
    })
    expect(press(keys('<'), state).display.main).toBe('12 + √−4')
  })

  it('a lost connection keeps "12 + √9" as typed', () => {
    const before = press(keys('12+r9')).state
    const { state } = press(keys('='), before, 'offline')
    expect({ ...state, connectionLost: false }).toEqual(before)
  })
})

describe('errors', () => {
  it.each([
    ['8/0=', 'Cannot divide by zero.', '8 ÷ 0'],
    ['0^1n=', 'Cannot divide by zero.', '0 ^ −1'],
    ['4nr', 'Cannot take the square root of a negative number.', '√−4'],
    ['8n^.5=', 'The result is undefined.', '−8 ^ 0.5'],
    ['10^400=', 'The result is too large.', '10 ^ 400'],
  ])('%s shows "%s"', (sequence, message, expression) => {
    const { display, records } = press(keys(sequence))
    expect(display).toEqual({
      variant: 'error',
      main: message,
      expression,
      hint: 'Press ⌫ to go back and fix it, or AC to start again.',
    })
    expect(records).toHaveLength(0)
  })

  it('an error mid-chain shows what was attempted', () => {
    expect(press(keys('5/0+')).display).toMatchObject({ variant: 'error', expression: '5 ÷ 0' })
  })

  it('a digit after an error starts fresh', () => {
    expect(press(keys('8/0=7')).display).toMatchObject({ variant: 'typing', main: '7', expression: '' })
  })

  it('other keys are ignored while an error shows', () => {
    const errored = press(keys('8/0=')).state
    for (const key of ['+', '=', 'n', 'r', '%']) {
      expect(press([key], errored).state).toEqual(errored)
    }
  })
})

describe('connection failures', () => {
  it('keep the input so the user can retry', () => {
    const before = press(keys('12+7')).state
    const { state, display } = press(keys('='), before, 'offline')

    expect(display).toMatchObject({ variant: 'error', main: 'Cannot reach the calculator service.', expression: '12 + 7' })
    expect({ ...state, connectionLost: false }).toEqual(before)

    expect(press(keys('='), state).display).toMatchObject({ variant: 'result', main: '19' })
  })

  it('the next key dismisses the notice and applies normally', () => {
    const offline = press(keys('12+7='), initialState, 'offline').state
    expect(press(keys('5'), offline).display).toMatchObject({ variant: 'typing', main: '12 + 75' })
  })
})

describe('backspace steps back through the whole expression', () => {
  it('deletes the operand, then the operator, then the first number', () => {
    expect(lines('12+5<<<<<')).toEqual(['1', '12', '12 +', '12 + 5', '12 +', '12', '1', '0', '0'])
  })

  it('steps back through a chain, keeping each running total', () => {
    const { state, display } = press(keys('12+5*<'))
    expect(display).toMatchObject({ main: '12 + 5' })
    expect(state).toMatchObject({ accumulator: 12, pendingOp: 'add', entry: { kind: 'typed', text: '5' } })
    expect(press(keys('='), state).display.main).toBe('17')
  })

  it('after a result, returns to the expression for editing', () => {
    const { state, display } = press(keys('12+5=<'))
    expect(display).toMatchObject({ variant: 'typing', main: '12 + 5', expression: '' })
    expect(press(keys('<8='), state).display).toMatchObject({ main: '20', expression: '12 + 8 =' })
  })

  it('after continuing from a result, goes back to that result, then its expression', () => {
    expect(lines('2+3=*<<')).toEqual(['2', '2 +', '2 + 3', '5', '5 ×', '5', '2 + 3'])
  })

  it('undoes √ and % back to the number they were applied to', () => {
    expect(lines('12+9r<<')).toEqual(['1', '12', '12 +', '12 + 9', '12 + √9', '12 + 9', '12 +'])
    expect(lines('9r<')).toEqual(['9', '√9', '9'])
    expect(lines('9+r<')).toEqual(['9', '9 +', '9 + √', '9 +'])
  })

  it('a number typed over a √ deletes back to the operator, not to the √', () => {
    expect(lines('12+9r5<<')).toEqual(['1', '12', '12 +', '12 + 9', '12 + √9', '12 + 5', '12 +', '12'])
  })

  it('an operator that replaced another goes in one step', () => {
    expect(lines('12+*<')).toEqual(['1', '12', '12 +', '12 ×', '12'])
  })

  it('deletes a waiting √ or minus as one piece each', () => {
    expect(lines('12+5n<<')).toEqual(['1', '12', '12 +', '12 + 5', '12 + −5', '12 + −', '12 +'])
    expect(lines('12+rn4<<<<')).toEqual(['1', '12', '12 +', '12 + √', '12 + √−', '12 + √−4', '12 + √−', '12 + √', '12 +', '12'])
    expect(lines('r9<<')).toEqual(['√', '√9', '√', '0'])
  })

  it('after an operator, goes back to the waiting √ as typed', () => {
    expect(lines('12+r9*<<')).toEqual(['1', '12', '12 +', '12 + √', '12 + √9', '12 + √9 ×', '12 + √9', '12 + √'])
  })

  it('undoes a recalled value', () => {
    const recalled = transition(press(keys('5+')).state, { type: 'recall', value: 76 })
    if (recalled.kind !== 'done') throw new Error('recall should not compute')
    expect(press(keys('<'), recalled.outcome.state).display.main).toBe('5 +')
  })

  it('after an error, goes back to fix the input', () => {
    const { state, display } = press(keys('8/0=<'))
    expect(display).toMatchObject({ variant: 'typing', main: '8 ÷ 0' })
    expect(press(keys('<2='), state).display).toMatchObject({ variant: 'result', main: '4', expression: '8 ÷ 2 =' })
    expect(press(keys('5/0+<')).display.main).toBe('5 ÷ 0')
    expect(press(keys('4nr<')).display.main).toBe('−4')
  })
})

describe('recall from history', () => {
  it('loads the value as the current entry', () => {
    const step = transition(press(keys('5+')).state, { type: 'recall', value: 76 })
    if (step.kind !== 'done') throw new Error('recall should not compute')
    expect(toDisplay(step.outcome.state, '')).toMatchObject({ main: '5 + 76', hint: '' })
  })

  it('starts fresh after a result, and = alone does not re-record it', () => {
    const step = transition(press(keys('2+3=')).state, { type: 'recall', value: 76 })
    if (step.kind !== 'done') throw new Error('recall should not compute')
    const { records } = press(keys('='), step.outcome.state)
    expect(records).toHaveLength(0)
  })
})

describe('preview', () => {
  const previewOf = (sequence: string) => {
    const step = previewStep(press(keys(sequence)).state)
    return step && previewText(run(step))
  }

  it('is what = would show, while the second operand is typed', () => {
    expect(previewStep(press(keys('12+7*4')).state)?.request).toEqual({ operation: 'multiply', operands: [19, 4] })
    expect(previewOf('12+7*4')).toBe('= 76')
    expect(previewOf('12+r9')).toBe('= 15')
    expect(previewOf('r9')).toBe('= 3')
  })

  it('shows the error = would cause', () => {
    expect(previewOf('8/0')).toBe('Cannot divide by zero.')
  })

  it.each([['5'], ['5+'], ['12+r'], ['2+3='], ['8/0='], ['9r']])('is not needed for "%s"', (sequence) => {
    expect(previewStep(press(keys(sequence)).state)).toBeNull()
  })

  it('is shown as the hint line while typing', () => {
    expect(toDisplay(press(keys('12+7*4')).state, '= 76').hint).toBe('= 76')
  })
})
