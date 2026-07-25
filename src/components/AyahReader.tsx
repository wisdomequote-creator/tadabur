import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AyahStar from './AyahStar'
import { toArabicNumerals } from '../lib/numerals'
import type { AsbabEntry } from '../lib/types'
import { ayahRangeLabel, revealAsbab } from '../lib/asbab'

interface AyahReaderProps {
  n: number
  text: string
  /** أسباب النزول that concern this ayah (may be empty). */
  asbab?: AsbabEntry[]
  onClose: () => void
}

interface Pos {
  top: number
  left: number
  placement: 'top' | 'bottom'
}

/**
 * Shows the tapped ayah's text in a small card anchored directly ABOVE the
 * ayah marker (or below it, near the top of the page), following it on scroll —
 * so the text always appears right where you pressed.
 */
export default function AyahReader({ n, text, asbab = [], onClose }: AyahReaderProps) {
  const [pos, setPos] = useState<Pos | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => {
      const el = document.querySelector(`[data-ayah="${n}"]`)
      if (!el) {
        setPos(null)
        return
      }
      const r = el.getBoundingClientRect()
      const headerH = 62
      // Hide while the ayah is scrolled out of view.
      if (r.bottom < headerH || r.top > window.innerHeight) {
        setPos(null)
        return
      }
      const placement: Pos['placement'] = r.top < headerH + 170 ? 'bottom' : 'top'
      const halfW = (cardRef.current?.offsetWidth ?? 300) / 2
      const left = Math.max(
        halfW + 8,
        Math.min(r.left + r.width / 2, window.innerWidth - halfW - 8),
      )
      setPos({ top: placement === 'top' ? r.top : r.bottom, left, placement })
    }
    update()
    // Re-measure once the card has rendered so the clamp uses its real width.
    const raf = requestAnimationFrame(update)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [n])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (typeof document === 'undefined' || !pos) return null

  return createPortal(
    <div
      className={`ayah-pop ayah-pop--${pos.placement}`}
      style={{ top: pos.top, left: pos.left }}
      role="dialog"
      aria-label={`نص الآية ${toArabicNumerals(n)}`}
    >
      <div className="ayah-pop__card" ref={cardRef}>
        <AyahStar n={n} size={30} />
        <p className="ayah-pop__text" lang="ar">
          {text}
        </p>
        {asbab.length > 0 && (
          <button
            type="button"
            className="ayah-pop__asbab"
            onClick={() => {
              const target = asbab[0]
              if (target) revealAsbab(target.from)
              onClose()
            }}
          >
            سبب النزول
            {asbab[0] && (asbab[0].from !== n || asbab[0].to !== n) ? (
              <span className="ayah-pop__asbab-scope">
                {' '}
                · {ayahRangeLabel(asbab[0])}
              </span>
            ) : null}
          </button>
        )}
        <button
          type="button"
          className="ayah-pop__close"
          aria-label="إغلاق"
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </div>,
    document.body,
  )
}
