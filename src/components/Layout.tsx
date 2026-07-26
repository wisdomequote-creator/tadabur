import { NavLink, Outlet } from 'react-router-dom'
import { toArabicNumerals } from '../lib/numerals'
import { TOTAL_SURAHS } from '../lib/constants'

function Brandmark() {
  return (
    <svg viewBox="0 0 100 100" width="30" height="30" aria-hidden="true" className="brandmark">
      <path
        d="M50 3 L61 39 L97 39 L61 61 L50 97 L39 61 L3 39 L39 39 Z"
        transform="rotate(22.5 50 50)"
        fill="none"
        stroke="var(--brass)"
        strokeWidth="3"
      />
      <path
        d="M50 3 L61 39 L97 39 L61 61 L50 97 L39 61 L3 39 L39 39 Z"
        fill="none"
        stroke="var(--brass)"
        strokeWidth="3"
      />
    </svg>
  )
}

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container site-header__inner">
          <NavLink to="/" className="brand" aria-label="تدبر — الصفحة الرئيسية">
            <Brandmark />
            <span className="brand__word">تدبر</span>
          </NavLink>
          <nav className="site-nav" aria-label="التنقل الرئيسي">
            <NavLink to="/" end className="site-nav__link">
              المنهج
            </NavLink>
            <NavLink to="/surahs" className="site-nav__link">
              السور
            </NavLink>
            <NavLink to="/asbab" className="site-nav__link">
              أسباب النزول
            </NavLink>
          </nav>
          <span className="site-header__spacer" aria-hidden="true" />
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <span>تدبر · مدارسة {toArabicNumerals(TOTAL_SURAHS)} سورة</span>
          <span className="site-footer__note">
            نصّ المصحف برواية عثمان — يُحفظ عملك في متصفحك وحده
          </span>
        </div>
      </footer>
    </div>
  )
}
