import type { AsbabEntry, SurahData } from '../lib/types'

/**
 * Loads a surah's JSON. This runs ONLY where the route loader actually executes:
 *   - the SSG build (SSR) — produces each page's HTML + its per-route data file
 *   - the dev server — runs the loader live
 *
 * In the production CLIENT bundle both flags are statically false, so the whole
 * body (and the `import.meta.glob` dynamic imports it holds) is dead-code
 * eliminated. That is what keeps the 114 surah chunks OUT of the client graph —
 * otherwise vite-react-ssg would modulepreload every one of them on every surah
 * page. Client navigation never calls this: it reads the per-route static loader
 * data file that the build already emitted.
 */
export async function loadSurahData(n: number): Promise<SurahData> {
  if (import.meta.env.SSR || import.meta.env.DEV) {
    const modules = import.meta.glob<{ default: Omit<SurahData, 'asbab'> }>(
      './surahs/*.json',
    )
    const importer = modules[`./surahs/${n}.json`]
    if (!importer) {
      throw new Response('Surah not found', { status: 404 })
    }
    const mod = await importer()

    // أسباب النزول lives in its own file per surah; fold it into the payload so
    // the surah page (and its per-route static loader data) carries it too.
    const asbabModules = import.meta.glob<{
      default: { surah: number; entries: AsbabEntry[] }
    }>('./asbab/*.json')
    const asbabImporter = asbabModules[`./asbab/${n}.json`]
    const asbab = asbabImporter ? (await asbabImporter()).default.entries : []

    return { ...mod.default, asbab }
  }
  // Unreachable in production — data comes from the static loader manifest.
  throw new Error('loadSurahData must not run in the production client')
}
