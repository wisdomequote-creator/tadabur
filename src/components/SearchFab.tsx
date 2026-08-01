import { useState } from 'react'
import SearchModal from './SearchModal'

/** Floating whole-Qur'an search button (bottom-right), available on every page. */
export default function SearchFab() {
  const [open, setOpen] = useState(false)
  return (
    <>
      {!open && (
        <button
          type="button"
          className="qsearch-fab"
          onClick={() => setOpen(true)}
          aria-label="بحث في القرآن"
        >
          <span className="qsearch-fab__icon" aria-hidden="true">
            ⌕
          </span>
          بحث
        </button>
      )}
      <SearchModal open={open} onClose={() => setOpen(false)} allowKinds />
    </>
  )
}
