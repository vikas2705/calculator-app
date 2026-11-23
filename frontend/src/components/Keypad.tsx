import type { KeyboardEvent } from 'react'
import { arrowDirection, KEYPAD, neighborKey, type KeyDef } from '../domain/keys'
import { BackspaceIcon } from './Icons'
import styles from './Keypad.module.css'

interface Props {
  onPress: (key: KeyDef) => void
  /** Key currently showing its pressed state because it was typed on the keyboard. */
  flashedId: string | null
}

/**
 * Arrow keys move focus between keys, following the grid. Tab still visits
 * every key in order. The arrow key's default (scrolling the page) is
 * prevented, which also tells the page-wide keyboard handler to ignore it.
 */
function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  const direction = arrowDirection(event.key)
  if (!direction || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  const current = (event.target as HTMLElement).closest<HTMLElement>('[data-key]')?.dataset.key
  if (current === undefined) return
  event.preventDefault()
  const next = neighborKey(current, direction)
  if (next !== undefined) event.currentTarget.querySelector<HTMLElement>(`[data-key="${next}"]`)?.focus()
}

/** The 4-column key grid (design/components/Keypad.md and Key.md). */
export function Keypad({ onPress, flashedId }: Props) {
  return (
    <div className={styles.keys} role="group" aria-label="Keypad" onKeyDown={moveFocus}>
      {KEYPAD.map((key) => (
        <button
          key={key.id}
          type="button"
          data-key={key.id}
          aria-label={key.ariaLabel}
          className={[
            styles.key,
            styles[key.role],
            key.span === 'rows' && styles.spanRows,
            key.span === 'columns' && styles.spanColumns,
            flashedId === key.id && styles.pressed,
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onPress(key)}
        >
          <KeyLabel keyDef={key} />
        </button>
      ))}
    </div>
  )
}

function KeyLabel({ keyDef }: { keyDef: KeyDef }) {
  if (keyDef.id === 'backspace') return <BackspaceIcon />
  if (keyDef.id === 'power') {
    return (
      <span>
        x<sup>y</sup>
      </span>
    )
  }
  return keyDef.label
}
