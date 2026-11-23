import { useCallback, useEffect, useRef, useState } from 'react'

/** Design system: a key pressed from the keyboard shows its pressed state for 140ms. */
export const FLASH_MS = 140

/** Marks one id as "flashing" for a short time; used to animate keypad keys. */
export function useFlash() {
  const [active, setActive] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const flash = useCallback((id: string) => {
    window.clearTimeout(timer.current)
    setActive(id)
    timer.current = window.setTimeout(() => setActive(null), FLASH_MS)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return [active, flash] as const
}
