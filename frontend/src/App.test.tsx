import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { NETWORK_ERROR, type CalcResult, type Calculate } from './api/calculatorApi'
import { App } from './App'
import { HISTORY_STORAGE_KEY } from './hooks/useHistory'
import { THEME_STORAGE_KEY } from './hooks/useTheme'
import { fakeCalculate } from './test/fakeBackend'
import { setMedia } from './test/matchMedia'

const backend: Calculate = async (request) => fakeCalculate(request)

function setup(calculate: Calculate = backend) {
  const user = userEvent.setup()
  render(<App calculate={calculate} />)
  return { user }
}

const main = () => screen.getByTestId('display-main')
const expression = () => screen.getByTestId('display-expression')
const hint = () => screen.getByTestId('display-hint')
const historyPanel = () => screen.getByRole('complementary', { name: 'History' })
/** History (panel or sheet) stays in the DOM when closed but is inert (unreachable); Testing Library does not model inert. */
const historyIsOpen = () => !document.getElementById('history')!.hasAttribute('inert')
const historyButton = () => screen.getByRole('button', { name: 'History' })

describe('keyboard-only use', () => {
  it('runs a full calculation and records it', async () => {
    const { user } = setup()

    await user.keyboard('12+7*4')
    await waitFor(() => expect(main()).toHaveTextContent('12 + 7 × 4'))
    expect(expression()).toBeEmptyDOMElement()
    await waitFor(() => expect(hint()).toHaveTextContent('= 76'))

    await user.keyboard('{Enter}')
    await waitFor(() => expect(main()).toHaveTextContent('76'))
    expect(expression()).toHaveTextContent('12 + 7 × 4 =')
    expect(within(historyPanel()).getByRole('button', { name: 'Use 76, from 12 + 7 × 4 =' })).toBeInTheDocument()
  })

  it('updates the live preview on every keystroke', async () => {
    const { user } = setup()
    await user.keyboard('10+5')
    await waitFor(() => expect(hint()).toHaveTextContent('= 15'))
    await user.keyboard('0')
    await waitFor(() => expect(hint()).toHaveTextContent('= 60'))
    await user.keyboard('{Backspace}')
    await waitFor(() => expect(hint()).toHaveTextContent('= 15'))
  })

  it('shows a preview of a domain error before = is pressed', async () => {
    const { user } = setup()
    await user.keyboard('8/0')
    await waitFor(() => expect(hint()).toHaveTextContent('Cannot divide by zero.'))
  })

  it('shows the error state on =', async () => {
    const { user } = setup()
    await user.keyboard('8/0=')
    await waitFor(() => expect(main()).toHaveTextContent('Cannot divide by zero.'))
    expect(hint()).toHaveTextContent('Press ⌫ to go back and fix it, or AC to start again.')

    await user.keyboard('{Backspace}')
    await waitFor(() => expect(main()).toHaveTextContent('8 ÷ 0'))
  })

  it('Backspace steps back through the expression and out of a result (bug report 4)', async () => {
    const { user } = setup()
    await user.keyboard('12+5=')
    await waitFor(() => expect(main()).toHaveTextContent('17'))

    await user.keyboard('{Backspace}')
    await waitFor(() => expect(main()).toHaveTextContent('12 + 5'))
    await waitFor(() => expect(hint()).toHaveTextContent('= 17'))

    await user.keyboard('{Backspace}')
    await waitFor(() => expect(main()).toHaveTextContent(/^12 \+$/))
    await user.keyboard('{Backspace}')
    await waitFor(() => expect(main()).toHaveTextContent(/^12$/))
  })

  it.each(['{Escape}', '{Delete}'])('%s clears', async (key) => {
    const { user } = setup()
    await user.keyboard(`12+7${key}`)
    await waitFor(() => expect(main()).toHaveTextContent(/^0$/))
    expect(expression()).toBeEmptyDOMElement()
  })

  it('ignores digits beyond the 15-digit limit', async () => {
    const { user } = setup()
    await user.keyboard('1234567890123456')
    await waitFor(() => expect(main()).toHaveTextContent('123,456,789,012,345'))
  })

  it('r is square root, and = records it in history (bug report 2)', async () => {
    const { user } = setup()
    await user.keyboard('9r')
    await waitFor(() => expect(main()).toHaveTextContent('√9'))
    expect(hint()).toHaveTextContent('= 3')

    await user.keyboard('{Enter}')
    await waitFor(() => expect(main()).toHaveTextContent(/^3$/))
    expect(expression()).toHaveTextContent('√9 =')
    expect(within(historyPanel()).getByRole('button', { name: 'Use 3, from √9 =' })).toBeInTheDocument()
  })

  it('r after an operator waits for the next number', async () => {
    const { user } = setup()
    await user.keyboard('12+r')
    await waitFor(() => expect(main()).toHaveTextContent('12 + √'))
    await user.keyboard('9')
    await waitFor(() => expect(hint()).toHaveTextContent('= 15'))
    await user.keyboard('{Enter}')
    await waitFor(() => expect(main()).toHaveTextContent(/^15$/))
    expect(within(historyPanel()).getByRole('button', { name: 'Use 15, from 12 + √9 =' })).toBeInTheDocument()
  })

  it('a number typed right after % multiplies it: 32%2 = 0.64', async () => {
    const { user } = setup()
    await user.keyboard('32%2')
    await waitFor(() => expect(main()).toHaveTextContent('32% × 2'))
    await waitFor(() => expect(hint()).toHaveTextContent('= 0.64'))
    await user.keyboard('{Enter}')
    await waitFor(() => expect(main()).toHaveTextContent(/^0\.64$/))
    expect(expression()).toHaveTextContent('32% × 2 =')
  })

  it('ignores keys held with Ctrl, Cmd or Alt', async () => {
    const { user } = setup()
    await user.keyboard('{Control>}7{/Control}{Meta>}8{/Meta}{Alt>}9{/Alt}')
    expect(main()).toHaveTextContent(/^0$/)
  })

  it('flashes the matching key', async () => {
    const { user } = setup()
    await user.keyboard('7')
    expect(screen.getByRole('button', { name: '7' }).className).toMatch(/pressed/)
  })
})

