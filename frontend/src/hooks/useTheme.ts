import { useCallback, useEffect, useState } from 'react'
import { useMediaQuery } from './useMediaQuery'

export type Theme = 'light' | 'dark'

/** Must match the inline script in index.html that sets the theme before first paint. */
export const THEME_STORAGE_KEY = 'calculator.theme'

/**
 * Follows the system setting until the user picks a theme; their pick then
 * wins and is remembered.
 */
export function useTheme() {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [chosen, setChosen] = useState<Theme | null>(readSaved)
  const theme: Theme = chosen ?? (systemDark ? 'dark' : 'light')

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    const base = getComputedStyle(root).getPropertyValue('--bg-base').trim()
    if (base) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', base)
  }, [theme])

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setChosen(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Not remembering the choice is acceptable.
    }
  }, [theme])

  return { theme, toggleTheme }
}

function readSaved(): Theme | null {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return saved === 'light' || saved === 'dark' ? saved : null
  } catch {
    return null
  }
}
