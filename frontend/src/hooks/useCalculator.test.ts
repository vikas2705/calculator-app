import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CalcResult, Calculate } from '../api/calculatorApi'
import type { Digit } from '../domain/entry'
import type { CalcRequest } from '../domain/operations'
import { fakeCalculate } from '../test/fakeBackend'
import { useCalculator } from './useCalculator'

/** A backend whose answers arrive only when the test releases them. */
function controllableBackend() {
  const pending: { request: CalcRequest; signal?: AbortSignal; resolve: (r: CalcResult) => void }[] = []
  const calculate: Calculate = (request, signal) =>
    new Promise((resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      pending.push({ request, signal, resolve })
    })
  const answer = (index: number) => {
    const call = pending[index]!
    call.resolve(fakeCalculate(call.request))
  }
  return { calculate, pending, answer }
}

const digit = (d: Digit) => ({ type: 'digit', digit: d }) as const

describe('useCalculator', () => {
  it('applies inputs in order even when the backend is slow', async () => {
    const { calculate, pending, answer } = controllableBackend()
    const { result } = renderHook(() => useCalculator({ calculate }))

    act(() => {
      result.current.dispatch(digit('2'))
      result.current.dispatch({ type: 'operator', op: 'add' })
      result.current.dispatch(digit('3'))
      result.current.dispatch({ type: 'operator', op: 'multiply' }) // needs the backend: 2 + 3
      result.current.dispatch(digit('4')) // must wait for it
      result.current.dispatch({ type: 'equals' })
    })

    const commits = () => pending.filter((p) => !p.signal) // previews carry an abort signal
    await waitFor(() => expect(commits()).toHaveLength(1))
    expect(result.current.display.main).toBe('2 + 3') // "×" and "4" have not been applied yet
    await act(async () => answer(pending.indexOf(commits()[0]!)))

    await waitFor(() => expect(commits()).toHaveLength(2))
    expect(commits()[1]!.request).toEqual({ operation: 'multiply', operands: [5, 4] })
    await act(async () => answer(pending.indexOf(commits()[1]!)))

    await waitFor(() => expect(result.current.display.main).toBe('20'))
  })

  it('never shows a stale preview', async () => {
    const { calculate, pending, answer } = controllableBackend()
    const { result } = renderHook(() => useCalculator({ calculate }))

    act(() => {
      result.current.dispatch(digit('5'))
      result.current.dispatch({ type: 'operator', op: 'add' })
      result.current.dispatch(digit('1'))
    })
    await waitFor(() => expect(pending).toHaveLength(1))
    const first = pending[0]!

    act(() => result.current.dispatch(digit('0'))) // entry is now 10
    await waitFor(() => expect(pending).toHaveLength(2))
    expect(first.signal?.aborted).toBe(true)

    await act(async () => answer(1))
    await waitFor(() => expect(result.current.display.hint).toBe('= 15'))
  })

  it('previews a waiting √ with two backend calls: √9, then 12 + 3', async () => {
    const calculate: Calculate = async (request) => fakeCalculate(request)
    const { result } = renderHook(() => useCalculator({ calculate }))
    act(() => {
      for (const d of '12') result.current.dispatch(digit(d as Digit))
      result.current.dispatch({ type: 'operator', op: 'add' })
      result.current.dispatch({ type: 'unary', op: 'sqrt' })
      result.current.dispatch(digit('9'))
    })
    await waitFor(() => expect(result.current.display).toMatchObject({ main: '12 + √9', hint: '= 15' }))
  })

  it('reports each finished calculation once', async () => {
    const onRecord = vi.fn()
    const calculate: Calculate = async (request) => fakeCalculate(request)
    const { result } = renderHook(() => useCalculator({ calculate, onRecord }))

    act(() => {
      result.current.dispatch(digit('2'))
      result.current.dispatch({ type: 'operator', op: 'power' })
      result.current.dispatch(digit('8'))
      result.current.dispatch({ type: 'equals' })
      result.current.dispatch({ type: 'equals' })
    })

    await waitFor(() => expect(result.current.display.main).toBe('256'))
    expect(onRecord).toHaveBeenCalledTimes(1)
    expect(onRecord).toHaveBeenCalledWith({ expression: '2 ^ 8 =', result: 256 })
  })

  it('counts refused digits so the display can shake', async () => {
    const calculate: Calculate = async (request) => fakeCalculate(request)
    const { result } = renderHook(() => useCalculator({ calculate }))
    act(() => {
      for (const d of '1234567890123456789') result.current.dispatch(digit(d as Digit))
    })
    await waitFor(() => expect(result.current.rejections).toBe(4))
  })

  it('treats a throwing backend as a lost connection', async () => {
    const calculate: Calculate = async () => {
      throw new Error('boom')
    }
    const { result } = renderHook(() => useCalculator({ calculate }))
    act(() => {
      result.current.dispatch(digit('1'))
      result.current.dispatch({ type: 'operator', op: 'add' })
      result.current.dispatch(digit('1'))
      result.current.dispatch({ type: 'equals' })
    })
    await waitFor(() => expect(result.current.display.main).toBe('Cannot reach the calculator service.'))
  })
})
