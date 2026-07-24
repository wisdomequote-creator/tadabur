import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHead from '../components/PageHead'
import { toArabicNumerals } from '../lib/numerals'
import { SITE_URL } from '../lib/constants'
import { landingSections } from './homeContent'

export function Component() {
  const [active, setActive] = useState(landingSections[0]?.id ?? '')

  // Scrollspy — highlight the section currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    )
    for (const s of landingSections) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <PageHead
        title="تدبر — تفعيل القرآن في حياتنا"
        description="منهجٌ عمليّ للتعامل مع القرآن وتدبّره: القرآن كتابُ منهاجٍ لا معلومات، ست قواعد، وعشر ضوابط للتدبّر — بالأمثلة، ثم مساحةُ عملٍ لتطبيقها سورةً سورة."
        canonical={SITE_URL}
      />

      <section className="hero">
        <div className="container hero__inner">
          <span className="eyebrow">منهج التدبّر</span>
          <h1 className="hero__title">تفعيل القرآن في حياتنا</h1>
          <p className="hero__lead">
            القرآن كتابُ منهاجٍ يصنع وعيك، لا مجرّد معلومات. تعرّف كيف نتعامل معه
            ونتدبّره — بالقواعد والضوابط والأمثلة — ثمّ طبّق ذلك على سورةٍ سورة في
            مساحةٍ هادئة.
          </p>
          <div className="hero__actions">
            <Link to="/surahs" className="btn btn-primary">
              ابدأ بسورة
            </Link>
            <a href="#why" className="btn">
              اقرأ المنهج
            </a>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="rule-node" aria-hidden="true">
          <span />
        </div>
      </div>

      <div className="container guide">
        <aside className="guide__toc" aria-label="محتويات المنهج">
          <span className="eyebrow">المحتويات</span>
          <nav>
            <ol className="guide__toc-list">
              {landingSections.map((s, i) => (
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
          {landingSections.map((s, i) => (
            <section key={s.id} id={s.id} className="guide__section">
              <h2 className="guide__section-title">
                <span className="guide__section-num">{toArabicNumerals(i + 1)}</span>
                {s.title}
              </h2>
              <div className="guide__section-body">{s.body}</div>
            </section>
          ))}

          <div className="cta-panel">
            <p className="cta-panel__text">ابدأ التطبيق الآن — اختر سورةً وقسّمها إلى محاورها.</p>
            <Link to="/surahs" className="btn btn-primary">
              إلى فهرس السور
            </Link>
          </div>
        </article>
      </div>
    </>
  )
}
