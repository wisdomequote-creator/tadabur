import type { WorkspaceState } from '../types'

// localStorage does not exist during prerender. Every call is guarded so the
// module is safe to import anywhere; callers still only invoke these in effects.

const key = (surahNumber: number): string => `tadabur:surah:${surahNumber}`

function isValid(value: unknown, surahNumber: number): value is WorkspaceState {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<WorkspaceState>
  return (
    s.surahNumber === surahNumber &&
    Array.isArray(s.bank) &&
    Array.isArray(s.axes) &&
    typeof s.surahTheme === 'string' &&
    typeof s.nextAxisId === 'number'
  )
}

export function loadState(surahNumber: number): WorkspaceState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key(surahNumber))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed, surahNumber) ? parsed : null
  } catch {
    return null
  }
}

export function saveState(state: WorkspaceState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key(state.surahNumber), JSON.stringify(state))
  } catch {
    /* quota / disabled storage — degrade silently */
  }
}

export function clearState(surahNumber: number): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key(surahNumber))
  } catch {
    /* ignore */
  }
}
