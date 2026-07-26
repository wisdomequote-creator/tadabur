/**
 * Build-time data fetch for word roots (جذور). Pulls the Quranic Arabic Corpus
 * morphology (v0.4, mustafa0x's Arabic-normalised fork) ONCE and writes:
 *   - src/data/morphology/{n}.json — per-ayah arrays of the root of each word,
 *     in the Qur'an's own word order (NO basmala; the UI prepends those roots).
 *   - src/data/roots.json — { root: [[surah, ayah, wordIndex, form], …] } — every
 *     occurrence of each root, for the "same word in other ayat" concordance.
 *
 * The generated JSON is committed; this script is idempotent and skips the
 * network when the data is already present. Pass --force to re-fetch.
 *
 * Attribution: root/lemma data © Quranic Arabic Corpus (kais dukes), GNU-licensed
 * (corpus.quran.com), via github.com/mustafa0x/quran-morphology.
 */
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_DIR = join(ROOT, 'src', 'data')
const MORPH_DIR = join(DATA_DIR, 'morphology')
const ROOTS_FILE = join(DATA_DIR, 'roots.json')
const SURAH_DIR = join(DATA_DIR, 'surahs')

const SOURCE_URL =
  'https://raw.githubusercontent.com/mustafa0x/quran-morphology/master/quran-morphology.txt'
const TOTAL_SURAHS = 114

interface SurahFile {
  number: number
  ayat: { n: number; text: string }[]
}
interface MorphFile {
  surah: number
  /** ayat[i] = roots of ayah (i+1)'s words, "" where a word has no root. */
  ayat: string[][]
}
type Occurrence = [surah: number, ayah: number, word: number, form: string]

function fail(msg: string): never {
  console.error(`\n✗ fetch-morphology: ${msg}\n`)
  process.exit(1)
}

async function verifyExisting(): Promise<boolean> {
  if (!existsSync(ROOTS_FILE) || !existsSync(MORPH_DIR)) return false
  const files = (await readdir(MORPH_DIR)).filter((f) => f.endsWith('.json'))
  return files.length === TOTAL_SURAHS
}

async function main() {
  const force = process.argv.includes('--force')
  if (!force && (await verifyExisting())) {
    console.log(`✓ fetch-morphology: data already present (${TOTAL_SURAHS} files + roots.json). Skipping network.`)
    return
  }

  console.log(`→ fetch-morphology: fetching ${SOURCE_URL} …`)
  let text: string
  try {
    const res = await fetch(SOURCE_URL)
    if (!res.ok) fail(`source returned HTTP ${res.status}`)
    text = await res.text()
  } catch (err) {
    fail(`network request failed: ${(err as Error).message}`)
  }

  // Group segments into words: "s:a:w" → { forms[], root }.
  interface Word {
    forms: string[]
    root: string
  }
  const words = new Map<string, Word>()
  let maxWord: Record<string, number> = {}

  for (const line of text.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue
    const tab = line.split('\t')
    const loc = tab[0]
    if (!loc) continue
    const form = tab[1] ?? ''
    const feats = tab[3] ?? ''
    const parts = loc.split(':')
    if (parts.length < 4) continue
    const s = Number(parts[0])
    const a = Number(parts[1])
    const w = Number(parts[2])
    const key = `${s}:${a}:${w}`
    let entry = words.get(key)
    if (!entry) {
      entry = { forms: [], root: '' }
      words.set(key, entry)
    }
    entry.forms.push(form)
    const rm = feats.match(/ROOT:([^|]+)/)
    if (rm && !entry.root) entry.root = rm[1]!.trim()
    const ak = `${s}:${a}`
    if (!maxWord[ak] || w > maxWord[ak]!) maxWord[ak] = w
  }

  // Per-surah ayah counts, to build correctly-sized arrays.
  const ayahCount: Record<number, number> = {}
  for (let s = 1; s <= TOTAL_SURAHS; s++) {
    const sf = JSON.parse(await readFile(join(SURAH_DIR, `${s}.json`), 'utf8')) as SurahFile
    ayahCount[s] = sf.ayat.length
  }

  await mkdir(MORPH_DIR, { recursive: true })

  const rootIndex: Record<string, Occurrence[]> = {}
  let totalWords = 0
  let rootedWords = 0

  for (let s = 1; s <= TOTAL_SURAHS; s++) {
    const ayat: string[][] = []
    for (let a = 1; a <= ayahCount[s]!; a++) {
      const wc = maxWord[`${s}:${a}`] ?? 0
      const roots: string[] = []
      for (let w = 1; w <= wc; w++) {
        const word = words.get(`${s}:${a}:${w}`)
        const root = word?.root ?? ''
        roots.push(root)
        totalWords++
        if (root) {
          rootedWords++
          const form = word!.forms.join('')
          ;(rootIndex[root] ??= []).push([s, a, w, form])
        }
      }
      ayat.push(roots)
    }
    const mf: MorphFile = { surah: s, ayat }
    await writeFile(join(MORPH_DIR, `${s}.json`), JSON.stringify(mf), 'utf8')
  }

  await writeFile(ROOTS_FILE, JSON.stringify(rootIndex), 'utf8')

  const rootCount = Object.keys(rootIndex).length
  console.log(
    `✓ fetch-morphology: ${totalWords} words (${rootedWords} rooted), ${rootCount} distinct roots → src/data/morphology + roots.json`,
  )
}

main().catch((err) => fail((err as Error).stack ?? String(err)))