describe('Enter and focused buttons', () => {
  it('after mouse clicks, Enter means equals (no double press)', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: '7' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.keyboard('{Enter}')
    await waitFor(() => expect(main()).toHaveTextContent('9'))
  })

  it('on a button reached with Tab, Enter presses that button once', async () => {
    const { user } = setup()
    screen.getByRole('button', { name: '5' }).focus()
    await user.tab()
    expect(screen.getByRole('button', { name: '6' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(main()).toHaveTextContent(/^6$/))
  })

  it('after typing calculator keys, Enter means equals again', async () => {
    const { user } = setup()
    screen.getByRole('button', { name: '5' }).focus()
    await user.tab() // focus on "6"
    await user.keyboard('2+3{Enter}')
    await waitFor(() => expect(main()).toHaveTextContent(/^5$/))
  })
})

describe('arrow keys on the keypad', () => {
  const key = (name: string) => screen.getByRole('button', { name })

  it('move focus around the grid and stop at its edges', async () => {
    const { user } = setup()
    key('5').focus()
    await user.keyboard('{ArrowUp}')
    expect(key('8')).toHaveFocus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(key('Subtract')).toHaveFocus()
    await user.keyboard('{ArrowRight}') // right edge
    expect(key('Subtract')).toHaveFocus()
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}') // − → + → = (two rows tall) → stays
    expect(key('Equals')).toHaveFocus()
    await user.keyboard('{ArrowLeft}{ArrowDown}{ArrowLeft}')
    expect(key('0')).toHaveFocus()
    expect(main()).toHaveTextContent(/^0$/) // moving presses nothing
  })

  it('Enter then presses the focused key, once', async () => {
    const { user } = setup()
    key('5').focus()
    await user.keyboard('{ArrowDown}{Enter}')
    await waitFor(() => expect(main()).toHaveTextContent(/^2$/))
  })

  it('after a mouse click, Enter presses the key reached with an arrow', async () => {
    const { user } = setup()
    await user.click(key('5'))
    await user.keyboard('{ArrowRight}{Enter}')
    await waitFor(() => expect(main()).toHaveTextContent(/^56$/))
  })

  it('after moving and then typing, Enter means equals again', async () => {
    const { user } = setup()
    key('5').focus()
    await user.keyboard('{ArrowUp}2+3{Enter}')
    await waitFor(() => expect(main()).toHaveTextContent(/^5$/))
  })

  it('do nothing when focus is outside the keypad, or with Shift held', async () => {
    const { user } = setup()
    await user.keyboard('{ArrowDown}')
    expect(document.body).toHaveFocus()
    key('5').focus()
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}')
    expect(key('5')).toHaveFocus()
  })
})

