import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { AsbabEntry } from '../lib/types'
import { ayahRangeLabel, revealAsbab } from '../lib/asbab'
import { toArabicNumerals } from '../lib/numerals'
import { surahName } from '../lib/surahNames'

/**
 * أسباب النزول for a whole surah — one labelled card per narration, each tied to
 * the ayah (or range) it concerns. Rendered on the surah page so the reader can
 * browse every sabab, and each is anchored (`#asbab-ayah-N`) for per-ayah links.
 * Source is attributed; nothing here is paraphrased.
 */
export default function AsbabSection({
  asbab,
}: {
  asbab: AsbabEntry[]
}) {
  const location = useLocation()

  // Arriving with an #asbab-ayah-N hash (e.g. from a cross-surah link on another
  // surah's page) opens the section and scrolls to that narration.
  useEffect(() => {
    if (!location.hash.startsWith('#asbab-ayah-')) return
    const from = Number(location.hash.slice('#asbab-ayah-'.length))
    if (Number.isFinite(from)) {
      const t = setTimeout(() => revealAsbab(from), 60)
      return () => clearTimeout(t)
    }
    return undefined
  }, [location.hash, location.key])

  return (
    <section className="container asbab" aria-labelledby="asbab-title">
      <details className="asbab__wrap">
        <summary className="asbab__summary">
          <span className="eyebrow" id="asbab-title">
            أسباب النزول
          </span>
          {asbab.length > 0 && (
            <span className="asbab__count">{toArabicNumerals(asbab.length)} رواية</span>
          )}
        </summary>

        {asbab.length === 0 ? (
          <p className="asbab__empty">
            لا توجد روايات في أسباب النزول لهذه السورة في مصدرنا.
          </p>
        ) : (
          <ol className="asbab__list">
            {asbab.map((entry, i) => (
              <AsbabCard key={`${entry.from}-${entry.to}-${i}`} entry={entry} />
            ))}
          </ol>
        )}

        <p className="asbab__source">
          المصدر: أسباب النزول للإمام أبي الحسن الواحدي — عن موقع{' '}
          <a
            href="https://www.altafsir.com/AsbabAlnuzol.asp"
            target="_blank"
            rel="noreferrer"
          >
            التفسير (altafsir.com)
          </a>
          .
        </p>
      </details>
    </section>
  )
}

function AsbabCard({ entry }: { entry: AsbabEntry }) {
  const paragraphs = entry.text.split('\n').filter((p) => p.trim().length > 0)
  return (
    <li className="asbab-card" id={`asbab-ayah-${entry.from}`}>
      <div className="asbab-card__badge">{ayahRangeLabel(entry)}</div>
      <div className="asbab-card__body" lang="ar">
        {paragraphs.map((p, i) => (
          <p key={i} className="asbab-card__p">
            {p}
          </p>
        ))}
      </div>
      {entry.related && entry.related.length > 0 && (
        <p className="asbab-card__related">
          <span className="asbab-card__related-label">نزلت على المناسبة نفسها:</span>{' '}
          {entry.related.map((r, i) => (
            <span key={`${r.surah}-${r.from}`}>
              {i > 0 && '، '}
              <Link
                className="asbab-card__related-link"
                to={`/surah/${r.surah}#asbab-ayah-${r.from}`}
              >
                {surahName(r.surah)}{' '}
                {r.from === r.to
                  ? toArabicNumerals(r.from)
                  : `${toArabicNumerals(r.from)}–${toArabicNumerals(r.to)}`}
              </Link>
            </span>
          ))}
        </p>
      )}
    </li>
  )
}
