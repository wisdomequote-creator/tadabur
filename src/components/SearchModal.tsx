import { useEffect } from 'react'
import SearchPanel from './SearchPanel'

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="search-modal"
      role="dialog"
      aria-modal="true"
      aria-label="بحث في القرآن"
      onClick={onClose}
    >
      <div className="search-modal__panel" onClick={(e) => e.stopPropagation()}>
        <header className="search-modal__head">
          <span className="eyebrow">بحث في القرآن</span>
          <button
            type="button"
            className="search-modal__close"
            aria-label="إغلاق البحث"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <SearchPanel autoFocus onNavigate={onClose} />
      </div>
    </div>
  )
}
