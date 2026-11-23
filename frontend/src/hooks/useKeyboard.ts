import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Calls `onKey` for keydown anywhere on the page while `enabled`. Keys held
 * with Ctrl, Cmd or Alt are left alone so browser shortcuts keep working.
 *
 * Enter is special. If the user reached a button with Tab, Enter activates
 * that button as usual. If focus is only on a button because it was clicked,
 * or the user has since been typing calculator keys, Enter is passed on (to
 * mean "="). `onKey` returns true when it handled a key, which ends Tab
 * navigation mode.
 *
 * (CSS :focus-visible cannot decide this: browsers turn it on for the focused
 * element as soon as any key is pressed, including the Enter itself.)
 */
export function useKeyboard(onKey: (event: KeyboardEvent) => boolean, enabled: boolean) {
  const onKeyRef = useRef(onKey)
  useLayoutEffect(() => {
    onKeyRef.current = onKey
  })
  const navigatingByTab = useRef(false)

  useEffect(() => {
    const onPointerDown = () => {
      navigatingByTab.current = false
    }
    const onTab = (event: KeyboardEvent) => {
      if (event.key === 'Tab') navigatingByTab.current = true
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onTab, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onTab, true)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      const onButton = document.activeElement instanceof HTMLButtonElement
      if (event.key === 'Enter' && onButton && navigatingByTab.current) return
      if (onKeyRef.current(event)) navigatingByTab.current = false
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [enabled])
}
