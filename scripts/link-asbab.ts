/**
 * Build-time post-process for أسباب النزول: link narrations that record the
 * SAME occasion of revelation across different ayat/surahs.
 *
 * al-Wāḥidī sometimes cites one narration (same isnād + matn) under verses in
 * different surahs — e.g. the Companions asking the Prophet "حدّثنا" ties
 * Yūsuf 3, az-Zumar 23 and al-Ḥadīd 16 together. We detect these purely by
 * TEXT similarity (4-word shingle Jaccard) so nothing is inferred: two entries
 * are linked only when their narration text is essentially the same. Each
 * entry in a cluster gets a `related: AyahRef[]` pointing at the others.
 *
 * Deterministic and network-free — runs in `prebuild` after fetch-asbab, and is
 * idempotent (recomputed from `text` every run, never from existing `related`).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const ASBAB_DIR = join(ROOT, 'src', 'data', 'asbab')
const TOTAL_SURAHS = 114

// 4-word shingle Jaccard threshold. The genuine cluster is stable from 0.12 to
// 0.20; below ~0.10 less-certain pairs creep in. 0.15 keeps only what's sure.
const THRESHOLD = 0.15
const MIN_TOKENS = 8

interface Entry {
  from: number
  to: number
  text: string
  related?: { surah: number; from: number; to: number }[]
}
interface AsbabFile {
  surah: number
  entries: Entry[]
}

/** Strip diacritics, unify letter forms, keep Arabic letters + spaces. */
function normalize(s: string): string {
  return s
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^ء-ي\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function shingles(tokens: string[], k = 4): Set<string> {
  const set = new Set<string>()
  for (let i = 0; i + k <= tokens.length; i++) set.add(tokens.slice(i, i + k).join(' '))
  return set
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter || 1)
}

interface Node {
  surah: number
  idx: number
  from: number
  to: number
  sh: Set<string>
  len: number
}

async function main() {
  if (!existsSync(ASBAB_DIR)) {
    console.error('✗ link-asbab: src/data/asbab missing — run fetch-asbab first.')
    process.exit(1)
  }

  const files: AsbabFile[] = []
  for (let s = 1; s <= TOTAL_SURAHS; s++) {
    const p = join(ASBAB_DIR, `${s}.json`)
    files[s] = JSON.parse(await readFile(p, 'utf8')) as AsbabFile
  }

  // Build nodes (skip too-short narrations — they can't be reliably matched).
  const nodes: Node[] = []
  for (let s = 1; s <= TOTAL_SURAHS; s++) {
    files[s]!.entries.forEach((e, idx) => {
      // Always clear any stale links first so the run is fully idempotent.
      delete e.related
      const tokens = normalize(e.text).split(' ')
      nodes.push({ surah: s, idx, from: e.from, to: e.to, sh: shingles(tokens), len: tokens.length })
    })
  }

  // Union-find over similar narrations.
  const parent = nodes.map((_, i) => i)
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!
      x = parent[x]!
    }
    return x
  }
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b)
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i]!.len < MIN_TOKENS || nodes[j]!.len < MIN_TOKENS) continue
      if (jaccard(nodes[i]!.sh, nodes[j]!.sh) >= THRESHOLD) union(i, j)
    }
  }

  // Group, keep clusters of size > 1, write related refs.
  const clusters = new Map<number, number[]>()
  for (let i = 0; i < nodes.length; i++) {
    const r = find(i)
    ;(clusters.get(r) ?? clusters.set(r, []).get(r)!).push(i)
  }

  let linkedEntries = 0
  const report: string[] = []
  for (const members of clusters.values()) {
    if (members.length < 2) continue
    const refs = members.map((i) => ({ surah: nodes[i]!.surah, from: nodes[i]!.from, to: nodes[i]!.to }))
    // Only surface CROSS-surah connections — a near-duplicate within one surah
    // is just a repeat, not a discovery worth a link.
    const surahs = new Set(refs.map((r) => r.surah))
    if (surahs.size < 2) continue
    for (const i of members) {
      const me = nodes[i]!
      const related = refs.filter((r) => r.surah !== me.surah)
      if (related.length) {
        files[me.surah]!.entries[me.idx]!.related = related
        linkedEntries++
      }
    }
    report.push(refs.map((r) => `${r.surah}:${r.from}${r.to !== r.from ? '-' + r.to : ''}`).join('  ↔  '))
  }

  for (let s = 1; s <= TOTAL_SURAHS; s++) {
    await writeFile(join(ASBAB_DIR, `${s}.json`), JSON.stringify(files[s]), 'utf8')
  }

  console.log(`✓ link-asbab: ${report.length} same-occasion cluster(s), ${linkedEntries} entries linked.`)
  for (const r of report) console.log(`   - ${r}`)
}

main().catch((err) => {
  console.error(`\n✗ link-asbab: ${(err as Error).stack ?? String(err)}\n`)
  process.exit(1)
})
