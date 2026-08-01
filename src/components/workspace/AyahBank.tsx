import { useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import { toArabicNumerals, toArabicRange } from '../../lib/numerals'
import { BANK_PAGE_SIZE } from '../../lib/constants'
import AyahChip, { readDraggedAyat } from './AyahChip'

interface AyahBankProps {
  bank: number[]
  ayahCount: number
  textOf: (n: number) => string
  selectedAyat: number[]
  onSelectAyah: (n: number, additive: boolean) => void
  onReturnToBank: (ns: number[]) => void
}

export default function AyahBank({
  bank,
  ayahCount,
  textOf,
  selectedAyat,
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

  // Selected ayat that are currently assigned to an axis (not in the bank).
  const assignedSelected = useMemo(() => {
    const inBank = new Set(bank)
    return selectedAyat.filter((n) => !inBank.has(n))
  }, [selectedAyat, bank])

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const ns = readDraggedAyat(e)
    if (ns.length) onReturnToBank(ns)
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
            {toArabicNumerals(bank.length)} آية بانتظار التوزيع — اضغط رقم الآية لتحديدها،
            و<strong>Ctrl</strong> (أو ⌘) لتحديد أكثر من آية معًا، ثم اسحبها إلى دائرة المحور.
          </p>
        </div>
        {assignedSelected.length > 0 && (
          <button type="button" className="place-btn" onClick={() => onReturnToBank(assignedSelected)}>
            {assignedSelected.length === 1
              ? `أعِد الآية ${toArabicNumerals(assignedSelected[0] as number)} إلى البنك ↩`
              : `أعِد المحدَّد (${toArabicNumerals(assignedSelected.length)}) إلى البنك ↩`}
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
              selected={selectedAyat.includes(n)}
              selectedAyat={selectedAyat}
              size={42}
              onSelect={onSelectAyah}
            />
          ))}
        </div>
      )}
    </section>
  )
}