describe('shortcuts dialog', () => {
  it('opens with ?, closes with Escape without clearing, and restores focus', async () => {
    const { user } = setup()
    await user.keyboard('42')
    const helpButton = screen.getByRole('button', { name: 'Keyboard shortcuts' })
    helpButton.focus()

    await user.keyboard('?')
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' })
    expect(within(dialog).getByRole('button', { name: 'Close keyboard shortcuts' })).toHaveFocus()

    await user.keyboard('5') // calculator keys are ignored while it is open
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(main()).toHaveTextContent('42')
    expect(helpButton).toHaveFocus()
  })

  it('keeps Tab inside', async () => {
    const { user } = setup()
    await user.keyboard('?')
    const close = screen.getByRole('button', { name: 'Close keyboard shortcuts' })
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(close).toHaveFocus()
  })

  it('closes on a click outside the card', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }))
    const overlay = screen.getByRole('dialog').parentElement!
    await user.click(overlay)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('theme', () => {
  it('follows the system setting', () => {
    setMedia({ dark: true })
    setup()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('the toggle switches it, remembers the choice, and the choice beats the system', async () => {
    const { user } = setup()
    expect(document.documentElement.dataset.theme).toBe('light')

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme (Aurora Night)' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme (Pastel Morning)' })).toBeInTheDocument()

    act(() => setMedia({ dark: false }))
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('t switches it from the keyboard (bug report 1)', async () => {
    const { user } = setup()
    await user.keyboard('t')
    expect(document.documentElement.dataset.theme).toBe('dark')
    await user.keyboard('T')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(main()).toHaveTextContent(/^0$/)
  })

  it('restores a saved choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    setup()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})

describe('history', () => {
  it('loads saved history and ignores invalid rows', () => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([{ expression: '2 + 3 =', result: 5 }, { expression: 'bad' }, null, { expression: 'x', result: 'NaN' }]),
    )
    setup()
    expect(within(historyPanel()).getAllByRole('listitem')).toHaveLength(1)
  })

  it('survives corrupt storage', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, '{not json')
    setup()
    expect(within(historyPanel()).getByText(/No calculations yet/)).toBeInTheDocument()
  })

  it('clicking a row loads its result, and the side panel stays open', async () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([{ expression: '12 + 7 × 4 =', result: 76 }]))
    const { user } = setup()
    await user.keyboard('5+')
    await user.click(historyButton())
    await user.click(screen.getByRole('button', { name: 'Use 76, from 12 + 7 × 4 =' }))
    await waitFor(() => expect(main()).toHaveTextContent('5 + 76'))
    await waitFor(() => expect(hint()).toHaveTextContent('= 81'))
    expect(historyIsOpen()).toBe(true)
  })

  it('Clear empties the list, disables itself and keeps focus in the panel', async () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([{ expression: '2 + 3 =', result: 5 }]))
    const { user } = setup()
    await user.click(historyButton())
    const clear = screen.getByRole('button', { name: 'Clear history' })
    await user.click(clear)

    expect(within(historyPanel()).getByText(/No calculations yet/)).toBeInTheDocument()
    expect(clear).toBeDisabled()
    expect(screen.getByRole('heading', { name: 'History' })).toHaveFocus()
    expect(JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)!)).toEqual([])
  })

})

