import { Link } from 'react-router-dom'
import PageHead from '../components/PageHead'

export function Component() {
  return (
    <>
      <PageHead title="غير موجود · تدبر" noindex />

      <section className="container notfound">
        <span className="eyebrow">٤٠٤</span>
        <h1 className="notfound__title">لا توجد هذه الصفحة</h1>
        <p>ربما انتقلت أو لم تكن موجودة أصلًا.</p>
        <Link to="/surahs" className="btn btn-primary">
          إلى فهرس السور
        </Link>
      </section>
    </>
  )
}
