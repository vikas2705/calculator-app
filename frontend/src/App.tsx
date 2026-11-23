import { useCallback, useEffect, useRef, useState } from 'react'
import type { Calculate } from './api/calculatorApi'
import { Background } from './components/Background'
import { Calculator } from './components/Calculator'
import { HistoryPanel } from './components/HistoryPanel'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { TopBar } from './components/TopBar'
import { keyForKeyboard } from './domain/keys'
import { useCalculator } from './hooks/useCalculator'
import { useFlash } from './hooks/useFlash'
import { useHistory } from './hooks/useHistory'
import { useKeyboard } from './hooks/useKeyboard'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useTheme } from './hooks/useTheme'
import styles from './App.module.css'

/** Below this width history becomes a bottom sheet (design system breakpoint). */
export const NARROW_QUERY = '(max-width: 759px)'

export function App({ calculate }: { calculate?: Calculate }) {
  const { theme, toggleTheme } = useTheme()
  const history = useHistory()
  const { display, dispatch, rejections } = useCalculator({ calculate, onRecord: history.add })
  const narrow = useMediaQuery(NARROW_QUERY)
  const [flashedKey, flash] = useFlash()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  /** History is hidden until asked for: a side panel on wide screens, a bottom sheet on narrow ones. */
  const [historyOpen, setHistoryOpen] = useState(false)
  const historyHeadingRef = useRef<HTMLHeadingElement>(null)
  const historyButtonRef = useRef<HTMLButtonElement>(null)

  // Crossing the breakpoint switches between panel and sheet; start closed.
  useEffect(() => {
    setHistoryOpen(false)
  }, [narrow])
  const sheetVisible = narrow && historyOpen

  const closeHistory = useCallback(() => {
    setHistoryOpen(false)
    // Focus inside the panel would be lost when it hides; hand it back to the button.
    // (The sheet's focus trap restores focus itself.)
    if (!narrow && document.getElementById('history')?.contains(document.activeElement)) {
      historyButtonRef.current?.focus()
    }
  }, [narrow])

  const toggleHistory = useCallback(() => {
    if (historyOpen) closeHistory()
    else setHistoryOpen(true)
  }, [historyOpen, closeHistory])

  const recall = useCallback(
    (value: number) => {
      dispatch({ type: 'recall', value })
      if (narrow) setHistoryOpen(false) // the side panel stays open, so more rows can be reused
    },
    [dispatch, narrow],
  )

  useKeyboard(
    (event) => {
      const key = event.key.toLowerCase()
      if (key === 'h') {
        toggleHistory()
      } else if (key === 't') {
        toggleTheme()
      } else if (sheetVisible) {
        return false // the open history sheet only answers h, t and its own keys (Esc, Tab)
      } else if (key === '?') {
        setShortcutsOpen(true)
      } else {
        const keyDef = keyForKeyboard(event.key)
        if (!keyDef) return false
        flash(keyDef.id)
        dispatch(keyDef.input)
      }
      event.preventDefault()
      return true
    },
    // The shortcuts dialog handles its own keys (Esc, Tab).
    !shortcutsOpen,
  )

  return (
    <>
      <Background />
      <TopBar theme={theme} onToggleTheme={toggleTheme} onShowShortcuts={() => setShortcutsOpen(true)} />
      <main className={styles.page}>
        <div className={`${styles.stage} ${historyOpen ? styles.withHistory : ''}`}>
          <Calculator
            display={display}
            shake={rejections}
            onPress={(key) => dispatch(key.input)}
            flashedKey={flashedKey}
            onToggleHistory={toggleHistory}
            historyOpen={historyOpen}
            historyButtonRef={historyButtonRef}
          />
          <HistoryPanel
            entries={history.entries}
            onClear={history.clear}
            onRecall={recall}
            asSheet={narrow}
            open={historyOpen}
            onClose={closeHistory}
            headingRef={historyHeadingRef}
          />
        </div>
      </main>
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  )
}
