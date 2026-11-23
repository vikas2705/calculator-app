import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

/**
 * Modal behaviour for a dialog or sheet while `open`: moves focus inside,
 * keeps Tab inside, closes on Escape, and returns focus to where it was.
 */
export function useModal(
  containerRef: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  const onCloseRef = useRef(onClose)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const container = containerRef.current
    if (!open || !container) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusable = () => [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
    ;(initialFocusRef?.current ?? focusable()[0])?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation() // Escape closes the modal; it must not also clear the calculator.
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const items = focusable()
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) return
      const active = document.activeElement
      if (!container.contains(active)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    // Capture phase: runs before the app's global shortcut handler.
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      previouslyFocused?.focus?.()
    }
  }, [open, containerRef, initialFocusRef])
}
