import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { installMatchMedia, resetMedia } from './matchMedia'

installMatchMedia()

afterEach(() => {
  cleanup()
  localStorage.clear()
  resetMedia()
  document.documentElement.removeAttribute('data-theme')
})
