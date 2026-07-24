import type { SurahData } from '../lib/types'

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
    const modules = import.meta.glob<{ default: SurahData }>('./surahs/*.json')
    const importer = modules[`./surahs/${n}.json`]
    if (!importer) {
      throw new Response('Surah not found', { status: 404 })
    }
    const mod = await importer()
    return mod.default
  }
  // Unreachable in production — data comes from the static loader manifest.
  throw new Error('loadSurahData must not run in the production client')
}
