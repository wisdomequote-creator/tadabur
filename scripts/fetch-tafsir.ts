/**
 * Build-time data fetch for a per-ayah Arabic meaning. Pulls التفسير الميسر
 * (King Fahd Complex's simplified tafsir) from alquran.cloud ONCE and writes:
 *   - src/data/tafsir/{n}.json — { surah, ayat: string[] } (index = ayah - 1)
 *
 * The generated JSON is committed; this script is idempotent and skips the
 * network when the data is already present. Pass --force to re-fetch.
 *
 * Source: التفسير الميسر — مجمع الملك فهد لطباعة المصحف الشريف (via alquran.cloud).
 */
import { mkdir, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const TAFSIR_DIR = join(ROOT, 'src', 'data', 'tafsir')
const EDITION = 'ar.muyassar'
const TOTAL_SURAHS = 114
const EXPECTED_AYAT = 6236

interface ApiResponse {
  code: number
  data: { number: number; ayahs: { numberInSurah: number; text: string }[] }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function fail(msg: string): never {
  console.error(`\n✗ fetch-tafsir: ${msg}\n`)
  process.exit(1)
}

async function verifyExisting(): Promise<boolean> {
  if (!existsSync(TAFSIR_DIR)) return false
  const files = (await readdir(TAFSIR_DIR)).filter((f) => f.endsWith('.json'))
  return files.length === TOTAL_SURAHS
}

async function fetchSurah(n: number): Promise<ApiResponse> {
  const url = `https://api.alquran.cloud/v1/surah/${n}/${EDITION}`
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as ApiResponse
      if (json.code !== 200 || !json.data?.ayahs) throw new Error('bad payload')
      return json
    } catch (err) {
      if (attempt === 3) fail(`surah ${n}: ${(err as Error).message}`)
      await sleep(500 * attempt)
    }
  }
  return fail('unreachable')
}

async function main() {
  const force = process.argv.includes('--force')
  if (!force && (await verifyExisting())) {
    console.log(`✓ fetch-tafsir: data already present (${TOTAL_SURAHS} files). Skipping network.`)
    return
  }

  await mkdir(TAFSIR_DIR, { recursive: true })
  let total = 0

  for (let n = 1; n <= TOTAL_SURAHS; n++) {
    const json = await fetchSurah(n)
    const ayat: string[] = []
    for (const a of json.data.ayahs) {
      ayat[a.numberInSurah - 1] = a.text.trim()
    }
    total += ayat.length
    await writeFile(join(TAFSIR_DIR, `${n}.json`), JSON.stringify({ surah: n, ayat }), 'utf8')
    await sleep(120)
  }

  if (total !== EXPECTED_AYAT) fail(`wrote ${total} ayat, expected ${EXPECTED_AYAT}`)
  console.log(`✓ fetch-tafsir: التفسير الميسر for ${total} ayat → src/data/tafsir/`)
}

main().catch((err) => fail((err as Error).stack ?? String(err)))
