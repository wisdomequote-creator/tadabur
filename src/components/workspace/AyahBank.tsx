import { useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import { toArabicNumerals, toArabicRange } from '../../lib/numerals'
import { BANK_PAGE_SIZE } from '../../lib/constants'
import AyahChip, { DRAG_MIME } from './AyahChip'

interface AyahBankProps {
  bank: number[]
  ayahCount: number
  textOf: (n: number) => string
  selectedAyah: number | null
  selectionAssigned: boolean
  onSelectAyah: (n: number) => void
  onReturnToBank: (n: number) => void
}

function readDraggedAyah(e: DragEvent): number | null {
  const raw = e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData('text/plain')
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

export default function AyahBank({
  bank,
  ayahCount,
  textOf,
  selectedAyah,
  selectionAssigned,
  onSelectAyah,
  onReturnToBank,
}: AyahBankProps) {
  const paginated = ayahCount > BANK_PAGE_SIZE
  const rangeCount = Math.ceil(ayahCount / BANK_PAGE_SIZE)
  const [range, setRange] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  const from = range * BANK_PAGE_SIZE + 1
  const to = Math.min((range + 1) * BANK_PAGE_SIZE, ayahCount)

  const visible = useMemo(() => {
    if (!paginated) return bank
    return bank.filter((n) => n >= from && n <= to)
  }, [bank, paginated, from, to])

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const n = readDraggedAyah(e)
    if (n !== null) onReturnToBank(n)
  }

  return (
    <section
      className={`bank${dragOver ? ' bank--over' : ''}`}
      aria-label="بنك الآيات غير الموزّعة"
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="bank__head">
        <div>
          <span className="eyebrow">بنك الآيات</span>
          <p className="bank__hint">
            {toArabicNumerals(bank.length)} آية بانتظار التوزيع — اضغط رقم الآية لقراءتها، ثم اسحبها إلى محور أو اختر وجهتها.
          </p>
        </div>
        {selectionAssigned && selectedAyah !== null && (
          <button type="button" className="place-btn" onClick={() => onReturnToBank(selectedAyah)}>
            أعِد الآية {toArabicNumerals(selectedAyah)} إلى البنك ↩
          </button>
        )}
      </div>

      {paginated && (
        <div className="bank__ranges" role="group" aria-label="نطاقات الآيات">
          {Array.from({ length: rangeCount }, (_, i) => {
            const rf = i * BANK_PAGE_SIZE + 1
            const rt = Math.min((i + 1) * BANK_PAGE_SIZE, ayahCount)
            return (
              <button
                key={i}
                type="button"
                className={`range-btn${i === range ? ' range-btn--active' : ''}`}
                aria-pressed={i === range}
                onClick={() => setRange(i)}
              >
                {toArabicRange(rf, rt)}
              </button>
            )
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="bank__empty">
          {bank.length === 0
            ? 'وُزِّعت كل الآيات على المحاور.'
            : 'لا توجد آيات غير موزّعة في هذا النطاق.'}
        </p>
      ) : (
        <div className="bank__strip">
          {visible.map((n) => (
            <AyahChip
              key={n}
              n={n}
              text={textOf(n)}
              selected={selectedAyah === n}
              size={42}
              onSelect={onSelectAyah}
            />
          ))}
        </div>
      )}
    </section>
  )
}
