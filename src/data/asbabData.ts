import type { AsbabEntry } from '../lib/types'
import { normalizeArabic } from '../lib/arabic'

export interface AsbabSearchEntry {
  /** surah number */
  s: number
  from: number
  to: number
  /** narration text (diacritized) */
  text: string
  /** normalized text for matching */
  norm: string
  /** other ayat on the same occasion (may be undefined) */
  related?: AsbabEntry['related']
}

// Eager glob: every asbab JSON is bundled into THIS chunk, which the أسباب
// النزول page loads on demand. Other routes never pull it in.
const modules = import.meta.glob<{ default: { surah: number; entries: AsbabEntry[] } }>(
  './asbab/*.json',
  { eager: true },
)

export const asbabEntries: AsbabSearchEntry[] = []

for (const mod of Object.values(modules)) {
  const { surah, entries } = mod.default
  for (const e of entries) {
    asbabEntries.push({
      s: surah,
      from: e.from,
      to: e.to,
      text: e.text,
      norm: normalizeArabic(e.text),
      related: e.related,
    })
  }
}
asbabEntries.sort((a, b) => a.s - b.s || a.from - b.from)
