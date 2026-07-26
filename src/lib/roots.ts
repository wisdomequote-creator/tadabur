/**
 * Aligns the displayed Uthmani ayah text to the Quranic Arabic Corpus word
 * positions — purely from the text, so it runs during SSR with no data loaded.
 * Roots themselves are fetched lazily only when a word is tapped.
 */

/** Roots of the four basmala words (بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ). */
export const BASMALA_ROOTS = ['سمو', 'أله', 'رحم', 'رحم'] as const

/** A token has a base Arabic letter — i.e. it's a word, not a standalone pause mark. */
function isWordToken(t: string): boolean {
  return /[ء-يٱ]/.test(t)
}

export type WordRef = { basmala: number } | { pos: number }

export interface AyahToken {
  text: string
  /** null for pause/annotation marks; otherwise how to find this word's root. */
  word: WordRef | null
}

/**
 * Surahs 2–114 (except at-Tawba, 9) render the basmala as the head of ayah 1,
 * but the corpus does not count it there — so those first four words map to
 * BASMALA_ROOTS, and the corpus word counter starts after them.
 */
export function hasBasmalaPrefix(surah: number, ayah: number): boolean {
  return ayah === 1 && surah !== 1 && surah !== 9
}

/** Split an ayah into render tokens, tagging each real word with its root source. */
export function tokenizeAyah(text: string, surah: number, ayah: number): AyahToken[] {
  const basmala = hasBasmalaPrefix(surah, ayah)
  const tokens: AyahToken[] = []
  let seenWords = 0 // display words so far (incl. basmala)
  let pos = 0 // corpus word counter (1-based), excludes basmala

  for (const raw of text.trim().split(/\s+/)) {
    if (!raw) continue
    if (!isWordToken(raw)) {
      tokens.push({ text: raw, word: null })
      continue
    }
    if (basmala && seenWords < 4) {
      tokens.push({ text: raw, word: { basmala: seenWords } })
    } else {
      pos += 1
      tokens.push({ text: raw, word: { pos } })
    }
    seenWords += 1
  }
  return tokens
}

/** "فلق" → "ف · ل · ق" for display. */
export function formatRoot(root: string): string {
  return [...root].join(' · ')
}
