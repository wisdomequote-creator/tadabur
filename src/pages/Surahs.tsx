import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHead from '../components/PageHead'
import indexData from '../data/index.json'
import type { SurahMeta } from '../lib/types'
import { toArabicNumerals, toAsciiNumerals } from '../lib/numerals'
import { normalizeArabic } from '../lib/arabic'
import { SITE_URL } from '../lib/constants'

const surahs = indexData as SurahMeta[]

// Precompute a normalized, diacritic-free name once per surah for search.
const searchIndex = surahs.map((s) => ({
  surah: s,
  name: normalizeArabic(s.name),
  english: s.englishName.toLowerCase(),
  translation: s.englishNameTranslation.toLowerCase(),
}))

export function Component() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const raw = query.trim()
    if (!raw) return surahs
    const q = toAsciiNumerals(raw).toLowerCase()
    const qAr = normalizeArabic(raw)
    return searchIndex
      .filter((e) => {
        return (
          String(e.surah.number).includes(q) ||
          (qAr.length > 0 && e.name.includes(qAr)) ||
          e.english.includes(q) ||
          e.translation.includes(q)
        )
      })
      .map((e) => e.surah)
  }, [query])

  return (
    <>
      <PageHead
        title="فهرس السور · تدبر"
        description="فهرس سور القرآن الكريم الـ١١٤. اختر سورةً لتبدأ تدبّرها."
        canonical={`${SITE_URL}/surahs`}
      />

      <section className="container index-head">
        <span className="eyebrow">الفهرس</span>
        <h1 className="index-head__title">سور القرآن الكريم</h1>
        <input
          type="search"
          className="index-search"
          placeholder="ابحث بالاسم أو الرقم…"
          aria-label="ابحث عن سورة"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      <section className="container">
        {filtered.length === 0 ? (
          <p className="index-empty">لا توجد نتائج مطابقة.</p>
        ) : (
          <ul className="surah-grid">
            {filtered.map((s) => (
              <li key={s.number}>
                <Link to={`/surah/${s.number}`} className="surah-card">
                  <span className="surah-card__num">{toArabicNumerals(s.number)}</span>
                  <span className="surah-card__body">
                    <span className="surah-card__name">{s.name}</span>
                    <span className="surah-card__sub">
                      {s.englishName} · {toArabicNumerals(s.ayahCount)} آية
                    </span>
                  </span>
                  <span
                    className={`surah-card__tag surah-card__tag--${s.revelation}`}
                    aria-hidden="true"
                  >
                    {s.revelation === 'meccan' ? 'مكية' : 'مدنية'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
