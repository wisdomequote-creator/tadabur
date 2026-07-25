/**
 * Build-time data fetch for أسباب النزول (occasions of revelation).
 *
 * Source: altafsir.com — أسباب النزول للإمام الواحدي (al-Wāḥidī's classic
 * "Asbāb al-Nuzūl"), served as windows-1256 HTML, paginated. We fetch every
 * surah's pages ONCE and write:
 *   - src/data/asbab/{n}.json — { surah, entries: [{ from, to, text }] }
 *
 * The generated JSON is committed. This script is idempotent: if the data is
 * already present it does NOT touch the network, so `npm run build` works
 * offline. Pass --force to re-fetch.
 *
 * Accuracy is paramount (religious text). Each narration is a
 * `<table class='TextResultArabic'>` block whose font text opens with
 * `قوله [تعالى]: {verse}. [N].` — the `[N]` / `[N-M]` bracket is the ayah
 * reference. Every narration is also immediately preceded by a
 * `getAyah('sura','ayah')` link, which we use to CROSS-CHECK the bracket and
 * flag any mismatch loudly rather than silently mis-mapping a narration.
 */
import { mkdir, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import iconv from 'iconv-lite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const ASBAB_DIR = join(ROOT, 'src', 'data', 'asbab')

const TOTAL_SURAHS = 114
const MAX_PAGES = 80 // safety cap; al-Baqara (the longest) is ~13 pages
const DELAY_MS = 500
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

interface Entry {
  from: number
  to: number
  text: string
}
interface AsbabFile {
  surah: number
  entries: Entry[]
}

/**
 * The only two narrations in the whole mushaf that carry no `[N]` bracket. For
 * these, the getAyah headers are a full ayah-nav list (unreliable), so we pin
 * them to the ayat the narration itself names — verified against the source:
 *   - Surah 1 (al-Fātiḥa): the opening narration is about آية التسمية (the
 *     Basmala) and the revelation of the whole sūra → 1–7 (sūra-level).
 *   - Surah 92 (al-Layl): the نخلة narration closes with
 *     `فأنزل الله {وَٱلْلَّيْلِ … إِنَّ سَعْيَكُمْ لَشَتَّىٰ}` → āyāt 1–4.
 */
const NO_BRACKET_OVERRIDES: Record<number, { from: number; to: number }> = {
  1: { from: 1, to: 7 },
  92: { from: 1, to: 4 },
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function pageUrl(surah: number, page: number): string {
  return `https://www.altafsir.com/AsbabAlnuzol.asp?SoraName=${surah}&Ayah=0&MyPageNo=${page}&search=yes&img=A&LanguageID=1`
}

async function fetchPage(surah: number, page: number): Promise<string> {
  const url = pageUrl(surah, page)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      return iconv.decode(buf, 'windows-1256')
    } catch (err) {
      if (attempt === 3) throw err
      await sleep(DELAY_MS * attempt * 2)
    }
  }
  return ''
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/** Strip altafsir's injected junk + tags, decode entities, tidy whitespace. */
function cleanText(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
  return decodeEntities(stripped)
    .replace(/\r/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

interface ParsedNarration {
  from: number
  to: number
  text: string
  precededByAyah: number | null
  bracketPresent: boolean
}

/**
 * Walk the page in document order, tracking each `getAyah('s','a')` header (the
 * ayah of the narration that follows it) and each `TextResultArabic` narration
 * table. Returns one narration per real table.
 */
function parsePage(html: string): ParsedNarration[] {
  const out: ParsedNarration[] = []
  const re =
    /getAyah\('(\d+)','(\d+)'\)|<table[^>]*class=['"]?TextResultArabic['"]?[^>]*>([\s\S]*?)<\/table>/gi
  let m: RegExpExecArray | null
  let lastAyah: number | null = null

  while ((m = re.exec(html))) {
    if (m[2] !== undefined && m[1] !== undefined) {
      // getAyah header → applies to the next narration table
      lastAyah = Number(m[2])
      continue
    }
    const tbl = m[3] ?? ''
    const fontM = tbl.match(
      /<font[^>]*class=['"]?TextResultArabic['"]?[^>]*>([\s\S]*?)<\/font>/i,
    )
    if (!fontM) continue
    const text = cleanText(fontM[1] ?? '')
    // A real narration is substantial prose. We do NOT gate on a specific opener
    // like "قوله" — al-Wāḥidī also opens with "قال:", "قول تعالى", "نزلت…" etc.,
    // and gating on "قوله" silently dropped genuine asbab (e.g. al-Baqara 144, 190).
    // The table class already excludes the verse-display blocks, and placement is
    // enforced below via the bracket / getAyah header.
    if (text.length <= 25) continue

    const bm = text.match(/\[(\d+)(?:\s*[-–]\s*(\d+))?\]/)
    let from: number | null = bm ? Number(bm[1]) : null
    let to: number | null = bm && bm[2] ? Number(bm[2]) : from
    const bracketPresent = from != null

    // Fall back to the preceding getAyah header when the bracket is absent.
    if (from == null && lastAyah != null) {
      from = lastAyah
      to = lastAyah
    }
    if (from == null || to == null) continue // no way to place it — skip (reported by caller)

    // Drop the `[N]` / `[N-M]` marker from the displayed text (captured in from/to).
    let display = text.replace(/\s*\[\d+(?:\s*[-–]\s*\d+)?\]\s*\.?/, ' ')

    // Range/whole-surah headings come wrapped in an editorial bracket, e.g.
    // `[قوله تعالى: {…} إلى آخر السورة]. <narration>`. Unwrap that outer bracket
    // (leaving inner editorial brackets like `[بن وائل]` untouched).
    if (display.trimStart().startsWith('[قوله')) {
      display = display.replace('[', '')
      const close = display.indexOf(']')
      if (close !== -1) display = display.slice(0, close) + display.slice(close + 1)
    }

    display = display.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim()

    out.push({ from, to, text: display, precededByAyah: lastAyah, bracketPresent })
  }
  return out
}

async function verifyExisting(): Promise<boolean> {
  if (!existsSync(ASBAB_DIR)) return false
  const files = (await readdir(ASBAB_DIR)).filter((f) => f.endsWith('.json'))
  return files.length === TOTAL_SURAHS
}

async function main() {
  const force = process.argv.includes('--force')
  const only = process.argv.find((a) => a.startsWith('--surah='))
  const onlySurah = only ? Number(only.split('=')[1]) : null

  if (!force && !onlySurah && (await verifyExisting())) {
    console.log(
      `✓ fetch-asbab: data already present (${TOTAL_SURAHS} files). Skipping network.`,
    )
    return
  }

  await mkdir(ASBAB_DIR, { recursive: true })

  const start = onlySurah ?? 1
  const end = onlySurah ?? TOTAL_SURAHS

  let grandEntries = 0
  let surahsWithAsbab = 0
  const warnings: string[] = []

  for (let s = start; s <= end; s++) {
    const entries: Entry[] = []
    let emptyStreak = 0

    for (let page = 1; page <= MAX_PAGES; page++) {
      const html = await fetchPage(s, page)
      const narrations = parsePage(html)
      await sleep(DELAY_MS)

      if (narrations.length === 0) {
        // Confirm the surah/pagination really ended (guard a transient blank).
        emptyStreak++
        if (page === 1 || emptyStreak >= 2) break
        continue
      }
      emptyStreak = 0

      for (const n of narrations) {
        let { from, to } = n
        if (!n.bracketPresent) {
          const override = NO_BRACKET_OVERRIDES[s]
          if (override) {
            from = override.from
            to = override.to
          } else {
            warnings.push(
              `surah ${s} p${page}: narration had no [N] bracket and no override; used getAyah=${n.precededByAyah} → ayah ${from}`,
            )
          }
        } else if (
          n.precededByAyah != null &&
          (n.precededByAyah < n.from || n.precededByAyah > n.to)
        ) {
          // getAyah falls OUTSIDE the bracket range — a genuine mismatch worth a look.
          warnings.push(
            `surah ${s} p${page}: bracket [${n.from}${n.to !== n.from ? '-' + n.to : ''}] excludes getAyah ${n.precededByAyah}`,
          )
        }
        entries.push({ from, to, text: n.text })
      }
    }

    // Sort by ayah, keep source order within the same ayah (multiple narrations).
    entries.sort((a, b) => a.from - b.from || a.to - b.to)

    const file: AsbabFile = { surah: s, entries }
    await writeFile(join(ASBAB_DIR, `${s}.json`), JSON.stringify(file), 'utf8')

    grandEntries += entries.length
    if (entries.length > 0) surahsWithAsbab++
    console.log(
      `  surah ${String(s).padStart(3)} → ${String(entries.length).padStart(3)} narration(s)`,
    )
  }

  console.log(
    `\n✓ fetch-asbab: ${surahsWithAsbab} surah(s) with asbab, ${grandEntries} narrations total.`,
  )
  if (warnings.length) {
    console.log(`\n⚠ ${warnings.length} note(s):`)
    for (const w of warnings.slice(0, 40)) console.log(`   - ${w}`)
    if (warnings.length > 40) console.log(`   … and ${warnings.length - 40} more`)
  }
}

main().catch((err) => {
  console.error(`\n✗ fetch-asbab: ${(err as Error).stack ?? String(err)}\n`)
  process.exit(1)
})
