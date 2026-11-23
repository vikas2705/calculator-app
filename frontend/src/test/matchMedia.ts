/**
 * jsdom has no window.matchMedia. This stand-in answers the two queries the
 * app uses from a mutable `media` object, and notifies listeners on change.
 */
export const media = { narrow: false, dark: false }

const listeners = new Set<() => void>()

function matches(query: string): boolean {
  if (query.includes('max-width: 759px')) return media.narrow
  if (query.includes('prefers-color-scheme: dark')) return media.dark
  return false
}

export function installMatchMedia() {
  window.matchMedia = (query: string) =>
    ({
      media: query,
      get matches() {
        return matches(query)
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    }) as unknown as MediaQueryList
}

export function setMedia(next: Partial<typeof media>) {
  Object.assign(media, next)
  listeners.forEach((listener) => listener())
}

export function resetMedia() {
  media.narrow = false
  media.dark = false
}
