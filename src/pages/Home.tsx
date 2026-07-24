import { Link } from 'react-router-dom'
import PageHead from '../components/PageHead'
import { toArabicNumerals } from '../lib/numerals'
import { SITE_URL, TOTAL_SURAHS } from '../lib/constants'

export function Component() {
  return (
    <>
      <PageHead
        title="تدبر — مدارسة سور القرآن الكريم"
        description="مساحة عمل لتدبر القرآن الكريم: قسّم السورة إلى محاور موضوعية، ووزّع آياتها، ودوّن خواطرك. يُحفظ عملك في متصفحك."
        canonical={SITE_URL}
      />

      <section className="hero">
        <div className="container hero__inner">
          <span className="eyebrow">منهجٌ للتدبر</span>
          <h1 className="hero__title">
            اقرأ السورة كوحدة،
            <br />
            لا كآياتٍ متفرقة.
          </h1>
          <p className="hero__lead">
            «تدبر» مساحةٌ هادئة تُعينك على تفكيك السورة إلى محاورها الكبرى، وتوزيع
            آياتها على تلك المحاور، وتدوين ما يفتحه الله عليك من خواطر — آيةً آية.
          </p>
          <div className="hero__actions">
            <Link to="/surahs" className="btn btn-primary">
              ابدأ بسورة
            </Link>
            <Link to="/guide" className="btn">
              اقرأ المنهج
            </Link>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="rule-node" aria-hidden="true">
          <span />
        </div>
      </div>

      <section className="container steps">
        <ol className="steps__list">
          <li className="step">
            <span className="step__num">{toArabicNumerals(1)}</span>
            <h3 className="step__title">اختر السورة</h3>
            <p className="step__body">
              من فهرس السور الـ{toArabicNumerals(TOTAL_SURAHS)}، تفتح لك مساحة عمل
              خاصة بها وحدها.
            </p>
          </li>
          <li className="step">
            <span className="step__num">{toArabicNumerals(2)}</span>
            <h3 className="step__title">حدِّد المحاور</h3>
            <p className="step__body">
              ما الموضوعات الكبرى التي تنتظم السورة حولها؟ أنشئ محورًا لكلٍّ منها.
            </p>
          </li>
          <li className="step">
            <span className="step__num">{toArabicNumerals(3)}</span>
            <h3 className="step__title">وزِّع الآيات</h3>
            <p className="step__body">
              اسحب كل آية إلى محورها — أو حدِّدها ثم اختر وجهتها على الهاتف.
            </p>
          </li>
          <li className="step">
            <span className="step__num">{toArabicNumerals(4)}</span>
            <h3 className="step__title">دوِّن وصدِّر</h3>
            <p className="step__body">
              اكتب خواطرك تحت كل محور، ثم صدِّر عملك ملفًّا نصيًّا متى شئت.
            </p>
          </li>
        </ol>
      </section>
    </>
  )
}
