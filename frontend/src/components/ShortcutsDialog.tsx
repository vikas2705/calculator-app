import { Fragment, useRef } from 'react'
import { useModal } from '../hooks/useModal'
import { IconButton } from './IconButton'
import { CloseIcon } from './Icons'
import styles from './ShortcutsDialog.module.css'

/** The keyboard map in PLAN.md §6.3. "to" and "or" render as words, not key chips. */
const SEPARATORS = new Set(['to', 'or'])

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ['0', 'to', '9', '.'], action: 'Type a number' },
  { keys: ['+', '-', '*', '/'], action: 'Add, subtract, multiply, divide' },
  { keys: ['^'], action: 'Power' },
  { keys: ['%'], action: 'Percent' },
  { keys: ['r'], action: 'Square root' },
  { keys: ['n'], action: 'Change sign (±)' },
  { keys: ['Enter', 'or', '='], action: 'Equals' },
  { keys: ['Backspace'], action: 'Delete, or step back' },
  { keys: ['Esc', 'or', 'Delete'], action: 'Clear (AC)' },
  { keys: ['h'], action: 'Show or hide history' },
  { keys: ['t'], action: 'Switch light / dark theme' },
  { keys: ['?'], action: 'Show this help' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function ShortcutsDialog({ open, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useModal(cardRef, open, onClose, closeRef)

  if (!open) return null

  return (
    <div
      className={styles.overlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={cardRef}
        className={`glass glass-strong ${styles.card}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className={styles.head}>
          <h2 id="shortcuts-title" className={styles.title}>
            Keyboard shortcuts
          </h2>
          <IconButton ref={closeRef} aria-label="Close keyboard shortcuts" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <dl className={styles.list}>
          {SHORTCUTS.map(({ keys, action }) => (
            <Fragment key={action}>
              <dt className={styles.keys}>
                {keys.map((key) =>
                  SEPARATORS.has(key) ? (
                    <span key={key} className={styles.sep}>
                      {key}
                    </span>
                  ) : (
                    <kbd key={key} className={styles.kbd}>
                      {key}
                    </kbd>
                  ),
                )}
              </dt>
              <dd className={styles.action}>{action}</dd>
            </Fragment>
          ))}
        </dl>
      </div>
    </div>
  )
}
