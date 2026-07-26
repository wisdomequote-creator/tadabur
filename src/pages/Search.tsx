import PageHead from '../components/PageHead'
import SearchPanel from '../components/SearchPanel'
import { SITE_URL } from '../lib/constants'

export function Component() {
  return (
    <>
      <PageHead
        title="بحث في القرآن · تدبر"
        description="ابحث عن كلمةٍ في القرآن الكريم كله، واعثر على كل الآيات التي وردت فيها."
        canonical={`${SITE_URL}/search`}
      />

      <section className="container search-head">
        <span className="eyebrow">بحث في القرآن</span>
        <h1 className="search-head__title">اعثر على الكلمة في القرآن كلّه</h1>
        <SearchPanel autoFocus allowKinds />
      </section>
    </>
  )
}
