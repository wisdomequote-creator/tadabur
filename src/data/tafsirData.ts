/**
 * On-demand loader for the per-ayah Arabic meaning (التفسير الميسر). Loaded only
 * when the reader taps a word or an ayah — never in the initial surah bundle.
 */
interface TafsirFile {
  surah: number
  ayat: string[]
}

const modules = import.meta.glob<{ default: TafsirFile }>('./tafsir/*.json')
const cache = new Map<number, string[]>()

/** التفسير الميسر for a surah, indexed [ayah-1]. */
export async function loadSurahTafsir(surah: number): Promise<string[]> {
  const cached = cache.get(surah)
  if (cached) return cached
  const importer = modules[`./tafsir/${surah}.json`]
  if (!importer) return []
  const mod = await importer()
  cache.set(surah, mod.default.ayat)
  return mod.default.ayat
}
