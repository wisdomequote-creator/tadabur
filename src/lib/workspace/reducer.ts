import type { Axis, SurahData, WorkspaceState } from '../types'

export type WorkspaceAction =
  | { type: 'hydrate'; state: WorkspaceState }
  | { type: 'setSurahTheme'; value: string }
  | { type: 'addAxis' }
  | { type: 'deleteAxis'; axisId: string }
  | { type: 'setAxisTitle'; axisId: string; value: string }
  | { type: 'setAxisNotes'; axisId: string; value: string }
  | { type: 'moveToAxis'; n: number; axisId: string }
  | { type: 'moveToBank'; n: number }
  | { type: 'reset'; ayahCount: number }

const sortNums = (nums: number[]): number[] => [...nums].sort((a, b) => a - b)

const emptyAxis = (id: string): Axis => ({ id, title: '', notes: '', ayat: [] })

export function initWorkspace(surah: SurahData): WorkspaceState {
  return {
    surahNumber: surah.number,
    surahTheme: '',
    bank: surah.ayat.map((a) => a.n),
    axes: [emptyAxis('axis-1'), emptyAxis('axis-2'), emptyAxis('axis-3')],
    nextAxisId: 4,
  }
}

/**
 * An ayah lives in exactly one place. Pull it out of wherever it currently is —
 * the bank or any axis — so every move can be expressed as detach-then-place.
 */
function detach(
  state: WorkspaceState,
  n: number,
): Pick<WorkspaceState, 'bank' | 'axes'> {
  return {
    bank: state.bank.filter((x) => x !== n),
    axes: state.axes.map((a) =>
      a.ayat.includes(n) ? { ...a, ayat: a.ayat.filter((x) => x !== n) } : a,
    ),
  }
}

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case 'hydrate':
      return action.state

    case 'setSurahTheme':
      return { ...state, surahTheme: action.value }

    case 'addAxis':
      return {
        ...state,
        axes: [...state.axes, emptyAxis(`axis-${state.nextAxisId}`)],
        nextAxisId: state.nextAxisId + 1,
      }

    case 'deleteAxis': {
      const axis = state.axes.find((a) => a.id === action.axisId)
      if (!axis) return state
      return {
        ...state,
        bank: sortNums([...state.bank, ...axis.ayat]),
        axes: state.axes.filter((a) => a.id !== action.axisId),
      }
    }

    case 'setAxisTitle':
      return {
        ...state,
        axes: state.axes.map((a) =>
          a.id === action.axisId ? { ...a, title: action.value } : a,
        ),
      }

    case 'setAxisNotes':
      return {
        ...state,
        axes: state.axes.map((a) =>
          a.id === action.axisId ? { ...a, notes: action.value } : a,
        ),
      }

    case 'moveToAxis': {
      const { bank, axes } = detach(state, action.n)
      return {
        ...state,
        bank,
        axes: axes.map((a) =>
          a.id === action.axisId ? { ...a, ayat: sortNums([...a.ayat, action.n]) } : a,
        ),
      }
    }

    case 'moveToBank': {
      const { bank, axes } = detach(state, action.n)
      return { ...state, bank: sortNums([...bank, action.n]), axes }
    }

    case 'reset':
      return {
        surahNumber: state.surahNumber,
        surahTheme: '',
        bank: Array.from({ length: action.ayahCount }, (_, i) => i + 1),
        axes: [emptyAxis('axis-1'), emptyAxis('axis-2'), emptyAxis('axis-3')],
        nextAxisId: 4,
      }

    default:
      return state
  }
}
