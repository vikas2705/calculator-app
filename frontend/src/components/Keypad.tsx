import { KEYPAD, type KeyDef } from '../domain/keys'
import { BackspaceIcon } from './Icons'
import styles from './Keypad.module.css'

interface Props {
  onPress: (key: KeyDef) => void
  /** Key currently showing its pressed state because it was typed on the keyboard. */
  flashedId: string | null
}

/** The 4-column key grid (design/components/Keypad.md and Key.md). */
export function Keypad({ onPress, flashedId }: Props) {
  return (
    <div className={styles.keys} role="group" aria-label="Keypad">
      {KEYPAD.map((key) => (
        <button
          key={key.id}
          type="button"
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
