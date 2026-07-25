export interface Ayah {
  n: number
  text: string
}

export type Revelation = 'meccan' | 'medinan'

/** Full per-surah payload, code-split into its own chunk. */
export interface SurahData {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  revelation: Revelation
  ayahCount: number
  ayat: Ayah[]
}

/** Lightweight entry for the index grid — no ayah text. */
export interface SurahMeta {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  revelation: Revelation
  ayahCount: number
}

export interface Axis {
  id: string
  title: string
  notes: string
  /** Ayah numbers assigned to this axis, kept sorted ascending. */
  ayat: number[]
  /** Position on the mind-map canvas (px, canvas coordinate space). */
  x: number
  y: number
}

/** A tadabur question and the answer the user works out for it. */
export interface QAItem {
  id: string
  q: string
  a: string
}

/** A word from the surah and its meaning. */
export interface VocabItem {
  id: string
  word: string
  meaning: string
}

export interface WorkspaceState {
  surahNumber: number
  surahTheme: string
  /** Position of the surah-theme (root) node on the canvas. */
  rootX: number
  rootY: number
  axes: Axis[]
  /** Not-yet-assigned ayah numbers, kept sorted ascending. */
  bank: number[]
  /** Monotonic counter for deterministic axis ids (no random ⇒ no hydration drift). */
  nextAxisId: number
  /** Tadabur questions with their answers. */
  questions: QAItem[]
  nextQuestionId: number
  /** Words from the surah with their meanings. */
  vocab: VocabItem[]
  nextVocabId: number
}
