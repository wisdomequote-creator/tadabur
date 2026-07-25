import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import AyahStar from './AyahStar'
import { toArabicNumerals } from '../lib/numerals'
import { normalizeArabic } from '../lib/arabic'
import type { SearchEntry } from '../data/searchData'

const MAX_RENDER = 200

interface Index {
  entries: SearchEntry[]
  names: Record<number, string>
}

/** Highlight whole words whose normalized form contains the query. */
function highlight(text: string, q: string): ReactNode {
  if (!q) return text
  return text.split(/(\s+)/).map((part, i) => {
    if (!part.trim()) return part
    return normalizeArabic(part).includes(q) ? (
      <mark className="search-hl" key={i}>
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  })
}

interface SearchPanelProps {
  autoFocus?: boolean
  /** Called when a result link is clicked (e.g. to close a modal). */
  onNavigate?: () => void
}

export default function SearchPanel({ autoFocus, onNavigate }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState<Index | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    void import('../data/searchData').then((m) => {
      if (alive) setIndex({ entries: m.searchEntries, names: m.surahNames })
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const q = normalizeArabic(query.trim())
  const matches = useMemo(() => {
    if (!index || q.length < 2) return null
    return index.entries.filter((e) => e.norm.includes(q))
  }, [index, q])

  return (
    <div className="search-panel">
      <input
        ref={inputRef}
        type="search"
        className="index-search"
        placeholder="اكتب كلمةً — مثل: المكر، الصبر، الرحمة…"
        aria-label="ابحث عن كلمة في القرآن"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="search-body">
        {!index ? (
          <p className="search-status">…جارٍ تحميل فهرس القرآن الكريم</p>
        ) : q.length < 2 ? (
          <p className="search-status">اكتب كلمةً (حرفين فأكثر) لتظهر كل الآيات التي وردت فيها.</p>
        ) : matches && matches.length === 0 ? (
          <p className="search-status">لا توجد آيات تحتوي هذه الكلمة.</p>
        ) : matches ? (
          <>
            <p className="search-count eyebrow">
              وُجدت {toArabicNumerals(matches.length)} آية
              {matches.length > MAX_RENDER ? ` — تُعرض أول ${toArabicNumerals(MAX_RENDER)}` : ''}
            </p>
            <ul className="search-results">
              {matches.slice(0, MAX_RENDER).map((e) => (
                <li key={`${e.s}:${e.n}`}>
                  <Link to={`/surah/${e.s}`} className="search-result" onClick={onNavigate}>
                    <span className="search-result__meta">
                      <AyahStar n={e.n} size={30} />
                      <span className="search-result__surah">{index.names[e.s]}</span>
                    </span>
                    <span className="search-result__text" lang="ar">
                      {highlight(e.text, q)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  )
}
