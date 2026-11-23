import { useEffect, useLayoutEffect, useRef } from 'react'
import { arrowDirection } from '../domain/keys'

/**
 * Calls `onKey` for keydown anywhere on the page while `enabled`. Keys held
 * with Ctrl, Cmd or Alt are left alone so browser shortcuts keep working.
 *
 * Enter is special. If the user reached a button with Tab or the arrow keys,
 * Enter activates that button as usual. If focus is only on a button because
 * it was clicked, or the user has since been typing calculator keys, Enter is
 * passed on (to mean "="). `onKey` returns true when it handled a key, which
 * ends keyboard navigation mode.
 *
 * (CSS :focus-visible cannot decide this: browsers turn it on for the focused
 * element as soon as any key is pressed, including the Enter itself.)
 */
export function useKeyboard(onKey: (event: KeyboardEvent) => boolean, enabled: boolean) {
  const onKeyRef = useRef(onKey)
  useLayoutEffect(() => {
    onKeyRef.current = onKey
  })
  const navigatingByKeys = useRef(false)

  useEffect(() => {
    const onPointerDown = () => {
      navigatingByKeys.current = false
    }
    const onNavigationKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab' || arrowDirection(event.key)) navigatingByKeys.current = true
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onNavigationKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onNavigationKey, true)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      const onButton = document.activeElement instanceof HTMLButtonElement
      if (event.key === 'Enter' && onButton && navigatingByKeys.current) return
      if (onKeyRef.current(event)) navigatingByKeys.current = false
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [enabled])
}
