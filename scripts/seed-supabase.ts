/**
 * One-off: loads the search corpus (Qur'an ayat + أسباب النزول + التفسير الميسر)
 * into the Supabase `search_docs` table. Reads the committed local JSON, computes
 * the same `norm` the app's search uses, and bulk-inserts in batches.
 *
 * Requires a temporary anon INSERT policy on search_docs (dropped afterwards).
 * Run: npx tsx scripts/seed-supabase.ts
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { normalizeArabic } from '../src/lib/arabic'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = resolve(__dirname, '..', 'src', 'data')

const URL = 'https://trayvufbjxkkntbpdtie.supabase.co'
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyYXl2dWZianhra250YnBkdGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTc0MzIsImV4cCI6MjEwMDYzMzQzMn0.nvyyMZ2fmjW4sw8FO6twgh94JRiULMDsz71Xv5jmQrg'

const supabase = createClient(URL, ANON, { auth: { persistSession: false } })

interface Row {
  kind: string
  source: string
  surah: number
  ayah_from: number
  ayah_to: number
  body: string
  norm: string
}

async function main() {
  const rows: Row[] = []

  // Qur'an ayat
  for (let s = 1; s <= 114; s++) {
    const d = JSON.parse(await readFile(join(DATA, 'surahs', `${s}.json`), 'utf8')) as {
      ayat: { n: number; text: string }[]
    }
    for (const a of d.ayat) {
      rows.push({
        kind: 'ayah',
        source: 'quran',
        surah: s,
        ayah_from: a.n,
        ayah_to: a.n,
        body: a.text,
        norm: normalizeArabic(a.text),
      })
    }
  }

  // أسباب النزول
  for (let s = 1; s <= 114; s++) {
    const d = JSON.parse(await readFile(join(DATA, 'asbab', `${s}.json`), 'utf8')) as {
      entries: { from: number; to: number; text: string }[]
    }
    for (const e of d.entries) {
      rows.push({
        kind: 'asbab',
        source: 'wahidi',
        surah: s,
        ayah_from: e.from,
        ayah_to: e.to,
        body: e.text,
        norm: normalizeArabic(e.text),
      })
    }
  }

  // التفسير الميسر
  for (let s = 1; s <= 114; s++) {
    const d = JSON.parse(await readFile(join(DATA, 'tafsir', `${s}.json`), 'utf8')) as {
      ayat: string[]
    }
    d.ayat.forEach((text, i) => {
      if (!text) return
      rows.push({
        kind: 'tafsir',
        source: 'muyassar',
        surah: s,
        ayah_from: i + 1,
        ayah_to: i + 1,
        body: text,
        norm: normalizeArabic(text),
      })
    })
  }

  console.log(`prepared ${rows.length} rows — inserting…`)

  const BATCH = 1000
  let done = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error } = await supabase.from('search_docs').insert(chunk)
    if (error) {
      console.error(`✗ batch at ${i}: ${error.message}`)
      process.exit(1)
    }
    done += chunk.length
    console.log(`  ${done}/${rows.length}`)
  }

  console.log(`✓ inserted ${done} rows`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
