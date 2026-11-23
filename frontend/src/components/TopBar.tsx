import type { Theme } from '../hooks/useTheme'
import { IconButton } from './IconButton'
import { MoonIcon, SunIcon } from './Icons'
import styles from './TopBar.module.css'

interface Props {
  theme: Theme
  onToggleTheme: () => void
  onShowShortcuts: () => void
}

/** Floating sticky bar: app name, theme toggle and keyboard-shortcuts button. */
export function TopBar({ theme, onToggleTheme, onShowShortcuts }: Props) {
  const toggleLabel =
    theme === 'dark' ? 'Switch to light theme (Pastel Morning)' : 'Switch to dark theme (Aurora Night)'

  return (
    <header className={`glass glass-strong ${styles.topBar}`}>
      <div className={styles.inner}>
        <h1 className={styles.brand}>Calculator</h1>
        <div className={styles.controls}>
          <IconButton aria-label={toggleLabel} onClick={onToggleTheme}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </IconButton>
          <IconButton aria-label="Keyboard shortcuts" aria-haspopup="dialog" onClick={onShowShortcuts}>
            ?
          </IconButton>
        </div>
      </div>
    </header>
  )
}
