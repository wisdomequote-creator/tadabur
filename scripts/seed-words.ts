/**
 * One-off: loads every rooted Qur'an word into Supabase `quran_words`
 * (surah, ayah, form_norm, root) from the committed roots.json, for root-based
 * search. Requires the temporary anon INSERT policy (dropped afterwards).
 * Run: npx tsx scripts/seed-words.ts
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { normalizeArabic } from '../src/lib/arabic'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOTS = resolve(__dirname, '..', 'src', 'data', 'roots.json')

const URL = 'https://trayvufbjxkkntbpdtie.supabase.co'
const ANON =
  'sb_publishable_lAK4qJP1RvqGG_efufsO7A_73MCilpF'

const supabase = createClient(URL, ANON, { auth: { persistSession: false } })

type Occurrence = [number, number, number, string] // surah, ayah, wordIndex, form

async function main() {
  const roots = JSON.parse(await readFile(ROOTS, 'utf8')) as Record<string, Occurrence[]>
  const rows: { surah: number; ayah: number; form_norm: string; root: string }[] = []
  for (const [root, occ] of Object.entries(roots)) {
    for (const [s, a, , form] of occ) {
      const form_norm = normalizeArabic(form)
      if (form_norm) rows.push({ surah: s, ayah: a, form_norm, root })
    }
  }
  console.log(`prepared ${rows.length} word rows — inserting…`)

  const BATCH = 1000
  let done = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from('quran_words').insert(rows.slice(i, i + BATCH))
    if (error) {
      console.error(`✗ batch ${i}: ${error.message}`)
      process.exit(1)
    }
    done += Math.min(BATCH, rows.length - i)
    console.log(`  ${done}/${rows.length}`)
  }
  console.log(`✓ inserted ${done} rows`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
