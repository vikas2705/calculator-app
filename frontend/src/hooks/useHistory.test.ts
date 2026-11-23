import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HISTORY_LIMIT, HISTORY_STORAGE_KEY, useHistory } from './useHistory'

describe('useHistory', () => {
  it('adds newest first and persists', () => {
    const { result } = renderHook(() => useHistory())
    act(() => result.current.add({ expression: '1 + 1 =', result: 2 }))
    act(() => result.current.add({ expression: '2 + 2 =', result: 4 }))

    expect(result.current.entries.map((e) => e.result)).toEqual([4, 2])
    expect(JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)!)).toEqual([
      { expression: '2 + 2 =', result: 4 },
      { expression: '1 + 1 =', result: 2 },
    ])
  })

  it(`keeps only the latest ${HISTORY_LIMIT}`, () => {
    const { result } = renderHook(() => useHistory())
    act(() => {
      for (let i = 1; i <= HISTORY_LIMIT + 5; i++) result.current.add({ expression: `${i} =`, result: i })
    })
    expect(result.current.entries).toHaveLength(HISTORY_LIMIT)
    expect(result.current.entries[0]!.result).toBe(HISTORY_LIMIT + 5)
    expect(result.current.entries.at(-1)!.result).toBe(6)
  })

  it('gives every entry a unique id', () => {
    const { result } = renderHook(() => useHistory())
    act(() => {
      result.current.add({ expression: '1 =', result: 1 })
      result.current.add({ expression: '1 =', result: 1 })
    })
    const [a, b] = result.current.entries
    expect(a!.id).not.toBe(b!.id)
  })

  it('keeps working when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const { result } = renderHook(() => useHistory())
    expect(result.current.entries).toEqual([])
    act(() => result.current.add({ expression: '1 + 1 =', result: 2 }))
    expect(result.current.entries).toHaveLength(1)
  })

  it('ignores stored data that is not a list', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ expression: '1 =', result: 1 }))
    const { result } = renderHook(() => useHistory())
    expect(result.current.entries).toEqual([])
  })
})
