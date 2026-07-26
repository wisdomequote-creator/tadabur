import indexData from '../data/index.json'
import type { SurahMeta } from './types'

const names: Record<number, string> = {}
for (const s of indexData as SurahMeta[]) names[s.number] = s.name

/** Arabic surah name for a number, e.g. 57 → "الحديد" (falls back gracefully). */
export function surahName(n: number): string {
  return names[n] ?? `سورة ${n}`
}
