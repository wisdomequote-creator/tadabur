import type { Axis, QAItem, SurahData, WorkspaceState } from '../types'

// ---- Canvas layout ------------------------------------------------------
// Nodes are positioned in a fixed coordinate space (px). The canvas element is
// this wide and scrolls on small screens; no scaling, so canvas px == screen px.
export const CANVAS_W = 1040
export const ROOT_W = 300

/** Deterministic default slot for the axis at a given index (no random ⇒ SSR-safe). */
export function axisSlot(index: number): { x: number; y: number } {
  return {
    x: 120 + (index % 3) * 320,
    y: 290 + Math.floor(index / 3) * 250,
  }
}

const ROOT_DEFAULT = { x: Math.round((CANVAS_W - ROOT_W) / 2), y: 24 }

export type WorkspaceAction =
  | { type: 'hydrate'; state: WorkspaceState }
  | { type: 'setSurahTheme'; value: string }
  | { type: 'addAxis' }
  | { type: 'deleteAxis'; axisId: string }
  | { type: 'setAxisTitle'; axisId: string; value: string }
  | { type: 'setAxisNotes'; axisId: string; value: string }
  | { type: 'moveNode'; id: string; x: number; y: number }
  | { type: 'moveToAxis'; n: number; axisId: string }
  | { type: 'moveToBank'; n: number }
  | { type: 'addQuestion' }
  | { type: 'deleteQuestion'; id: string }
  | { type: 'setQuestion'; id: string; field: 'q' | 'a'; value: string }
  | { type: 'reset'; ayahCount: number }

const sortNums = (nums: number[]): number[] => [...nums].sort((a, b) => a - b)

const emptyAxis = (id: string, index: number): Axis => ({
  id,
  title: '',
  notes: '',
  ayat: [],
  ...axisSlot(index),
})

const emptyQuestion = (id: string): QAItem => ({ id, q: '', a: '' })

export function initWorkspace(surah: SurahData): WorkspaceState {
  return {
    surahNumber: surah.number,
    surahTheme: '',
    rootX: ROOT_DEFAULT.x,
    rootY: ROOT_DEFAULT.y,
    bank: surah.ayat.map((a) => a.n),
    axes: [emptyAxis('axis-1', 0), emptyAxis('axis-2', 1), emptyAxis('axis-3', 2)],
    nextAxisId: 4,
    questions: [emptyQuestion('q-1')],
    nextQuestionId: 2,
  }
}

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

/** Backfill fields for states saved before newer features (older localStorage). */
export function normalizeState(s: WorkspaceState): WorkspaceState {
  const hasQuestions = Array.isArray(s.questions)
  return {
    ...s,
    rootX: num(s.rootX, ROOT_DEFAULT.x),
    rootY: num(s.rootY, ROOT_DEFAULT.y),
    axes: s.axes.map((a, i) => ({
      ...a,
      x: num(a.x, axisSlot(i).x),
      y: num(a.y, axisSlot(i).y),
    })),
    questions: hasQuestions ? s.questions : [emptyQuestion('q-1')],
    nextQuestionId: num(s.nextQuestionId, hasQuestions ? s.questions.length + 1 : 2),
  }
}

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
      return normalizeState(action.state)

    case 'setSurahTheme':
      return { ...state, surahTheme: action.value }

    case 'addAxis':
      return {
        ...state,
        axes: [...state.axes, emptyAxis(`axis-${state.nextAxisId}`, state.nextAxisId - 1)],
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

    case 'moveNode': {
      if (action.id === 'root') {
        return { ...state, rootX: action.x, rootY: action.y }
      }
      return {
        ...state,
        axes: state.axes.map((a) =>
          a.id === action.id ? { ...a, x: action.x, y: action.y } : a,
        ),
      }
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

    case 'addQuestion':
      return {
        ...state,
        questions: [...state.questions, emptyQuestion(`q-${state.nextQuestionId}`)],
        nextQuestionId: state.nextQuestionId + 1,
      }

    case 'deleteQuestion':
      return {
        ...state,
        questions: state.questions.filter((item) => item.id !== action.id),
      }

    case 'setQuestion':
      return {
        ...state,
        questions: state.questions.map((item) =>
          item.id === action.id ? { ...item, [action.field]: action.value } : item,
        ),
      }

    case 'reset':
      return {
        surahNumber: state.surahNumber,
        surahTheme: '',
        rootX: ROOT_DEFAULT.x,
        rootY: ROOT_DEFAULT.y,
        bank: Array.from({ length: action.ayahCount }, (_, i) => i + 1),
        axes: [emptyAxis('axis-1', 0), emptyAxis('axis-2', 1), emptyAxis('axis-3', 2)],
        nextAxisId: 4,
        questions: [emptyQuestion('q-1')],
        nextQuestionId: 2,
      }

    default:
      return state
  }
}
