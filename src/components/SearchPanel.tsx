import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import AyahStar from './AyahStar'
import { toArabicNumerals } from '../lib/numerals'
import { normalizeArabic } from '../lib/arabic'
import { surahName } from '../lib/surahNames'
import { formatRoot } from '../lib/roots'
import { searchByRoot, searchDocs, type DocResult } from '../lib/search'

type Mode = 'ayah' | 'tafsir' | 'root'

const MAX_RENDER = 200

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
  /** When set, offer a "this surah" scope toggle (used inside a surah). */
  scopeSurah?: number
  /** When set, offer an الآيات / التفسير content toggle (the /search page). */
  allowKinds?: boolean
}

export default function SearchPanel({ autoFocus, onNavigate, scopeSurah, allowKinds }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'surah' | 'all'>(scopeSurah ? 'surah' : 'all')
  const [kind, setKind] = useState<Mode>('ayah')
  const [results, setResults] = useState<DocResult[] | null>(null)
  const [rootLabel, setRootLabel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const scoped = mode === 'surah' && scopeSurah !== undefined
  const q = normalizeArabic(query.trim())

  // Debounced query to Supabase.
  useEffect(() => {
    if (q.length < 2) {
      setResults(null)
      setRootLabel(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    let alive = true
    const handle = setTimeout(() => {
      const done = (rows: DocResult[], root: string | null) => {
        if (!alive) return
        setResults(rows)
        setRootLabel(root)
        setLoading(false)
      }
      const fail = () => {
        if (alive) {
          setError(true)
          setLoading(false)
        }
      }
      if (kind === 'root') {
        searchByRoot(query).then((r) => done(r.results, r.root)).catch(fail)
      } else {
        searchDocs(query, { kind, surah: scoped ? scopeSurah : undefined, limit: MAX_RENDER })
          .then((rows) => done(rows, null))
          .catch(fail)
      }
    }, 220)
    return () => {
      alive = false
      clearTimeout(handle)
    }
  }, [query, q, kind, scoped, scopeSurah])

  return (
    <div className="search-panel">
      {allowKinds && (
        <div className="search-modes" role="group" aria-label="نوع البحث">
          <button
            type="button"
            className={`search-mode${kind === 'ayah' ? ' search-mode--active' : ''}`}
            aria-pressed={kind === 'ayah'}
            onClick={() => setKind('ayah')}
          >
            الآيات
          </button>
          <button
            type="button"
            className={`search-mode${kind === 'tafsir' ? ' search-mode--active' : ''}`}
            aria-pressed={kind === 'tafsir'}
            onClick={() => setKind('tafsir')}
          >
            التفسير
          </button>
          <button
            type="button"
            className={`search-mode${kind === 'root' ? ' search-mode--active' : ''}`}
            aria-pressed={kind === 'root'}
            onClick={() => setKind('root')}
            title="ابحث بجذر الكلمة — يجمع كل صيغها"
          >
            الجذر
          </button>
        </div>
      )}

      {scopeSurah !== undefined && kind !== 'root' && (
        <div className="search-modes" role="group" aria-label="نطاق البحث">
          <button
            type="button"
            className={`search-mode${mode === 'surah' ? ' search-mode--active' : ''}`}
            aria-pressed={mode === 'surah'}
            onClick={() => setMode('surah')}
          >
            هذه السورة
          </button>
          <button
            type="button"
            className={`search-mode${mode === 'all' ? ' search-mode--active' : ''}`}
            aria-pressed={mode === 'all'}
            onClick={() => setMode('all')}
          >
            القرآن كله
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="search"
        className="index-search"
        placeholder={
          kind === 'root'
            ? 'اكتب كلمةً — مثل: صابر — لتجد كل ما يشترك في جذرها'
            : kind === 'tafsir'
              ? 'ابحث في التفسير الميسر…'
              : 'اكتب كلمةً — مثل: المكر، الصبر، الرحمة…'
        }
        aria-label="ابحث في القرآن"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="search-body">
        {q.length < 2 ? (
          <p className="search-status">
            اكتب كلمةً (حرفين فأكثر) لتظهر النتائج
            {scoped ? ' في هذه السورة' : ' في القرآن كله'}.
          </p>
        ) : error ? (
          <p className="search-status">تعذّر الاتصال بمحرّك البحث. تحقّق من اتصالك وحاول مجددًا.</p>
        ) : loading && !results ? (
          <p className="search-status">…يبحث</p>
        ) : results && results.length === 0 ? (
          <p className="search-status">
            {kind === 'root'
              ? 'لم أتعرّف على جذرٍ لهذه الكلمة في القرآن.'
              : `لا توجد نتائج${scoped ? ' في هذه السورة' : ''}.`}
          </p>
        ) : results ? (
          <>
            <p className="search-count eyebrow">
              {kind === 'root' && rootLabel && (
                <>
                  الجذر{' '}
                  <span className="search-root" lang="ar">
                    {formatRoot(rootLabel)}
                  </span>{' '}
                  ·{' '}
                </>
              )}
              وُجدت {toArabicNumerals(results.length)}
              {results.length >= MAX_RENDER ? '+' : ''} نتيجة
              {kind !== 'root' && scoped ? ' في هذه السورة' : ''}
            </p>
            <ul className="search-results">
              {results.map((e) => (
                <li key={`${e.kind}:${e.surah}:${e.ayah_from}`}>
                  <Link
                    to={`/surah/${e.surah}#ayah-${e.ayah_from}`}
                    className="search-result"
                    onClick={onNavigate}
                  >
                    <span className="search-result__meta">
                      <AyahStar n={e.ayah_from} size={30} />
                      {!scoped && (
                        <span className="search-result__surah">{surahName(e.surah)}</span>
                      )}
                    </span>
                    <span className="search-result__text" lang="ar">
                      {highlight(e.body, q)}
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
