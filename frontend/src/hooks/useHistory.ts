import { useCallback, useEffect, useState } from 'react'
import type { HistoryRecord } from '../domain/calculator'

export const HISTORY_STORAGE_KEY = 'calculator.history.v1'
/** Keeps browser storage bounded. */
export const HISTORY_LIMIT = 50

export interface HistoryEntry extends HistoryRecord {
  id: number
}

let lastId = 0
const nextId = () => ++lastId

/** Finished calculations, newest first, persisted in localStorage. */
export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(load)

  useEffect(() => save(entries), [entries])

  const add = useCallback((record: HistoryRecord) => {
    setEntries((previous) => [{ ...record, id: nextId() }, ...previous].slice(0, HISTORY_LIMIT))
  }, [])

  const clear = useCallback(() => setEntries([]), [])

  return { entries, add, clear }
}

/** Storage can be missing, full, blocked or hand-edited: never let that break the app. */
function load(): HistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(isRecord)
      .slice(0, HISTORY_LIMIT)
      .map(({ expression, result }) => ({ expression, result, id: nextId() }))
  } catch {
    return []
  }
}

function save(entries: HistoryEntry[]) {
  try {
    const records = entries.map(({ expression, result }) => ({ expression, result }))
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Not persisting history is acceptable; the in-memory list still works.
  }
}

function isRecord(value: unknown): value is HistoryRecord {
  const record = value as Partial<HistoryRecord> | null
  return typeof record?.expression === 'string' && typeof record.result === 'number' && Number.isFinite(record.result)
}
