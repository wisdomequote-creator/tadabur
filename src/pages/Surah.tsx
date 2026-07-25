import { useLoaderData } from 'react-router-dom'
import PageHead from '../components/PageHead'
import type { SurahData } from '../lib/types'
import { toArabicNumerals } from '../lib/numerals'
import { SITE_URL } from '../lib/constants'
import AyahStar from '../components/AyahStar'
import AsbabSection from '../components/AsbabSection'
import SurahWorkspace from '../components/workspace/SurahWorkspace'

function revelationLabel(r: SurahData['revelation']): string {
  return r === 'meccan' ? 'مكية' : 'مدنية'
}

export function Component() {
  const surah = useLoaderData() as SurahData
  const title = `${surah.name} · تدبر`
  const description = `تدبّر سورة ${surah.name} (${surah.englishName}): قسّمها إلى محاور موضوعية، ووزّع آياتها الـ${toArabicNumerals(surah.ayahCount)}، ودوّن خواطرك.`
  const canonical = `${SITE_URL}/surah/${surah.number}`

  return (
    <>
      <PageHead
        title={title}
        description={description}
        canonical={canonical}
        ogType="article"
      />

      <article>
        <header className="surah-hero">
          <div className="container surah-hero__inner">
            <span className="eyebrow">
              السورة {toArabicNumerals(surah.number)}
            </span>
            <h1 className="surah-hero__name">{surah.name}</h1>
            <p className="surah-hero__meta">
              <span className="badge">{revelationLabel(surah.revelation)}</span>
              <span className="surah-hero__dot">·</span>
              <span>{surah.englishName}</span>
              <span className="surah-hero__dot">·</span>
              <span>{toArabicNumerals(surah.ayahCount)} آية</span>
            </p>
            <div className="rule-node" aria-hidden="true">
              <span />
            </div>
          </div>
        </header>

        {/* Full mushaf text — prerendered into the HTML, collapsible. */}
        <div className="container">
          <details className="surah-reading">
            <summary className="surah-reading__summary">
              <span className="eyebrow">نصّ السورة كاملًا</span>
            </summary>
            <p className="surah-reading__body" lang="ar">
              {surah.ayat.map((a) => (
                <span className="surah-reading__ayah" key={a.n}>
                  {a.text}{' '}
                  <AyahStar n={a.n} size={30} />{' '}
                </span>
              ))}
            </p>
          </details>
        </div>

        <AsbabSection asbab={surah.asbab} />

        <SurahWorkspace key={surah.number} surah={surah} />
      </article>
    </>
  )
}
