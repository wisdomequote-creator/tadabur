/**
 * On-demand loaders for word-root data. Nothing here is in the initial bundle;
 * it's imported only when the reader first taps a word.
 *   - per-surah morphology: the root of each word (Qur'an word order, no basmala)
 *   - roots.json: every occurrence of each root, for the concordance
 */

/** [surah, ayah, wordIndex, form] */
export type Occurrence = [number, number, number, string]

interface MorphFile {
  surah: number
  ayat: string[][]
}

const morphModules = import.meta.glob<{ default: MorphFile }>('./morphology/*.json')

const surahCache = new Map<number, string[][]>()
let rootIndexPromise: Promise<Record<string, Occurrence[]>> | null = null

/** Roots of every word in a surah, indexed [ayah-1][wordIndex] (corpus order). */
export async function loadSurahRoots(surah: number): Promise<string[][]> {
  const cached = surahCache.get(surah)
  if (cached) return cached
  const importer = morphModules[`./morphology/${surah}.json`]
  if (!importer) return []
  const mod = await importer()
  surahCache.set(surah, mod.default.ayat)
  return mod.default.ayat
}

/** The global root → occurrences index (loaded once, cached). */
export function loadRootIndex(): Promise<Record<string, Occurrence[]>> {
  if (!rootIndexPromise) {
    rootIndexPromise = import('./roots.json').then(
      (m) => m.default as unknown as Record<string, Occurrence[]>,
    )
  }
  return rootIndexPromise
}
