import { normalizeArabic } from './arabic'

// Search hits Supabase PostgREST directly with fetch (no @supabase/supabase-js
// in the client bundle — its realtime module breaks the SSG prerender). The
// publishable key can only read `search_docs` (RLS public-select), so it's safe
// to ship. Overridable via VITE_ env vars.
const BASE =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://trayvufbjxkkntbpdtie.supabase.co'
const KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  'sb_publishable_lAK4qJP1RvqGG_efufsO7A_73MCilpF'

export type DocKind = 'ayah' | 'tafsir' | 'asbab'

export interface DocResult {
  surah: number
  ayah_from: number
  ayah_to: number
  body: string
  kind: DocKind
}

/**
 * Trigram-indexed ILIKE over the diacritic-stripped `norm` column, using the
 * same normalization the corpus was stored with.
 */
export async function searchDocs(
  q: string,
  opts: { kind: DocKind; surah?: number; limit?: number },
): Promise<DocResult[]> {
  const norm = normalizeArabic(q.trim())
  if (norm.length < 2) return []

  const params = new URLSearchParams()
  params.set('select', 'surah,ayah_from,ayah_to,body,kind')
  params.set('kind', `eq.${opts.kind}`)
  params.set('norm', `ilike.*${norm}*`) // PostgREST uses * as the ILIKE wildcard
  if (opts.surah !== undefined) params.set('surah', `eq.${opts.surah}`)
  params.set('order', 'surah,ayah_from')
  params.set('limit', String(opts.limit ?? 200))

  const res = await fetch(`${BASE}/rest/v1/search_docs?${params.toString()}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) throw new Error(`search failed (${res.status})`)
  return (await res.json()) as DocResult[]
}
