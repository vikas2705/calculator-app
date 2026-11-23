/**
 * The only module that talks to the backend. It never throws for HTTP or
 * network problems; every outcome comes back as a value. The one exception
 * is cancellation by the caller, which rejects so stale work can be dropped.
 */
import type { CalcRequest } from '../domain/operations'

export const ENDPOINT = '/api/v1/calculate'
export const TIMEOUT_MS = 5000

export interface ApiError {
  code: string
  message: string
}

export type CalcResult = { ok: true; value: number } | { ok: false; error: ApiError }

/** Codes produced on the client side, never by the server. */
export const NETWORK_ERROR = 'NETWORK_ERROR'
export const UNEXPECTED_RESPONSE = 'UNEXPECTED_RESPONSE'

export type Calculate = (request: CalcRequest, signal?: AbortSignal) => Promise<CalcResult>

export const calculate: Calculate = async (request, signal) => {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  let status: number
  let body: unknown
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
    status = response.status
    body = await response.json().catch(() => null)
  } catch (error) {
    if (signal?.aborted) throw error // cancelled by the caller: not a failure
    return failure(NETWORK_ERROR, 'Cannot reach the calculator service.')
  }

  if (status === 200 && isResult(body)) return { ok: true, value: body.result }
  if (isErrorBody(body)) return { ok: false, error: body.error }
  return failure(UNEXPECTED_RESPONSE, 'The calculator service sent an unexpected response.')
}

function failure(code: string, message: string): CalcResult {
  return { ok: false, error: { code, message } }
}

function isResult(body: unknown): body is { result: number } {
  const result = (body as { result?: unknown } | null)?.result
  return typeof result === 'number' && Number.isFinite(result)
}

function isErrorBody(body: unknown): body is { error: ApiError } {
  const error = (body as { error?: Partial<ApiError> } | null)?.error
  return typeof error?.code === 'string' && typeof error.message === 'string'
}
