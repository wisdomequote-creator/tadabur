import type { AsbabEntry } from './types'
import { toArabicNumerals } from './numerals'

/** All asbab narrations that concern ayah `n` (single or within a range). */
export function asbabForAyah(entries: AsbabEntry[], n: number): AsbabEntry[] {
  return entries.filter((e) => n >= e.from && n <= e.to)
}

/** Arabic label for an entry's ayah span, e.g. "الآية ٥" or "الآيات ٥–١٠". */
export function ayahRangeLabel(entry: AsbabEntry): string {
  if (entry.from === entry.to) return `الآية ${toArabicNumerals(entry.from)}`
  return `الآيات ${toArabicNumerals(entry.from)}–${toArabicNumerals(entry.to)}`
}

/**
 * Open the أسباب النزول section and scroll to the narration anchored at ayah
 * `from` (`#asbab-ayah-{from}`), flashing it briefly. Client-only DOM helper,
 * used by the ayah popover's "سبب النزول" button.
 */
export function revealAsbab(from: number): void {
  if (typeof document === 'undefined') return
  const el = document.getElementById(`asbab-ayah-${from}`)
  if (!el) return
  const details = el.closest('details')
  if (details && !details.open) details.open = true
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('asbab-card--flash')
  window.setTimeout(() => el.classList.remove('asbab-card--flash'), 1600)
}
