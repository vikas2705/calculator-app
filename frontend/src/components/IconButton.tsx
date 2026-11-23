import type { ComponentProps } from 'react'
import styles from './IconButton.module.css'

/** 44×44 neutral glass button with one icon (design/components/IconButton.md). Always pass an aria-label. */
export function IconButton({ className, ...props }: ComponentProps<'button'> & { 'aria-label': string }) {
  return <button type="button" className={[styles.iconButton, className].filter(Boolean).join(' ')} {...props} />
}

/** Text button sharing the icon button's look, e.g. "Clear". */
export function TextButton({ className, ...props }: ComponentProps<'button'>) {
  return <button type="button" className={[styles.textButton, className].filter(Boolean).join(' ')} {...props} />
}
