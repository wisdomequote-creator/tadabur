import { useState } from 'react'
import type { DragEvent, HTMLAttributes } from 'react'
import type { Axis } from '../../lib/types'
import { toArabicNumerals } from '../../lib/numerals'
import AyahChip, { DRAG_MIME } from './AyahChip'

interface AxisColumnProps {
  axis: Axis
  index: number
  textOf: (n: number) => string
  selectedAyah: number | null
  onSelectAyah: (n: number) => void
  onSetTitle: (axisId: string, value: string) => void
  onSetNotes: (axisId: string, value: string) => void
  onPlaceHere: (n: number, axisId: string) => void
  onDelete: (axisId: string) => void
  /** Pointer handlers spread on the header so it acts as the node's drag handle. */
  handleProps?: HTMLAttributes<HTMLElement>
}

function readDraggedAyah(e: DragEvent): number | null {
  const raw = e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData('text/plain')
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

export default function AxisColumn({
  axis,
  index,
  textOf,
  selectedAyah,
  onSelectAyah,
  onSetTitle,
  onSetNotes,
  onPlaceHere,
  onDelete,
  handleProps,
}: AxisColumnProps) {
  const [dragOver, setDragOver] = useState(false)

  const selectionElsewhere = selectedAyah !== null && !axis.ayat.includes(selectedAyah)

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const n = readDraggedAyah(e)
    if (n !== null) onPlaceHere(n, axis.id)
  }

  const zoneLabel = axis.title.trim()
    ? `آيات المحور: ${axis.title.trim()}`
    : `آيات المحور ${toArabicNumerals(index + 1)}`

  return (
    <section className="axis" aria-label={`المحور ${toArabicNumerals(index + 1)}`}>
      <header className={`axis__head${handleProps ? ' axis__head--drag' : ''}`} {...handleProps}>
        <span className="axis__ord eyebrow">
          {handleProps && (
            <span className="axis__grip" aria-hidden="true">
              ⠿
            </span>
          )}
          محور {toArabicNumerals(index + 1)}
        </span>
        <button
          type="button"
          className="axis__delete"
          aria-label={`حذف المحور ${toArabicNumerals(index + 1)}`}
          title="حذف المحور"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(axis.id)}
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
      </header>

      {/* موضوع المحور — the subject written above the circle */}
      <input
        className="axis__title"
        type="text"
        value={axis.title}
        placeholder="موضوع المحور…"
        aria-label={`عنوان المحور ${toArabicNumerals(index + 1)}`}
        onChange={(e) => onSetTitle(axis.id, e.target.value)}
      />

      {/* The circle — drop ayah numbers inside it */}
      <div
        className={`circle${dragOver ? ' circle--over' : ''}${
          axis.ayat.length === 0 ? ' circle--empty' : ''
        }`}
        role="group"
        aria-label={zoneLabel}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {axis.ayat.length === 0 ? (
          <span className="circle__hint">اسحب الآيات إلى هنا</span>
        ) : (
          <div className="circle__chips">
            {axis.ayat.map((n) => (
              <AyahChip
                key={n}
                n={n}
                text={textOf(n)}
                selected={selectedAyah === n}
                size={40}
                onSelect={onSelectAyah}
              />
            ))}
          </div>
        )}
      </div>

      {selectionElsewhere && (
        <button
          type="button"
          className="place-btn"
          onClick={() => onPlaceHere(selectedAyah, axis.id)}
        >
          ضع الآية {toArabicNumerals(selectedAyah)} هنا ↩
        </button>
      )}

      <textarea
        className="axis__notes"
        value={axis.notes}
        placeholder="خواطر وملاحظات حول هذا المحور…"
        aria-label={`ملاحظات المحور ${toArabicNumerals(index + 1)}`}
        rows={2}
        onChange={(e) => onSetNotes(axis.id, e.target.value)}
      />

      <div className="axis__count eyebrow">{toArabicNumerals(axis.ayat.length)} آية</div>
    </section>
  )
}
