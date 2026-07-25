import type { AsbabEntry } from '../lib/types'
import { ayahRangeLabel } from '../lib/asbab'
import { toArabicNumerals } from '../lib/numerals'

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
  return (
    <section className="container asbab" aria-labelledby="asbab-title">
      <details className="asbab__wrap">
        <summary className="asbab__summary">
          <span className="eyebrow" id="asbab-title">
            أسباب النزول
          </span>
          {asbab.length > 0 && (
            <span className="asbab__count">
              {toArabicNumerals(asbab.length)}{' '}
              {asbab.length === 1 ? 'رواية' : 'رواية'}
            </span>
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
    </li>
  )
}
