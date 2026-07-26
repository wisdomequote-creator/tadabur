import { Fragment, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { SurahData } from '../../lib/types'
import AyahStar from '../AyahStar'
import { tokenizeAyah, type WordRef } from '../../lib/roots'
import WordPanel from './WordPanel'

interface Selected {
  ayah: number
  wordRef: WordRef
  text: string
}

/**
 * The full-surah reading text with every word tappable: tapping a word opens a
 * panel showing its root and every other ayah that uses the same root.
 *
 * To keep the prerendered HTML small (al-Baqara has ~6000 words), the closed
 * state renders plain text — matching SSR — and words are only upgraded to
 * tappable buttons once the reader opens the section.
 */
export default function WordReader({ surah }: { surah: SurahData }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Selected | null>(null)
  const location = useLocation()

  // A concordance link (#ayah-N) opens the reading and scrolls to that ayah.
  useEffect(() => {
    if (!location.hash.startsWith('#ayah-')) return
    const n = Number(location.hash.slice('#ayah-'.length))
    if (!Number.isFinite(n)) return undefined
    const t = setTimeout(() => {
      const el = document.getElementById(`ayah-${n}`)
      if (!el) return
      const details = el.closest('details')
      if (details && !details.open) details.open = true
      setOpen(true)
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('surah-reading__ayah--flash')
      window.setTimeout(() => el.classList.remove('surah-reading__ayah--flash'), 1600)
    }, 60)
    return () => clearTimeout(t)
  }, [location.hash, location.key])

  return (
    <div className="container">
      <details className="surah-reading" onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="surah-reading__summary">
          <span className="eyebrow">نصّ السورة كاملًا</span>
          <span className="surah-reading__tip">اضغط أيّ كلمة لجذرها ومواضعها</span>
        </summary>
        <p className="surah-reading__body" lang="ar">
          {surah.ayat.map((a) => (
            <span className="surah-reading__ayah" id={`ayah-${a.n}`} key={a.n}>
              {open
                ? tokenizeAyah(a.text, surah.number, a.n).map((tok, i) => (
                    <Fragment key={i}>
                      {tok.word ? (
                        <button
                          type="button"
                          className="qword"
                          onClick={() =>
                            setSelected({ ayah: a.n, wordRef: tok.word as WordRef, text: tok.text })
                          }
                        >
                          {tok.text}
                        </button>
                      ) : (
                        <span>{tok.text}</span>
                      )}{' '}
                    </Fragment>
                  ))
                : `${a.text} `}
              <AyahStar n={a.n} size={30} />{' '}
            </span>
          ))}
        </p>
      </details>

      {selected && (
        <WordPanel
          surah={surah.number}
          ayah={selected.ayah}
          wordRef={selected.wordRef}
          wordText={selected.text}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
