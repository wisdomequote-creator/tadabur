import { useEffect, useState } from 'react'
import PageHead from '../components/PageHead'
import { toArabicNumerals } from '../lib/numerals'
import { SITE_URL } from '../lib/constants'
import { guideSections } from './guideContent'

export function Component() {
  const [active, setActive] = useState(guideSections[0]?.id ?? '')

  // Scrollspy — highlight the TOC entry for the section in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    )
    for (const s of guideSections) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <PageHead
        title="منهج التدبر · تدبر"
        description="منهج عملي لتدبر القرآن الكريم: كيف تقرأ السورة كوحدة، وتستخرج محاورها، وتحوّل المعنى إلى عمل."
        canonical={`${SITE_URL}/guide`}
      />

      <div className="container guide">
        <aside className="guide__toc" aria-label="محتويات الدليل">
          <span className="eyebrow">المحتويات</span>
          <nav>
            <ol className="guide__toc-list">
              {guideSections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={`guide__toc-link${active === s.id ? ' is-active' : ''}`}
                    aria-current={active === s.id ? 'true' : undefined}
                  >
                    <span className="guide__toc-num">{toArabicNumerals(i + 1)}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="guide__body">
          <header className="guide__header">
            <span className="eyebrow">الدليل</span>
            <h1 className="guide__title">منهج التدبر</h1>
          </header>
          {guideSections.map((s, i) => (
            <section key={s.id} id={s.id} className="guide__section">
              <h2 className="guide__section-title">
                <span className="guide__section-num">{toArabicNumerals(i + 1)}</span>
                {s.title}
              </h2>
              <div className="guide__section-body">{s.body}</div>
            </section>
          ))}
        </article>
      </div>
    </>
  )
}
