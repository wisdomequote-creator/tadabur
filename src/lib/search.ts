import { supabase } from './supabase'
import { normalizeArabic } from './arabic'

export type DocKind = 'ayah' | 'tafsir' | 'asbab'

export interface DocResult {
  surah: number
  ayah_from: number
  ayah_to: number
  body: string
  kind: DocKind
}

/**
 * Full-text-ish search over the Supabase `search_docs` table. Matches the
 * diacritic-stripped `norm` column with a trigram-indexed ILIKE, using the same
 * normalization the corpus was stored with. Fast even as more tafsirs are added.
 */
export async function searchDocs(
  q: string,
  opts: { kind: DocKind; surah?: number; limit?: number },
): Promise<DocResult[]> {
  const norm = normalizeArabic(q.trim())
  if (norm.length < 2) return []
  // Escape ILIKE metacharacters so the query is treated literally.
  const pattern = '%' + norm.replace(/([%_\\])/g, '\\$1') + '%'

  let query = supabase
    .from('search_docs')
    .select('surah,ayah_from,ayah_to,body,kind')
    .eq('kind', opts.kind)
    .ilike('norm', pattern)
  if (opts.surah !== undefined) query = query.eq('surah', opts.surah)

  const { data, error } = await query
    .order('surah')
    .order('ayah_from')
    .limit(opts.limit ?? 200)
  if (error) throw error
  return (data ?? []) as DocResult[]
}
