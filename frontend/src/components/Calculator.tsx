import type { RefObject } from 'react'
import type { DisplayModel } from '../domain/calculator'
import type { KeyDef } from '../domain/keys'
import { Display } from './Display'
import { IconButton } from './IconButton'
import { HistoryIcon } from './Icons'
import { Keypad } from './Keypad'
import styles from './Calculator.module.css'

interface Props {
  display: DisplayModel
  /** See Display: changes when a digit is refused. */
  shake: number
  onPress: (key: KeyDef) => void
  flashedKey: string | null
  /** Shows or hides the history panel (a bottom sheet on phones). */
  onToggleHistory: () => void
  historyOpen: boolean
  historyButtonRef: RefObject<HTMLButtonElement | null>
}

/** The calculator card: the history button, the display, then the keypad. */
export function Calculator({ display, shake, onPress, flashedKey, onToggleHistory, historyOpen, historyButtonRef }: Props) {
  return (
    <section className={`glass ${styles.card}`} aria-label="Calculator">
      <IconButton
        ref={historyButtonRef}
        className={`${styles.historyButton} ${display.variant === 'result' ? styles.onResult : ''}`}
        aria-label="History"
        aria-controls="history"
        aria-expanded={historyOpen}
        onClick={onToggleHistory}
      >
        <HistoryIcon />
      </IconButton>
      <Display model={display} shake={shake} />
      <Keypad onPress={onPress} flashedId={flashedKey} />
    </section>
  )
}
