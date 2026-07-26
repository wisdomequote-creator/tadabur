import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toArabicNumerals } from '../../lib/numerals'
import { BASMALA_ROOTS, formatRoot, type WordRef } from '../../lib/roots'
import { surahName } from '../../lib/surahNames'
import { loadRootIndex, loadSurahRoots, type Occurrence } from '../../data/wordData'
import { loadSurahTafsir } from '../../data/tafsirData'

interface WordPanelProps {
  surah: number
  ayah: number
  wordRef: WordRef
  wordText: string
  onClose: () => void
}

interface Resolved {
  root: string
  occurrences: Occurrence[]
}

export default function WordPanel({ surah, ayah, wordRef, wordText, onClose }: WordPanelProps) {
  const [data, setData] = useState<Resolved | null>(null)
  const [loading, setLoading] = useState(true)
  const [tafsir, setTafsir] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      let root = ''
      if ('basmala' in wordRef) {
        root = BASMALA_ROOTS[wordRef.basmala] ?? ''
      } else {
        const ayat = await loadSurahRoots(surah)
        root = ayat[ayah - 1]?.[wordRef.pos - 1] ?? ''
      }
      const index = root ? await loadRootIndex() : {}
      if (!alive) return
      setData({ root, occurrences: root ? (index[root] ?? []) : [] })
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [surah, ayah, wordRef])

  // The ayah's meaning (التفسير الميسر) — loaded alongside.
  useEffect(() => {
    let alive = true
    loadSurahTafsir(surah).then((ayat) => {
      if (alive) setTafsir(ayat[ayah - 1] ?? '')
    })
    return () => {
      alive = false
    }
  }, [surah, ayah])

  const here = (o: Occurrence) => o[0] === surah && o[1] === ayah

  return (
    <div className="word-modal" role="dialog" aria-modal="true" aria-label="جذر الكلمة" onClick={onClose}>
      <div className="word-modal__panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="word-modal__close" aria-label="إغلاق" onClick={onClose}>
          ×
        </button>

        <div className="word-modal__head">
          <p className="word-modal__word" lang="ar">
            {wordText}
          </p>
          {loading ? (
            <p className="word-modal__status">…جارٍ التحميل</p>
          ) : data && data.root ? (
            <p className="word-modal__root">
              <span className="word-modal__root-label">الجذر</span>
              <span className="word-modal__root-letters" lang="ar">
                {formatRoot(data.root)}
              </span>
            </p>
          ) : (
            <p className="word-modal__status">كلمةٌ لا جذر ثلاثيّ لها (حرفٌ أو ضمير).</p>
          )}
        </div>

        {tafsir && (
          <div className="word-modal__tafsir">
            <span className="word-modal__tafsir-label">معنى الآية · التفسير الميسر</span>
            <p className="word-modal__tafsir-text" lang="ar">
              {tafsir}
            </p>
          </div>
        )}

        {data && data.root && (
          <>
            <p className="word-modal__hint">
              المعنى يُدرَك من السياق — انظر كيف استُعمِل الجذر في{' '}
              {toArabicNumerals(data.occurrences.length)}{' '}
              {data.occurrences.length === 1 ? 'موضع' : 'موضعًا'}:
            </p>
            <ul className="word-conc">
              {data.occurrences.map((o, i) => (
                <li key={i} className={here(o) ? 'word-conc__item word-conc__item--here' : 'word-conc__item'}>
                  <Link to={`/surah/${o[0]}#ayah-${o[1]}`} className="word-conc__link" onClick={onClose}>
                    <span className="word-conc__form" lang="ar">
                      {o[3]}
                    </span>
                    <span className="word-conc__loc">
                      {surahName(o[0])} · {toArabicNumerals(o[1])}
                      {here(o) ? ' (هنا)' : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
