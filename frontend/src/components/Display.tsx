import { useEffect, useLayoutEffect, useRef } from 'react'
import type { DisplayModel } from '../domain/calculator'
import { InfoIcon } from './Icons'
import styles from './Display.module.css'

const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-6px)' },
  { transform: 'translateX(6px)' },
  { transform: 'translateX(-4px)' },
  { transform: 'translateX(4px)' },
  { transform: 'translateX(0)' },
]

interface Props {
  model: DisplayModel
  /** Changes each time a digit is refused at the length limit; the number shakes briefly. */
  shake: number
}

/**
 * The three-line readout (design/components/Display.md). While typing, the big
 * line is the expression and the faded line its running result; after =, the
 * small top line is the expression and the big line the result.
 * Long text shrinks to fit; past the smallest size, the start is cut off so the
 * end (where typing happens) stays in view.
 */
export function Display({ model, shake }: Props) {
  const { variant, expression, main, hint } = model
  const displayRef = useRef<HTMLDivElement>(null)
  const expressionRef = useRef<HTMLParagraphElement>(null)
  const mainRef = useRef<HTMLParagraphElement>(null)
  const hintRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    let active = true
    const fitAll = () => {
      const display = displayRef.current
      const expressionLine = expressionRef.current
      const mainLine = mainRef.current
      const hintLine = hintRef.current
      if (!active || !display || !expressionLine || !mainLine || !hintLine) return

      shrinkToFit(expressionLine, expressionLine, 18, 12) // then the CSS ellipsis takes over
      const mainText = mainLine.lastElementChild as HTMLElement | null
      hintLine.style.fontSize = ''
      if (variant === 'error' || !mainText) {
        mainLine.style.fontSize = '' // error text wraps at its fixed size
        return
      }
      const start = Math.round(Math.min(80, Math.max(48, display.clientWidth * 0.23)))
      const size = shrinkToFit(mainLine, mainText, start, 18)
      // The faded line is never bigger than the bright line above it.
      if (size < parseFloat(getComputedStyle(hintLine).fontSize)) hintLine.style.fontSize = `${size}px`
    }

    fitAll()
    window.addEventListener('resize', fitAll)
    document.fonts?.ready.then(fitAll)
    return () => {
      active = false
      window.removeEventListener('resize', fitAll)
    }
  }, [variant, expression, main])

  useEffect(() => {
    if (shake === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    mainRef.current?.animate?.(SHAKE, { duration: 300, easing: 'ease-in-out' })
  }, [shake])

  const variantClass = variant === 'result' ? styles.result : variant === 'error' ? styles.error : ''

  return (
    <div ref={displayRef} className={`${styles.display} ${variantClass}`} aria-live="polite" aria-atomic="true">
      <p ref={expressionRef} className={styles.expression} data-testid="display-expression">
        {expression}
      </p>
      <p ref={mainRef} className={styles.main} data-testid="display-main">
        {variant === 'error' && <InfoIcon />}
        <span>{main}</span>
      </p>
      <p ref={hintRef} className={styles.hint} data-testid="display-hint">
        {hint}
      </p>
    </div>
  )
}

/** Steps the line's font size down 2px at a time until `text` fits on one line; returns the size. */
function shrinkToFit(line: HTMLElement, text: HTMLElement, max: number, min: number): number {
  let size = max
  line.style.fontSize = `${size}px`
  while (size > min && text.scrollWidth > line.clientWidth + 1) {
    size -= 2
    line.style.fontSize = `${size}px`
  }
  return size
}
