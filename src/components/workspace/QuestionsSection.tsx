import type { QAItem } from '../../lib/types'
import { toArabicNumerals } from '../../lib/numerals'

interface QuestionsSectionProps {
  questions: QAItem[]
  onAdd: () => void
  onDelete: (id: string) => void
  onSet: (id: string, field: 'q' | 'a', value: string) => void
}

export default function QuestionsSection({
  questions,
  onAdd,
  onDelete,
  onSet,
}: QuestionsSectionProps) {
  function handleDelete(item: QAItem) {
    if (item.q.trim() || item.a.trim()) {
      const ok = window.confirm('سيُحذف هذا السؤال وجوابه. هل تريد المتابعة؟')
      if (!ok) return
    }
    onDelete(item.id)
  }

  return (
    <section className="qa" aria-label="أسئلة التدبّر">
      <div className="qa__bar">
        <div>
          <span className="eyebrow">أسئلة التدبّر</span>
          <p className="qa__hint">
            التدبّر أن تسأل: لماذا هذا؟ ولماذا هكذا؟ ثم تبحث عن الجواب.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          + سؤال جديد
        </button>
      </div>

      {questions.length === 0 ? (
        <p className="qa__empty">لا أسئلة بعد — أضف سؤالك الأول.</p>
      ) : (
        <ol className="qa__list">
          {questions.map((item, i) => (
            <li className="qa-item" key={item.id}>
              <div className="qa-item__head">
                <span className="qa-item__num" aria-hidden="true">
                  {toArabicNumerals(i + 1)}
                </span>
                <input
                  className="qa-item__q"
                  type="text"
                  value={item.q}
                  placeholder="لماذا…؟ / ما الفرق بين…؟ / ما سبب…؟"
                  aria-label={`السؤال ${toArabicNumerals(i + 1)}`}
                  onChange={(e) => onSet(item.id, 'q', e.target.value)}
                />
                <button
                  type="button"
                  className="qa-item__delete"
                  aria-label={`حذف السؤال ${toArabicNumerals(i + 1)}`}
                  title="حذف السؤال"
                  onClick={() => handleDelete(item)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <textarea
                className="qa-item__a"
                value={item.a}
                placeholder="الجواب — ما فتح الله عليك من تدبّر…"
                aria-label={`جواب السؤال ${toArabicNumerals(i + 1)}`}
                rows={2}
                onChange={(e) => onSet(item.id, 'a', e.target.value)}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