describe('history side panel on wide screens', () => {
  it('starts hidden; the History button shows and hides it, leaving focus on the button', async () => {
    const { user } = setup()
    expect(historyIsOpen()).toBe(false)
    expect(historyButton()).toHaveAttribute('aria-expanded', 'false')

    await user.click(historyButton())
    expect(historyIsOpen()).toBe(true)
    expect(historyButton()).toHaveAttribute('aria-expanded', 'true')
    expect(historyButton()).toHaveFocus()
    expect(screen.queryByRole('dialog')).toBeNull() // a side panel, not a modal

    await user.click(historyButton())
    expect(historyIsOpen()).toBe(false)
  })

  it('h shows and hides it, and typing keeps working while it is open', async () => {
    const { user } = setup()
    await user.keyboard('h')
    expect(historyIsOpen()).toBe(true)
    await user.keyboard('2+3=')
    await waitFor(() => expect(main()).toHaveTextContent(/^5$/))
    expect(within(historyPanel()).getByRole('button', { name: 'Use 5, from 2 + 3 =' })).toBeInTheDocument()
    await user.keyboard('h')
    expect(historyIsOpen()).toBe(false)
  })

  it('its close button hides it and hands focus back to the History button', async () => {
    const { user } = setup()
    await user.click(historyButton())
    await user.click(screen.getByRole('button', { name: 'Close history' }))
    expect(historyIsOpen()).toBe(false)
    expect(historyButton()).toHaveFocus()
  })
})

describe('history sheet on narrow screens', () => {
  it('opens from the history button, closes on Escape and returns focus', async () => {
    setMedia({ narrow: true })
    const { user } = setup()
    await user.keyboard('42')
    const open = historyButton()

    await user.click(open)
    const sheet = screen.getByRole('dialog', { name: 'History' })
    expect(open).toHaveAttribute('aria-expanded', 'true')
    expect(within(sheet).getByRole('button', { name: 'Close history' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(historyIsOpen()).toBe(false)
    expect(open).toHaveAttribute('aria-expanded', 'false')
    expect(open).toHaveFocus()
    expect(main()).toHaveTextContent('42') // Escape closed the sheet, it did not clear
  })

  it('h opens and closes it, with focus inside while open (bug report 3)', async () => {
    setMedia({ narrow: true })
    const { user } = setup()
    expect(historyIsOpen()).toBe(false)
    await user.keyboard('h')
    expect(historyIsOpen()).toBe(true)
    expect(screen.getByRole('button', { name: 'Close history' })).toHaveFocus()
    expect(within(screen.getByRole('dialog', { name: 'History' })).getByText(/No calculations yet/)).toBeInTheDocument()

    await user.keyboard('7t') // calculator keys wait while the sheet is open; t still works
    expect(main()).toHaveTextContent(/^0$/)
    expect(document.documentElement.dataset.theme).toBe('dark')

    await user.keyboard('h')
    expect(historyIsOpen()).toBe(false)
  })

  it('the scrim closes it', async () => {
    setMedia({ narrow: true })
    const { user } = setup()
    await user.keyboard('h')
    await user.click(document.querySelector('.scrim')!)
    expect(historyIsOpen()).toBe(false)
  })

  it('recalling a row closes the sheet', async () => {
    setMedia({ narrow: true })
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([{ expression: '2 + 3 =', result: 5 }]))
    const { user } = setup()
    await user.click(historyButton())
    await user.click(screen.getByRole('button', { name: 'Use 5, from 2 + 3 =' }))
    expect(historyIsOpen()).toBe(false)
    await waitFor(() => expect(main()).toHaveTextContent('5'))
  })

  it('becomes a closed side panel when the window widens', async () => {
    setMedia({ narrow: true })
    const { user } = setup()
    await user.click(historyButton())
    act(() => setMedia({ narrow: false }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(historyPanel()).toBeInTheDocument()
    expect(historyIsOpen()).toBe(false)
  })
})

describe('backend problems', () => {
  it('a lost connection keeps the input and = retries', async () => {
    let online = false
    const offline: CalcResult = { ok: false, error: { code: NETWORK_ERROR, message: 'Cannot reach the calculator service.' } }
    const flaky: Calculate = async (request) => (online ? fakeCalculate(request) : offline)
    const { user } = setup(flaky)

    await user.keyboard('12+7=')
    await waitFor(() => expect(main()).toHaveTextContent('Cannot reach the calculator service.'))
    expect(hint()).toHaveTextContent('Check that it is running, then try again.')

    online = true
    await user.keyboard('=')
    await waitFor(() => expect(main()).toHaveTextContent('19'))
  })

  it('an unexpected response shows its message', async () => {
    const broken: Calculate = async () => ({
      ok: false,
      error: { code: 'UNEXPECTED_RESPONSE', message: 'The calculator service sent an unexpected response.' },
    })
    const { user } = setup(broken)
    await user.keyboard('1+1=')
    await waitFor(() => expect(main()).toHaveTextContent('The calculator service sent an unexpected response.'))
  })
})
