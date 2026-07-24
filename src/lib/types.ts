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
}

export interface WorkspaceState {
  surahNumber: number
  surahTheme: string
  axes: Axis[]
  /** Not-yet-assigned ayah numbers, kept sorted ascending. */
  bank: number[]
  /** Monotonic counter for deterministic axis ids (no random ⇒ no hydration drift). */
  nextAxisId: number
}
