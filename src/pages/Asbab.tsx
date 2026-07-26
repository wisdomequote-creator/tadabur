import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import PageHead from '../components/PageHead'
import { SITE_URL } from '../lib/constants'
import { toArabicNumerals } from '../lib/numerals'
import { normalizeArabic } from '../lib/arabic'
import { surahName } from '../lib/surahNames'
import type { AsbabSearchEntry } from '../data/asbabData'

const MAX_RENDER = 250
const SNIPPET = 240

/** Show a window of the narration around the first match (or the opening). */
function snippet(text: string, q: string): { str: string; lead: boolean } {
  if (!q) return { str: text.slice(0, SNIPPET), lead: false }
  const norm = normalizeArabic(text)
  const at = norm.indexOf(q)
  if (at < 0) return { str: text.slice(0, SNIPPET), lead: false }
  // Map is approximate (normalize keeps length roughly); start a bit before.
  const start = Math.max(0, at - 60)
  return { str: text.slice(start, start + SNIPPET), lead: start > 0 }
}

function highlight(text: string, q: string): ReactNode {
  if (!q) return text
  return text.split(/(\s+)/).map((part, i) =>
    part.trim() && normalizeArabic(part).includes(q) ? (
      <mark className="search-hl" key={i}>
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function rangeLabel(from: number, to: number): string {
  return from === to
    ? `الآية ${toArabicNumerals(from)}`
    : `الآيات ${toArabicNumerals(from)}–${toArabicNumerals(to)}`
}

export function Component() {
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<AsbabSearchEntry[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    void import('../data/asbabData').then((m) => {
      if (alive) setEntries(m.asbabEntries)
    })
    return () => {
      alive = false
    }
  }, [])

  const q = normalizeArabic(query.trim())
  const results = useMemo(() => {
    if (!entries) return null
    if (q.length < 2) return entries // browse-all when no query
    return entries.filter((e) => e.norm.includes(q))
  }, [entries, q])

  const searching = q.length >= 2

  return (
    <>
      <PageHead
        title="أسباب النزول · تدبر"
        description="ابحث في أسباب نزول القرآن كلّه — عن حادثةٍ أو شخصٍ أو مكان — واعثر على كل الآيات، في مختلف السور، التي نزلت في المناسبة نفسها."
        canonical={`${SITE_URL}/asbab`}
      />

      <section className="container search-head">
        <span className="eyebrow">أسباب النزول</span>
        <h1 className="search-head__title">ابحث في أسباب النزول</h1>
        <p className="asbab-page__lede">
          اكتب حادثةً أو اسمًا أو مكانًا — كـ«الحديبية» أو «بدر» — لتجد كل الآيات،
          ولو في سورٍ مختلفة، التي نزلت في المناسبة نفسها.
        </p>

        <input
          ref={inputRef}
          type="search"
          className="index-search"
          placeholder="اكتب حادثةً أو اسمًا — مثل: بدر، الحديبية، الإفك…"
          aria-label="ابحث في أسباب النزول"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="search-body">
          {!results ? (
            <p className="search-status">…جارٍ تحميل أسباب النزول</p>
          ) : results.length === 0 ? (
            <p className="search-status">لا توجد روايةٌ تحتوي هذه الكلمة.</p>
          ) : (
            <>
              <p className="search-count eyebrow">
                {searching
                  ? `وُجدت ${toArabicNumerals(results.length)} رواية`
                  : `كل الروايات: ${toArabicNumerals(results.length)}`}
                {results.length > MAX_RENDER
                  ? ` — تُعرض أول ${toArabicNumerals(MAX_RENDER)}`
                  : ''}
              </p>
              <ul className="asbab-results">
                {results.slice(0, MAX_RENDER).map((e, i) => {
                  const snip = snippet(e.text, q)
                  return (
                    <li key={`${e.s}:${e.from}-${e.to}-${i}`}>
                      <Link
                        to={`/surah/${e.s}#asbab-ayah-${e.from}`}
                        className="asbab-result"
                      >
                        <span className="asbab-result__head">
                          <span className="asbab-result__surah">{surahName(e.s)}</span>
                          <span className="asbab-result__ayah">{rangeLabel(e.from, e.to)}</span>
                        </span>
                        <span className="asbab-result__text" lang="ar">
                          {snip.lead ? '…' : ''}
                          {highlight(snip.str, q)}
                          {e.text.length > snip.str.length ? '…' : ''}
                        </span>
                        {e.related && e.related.length > 0 && (
                          <span className="asbab-result__related">
                            نفس المناسبة في:{' '}
                            {e.related
                              .map((r) => `${surahName(r.surah)} ${toArabicNumerals(r.from)}`)
                              .join('، ')}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </section>
    </>
  )
}
