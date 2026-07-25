import type { SurahData } from '../lib/types'
import { normalizeArabic } from '../lib/arabic'

export interface SearchEntry {
  /** surah number */
  s: number
  /** ayah number in surah */
  n: number
  /** raw (diacritized) ayah text */
  text: string
  /** normalized text for matching */
  norm: string
}

// Eager glob: all surah JSON is bundled into THIS chunk, which the search page
// loads on demand. Other routes never pull it in.
const modules = import.meta.glob<{ default: Omit<SurahData, 'asbab'> }>(
  './surahs/*.json',
  { eager: true },
)

export const surahNames: Record<number, string> = {}
export const searchEntries: SearchEntry[] = []

for (const mod of Object.values(modules)) {
  const surah = mod.default
  surahNames[surah.number] = surah.name
  for (const a of surah.ayat) {
    searchEntries.push({ s: surah.number, n: a.n, text: a.text, norm: normalizeArabic(a.text) })
  }
}
searchEntries.sort((a, b) => a.s - b.s || a.n - b.n)
