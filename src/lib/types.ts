export interface Ayah {
  n: number
  text: string
}

export type Revelation = 'meccan' | 'medinan'

/** A pointer to another ayah (possibly in another surah) — used for cross-links. */
export interface AyahRef {
  surah: number
  from: number
  to: number
}

/**
 * One سبب نزول (occasion of revelation) narration, mapped to the ayah or ayah
 * range it concerns. Source: أسباب النزول للإمام الواحدي (altafsir.com).
 */
export interface AsbabEntry {
  /** First ayah this narration concerns. */
  from: number
  /** Last ayah (equals `from` for a single ayah). */
  to: number
  /** The narration text (Arabic). */
  text: string
  /**
   * Other ayat (in this or other surahs) revealed on the SAME occasion — i.e.
   * whose al-Wāḥidī narration is textually the same. Computed at build time;
   * omitted when there are none.
   */
  related?: AyahRef[]
}

/** Full per-surah payload, code-split into its own chunk. */
export interface SurahData {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  revelation: Revelation
  ayahCount: number
  ayat: Ayah[]
  /** أسباب النزول for this surah, ordered by ayah (may be empty). */
  asbab: AsbabEntry[]
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
  /** Optional user-set size (px); undefined ⇒ auto-size from ayah count. */
  w?: number
  h?: number
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
  /** Optional user-set size of the root node (px). */
  rootW?: number
  rootH?: number
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
