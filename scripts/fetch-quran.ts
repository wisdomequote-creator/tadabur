/**
 * Build-time data fetch. Pulls the full Uthmani mushaf from alquran.cloud ONCE
 * and writes:
 *   - src/data/surahs/{n}.json  — full ayah text per surah (code-split per route)
 *   - src/data/index.json       — the 114-surah list (no ayah text) for the grid
 *
 * The generated JSON is committed. This script is idempotent: if the data is
 * already present and passes the integrity check, it does NOT touch the network,
 * so `npm run build` works fully offline. Pass --force to re-fetch.
 *
 * It fails loudly if the totals are ever off: 114 surahs, 6236 ayat.
 */
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_DIR = join(ROOT, 'src', 'data')
const SURAH_DIR = join(DATA_DIR, 'surahs')
const INDEX_FILE = join(DATA_DIR, 'index.json')
const API_URL = 'https://api.alquran.cloud/v1/quran/quran-uthmani'

const EXPECTED_SURAHS = 114
const EXPECTED_AYAT = 6236

const REVELATION: Record<string, 'meccan' | 'medinan'> = {
  Meccan: 'meccan',
  Medinan: 'medinan',
}

interface ApiAyah {
  numberInSurah: number
  text: string
}
interface ApiSurah {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  revelationType: string
  ayahs: ApiAyah[]
}
interface ApiResponse {
  code: number
  status: string
  data: { surahs: ApiSurah[] }
}

interface SurahFile {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  revelation: 'meccan' | 'medinan'
  ayahCount: number
  ayat: { n: number; text: string }[]
}

interface IndexEntry {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  revelation: 'meccan' | 'medinan'
  ayahCount: number
}

function fail(message: string): never {
  console.error(`\n✗ fetch-quran: ${message}\n`)
  process.exit(1)
}

/** Verify already-generated data on disk without hitting the network. */
async function verifyExisting(): Promise<boolean> {
  if (!existsSync(INDEX_FILE) || !existsSync(SURAH_DIR)) return false

  let index: IndexEntry[]
  try {
    index = JSON.parse(await readFile(INDEX_FILE, 'utf8')) as IndexEntry[]
  } catch {
    return false
  }
  if (!Array.isArray(index) || index.length !== EXPECTED_SURAHS) return false

  const files = (await readdir(SURAH_DIR)).filter((f) => f.endsWith('.json'))
  if (files.length !== EXPECTED_SURAHS) return false

  let ayatTotal = 0
  for (let n = 1; n <= EXPECTED_SURAHS; n++) {
    const p = join(SURAH_DIR, `${n}.json`)
    if (!existsSync(p)) return false
    const surah = JSON.parse(await readFile(p, 'utf8')) as SurahFile
    if (surah.number !== n) return false
    if (surah.ayat.length !== surah.ayahCount) return false
    ayatTotal += surah.ayat.length
  }

  if (ayatTotal !== EXPECTED_AYAT) {
    fail(
      `existing data has ${ayatTotal} ayat, expected ${EXPECTED_AYAT}. Delete src/data and re-run with --force.`,
    )
  }
  return true
}

async function main() {
  const force = process.argv.includes('--force')

  if (!force && (await verifyExisting())) {
    console.log(
      `✓ fetch-quran: data already present and valid (${EXPECTED_SURAHS} surahs, ${EXPECTED_AYAT} ayat). Skipping network.`,
    )
    return
  }

  console.log(`→ fetch-quran: fetching ${API_URL} …`)
  let res: Response
  try {
    res = await fetch(API_URL)
  } catch (err) {
    fail(`network request failed: ${(err as Error).message}`)
  }
  if (!res.ok) fail(`API returned HTTP ${res.status}`)

  const json = (await res.json()) as ApiResponse
  if (json.code !== 200 || !json.data?.surahs) {
    fail(`unexpected API payload (code ${json.code})`)
  }

  const surahs = json.data.surahs
  if (surahs.length !== EXPECTED_SURAHS) {
    fail(`API returned ${surahs.length} surahs, expected ${EXPECTED_SURAHS}`)
  }

  await mkdir(SURAH_DIR, { recursive: true })

  const index: IndexEntry[] = []
  let ayatTotal = 0

  for (const s of surahs) {
    const revelation = REVELATION[s.revelationType]
    if (!revelation) fail(`unknown revelationType "${s.revelationType}" for surah ${s.number}`)

    const ayat = s.ayahs.map((a) => ({ n: a.numberInSurah, text: a.text.trim() }))
    ayatTotal += ayat.length

    const file: SurahFile = {
      number: s.number,
      name: s.name,
      englishName: s.englishName,
      englishNameTranslation: s.englishNameTranslation,
      revelation,
      ayahCount: ayat.length,
      ayat,
    }
    await writeFile(join(SURAH_DIR, `${s.number}.json`), JSON.stringify(file), 'utf8')

    index.push({
      number: s.number,
      name: s.name,
      englishName: s.englishName,
      englishNameTranslation: s.englishNameTranslation,
      revelation,
      ayahCount: ayat.length,
    })
  }

  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8')

  // Loud integrity gate.
  if (index.length !== EXPECTED_SURAHS) {
    fail(`wrote ${index.length} surahs, expected ${EXPECTED_SURAHS}`)
  }
  if (ayatTotal !== EXPECTED_AYAT) {
    fail(`wrote ${ayatTotal} ayat, expected ${EXPECTED_AYAT}`)
  }

  console.log(
    `✓ fetch-quran: wrote ${index.length} surahs / ${ayatTotal} ayat to src/data/`,
  )
}

main().catch((err) => fail((err as Error).stack ?? String(err)))
