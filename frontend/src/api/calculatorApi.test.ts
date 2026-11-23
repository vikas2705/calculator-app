import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculate, ENDPOINT, NETWORK_ERROR, UNEXPECTED_RESPONSE } from './calculatorApi'

const request = { operation: 'add', operands: [2, 3] } as const

function mockFetch(status: number, body: unknown) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(text, { status }))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('calculate', () => {
  it('POSTs JSON to the endpoint', async () => {
    const fetchMock = mockFetch(200, { result: 5 })
    await calculate({ ...request, operands: [2, 3] })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(ENDPOINT)
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init?.body as string)).toEqual({ operation: 'add', operands: [2, 3] })
  })

  it('returns the result', async () => {
    mockFetch(200, { result: 5 })
    expect(await calculate({ ...request, operands: [2, 3] })).toEqual({ ok: true, value: 5 })
  })

  it('returns the server error as-is', async () => {
    const error = { code: 'DIVISION_BY_ZERO', message: 'Cannot divide by zero.' }
    mockFetch(422, { error })
    expect(await calculate({ operation: 'divide', operands: [1, 0] })).toEqual({ ok: false, error })
  })

  it.each([
    ['non-JSON body', 200, 'not json'],
    ['missing result', 200, {}],
    ['non-numeric result', 200, { result: '5' }],
    ['error without message', 500, { error: { code: 'X' } }],
    ['empty 502 from a proxy', 502, ''],
  ])('reports an unexpected response: %s', async (_name, status, body) => {
    mockFetch(status, body)
    const result = await calculate({ ...request, operands: [2, 3] })
    expect(result).toMatchObject({ ok: false, error: { code: UNEXPECTED_RESPONSE } })
  })

  it('reports a network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const result = await calculate({ ...request, operands: [2, 3] })
    expect(result).toEqual({
      ok: false,
      error: { code: NETWORK_ERROR, message: 'Cannot reach the calculator service.' },
    })
  })

  it('reports a timeout as a network failure', async () => {
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.abort())
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) =>
      init?.signal?.aborted ? Promise.reject(new DOMException('timed out', 'TimeoutError')) : Promise.resolve(new Response('{}')),
    )
    const result = await calculate({ ...request, operands: [2, 3] })
    expect(result).toMatchObject({ ok: false, error: { code: NETWORK_ERROR } })
  })

  it('rejects when the caller cancels, so stale work can be ignored', async () => {
    const controller = new AbortController()
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      controller.abort()
      return Promise.reject(new DOMException('aborted', 'AbortError'))
    })
    await expect(calculate({ ...request, operands: [2, 3] }, controller.signal)).rejects.toThrow('aborted')
  })
})
