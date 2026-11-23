import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { calculate as defaultCalculate, NETWORK_ERROR, type Calculate } from '../api/calculatorApi'
import {
  initialState,
  previewStep,
  previewText,
  toDisplay,
  transition,
  type HistoryRecord,
  type Input,
  type Outcome,
  type Step,
} from '../domain/calculator'

interface Options {
  calculate?: Calculate
  /** Called once for every finished calculation (each successful =). */
  onRecord?: (record: HistoryRecord) => void
}

/**
 * Connects the pure state machine to the backend.
 *
 * Inputs are processed strictly one at a time through a promise queue: a key
 * pressed while an earlier key is still waiting for the backend runs after it,
 * so fast typing can never apply keys out of order.
 *
 * The live preview is separate: it is re-requested on every change and the
 * previous request is cancelled, so a slow, stale answer is never shown.
 */
export function useCalculator({ calculate = defaultCalculate, onRecord }: Options = {}) {
  const [state, setState] = useState(initialState)
  const stateRef = useRef(state)
  /** Counts refused digits (entry at its length limit); the display shakes when it changes. */
  const [rejections, setRejections] = useState(0)
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const onRecordRef = useRef(onRecord)
  useLayoutEffect(() => {
    onRecordRef.current = onRecord
  })

  const dispatch = useCallback(
    (input: Input) => {
      queueRef.current = queueRef.current
        .then(async () => {
          const outcome = await run(transition(stateRef.current, input), calculate)
          stateRef.current = outcome.state
          setState(outcome.state)
          if (outcome.record) onRecordRef.current?.(outcome.record)
          if (outcome.rejected) setRejections((count) => count + 1)
        })
        .catch((error: unknown) => console.error('calculator input failed', error))
    },
    [calculate],
  )

  // The preview depends only on the running total, the operator and the operand.
  const previewKey = previewStep(state) ? JSON.stringify([state.accumulator, state.pendingOp, state.entry]) : ''
  const [preview, setPreview] = useState({ key: '', text: '' })

  useEffect(() => {
    const step = previewStep(stateRef.current)
    if (!step) return
    const controller = new AbortController()
    run(step, calculate, controller.signal)
      .then((outcome) => setPreview({ key: previewKey, text: previewText(outcome) }))
      .catch(() => {}) // cancelled because the input changed
    return () => controller.abort()
  }, [previewKey, calculate])

  const shownPreview = preview.key === previewKey ? preview.text : ''
  return { display: toDisplay(state, shownPreview), dispatch, rejections }
}

/**
 * Runs a step's backend calls one after another until it is done. Rejects
 * only when `signal` was aborted (a cancelled preview).
 */
async function run(first: Step, calculate: Calculate, signal?: AbortSignal): Promise<Outcome> {
  let step = first
  while (step.kind === 'compute') {
    let result
    try {
      result = await calculate(step.request, signal)
    } catch (error) {
      if (signal?.aborted) throw error
      return step.onFailure({ kind: 'connection' })
    }
    if (!result.ok) {
      const { code, message } = result.error
      return step.onFailure(code === NETWORK_ERROR ? { kind: 'connection' } : { kind: 'math', message })
    }
    step = step.onResult(result.value)
  }
  return step.outcome
}
