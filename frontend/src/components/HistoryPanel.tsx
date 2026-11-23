import { useRef, type RefObject } from 'react'
import { formatNumber } from '../domain/format'
import type { HistoryEntry } from '../hooks/useHistory'
import { useModal } from '../hooks/useModal'
import { IconButton, TextButton } from './IconButton'
import { CloseIcon } from './Icons'
import styles from './HistoryPanel.module.css'

interface Props {
  entries: HistoryEntry[]
  onClear: () => void
  /** Loads a past result into the calculator. */
  onRecall: (value: number) => void
  /** Narrow screens show history as a modal bottom sheet; wide ones as a side panel beside the calculator. */
  asSheet: boolean
  /** Hidden (and unreachable) while closed, in both forms. */
  open: boolean
  onClose: () => void
  headingRef: RefObject<HTMLHeadingElement | null>
}

/** Past calculations, newest first (design/components/HistoryPanel.md). */
export function HistoryPanel({ entries, onClear, onRecall, asSheet, open, onClose, headingRef }: Props) {
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const sheetOpen = asSheet && open
  useModal(panelRef, sheetOpen, onClose, closeRef)

  const empty = entries.length === 0
  const clear = () => {
    onClear()
    headingRef.current?.focus() // the Clear button disables itself, so keep focus in the panel
  }

  return (
    <>
      {asSheet && <div className={sheetOpen ? 'scrim open' : 'scrim'} onClick={onClose} aria-hidden="true" />}
      <aside
        ref={panelRef}
        id="history"
        aria-labelledby="history-title"
        className={['glass', styles.panel, asSheet ? styles.sheet : styles.side, open && styles.open].filter(Boolean).join(' ')}
        role={asSheet ? 'dialog' : undefined}
        aria-modal={asSheet ? true : undefined}
        inert={!open}
      >
        {asSheet && <div className={styles.handle} aria-hidden="true" />}
        <div className={styles.head}>
          <h2 id="history-title" ref={headingRef} tabIndex={-1} className={styles.title}>
            History
          </h2>
          <div className={styles.actions}>
            <TextButton onClick={clear} disabled={empty} aria-label="Clear history">
              Clear
            </TextButton>
            <IconButton ref={closeRef} aria-label="Close history" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>
        </div>

        {empty ? (
          <p className={styles.empty}>No calculations yet. Finish a calculation with = and it appears here.</p>
        ) : (
          <ol className={styles.list}>
            {entries.map((entry) => {
              const result = formatNumber(entry.result)
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={styles.row}
                    aria-label={`Use ${result}, from ${entry.expression}`}
                    onClick={() => onRecall(entry.result)}
                  >
                    <span className={styles.expression}>{entry.expression}</span>
                    <span className={styles.result}>{result}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </aside>
    </>
  )
}
