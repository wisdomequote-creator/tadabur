import type { VocabItem } from '../../lib/types'
import { toArabicNumerals } from '../../lib/numerals'

interface VocabSectionProps {
  vocab: VocabItem[]
  onAdd: () => void
  onDelete: (id: string) => void
  onSet: (id: string, field: 'word' | 'meaning', value: string) => void
}

export default function VocabSection({ vocab, onAdd, onDelete, onSet }: VocabSectionProps) {
  function handleDelete(item: VocabItem) {
    if (item.word.trim() || item.meaning.trim()) {
      const ok = window.confirm('ستُحذف هذه المفردة ومعناها. هل تريد المتابعة؟')
      if (!ok) return
    }
    onDelete(item.id)
  }

  return (
    <section className="vocab" aria-label="مفردات">
      <div className="vocab__bar">
        <div>
          <span className="eyebrow">مفردات</span>
          <p className="vocab__hint">
            دوّن الكلمة ومعناها — «تعلّم عشر مفرداتٍ في الشهر».
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          + مفردة جديدة
        </button>
      </div>

      {vocab.length === 0 ? (
        <p className="vocab__empty">لا مفردات بعد — أضف أوّل كلمة.</p>
      ) : (
        <ul className="vocab__list">
          {vocab.map((item, i) => (
            <li className="vocab-item" key={item.id}>
              <input
                className="vocab-item__word"
                type="text"
                value={item.word}
                placeholder="الكلمة"
                aria-label={`الكلمة ${toArabicNumerals(i + 1)}`}
                onChange={(e) => onSet(item.id, 'word', e.target.value)}
              />
              <span className="vocab-item__sep" aria-hidden="true">
                —
              </span>
              <input
                className="vocab-item__meaning"
                type="text"
                value={item.meaning}
                placeholder="المعنى"
                aria-label={`معنى الكلمة ${toArabicNumerals(i + 1)}`}
                onChange={(e) => onSet(item.id, 'meaning', e.target.value)}
              />
              <button
                type="button"
                className="vocab-item__delete"
                aria-label={`حذف المفردة ${toArabicNumerals(i + 1)}`}
                title="حذف المفردة"
                onClick={() => handleDelete(item)}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
